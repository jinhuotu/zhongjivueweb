<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { ensureEcharts } from './register'

ensureEcharts()

const props = withDefaults(
  defineProps<{
    value: number
    label?: string
    color?: string
    unit?: string
    max?: number
    height?: number
  }>(),
  {
    color: '#FF6B35',
    unit: '%',
    max: 100,
    height: 180,
  },
)

const option = computed<EChartsOption>(() => {
  const color = props.color
  const unit = props.unit
  const label = props.label
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: props.max,
        radius: '100%',
        center: ['50%', '55%'],
        progress: {
          show: true,
          width: 10,
          roundCap: true,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 1,
              colorStops: [
                { offset: 0, color },
                { offset: 1, color: color + '66' },
              ],
            },
          },
        },
        axisLine: {
          lineStyle: {
            width: 10,
            color: [[1, '#1c242e']],
          },
        },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '0%'],
          formatter: (v: number) => `{val|${v}}{unit|${unit}}`,
          rich: {
            val: {
              fontSize: 22,
              fontWeight: 600,
              color,
              fontFamily: 'JetBrains Mono, monospace',
            },
            unit: {
              fontSize: 12,
              color: '#8b97a8',
              padding: [0, 0, 0, 2],
              fontFamily: 'JetBrains Mono, monospace',
            },
          },
        },
        title: {
          show: !!label,
          offsetCenter: [0, '32%'],
          fontSize: 10,
          color: '#8b97a8',
        },
        data: [{ value: props.value, name: label ?? '' }],
      },
    ],
  }
})
</script>

<template>
  <div class="relative w-full" :style="{ height: `${height}px` }">
    <VChart :option="option" autoresize class="h-full w-full" />
  </div>
</template>
