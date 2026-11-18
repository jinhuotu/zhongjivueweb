<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FlaskConical, History, Loader2 } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import type { EChartsOption, LineSeriesOption } from 'echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { formatKilnChartValue, formatKilnNumber, KILN_PARAMETER_DIGITS, kilnReadingDigits } from '@/lib/kiln-studio-format'
import { studioGet, studioPost } from '@/lib/kiln-studio-api'
import type { Dataset, MechanismComparison, MechanismLibraryEntry, Parameters, StudioState, Task } from '@/lib/kiln-studio-api'

const props = defineProps<{
  projectId: string
  dataset: Dataset
  currentId: string
  currentParameters: Parameters
  currentTemplateKeys: string[]
  descriptions: StudioState['parameterDefinitions']
  disabled: boolean
}>()
const emit = defineEmits<{ use: [id: string, calibrate: boolean] }>()
ensureEcharts()
const palette = useChartPalette()
const entries = ref<MechanismLibraryEntry[]>([])
const selected = ref<string[]>([])
const task = ref<Task>('temperature')
const zones = ref(0)
const horizon = ref(30)
const history = ref(30)
const search = ref('')
const loading = ref(false)
const comparing = ref(false)
const listError = ref('')
const compareError = ref('')
const outcome = ref<MechanismComparison>()
const evaluated = ref('')
const byTask = { temperature: 'thermal', energy: 'energy', afr: 'combustion' }
const parameterKeys: Record<Task, (keyof Parameters)[]> = {
  temperature: ['tauMinutes'],
  energy: ['ambientC', 'lhvMJ', 'efficiency', 'capacityKJ', 'lossKW'],
  afr: ['theoreticalAfr', 'excessAir', 'minGas'],
}
const parameterDefs = computed(() => parameterKeys[task.value].flatMap(key => {
  const item = props.descriptions.find(def => def.key === key)
  return item ? [item] : []
}))
const visible = computed(() => entries.value.filter(({ mechanism }) => {
  const needle = search.value.trim().toLowerCase()
  return [mechanism.title, mechanism.version, mechanism.scope.kilnCode].some(text => text.toLowerCase().includes(needle))
}))
const hasCurrent = computed(() => props.currentTemplateKeys.includes(byTask[task.value]))
const input = computed(() => ({
  datasetId: props.dataset.id, task: task.value, zone: zones.value, horizonMinutes: horizon.value,
  historyMinutes: history.value, currentParameters: props.currentParameters,
  currentTemplateKeys: props.currentTemplateKeys, historyIds: selected.value,
}))
const stale = computed(() => !!outcome.value && JSON.stringify(input.value) !== evaluated.value)
const canCompare = computed(() => !props.disabled && !comparing.value && !loading.value && selected.value.length > 0 &&
  Number.isInteger(history.value) && history.value >= 5 && history.value <= 240)
const fmt = (value: unknown) => formatKilnNumber(value, KILN_PARAMETER_DIGITS)
function fmtComparison(value: unknown) {
  return formatKilnNumber(value, kilnReadingDigits(outcome.value?.unit))
}
const dateText = (text: string) => text.replace('T', ' ').slice(0, 16)
const comparisonReason = (entry: MechanismLibraryEntry) => entry.blockedReason ||
  (entry.mechanism.id === props.currentId ? '已用于当前配置' :
    !entry.mechanism.templateKeys.includes(byTask[task.value]) ? '未启用该任务的求解机理' : '')

function selectDefaults() {
  selected.value = entries.value.filter(entry => !comparisonReason(entry)).slice(0, 2).map(entry => entry.mechanism.id)
}
async function load() {
  if (loading.value) return
  loading.value = true
  listError.value = ''
  try {
    const { items } = await studioGet<{ items: MechanismLibraryEntry[] }>(`/projects/${props.projectId}/mechanism-library?dataset_id=${encodeURIComponent(props.dataset.id)}`)
    entries.value = items
    selectDefaults()
  } catch (err) {
    listError.value = err instanceof Error ? err.message : '读取机理库失败'
  } finally { loading.value = false }
}
watch([task, () => props.currentId], () => { zones.value = 0; selectDefaults() })
void load()

async function compare() {
  if (!canCompare.value) return
  comparing.value = true
  compareError.value = ''
  const request = JSON.stringify(input.value)
  try {
    outcome.value = await studioPost<MechanismComparison>(`/projects/${props.projectId}/mechanisms/compare`, JSON.parse(request))
    evaluated.value = request
  } catch (err) {
    compareError.value = err instanceof Error ? err.message : '机理对比失败'
  } finally { comparing.value = false }
}

