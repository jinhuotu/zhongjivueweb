<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { BarSeriesOption, EChartsOption, LineSeriesOption, ScatterSeriesOption } from 'echarts'
import { Loader2 } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { formatKilnNumber, formatKilnReading } from '@/lib/kiln-studio-format'
import { studioPost } from '@/lib/kiln-studio-api'
import KilnEnergyAcceptance from './KilnEnergyAcceptance.vue'
import type { AlgorithmKey, Experiment, PredictionEvaluation, PredictionEvaluationPoint, TemperatureObservationSource } from '@/lib/kiln-studio-api'

const props = defineProps<{ experiment: Experiment; algorithm: AlgorithmKey; optimizing?: boolean; canOptimize?: boolean }>()
const emit = defineEmits<{ optimize: [] }>()
ensureEcharts()
const palette = useChartPalette()
const isTemperature = computed(() => props.experiment.config.task === 'temperature')
const split = ref<'test' | 'validation'>('test')
const cycleId = ref('')
const temperatureLimit = ref<number | string>(15)
const averageLimit = ref<number | string>(10)
const percentageLimit = ref<number | string>('')
const coverageLimit = ref<number | string>('')
const minimumActual = ref<number | string>(1)
const appliedMinimum = ref(1)
const alarmThreshold = ref<number | string>('')
const alarmDuration = ref<number | string>(1)
const alarmTolerance = ref<number | string>(2)
const alarmRules = ref({ overtemperatureC: null as number | null, eventDurationMinutes: 1, eventToleranceMinutes: 2 })
const alarmRulesValid = computed(() => (alarmThreshold.value === '' ||
  (Number.isFinite(Number(alarmThreshold.value)) && Number(alarmThreshold.value) >= -100 && Number(alarmThreshold.value) <= 2500)) &&
  alarmDuration.value !== '' && Number.isInteger(Number(alarmDuration.value)) && Number(alarmDuration.value) >= 0 && Number(alarmDuration.value) <= 60 &&
  alarmTolerance.value !== '' && Number.isInteger(Number(alarmTolerance.value)) && Number(alarmTolerance.value) >= 0 && Number(alarmTolerance.value) <= 30)
const result = ref<PredictionEvaluation>()
const busy = ref(false)
const error = ref('')
const chart = ref<InstanceType<typeof VChart>>()
const focused = ref<PredictionEvaluationPoint>()
const deviationVisible = ref(true)
const deviationName = '预测偏差'
const scaleMode = ref<'detail' | 'full' | 'custom'>(props.experiment.config.task === 'temperature' ? 'detail' : 'full')
const timeZoom = ref({ start: 0, end: 100 })
const detailLimit = ref<number | ''>('')
const temperatureMin = ref<number | ''>('')
const temperatureMax = ref<number | ''>('')
const deviationLimit = ref<number | ''>('')
const customScale = ref<{ min: number; max: number; deviation: number }>()
let sequence = 0
let disposed = false
onBeforeUnmount(() => { disposed = true; sequence++ })
const key = computed(() => JSON.stringify([props.experiment.id, props.algorithm, split.value, cycleId.value, appliedMinimum.value, alarmRules.value]))
let resultKey = ''
const current = computed(() => !busy.value && resultKey === key.value ? result.value : undefined)
const zone = computed(() => props.experiment.config.zone)
const targetLabel = computed(() => zone.value ? `${zone.value} 区` : '总体温度')
function actualSourceLabel(source: TemperatureObservationSource | null | undefined) {
  if (zone.value) return `${zone.value} 区温度测点`
  if (source === 'provided') return '原表温度字段'
  if (source === 'zoneAverage') return '各有效温区读数的平均值'
  return '归档总体温度字段，原始汇总口径未记录'
}
const sourceLabels = computed(() => {
  const sources = current.value?.actualTemperatureSources ?? []
  return (sources.length ? sources.map(actualSourceLabel) : [actualSourceLabel(null)]).join(' / ')
})
const temperatureActualName = computed(() => {
  if (zone.value) return `${zone.value} 区实测温度`
  const sources = current.value?.actualTemperatureSources
  if (sources?.length === 1 && sources[0] === 'provided') return '原表温度实测'
  if (sources?.length === 1 && sources[0] === 'zoneAverage') return '有效温区均温实测'
  return '总体温度实测'
})
const cycles = computed(() => {
  const ids = props.experiment.split.find(item => item.name === (split.value === 'test' ? '测试' : '验证'))?.cycles ?? []
  return ids.map(id => ({ id, name: result.value?.cycles.find(item => item.id === id)?.name ?? id.slice(0, 8) }))
})
const inputNumber = (value: number | string) => value === '' ? null : Number(value)
const temperatureRequirement = computed(() => inputNumber(temperatureLimit.value))
const averageRequirement = computed(() => inputNumber(averageLimit.value))
const percentageRequirement = computed(() => inputNumber(percentageLimit.value))
const coverageRequirement = computed(() => inputNumber(coverageLimit.value))
const invalidRules = computed(() => [temperatureRequirement.value, averageRequirement.value, percentageRequirement.value].some(value =>
  value !== null && (!Number.isFinite(value) || value < 0)) ||
  (coverageRequirement.value !== null && (!Number.isFinite(coverageRequirement.value) || coverageRequirement.value < 0 || coverageRequirement.value > 100)))
const minimumValid = computed(() => typeof minimumActual.value === 'number' &&
  Number.isFinite(minimumActual.value) && minimumActual.value >= .001 && minimumActual.value <= 10000)
const score = computed(() => current.value?.metrics)
const inspected = computed(() => focused.value ?? current.value?.points.find(point => point.prediction != null))
const inspectedIndex = computed(() => {
  const point = inspected.value
  return point ? current.value?.points.findIndex(item => item.cycle === point.cycle &&
    item.ts === point.ts && item.origin === point.origin) ?? 0 : 0
})
const temperaturePass = computed(() => !invalidRules.value && score.value?.rmse != null && temperatureRequirement.value !== null
  ? score.value.rmse <= temperatureRequirement.value : null)
const averagePass = computed(() => !invalidRules.value && score.value?.mae != null && averageRequirement.value !== null
  ? score.value.mae <= averageRequirement.value : null)
const percentagePass = computed(() => !invalidRules.value && score.value?.mape != null && percentageRequirement.value !== null
  ? score.value.mape <= percentageRequirement.value : null)
const coveragePass = computed(() => !invalidRules.value && score.value && coverageRequirement.value !== null
  ? score.value.coverage * 100 >= coverageRequirement.value : null)
