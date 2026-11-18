<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { EChartsOption, LineSeriesOption } from 'echarts'
import VChart from 'vue-echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import type { Experiment } from '@/lib/kiln-studio-api'
import { algorithmPrediction } from '@/lib/kiln-studio-state'
import { formatKilnChartValue, formatKilnNumber, kilnReadingDigits } from '@/lib/kiln-studio-format'

const props = defineProps<{ experiment: Experiment; split: 'validation' | 'test'; comparison?: Experiment }>()
ensureEcharts()
const palette = useChartPalette()
const from = ref(0)
const to = ref(100)
const mode = ref<'flow' | 'cumulative'>('flow')
const cycle = ref('')
const cycleOptions = computed(() => [...new Set(props.experiment.points.filter(x => x.split === props.split).map(x => x.cycle))])
watch(() => props.split, () => { cycle.value = '' })
const colors = ['#91a3b8', '#69c4bd', '#e8b86d', '#82a9e8', '#b39adc', '#d77f9c', '#91ab66', '#da8b63']
const rows = computed(() => {
  const points = props.experiment.points.filter(p => p.split === props.split && (!cycle.value || p.cycle === cycle.value))
  return points.slice(Math.floor(points.length * from.value / 100), Math.max(1, Math.ceil(points.length * to.value / 100)))
})
const option = computed<EChartsOption>(() => {
  const p = palette.value
  const cumulative = props.experiment.config.task === 'energy' && mode.value === 'cumulative'
  const unit = cumulative ? 'Nm³' : props.experiment.unit
  const series: LineSeriesOption[] = [{ name: '实测值', type: 'line', data: rows.value.map(x => cumulative ? x.cumulative?.actual ?? null : x.actual), symbol: 'none', connectNulls: false, lineStyle: { color: p.tooltipText, width: 2.5 } }]
  props.experiment.algorithms.filter(a => a.available).forEach((algorithm, index) => series.push({ name: algorithm.name, type: 'line', data: rows.value.map(x => cumulative ? x.cumulative?.[algorithm.key] ?? null : algorithmPrediction(x, algorithm.key)), symbol: 'none', connectNulls: false, lineStyle: { color: colors[index % colors.length], width: 1.8, type: algorithm.key === 'physics' ? 'dashed' : 'solid' } }))
  if (props.experiment.config.task === 'temperature') series.push({ name: '设定计划', type: 'line', data: rows.value.map(x => x.setpoint), symbol: 'none', lineStyle: { color: '#d19c55', type: 'dotted', width: 1 } })
  if (props.comparison) {
    const points = new Map(props.comparison.points.filter(x => x.split === props.split).map(x => [x.cycle + ':' + x.ts, x]))
    for (const key of ['physics', 'fusion'] as const) {
      if (!props.comparison.algorithms.find(x => x.key === key)?.available) continue
      series.push({ name: `对照${props.comparison.mechanismVersion} · ${key === 'physics' ? '机理' : '融合'}`, type: 'line', data: rows.value.map(x => { const item = points.get(x.cycle + ':' + x.ts); return cumulative ? item?.cumulative?.[key] ?? null : item?.[key] ?? null }), symbol: 'none', connectNulls: false, lineStyle: { color: key === 'physics' ? '#ba8275' : '#879766', type: 'dashed', width: 1.6 } })
    }
  }
  return {
    backgroundColor: 'transparent', animation: false,
    tooltip: { ...tooltipBase(p), trigger: 'axis', confine: true, valueFormatter: value => formatKilnChartValue(value, unit) },
    legend: { type: 'scroll', top: 0, textStyle: { color: p.legend, fontSize: 10 }, itemWidth: 16, itemHeight: 3 },
    grid: { left: 65, right: 26, top: 65, bottom: 55 },
    xAxis: { type: 'category', name: '预测对准的时刻（北京时间）', nameLocation: 'middle', nameGap: 35, nameTextStyle: { color: p.axis, fontSize: 10 }, data: rows.value.map(x => x.ts.replace('T', ' ').slice(5, 16)), axisLabel: { color: p.axis, fontSize: 10 }, axisLine: { lineStyle: { color: p.grid } }, boundaryGap: false },
    yAxis: { type: 'value', name: cumulative ? '累计耗气 Nm³' : unit, scale: true, nameTextStyle: { color: p.axis }, axisLabel: { color: p.axis, fontSize: 10, formatter: value => formatKilnNumber(value, kilnReadingDigits(unit)) }, splitLine: { lineStyle: { color: p.grid, type: 'dashed' } } }, series,
  }
})
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-3 items-center px-4 py-3 text-[11px] text-muted-foreground">
      <label>窑次 <select v-model="cycle" class="bg-transparent border border-border rounded px-2 py-1"><option value="">全部评估窑次</option><option v-for="(item, index) in cycleOptions" :key="item" :value="item">窑次 {{ index + 1 }} · {{ item.slice(0, 6) }}</option></select></label>
      <label v-if="experiment.config.task === 'energy'">曲线 <select v-model="mode" class="bg-transparent border border-border rounded px-2 py-1"><option value="flow">瞬时流量 Nm³/h</option><option value="cumulative">评估窗口累计耗气 Nm³</option></select></label>
    </div>
    <VChart :option="option" autoresize style="height: 330px; width: 100%" />
    <div class="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground px-4 pb-3">
      <span>时间范围</span><input v-model.number="from" type="range" min="0" :max="Math.max(0, to - 5)" class="w-24" aria-label="曲线开始位置" />
      <input v-model.number="to" type="range" :min="Math.min(100, from + 5)" max="100" class="w-24" aria-label="曲线结束位置" />
      <span>点击图例可隐藏相应曲线 · 图中有 {{ rows.length }} 个时刻 · 提前 {{ experiment.config.horizonMinutes }} 分钟预测</span>
    </div>
    <p class="text-[10px] text-muted-foreground border-t border-border px-4 py-2">
      {{ experiment.sourceKind === 'synthetic' ? '合成工况' : '上传的历史记录' }} · {{ split === 'validation' ? '验证集，用于比较' : '测试集，用于核对' }}。
      图上可能只画部分时刻，误差用该组全部可用记录计算。
      <span v-if="experiment.config.task === 'energy'">累计耗气按各段时长加总，断档和不同窑次分别计算。</span>
    </p>
  </div>
</template>
