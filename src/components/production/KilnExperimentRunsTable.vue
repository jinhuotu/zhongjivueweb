<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Experiment } from '@/lib/kiln-studio-api'
import { formatKilnNumber, kilnReadingDigits } from '@/lib/kiln-studio-format'

// 该组件只负责“同任务多版本并排对比”：基准差异、指标最优高亮、数据质量标记、点击载入
const props = defineProps<{
  experiments: Experiment[]
  activeId?: string
  unit: string
  busy?: boolean
}>()
const emit = defineEmits<{ open: [item: Experiment] }>()

// 基准版本（用于计算差异）与指标集切换；默认取第一个版本、验证集
const baselineId = ref(props.experiments[0]?.id ?? '')
const split = ref<'validation' | 'test'>('validation')
watch(() => props.experiments, list => {
  if (!list.some(item => item.id === baselineId.value)) baselineId.value = list[0]?.id ?? ''
})
const baseline = computed(() => props.experiments.find(item => item.id === baselineId.value))

// 实验设置行（field 对应 config 中的字段）
const settingRows = [
  { field: 'horizonMinutes', label: '预测时距 / min' },
  { field: 'historyMinutes', label: '历史窗口 / min' },
  { field: 'ridgeAlpha', label: '岭回归 α' },
  { field: 'boostingRounds', label: '提升树轮数' },
  { field: 'learningRate', label: '提升学习率' },
] as const
type SettingField = (typeof settingRows)[number]['field']

// 收集所有实验里出现过的算法（并集），保证不同实验的算法也能对齐成行
const algorithmKeys = computed(() => {
  const keys: string[] = []
  for (const exp of props.experiments) {
    for (const alg of exp.algorithms) {
      if (!keys.includes(alg.key)) keys.push(alg.key)
    }
  }
  return keys
})
function algorithmName(key: string): string {
  for (const exp of props.experiments) {
    const alg = exp.algorithms.find(item => item.key === key)
    if (alg) return alg.name
  }
  return key
}

// 取某实验、某算法、某指标集下的指标值；缺测或非数值统一返回 null
function metricValue(exp: Experiment, key: string, field: 'mae' | 'rmse'): number | null {
  const alg = exp.algorithms.find(item => item.key === key)
  const metric = split.value === 'validation' ? alg?.validation : alg?.test
  const value = metric?.[field]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// 每个指标行跨版本的最优值（最小），用于高亮
const bestValues = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  for (const key of algorithmKeys.value) {
    for (const field of ['mae', 'rmse'] as const) {
      const values = props.experiments
        .map(exp => metricValue(exp, key, field))
        .filter((v): v is number => v != null)
      if (values.length) map[`${key}:${field}`] = Math.min(...values)
    }
  }
  return map
})
function isBest(key: string, field: 'mae' | 'rmse', exp: Experiment): boolean {
  const value = metricValue(exp, key, field)
  return value != null && bestValues.value[`${key}:${field}`] === value
}

// 设置值与参数差异（参数差异只表达“不同”，不判断好坏）
function formatSetting(exp: Experiment, field: SettingField): string {
  return formatKilnNumber(exp.config[field], field === 'ridgeAlpha' ? 4 : 2, false)
}
function settingDiff(exp: Experiment, field: SettingField): string {
  const base = baseline.value
  if (!base || exp.id === base.id) return ''
  const current = exp.config[field], baseValue = base.config[field]
  if (typeof current !== 'number' || typeof baseValue !== 'number') return ''
  const d = current - baseValue
  if (Math.abs(d) < 1e-9) return ''
  return (d > 0 ? '+' : '') + formatKilnNumber(d, field === 'ridgeAlpha' ? 4 : 2, false)
}

