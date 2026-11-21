<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { EChartsOption, LineSeriesOption } from 'echarts'
import { Loader2 } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { formatKilnChartValue, formatKilnNumber, formatKilnReading } from '@/lib/kiln-studio-format'
import { followingForecast, followingTooltipPosition } from '@/lib/kiln-following-tooltip'
import {
  buildOverviewModel, evaluateHealth, frameErrorSeries, stageProgress,
  backtestEnvelope, envelopeBand,
  DEFAULT_HEALTH_RULES,
} from '@/lib/kiln-overview-model'
import { scada, scadaStatusColor, scadaTooltip } from '@/lib/kiln-scada-theme'
import KilnEnergyPanel from './KilnEnergyPanel.vue'
import type { Bundle, ReplayPackage } from '@/lib/kiln-studio-api'

// 工业控制室总览：深色自包含（不影响其他页面），一屏展示状态栏、KPI、主趋势、健康仪表与误差。
const props = defineProps<{
  model?: Bundle['manifest'][number]
  replay?: ReplayPackage
  busy: boolean
  error?: string
}>()
const emit = defineEmits<{ 'request-replay': [] }>()

ensureEcharts()

const algorithmKey = computed(() => props.model?.algorithm ?? '')
// 总览视图模型（KPI 汇总、阶段划分等）
const overview = computed(() => props.replay ? buildOverviewModel(props.replay) : null)
// 二级视图：运行总览（默认，动态播放）/ 能碳概览（因子可配置）
const tab = ref<'run' | 'energy'>('run')

// 动态播放游标：在回放帧之间移动，到末尾回 0 循环
const cursor = ref(0)
const current = computed(() => props.replay?.frames[cursor.value])
const currentSnapshot = computed(() => current.value?.snapshot)
// 当前帧的逐点预测误差
const errors = computed(() =>
  current.value ? frameErrorSeries(current.value, algorithmKey.value) : [])

// 主图聚焦模式：local=当前时刻前后窗口（默认，预测段看得清）/ full=全窑次
const focusMode = ref<'local' | 'full'>('local')
// 是否在预测曲线两侧显示历史回测误差范围（默认显示，语义为回测残差带而非概率置信区间）
const showEnvelope = ref(true)
// 当前算法的回测误差包络（回放包/算法变化时重算，与播放游标无关，只算一次）
const envelope = computed(() =>
  props.replay ? backtestEnvelope(props.replay, algorithmKey.value) : null)
// 局部窗口：起点前回看 60 分钟；终点后预测窗口取回放请求的 horizon
const lookback = 60
const predictWindow = computed(() => props.replay?.request.horizonMinutes ?? 30)
const mainChart = ref<InstanceType<typeof VChart>>()
const mainTip = ref<HTMLDivElement>()
const pointerInside = ref(false)
const tipPosition = ref({ left: '8px', top: '8px', visibility: 'hidden' as 'hidden' | 'visible' })
const forecastTip = computed(() => followingForecast(current.value, algorithmKey.value, predictWindow.value, envelope.value ?? undefined))
let tipAnimationFrame = 0

function placeMainTip() {
  const chart = mainChart.value
  if (!chart || !mainTip.value || !current.value || tab.value !== 'run' || pointerInside.value) {
    if (tipPosition.value.visibility !== 'hidden') tipPosition.value = { ...tipPosition.value, visibility: 'hidden' }
    return
  }
  const width = chart.getWidth(), height = chart.getHeight()
  if (!width || !height) return
  const x = chart.convertToPixel({ xAxisIndex: 0 }, current.value.originMinute) as number
  const temperature = current.value.snapshot.temp ?? current.value.snapshot.temp_sp
  const y = temperature == null ? height / 2 : chart.convertToPixel({ yAxisIndex: 0 }, temperature) as number
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  const position = followingTooltipPosition([x, y], [mainTip.value.offsetWidth, mainTip.value.offsetHeight], [width, height])
  tipPosition.value = { left: `${position.left}px`, top: `${position.top}px`, visibility: 'visible' }
}