const verdict = computed(() => {
  if (invalidRules.value) return '请检查误差要求的填写范围'
  if (!score.value?.count) return '等待可核对的历史记录'
  if (props.experiment.config.horizonMinutes !== 10) return '当前核对时距为 ' + props.experiment.config.horizonMinutes + ' 分钟 · 10 分钟验收待运行对应实验'
  if (temperaturePass.value === false || averagePass.value === false || percentagePass.value === false) return '有误差指标超出当前要求'
  if (coveragePass.value === false) return '可核对记录未达到设置比例'
  if (score.value.mape == null && percentageRequirement.value !== null) return '偏差比例缺少可计算记录'
  if (temperaturePass.value === null || averagePass.value === null) return '温差要求待设置'
  return '提前 10 分钟 · 平均相差和综合温差均符合当前要求'
})
const needsAttention = computed(() => temperaturePass.value === false || averagePass.value === false || percentagePass.value === false || coveragePass.value === false)
const reading = (value: unknown) => formatKilnReading(value, props.experiment.unit)
const percent = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? formatKilnNumber(value) + '%' : '—'
const beijingOffset = 8 * 60 * 60 * 1000
function timestamp(value: string) {
  const iso = value.replace(' ', 'T')
  return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : iso + '+08:00')
}
function beijingLabel(time: number) {
  return Number.isFinite(time) ? new Date(time + beijingOffset).toISOString().slice(0, 16).replace('T', ' ') : '—'
}
const dateText = (value: string | null) => value ? beijingLabel(timestamp(value)) : '—'
const biasText = computed(() => {
  const value = score.value?.bias
  if (value == null) return ''
  if (formatKilnNumber(Math.abs(value)) === '0') return '整体偏高与偏低基本抵消'
  return `整体平均${value > 0 ? '偏高' : '偏低'} ${reading(Math.abs(value))}`
})

watch(() => props.experiment.id, () => { cycleId.value = ''; focused.value = undefined })
watch(split, () => { cycleId.value = ''; focused.value = undefined })
watch(key, () => { void load() }, { immediate: true })

async function load() {
  const seq = ++sequence
  const requestKey = key.value
  busy.value = true
  error.value = ''
  focused.value = undefined
  deviationVisible.value = true
  timeZoom.value = { start: 0, end: 100 }
  try {
    const value = await studioPost<PredictionEvaluation>(`/experiments/${props.experiment.id}/evaluation`, {
      algorithm: props.algorithm, split: split.value, cycleId: cycleId.value || null, mapeMinActual: appliedMinimum.value,
      ...alarmRules.value,
    })
    if (disposed || seq !== sequence) return
    result.value = value
    resultKey = requestKey
  } catch (err) {
    if (!disposed && seq === sequence) error.value = err instanceof Error ? err.message : '暂时无法读取完整核验记录'
  } finally {
    if (!disposed && seq === sequence) busy.value = false
  }
}

const plot = computed(() => {
  const rows: { time: number; point: PredictionEvaluationPoint | null }[] = []
  const records = (current.value?.points ?? []).map(point => ({ time: timestamp(point.ts), point }))
    .filter(row => Number.isFinite(row.time)).sort((a, b) => a.time - b.time)
  for (const row of records) {
    const previous = rows.at(-1)
    if (previous && previous.point?.cycle !== row.point.cycle) {
      rows.push({ time: previous.time + (row.time - previous.time) / 2, point: null })
    }
    rows.push(row)
  }
  return rows
})
const visibleRows = computed(() => {
  const rows = plot.value
  if (!rows.length) return []
  const first = rows[0]!.time
  const duration = rows.at(-1)!.time - first
  const left = first + duration * timeZoom.value.start / 100
  const right = first + duration * timeZoom.value.end / 100
  return rows.filter(({ time, point }) => point && time >= left - 1 && time <= right + 1)
})
const referenceLimit = computed(() => isTemperature.value && !invalidRules.value && temperatureRequirement.value != null &&
  temperatureRequirement.value > 0 ? temperatureRequirement.value : null)
const customValid = computed(() => typeof temperatureMin.value === 'number' && Number.isFinite(temperatureMin.value) &&
  typeof temperatureMax.value === 'number' && Number.isFinite(temperatureMax.value) &&
  temperatureMin.value < temperatureMax.value && typeof deviationLimit.value === 'number' &&
  Number.isFinite(deviationLimit.value) && deviationLimit.value > 0)
function quantile(values: number[], fraction: number) {
  if (!values.length) return 0
  return values[Math.round((values.length - 1) * fraction)]!
}
function usableNumbers(values: (number | null | undefined)[]) {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b)
}
const scales = computed(() => {
  if (scaleMode.value === 'custom' && customScale.value) return customScale.value
  const rows = (visibleRows.value.length ? visibleRows.value : plot.value).flatMap(({ point }) => point ? [point] : [])
  const temperatures = usableNumbers(rows.flatMap(point => scaleMode.value === 'full'
    ? [point.actual, point.prediction, point.reference, point.lower, point.upper]
    : [point.actual, point.prediction]))
  const deviations = usableNumbers(rows.map(point => point.deviation == null ? null : Math.abs(point.deviation)))
  const full = scaleMode.value === 'full'
  const lower = quantile(temperatures, full ? 0 : .12)
  const upper = quantile(temperatures, full ? 1 : .88)
  const padding = Math.max(isTemperature.value ? .5 : .05, (upper - lower) * .08)
  const typical = Math.max(.5, quantile(deviations, .75) * 1.2)
  const step = 10 ** Math.floor(Math.log10(typical))
  const deviation = full
    ? Math.max(.1, quantile(deviations, 1), referenceLimit.value ?? 0) * 1.04
    : typeof detailLimit.value === 'number' ? detailLimit.value : Math.ceil(typical / step) * step
  return { min: lower - padding, max: upper + padding, deviation }
})
const outsideCount = computed(() => visibleRows.value.filter(({ point }) =>
  point?.deviation != null && Math.abs(point.deviation) > scales.value.deviation).length)
const upperOutsideCount = computed(() => visibleRows.value.filter(({ point }) =>
  [point?.actual, point?.prediction].some(value => value != null && (value < scales.value.min || value > scales.value.max))).length)
