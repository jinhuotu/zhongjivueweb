<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { use } from 'echarts/core'
import { MarkPointComponent } from 'echarts/components'
import type { EChartsOption, LineSeriesOption } from 'echarts'
import { Loader2, Pause, Play } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { formatKilnChartValue, formatKilnNumber, formatKilnReading as reading, KILN_PARAMETER_DIGITS, kilnReadingDigits } from '@/lib/kiln-studio-format'
import { replayAlgorithmFuelVolume, replayDeviations, replayFuelVolume } from '@/lib/kiln-replay-comparison'
import { hasMinuteForecast } from '@/lib/kiln-studio-state'
import type { AlgorithmKey, CatalogVersion, DashboardLayout, Dataset, Experiment, Mechanism, Parameters, ReplayExcludedRange, ReplayFrame, ReplayHorizon, ReplayPackage, ReplayRequest, StudioState, Template } from '@/lib/kiln-studio-api'

const props = defineProps<{
  experiment: Experiment
  dataset: Dataset
  replay?: ReplayPackage
  baselineReplay?: ReplayPackage
  preferredAlgorithm?: AlgorithmKey
  dashboardLayout?: Pick<DashboardLayout, 'chart' | 'windowMinutes'>
  mechanism?: Mechanism
  mechanismTemplate?: Template
  mechanismRevision?: CatalogVersion
  parameterDefinitions: StudioState['parameterDefinitions']
  busy: boolean
}>()
const emit = defineEmits<{ generate: [request: ReplayRequest]; configure: [] }>()
ensureEcharts()
use([MarkPointComponent])

const palette = useChartPalette()
const cutoff = computed(() => props.experiment.split.find(item => item.name === '训练')?.to)
const cycles = computed(() => props.dataset.summary.filter(item => !cutoff.value || item.to > cutoff.value))
const availableAlgorithms = computed(() => props.experiment.algorithms.filter(item => item.available))
const algorithms = computed(() => availableAlgorithms.value.filter(item => item.key !== 'physics'))
const isTemperature = computed(() => props.experiment.config.task === 'temperature')
const isMinuteTask = computed(() => ['temperature', 'energy'].includes(props.experiment.config.task))
const minuteAlgorithms = computed(() => algorithms.value.filter(item =>
  item.key === 'baseline' || hasMinuteForecast(item, props.experiment.config.horizonMinutes) ||
  props.experiment.config.horizonMinutes === 1,
))
const cycleId = ref(props.replay?.request.cycleId ?? cycles.value[0]?.fileId ?? '')
const excludedRange = ref<ReplayExcludedRange | null>(props.replay?.request.excludedRange ?? null)
const excludeStart = ref(excludedRange.value?.start ?? '')
const excludeEnd = ref(excludedRange.value?.end ?? '')
const cycle = computed(() => cycles.value.find(item => item.fileId === cycleId.value))
const rangeKey = (range?: ReplayExcludedRange | null) => range ? `${range.start}/${range.end}` : ''
const canExclude = computed(() => !!excludeStart.value && excludeEnd.value > excludeStart.value &&
  !!cycle.value && excludeStart.value <= cycle.value.to.slice(0, 16) &&
  excludeEnd.value > cycle.value.from.slice(0, 16))
watch(cycleId, () => {
  excludeStart.value = ''
  excludeEnd.value = ''
  excludedRange.value = null
})
const selected = ref<AlgorithmKey>((props.dashboardLayout && props.preferredAlgorithm) || (props.replay?.request.selectedAlgorithms.find(key =>
  algorithms.value.some(item => item.key === key))
  ?? algorithms.value.find(item => item.key === props.preferredAlgorithm)?.key
  ?? (isTemperature.value ? minuteAlgorithms.value.find(item => item.key === 'lstm')?.key : undefined)
  ?? algorithms.value[0]?.key ?? availableAlgorithms.value[0]?.key ?? ''))
const selectedAlgorithms = ref<AlgorithmKey[]>(props.replay?.request.selectedAlgorithms ??
  [...new Set([selected.value, availableAlgorithms.value.find(item => item.key === 'physics')?.key,
    ...availableAlgorithms.value.map(item => item.key)])].filter((key): key is AlgorithmKey => !!key).slice(0, 3))
const requestedAlgorithms = computed(() => props.dashboardLayout
  ? [selected.value].filter(Boolean)
  : availableAlgorithms.value.filter(item => selectedAlgorithms.value.includes(item.key)).map(item => item.key))
const horizon = ref<ReplayHorizon>(30)
const windowMinutes = computed(() => props.dashboardLayout?.windowMinutes ?? horizon.value)
const horizons = [5, 30, 60] as const
// The gas summary includes a 60-minute volume even when the chart shows 5/10/30 minutes.
const requestedHorizon = computed<ReplayHorizon>(() => props.experiment.config.task === 'energy' ? 60 : props.dashboardLayout ? 30 : horizon.value)
const timelineId = useId()
const frameStep = ref(props.replay?.request.frameStepMinutes ?? 5)
const frameSteps = [1, 5, 10, 15, 30] as const
const speeds = [0.5, 1, 2, 4] as const
const speed = ref<number>(1)
const frameIndex = ref(firstPlayableFrame(props.replay))
const playing = ref(false)
const showPlan = ref(!props.dashboardLayout)
const current = computed(() => props.replay?.frames[frameIndex.value])
const snapshot = computed(() => current.value?.snapshot)
const previousSnapshot = computed(() => props.replay?.frames[frameIndex.value - 1]?.snapshot)
const needsReplay = computed(() => {
  const request = props.replay?.request
  return !request || !requestedAlgorithms.value.length || request.cycleId !== cycleId.value ||
    request.frameStepMinutes !== frameStep.value || request.horizonMinutes < requestedHorizon.value ||
    (props.dashboardLayout && !request.includeMechanism) ||
    requestedAlgorithms.value.some(key => !request.selectedAlgorithms.includes(key) ||
      (isTemperature.value && key === 'baseline' &&
        props.replay?.algorithms.find(item => item.key === key)?.temperatureTrajectory !== 'persistence')) ||
    rangeKey(request.excludedRange) !== rangeKey(excludedRange.value)
})
const frameCount = computed(() => props.replay?.frames.length ?? 0)
const canPlay = computed(() => !needsReplay.value && frameCount.value > 1 && !props.busy)
const algorithm = computed(() => props.replay?.algorithms.find(item => item.key === selected.value))
const algorithmDefinition = computed(() => algorithms.value.find(item => item.key === selected.value))
const trajectoryMethod = computed(() => algorithm.value?.forecastTrajectory ?? algorithm.value?.temperatureTrajectory ??
  (algorithmDefinition.value && minuteAlgorithms.value.includes(algorithmDefinition.value) ? undefined : 'fixedHorizon'))
