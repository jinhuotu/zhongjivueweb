<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { ensureEcharts } from './register'
import { LEGEND_COLOR, tooltipBase } from './theme'

ensureEcharts()

const props = withDefaults(
  defineProps<{
    data: Array<{ name: string; value: number; color: string }>
    height?: number
  }>(),
  { height: 220 },
)

const option = computed<EChartsOption>(() => ({
  tooltip: {
    ...tooltipBase,
    trigger: 'item',
  },
  legend: {
    orient: 'vertical',
    right: 8,
    top: 'middle',
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    textStyle: { color: LEGEND_COLOR, fontSize: 11 },
  },
  series: [
    {
      type: 'pie',
      radius: ['50%', '80%'],
      center: ['38%', '50%'],
      padAngle: 2,
      itemStyle: {
        borderColor: '#0b0f14',
        borderWidth: 2,
      },
      label: { show: false },
      data: props.data.map((d) => ({
        name: d.name,
        value: d.value,
        itemStyle: { color: d.color },
      })),
    },
  ],
}))
</script>

<template>
  <VChart :option="option" autoresize :style="{ height: `${height}px`, width: '100%' }" />
</template>