// 指标差异：相对基准，下降（越小越好）为绿色，上升为红色
function metricDiff(exp: Experiment, key: string, field: 'mae' | 'rmse'): { text: string; cls: string } | null {
  const base = baseline.value
  if (!base || exp.id === base.id) return null
  const current = metricValue(exp, key, field)
  const baseValue = metricValue(base, key, field)
  if (current == null || baseValue == null) return null
  const d = current - baseValue
  if (Math.abs(d) < 1e-9) return null
  const digits = kilnReadingDigits(props.unit)
  return { text: (d > 0 ? '+' : '') + formatKilnNumber(d, digits, false), cls: d < 0 ? 'good' : 'worse' }
}
function formatMetric(exp: Experiment, key: string, field: 'mae' | 'rmse'): string {
  return formatKilnNumber(metricValue(exp, key, field), kilnReadingDigits(props.unit), false)
}

// 正常保温阶段相邻帧偶然相同约 1 分钟，超过该时长才视为异常冻结
const ANOMALY_FREEZE_MINUTES = 2

// 数据质量提示（哨兵、零温度、累计表重置/未清零、整帧冻结），不修改数据，只做可见标记
function hasQualityIssue(exp: Experiment): boolean {
  const q = exp.observationQuality
  if (!q) return false
  return (
    q.sentinelRows > 0 ||
    q.zeroTemperatureRows > 0 ||
    (q.gasCounterResets ?? 0) > 0 ||
    q.counterNonzeroStart === true ||
    (q.longestFreezeMinutes ?? 0) > ANOMALY_FREEZE_MINUTES
  )
}
function qualityTitle(exp: Experiment): string {
  const q = exp.observationQuality
  if (!q) return ''
  const parts: string[] = []
  if (q.sentinelRows > 0) parts.push(`哨兵值行 ${q.sentinelRows}`)
  if (q.zeroTemperatureRows > 0) parts.push(`零温度行 ${q.zeroTemperatureRows}`)
  if ((q.gasCounterResets ?? 0) > 0) parts.push(`累计表重置 ${q.gasCounterResets} 次`)
  if (q.counterNonzeroStart === true) parts.push('累计表开窑未清零')
  if ((q.longestFreezeMinutes ?? 0) > ANOMALY_FREEZE_MINUTES)
    parts.push(`整帧冻结 ${q.frozenRows} 行，最长 ${q.longestFreezeMinutes} 分钟`)
  return '数据质量：' + parts.join('；')
}
function shortTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <section class="runs-panel">
    <div class="runs-toolbar">
      <div>
        <h3>实验版本对比</h3>
        <p>同任务版本并排比较；基准列用于计算差异，指标越小越好，绿色标记为当前最优。</p>
      </div>
      <div class="runs-controls">
        <label>基准版本
          <select v-model="baselineId" class="runs-select">
            <option v-for="exp in experiments" :key="exp.id" :value="exp.id">{{ exp.title }}</option>
          </select>
        </label>
        <div class="runs-segmented">
          <button type="button" :class="{ active: split === 'validation' }" @click="split = 'validation'">验证集</button>
          <button type="button" :class="{ active: split === 'test' }" @click="split = 'test'">测试集</button>
        </div>
      </div>
    </div>

    <p v-if="!experiments.length" class="runs-empty">当前任务还没有已保存的实验版本，运行一次算法对比后即可在此对比。</p>

    <div v-else class="runs-scroll">
      <table class="runs-table">
        <thead>
          <tr>
            <th class="row-head sticky-col">项目</th>
            <th v-for="exp in experiments" :key="exp.id" :class="{ active: exp.id === activeId }">
              <div class="col-head">
                <b>{{ exp.title }}</b>
                <span class="col-time">{{ shortTime(exp.createdAt) }}</span>
                <span v-if="hasQualityIssue(exp)" class="quality-flag" :title="qualityTitle(exp)">质量提示</span>
                <button type="button" class="load-btn" :disabled="busy || exp.id === activeId" @click="emit('open', exp)">
                  {{ exp.id === activeId ? '当前版本' : '载入此版本' }}
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr class="group-row"><td :colspan="experiments.length + 1">实验设置</td></tr>
          <tr v-for="row in settingRows" :key="row.field">
            <th class="row-head sticky-col">{{ row.label }}</th>
            <td v-for="exp in experiments" :key="exp.id">
              <span class="cell-value">{{ formatSetting(exp, row.field) }}</span>
              <span v-if="settingDiff(exp, row.field)" class="cell-diff neutral">{{ settingDiff(exp, row.field) }}</span>
            </td>
          </tr>

          <tr class="group-row"><td :colspan="experiments.length + 1">{{ split === 'validation' ? '验证集' : '测试集' }}指标 · 各算法（单位 {{ unit }}）</td></tr>
          <template v-for="key in algorithmKeys" :key="key">
            <tr class="algo-row"><td :colspan="experiments.length + 1">{{ algorithmName(key) }}</td></tr>
            <tr v-for="field in (['mae', 'rmse'] as const)" :key="field">
              <th class="row-head sticky-col">{{ field.toUpperCase() }}</th>
              <td v-for="exp in experiments" :key="exp.id" :class="{ best: isBest(key, field, exp) }">
                <span class="cell-value">{{ formatMetric(exp, key, field) }}</span>
                <span v-if="metricDiff(exp, key, field)" class="cell-diff" :class="metricDiff(exp, key, field)?.cls">
                  {{ metricDiff(exp, key, field)?.text }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.runs-panel { background:var(--card); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
.runs-toolbar { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; padding:13px 16px; border-bottom:1px solid var(--border); }
.runs-toolbar h3 { margin:0; font-size:13px; font-weight:650; }
.runs-toolbar p { margin:4px 0 0; font-size:11px; line-height:1.6; color:var(--muted-foreground); max-width:420px; }
.runs-controls { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.runs-controls label { font-size:10px; color:var(--muted-foreground); display:flex; flex-direction:column; gap:5px; }
.runs-select { border:1px solid var(--border); background:var(--background); color:var(--foreground); border-radius:5px; padding:7px 9px; font-size:11px; max-width:180px; }
.runs-segmented { display:flex; border:1px solid var(--border); border-radius:5px; padding:2px; }
.runs-segmented button { border:0; background:transparent; color:var(--muted-foreground); font-size:10px; padding:6px 10px; border-radius:4px; cursor:pointer; }
.runs-segmented button.active { background:var(--muted); color:var(--foreground); }
.runs-empty { margin:0; padding:20px 16px; font-size:12px; color:var(--muted-foreground); }
.runs-scroll { overflow-x:auto; }
.runs-table { border-collapse:collapse; width:100%; font-size:11px; }
.runs-table th, .runs-table td { border:1px solid var(--border); padding:8px 10px; text-align:left; vertical-align:top; white-space:nowrap; }
.row-head { background:var(--muted); color:var(--muted-foreground); font-weight:500; position:sticky; left:0; z-index:2; }
.sticky-col { z-index:3; }
thead th { background:var(--muted); }
thead th.active { background:#3a897d1f; }
.col-head { display:flex; flex-direction:column; gap:4px; min-width:130px; }
.col-head b { font-size:12px; font-weight:650; }
.col-time { font-size:10px; color:var(--muted-foreground); }
.quality-flag { align-self:flex-start; font-size:9px; color:#8a5f22; background:#f3e7cf; border:1px solid #e0c79a; border-radius:4px; padding:1px 6px; }
.load-btn { border:1px solid var(--border); background:var(--card); color:var(--foreground); border-radius:5px; font-size:10px; padding:5px 8px; cursor:pointer; margin-top:2px; }
.load-btn:disabled { opacity:.6; cursor:default; }
.group-row td, .algo-row td { background:var(--muted); font-size:10px; font-weight:650; color:var(--muted-foreground); }
.cell-value { font-size:12px; }
.cell-diff { display:block; margin-top:2px; font-size:10px; line-height:1.4; }
.cell-diff.good { color:#2f7d52; }
.cell-diff.worse { color:#b34a3f; }
.cell-diff.neutral { color:#6b7889; }
td.best { background:#2f7d5214; }
td.best .cell-value { color:#2f7d52; font-weight:700; }
</style>
