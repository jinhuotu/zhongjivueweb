<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { formatKilnNumber } from '@/lib/kiln-studio-format'
import { buildAdvice } from '@/lib/kiln-advice-model'
import type { Parameters, TemperatureForecast } from '@/lib/kiln-studio-api'

const props = defineProps<{
  forecast: TemperatureForecast
  parameters: Parameters
  timelineIndex: number
}>()
ensureEcharts()

// 是否存在“调整后”曲线（用户做了 what-if 才会有）
const hasScenario = computed(() => props.forecast.points.some(point => point.scenario != null))
// 方案切换：默认原计划；切到调整后但无数据时，下方曲线自动回退原计划
const planMode = ref<'baseline' | 'scenario'>('baseline')

// 未来窗口（起点及之后）的温度曲线，作为建议模型输入
const adviceCurve = computed(() => {
  const useScenario = planMode.value === 'scenario' && hasScenario.value
  const key = useScenario ? 'scenario' : 'forecast'
  return props.forecast.points
    .filter(point => point.minute >= props.forecast.originMinute && point[key] != null)
    .map(point => ({ minute: point.minute, temperature: point[key] }))
})

// 逐点建议（依赖曲线与机理参数，与播放游标无关，只在曲线变化时重算）
const advice = computed(() => buildAdvice(adviceCurve.value, props.parameters))

// 当前播放点对应的建议（按分钟精确匹配）
const currentMinute = computed(() => props.forecast.points[props.timelineIndex]?.minute)
const currentAdvice = computed(() =>
  advice.value.points.find(point => point.minute === currentMinute.value) ?? null)

// 建议燃气/助燃风趋势，双 Y 轴；竖线标注当前播放点
const trendOption = computed<EChartsOption>(() => {
  const gasData = advice.value.points.map(point => [point.minute, point.adviceGas])
  const airData = advice.value.points.map(point => [point.minute, point.adviceAir])
  return {
    animation: false,
    tooltip: { trigger: 'axis', confine: true },
    legend: { top: 4, textStyle: { color: '#b2c5d1', fontSize: 11 } },
    grid: { left: 56, right: 60, top: 38, bottom: 30 },
    xAxis: {
      type: 'value', name: '分钟', nameTextStyle: { color: '#7d8b9c' },
      axisLabel: { color: '#a4b9c8' }, splitLine: { show: false },
    },
    yAxis: [
      { type: 'value', name: '燃气 Nm³/h', nameTextStyle: { color: '#e8b066' },
        axisLabel: { color: '#a4b9c8' }, splitLine: { lineStyle: { color: '#2a3b47' } } },
      { type: 'value', name: '助燃风 Nm³/h', nameTextStyle: { color: '#5cc992' },
        axisLabel: { color: '#a4b9c8' }, splitLine: { show: false } },
    ],
    series: [
      {
        name: '建议燃气', type: 'line', showSymbol: false, data: gasData,
        lineStyle: { color: '#e8b066', width: 2 }, itemStyle: { color: '#e8b066' },
        markLine: {
          silent: true, symbol: 'none', lineStyle: { color: '#3f93e8', type: 'dashed' },
          label: { color: '#9fc6ef', formatter: '当前点' },
          data: currentMinute.value == null ? [] : [{ xAxis: currentMinute.value }],
        },
      },
      {
        name: '建议助燃风', type: 'line', yAxisIndex: 1, showSymbol: false, data: airData,
        lineStyle: { color: '#5cc992', width: 2 }, itemStyle: { color: '#5cc992' },
      },
    ],
  }
})

const numberOrDash = (value: number | null | undefined, digits = 1) =>
  value == null ? '—' : formatKilnNumber(value, digits)
</script>

<template>
  <section class="advice-root" aria-label="升温操作建议">
    <div class="advice-head">
      <h3>升温操作建议 · 机理推算</h3>
      <div v-if="hasScenario" class="plan-toggle" role="group" aria-label="建议方案切换">
        <button type="button" :class="{ active: planMode === 'baseline' }" @click="planMode = 'baseline'">原计划</button>
        <button type="button" :class="{ active: planMode === 'scenario' }" @click="planMode = 'scenario'">调整后</button>
      </div>
    </div>

    <!-- 当前播放点的建议值 -->
    <div class="advice-kpis">
      <div class="advice-kpi">
        <p class="kpi-label">建议燃气</p>
        <p class="kpi-value gas">{{ numberOrDash(currentAdvice?.adviceGas) }}<em>Nm³/h</em></p>
      </div>
      <div class="advice-kpi">
        <p class="kpi-label">建议助燃风</p>
        <p class="kpi-value air">{{ numberOrDash(currentAdvice?.adviceAir, 0) }}<em>Nm³/h</em></p>
      </div>
      <div class="advice-kpi">
        <p class="kpi-label">升温斜率</p>
        <p class="kpi-value">{{ numberOrDash(currentAdvice?.slopeCperH) }}<em>℃/h</em></p>
      </div>
      <div class="advice-kpi">
        <p class="kpi-label">窗口累计建议用气</p>
        <p class="kpi-value">{{ numberOrDash(advice.totalGasNm3, 0) }}<em>Nm³</em></p>
      </div>
    </div>

    <VChart :option="trendOption" autoresize class="advice-chart" />

    <p class="advice-note">
      机理建议值，基于当前机理参数（空燃比 {{ formatKilnNumber(advice.afr, 2) }}）推算，参数待现场标定；
      非实测、不下发控制指令。降温时升温项归零，建议燃气仅保留散热项而下降。
    </p>
  </section>
</template>

<style scoped>
.advice-root { display: grid; gap: 12px; padding: 16px; background: #101b25; border: 1px solid #304553; border-radius: 10px; }
.advice-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.advice-head h3 { margin: 0; font-size: 14px; color: #e9f2f7; }
.plan-toggle { display: inline-flex; gap: 3px; padding: 3px; border: 1px solid #304553; border-radius: 7px; background: #162632; }
.plan-toggle button { padding: 5px 12px; font-size: 11px; border-radius: 5px; color: #9db2bf; background: transparent; cursor: pointer; }
.plan-toggle button.active { background: #286f6b; color: #fff; }

.advice-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
.advice-kpi { background: #172631; border: 1px solid #304553; border-radius: 8px; padding: 10px; }
.kpi-label { margin: 0; font-size: 11px; color: #a9bdca; }
.kpi-value { margin: 6px 0 0; font-size: 20px; font-weight: 700; color: #e4f1f6; font-variant-numeric: tabular-nums; }
.kpi-value em { font-size: 11px; font-style: normal; color: #8aa0ad; margin-left: 3px; font-weight: 400; }
.kpi-value.gas { color: #e8b066; }
.kpi-value.air { color: #5cc992; }

.advice-chart { height: 240px; width: 100%; }
.advice-note { margin: 0; font-size: 11px; line-height: 1.7; color: #a5b9c6; border-top: 1px solid #2c3d4a; padding-top: 10px; }
</style>