const trajectoryLabel = computed(() => {
  if (!isMinuteTask.value) return '算法预测'
  if (trajectoryMethod.value === 'persistence') return '持续值基线'
  if (trajectoryMethod.value === 'fixedHorizon') return '算法时距预测点'
  return '算法逐分钟预测'
})
const task = computed(() => props.experiment.config.task)
const subject = computed(() => ({
  temperature: '温度', energy: '燃气流量', afr: '空燃比',
})[task.value])
const temperatureTarget = computed(() => props.experiment.config.zone ? `${props.experiment.config.zone} 区` : '总体温度')
const unit = computed(() => props.replay?.unit ?? props.experiment.unit)
const mechanismLabel = computed(() => task.value === 'afr' ? '机理参考配比' : '机理预测')
const forecastSlots = computed(() => selected.value === 'physics' ? [] : current.value?.future[selected.value]?.filter(item =>
  item.minuteOffset <= windowMinutes.value,
) ?? [])
const shownForecast = computed(() => forecastSlots.value.filter(item => item.value != null))
const mechanismForecast = computed(() => current.value?.mechanismFuture?.filter(item => item.minuteOffset <= windowMinutes.value) ?? [])
const actualForecast = computed(() => current.value?.actualFuture.filter(item => item.minuteOffset <= windowMinutes.value + 1e-6) ?? [])
const forecastColors = ['#2379d2', '#248774', '#ac5a96', '#ba602f', '#755ab4', '#477b2d', '#177d95']
const forecastSeries = computed(() => availableAlgorithms.value.flatMap((item, index) => {
  if (!requestedAlgorithms.value.includes(item.key)) return []
  const model = props.replay?.algorithms.find(algorithm => algorithm.key === item.key)
  const slots = current.value?.future[item.key]?.filter(point => point.minuteOffset <= windowMinutes.value) ?? []
  return [{
    key: item.key, name: item.name, color: forecastColors[index % forecastColors.length],
    slots, count: slots.filter(point => point.value !== null).length,
    fixed: (model?.forecastTrajectory ?? model?.temperatureTrajectory) != null
      ? (model?.forecastTrajectory ?? model?.temperatureTrajectory) === 'fixedHorizon'
      : props.experiment.config.horizonMinutes > 1 && !hasMinuteForecast(item, props.experiment.config.horizonMinutes),
    nativeMinutes: model?.trainedHorizonMinutes ?? props.experiment.config.horizonMinutes,
  }]
}))
const deviations = computed(() => replayDeviations(
  actualForecast.value, isTemperature.value ? forecastSlots.value : shownForecast.value,
  mechanismForecast.value.filter(item => item.value !== null),
))
const lastAligned = computed(() => {
  const latestFirst = [...deviations.value].reverse()
  return latestFirst.find(row => row.algorithmDeviation !== null && row.mechanismDeviation !== null)
    ?? latestFirst.find(row => row.algorithmDeviation !== null || row.mechanismDeviation !== null)
})
const baselineFrame = computed(() => {
  const baseline = props.baselineReplay
  if (!props.replay?.request.excludedRange || !baseline || baseline.request.cycleId !== cycleId.value) return
  return baseline.frames.find(frame => frame.originTs === current.value?.originTs)
})
const exclusionComparison = computed(() => {
  const before = baselineFrame.value
  const after = current.value
  if (!before || !after) return []
  const channel = (frame: ReplayFrame) => selected.value === 'physics'
    ? frame.future.physics ?? frame.mechanismFuture ?? []
    : frame.future[selected.value] ?? []
  const left = new Map(channel(before).map(point => [point.minuteOffset, point.value]))
  const right = new Map(channel(after).map(point => [point.minuteOffset, point.value]))
  return [...new Set([...left.keys(), ...right.keys()])].filter(minute => minute <= windowMinutes.value)
    .map(minute => ({ minute, before: left.get(minute) ?? null, after: right.get(minute) ?? null }))
    .filter(row => row.before !== null || row.after !== null)
})
const algorithmIssue = computed(() => {
  if (!algorithmDefinition.value) return '当前实验只有机理结果。可加入数据算法并重新回测。'
  if (isMinuteTask.value) {
    if (trajectoryMethod.value === 'fixedHorizon') {
      return `此模型按 ${algorithm.value?.trainedHorizonMinutes ?? props.experiment.config.horizonMinutes} 分钟时距计算。要看窗口内每分钟的变化，请选择或训练逐分钟模型。`
    }
    if (shownForecast.value.length < windowMinutes.value) {
      return '此起点的有效历史或后续连续记录不足，空白分钟未获得模型输出。可移动回放起点。'
    }
    return ''
  }
  if (!shownForecast.value.length) return '当前窗口没有算法计算点，请核对模型输出时距或移动起点，选择历史和设定计划记录完整的时段。'
  return ''
})
const mechanismIssue = computed(() => {
  if (mechanismForecast.value.at(-1)?.value != null && mechanismForecast.value.at(-1)?.minuteOffset === windowMinutes.value) return ''
  return current.value?.mechanismIssue ?? '当前记录未覆盖完整的机理预测窗口。'
})
const originActual = computed(() => {
  const frame = current.value
  if (!frame) return null
  return task.value === 'energy' ? frame.snapshot.gas
    : task.value === 'afr' ? frame.snapshot.afr
      : props.replay?.zone ? frame.snapshot.zones[props.replay.zone - 1]?.temp ?? null : frame.snapshot.temp
})
const evidence = computed(() => {
  const template = props.mechanismTemplate?.key
  const sources = props.mechanismRevision?.evidence ?? (template
    ? [...(props.mechanism?.evidence[template] ?? []), ...(props.mechanism?.inheritedEvidence?.[template] ?? [])]
    : [])
  return [...new Map(sources.map(source => [source.id, source])).values()]
})
const mechanismParameters = computed(() => props.parameterDefinitions.filter(param =>
  props.mechanismTemplate?.parameters.includes(param.key)))
