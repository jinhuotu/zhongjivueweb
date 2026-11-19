<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { formatKilnReading } from '@/lib/kiln-studio-format'
import type { TemperatureForecast, TemperaturePoint } from '@/lib/kiln-studio-api'

const props = defineProps<{
  forecast: TemperatureForecast
  timelineIndex: number
}>()
ensureEcharts()

// 当前播放点，以及它落在历史段还是未来段（未来段执行量由回路自动调节，模型不输出）
const currentPoint = computed<TemperaturePoint | undefined>(
  () => props.forecast.points[props.timelineIndex])
const isFuture = computed(
  () => (currentPoint.value?.minute ?? 0) > props.forecast.originMinute)

// 温度当前值：历史段取实测，未来段取预测（标注口径）
const temperatureValue = computed(() => {
  const point = currentPoint.value
  if (!point) return null
  return isFuture.value ? point.forecast : point.actual
})

// 只读反馈项（执行量/工况）：未来段这些字段后端恒为 null，统一显示“—”
const feedbackItems = [
  { key: 'gas', label: '燃气流量', unit: 'Nm³/h', color: '#e8b066' },
  { key: 'air', label: '助燃风流量', unit: 'Nm³/h', color: '#5cc992' },
  { key: 'pressure', label: '窑压', unit: 'Pa', color: '#83bcff' },
  { key: 'oxygen', label: '氧含量', unit: '%', color: '#c8adff' },
] as const

type FeedbackKey = (typeof feedbackItems)[number]['key']

// 每个反馈项的全程小趋势：历史段真实连线，未来段自动断开；竖线标记当前播放点
function sparkOption(key: FeedbackKey, color: string): EChartsOption {
  const data = props.forecast.points.map(point => [point.minute, point[key] ?? null])
  return {
    animation: false,
    grid: { top: 4, bottom: 4, left: 3, right: 3 },
    tooltip: { trigger: 'axis', confine: true },
    xAxis: { type: 'value', show: false, min: props.forecast.points[0]?.minute },
    yAxis: { type: 'value', show: false, scale: true },
    series: [
      {
        type: 'line', showSymbol: false, data, connectNulls: false,
        lineStyle: { color, width: 1.4 }, itemStyle: { color },
        markLine: {
          silent: true, symbol: 'none', label: { show: false },
          lineStyle: { color: '#3f93e8', width: 1, type: 'dashed' },
          data: currentPoint.value ? [{ xAxis: currentPoint.value.minute }] : [],
        },
      },
    ],
  }
}

const reading = (value: number | null | undefined, unit: string) =>
  value == null ? '—' : formatKilnReading(value, unit)
</script>

<template>
  <section class="feedback-root" aria-label="当前工况反馈">
    <div class="feedback-head">
      <h3>当前反馈 · 只读</h3>
      <span class="mode-tag" :class="{ future: isFuture }">{{ isFuture ? '未来段' : '历史段' }}</span>
    </div>

    <!-- 温度：历史实测 / 未来预测 -->
    <div class="temp-row">
      <span class="row-label">{{ isFuture ? '预测温度' : '实测温度' }}</span>
      <strong class="row-value">{{ reading(temperatureValue, '℃') }}</strong>
    </div>

    <!-- 各执行量：当前值 + 协同小趋势 -->
    <div v-for="item in feedbackItems" :key="item.key" class="feedback-item">
      <div class="item-line">
        <span class="row-label" :style="{ color: item.color }">{{ item.label }}</span>
        <strong class="row-value">{{ reading(currentPoint?.[item.key], item.unit) }}</strong>
      </div>
      <VChart :option="sparkOption(item.key, item.color)" autoresize class="item-spark" />
    </div>

    <p v-if="isFuture" class="feedback-note">
      未来段燃气、助燃风、压力、氧由控制回路自动调节，模型不单独预测，故显示“—”。
    </p>
    <p v-else class="feedback-note">
      历史段为真实读数；降温时各小图随温度同步下降，可观察协同变化。
    </p>
  </section>
</template>

<style scoped>
.feedback-root { display: grid; gap: 10px; margin-top: 16px; padding: 13px; background: #111b27; border: 1px solid #304553; border-radius: 9px; }
.feedback-head { display: flex; align-items: center; justify-content: space-between; }
.feedback-head h3 { margin: 0; font-size: 13px; color: #e9f2f7; }
.mode-tag { font-size: 10px; padding: 2px 7px; border-radius: 9px; color: #5cc992; background: rgba(92,201,146,.14); }
.mode-tag.future { color: #e8b066; background: rgba(232,176,102,.14); }

.temp-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #172631; border: 1px solid #304553; border-radius: 7px; }
.row-label { font-size: 11px; color: #a9bdca; }
.row-value { font-size: 14px; color: #e4f1f6; font-variant-numeric: tabular-nums; }

.feedback-item { display: grid; gap: 4px; padding: 8px 10px; background: #172631; border: 1px solid #304553; border-radius: 7px; }
.item-line { display: flex; align-items: center; justify-content: space-between; }
.item-spark { height: 38px; width: 100%; }
.feedback-note { margin: 0; font-size: 10.5px; line-height: 1.6; color: #8aa0ad; }
</style>