function scheduleMainTip() {
  cancelAnimationFrame(tipAnimationFrame)
  tipAnimationFrame = requestAnimationFrame(placeMainTip)
}

function resumeMainTip() {
  pointerInside.value = false
  mainChart.value?.dispatchAction({ type: 'hideTip' })
  scheduleMainTip()
}

let timer: ReturnType<typeof setInterval> | undefined
function startPlay() {
  clearInterval(timer)
  timer = setInterval(() => {
    const count = props.replay?.frames.length ?? 0
    if (count > 0) cursor.value = (cursor.value + 1) % count
  }, 450)
}
onBeforeUnmount(() => { clearInterval(timer); cancelAnimationFrame(tipAnimationFrame) })

// 回放包到达后从头开始自动播放；无包且不在计算中时请求父组件生成
watch(() => props.replay, replay => {
  cursor.value = 0
  if (replay) startPlay()
}, { immediate: true })
watch(() => [props.replay, props.busy, props.error] as const, ([replay, busy, error]) => {
  if (!replay && !busy && !error) emit('request-replay')
}, { immediate: true })

// 顶部状态栏：当前阶段、阶段内进度与全窑次进度
const progress = computed(() => {
  if (!overview.value || !current.value) return null
  return stageProgress(overview.value.stages, current.value.originMinute)
})

// 健康面板：默认参考区间判定（区间可在参数中调整，P1 先内置宽松默认值）
const gaugeRange: Record<string, { min: number; max: number }> = {
  o2: { min: 0, max: 10 },
  afr: { min: 8, max: 13 },
  pressure: { min: -60, max: 60 },
}
const healthPanels = computed(() => DEFAULT_HEALTH_RULES.map(rule => {
  const value = currentSnapshot.value?.[rule.key] ?? null
  return {
    rule, value,
    status: evaluateHealth(value, rule),
    range: gaugeRange[rule.key]!,
  }
}))

// 单个健康仪表盘（深色、自包含，不依赖全局 GaugeRadial）
function gaugeOption(
  rule: { label: string; unit: string }, value: number | null,
  status: 'running' | 'warning' | 'alarm' | 'idle', range: { min: number; max: number },
): EChartsOption {
  const color = scadaStatusColor[status]
  return {
    animation: false,
    series: [{
      type: 'gauge', startAngle: 205, endAngle: -25,
      min: range.min, max: range.max, radius: '96%', center: ['50%', '58%'],
      progress: { show: true, width: 7, roundCap: true, itemStyle: { color } },
      axisLine: { lineStyle: { width: 7, color: [[1, scada.cardAlt]] } },
      pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      detail: {
        valueAnimation: true, offsetCenter: [0, '-6%'],
        formatter: (v: number) => `{v|${formatKilnNumber(v)}}{u|${rule.unit}}`,
        rich: {
          v: { fontSize: 18, fontWeight: 600, color: scada.text, fontFamily: 'JetBrains Mono, monospace' },
          u: { fontSize: 10, color: scada.muted, padding: [0, 0, 0, 2] },
        },
      },
      title: { show: true, offsetCenter: [0, '32%'], fontSize: 10, color: scada.muted },
      data: [{ value: value ?? 0, name: rule.label }],
    }],
  }
}