function selectScale(mode: typeof scaleMode.value) {
  if (mode === 'custom' && !customScale.value) {
    temperatureMin.value = Number(scales.value.min.toFixed(2))
    temperatureMax.value = Number(scales.value.max.toFixed(2))
    deviationLimit.value = Number(scales.value.deviation.toFixed(2))
    if (customValid.value) applyScale()
  }
  scaleMode.value = mode
}
function applyScale() {
  if (!customValid.value) return
  customScale.value = { min: Number(temperatureMin.value), max: Number(temperatureMax.value), deviation: Number(deviationLimit.value) }
}
type ZoomEvent = { start?: number; end?: number; batch?: { start?: number; end?: number }[] }
function onTimeZoom(event: ZoomEvent) {
  const zoom = event.batch?.[0] ?? event
  if (zoom.start != null && zoom.end != null) timeZoom.value = { start: zoom.start, end: zoom.end }
}
const option = computed<EChartsOption>(() => {
  const p = palette.value
  const data = plot.value
  const range = scales.value
  const actualName = isTemperature.value ? temperatureActualName.value : '实测流量'
  const predictedName = isTemperature.value ? `${targetLabel.value}模型预测` : '模型预测'
  const mechanismName = isTemperature.value ? `${targetLabel.value}机理预测` : '机理预测'
  const makeLine = (name: string, field: 'actual' | 'prediction' | 'reference' | 'lower' | 'upper', color: string): LineSeriesOption => ({
    name, type: 'line', xAxisIndex: 0, yAxisIndex: 0,
    data: data.map(({ time, point }) => {
      const value = point?.[field]
      return [time, value != null && value >= range.min && value <= range.max ? value : null]
    }),
    showSymbol: false, symbolSize: 5, connectNulls: false,
    lineStyle: { color, width: ['actual', 'prediction'].includes(field) ? 2.5 : 1.6,
      type: field === 'prediction' ? 'dashed' : 'solid' }, itemStyle: { color },
  })
  const lines = [
    makeLine(actualName, 'actual', p.tooltipText),
    makeLine(predictedName, 'prediction', '#2379d2'),
  ]
  if (current.value?.referenceName) lines.push(makeLine(mechanismName, 'reference', '#248774'))
  if (current.value?.interval) {
    const lower = makeLine('预测范围下界', 'lower', '#a7b9d0')
    const upper = makeLine('预测范围上界', 'upper', '#a7b9d0')
    lower.lineStyle = upper.lineStyle = { color: '#a7b9d0', width: 1, type: 'dashed' }
    lines.push(lower, upper)
  }
  const highColor = '#d97726'
  const lowColor = '#247db3'
  const selectedTime = focused.value ? timestamp(focused.value.ts) : NaN
  const threshold = referenceLimit.value
  const referenceLines = threshold != null && threshold <= range.deviation
    ? [{ yAxis: threshold, lineStyle: { color: '#b47b25' } }, { yAxis: -threshold, lineStyle: { color: '#b47b25' } }]
    : []
  const deviation: BarSeriesOption = {
    name: deviationName, type: 'bar', xAxisIndex: 1, yAxisIndex: 1, barWidth: 5,
    itemStyle: { color: highColor },
    data: data.map(({ time, point }) => {
      const error = point?.deviation
      return {
        value: [time, error == null ? null : Math.min(range.deviation, Math.max(-range.deviation, error))],
        itemStyle: { color: error != null && error < 0 ? lowColor : highColor },
      }
    }),
    markLine: { silent: true, symbol: 'none', label: { show: false },
      lineStyle: { color: p.axis, type: 'dashed' }, data: [{ yAxis: 0 }, ...referenceLines,
        ...(Number.isFinite(selectedTime) ? [{ xAxis: selectedTime }] : [])] },
  }
  const outside: ScatterSeriesOption = {
    name: '超出纵轴范围', type: 'scatter', xAxisIndex: 1, yAxisIndex: 1,
    symbol: 'triangle', symbolSize: 10, z: 5,
    data: data.map(({ time, point }) => {
      const error = point?.deviation
      const beyondRange = error != null && Math.abs(error) > range.deviation
      const below = error != null && error < 0
      return {
        value: [time, beyondRange ? range.deviation * (below ? -.97 : .97) : null],
        symbolRotate: below ? 180 : 0,
        itemStyle: { color: below ? lowColor : highColor },
      }
    }),
  }
  const markers: ({ name: string; yAxis: number } | { name: string; xAxis: number })[] = []
  if (isTemperature.value && current.value?.overtemperature) {
    markers.push({ name: '工艺上限', yAxis: current.value.overtemperature.thresholdC })
  }
  if (Number.isFinite(selectedTime)) markers.push({ name: '选中时刻', xAxis: selectedTime })
  if (markers.length) lines[0]!.markLine = {
    silent: true, symbol: 'none', label: { formatter: '{b}', color: p.axis },
    lineStyle: { color: p.axis, type: 'dashed' }, data: markers,
  }
  const first = data[0]?.time
  const last = data.at(-1)?.time
  const singleTime = first === last && first !== undefined
  return {
    animation: false,
    useUTC: true,
    legend: { top: 0, data: [...lines.map(line => String(line.name)), deviationName],
      textStyle: { color: p.legend, fontSize: 11 } },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    tooltip: {
      ...tooltipBase(p), trigger: 'axis', confine: true, renderMode: 'richText',
      formatter: params => {
        const items = Array.isArray(params) ? params : [params]
        const firstItem = items[0]
        if (!firstItem) return ''
        const point = data[firstItem.dataIndex]?.point
        if (!point) return ''
        return [
          '对照时刻  ' + dateText(point.ts),
          '预测发出  ' + dateText(point.origin),
          ...(isTemperature.value ? ['实测来源  ' + actualSourceLabel(point.actualTemperatureSource)] : []),
          actualName + '  ' + reading(point.actual),
          predictedName + '  ' + reading(point.prediction),
          ...items.flatMap(item => {
            if (![mechanismName, '预测范围下界', '预测范围上界'].includes(item.seriesName ?? '')) return []
            const value = Array.isArray(item.value) ? item.value[1] : null
            return value == null ? [] : [`${item.seriesName}  ${reading(value)}`]
          }),
          ...(point.deviation == null ? [] : [
            `预测${point.deviation < 0 ? '偏低' : point.deviation > 0 ? '偏高' : '与实测相同'}  ${reading(Math.abs(point.deviation))}`,
            ...(Math.abs(point.deviation) > range.deviation ? ['该偏差超出当前纵轴范围'] : []),
          ]),
        ].join('\n')
      },
    },
    grid: [{ left: 80, right: 25, top: 52, height: '42%' }, { left: 80, right: 25, top: '62%', bottom: 72 }],
    xAxis: [0, 1].map(index => ({
      gridIndex: index, type: 'time' as const, boundaryGap: [0, 0] as [number, number],
      min: singleTime ? first - 60_000 : first,
      max: singleTime ? first + 60_000 : last,
      splitNumber: 7,
      axisLine: { show: true, onZero: false, lineStyle: { color: p.axis } },
      axisLabel: { color: p.axis, show: index === 1, fontSize: 11, hideOverlap: true,
        formatter: (value: number) => beijingLabel(value).slice(5) },
      name: index === 1 ? '实测与预测对照时刻（北京时间）' : '', nameLocation: 'middle' as const, nameGap: 28,
      nameTextStyle: { color: p.axis },
    })),
    yAxis: [0, 1].map(index => ({
      gridIndex: index, type: 'value' as const, name: index === 0 ? props.experiment.unit : '偏高（+） / 偏低（−） ' + props.experiment.unit,
      min: index === 0 ? range.min : -range.deviation,
      max: index === 0 ? range.max : range.deviation,
      scale: index === 0, nameTextStyle: { color: p.axis },
      axisLabel: { color: p.axis, formatter: (value: number) => formatKilnNumber(value, 3) },
      splitLine: { lineStyle: { color: p.grid, type: 'dashed' as const } },
    })),
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], filterMode: 'none' },
      { type: 'slider', xAxisIndex: [0, 1], filterMode: 'none', bottom: 0, height: 18, showDetail: false },
    ],
    series: [...lines, deviation, ...(deviationVisible.value ? [outside] : [])],
  }
})