function parameterSource(key: keyof Parameters) {
  if (!props.mechanism) return '实验快照'
  if (props.mechanism.parameters[key] !== props.experiment.parameters[key]) return '训练集标定'
  const source = props.mechanism.provenance[key]
  if (source?.startsWith('experiment:')) return '训练集标定'
  if (source?.startsWith('catalog:')) return '库机理版本'
  if (source?.startsWith('history:')) return '历史机理版本'
  return evidence.value.some(item => item.id === source) ? '关联资料' : source?.includes(':') ? '项目资料' : source || '保存版本参数'
}
const elapsed = (minute: number) => {
  const rounded = Math.round(Math.max(0, minute))
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

let ticker = 0
let lastTick = 0
const msPerFrame = 420
function firstPlayableFrame(replay: ReplayPackage | undefined) {
  if (!replay) return 0
  const keys = requestedAlgorithms.value
  if (!props.dashboardLayout) {
    let bestFrame = 0
    let bestCount = 0
    for (const [index, frame] of replay.frames.entries()) {
      const count = keys.filter(key => frame.future[key]?.some(point =>
        point.minuteOffset <= windowMinutes.value && point.value != null)).length
      if (count > bestCount || (count === bestCount && frame.originMinute >= 20 && replay.frames[bestFrame].originMinute < 20)) {
        bestFrame = index
        bestCount = count
      }
      if (count === keys.length && frame.originMinute >= 20) break
    }
    return bestFrame
  }
  if (isTemperature.value && props.dashboardLayout) {
    const complete = replay.frames.findIndex(frame => frame.originMinute >= 20 &&
      frame.future[selected.value]?.filter(point =>
        point.minuteOffset <= windowMinutes.value && point.value != null,
      ).length === windowMinutes.value)
    if (complete >= 0) return complete
  }
  const hasPrediction = (frame: ReplayFrame) => keys.some(key => frame.future[key]?.some(point =>
    point.minuteOffset <= windowMinutes.value && point.value != null,
  ))
  const withHistory = replay.frames.findIndex(frame => frame.originMinute >= 20 && hasPrediction(frame))
  return withHistory >= 0 ? withHistory : Math.max(0, replay.frames.findIndex(hasPrediction))
}
function pause() {
  playing.value = false
  cancelAnimationFrame(ticker)
  lastTick = 0
}
function tick(now: number) {
  if (!playing.value) return
  if (!lastTick) lastTick = now
  if (now - lastTick >= msPerFrame / speed.value) {
    frameIndex.value = Math.min(frameIndex.value + 1, frameCount.value - 1)
    lastTick = now
    if (frameIndex.value === frameCount.value - 1) { pause(); return }
  }
  ticker = requestAnimationFrame(tick)
}
function togglePlay() {
  if (playing.value) { pause(); return }
  if (!canPlay.value) return
  if (frameIndex.value >= frameCount.value - 1) frameIndex.value = firstPlayableFrame(props.replay)
  playing.value = true
  ticker = requestAnimationFrame(tick)
}
function seek(event: Event) {
  pause()
  frameIndex.value = Number((event.target as HTMLInputElement).value)
}
let lastRequest = ''
const requestKey = computed(() => JSON.stringify([cycleId.value, requestedAlgorithms.value, requestedHorizon.value, frameStep.value, rangeKey(excludedRange.value)]))
function generate() {
  if (!cycleId.value || !requestedAlgorithms.value.length || props.busy) return
  pause()
  lastRequest = requestKey.value
  emit('generate', {
    experimentId: props.experiment.id, cycleId: cycleId.value, frameStepMinutes: frameStep.value,
    horizonMinutes: requestedHorizon.value, selectedAlgorithms: requestedAlgorithms.value,
    includeMechanism: !!props.dashboardLayout,
    ...(excludedRange.value ? { excludedRange: excludedRange.value } : {}),
  })
}
watch(() => props.replay, (value, previous) => {
  pause()
  const origin = previous?.frames[frameIndex.value]?.originTs
  const sameCycle = previous?.request.cycleId === value?.request.cycleId
  const matchingIndex = origin && sameCycle ? value?.frames.findIndex(frame => frame.originTs >= origin) : undefined
  frameIndex.value = matchingIndex != null && matchingIndex >= 0 ? matchingIndex : firstPlayableFrame(value)
})
watch([needsReplay, requestKey, () => props.busy], ([missing, key, busy]) => {
  if (missing && !busy && lastRequest !== key) generate()
}, { immediate: true })
watch(canPlay, allowed => { if (!allowed) pause() })
watch(speed, () => { lastTick = 0 })
onBeforeUnmount(pause)

type PlotPoint = [minute: number, value: number | null]
const base = computed(() => props.replay?.baseSeries ?? [])
const maxGap = computed(() => {
  const gaps = base.value.slice(1).map((point, i) => point.minute - base.value[i]!.minute).sort((a, b) => a - b)
  if (!gaps.length) return Infinity
  const lower = gaps[Math.floor((gaps.length - 1) / 2)]!
  const upper = gaps[Math.floor(gaps.length / 2)]!
  return (lower + upper) / 2 * 1.5 + 1e-7
})
const fuelWindows = computed(() => {
  const frame = current.value
  if (task.value !== 'energy' || !frame) return []
  const anchor = { minuteOffset: 0, value: originActual.value }
  const step = algorithm.value?.trainedHorizonMinutes ?? Infinity
  const algorithmPoints = selected.value !== 'physics'
    ? (frame.future[selected.value] ?? [])
    : []
  return horizons.map(minutes => ({
    minutes,
    actual: replayFuelVolume([anchor, ...frame.actualFuture], minutes, maxGap.value),
    algorithm: replayAlgorithmFuelVolume([anchor, ...algorithmPoints], minutes, step, trajectoryMethod.value),
    mechanism: replayFuelVolume([anchor, ...(frame.mechanismFuture ?? [])], minutes, 1),
  }))
})
const barOption = computed<EChartsOption>(() => {
  const p = palette.value
  const fuel = task.value === 'energy'
  const volume = fuelWindows.value.find(row => row.minutes === windowMinutes.value)
  const aligned = lastAligned.value
  const values = fuel
    ? [volume?.actual, volume?.algorithm, volume?.mechanism].map(item => item?.complete ? item.volume : null)
    : [aligned?.actual ?? null, aligned?.algorithm ?? null, aligned?.mechanism ?? null]
  const measure = fuel ? 'Nm³' : unit.value
  return {
    animation: false,
    grid: { left: 65, right: 22, top: 42, bottom: 45 },
    tooltip: { ...tooltipBase(p), trigger: 'axis', valueFormatter: item => formatKilnChartValue(item, measure) },
    xAxis: { type: 'category', data: ['事后实测', '算法预测', mechanismLabel.value], axisLabel: { color: p.axis } },
    yAxis: { type: 'value', name: measure, axisLabel: { color: p.axis } },
    series: [{ type: 'bar', name: fuel ? '累计用气' : subject.value, barMaxWidth: 64,
      data: values.map((value, index) => ({ value, itemStyle: { color: ['#8996a8', '#2379d2', '#248774'][index] } })) }],
  }
})
function volumeText(result: ReturnType<typeof replayFuelVolume>) {
  return result.volume === null ? '—' : reading(result.volume, 'Nm³')
    + (result.complete ? '' : `（覆盖 ${formatKilnNumber(result.covered)} 分钟）`)
}
function deviationText(value: number | null, measure = unit.value) {
  const display = reading(value, measure)
  return value !== null && value > 0 && formatKilnNumber(value, kilnReadingDigits(measure)) !== '0'
    ? '+' + display : display
}
function plotGaps(points: PlotPoint[]): PlotPoint[] {
  const output: PlotPoint[] = []
  for (const point of points) {
    const previous = output.at(-1)
    if (previous && point[0] - previous[0] > maxGap.value) output.push([(point[0] + previous[0]) / 2, null])
    output.push(point)
  }
  return output
}
function indexAt(minute: number) {
  let low = 0
  let high = base.value.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (base.value[mid]!.minute < minute) low = mid + 1
    else high = mid
  }
  return low
}
const delta = (value: number | null, previous: number | null | undefined, unit: string) => {
  if (value == null || previous == null || !current.value) return ''
  const before = props.replay?.frames[frameIndex.value - 1]?.originMinute
  if (before == null || current.value.originMinute - before > frameStep.value + maxGap.value) return ''
  const difference = value - previous
  const display = formatKilnNumber(difference, kilnReadingDigits(unit))
  return display === '0' || display === '—' ? '' : `${difference > 0 ? '+' : ''}${display}`
}
const signals = [
  ['temp', '平均温度', '℃'], ['temp_sp', '设定温度', '℃'], ['gas', '燃气', 'Nm³/h'],
  ['air', '助燃风', 'Nm³/h'], ['afr', '空燃比', 'Nm³/Nm³'], ['o2', '氧含量', '%'], ['pressure', '窑压', 'Pa'],
] as const
const zoneSignals = [
  ['temp', '温度', '℃'], ['gas', '燃气', 'Nm³/h'], ['air', '助燃风', 'Nm³/h'], ['airValve', '助燃风阀位', ''],
] as const