// 主趋势：实测 + 设定，温度任务叠加预测；当前时刻竖线与动态节点；局部窗口由 xAxis min/max 裁剪
const mainOption = computed<EChartsOption>(() => {
  if (!overview.value || !current.value || !currentSnapshot.value) return {}
  const points = overview.value.points
  const curMinute = current.value.originMinute
  const series: LineSeriesOption[] = [
    {
      id: 'temp', type: 'line', name: '实测温度', showSymbol: false,
      data: points.map(point => [point.minute, point.temp]),
      lineStyle: { color: scada.actual, width: 1.8 }, itemStyle: { color: scada.actual },
    },
    {
      id: 'plan', type: 'line', name: '设定温度', showSymbol: false,
      data: points.map(point => [point.minute, point.tempSp]),
      lineStyle: { color: scada.setpoint, type: 'dashed', width: 1.4 }, itemStyle: { color: scada.setpoint },
    },
  ]
  // 仅温度任务的回放包，其 future 是温度预测，可直接叠加
  if (props.replay?.task === 'temperature') {
    const prediction = current.value.future[algorithmKey.value] ?? []
    series.push({
      id: 'prediction', type: 'line', name: '温度预测', showSymbol: true, symbol: 'circle', symbolSize: 5,
      data: [[curMinute, currentSnapshot.value.temp],
        ...prediction.map(point => [curMinute + point.minuteOffset, point.value])],
      lineStyle: { color: scada.prediction, type: 'dashed', width: 1.6 }, itemStyle: { color: scada.prediction },
    })
    // 回测误差范围：在预测两侧画同色半透明上下界（残差标准差），不填充、不称置信区间
    if (showEnvelope.value && envelope.value) {
      const band = envelopeBand(current.value, algorithmKey.value, envelope.value)
      const boundaryData = (selector: (point: (typeof band)[number]) => number | null) =>
        band.map(point => [curMinute + point.minuteOffset, selector(point)])
      const boundaryStyle = { color: scada.prediction, width: 1, opacity: 0.55 }
      series.push(
        {
          id: 'envelope-upper', type: 'line', name: '回测误差上界', showSymbol: false,
          data: boundaryData(point => point.upper), lineStyle: boundaryStyle, itemStyle: { color: scada.prediction },
        },
        {
          id: 'envelope-lower', type: 'line', name: '回测误差下界', showSymbol: false,
          data: boundaryData(point => point.lower), lineStyle: boundaryStyle, itemStyle: { color: scada.prediction },
        },
      )
    }
  }
  // 当前时刻竖线 + 动态节点圆点（挂在实测温度序列上，markPoint 必须含 name）
  const actualLine = series[0]!
  actualLine.markLine = {
    silent: true, symbol: 'none', lineStyle: { color: scada.prediction, width: 1.5 },
    label: { formatter: '当前时刻', color: scada.textSoft }, data: [{ xAxis: curMinute }],
  }
  actualLine.markPoint = {
    silent: true, symbol: 'circle', symbolSize: 13, label: { show: false }, itemStyle: { color: scada.prediction },
    data: currentSnapshot.value.temp == null ? [] : [{ name: '当前节点', coord: [curMinute, currentSnapshot.value.temp] }],
  }
  return {
    animation: false,
    grid: { left: 52, right: 22, top: 42, bottom: 40 },
    tooltip: {
      ...scadaTooltip(), trigger: 'axis', confine: true, transitionDuration: 0,
      triggerOn: pointerInside.value ? 'mousemove' : 'none',
      valueFormatter: value => formatKilnChartValue(value, '℃'),
      axisPointer: { label: { formatter: info => `${formatKilnNumber(Number(info.value))} min` } },
    },
    legend: { top: 6, textStyle: { color: scada.textSoft, fontSize: 11 } },
    xAxis: {
      type: 'value', name: '窑次时间 / min', nameLocation: 'middle', nameGap: 28,
      min: focusMode.value === 'local' ? curMinute - lookback : undefined,
      max: focusMode.value === 'local' ? curMinute + predictWindow.value : undefined,
      axisLabel: { color: scada.axis }, nameTextStyle: { color: scada.axis }, splitLine: { show: false },
    },
    yAxis: {
      type: 'value', scale: true, name: '℃', axisLabel: { color: scada.axis },
      splitLine: { lineStyle: { color: scada.grid, type: 'dashed' } },
    },
    series,
  }
})