async function focusPoint(point: PredictionEvaluationPoint) {
  focused.value = point
  await nextTick()
  const rows = plot.value
  const index = rows.findIndex(({ point: item }) => item?.cycle === point.cycle && item.ts === point.ts && item.origin === point.origin)
  if (index < 0) return
  const startValue = rows[Math.max(0, index - 8)]!.time
  const endValue = rows[Math.min(rows.length - 1, index + 8)]!.time
  if (startValue < endValue) {
    const first = rows[0]!.time
    const duration = rows.at(-1)!.time - first
    timeZoom.value = { start: (startValue - first) / duration * 100, end: (endValue - first) / duration * 100 }
    chart.value?.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, startValue, endValue })
    await nextTick()
  }
  chart.value?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index })
}
function inspectChart(event: { dataIndex?: number }) {
  const point = event.dataIndex == null ? null : plot.value[event.dataIndex]?.point
  if (point) focused.value = point
}
function onLegendChange(event: { selected: Record<string, boolean> }) {
  deviationVisible.value = event.selected[deviationName] !== false
}
function showDeviation() {
  chart.value?.dispatchAction({ type: 'legendSelect', name: deviationName })
  deviationVisible.value = true
}
function inspectRecord(event: Event) {
  const point = current.value?.points[Number((event.target as HTMLInputElement).value)]
  if (point) void focusPoint(point)
}
function inspectWorst() {
  const point = current.value?.worstPoints[0]
  if (point) void inspectOutlier(point)
}
async function inspectOutlier(point: PredictionEvaluationPoint) {
  selectScale('full')
  if (!deviationVisible.value) showDeviation()
  await focusPoint(point)
}

function applyAlarmRules() {
  if (!alarmRulesValid.value) return
  alarmRules.value = {
    overtemperatureC: alarmThreshold.value === '' ? null : Number(alarmThreshold.value),
    eventDurationMinutes: Number(alarmDuration.value), eventToleranceMinutes: Number(alarmTolerance.value),
  }
}

