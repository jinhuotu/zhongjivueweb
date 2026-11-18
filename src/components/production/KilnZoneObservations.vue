<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { studioGet } from '@/lib/kiln-studio-api'
import { formatKilnReading } from '@/lib/kiln-studio-format'
import type { Dataset, ZoneObservationTrend } from '@/lib/kiln-studio-api'

const props = defineProps<{ dataset: Dataset; zone?: number }>()
ensureEcharts()
const palette = useChartPalette()
const cycles = computed(() => props.dataset.summary)
const cycleId = ref('')
const selected = ref<number[]>([])
const trend = ref<ZoneObservationTrend>()
const busy = ref(false)
const error = ref('')
const retry = ref(0)
const matchingCycle = () => cycles.value.find(cycle => cycle.fields.some(
  field => field.present > 0 && (props.zone ? field.key === `z${props.zone}_temp` : /^z\d+_temp$/.test(field.key)),
)) ?? cycles.value[0]
watch([() => props.dataset.id, () => props.zone], () => {
  cycleId.value = matchingCycle()?.fileId ?? ''
  selected.value = []
}, { immediate: true })
watch([() => props.dataset.id, cycleId, retry], async ([datasetId, cycle, _retry], _old, onCleanup) => {
  let stale = false
  onCleanup(() => { stale = true })
  trend.value = undefined
  error.value = ''
  busy.value = !!cycle
  if (!cycle) return
  try {
    const result = await studioGet<ZoneObservationTrend>(
      `/datasets/${datasetId}/temperature-observations?cycle_id=${encodeURIComponent(cycle)}`,
    )
    if (stale) return
    trend.value = result
    const retained = selected.value.filter(zone => result.zones.includes(zone))
    selected.value = props.zone ? (result.zones.includes(props.zone) ? [props.zone] : []) :
      retained.length ? retained : result.zones.slice(0, 3)
  } catch (err) {
    if (!stale) error.value = err instanceof Error ? err.message : '无法读取该窑次的温区实测记录'
  } finally {
    if (!stale) busy.value = false
  }
}, { immediate: true })

const timeText = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const colors = ['#2275bb', '#137c69', '#af570e', '#854bad', '#bd435d', '#41881d']
const option = computed<EChartsOption>(() => ({
  animation: false,
  useUTC: true,
  legend: { textStyle: { color: palette.value.legend } },
  grid: { left: 62, right: 22, top: 55, bottom: 65 },
  xAxis: {
    type: 'time',
    axisLabel: { color: palette.value.axis, formatter: (value: number) => timeText.format(value) },
  },
  yAxis: { type: 'value', scale: true, name: '℃', axisLabel: { color: palette.value.axis } },
  tooltip: {
    ...tooltipBase(palette.value), trigger: 'axis', confine: true, renderMode: 'richText',
    formatter: params => {
      const items = Array.isArray(params) ? params : [params]
      const first = items[0]?.value
      if (!Array.isArray(first) || typeof first[0] !== 'number') return ''
      return [timeText.format(first[0]), ...items.map(item =>
        `${item.seriesName}  ${formatKilnReading(Array.isArray(item.value) ? item.value[1] : null, '℃')}`,
      )].join('\n')
    },
  },
  dataZoom: [{ type: 'inside', filterMode: 'none' }, { type: 'slider', filterMode: 'none', height: 19, bottom: 11 }],
  series: selected.value.map(zone => ({
    name: `${zone} 区实测`, type: 'line', showSymbol: false, connectNulls: false,
    lineStyle: { width: 2, color: colors[(zone - 1) % colors.length] },
    itemStyle: { color: colors[(zone - 1) % colors.length] },
    data: trend.value?.points.map(point => [point.timestampMs, point.temperatures[zone - 1] ?? null]) ?? [],
  })),
}))
</script>

<template>
  <section class="zone-observations">
    <header>
      <div><h4>{{ zone ? zone + ' 区实测温度' : '多温区实测温度对比' }}</h4>
        <p>{{ dataset.sourceKind === 'synthetic' ? '合成演示记录' : '归档测点记录' }} · {{ dataset.config.kilnCode }} · 北京时间</p></div>
      <label>窑次 <select v-model="cycleId"><option v-for="cycle in cycles" :key="cycle.fileId" :value="cycle.fileId">{{ cycle.file }}</option></select></label>
    </header>
    <p v-if="busy" role="status">正在读取温区实测</p>
    <p v-else-if="error" role="alert">{{ error }} <button type="button" @click="retry++">重试</button></p>
    <template v-else-if="trend">
      <fieldset v-if="!zone && trend.zones.length">
        <legend>选择温区</legend>
        <label v-for="number in trend.zones" :key="number"><input v-model="selected" type="checkbox" :value="number" />{{ number }} 区</label>
      </fieldset>
      <template v-if="selected.length">
        <VChart :key="cycleId" :option="option" :update-options="{ replaceMerge: ['series'] }" autoresize class="observation-chart" />
        <p v-if="trend.displayCount < trend.rowCount">图中抽样显示 {{ trend.displayCount }} / {{ trend.rowCount }} 条记录，保留各区分段极值。</p>
      </template>
      <p v-else>{{ zone ? '这个窑次没有该区的有效实测，可切换窑次查看。' : trend.zones.length ? '勾选温区后显示对应实测曲线。' : '这个窑次没有有效的分区实测。' }}</p>
    </template>
    <p v-else>当前数据版本没有可查看的窑次。</p>
  </section>
</template>

<style scoped>
.zone-observations { padding:16px; border:1px solid var(--border); border-radius:8px; background:var(--card); }
header,fieldset { display:flex; flex-wrap:wrap; align-items:center; gap:8px 14px; }
header { justify-content:space-between; }
label { display:inline-flex; gap:6px; align-items:center; }
h4 { font-weight:650; }
p { margin:5px 0; color:var(--muted-foreground); }
fieldset { margin:12px 0 0; }
select,button { padding:6px 8px; max-width:min(380px, 66vw); border:1px solid var(--border); border-radius:5px; background:var(--background); }
.observation-chart { height:345px; }
</style>