// Reposition after Vue applies the new frame/options, and after ECharts resizes.
watch([mainOption, mainChart, mainTip, tab, pointerInside], scheduleMainTip, { flush: 'post' })

// 分阶段用气：当前阶段高亮，其余暗色；让“空柱”也通过标签表达
const stageOption = computed<EChartsOption>(() => {
  if (!overview.value) return {}
  const stages = overview.value.stages
  const activeKey = progress.value?.stage.key
  const total = stages.reduce((sum, stage) => sum + (stage.gasVolume ?? 0), 0)
  return {
    animation: false,
    grid: { left: 50, right: 14, top: 28, bottom: 34 },
    tooltip: { ...scadaTooltip(), trigger: 'axis', valueFormatter: value => formatKilnReading(value as number, 'Nm³') },
    xAxis: { type: 'category', data: stages.map(stage => stage.name), axisLabel: { color: scada.textSoft } },
    yAxis: { type: 'value', name: 'Nm³', axisLabel: { color: scada.axis }, splitLine: { lineStyle: { color: scada.grid } } },
    series: [{
      type: 'bar', name: '阶段用气', barMaxWidth: 46,
      label: {
        show: true, position: 'top', color: scada.muted, fontSize: 10,
        formatter: p => {
          const v = Number(p.value)
          return total > 0 && Number.isFinite(v) ? `${Math.round((v / total) * 100)}%` : ''
        },
      },
      data: stages.map(stage => ({
        value: stage.gasVolume,
        itemStyle: {
          color: stage.key === activeKey ? scada.gas : scada.faint,
          borderRadius: [4, 4, 0, 0],
        },
      })),
    }],
  }
})

// 误差回放：正负分色 + 0 线，单位跟随当前回放任务
const errorOption = computed<EChartsOption>(() => {
  const unit = props.replay?.unit ?? ''
  return {
    animation: false,
    grid: { left: 50, right: 14, top: 28, bottom: 34 },
    tooltip: { ...scadaTooltip(), trigger: 'axis', valueFormatter: value => formatKilnReading(value as number, unit) },
    xAxis: {
      type: 'category', name: '预测提前 / min',
      data: errors.value.map(point => point.minuteOffset), axisLabel: { color: scada.axis },
    },
    yAxis: {
      type: 'value', name: unit, axisLabel: { color: scada.axis },
      splitLine: { lineStyle: { color: scada.grid } },
    },
    series: [{
      type: 'bar', name: '预测误差', barMaxWidth: 18,
      markLine: {
        silent: true, symbol: 'none', lineStyle: { color: scada.textSoft, width: 1 },
        label: { formatter: '0', color: scada.muted }, data: [{ yAxis: 0 }],
      },
      data: errors.value.map(point => ({
        value: point.error,
        itemStyle: { color: (point.error ?? 0) >= 0 ? scada.amber : scada.gas },
      })),
    }],
  }
})

// KPI 卡数据（深色卡，顶部细色条区分语义）
const kpis = computed(() => [
  { label: '累计用气（瞬时积分）', value: formatKilnNumber(overview.value?.totalGasVolume), unit: 'Nm³', accent: scada.gas, hint: '按燃气瞬时流量积分' },
  { label: '峰值温度', value: formatKilnNumber(overview.value?.peakTemp), unit: '℃', accent: scada.amber, hint: '全窑次最高温度' },
  { label: '当前温度', value: formatKilnNumber(currentSnapshot.value?.temp), unit: '℃', accent: scada.actual, hint: '随播放节点变化' },
  { label: '当前燃气瞬时', value: formatKilnNumber(currentSnapshot.value?.gas), unit: 'Nm³/h', accent: scada.prediction, hint: '随播放节点变化' },
  { label: '验证 MAE', value: formatKilnNumber(props.model?.validation.mae), unit: props.model?.unit, accent: scada.violet, hint: '离线留出验证，非现场精度' },
])
</script>

