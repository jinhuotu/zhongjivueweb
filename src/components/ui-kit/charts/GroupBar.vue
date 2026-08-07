<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { ensureEcharts } from './register'
import {
  tooltipBase,
  useChartPalette,
  withYUnit,
  type ChartDatum,
  type ChartKey,
} from './theme'

ensureEcharts()

const props = withDefaults(
  defineProps<{
    data: ChartDatum[]
    keys: ChartKey[]
    height?: number
    yUnit?: string
  }>(),
  { height: 220 },
)

const palette = useChartPalette()

const option = computed<EChartsOption>(() => {
  const p = palette.value
  const categories = props.data.map((d) => String(d.name ?? ''))
  return {
    grid: { left: 36, right: 16, top: 36, bottom: 28 },
    legend: {
      top: 0,
      textStyle: { color: p.legend, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    tooltip: {
      ...tooltipBase(p),
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: p.pointerShadow } },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: {
        color: p.axis,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: {
        color: p.axis,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        formatter: withYUnit(props.yUnit),
      },
      splitLine: {
        lineStyle: { color: p.grid, type: [2, 4] },
      },
    },
    series: props.keys.map((k) => ({
      name: k.label ?? k.key,
      type: 'bar' as const,
      barMaxWidth: 28,
      itemStyle: {
        color: k.color,
        borderRadius: [3, 3, 0, 0],
      },
      data: props.data.map((d) => Number(d[k.key] ?? 0)),
    })),
  }
})
</script>

<template>
  <VChart :option="option" autoresize :style="{ height: `${height}px`, width: '100%' }" />
</template>
