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
} from './theme'

ensureEcharts()

const props = withDefaults(
  defineProps<{
    data: ChartDatum[]
    bar: { key: string; color: string; label?: string }
    line: { key: string; color: string; label?: string }
    height?: number
    barUnit?: string
    lineUnit?: string
  }>(),
  { height: 220 },
)

const palette = useChartPalette()

const option = computed<EChartsOption>(() => {
  const p = palette.value
  const categories = props.data.map((d) => String(d.name ?? ''))
  return {
    grid: { left: 44, right: 44, top: 36, bottom: 28 },
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
    yAxis: [
      {
        type: 'value',
        axisLine: { lineStyle: { color: p.grid } },
        axisTick: { show: false },
        axisLabel: {
          color: p.axis,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: withYUnit(props.barUnit),
        },
        splitLine: {
          lineStyle: { color: p.grid, type: [2, 4] },
        },
      },
      {
        type: 'value',
        axisLine: { lineStyle: { color: p.grid } },
        axisTick: { show: false },
        axisLabel: {
          color: p.axis,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: withYUnit(props.lineUnit),
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: props.bar.label ?? props.bar.key,
        type: 'bar' as const,
        yAxisIndex: 0,
        barMaxWidth: 32,
        itemStyle: {
          color: props.bar.color,
          borderRadius: [3, 3, 0, 0],
        },
        data: props.data.map((d) => Number(d[props.bar.key] ?? 0)),
      },
      {
        name: props.line.label ?? props.line.key,
        type: 'line' as const,
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: props.line.color },
        itemStyle: { color: props.line.color },
        data: props.data.map((d) => Number(d[props.line.key] ?? 0)),
      },
    ],
  }
})
</script>

<template>
  <VChart :option="option" autoresize :style="{ height: `${height}px`, width: '100%' }" />
</template>