const option = computed<EChartsOption>(() => {
  const frame = current.value
  const replay = props.replay
  if (!frame || !replay) return {}
  const p = palette.value
  const origin = frame.originMinute
  const first = Math.max(0, Math.floor(origin / 20) * 20 - 25)
  const last = origin + windowMinutes.value
  const series: LineSeriesOption[] = []
  function line(id: string, name: string, data: PlotPoint[], color: string, dashed = false): LineSeriesOption {
    const value: LineSeriesOption = {
      id, type: 'line', name, data, showSymbol: false, connectNulls: false,
      lineStyle: { color, type: dashed ? 'dashed' : 'solid', width: 1.8 }, itemStyle: { color },
    }
    series.push(value)
    return value
  }
  const actual = originActual.value
  const history = base.value.slice(Math.max(0, indexAt(first) - 1), indexAt(origin + 1e-7))
  const target = task.value === 'temperature' ? temperatureTarget.value : ''
  const historyLine = line('history', target + '历史实测', plotGaps(history.map(point => [point.minute, point.actual])), p.tooltipText)
  historyLine.markLine = {
    silent: true, symbol: 'none', lineStyle: { color: '#358de2', width: 1.5 },
    label: { formatter: '预测起点', color: p.axis }, data: [{ xAxis: origin }],
  }
  historyLine.markPoint = {
    silent: true, symbol: 'circle', symbolSize: 14, label: { show: false }, itemStyle: { color: '#358de2' },
    data: actual == null ? [] : [{ name: '起点实测', coord: [origin, actual] }],
  }
  const secondAxis = !props.dashboardLayout && task.value !== 'temperature' && showPlan.value
  if (showPlan.value) {
    const plan = base.value.slice(Math.max(0, indexAt(first) - 1), indexAt(last + 1e-7))
    const planLine = line('plan', '设定温度', plotGaps(plan.map(point => [point.minute, point.setpoint])), '#bc873a', true)
    planLine.yAxisIndex = secondAxis ? 1 : 0
    planLine.tooltip = { valueFormatter: value => formatKilnChartValue(value, '℃') }
  }
  const futureActual: PlotPoint[] = actualForecast.value.map(item => [origin + item.minuteOffset, item.value])
  line('future-actual', target + '事后实测', plotGaps([[origin, actual ?? null], ...futureActual]), '#8996a8', true)
  if (!props.dashboardLayout) {
    forecastSeries.value.forEach(item => {
      if (!item.count) return
      const points: PlotPoint[] = item.slots.map(point => [origin + point.minuteOffset, point.value])
      // 所有预测线都从预测起点（当前实测）出发，保证视觉连贯
      points.unshift([origin, actual])
      const prediction = line('prediction-' + item.key, item.name, points, item.color, item.key !== 'physics')
      prediction.showSymbol = true
      prediction.symbol = 'circle'
      // 固定步长（稀疏）预测同样用线连接节点，节点点保留以标出真实预测位置，不插值不编造
      prediction.symbolSize = item.fixed ? 6 : 4
    })
    if (requestedAlgorithms.value.includes('fusion') && forecastSeries.value.some(item => item.key === 'fusion' && item.fixed)) {
      const reference = frame.fusionReference?.filter(point => point.minuteOffset <= windowMinutes.value) ?? []
      if (reference.some(point => point.value !== null)) {
        const points: PlotPoint[] = reference.map(point => [origin + point.minuteOffset, point.value])
        const referenceLine = line('fusion-reference', '融合的机理参考', [[origin, actual], ...points], '#938184')
        referenceLine.lineStyle = { color: '#938184', type: 'dotted', width: 1.5 }
      }
    }
  } else if (shownForecast.value.length) {
    const values = isMinuteTask.value ? forecastSlots.value : shownForecast.value
    const points: PlotPoint[] = values.map(item => [origin + item.minuteOffset, item.value])
    const prediction = line('prediction', trajectoryLabel.value, points, '#2379d2', true)
    if (isMinuteTask.value && trajectoryMethod.value === 'fixedHorizon') prediction.lineStyle = { opacity: 0 }
    prediction.showSymbol = trajectoryMethod.value === 'fixedHorizon'
    prediction.symbol = 'circle'
    prediction.symbolSize = 7
  }
  if (mechanismForecast.value.some(item => item.value !== null)) {
    const points: PlotPoint[] = mechanismForecast.value.map(item => [origin + item.minuteOffset, item.value])
    if (task.value === 'temperature' && actual !== null) points.unshift([origin, actual])
    line('mechanism', mechanismLabel.value, points, '#248774')
  }
  if (exclusionComparison.value.length) {
    line('before-exclusion', '排除前预测', exclusionComparison.value.map(row => [origin + row.minute, row.before]), '#a468ca', true)
  }
  return {
    animation: false,
    grid: { left: 63, right: secondAxis ? 63 : 26, top: 65, bottom: 52 },
    tooltip: {
      ...tooltipBase(p), trigger: 'axis', renderMode: 'richText', confine: true,
      axisPointer: { label: { formatter: info => elapsed(Number(info.value)) } },
      valueFormatter: item => formatKilnChartValue(item, unit.value),
    },
    legend: { type: 'scroll', top: 8, textStyle: { color: p.legend, fontSize: 12 } },
    xAxis: {
      type: 'value', min: first, max: last, name: '烧成经过时间', nameLocation: 'middle', nameGap: 31,
      axisLabel: { formatter: elapsed, color: p.axis }, nameTextStyle: { color: p.axis }, splitLine: { show: false },
    },
    yAxis: [
      { type: 'value', name: unit.value, scale: true, axisLabel: { color: p.axis, formatter: value => formatKilnNumber(value, kilnReadingDigits(unit.value)) }, splitLine: { lineStyle: { color: p.grid, type: 'dashed' } } },
      ...(secondAxis ? [{ type: 'value' as const, name: '设定 ℃', scale: true, axisLabel: { color: p.axis }, splitLine: { show: false } }] : []),
    ],
    series,
  }
})
</script>