const chart = computed<EChartsOption>(() => {
  const data = outcome.value
  if (!data) return {}
  const p = palette.value
  const rows = data.points.flatMap((point, index) => index && point.fold !== data.points[index - 1]?.fold ? [null, point] : [point])
  const colors = ['#268c7e', '#6f83c4', '#b27739', '#bd6583', '#608553']
  const series: LineSeriesOption[] = [{
    name: '实测', type: 'line', data: rows.map(point => point?.actual ?? null),
    showSymbol: false, lineStyle: { color: p.tooltipText, width: 2.5 },
  }]
  data.scores.filter(score => score.metric).forEach((score, index) => {
    series.push({
      name: score.version ? `${score.title} · ${score.version}` : score.title, type: 'line',
      data: rows.map(point => point?.values[score.id] ?? null), showSymbol: false,
      lineStyle: { color: colors[index], width: 1.7 },
    })
  })
  return {
    animation: false,
    tooltip: { ...tooltipBase(p), trigger: 'axis', confine: true, valueFormatter: value => formatKilnChartValue(value, data.unit) },
    legend: { type: 'scroll', top: 0, textStyle: { color: p.legend } },
    grid: { left: 62, right: 20, top: 56, bottom: 58 },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 14, bottom: 12 }],
    xAxis: { type: 'category', data: rows.map(point => point ? dateText(point.ts) : ''), axisLabel: { color: p.axis } },
    yAxis: { type: 'value', scale: true, name: data.unit, axisLabel: { color: p.axis, formatter: fmtComparison }, splitLine: { lineStyle: { color: p.grid } } },
    color: [p.tooltipText, ...colors],
    series,
  }
})
</script>

