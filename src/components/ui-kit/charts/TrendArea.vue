<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { tooltipBase, useChartPalette } from './theme'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

const props = withDefaults(
  defineProps<{
    data: Array<Record<string, number | string>>
    keys: Array<{ key: string; color: string; label?: string }>
    height?: number
    yUnit?: string
  }>(),
  { height: 220 },
)

const palette = useChartPalette()

const option = computed(() => {
  const p = palette.value
  return {
    animation: false,
    grid: { left: 36, right: 12, top: 16, bottom: 28 },
    tooltip: {
      ...tooltipBase(p),
      trigger: 'axis' as const,
    },
    legend: {
      show: props.keys.length > 1,
      textStyle: { color: p.legend, fontSize: 11 },
      top: 0,
    },
    xAxis: {
      type: 'category' as const,
      data: props.data.map((d) => String(d.name ?? '')),
      axisLine: { lineStyle: { color: p.grid } },
      axisLabel: { color: p.axis, fontSize: 10, fontFamily: 'JetBrains Mono' },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { lineStyle: { color: p.grid } },
      axisLabel: {
        color: p.axis,
        fontSize: 10,
        fontFamily: 'JetBrains Mono',
        formatter: (v: number) => `${v}${props.yUnit ?? ''}`,
      },
      splitLine: { lineStyle: { color: p.grid, type: 'dashed' as const } },
      axisTick: { show: false },
    },
    series: props.keys.map((k) => ({
      name: k.label ?? k.key,
      type: 'line' as const,
      data: props.data.map((d) => Number(d[k.key] ?? 0)),
      smooth: true,
      showSymbol: false,
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: k.color + '73' },
            { offset: 1, color: k.color + '00' },
          ],
        },
      },
      lineStyle: { color: k.color, width: 2 },
      itemStyle: { color: k.color },
    })),
  }
})
</script>

<template>
  <VChart :option="option" :style="{ height: `${height}px`, width: '100%' }" autoresize />
</template>