<template>
  <section class="replay" aria-label="动态预测回放">
    <header class="replay-header">
      <h2>{{ task === 'energy' ? '燃气能耗' : subject }}滚动预测回放</h2>
      <p>{{ task === 'temperature' ? temperatureTarget : replay?.targetLabel ?? subject }} · {{ experiment.sourceKind === 'synthetic' ? '合成演示' : '历史记录' }}</p>
    </header>
    <div class="replay-config">
      <label>窑次
        <select v-model="cycleId" :disabled="busy">
          <option v-if="!cycles.length" value="">没有可回放的历史记录</option>
          <option v-for="cycle in cycles" :key="cycle.fileId" :value="cycle.fileId">{{ cycle.file }}</option>
        </select>
      </label>
      <fieldset v-if="!dashboardLayout" class="model-options" :disabled="busy">
        <legend>对比算法</legend>
        <label v-for="item in availableAlgorithms" :key="item.key">
          <input v-model="selectedAlgorithms" type="checkbox" :value="item.key" />
          {{ item.name }}
        </label>
      </fieldset>
      <label v-if="!dashboardLayout">预测窗口
        <select v-model.number="horizon">
          <option v-for="value in horizons" :key="value" :value="value">{{ value }} 分钟</option>
        </select>
      </label>
    </div>
    <details v-if="dashboardLayout && cycle" class="comparison-detail exclusion-controls">
      <summary>排除一段历史记录后回放</summary>
      <p>北京时间，含开始时刻。保持模型版本，按新输入重新计算。原记录和时间轴保留。</p>
      <div class="exclusion-inputs">
        <label>开始时间 <input v-model="excludeStart" type="datetime-local" :disabled="busy" /></label>
        <label>结束时间 <input v-model="excludeEnd" type="datetime-local" :disabled="busy" /></label>
        <button type="button" class="primary" :disabled="busy || !canExclude || !baselineReplay || baselineReplay.request.cycleId !== cycleId" @click="excludedRange = { start: excludeStart, end: excludeEnd }">排除并回放</button>
        <button v-if="excludedRange" type="button" :disabled="busy" @click="excludedRange = null">恢复完整记录</button>
      </div>
      <p v-if="(excludeStart || excludeEnd) && !canExclude" role="status">请选择与当前窑次重叠的有效时间区间。</p>
      <p v-if="replay?.excludedCount && !needsReplay" role="status">已排除 {{ formatKilnNumber(replay.excludedCount, 0) }} 条记录。图中保留时段缺口。</p>
    </details>
    <div v-if="replay && current && !needsReplay" class="replay-content">
      <div class="chart-pane">
        <div class="player">
          <button type="button" class="primary" :disabled="!canPlay" @click="togglePlay">
            <Pause v-if="playing" :size="15" /><Play v-else :size="15" />{{ playing ? '暂停' : '播放' }}
          </button>
          <label>倍速 <select v-model.number="speed"><option v-for="value in speeds" :key="value" :value="value">{{ value }}×</option></select></label>
          <label v-if="!dashboardLayout || task === 'temperature'"><input v-model="showPlan" type="checkbox" /> 显示设定温度</label>
        </div>
        <template v-if="dashboardLayout?.chart === 'bar'">
          <p v-if="task === 'energy'" class="availability">未来 {{ windowMinutes }} 分钟累计用气 · 柱形仅展示覆盖完整窗口的结果</p>
          <p v-else class="availability">{{ lastAligned ? `提前 ${formatKilnNumber(lastAligned.minute)} 分钟 · 同一时点对比` : '当前窗口没有可对齐的数值' }}</p>
          <VChart :option="barOption" autoresize class="forecast-chart" />
        </template>
        <VChart v-else :option="option" :update-options="{ replaceMerge: ['series', 'yAxis'] }" autoresize class="forecast-chart" />
        <div class="timeline">
          <label :for="timelineId">回放位置 · {{ current.originTs.replace('T', ' ').slice(0, 19) }}</label>
          <input :id="timelineId" type="range" min="0" :max="frameCount - 1" :value="frameIndex" @input="seek" />
        </div>
        <ul v-if="!dashboardLayout" class="model-status" aria-label="当前预测点">
          <li v-for="item in forecastSeries" :key="item.key">
            <span class="model-dot" :style="{ backgroundColor: item.color }" aria-hidden="true"></span>
            <strong>{{ item.name }}</strong>
            <span v-if="item.count">{{ item.count }} 个预测点<template v-if="item.fixed"> · 每 {{ item.nativeMinutes }} 分钟一个点</template></span>
            <span v-else-if="item.fixed && item.nativeMinutes > windowMinutes">需至少 {{ item.nativeMinutes }} 分钟窗口</span>
            <span v-else>当前起点暂无预测</span>
          </li>
        </ul>
        <template v-else>
        <div class="comparison-summary" v-if="lastAligned">
          <p>提前 {{ formatKilnNumber(lastAligned.minute) }} 分钟 · 最近可核对的预测点</p>
          <dl class="comparison-values">
            <div><dt>事后实测</dt><dd>{{ reading(lastAligned.actual, unit) }}</dd></div>
            <div><dt>算法预测</dt><dd>{{ reading(lastAligned.algorithm, unit) }}</dd><small>偏差 {{ deviationText(lastAligned.algorithmDeviation) }}</small></div>
            <div><dt>{{ mechanismLabel }}</dt><dd>{{ reading(lastAligned.mechanism, unit) }}</dd><small>{{ task === 'afr' ? '参考差值' : '偏差' }} {{ deviationText(lastAligned.mechanismDeviation) }}</small></div>
          </dl>
        </div>
        <p v-else class="availability">当前窗口暂无同刻预测与事后实测可对照。可移动游标查看其他时刻。</p>
        <p v-if="algorithmDefinition" class="availability">
          {{ trajectoryLabel }}覆盖 {{ shownForecast.length }} / {{ windowMinutes }} 个分钟点
          <span v-if="shownForecast.length === windowMinutes"> · 同一起点的每分钟均有预测</span>
        </p>
        <p v-if="trajectoryMethod === 'persistence'" class="availability">每分钟沿用预测起点的实测温度，作为温度变化的对照。</p>
        <p v-if="algorithmIssue" class="availability">{{ algorithmIssue }}
          <button v-if="isMinuteTask && (trajectoryMethod === 'fixedHorizon' || !algorithmDefinition)" type="button" class="configure-link"
            @click="emit('configure')">{{ dashboardLayout ? '训练并启用 30 分钟逐点模型' : '打开逐分钟模型设置' }}</button>
          <button v-else-if="!dashboardLayout && !isTemperature" type="button" class="configure-link" @click="emit('configure')">打开实验设置</button>
        </p>
        <p v-if="mechanismIssue" class="availability">{{ mechanismIssue }}</p>
        <details v-if="exclusionComparison.length" class="comparison-detail" open>
          <summary>同起点的{{ selected === 'physics' ? '机理' : '算法' }}预测 · 排除前后</summary>
          <div class="comparison-table"><table>
            <thead><tr><th scope="col">提前 / 分钟</th><th scope="col">排除前</th><th scope="col">排除后</th><th scope="col">后减前</th></tr></thead>
            <tbody><tr v-for="row in exclusionComparison" :key="row.minute">
              <th scope="row">{{ row.minute }}</th><td>{{ reading(row.before, unit) }}</td><td>{{ reading(row.after, unit) }}</td>
              <td>{{ deviationText(row.after === null || row.before === null ? null : row.after - row.before) }}</td>
            </tr></tbody>
          </table></div>
        </details>
        <details v-if="deviations.length" class="comparison-detail" :open="isTemperature">
          <summary>逐分钟预测与偏差 · {{ deviations.length }} 个时刻</summary>
          <p>提前量从同一个预测起点算起。圆点为算法计算点。事后实测与算法预测在同一时刻都有值时，计算算法偏差。</p>
          <div class="comparison-table"><table>
            <thead><tr><th scope="col">提前 / 分钟</th><th scope="col">事后实测</th><th scope="col">算法预测</th><th scope="col">算法偏差</th><th scope="col">{{ mechanismLabel }}</th><th scope="col">{{ task === 'afr' ? '参考差值' : '机理偏差' }}</th></tr></thead>
            <tbody><tr v-for="row in deviations" :key="row.minute">
              <th scope="row">+{{ formatKilnNumber(row.minute) }}</th>
              <td>{{ reading(row.actual, unit) }}</td><td>{{ reading(row.algorithm, unit) }}</td><td>{{ deviationText(row.algorithmDeviation) }}</td>
              <td>{{ reading(row.mechanism, unit) }}</td><td>{{ deviationText(row.mechanismDeviation) }}</td>
            </tr></tbody>
          </table></div>
        </details>
        <section v-if="fuelWindows.length" class="comparison-detail">
          <h3>从当前起点累计耗气</h3>
          <div class="comparison-table"><table>
            <thead><tr><th scope="col">未来窗口</th><th scope="col">事后实测</th><th scope="col">算法预测</th><th scope="col">算法偏差</th><th scope="col">机理预测</th><th scope="col">机理偏差</th></tr></thead>
            <tbody><tr v-for="row in fuelWindows" :key="row.minutes">
              <th scope="row">{{ row.minutes }} 分钟</th>
              <td>{{ volumeText(row.actual) }}</td><td>{{ volumeText(row.algorithm) }}</td>
              <td>{{ deviationText(row.actual.complete && row.algorithm.complete ? row.algorithm.volume! - row.actual.volume! : null, 'Nm³') }}</td>
              <td>{{ volumeText(row.mechanism) }}</td>
              <td>{{ deviationText(row.actual.complete && row.mechanism.complete ? row.mechanism.volume! - row.actual.volume! : null, 'Nm³') }}</td>
            </tr></tbody>
          </table></div>
          <p>按实际流量点间梯形积分，起点用当时的实测流量。逐分钟模型按分钟积分；其他模型仅累计间隔不超过 5 分钟的有效预测。实测与预测均覆盖完整窗口时显示偏差，预测点过于稀疏时请重新训练。</p>
        </section>
        </template>
      </div>
      <aside v-if="snapshot" class="readings">
        <h3>这个时刻的实测读数</h3>
        <p class="readings-note">随游标更新。加减号表示较上一个回放时刻的变化。</p>
        <dl class="reading-grid">
          <div v-for="[key, label, unit] in signals" :key="key">
            <dt>{{ label }}</dt>
            <dd>{{ snapshot[key] == null ? '--' : reading(snapshot[key], unit) }} <small>{{ delta(snapshot[key], previousSnapshot?.[key], unit) }}</small></dd>
          </div>
        </dl>
        <div class="zone-list">
          <article v-for="zone in snapshot.zones" :key="zone.zone" :class="{ active: replay.zone === zone.zone }">
            <strong>{{ zone.zone }} 区</strong>
            <dl>
              <div v-for="[key, label, unit] in zoneSignals" :key="key">
                <dt>{{ label }}</dt>
                <dd>{{ zone[key] == null ? '--' : reading(zone[key], unit) }} <small>{{ delta(zone[key], previousSnapshot?.zones[zone.zone - 1]?.[key], unit) }}</small></dd>
              </div>
            </dl>
          </article>
        </div>
      </aside>
    </div>
    <div v-else class="replay-empty" role="status">
      <Loader2 v-if="busy" :size="16" class="animate-spin" />
      <span v-if="busy">正在读取历史记录并生成预测…</span>
      <span v-else-if="!cycleId">当前实验缺少可播放的窑次。</span>
      <span v-else-if="!requestedAlgorithms.length">请选择至少一种有已保存产物的算法。</span>
      <button v-else type="button" @click="generate">生成演示</button>
    </div>
    <footer>
      <p v-if="!dashboardLayout">数据模型的多步预测会累积误差，预测时长越长，偏差可能越大。建议供参考，实际收益以现场验证为准。</p>
      <p v-if="task === 'afr'">燃气流量低于 {{ reading(experiment.parameters.minGas, 'Nm³/h') }} 或流量缺测时，实测空燃比留空。</p>
      <details class="model-evidence">
        <summary>建模依据与可预测条件</summary>
        <div class="basis-grid">
          <div class="basis-card">
            <h3>数据与测点</h3>
            <p class="basis-value">{{ dataset.title }}</p>
            <p>{{ dataset.config.kilnCode }} · {{ replay?.targetLabel ?? subject }}</p>
            <details v-if="experiment.featureNames.length" class="basis-more">
              <summary>输入特征（{{ experiment.featureNames.length }} 项）</summary>
              <ul class="basis-list"><li v-for="feature in experiment.featureNames" :key="feature">{{ feature }}</li></ul>
            </details>
          </div>
          <div v-if="algorithmDefinition" class="basis-card">
            <h3>算法</h3>
            <p class="basis-value">{{ algorithmDefinition.name }}</p>
            <p>{{ experiment.config.horizonMinutes }} 分钟训练时距<template v-if="algorithmDefinition.version"> · 版本 {{ algorithmDefinition.version }}</template></p>
            <dl v-if="algorithmDefinition.test" class="basis-metrics">
              <div><dt>历史核对平均相差</dt><dd>{{ reading(algorithmDefinition.test.mae, unit) }}</dd></div>
              <div><dt>{{ task === 'temperature' ? '历史核对综合温差' : '历史核对综合偏差' }}</dt><dd>{{ reading(algorithmDefinition.test.rmse, unit) }}</dd></div>
            </dl>
            <details v-if="algorithmDefinition.dataRequirements?.length" class="basis-more">
              <summary>数据要求</summary>
              <ul class="basis-list"><li v-for="requirement in algorithmDefinition.dataRequirements" :key="requirement">{{ requirement }}</li></ul>
            </details>
          </div>
          <div class="basis-card">
            <h3>机理</h3>
            <p class="basis-value">{{ mechanismTemplate?.name ?? mechanismLabel }}</p>
            <p>方案 {{ experiment.mechanismVersion }}<template v-if="mechanismRevision"> · 库版本 {{ mechanismRevision.version }}</template></p>
            <code v-if="mechanismTemplate" class="basis-formula">{{ mechanismRevision?.formula ?? mechanismTemplate.formula }}</code>
            <p v-if="mechanismTemplate && (mechanismRevision?.check ?? mechanismTemplate.check)">{{ mechanismRevision?.check ?? mechanismTemplate.check }}</p>
            <dl v-if="mechanismParameters.length" class="basis-metrics">
              <div v-for="param in mechanismParameters" :key="param.key">
                <dt>{{ param.label }}</dt>
                <dd>{{ formatKilnNumber(experiment.parameters[param.key], KILN_PARAMETER_DIGITS) }} {{ param.unit }} <small>{{ parameterSource(param.key) }}</small></dd>
              </div>
            </dl>
          </div>
          <div class="basis-card">
            <h3>回放条件</h3>
            <p>各起点使用此前的观测和档案中已知的设定计划。事后实测用于核对预测。</p>
            <dl v-if="cutoff" class="basis-metrics"><div><dt>训练结束</dt><dd>{{ cutoff.replace('T', ' ').slice(0, 16) }}</dd></div></dl>
          </div>
        </div>
        <div v-if="evidence.length" class="basis-sources">
          <h3>引用资料</h3>
          <details v-for="item in evidence" :key="item.id" class="basis-source">
            <summary><span>{{ item.file }}</span><small>{{ item.location }}</small></summary>
            <p>{{ item.text }}</p>
          </details>
        </div>
      </details>
      <details class="playback-settings">
        <summary>播放设置与说明</summary>
        <div class="playback-content">
          <label>回放间隔
            <select v-model.number="frameStep" :disabled="busy">
              <option v-for="value in frameSteps" :key="value" :value="value">{{ value }} 分钟</option>
            </select>
          </label>
          <ul v-if="replay?.notes.length" class="basis-list"><li v-for="note in replay.notes" :key="note">{{ note }}</li></ul>
        </div>
      </details>
    </footer>
  </section>