<template>
  <section class="scada-root" aria-label="预测与分析总览">
    <div v-if="!replay" class="scada-empty" role="status">
      <Loader2 v-if="busy" class="animate-spin" :size="18" />
      <span v-if="busy">正在生成总览数据，请稍候…</span>
      <template v-else>
        <span v-if="error">{{ error }}</span>
        <button type="button" class="scada-btn" @click="emit('request-replay')">{{ error ? '重试总览' : '生成总览' }}</button>
      </template>
    </div>

    <template v-else>
      <!-- 二级视图切换：运行总览 / 能碳概览 -->
      <div class="tab-toggle" role="group" aria-label="总览视图切换">
        <button type="button" :class="{ active: tab === 'run' }" @click="tab = 'run'">运行总览</button>
        <button type="button" :class="{ active: tab === 'energy' }" @click="tab = 'energy'">能碳概览</button>
      </div>

      <KilnEnergyPanel v-if="tab === 'energy' && overview" :overview="overview" />

      <div v-show="tab === 'run'" class="run-view">
      <!-- 顶部状态栏：窑次 / 阶段进度 / 时刻 / 播放状态 -->
      <div class="status-bar">
        <div class="status-left">
          <span class="cycle-name">{{ replay.cycleName }}</span>
          <span class="stage-tag">{{ progress?.stage.name ?? '—' }}</span>
        </div>
        <div class="status-progress">
          <div class="progress-track"><div class="progress-fill" :style="{ width: (progress?.overallProgress ?? 0) * 100 + '%' }" /></div>
          <span class="progress-label">整体 {{ Math.round((progress?.overallProgress ?? 0) * 100) }}%</span>
        </div>
        <div class="status-right">
          <span class="clock">{{ current?.originTs.replace('T', ' ').slice(0, 16) }}</span>
          <span class="play-flag">自动播放中</span>
        </div>
      </div>

      <!-- KPI 卡片 -->
      <div class="kpi-grid">
        <div v-for="kpi in kpis" :key="kpi.label" class="kpi-card">
          <span class="kpi-accent" :style="{ background: kpi.accent }" />
          <p class="kpi-label">{{ kpi.label }}</p>
          <p class="kpi-value"><span>{{ kpi.value }}</span><em v-if="kpi.unit">{{ kpi.unit }}</em></p>
          <p class="kpi-hint">{{ kpi.hint }}</p>
        </div>
      </div>

      <!-- 主趋势 + 健康仪表 -->
      <div class="main-grid">
        <div class="scada-panel">
          <div class="panel-title">
            <h3>温度走势与当前时刻</h3>
            <div class="title-controls">
              <label class="envelope-check">
                <input v-model="showEnvelope" type="checkbox" />回测误差范围
              </label>
              <div class="focus-toggle">
                <button type="button" :class="{ active: focusMode === 'local' }" @click="focusMode = 'local'">局部窗口</button>
                <button type="button" :class="{ active: focusMode === 'full' }" @click="focusMode = 'full'">全窑次</button>
              </div>
            </div>
          </div>
          <div class="main-chart-stage" @mouseenter="pointerInside = true" @mouseleave="resumeMainTip">
            <VChart ref="mainChart" :option="mainOption" :update-options="{ replaceMerge: ['series'] }" autoresize class="main-chart" @rendered="placeMainTip" />
            <div v-if="current && tab === 'run' && !pointerInside" ref="mainTip" class="following-tooltip" :style="tipPosition" aria-live="off">
              <strong>当前时刻 · {{ formatKilnNumber(current.originMinute) }} min</strong>
              <small>{{ current.originTs.replace('T', ' ').slice(0, 19) }}</small>
              <div><span><i class="actual-dot" />实测温度</span><b>{{ formatKilnReading(current.snapshot.temp, '℃') }}</b></div>
              <div><span><i class="plan-dot" />设定温度</span><b>{{ formatKilnReading(current.snapshot.temp_sp, '℃') }}</b></div>
              <template v-if="replay.task === 'temperature'">
                <div class="forecast-heading">未来 +{{ forecastTip.offset ?? predictWindow }} min</div>
                <div><span><i class="prediction-dot" />温度预测</span><b>{{ formatKilnReading(forecastTip.forecast, '℃') }}</b></div>
                <template v-if="showEnvelope"><div><span>回测误差上界</span><b>{{ formatKilnReading(forecastTip.upper, '℃') }}</b></div><div><span>回测误差下界</span><b>{{ formatKilnReading(forecastTip.lower, '℃') }}</b></div><small v-if="forecastTip.forecast != null && forecastTip.upper == null">回测样本不足，暂无误差范围</small></template>
                <small v-if="forecastTip.forecast == null">本帧暂无该时刻的有效预测</small>
                <small v-else-if="forecastTip.shortened">本帧仅覆盖至 +{{ forecastTip.offset }} min</small>
              </template>
            </div>
          </div>
        </div>
        <div class="scada-panel health-panel">
          <div class="panel-title"><h3>燃烧健康</h3><span class="panel-note">默认区间，可配置</span></div>
          <div v-for="panel in healthPanels" :key="panel.rule.key" class="gauge-block">
            <VChart :option="gaugeOption(panel.rule, panel.value, panel.status, panel.range)" autoresize class="gauge-chart" />
            <div class="gauge-foot">
              <span class="health-dot" :style="{ background: scadaStatusColor[panel.status] }" />
              <span class="health-range">正常 {{ panel.rule.normalMin }}–{{ panel.rule.normalMax }} {{ panel.rule.unit }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分阶段用气 + 误差回放 -->
      <div class="bottom-grid">
        <div class="scada-panel">
          <div class="panel-title"><h3>分阶段用气</h3><span class="panel-note">当前阶段高亮</span></div>
          <VChart :option="stageOption" autoresize class="bottom-chart" />
        </div>
        <div class="scada-panel">
          <div class="panel-title"><h3>预测误差</h3><span class="panel-note">预测值减事后实测</span></div>
          <VChart :option="errorOption" autoresize class="bottom-chart" />
        </div>
      </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* 深色控制室容器：颜色全部 scoped，不修改全局变量，其他页面保持浅色 */
.scada-root { display: grid; gap: 14px; padding: 16px; background: #0d141d; border: 1px solid #243040; border-radius: 12px; }
.scada-empty { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; color: #7d8b9c; }
.scada-btn { padding: 8px 14px; border-radius: 6px; background: #3f93e8; color: #fff; cursor: pointer; }

/* 二级视图切换 */
.tab-toggle { display: inline-flex; gap: 3px; padding: 3px; width: fit-content; border: 1px solid #243040; border-radius: 8px; background: #141d29; }
.tab-toggle button { padding: 6px 16px; font-size: 12px; border-radius: 6px; color: #7d8b9c; cursor: pointer; background: transparent; }
.tab-toggle button.active { background: #3f93e8; color: #fff; }
.run-view { display: grid; gap: 14px; }

/* 状态栏 */
.status-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 10px 14px; background: #141d29; border: 1px solid #243040; border-radius: 10px; }
.status-left, .status-right { display: flex; align-items: center; gap: 10px; }
.cycle-name { font-size: 13px; font-weight: 600; color: #e6edf3; }
.stage-tag { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: #18222f; color: #2fae96; border: 1px solid #243040; }
.clock { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #aeb9c6; }
.play-flag { font-size: 11px; color: #7d8b9c; }
.status-progress { display: flex; align-items: center; gap: 10px; flex: 1 1 200px; max-width: 420px; }
.progress-track { flex: 1; height: 6px; border-radius: 4px; background: #18222f; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #2fae96, #3f93e8); border-radius: 4px; transition: width .3s; }
.progress-label { font-size: 11px; color: #7d8b9c; font-family: 'JetBrains Mono', monospace; white-space: nowrap; }

/* KPI */
.kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.kpi-card { position: relative; padding: 14px; background: #141d29; border: 1px solid #243040; border-radius: 10px; overflow: hidden; }
.kpi-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; opacity: .85; }
.kpi-label { font-size: 11px; color: #7d8b9c; }
.kpi-value { margin-top: 8px; display: flex; align-items: baseline; gap: 3px; font-family: 'JetBrains Mono', monospace; }
.kpi-value span { font-size: 24px; font-weight: 650; color: #e6edf3; }
.kpi-value em { font-size: 11px; color: #7d8b9c; font-style: normal; }
.kpi-hint { margin-top: 6px; font-size: 10px; color: #566373; }

/* 面板与栅格 */
.scada-panel { background: #141d29; border: 1px solid #243040; border-radius: 10px; padding: 14px 16px; min-width: 0; }
.main-grid { display: grid; grid-template-columns: minmax(0, 2.1fr) minmax(280px, 1fr); gap: 14px; }
.bottom-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.panel-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.panel-title h3 { font-size: 14px; font-weight: 650; color: #e6edf3; }
.panel-note { font-size: 10px; color: #7d8b9c; }
.main-chart { height: 360px; width: 100%; }
.main-chart-stage { position: relative; min-width: 0; }
.following-tooltip { position:absolute; z-index:3; width:248px; max-width:calc(100% - 16px); box-sizing:border-box; padding:10px 12px; pointer-events:none; border:1px solid #243040; border-radius:8px; background:#1b2532f5; color:#e6edf3; box-shadow:0 3px 12px #0003; font-size:12px; line-height:1.7; }
.following-tooltip strong { display:block; font-size:12px; font-weight:600; }
.following-tooltip small { display:block; color:#7d8b9c; font-size:10px; }
.following-tooltip>div { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:3px; }
.following-tooltip span { display:flex; align-items:center; gap:6px; color:#aeb9c6; }
.following-tooltip b { font-weight:500; font-variant-numeric:tabular-nums; white-space:nowrap; }
.following-tooltip i { width:7px; height:7px; border-radius:50%; display:inline-block; flex-shrink:0; }
.following-tooltip .actual-dot { background:#e08a3c; } .following-tooltip .plan-dot { background:#93a0b0; } .following-tooltip .prediction-dot { background:#3f93e8; }
.following-tooltip .forecast-heading { border-top:1px solid #344253; padding-top:5px; margin-top:6px; color:#7d8b9c; font-size:10px; }
.bottom-chart { height: 260px; width: 100%; }

/* 聚焦切换按钮 */
.focus-toggle { display: flex; gap: 3px; padding: 2px; border: 1px solid #243040; border-radius: 7px; }
.focus-toggle button { padding: 4px 10px; font-size: 11px; border-radius: 5px; color: #7d8b9c; cursor: pointer; background: transparent; }
.focus-toggle button.active { background: #3f93e8; color: #fff; }

/* 标题控件：误差带开关 + 聚焦切换 */
.title-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.envelope-check { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: #7d8b9c; cursor: pointer; white-space: nowrap; }
.envelope-check input { margin: 0; accent-color: #3f93e8; }

/* 健康仪表 */
.health-panel { display: flex; flex-direction: column; gap: 4px; }
.gauge-block { border-top: 1px solid #243040; padding-top: 4px; }
.gauge-chart { height: 118px; width: 100%; }
.gauge-foot { display: flex; align-items: center; gap: 8px; margin-top: -6px; padding: 0 6px 4px; }
.health-dot { width: 8px; height: 8px; border-radius: 50%; }
.health-range { font-size: 10px; color: #7d8b9c; }

/* 响应式 */
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .main-grid { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .kpi-grid, .bottom-grid { grid-template-columns: 1fr; }
}
</style>