function exportReport() {
  const value = current.value
  if (!value) return
  const lines = [
    (isTemperature.value ? '温度' : '燃气能耗') + '预测核验报告',
    '运行方式 ' + (props.experiment.sourceKind === 'synthetic' ? '合成数据回测演示' : '上传历史记录的留出回测'),
    '模型 ' + value.algorithmName + ' · 提前 ' + value.horizonMinutes + ' 分钟',
    '实验版本 ' + props.experiment.id,
    '数据版本 ' + value.dataHash,
    '核对范围 ' + dateText(value.from) + ' 至 ' + dateText(value.to),
    '样本分组 ' + (split.value === 'test' ? '测试记录' : '验证记录'),
    '可核对记录 ' + value.metrics.count + '/' + value.metrics.totalCount,
  ]
  if (isTemperature.value) lines.push(
    '温度目标 ' + targetLabel.value,
    '实测来源 ' + sourceLabels.value,
    '误差判断 ' + verdict.value,
    '平均相差 ' + reading(value.metrics.mae) + ' · 要求 ≤ ' + reading(averageRequirement.value),
    '综合温差 ' + reading(value.metrics.rmse) + ' · 要求 ≤ ' + reading(temperatureRequirement.value),
    '最大单点相差 ' + reading(value.metrics.maxAbsError),
    '平均偏差比例（MAPE） ' + percent(value.metrics.mape) + ' · ' + (percentageRequirement.value == null ? '未设置比例门槛' : '要求 ≤ ' + percent(percentageRequirement.value)),
    '指标含义 平均相差（MAE）看平均差几度；综合温差（RMSE）对大偏差更敏感；平均偏差比例（MAPE）看每个时刻相差占实测的比例，再求平均。',
    '比例计算 实测温度绝对值下限 ' + reading(value.request.mapeMinActual) + '，纳入 ' + formatKilnNumber(value.metrics.mapeCount, 0) + ' 点，近零排除 ' + formatKilnNumber(value.metrics.mapeExcludedCount, 0) + ' 点。',
  )
  if (value.energy) {
    for (const [key, label] of [['hourly', '小时'], ['daily', '日']] as const) {
      const evaluation = value.energy[key]
      lines.push(label + '平均偏差比例 ' + percent(evaluation.metrics.mape) + ' · 要求 ≤ ' + evaluation.thresholdPct + '%',
        '完整时段 ' + evaluation.completeCount + ' · 未完整覆盖 ' + evaluation.incompleteCount)
    }
  }
  lines.push('预测范围实测覆盖 ' + (value.interval ? percent(value.interval.coverage == null ? null : value.interval.coverage * 100) : '待重新训练并核验'))
  if (value.overtemperature) {
    const events = value.overtemperature
    lines.push('工艺温度上限 ' + reading(events.thresholdC),
      '至少提前 5 分钟发现比例 ' + percent(events.hitRate == null ? null : events.hitRate * 100),
      '误报比例 ' + percent(events.falseAlertRate == null ? null : events.falseAlertRate * 100),
      '真实事件 ' + events.actualCount + ' · 及时发现 ' + events.timelyCount + ' · 误报 ' + events.falseAlertCount,
      '事件持续 ' + events.durationMinutes + ' 分钟 · 起点匹配容差 ' + events.toleranceMinutes + ' 分钟')
  } else if (isTemperature.value) lines.push('超温事件核对待设置工艺上限')
  if (value.inferenceBenchmark) lines.push(
    '服务器 CPU 单点最大耗时 ' + formatKilnNumber(value.inferenceBenchmark.maxMs, 3) + ' ms',
    '服务器 ' + value.inferenceBenchmark.count + ' 条试跑批次耗时 ' + formatKilnNumber(value.inferenceBenchmark.batchMs, 3) + ' ms',
  )
  lines.push('边缘设备耗时、30 天在线运行记录需在对应运行环境核验。')
  if (props.experiment.observationQuality) {
    const quality = props.experiment.observationQuality
    lines.push('数据检查 -9999 缺测记录 ' + quality.sentinelRows + ' 条，全零温度记录 ' + quality.zeroTemperatureRows + ' 条。',
      '全零温度处理规则 ' + (quality.excludeZeroTemperatureRecords ? '按缺测处理' : '保留参与核对'))
  }
  const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = '预测核验报告-' + props.experiment.id.slice(0, 8) + '.txt'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <section class="quality" :aria-label="isTemperature ? '温度预测效果核验' : '燃气用量效果核验'">
    <header class="quality-header">
      <div><h3>{{ isTemperature ? targetLabel + '预测核验' : '燃气用量预测' }}</h3><p>{{ experiment.sourceKind === 'synthetic' ? '合成数据回测演示' : '历史记录留出回测' }} · 提前 {{ experiment.config.horizonMinutes }} 分钟 · {{ isTemperature ? targetLabel : '燃气用量按小时与每天核对' }} · {{ split === 'test' ? '测试记录' : '验证记录' }}</p></div>
      <div class="filters">
        <label>核对范围<select v-model="split"><option value="test">测试记录</option><option value="validation">验证记录</option></select></label>
        <label>窑次<select v-model="cycleId"><option value="">全部核对窑次</option><option v-for="cycle in cycles" :key="cycle.id" :value="cycle.id">{{ cycle.name }}</option></select></label>
      </div>
    </header>
    <p v-if="busy" class="feedback" role="status"><Loader2 class="animate-spin" :size="15" />正在核对完整历史记录</p>
    <p v-else-if="error" class="feedback" role="alert">{{ error }}<button type="button" @click="load">重试</button></p>
    <div v-if="isTemperature" class="model-state">
      <div><strong>当前使用 {{ current?.algorithmName ?? '已保存模型' }} · 提前 {{ experiment.config.horizonMinutes }} 分钟</strong><p>实验 {{ experiment.id.slice(0, 8) }} · 新模型保存应用后，这里的名称、时距和预测结果会同步切换。</p></div>
      <button v-if="canOptimize" type="button" :disabled="optimizing" @click="emit('optimize')"><Loader2 v-if="optimizing" :size="14" class="animate-spin" />{{ optimizing ? '正在训练并应用新模型' : '训练并应用 10 分钟推荐模型' }}</button>
    </div>
    <section v-if="isTemperature" class="acceptance" aria-label="温度预测验收指标与说明">
      <div class="acceptance-heading"><div><h4>预测验收指标 · 平均差几度，有没有大偏差？</h4><p>本项目温度验收：提前 10 分钟，平均相差 ≤ {{ reading(averageRequirement) }}，综合温差 ≤ {{ reading(temperatureRequirement) }}。三项误差均为越小越好。</p></div><span class="horizon-badge">当前提前 {{ experiment.config.horizonMinutes }} 分钟</span></div>
      <p class="verdict" :class="{ attention: needsAttention }" role="status">{{ verdict }}</p>
      <div class="quality-metrics acceptance-cards">
        <article :class="{ exceeded: averagePass === false, passed: averagePass === true }"><div class="metric-title"><span>平均相差几度</span><abbr title="平均绝对误差">MAE</abbr></div><strong>{{ reading(score?.mae) }}</strong><small class="metric-rule">要求 ≤ {{ reading(averageRequirement) }} · {{ averagePass === null ? '待核对' : averagePass ? '符合' : '超出' }}</small><p>把每次预测与实测相差的度数取绝对值，再求平均。</p><div class="metric-example">例如显示 8 ℃，表示这组预测平均相差 8 ℃。</div></article>
        <article :class="{ exceeded: temperaturePass === false, passed: temperaturePass === true }"><div class="metric-title"><span>综合温差 · 关注大偏差</span><abbr title="均方根误差">RMSE</abbr></div><strong>{{ reading(score?.rmse) }}</strong><small class="metric-rule">要求 ≤ {{ reading(temperatureRequirement) }} · {{ temperaturePass === null ? '待核对' : temperaturePass ? '符合' : '超出' }}</small><p>对少量大偏差更敏感。它明显高于平均相差时，应定位大偏差时刻。</p><div class="metric-example">温差平方 → 求平均 → 开平方，单位仍是 ℃。</div></article>
        <article :class="{ exceeded: percentagePass === false, passed: percentagePass === true }"><div class="metric-title"><span>平均偏差占实测多少</span><abbr title="平均绝对百分比误差">MAPE</abbr></div><strong>{{ percent(score?.mape) }}</strong><small class="metric-rule">{{ percentageRequirement == null ? '辅助观察 · 未设置比例门槛' : '要求 ≤ ' + percent(percentageRequirement) + ' · ' + (percentagePass === null ? '待核对' : percentagePass ? '符合' : '超出') }}</small><p>每个时刻的相差除以实测绝对值，换成百分比，再求平均。</p><div class="metric-example">同样相差 15 ℃：实测 1200 ℃ 时为 1.25%，实测 50 ℃ 时为 30%。</div></article>
      </div>
      <div class="evaluation-scope">
        <p><strong>核验口径</strong> · {{ targetLabel }} · {{ split === 'test' ? '测试记录' : '验证记录' }} · 提前 {{ experiment.config.horizonMinutes }} 分钟</p>
        <p v-if="current">整组可核对 {{ formatKilnNumber(score?.count, 0) }} / {{ formatKilnNumber(score?.totalCount, 0) }} 点 · {{ dateText(current.from) }} 至 {{ dateText(current.to) }}</p>
        <p v-if="current">比例计算纳入 {{ formatKilnNumber(score?.mapeCount, 0) }} 点，实测绝对值低于 {{ reading(current.request.mapeMinActual) }} 的 {{ formatKilnNumber(score?.mapeExcludedCount, 0) }} 点未纳入 MAPE。平均相差和综合温差使用全部有效配对点。</p>
        <p>这些是整组记录的统计。下方游标显示单个时刻，不能用一个点判断整组是否达标。RMSE ≤15 ℃也不表示每个点都在 ±15 ℃内。</p>
        <p v-if="experiment.observationQuality">数据规则：-9999 按缺测处理。温区与设定同时为零共 {{ experiment.observationQuality.zeroTemperatureRows }} 条，{{ experiment.observationQuality.excludeZeroTemperatureRecords ? '本实验按缺测处理' : '本实验保留参与核对' }}。</p>
        <p v-else>该历史实验未保存缺测检查统计，可重新训练后补全。异常工况剔除规则需要事先确认并记录。</p>
      </div>
    </section>
    <section v-if="current && inspected && isTemperature" class="prediction-overview" aria-label="预测温度与实测对照">
      <header class="prediction-heading"><div><h4>{{ targetLabel }} · 当前单点预测与实测对照</h4><p>{{ current.algorithmName }} · {{ dateText(inspected.origin) }} 发出预测 → {{ dateText(inspected.ts) }} 的温度</p></div></header>
      <div class="temperature-readings">
        <div><span>预计温度 · 提前 {{ current.horizonMinutes }} 分钟</span><strong>{{ reading(inspected.prediction) }}</strong></div>
        <div><span>同一时刻的事后实测</span><strong>{{ reading(inspected.actual) }}</strong><small>{{ actualSourceLabel(inspected.actualTemperatureSource) }}</small></div>
        <div><span>本次相差</span><strong>{{ inspected.deviation == null ? '—' : reading(Math.abs(inspected.deviation)) }}</strong><small>{{ inspected.deviation == null ? '待核对' : formatKilnNumber(Math.abs(inspected.deviation)) === '0' ? '按显示精度基本一致' : inspected.deviation > 0 ? '预测偏高' : '预测偏低' }}</small></div>
      </div>
      <label class="inspection-control">查看预测时刻
        <input type="range" min="0" :max="Math.max(0, current.points.length - 1)" :value="inspectedIndex" aria-label="查看不同预测时刻" @input="inspectRecord" />
      </label>
    </section>
    <section v-if="current && score?.count" class="quality-chart">
      <h4>{{ isTemperature ? targetLabel + '走势与预测偏差' : '流量走势与预测偏差' }}</h4>
      <p v-if="isTemperature"><strong>实测来源</strong> · {{ sourceLabels }} · {{ current.algorithmName }} · 提前 {{ current.horizonMinutes }} 分钟</p>
      <p v-if="isTemperature">这是固定时距回测。要看同一起点发出的未来 5、10 或 30 分钟逐分钟走势，请打开滚动预测回放。</p>
      <p>上图看两条走势是否贴合，下图看每个时刻差多少。两图共用北京时间，拖动底部时间条可缩小查看范围。</p>
      <div class="scale-toolbar">
        <div class="scale-buttons" role="group" aria-label="纵轴显示方式">
          <button type="button" :aria-pressed="scaleMode === 'detail'" @click="selectScale('detail')">放大小偏差</button>
          <button type="button" :aria-pressed="scaleMode === 'full'" @click="selectScale('full')">完整范围</button>
          <button type="button" :aria-pressed="scaleMode === 'custom'" @click="selectScale('custom')">手动调纵轴</button>
        </div>
        <label v-if="scaleMode === 'detail' && isTemperature" class="deviation-select">偏差放大范围
          <select v-model.number="detailLimit">
            <option value="">自动</option>
            <option v-for="amount in [0.5, 1, 5, 15, 30]" :key="amount" :value="amount">±{{ amount }} ℃</option>
          </select>
        </label>
        <div class="largest-deviation"><span>整组最大相差 <strong>{{ reading(score?.maxAbsError) }}</strong></span>
          <button v-if="current.worstPoints.length" type="button" @click="inspectWorst">查看最大偏差</button>
        </div>
      </div>
      <form v-if="scaleMode === 'custom'" class="custom-scale" @submit.prevent="applyScale">
        <label>上图最低 / {{ experiment.unit }}<input v-model.number="temperatureMin" type="number" step="any" /></label>
        <label>上图最高 / {{ experiment.unit }}<input v-model.number="temperatureMax" type="number" step="any" /></label>
        <label>下图范围 ± / {{ experiment.unit }}<input v-model.number="deviationLimit" type="number" step="any" /></label>
        <button type="submit" :disabled="!customValid">应用纵轴</button>
        <small v-if="!customValid" role="status">上图最高值需大于最低值，下图范围需大于零。</small>
      </form>
      <div class="chart-explanation">
        <span><i class="measure-line" />{{ isTemperature ? temperatureActualName : '实测' }}</span><span><i class="prediction-line" />{{ isTemperature ? targetLabel + '模型预测' : '模型预测' }}</span>
        <span><i class="positive-bar" />预测偏高</span><span><i class="negative-bar" />预测偏低</span>
      </div>
      <p class="reference-note">
        上图纵轴 {{ reading(scales.min) }} 至 {{ reading(scales.max) }} · 下图纵轴 ±{{ reading(scales.deviation) }}。
        <template v-if="referenceLimit != null && deviationVisible && referenceLimit <= scales.deviation">下图虚线 ±{{ reading(referenceLimit) }} 为单点温差参考。</template>
      </p>
      <p v-if="(outsideCount && deviationVisible) || upperOutsideCount" class="scale-notice" role="status">
        <template v-if="outsideCount && deviationVisible">当前图中 {{ outsideCount }} 个偏差超出纵轴，以三角标记显示，悬停看原值。 </template>
        <template v-if="upperOutsideCount">上图有 {{ upperOutsideCount }} 个对照时刻超出温度或流量纵轴。 </template>
        切换「完整范围」可查看这些点。
      </p>
      <div v-if="!deviationVisible" class="chart-actions"><span>下图的预测偏差已隐藏</span><button type="button" @click="showDeviation">显示预测偏差</button></div>
      <VChart ref="chart" :option="option" :update-options="{ replaceMerge: ['series'] }" autoresize class="quality-plot"
        @click="inspectChart" @legendselectchanged="onLegendChange" @datazoom="onTimeZoom" />
      <details class="worst-details">
        <summary>查看偏差最大的时刻</summary>
        <div class="worst-table">
          <table>
            <caption>从完整核对记录中按偏差大小排序</caption>
            <thead><tr><th scope="col">对照时刻</th><th scope="col">实测值</th><th scope="col">预测值</th><th scope="col">预测偏差</th></tr></thead>
            <tbody><tr v-for="point in current.worstPoints" :key="point.cycle + point.ts + point.origin">
              <td><button type="button" @click="inspectOutlier(point)">{{ dateText(point.ts) }}</button></td>
              <td>{{ reading(point.actual) }}</td><td>{{ reading(point.prediction) }}</td>
              <td>{{ point.deviation != null && point.deviation > 0 ? '+' : '' }}{{ reading(point.deviation) }}</td>
            </tr></tbody>
          </table>
        </div>
      </details>
    </section>
    <template v-if="current && isTemperature">
      <p v-if="biasText" class="quality-summary">{{ biasText }}</p>
      <p v-if="!score?.count" class="feedback">这段记录缺少可配对的预测与实测，可更换窑次或核对范围。</p>
    </template>
    <KilnEnergyAcceptance v-if="current && !isTemperature" :evaluation="current" />
    <details v-if="isTemperature" class="requirements">
      <summary>调整判断要求</summary>
      <div class="requirement-fields">
        <label>平均相差不超过 / ℃<input v-model.number="averageLimit" type="number" min="0" step=".1" /></label>
        <label>综合温差不超过 / ℃<input v-model.number="temperatureLimit" type="number" min="0" step=".1" /></label>
        <label>至少有多少记录可核对 / %<input v-model.number="coverageLimit" type="number" min="0" max="100" step="1" placeholder="可选" /></label>
        <label>平均偏差比例不超过 / %（MAPE）<input v-model.number="percentageLimit" type="number" min="0" step=".1" placeholder="可选，由双方约定" /></label>
      </div>
      <p v-if="invalidRules" role="alert">误差要求应为非负数，记录比例应在 0% 至 100% 之间。</p>
      <p>采用客户提出的提前 10 分钟、平均相差不超过 10 ℃、综合温差不超过 15 ℃进行误差核对。以上要求可按双方约定调整。</p>
      <p>判断要求用于比较计算结果，预测温度由当前选用的模型计算。</p>
    </details>
    <details v-if="isTemperature" class="requirements">
      <summary>核对超温提醒效果</summary>
      <div class="requirement-fields">
        <label>工艺温度上限 / ℃<input v-model.number="alarmThreshold" type="number" min="-100" max="2500" placeholder="填写实际工艺上限" /></label>
        <label>超限持续至少 / 分钟<input v-model.number="alarmDuration" type="number" min="0" max="60" /></label>
        <label>事件起点匹配容差 / 分钟<input v-model.number="alarmTolerance" type="number" min="0" max="30" /></label>
      </div>
      <button type="button" class="apply-rules" :disabled="busy || !alarmRulesValid" @click="applyAlarmRules">按此规则核对历史事件</button>
      <p>以实测温度达到工艺上限识别真实事件，以预测达到上限识别提醒。相邻超限点合并为一个事件，每个提醒仅匹配一个真实事件。</p>
      <template v-if="current?.overtemperature">
        <div class="quality-metrics event-scores">
          <article><span>及时发现比例</span><strong>{{ percent(current.overtemperature.hitRate == null ? null : current.overtemperature.hitRate * 100) }}</strong><p>至少提前 5 分钟发现 {{ current.overtemperature.timelyCount }} / {{ current.overtemperature.actualCount }} 个事件 · 要求 ≥85% · {{ current.overtemperature.hitTarget == null ? '待核对' : current.overtemperature.hitTarget ? '符合' : '低于要求' }}</p></article>
          <article><span>误报比例</span><strong>{{ percent(current.overtemperature.falseAlertRate == null ? null : current.overtemperature.falseAlertRate * 100) }}</strong><p>误报 {{ current.overtemperature.falseAlertCount }} / {{ current.overtemperature.alertCount }} 次提醒 · 要求 ≤10% · {{ current.overtemperature.falseAlertTarget == null ? '待核对' : current.overtemperature.falseAlertTarget ? '符合' : '超出' }}</p></article>
          <article><span>发现较晚 / 漏掉</span><strong>{{ current.overtemperature.lateCount }} / {{ current.overtemperature.missedCount }}</strong><p>分别核对提前量不足和没有匹配提醒的事件。</p></article>
        </div>
        <p v-if="!current.overtemperature.actualCount">当前记录没有起点可确认的真实超温事件，及时发现比例待补充事件记录核验。</p>
        <p v-if="current.overtemperature.pendingActualCount || current.overtemperature.pendingAlertCount">起点被档案或缺测截断的事件 {{ current.overtemperature.pendingActualCount }} 个、相关提醒 {{ current.overtemperature.pendingAlertCount }} 次，保留为待核对。</p>
        <div v-if="current.overtemperature.events.length" class="worst-table"><table>
          <thead><tr><th scope="col">实测超温开始</th><th scope="col">提醒发出</th><th scope="col">提前量</th><th scope="col">核对结果</th></tr></thead>
          <tbody><tr v-for="event in current.overtemperature.events" :key="event.cycle + event.actualStart">
            <td>{{ dateText(event.actualStart) }}</td><td>{{ dateText(event.alertAt) }}</td><td>{{ event.leadMinutes == null ? '—' : formatKilnNumber(event.leadMinutes) + ' 分钟' }}</td>
            <td>{{ event.timely ? '至少提前 5 分钟' : event.alertAt ? '发现较晚' : '未匹配提醒' }}</td>
          </tr></tbody>
        </table></div>
      </template>
      <p v-else>填写工艺上限后，可用当前留出记录核对提醒效果。</p>
    </details>
    <details v-if="current" class="requirements">
      <summary>预测范围与运行证据</summary>
      <p>已选模型 {{ current.architecture ?? current.algorithmName }}</p>
      <p v-if="current.trainingSummary">本次训练采用 {{ current.trainingSummary.trainingCount }} / {{ current.trainingSummary.availableTrainingCount }} 条训练记录，历史序列 {{ current.trainingSummary.sequenceLength }} 步、隐藏单元 {{ current.trainingSummary.hiddenSize }} 个、训练 {{ current.trainingSummary.epochs }} 轮。</p>
      <p v-if="current.interval">预测范围使用 {{ current.interval.calibrationCount }} 条验证记录标定，目标覆盖 90% 的实测点。本组覆盖 {{ current.interval.coveredCount }} / {{ current.interval.count }} 点（{{ percent(current.interval.coverage == null ? null : current.interval.coverage * 100) }}）。<template v-if="split === 'validation'">当前为标定记录，覆盖要求需用测试记录核验。</template><template v-else> {{ current.interval.meetsTarget == null ? '待核对' : current.interval.meetsTarget ? '符合范围覆盖要求' : '范围覆盖未达到要求' }}</template></p>
      <p v-else>该历史模型尚未保存预测范围，可重新训练后核对覆盖情况。</p>
      <p v-if="current.inferenceBenchmark">服务器 CPU 试跑 {{ current.inferenceBenchmark.count }} 条记录，单点最大耗时 {{ formatKilnNumber(current.inferenceBenchmark.maxMs, 3) }} ms，试跑批次 {{ formatKilnNumber(current.inferenceBenchmark.batchMs, 3) }} ms。</p>
      <p v-else>该历史模型尚无保存的推理计时记录，重新训练时可生成。</p>
      <p>边缘设备单次推理 ≤200 ms，需要在目标设备上核验。能耗的 ≤5 秒批量要求需注明批量条数；连续 30 天运行需对应的运行日志。</p>
    </details>
    <details class="calculation">
      <summary>计算说明与核验范围</summary>
      <p>综合温差对应 RMSE，温差平方后取平均再开平方。平均偏差比例对应 MAPE，以实测温度绝对值为分母。平均相差对应 MAE。</p>
      <p>各指标使用完整的留出候选记录计算，图上采用部分时刻并包含最大偏差点。判定使用计算原值，展示数值按小数位取舍。</p>
      <p v-if="isTemperature">本组平均偏差比例 {{ percent(score?.mape) }}。摄氏温度接近零时百分比会显著放大，比例计算仅纳入达到实测绝对值下限的点。综合温差仍使用全部有效配对点。</p>
      <div v-if="isTemperature" class="minimum-control">
        <label>比例计算的实测绝对值下限 / ℃<input v-model.number="minimumActual" type="number" min=".001" max="10000" step=".1" /></label>
        <button type="button" :disabled="busy || !minimumValid || minimumActual === appliedMinimum" @click="appliedMinimum = Number(minimumActual)">按此下限重新核对</button>
      </div>
      <p v-if="current && isTemperature">本次比例计算下限 {{ reading(current.request.mapeMinActual) }} · 因温度接近零排除 {{ formatKilnNumber(score?.mapeExcludedCount, 0) }} 点</p>
      <p v-if="current">核对范围 {{ dateText(current.from) }} 至 {{ dateText(current.to) }} · {{ current.algorithmName }} · 提前 {{ current.horizonMinutes }} 分钟</p>
      <p>样本按实验已有的缺测检查及留出规则纳入。回放区间排除和参数试算各自展示计算结果，此处展示保存模型的历史核验。</p>
      <p v-if="experiment.observationQuality">数据检查发现 -9999 缺测记录 {{ experiment.observationQuality.sentinelRows }} 条，全零温度记录 {{ experiment.observationQuality.zeroTemperatureRows }} 条。全零温度{{ experiment.observationQuality.excludeZeroTemperatureRecords ? '按缺测处理' : '保留参与核对' }}。</p>
      <p v-if="current">数据版本 {{ current.dataHash.slice(0, 12) }} · {{ experiment.splitMethod }}</p>
    </details>
    <button v-if="current" type="button" class="report-download" @click="exportReport">下载本次核验报告</button>
  </section>
</template>

<style scoped>
.quality { padding:20px; color:var(--foreground); background:var(--card); border:1px solid var(--border); border-radius:10px; font-size:13px; }
.quality-header,.filters,.minimum-control { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
h3 { font-size:18px; font-weight:650; }
p { color:var(--muted-foreground); line-height:1.7; margin-top:5px; }
label { display:flex; align-items:center; gap:7px; }
select,input,button { padding:6px 9px; border:1px solid var(--border); border-radius:5px; background:var(--background); color:var(--foreground); min-width:0; }
select { max-width:230px; }
button,summary { cursor:pointer; }
button:disabled { opacity:.45; cursor:default; }
.verdict { padding:10px 12px; margin:16px 0 12px; background:var(--muted); border-left:3px solid #317e75; color:var(--foreground); font-weight:600; }
.verdict.attention { border-left-color:var(--destructive); }
.quality-metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
.quality-metrics article { min-width:0; }
.quality-metrics article > span { color:var(--muted-foreground); }
.quality-metrics strong { display:block; font-size:25px; margin-top:4px; font-weight:650; }
.quality-metrics strong span { font-size:13px; color:var(--muted-foreground); font-weight:400; }
.quality-metrics small { display:block; margin-top:5px; color:var(--muted-foreground); }
.quality-summary { margin:16px 0 12px; padding-top:12px; border-top:1px solid var(--border); }
.requirements,.quality-chart,.calculation { border-top:1px solid var(--border); padding-top:10px; margin-top:10px; }
summary { font-weight:600; }
.requirement-fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:10px; }
.requirement-fields label { display:grid; gap:6px; }
.feedback { display:flex; align-items:center; gap:8px; margin:12px 0; }
.quality-plot { width:100%; height:520px; margin-top:14px; }
.scale-toolbar,.scale-buttons,.largest-deviation,.custom-scale,.chart-explanation { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.scale-toolbar { margin-top:12px; padding:10px; background:var(--muted); border-radius:7px; }
.scale-buttons button[aria-pressed=true] { background:#266e6b; border-color:#266e6b; color:#fff; }
.largest-deviation { margin-left:auto; }
.custom-scale { margin-top:10px; }
.custom-scale input { width:90px; }
.chart-explanation { gap:10px 18px; margin-top:12px; }
.chart-explanation span { display:inline-flex; align-items:center; gap:6px; }
.chart-explanation i { width:18px; border-top:3px solid currentColor; }
.chart-explanation .prediction-line { color:#2379d2; border-top-style:dashed; }
.chart-explanation .positive-bar { color:#d97726; }
.chart-explanation .negative-bar { color:#247db3; }
.scale-notice { border-left:3px solid #b47b25; padding:6px 10px; background:var(--muted); }
.prediction-overview { margin:14px 0 8px; padding:16px; background:var(--muted); border-radius:8px; }
h4 { font-size:15px; font-weight:650; }
.temperature-readings { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:15px; margin-top:14px; }
.temperature-readings span,.temperature-readings small { display:block; color:var(--muted-foreground); }
.temperature-readings strong { display:block; font-size:27px; margin-top:4px; font-weight:650; }
.temperature-readings > div:first-child strong { color:#266e6b; }
.inspection-control { margin-top:14px; flex-wrap:wrap; }
.inspection-control input { flex:1; min-width:120px; accent-color:#266e6b; padding:0; }
.worst-details { margin:12px 0; }
.worst-table { overflow:auto; margin-top:12px; }
table { width:100%; border-collapse:collapse; text-align:left; white-space:nowrap; }
caption { text-align:left; color:var(--muted-foreground); padding-bottom:6px; }
th,td { border-bottom:1px solid var(--border); padding:7px 10px; }
td button { padding:2px 0; border:0; text-decoration:underline; text-underline-offset:3px; background:transparent; }
.minimum-control { justify-content:flex-start; margin-top:10px; }
.minimum-control input { max-width:90px; }
.apply-rules,.report-download { margin-top:12px; }
.event-scores { margin-top:14px; }
.optional-rule { margin-top:10px; flex-wrap:wrap; }
.optional-rule input { max-width:110px; }
.model-state { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin:14px 0; padding:12px; background:var(--muted); border-radius:6px; }
.model-state button { background:#266e6b; border-color:#266e6b; color:#fff; display:flex; align-items:center; gap:6px; }
.scope-note { margin-top:12px; }
.chart-actions { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-top:10px; color:var(--muted-foreground); }
.acceptance { margin:16px 0; }
.acceptance-heading { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:10px; }
.horizon-badge { padding:4px 8px; color:#266e6b; border:1px solid #40968745; border-radius:5px; white-space:nowrap; }
.acceptance-cards { gap:12px; }
.acceptance-cards article { display:flex; flex-direction:column; padding:16px; border:1px solid var(--border); border-top:3px solid var(--border); border-radius:8px; background:var(--background); }
.acceptance-cards article.passed { border-top-color:#317e75; }
.acceptance-cards article.exceeded { border-top-color:var(--destructive); }
.metric-title { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; font-weight:600; }
.metric-title abbr { text-decoration:none; font-size:11px; color:var(--muted-foreground); background:var(--muted); border-radius:4px; padding:2px 5px; }
.acceptance-cards strong { font-variant-numeric:tabular-nums; margin:9px 0 2px; }
.acceptance-cards .metric-rule { margin:0 0 8px; font-weight:600; }
.passed .metric-rule { color:#317e75; }
.exceeded .metric-rule { color:var(--destructive); }
.metric-example { margin-top:12px; padding-top:10px; border-top:1px solid var(--border); color:var(--muted-foreground); font-size:12px; line-height:1.6; }
.evaluation-scope { margin-top:12px; padding:12px 14px; background:var(--muted); border-radius:7px; font-size:12px; }
.evaluation-scope p:first-child { margin-top:0; }
.reference-note { font-size:12px; }
@media(max-width:720px) { .quality-metrics,.requirement-fields,.temperature-readings { grid-template-columns:minmax(0,1fr); gap:12px; } .quality-metrics article + article { border-top:1px solid var(--border); padding-top:12px; } }
</style>