</template>

<style scoped>
.exclusion-controls { margin:0 20px 15px; }
.exclusion-inputs { display:flex; flex-wrap:wrap; align-items:end; gap:10px; margin:8px 0; }
.exclusion-inputs input { display:block; padding:5px 8px; background:var(--background); border:1px solid var(--border); border-radius:4px; }
.exclusion-inputs button:not(.primary) { padding:6px 10px; border:1px solid var(--border); border-radius:5px; }
.replay { background:var(--card); color:var(--foreground); border:1px solid var(--border); border-radius:10px; overflow:hidden; font-size:12px; }
.replay-header,.replay-config,.player,.timeline { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
.replay-header { justify-content:space-between; padding:16px; border-bottom:1px solid var(--border); }
h2 { font-size:16px; font-weight:650; }
h3 { font-size:13px; font-weight:650; }
.replay-header p,footer,.availability,.replay-empty,.timeline { color:var(--muted-foreground); }
.replay-config { padding:14px 16px; border-bottom:1px solid var(--border); }
.replay-config>label { display:flex; align-items:center; gap:7px; min-width:0; }
.replay-config>label:first-child { flex:1 1 250px; }
.model-options { display:flex; flex:1 0 100%; flex-wrap:wrap; gap:7px 14px; padding-top:5px; }
.model-options legend { color:var(--muted-foreground); }
.model-options label,.model-status li { display:flex; align-items:center; gap:5px; }
.model-status { display:flex; flex-wrap:wrap; gap:6px 14px; padding:10px 6px; color:var(--muted-foreground); }
.model-status strong { color:var(--foreground); font-weight:600; }
.model-dot { width:8px; height:8px; border-radius:50%; }
select,button { color:inherit; background:var(--background); border:1px solid var(--border); border-radius:6px; padding:5px 9px; }
select { max-width:100%; min-width:0; }
button { display:inline-flex; align-items:center; gap:5px; }
button:enabled:hover { cursor:pointer; filter:brightness(1.1); }
button:disabled { opacity:.55; }
.primary { background:#24629a; color:#fff; border-color:#24629a; }
.replay-content { display:grid; grid-template-columns:minmax(0,1fr) minmax(210px,29%); }
.chart-pane { min-width:0; padding:14px 12px; }
.forecast-chart { height:385px; width:100%; }
.timeline { justify-content:space-between; padding:0 6px; }
.timeline input { flex:1 0 100%; }
.availability { display:grid; gap:4px; padding:7px 6px; }
.comparison-summary,.comparison-detail { margin-top:12px; padding:10px; border:1px solid var(--border); border-radius:6px; }
.comparison-values { display:grid; grid-template-columns:repeat(auto-fit,minmax(125px,1fr)); gap:10px; margin-top:8px; }
.comparison-values dd { font-weight:650; font-size:15px; }
.comparison-values small,.readings-note,.comparison-summary p,.comparison-detail p { color:var(--muted-foreground); }
.comparison-detail summary,.model-evidence summary { cursor:pointer; font-weight:650; }
.comparison-detail p { margin-top:6px; }
.comparison-table { max-height:280px; overflow:auto; margin-top:8px; }
.comparison-table table { width:100%; border-collapse:collapse; }
.comparison-table th,.comparison-table td { white-space:nowrap; text-align:left; padding:5px 8px; border-bottom:1px solid var(--border); }
.comparison-table thead { position:sticky; top:0; background:var(--card); }
.basis-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)); align-items:start; gap:12px; margin:12px 0; }
.basis-card { min-width:0; padding:14px; border:1px solid var(--border); border-radius:8px; background:var(--background); line-height:1.65; overflow-wrap:anywhere; }
.basis-card h3,.basis-sources h3 { color:var(--foreground); }
.basis-card p { margin-top:5px; }
.basis-value { color:var(--foreground); font-weight:600; }
.basis-formula { display:block; margin:8px 0; padding:7px 9px; border-radius:5px; background:var(--muted); color:var(--foreground); white-space:pre-wrap; }
.basis-more,.basis-metrics { margin-top:10px; }
.basis-metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,105px),1fr)); gap:8px 12px; }
.basis-metrics dd { color:var(--foreground); font-weight:600; white-space:normal; }
.basis-metrics dd small { display:block; color:var(--muted-foreground); font-weight:400; }
.basis-list { margin:6px 0 0; padding-left:17px; list-style:disc; line-height:1.6; }
.basis-list li + li { margin-top:3px; }
.basis-sources { margin:14px 0 4px; }
.basis-sources h3 { margin-bottom:5px; }
.basis-source { padding:8px 0; border-bottom:1px solid var(--border); }
.basis-source:last-child { border-bottom:0; }
.basis-source summary,.basis-source p { overflow-wrap:anywhere; }
.basis-source summary small { margin-left:8px; font-weight:400; }
.basis-source p { margin-top:6px; line-height:1.65; white-space:pre-line; }
.playback-settings { margin-top:4px; padding-top:9px; border-top:1px solid var(--border); }
.playback-content { margin-top:8px; }
.playback-content label { display:inline-flex; align-items:center; gap:8px; }
.configure-link { color:var(--foreground); text-decoration:underline; cursor:pointer; }
.readings-note { font-size:11px; margin-top:4px; }
.readings dd small { color:var(--muted-foreground); margin-left:2px; }
.readings { border-left:1px solid var(--border); padding:14px 12px; }
.reading-grid,.zone-list { display:grid; gap:8px; margin-top:9px; }
.zone-list { grid-template-columns:repeat(auto-fit,minmax(155px,1fr)); }
.comparison-values > div,.reading-grid > div,.zone-list dl > div { display:flex; justify-content:space-between; align-items:baseline; gap:8px; }
dt { color:var(--muted-foreground); }
dd { font-variant-numeric:tabular-nums; white-space:nowrap; }
.zone-list article { border:1px solid var(--border); border-radius:6px; padding:6px 8px; }
.zone-list article.active { border-color:#358de2; }
.zone-list article dl { font-size:11px; }
.replay-empty,footer { padding:12px 16px; }
.replay-empty { display:flex; align-items:center; gap:8px; }
footer { border-top:1px solid var(--border); display:grid; gap:4px; }
footer summary { cursor:pointer; }
@media(max-width:960px) {
  .replay-content { grid-template-columns:minmax(0,1fr); }
  .readings { border-left:0; border-top:1px solid var(--border); }
}
</style>
