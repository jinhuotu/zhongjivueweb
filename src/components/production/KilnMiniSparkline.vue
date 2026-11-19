<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { algorithmPrediction } from '@/lib/kiln-studio-state'
import { formatKilnReading } from '@/lib/kiln-studio-format'
import type { AlgorithmKey, ExperimentPoint } from '@/lib/kiln-studio-api'

const props = defineProps<{ points: ExperimentPoint[]; algorithm: AlgorithmKey; unit?: string }>()
ensureEcharts()
const palette = useChartPalette()
const actual = computed(() => props.points.map(point =>
  Number.isFinite(point.actual) && point.actual !== -9999 ? point.actual : null))
const prediction = computed(() => props.points.map(point => algorithmPrediction(point, props.algorithm)))
const hasData = computed(() => actual.value.some((value, index) => value !== null && prediction.value[index] != null))
const option = computed<EChartsOption>(() => ({
  animation: false,
  grid: { top: 4, bottom: 5, left: 4, right: 4 },
  tooltip: {
    ...tooltipBase(palette.value), trigger: 'axis', confine: true, renderMode: 'richText',
    valueFormatter: value => formatKilnReading(value, props.unit),
  },
  xAxis: { type: 'category', show: false, data: props.points.map(point => point.ts.replace('T', ' ').slice(5, 16)) },
  yAxis: { type: 'value', show: false, scale: true },
  series: [
    {
      name: '实测', type: 'line', data: actual.value, color: palette.value.axis, connectNulls: false,
      showSymbol: actual.value.filter(value => value !== null).length === 1, symbolSize: 5,
    },
    {
      name: '算法预测', type: 'line', data: prediction.value, color: '#4286cc', connectNulls: false,
      showSymbol: prediction.value.filter(value => value !== null).length === 1, symbolSize: 5,
      lineStyle: { type: 'dashed' },
    },
  ],
}))
</script>

<template>
  <figure v-if="hasData" class="sparkline" aria-label="同一段窑次的实测和算法预测">
    <VChart :option="option" autoresize class="sparkline-chart" />
    <figcaption><span>实测</span><span>预测</span></figcaption>
  </figure>
  <p v-else class="sparkline empty">回测后生成</p>
</template>

<style scoped>
.sparkline { border:1px solid var(--border); border-radius:6px; min-height:68px; }
.sparkline-chart { height:47px; }
figcaption { display:flex; justify-content:center; gap:14px; padding:2px 0 6px; color:var(--muted-foreground); font-size:10px; }
figcaption span::before { content:''; display:inline-block; width:11px; margin-right:5px; vertical-align:middle; border-top:2px solid currentColor; }
figcaption span:nth-child(2)::before { color:#4286cc; border-top-style:dashed; }
.empty { display:grid; place-items:center; color:var(--muted-foreground); }
</style>