<template>
  <section class="library text-foreground">
    <header>
      <div><h2><History :size="16" /> 历史方案验证</h2><p>当前数据 · {{ dataset.title }} · {{ dataset.config.kilnCode }} / {{ dataset.config.zoneCount }} 温区 / {{ dataset.config.burnerCount }} 烧嘴</p></div>
      <button type="button" :disabled="loading || comparing" @click="load">刷新版本</button>
    </header>
    <div class="body">
      <div class="controls">
        <label>对比任务<select v-model="task"><option value="temperature">温度</option><option value="energy">燃气流量</option><option value="afr">空燃比</option></select></label>
        <label v-if="task === 'temperature'">预测温区<select v-model.number="zones"><option :value="0">有效温区平均</option><option v-for="n in dataset.config.zoneCount" :key="n" :value="n">{{ n }} 区</option></select></label>
        <label>预测时长<select v-model.number="horizon"><option v-for="n in [15, 30, 60]" :key="n" :value="n">{{ n }} 分钟</option></select></label>
        <label>历史窗口 / min<input v-model.number="history" type="number" min="5" max="240" /></label>
        <label class="search">查找历史方案<input v-model="search" type="search" placeholder="名称、版本或窑炉编号" /></label>
      </div>
      <p v-if="listError" class="warning" role="alert">{{ listError }}</p>
      <p v-else-if="loading" role="status">正在加载历史版本…</p>
      <p v-else-if="!entries.length">保存机理和参数版本后，就可以在这里比较与复用。</p>
      <p v-else-if="!visible.length">未找到匹配的版本。</p>
      <div v-else class="versions">
        <article v-for="entry in visible" :key="entry.mechanism.id">
          <label class="version-title"><input v-model="selected" type="checkbox" :value="entry.mechanism.id" :disabled="!!comparisonReason(entry) || (selected.length >= 4 && !selected.includes(entry.mechanism.id))" /><strong>{{ entry.mechanism.title }}</strong><code>{{ entry.mechanism.version }}</code></label>
          <p>{{ entry.mechanism.scope.kilnCode }} · {{ entry.mechanism.scope.zoneCount }} 温区 · {{ entry.crossProject ? '跨项目' : '本项目' }} · {{ entry.mechanism.validationStatus }}</p>
          <p class="values"><span v-for="item in parameterDefs" :key="item.key">{{ item.label }} {{ fmt(entry.mechanism.parameters[item.key]) }} {{ item.unit }}</span></p>
          <p v-if="comparisonReason(entry)" class="warning">{{ comparisonReason(entry) }}</p>
          <details v-if="entry.mechanism.notes"><summary>版本说明</summary><p>{{ entry.mechanism.notes }}</p></details>
          <div class="actions" v-if="!entry.blockedReason && entry.mechanism.id !== currentId">
            <button type="button" :disabled="disabled || comparing" @click="emit('use', entry.mechanism.id, false)">沿用原参数</button>
            <button type="button" :disabled="disabled || comparing" @click="emit('use', entry.mechanism.id, true)">在新数据上标定</button>
          </div>
        </article>
      </div>
      <div class="run-row">
        <div><p>按同一批验证点对比机理基线，固定各版本原参数。可选 1–4 个历史版本。</p><p v-if="!hasCurrent" class="warning">当前配置未启用该任务关联的机理，本次只能对比历史版本。</p></div>
        <button class="primary" type="button" :disabled="!canCompare" @click="compare"><Loader2 v-if="comparing" :size="14" class="animate-spin" /><FlaskConical v-else :size="14" />{{ comparing ? '正在对比…' : '运行方案对比' }}</button>
      </div>
      <p v-if="compareError" class="warning" role="alert">{{ compareError }}</p>
      <div v-if="outcome" class="result">
        <p v-if="stale" class="warning" role="status">对比条件已更改，下方为上次结果。请重新运行后选用。</p>
        <div><strong>共同验证集</strong><p>{{ dateText(outcome.start) }} 至 {{ dateText(outcome.end) }} · {{ fmt(outcome.count) }} / {{ fmt(outcome.validationCount) }} 个有效验证点</p><p>{{ outcome.splitMethod }}<template v-if="outcome.afrFloor != null"> · 统一燃气流量门槛 {{ fmt(outcome.afrFloor) }} Nm³/h</template></p></div>
        <div class="metric-table"><table>
          <thead><tr><th>机理版本</th><th>MAE</th><th>RMSE</th><th>平均偏差</th><th>评估</th></tr></thead>
          <tbody><tr v-for="score in outcome.scores" :key="score.id">
            <th scope="row">{{ score.title }} <code v-if="score.version">{{ score.version }}</code></th>
            <td>{{ fmtComparison(score.metric?.mae) }}</td><td>{{ fmtComparison(score.metric?.rmse) }}</td><td>{{ fmtComparison(score.metric?.bias) }}</td>
            <td v-if="outcome.bestIds.includes(score.id)"><strong class="best">{{ outcome.bestIds.length > 1 ? '并列' : '' }}本次 MAE 最低</strong><button v-if="score.id !== 'current'" type="button" :disabled="stale || disabled || comparing" @click="emit('use', score.id, false)">采用此版本</button></td>
            <td v-else>{{ score.metric ? outcome.unit : '未启用求解机理' }}</td>
          </tr></tbody>
        </table></div>
        <VChart :option="chart" autoresize style="height: 290px; width: 100%" />
        <p>指标单位 {{ outcome.unit }}。曲线抽样展示，误差使用全部共同验证点。若某版已用同批窑次调参，需另用独立窑次核验。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.library { background:var(--card); border:1px solid var(--border); border-radius:8px; }
header { display:flex; justify-content:space-between; align-items:center; gap:12px; border-bottom:1px solid var(--border); padding:16px; }
h2,button { display:inline-flex; gap:6px; align-items:center; }
.body { padding:16px; display:grid; gap:14px; }
p { margin:4px 0 0; color:var(--muted-foreground); font-size:11px; line-height:1.65; overflow-wrap:anywhere; }
.controls,.actions,.values,.version-title { display:flex; flex-wrap:wrap; gap:8px 14px; align-items:center; }
.controls label { display:grid; gap:4px; min-width:80px; font-size:11px; }
.search { flex:1; }
input:not([type=checkbox]),select,button { background:var(--background); border:1px solid var(--border); border-radius:5px; padding:6px 9px; color:var(--foreground); font-size:11px; }
input[type=number] { width:90px; } input[type=checkbox] { accent-color:#317e75; }
button:disabled { opacity:.55; cursor:not-allowed; }
button.primary { background:#266e6b; color:white; white-space:nowrap; }
.versions { max-height:330px; overflow:auto; display:grid; gap:8px; }
article { border:1px solid var(--border); border-radius:6px; padding:10px; }
.version-title { gap:7px; font-size:12px; }
code { font-size:10px; color:var(--muted-foreground); }
.actions { margin-top:7px; }
details { margin-top:6px; }
.run-row { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
.warning { color:var(--warning-foreground, #a26028); }
.metric-table { overflow:auto; margin-top:12px; }
table { width:100%; border-collapse:collapse; font-size:11px; }
th,td { border-bottom:1px solid var(--border); padding:8px; text-align:left; }
.best { color:#317e75; margin-right:7px; }
</style>
