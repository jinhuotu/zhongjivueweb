<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Activity, ChevronRight, Download, Flame, Loader2, Play, RotateCcw, Thermometer, Wind } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import type { EChartsOption, LineSeriesOption } from 'echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { formatKilnChartValue, formatKilnNumber, formatKilnReading as numberText } from '@/lib/kiln-studio-format'
import KilnTemperatureRecordUpload from './KilnTemperatureRecordUpload.vue'
import KilnSafetyGuard from './KilnSafetyGuard.vue'
import KilnOperationAdvice from './KilnOperationAdvice.vue'
import KilnRealtimeFeedback from './KilnRealtimeFeedback.vue'
import { studioGet, studioPost } from '@/lib/kiln-studio-api'
import type {
  Bundle, Dataset, TemperatureAlert, TemperatureForecast, TemperatureReport,
  TemperatureRequest, TemperatureRun, UploadedTemperatureRecord,
} from '@/lib/kiln-studio-api'

const props = defineProps<{ bundle: Bundle; dataset?: Dataset; runs: TemperatureRun[]; defaultWindow?: 5 | 10 | 30; thermalEnabled?: boolean }>()
const emit = defineEmits<{ configure: [] }>()
ensureEcharts()

const temperatureModel = computed(() => props.bundle.manifest.find(item => item.task === 'temperature'))
const hasTrajectory = computed(() => temperatureModel.value?.algorithm === 'physics' || props.thermalEnabled)
const records = computed(() => [...(props.dataset?.summary ?? [])].sort((a, b) => b.from.localeCompare(a.from)))
const forecastWindows = [5, 10, 30, 60, 120, 360]
const uploads = ref<UploadedTemperatureRecord[]>([])
const uploadStatus = ref('')
const uploadListError = ref('')
const request = ref<TemperatureRequest>({
  cycleId: records.value[0]?.fileId ?? '', cycleSource: 'dataset', cursorFraction: .6, durationMinutes: props.defaultWindow ?? 30,
  offsetC: 0, delayMinutes: 0, rampMinutes: 15, tauMinutes: null, deviationC: 30, deviationMinutes: 10,
  comparePlans: true, holdMinutes: null, targetC: null, excludedRange: null,
})
const targetInput = ref<number | string>('')
const holdInput = ref<number | string>('')
const excludeStart = ref('')
const excludeEnd = ref('')
const result = ref<TemperatureForecast>()
const report = ref<TemperatureReport>()
const history = ref<TemperatureRun[]>([])
const error = ref('')
const reportError = ref('')
const busy = ref(false)
const reporting = ref(false)
const afterActual = ref(true)
const showBeforeExclusion = ref(true)
const chartMode = ref<'trend' | 'difference'>('trend')
const editedTau = ref(false)
const timelineIndex = ref(0)
const selectedAlert = ref<TemperatureAlert>()
const uploadedRecords = computed(() => {
  const restored = result.value?.inputRecord
  if (restored && !uploads.value.some(item => item.fileId === restored.fileId)) return [...uploads.value, restored]
  return uploads.value
})
const record = computed(() => (request.value.cycleSource === 'upload' ? uploadedRecords.value : records.value)
  .find(item => item.fileId === request.value.cycleId))
function beijingTimestamp(value: string) {
  const iso = value.replace(' ', 'T')
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : iso + '+08:00')
}
const selectedOrigin = computed({
  get() {
    if (!record.value) return ''
    const first = beijingTimestamp(record.value.from)
    const last = beijingTimestamp(record.value.to)
    const local = first + (last - first) * request.value.cursorFraction + 8 * 3600_000
    return Number.isFinite(local) ? new Date(local).toISOString().slice(0, 16) : ''
  },
  set(value: string) {
    if (!value || !record.value) return
    const first = beijingTimestamp(record.value.from)
    const last = beijingTimestamp(record.value.to)
    const fraction = (beijingTimestamp(value) - first) / (last - first)
    if (Number.isFinite(fraction)) request.value.cursorFraction = Math.min(1, Math.max(0, fraction))
  },
})
const point = computed(() => result.value?.points[timelineIndex.value])
const comparison = computed(() => result.value?.comparison)
const test = computed(() => comparison.value?.historicalTest)
const qualification = computed(() => {
  if (!test.value || test.value.mae == null || test.value.rmse == null) return '待核验'
  if (result.value?.metrics.trainedHorizonMinutes !== 10) return '待运行 10 分钟核验'
  return test.value.mae <= 10 && test.value.rmse <= 15 ? '两项温差指标符合' : '有温差指标超出'
})
const chart = ref<InstanceType<typeof VChart>>()
let disposed = false
let reportSequence = 0
onBeforeUnmount(() => { disposed = true })

watch(records, items => {
  if (request.value.cycleSource !== 'upload' && !items.some(item => item.fileId === request.value.cycleId)) {
    request.value.cycleId = items[0]?.fileId ?? ''
  }
}, { immediate: true })
watch(() => props.defaultWindow, value => {
  if (value && !uploadedRecords.value.find(item => item.fileId === request.value.cycleId &&
      (item.minimumWindowMinutes ?? 0) > value)) request.value.durationMinutes = value
})

onMounted(async () => {
  if (!temperatureModel.value) return
  try {
    const { items } = await studioGet<{ items: UploadedTemperatureRecord[] }>(`/bundles/${props.bundle.id}/temperature-records`)
    if (!disposed) {
      const known = new Set(uploads.value.map(item => item.fileId))
      uploads.value.push(...items.filter(item => !known.has(item.fileId)))
      if (!request.value.cycleId && uploads.value[0]) selectRecord(uploads.value[0].fileId)
    }
  } catch {
    if (!disposed) uploadListError.value = '暂时无法读取已上传记录，刷新后可重试。'
  }
})

function selectRecord(id: string) {
  const uploaded = uploadedRecords.value.find(item => item.fileId === id)
  const minimum = uploaded?.minimumWindowMinutes ?? 0
  request.value.cycleId = id
  request.value.cycleSource = uploaded ? 'upload' : 'dataset'
  request.value.cursorFraction = uploaded?.recommendedCursorFraction ?? .6
  excludeStart.value = excludeEnd.value = ''
  if (request.value.durationMinutes < minimum) {
    request.value.durationMinutes = forecastWindows.find(value => value >= minimum) ?? 360
  }
  error.value = ''
}

function selectUploadedRecord(imported: UploadedTemperatureRecord) {
  uploads.value = [imported, ...uploads.value.filter(item => item.fileId !== imported.fileId)]
  selectRecord(imported.fileId)
  uploadStatus.value = `已选用 ${fileName(imported.file)}，可以运行预测。`
}

function body(): TemperatureRequest {
  return {
    ...request.value, comparePlans: true, tauMinutes: editedTau.value ? request.value.tauMinutes : null,
    holdMinutes: holdInput.value === '' ? null : Number(holdInput.value),
    targetC: targetInput.value === '' ? null : Number(targetInput.value),
    excludedRange: excludeStart.value && excludeEnd.value ? { start: excludeStart.value, end: excludeEnd.value } : null,
  }
}
const stale = computed(() => {
  const previous = result.value?.request
  if (!previous) return false
  const current = body()
  const saved = { ...previous, cycleSource: previous.cycleSource ?? 'dataset' }
  const keys = Object.keys(current) as (keyof TemperatureRequest)[]
  return keys.some(key => JSON.stringify(current[key]) !== JSON.stringify(saved[key])) ||
    Boolean(excludeStart.value) !== Boolean(excludeEnd.value)
})
const invalid = computed(() => {
  const q = body()
  if (!q.cycleId || !temperatureModel.value) return true
  if ((excludeStart.value || excludeEnd.value) && (!q.excludedRange || excludeEnd.value <= excludeStart.value)) return true
  const values: [number | null, number, number, boolean?][] = [
    [q.cursorFraction, 0, 1], [q.durationMinutes, 5, 360, true], [q.offsetC, -100, 100],
    [q.delayMinutes, 0, 360, true], [q.rampMinutes, 1, 360, true],
    [q.deviationC, .1, 300], [q.deviationMinutes, 1, 120, true],
  ]
  if (editedTau.value) values.push([q.tauMinutes, 1, 600])
  if (q.holdMinutes != null) values.push([q.holdMinutes, 1, 360, true])
  if (q.targetC != null) values.push([q.targetC, 0, 1800])
  return values.some(([v, min, max, integer]) =>
    typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v)),
  )
})

const dateText = (value?: string | null) => value ? value.replace('T', ' ').slice(0, 16) : '—'
const filledPoint = (value: number | null | undefined) => value == null ? '—' : numberText(value, '℃')
const signedTemperature = (value: number | null | undefined) => value == null ? '—'
  : (value > 0 && formatKilnNumber(value) !== '0' ? '+' : '') + filledPoint(value)
const arrivalText = (value: number | null) => value == null ? '计算范围内未达到' : value === 0 ? '起点已达到' : `约 ${value} 分钟`
const fileName = (path: string) => path.replaceAll('\\', '/').split('/').at(-1) ?? path
function elapsed(minute: number) {
  const rounded = Math.floor(minute + 1e-7)
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}
function resetScenario() {
  Object.assign(request.value, { offsetC: 0, delayMinutes: 0, rampMinutes: 15, tauMinutes: null })
  editedTau.value = false
  holdInput.value = ''
}
function setResult(value: TemperatureForecast) {
  result.value = value
  timelineIndex.value = Math.max(0, value.points.findIndex(item => item.minute === value.originMinute))
  selectedAlert.value = undefined
  if (value.comparison?.endDeltaC == null) chartMode.value = 'trend'
  report.value = undefined
  reportError.value = ''
  reportSequence++
  reporting.value = false
  void nextTick(() => zoomForecast())
}
async function generateReport(runId = result.value?.runId) {
  if (!runId || reporting.value || stale.value) return
  const seq = ++reportSequence
  reporting.value = true
  reportError.value = ''
  try {
    const response = await studioPost<TemperatureReport>(`/temperature-runs/${runId}/report`, {})
    if (!disposed && seq === reportSequence && result.value?.runId === runId) report.value = response
  } catch (err) {
    if (seq === reportSequence) reportError.value = err instanceof Error ? err.message : '生成报告失败'
  } finally {
    if (seq === reportSequence) reporting.value = false
  }
}
function downloadReport() {
  const saved = result.value
  if (!report.value || !saved || stale.value || report.value.runId !== saved.runId) return
  const config = saved.request
  const content = [
    '温度预测对比报告', report.value.summary,
    `窑次 ${fileName(saved.cycleName)} · 起点 ${dateText(saved.originAt)} · 模型版本 ${saved.bundleVersion}`,
    `数据版本 ${saved.comparison?.dataHash ?? '见保存的模型版本'} · 机理版本 ${saved.comparison?.mechanismVersion ?? '见模型依据'}`,
    `设定偏移 ${signedTemperature(config.offsetC)} · 延时 ${config.delayMinutes} 分钟 · 渐变 ${config.rampMinutes} 分钟`,
    `保持 ${config.holdMinutes == null ? '至窗口结束' : config.holdMinutes + ' 分钟'} · 试算响应时间 ${config.tauMinutes == null ? '沿用模型' : config.tauMinutes + ' 分钟'}`,
    ...(config.excludedRange ? [`回放排除 ${dateText(config.excludedRange.start)} 至 ${dateText(config.excludedRange.end)}`] : []),
    '', ...report.value.findings, '', ...report.value.limitations,
  ].join('\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `温度预测对比-${saved.runId.slice(0, 8)}.txt`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function run() {
  if (invalid.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const value = await studioPost<TemperatureForecast>(`/bundles/${props.bundle.id}/temperature-forecast`, body())
    if (disposed) return
    setResult(value)
    history.value.unshift({
      id: value.runId, title: value.cycleName, originAt: value.originAt, targetLabel: value.targetLabel,
      bundleId: props.bundle.id, createdAt: '', projectId: props.bundle.projectId, kind: 'temperature_run',
    })
    void generateReport(value.runId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '温度预测失败'
  } finally { busy.value = false }
}
const runHistory = computed(() => [...new Map(
  [...history.value, ...props.runs.filter(item => item.bundleId === props.bundle.id)].map(item => [item.id, item]),
).values()])
async function openRun(event: Event) {
  const runId = (event.target as HTMLSelectElement).value
  if (!runId) return
  busy.value = true
  error.value = ''
  try {
    const value = await studioGet<TemperatureForecast>(`/temperature-runs/${runId}`)
    if (disposed) return
    request.value = { ...value.request, cycleSource: value.request.cycleSource ?? 'dataset' }
    editedTau.value = value.request.tauMinutes != null
    targetInput.value = value.request.targetC ?? ''
    holdInput.value = value.request.holdMinutes ?? ''
    excludeStart.value = value.request.excludedRange?.start ?? ''
    excludeEnd.value = value.request.excludedRange?.end ?? ''
    setResult(value)
    void generateReport(value.runId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取预测记录失败'
  } finally { busy.value = false }
}

function inspectMinute(minute: number) {
  const points = result.value?.points ?? []
  let low = 0
  let high = points.length - 1
  while (low < high) {
    const mid = (low + high) >>> 1
    if (points[mid]!.minute < minute) low = mid + 1
    else high = mid
  }
  const before = points[low - 1]
  timelineIndex.value = before && Math.abs(before.minute - minute) < Math.abs(points[low]!.minute - minute)
    ? low - 1 : low
}
async function focusAlert(alert: TemperatureAlert) {
  selectedAlert.value = alert
  inspectMinute(alert.peak)
  await nextTick()
  const end = result.value?.points.at(-1)?.minute ?? alert.end
  chart.value?.dispatchAction({
    type: 'dataZoom', dataZoomIndex: 0,
    startValue: Math.max(0, alert.start - 15), endValue: Math.min(end, alert.end + 15),
  })
}

function zoomForecast(fullRecord = false) {
  const value = result.value
  if (!value) return
  const last = value.points.at(-1)?.minute ?? 0
  const from = fullRecord || value.mode === 'rolling' ? 0 : Math.max(0, value.originMinute - 60)
  const to = fullRecord || value.mode === 'rolling' ? last : Math.min(last, value.originMinute + value.request.durationMinutes)
  chart.value?.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, startValue: from, endValue: to })
}
function inspectChart(event: { data?: unknown }) {
  if (Array.isArray(event.data) && typeof event.data[0] === 'number') inspectMinute(event.data[0])
}

const option = computed<EChartsOption>(() => {
  const value = result.value
  if (!value) return {}
  const lines: LineSeriesOption[] = []
  type CurveKey = 'setpoint' | 'actual' | 'actualAfter' | 'forecast' | 'adjustedSetpoint' | 'scenario'
    | 'rolling' | 'algorithmForecast' | 'beforeExclusionAlgorithm' | 'beforeExclusionMechanism'
  function line(name: string, key: CurveKey, color: string, dashed = false) {
    const algorithm = key === 'algorithmForecast' || key === 'beforeExclusionAlgorithm'
    const comparisonCurve = value!.mode === 'comparison' &&
      ['forecast', 'scenario', 'adjustedSetpoint', 'beforeExclusionMechanism'].includes(key)
    const seriesPoints = value!.points.filter(p => {
      if (algorithm || comparisonCurve) return p[key] != null
      if (key === 'actual' || key === 'actualAfter') return p.recordPoint !== false
      return true
    })
    lines.push({
      name, type: 'line', data: seriesPoints.map(p => [p.minute, p[key] ?? null]),
      showSymbol: algorithm && value?.comparison?.algorithmTrajectory === 'fixedHorizon', symbolSize: 6, connectNulls: false,
      lineStyle: { color, width: key === 'setpoint' ? 1.5 : 2.6, type: dashed ? 'dashed' : 'solid',
        opacity: algorithm && value?.comparison?.algorithmTrajectory === 'fixedHorizon' ? 0 : 1 },
      itemStyle: { color },
    })
  }
  line('原计划设定', 'setpoint', '#e5b274', true)
  const zone = temperatureModel.value?.config.zone
  const target = zone ? `${zone} 区` : '总体温度'
  line(`${target}起点前实测`, 'actual', '#edf4f9')
  if (afterActual.value) line(`${target}事后实测`, 'actualAfter', '#a3adbb', true)
  if (value.mode !== 'rolling') {
    if (value.points.some(p => p.forecast != null)) line('原计划 · 机理预测', 'forecast', '#62dace')
    if (value.comparison?.algorithmPoints) {
      const method = value.comparison.algorithmTrajectory
      const label = method === 'persistence' ? '持续值基线' : method === 'fixedHorizon' ? '算法时距预测点'
        : method ? '算法逐分钟预测' : '算法预测'
      line(`原计划 · ${label}`, 'algorithmForecast', '#83bcff', true)
    }
    if (showBeforeExclusion.value && value.comparison?.excludedCount) {
      if (value.points.some(p => p.beforeExclusionAlgorithm != null)) {
        line('排除前 · 算法预测', 'beforeExclusionAlgorithm', '#edb378', true)
      }
      if (value.points.some(p => p.beforeExclusionMechanism != null)) {
        line('排除前 · 机理预测', 'beforeExclusionMechanism', '#ee91b4', true)
      }
    }
    if (value.points.some(p => p.scenario != null)) {
      line('调整后设定', 'adjustedSetpoint', '#b69cf8', true)
      line('调整后 · 机理试算', 'scenario', '#bb9bff')
    }
  } else {
    line('历史滚动预测', 'rolling', '#62dace')
    lines.push({
      name: '当前起点预测', type: 'line', showSymbol: true, symbolSize: 10,
      data: value.points.filter(p => p.forecast != null).map(p => [p.minute, p.forecast]),
      itemStyle: { color: '#bba2ff' },
    })
  }
  const first = lines[0]!
  first.markLine = {
    silent: true, symbol: 'none', lineStyle: { color: '#82b5ca', type: 'dashed' },
    label: { color: '#aed1dc', formatter: '{b}' },
    data: [{ name: '预测起点', xAxis: value.originMinute },
      ...(value.request.targetC != null ? [{ name: '目标温度', yAxis: value.request.targetC }] : [])],
  }
  if (selectedAlert.value) first.markArea = {
    silent: true, itemStyle: { color: 'rgba(240,175,97,.18)' },
    data: [[{ xAxis: selectedAlert.value.start }, { xAxis: selectedAlert.value.end }]],
  }
  const options: EChartsOption = {
    animation: false,
    tooltip: {
      trigger: 'axis', renderMode: 'richText', confine: true,
      axisPointer: { label: { formatter: info => elapsed(Number(info.value)) } },
      valueFormatter: item => formatKilnChartValue(item, '℃'),
    },
    legend: { top: 7, textStyle: { color: '#b2c5d1' }, itemWidth: 15, itemHeight: 5 },
    grid: { top: 70, bottom: 75, left: 66, right: 27 },
    xAxis: { type: 'value', name: '距预测起点 / 分钟', nameLocation: 'middle', nameGap: 27,
      axisLabel: { formatter: (v: number) => formatKilnNumber(v - value.originMinute, 1), color: '#a4b9c8' },
      nameTextStyle: { color: '#a4b9c8' }, min: 0, splitLine: { show: false } },
    yAxis: { type: 'value', name: '温度 ℃', scale: true, nameTextStyle: { color: '#a4b9c8' },
      axisLabel: { color: '#a4b9c8', formatter: value => formatKilnNumber(value) }, splitLine: { lineStyle: { color: '#2a3b47' } } },
    dataZoom: [{ id: 'temperature-window', type: 'inside', filterMode: 'filter' },
      { type: 'slider', height: 17, bottom: 8, showDetail: false, filterMode: 'filter' }],
    series: lines,
  }
  if (chartMode.value === 'difference' && value.comparison?.endDeltaC != null) {
    return {
      ...options,
      legend: { ...options.legend, data: ['调整后 − 原计划'] },
      yAxis: { type: 'value', name: '温差 / ℃', axisLabel: { color: '#a4b9c8' },
        nameTextStyle: { color: '#a4b9c8' }, splitLine: { lineStyle: { color: '#2a3b47' } } },
      series: [{ name: '调整后 − 原计划', type: 'bar',
        data: value.points.filter(p => p.minute > value.originMinute && p.scenario != null && p.forecast != null)
          .map(p => [p.minute, p.scenario! - p.forecast!]),
        barMaxWidth: 22, itemStyle: { color: '#bb9bff' } }],
    }
  }
  return options
})

async function selectChart(mode: typeof chartMode.value) {
  chartMode.value = mode
  await nextTick()
  if (mode === 'trend') zoomForecast()
  else if (result.value) {
    chart.value?.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, startValue: result.value.originMinute,
      endValue: result.value.originMinute + (comparison.value?.coveredMinutes ?? result.value.request.durationMinutes) })
  }
}
</script>

<template>
  <section v-if="temperatureModel" class="forecast-desk" aria-label="温度预测对比工作台">
    <header class="desk-header">
      <div><h2><Activity :size="19" /> 温度预测对比</h2><p>{{ dataset?.config.kilnCode }} · {{ temperatureModel.algorithmName }} · {{ temperatureModel.config.zone ? temperatureModel.config.zone + ' 区' : '总体温度' }} · 版本 {{ bundle.version }}</p></div>
      <span class="status"><i />{{ busy ? '计算中' : stale ? '参数已修改' : result ? '预测已完成' : '等待运行' }}</span>
    </header>
    <div class="desk-grid">
      <aside class="setup">
        <h3>操作设定 · 可输入</h3>
        <fieldset :disabled="busy">
          <div class="record-heading">
            <label for="kiln-temperature-record">烧成记录</label>
            <KilnTemperatureRecordUpload :bundle-id="bundle.id" @imported="selectUploadedRecord" />
          </div>
          <select id="kiln-temperature-record" :value="request.cycleId" @change="selectRecord(($event.target as HTMLSelectElement).value); uploadStatus = ''">
            <option value="" disabled>请选择或上传记录</option>
            <optgroup v-if="uploadedRecords.length" label="已上传预测记录">
              <option v-for="item in uploadedRecords" :key="item.fileId" :value="item.fileId">{{ fileName(item.file) }} · {{ dateText(item.from) }}</option>
            </optgroup>
            <optgroup v-if="records.length" label="原数据集记录">
              <option v-for="item in records" :key="item.fileId" :value="item.fileId">{{ fileName(item.file) }} · {{ dateText(item.from) }}</option>
            </optgroup>
          </select>
          <p v-if="uploadStatus" class="muted" role="status">{{ uploadStatus }}</p>
          <p v-if="uploadListError" class="muted">{{ uploadListError }}</p>
          <p v-if="record" class="muted">{{ dateText(record.from) }} 至 {{ dateText(record.to) }}<br>{{ record.count.toLocaleString() }} 个采样点</p>
          <label>预测起点（北京时间）<input v-model="selectedOrigin" type="datetime-local" /></label>
          <label>在窑次中移动起点 · {{ Math.round(request.cursorFraction * 100) }}%
            <input v-model.number="request.cursorFraction" type="range" min="0" max="1" step="any" />
          </label>
          <label>未来预测范围
            <select v-model.number="request.durationMinutes">
              <option v-for="minutes in forecastWindows" :key="minutes" :value="minutes">{{ minutes < 120 ? minutes + ' 分钟' : minutes / 60 + ' 小时' }}</option>
            </select>
          </label>
          <label>想达到的温度 / ℃<input v-model.number="targetInput" type="number" min="0" max="1800" placeholder="可选，计算到达时间" /></label>
          <div v-if="hasTrajectory" class="scenario-controls">
            <h3>调整未来设定</h3>
            <label>相对原计划 / ℃
              <span class="slider-input"><input v-model.number="request.offsetC" aria-label="设定温度偏移滑块" type="range" min="-100" max="100" step="1" />
                <input v-model.number="request.offsetC" aria-label="设定温度偏移数值" type="number" min="-100" max="100" step="1" /></span>
            </label>
            <div class="time-inputs">
              <label>延时 / 分钟<input v-model.number="request.delayMinutes" type="number" min="0" max="360" /></label>
              <label>渐变 / 分钟<input v-model.number="request.rampMinutes" type="number" min="1" max="360" /></label>
            </div>
            <label>达到偏移后保持 / 分钟<input v-model.number="holdInput" type="number" min="1" max="360" placeholder="留空则持续保持偏移" /></label>
            <p class="muted">保持时间结束后，以同样的渐变时长回到原计划。</p>
            <label class="check"><input v-model="editedTau" type="checkbox" @change="request.tauMinutes = editedTau ? temperatureModel.parameters.tauMinutes : null" />试算温度响应时间</label>
            <label v-if="editedTau">响应时间常数 / 分钟<input v-model.number="request.tauMinutes" type="number" min="1" max="600" step=".1" /></label>
            <p v-if="editedTau" class="muted">原响应时间 {{ numberText(temperatureModel.parameters.tauMinutes, '分钟') }}。数值越大，温度跟随设定越慢。</p>
            <button class="subtle" type="button" @click="resetScenario"><RotateCcw :size="13" />恢复原计划参数</button>
          </div>
          <p v-else class="muted">启用温度机理的模型版本可计算调整方案。当前算法原生预测时距为 {{ temperatureModel.config.horizonMinutes }} 分钟。</p>
          <details>
            <summary>排除一段历史观测</summary>
            <label>开始（北京时间）<input v-model="excludeStart" type="datetime-local" /></label>
            <label>结束（北京时间）<input v-model="excludeEnd" type="datetime-local" /></label>
            <button v-if="excludeStart || excludeEnd" class="subtle" type="button" @click="excludeStart = ''; excludeEnd = ''">恢复全部观测</button>
            <p class="muted">仅本次回放排除，时间轴保留缺口，沿用已保存的模型。</p>
          </details>
          <details v-if="hasTrajectory">
            <summary>预测提醒条件</summary>
            <label>偏离设定阈值 / ℃<input v-model.number="request.deviationC" type="number" min=".1" max="300" step=".1" /></label>
            <label>最短连续偏离 / 分钟<input v-model.number="request.deviationMinutes" type="number" min="1" max="120" /></label>
            <p class="muted">用于筛选预测提醒，可按工艺要求修改。</p>
          </details>
        </fieldset>
        <button class="run" :disabled="busy || invalid" @click="run"><Loader2 v-if="busy" class="animate-spin" :size="15" /><Play v-else :size="15" />{{ busy ? '计算中' : '计算对比' }}</button>
        <p v-if="invalid && request.cycleId" class="muted" role="status">请检查参数范围和数值格式。</p>
        <p v-if="error" class="feedback" role="alert">{{ error }}</p>
        <label v-if="runHistory.length" class="history">预测记录
          <select :value="result?.runId ?? ''" :disabled="busy" @change="openRun">
            <option value="" disabled>选择已保存结果</option>
            <option v-for="item in runHistory" :key="item.id" :value="item.id">{{ fileName(item.title) }} · {{ dateText(item.originAt) }}</option>
          </select>
        </label>

        <!-- 只读反馈区：当前工况 + 协同小趋势，随播放点联动 -->
        <KilnRealtimeFeedback v-if="result" :forecast="result" :timeline-index="timelineIndex" />
      </aside>

      <div class="trend">
        <div class="trend-heading">
          <div><h3>预测走势</h3><p v-if="result">预测起点 {{ dateText(result.originAt) }} · 未来 {{ result.request.durationMinutes }} 分钟（北京时间）</p></div>
          <div v-if="result && chartMode === 'trend'" class="curve-toggles">
            <label class="check"><input v-model="afterActual" type="checkbox" />对照事后实测</label>
            <label v-if="comparison?.excludedCount" class="check"><input v-model="showBeforeExclusion" type="checkbox" />显示排除前预测</label>
          </div>
        </div>
        <p v-if="stale" class="feedback stale">以下为上次运行结果。点击运行，应用当前参数。</p>
        <template v-if="result">
          <div v-if="comparison" class="key-results">
            <div><span>起点实测</span><strong>{{ filledPoint(comparison.originTemperature) }}</strong></div>
            <div><span>{{ comparison.mechanismEnabled && result.points.some(p => p.forecast != null) ? '原计划机理终点' : '原计划算法终点' }} · +{{ comparison.coveredMinutes }} 分钟</span><strong>{{ filledPoint(result.metrics.endTemperature) }}</strong></div>
            <div v-if="comparison.endDeltaC != null"><span>调整方案终点</span><strong class="purple">{{ filledPoint(result.metrics.scenarioEndTemperature) }}</strong></div>
            <div v-if="comparison.endDeltaC != null"><span>调整前后相差</span><strong>{{ signedTemperature(comparison.endDeltaC) }}</strong></div>
            <div v-if="comparison.maxChangeC != null"><span>窗口最大温差 · +{{ comparison.maxChangeMinutes }} 分钟</span><strong>{{ signedTemperature(comparison.maxChangeC) }}</strong></div>
          </div>
          <KilnSafetyGuard :forecast="result" />
          <KilnOperationAdvice
            :forecast="result"
            :parameters="temperatureModel.parameters"
            :timeline-index="timelineIndex"
          />
          <div class="zoom-tools">
            <button v-if="comparison?.algorithmTrajectory === 'fixedHorizon'" type="button" class="subtle" :disabled="busy" @click="emit('configure')">训练并启用逐分钟连续预测</button>
            <button class="subtle" :aria-pressed="chartMode === 'trend'" @click="selectChart('trend')">温度折线</button>
            <button v-if="comparison?.endDeltaC != null" class="subtle" :aria-pressed="chartMode === 'difference'" @click="selectChart('difference')">温差柱图</button>
            <button v-if="chartMode === 'trend'" class="subtle" @click="zoomForecast()">定位预测窗口</button>
            <button v-if="chartMode === 'trend'" class="subtle" @click="zoomForecast(true)">展开已有走势</button>
          </div>
          <VChart ref="chart" :key="result.runId" :option="option" :update-options="{ replaceMerge: ['series'] }" autoresize class="trend-chart" @click="inspectChart" />
          <div class="timebar">
            <div><span>查看时刻</span><b>{{ dateText(point?.timestamp) }}</b><span>烧成 {{ elapsed(point?.minute ?? 0) }}</span></div>
            <input v-model.number="timelineIndex" type="range" min="0" :max="result.points.length - 1" aria-label="查看烧成时刻" />
          </div>
          <p class="scope">{{ result.scope }}</p>
          <p v-if="comparison?.originSetpoint != null" class="scope">预测起点的原计划设定 {{ filledPoint(comparison.originSetpoint) }}。</p>
          <p v-if="comparison" class="scope">算法预测覆盖 {{ comparison.algorithmPoints }} / {{ result.request.durationMinutes }} 个分钟点。圆点对应实际计算的预测值。</p>
          <p v-if="comparison?.excludedCount" class="scope">已排除 {{ comparison.excludedCount }} 条观测，图中保留时间缺口。</p>
          <p v-for="note in result.notes" :key="note" class="scope">{{ note }}</p>
        </template>
        <div v-else class="chart-placeholder"><Thermometer :size="32" /><p>选择烧成记录和起点，运行后显示温控曲线与预测结果。</p></div>
      </div>

      <details v-if="result" class="readings">
        <summary>时刻读数、工况与预测提醒</summary>
        <p class="muted">{{ result?.targetLabel ?? '按温度子模型范围显示' }}</p>
        <dl v-if="result">
          <div><dt>设定温度</dt><dd>{{ numberText(point?.setpoint, '℃') }}</dd></div>
          <div><dt>实测温度</dt><dd>{{ numberText(point?.actual, '℃') }}</dd></div>
          <div v-if="afterActual && point?.actualAfter != null"><dt>事后实测</dt><dd>{{ numberText(point.actualAfter, '℃') }}</dd></div>
          <div><dt>{{ result.mode === 'rolling' ? '滚动预测温度' : '原计划预测' }}</dt><dd class="accent">{{ numberText(result.mode === 'rolling' ? point?.rolling : point?.forecast, '℃') }}</dd></div>
          <div v-if="result.mode === 'rolling' && point?.forecast != null"><dt>当前起点预测</dt><dd>{{ numberText(point.forecast, '℃') }}</dd></div>
          <div v-if="point?.algorithmForecast != null"><dt>算法预测</dt><dd>{{ numberText(point.algorithmForecast, '℃') }}</dd></div>
          <div v-if="point?.scenario != null"><dt>调整后预测</dt><dd class="purple">{{ numberText(point.scenario, '℃') }}</dd></div>
        </dl>
        <div v-if="result" class="telemetry">
          <h3>历史工况</h3>
          <p><Flame :size="14" />燃气 <b>{{ numberText(point?.gas, 'Nm³/h') }}</b></p>
          <p><Wind :size="14" />助燃风 <b>{{ numberText(point?.air, 'Nm³/h') }}</b></p>
          <p><Activity :size="14" />窑压 <b>{{ numberText(point?.pressure, 'Pa') }}</b></p>
          <p>氧含量 <b>{{ numberText(point?.oxygen, '%') }}</b></p>
        </div>
        <div v-if="result" class="alerts">
          <h3>预测提醒 <span>{{ result.alerts.length }}</span></h3>
          <p v-if="result.mode === 'rolling'" class="muted">连续偏离提醒适用于起点后的预测走势。</p>
          <p v-else-if="!result.alerts.length" class="muted">本次窗口内没有达到所设条件的预测偏离。</p>
          <button v-for="alert in result.alerts" :key="alert.series + alert.start" class="alert" :class="{ selected: selectedAlert === alert }" @click="focusAlert(alert)">
            <span>{{ alert.series }} · {{ alert.deviation < 0 ? '温度偏低' : '温度偏高' }}<small>{{ elapsed(alert.start) }} – {{ elapsed(alert.end) }} · 最大偏差 {{ numberText(alert.deviation, '℃') }}</small></span>
            <ChevronRight :size="14" />
          </button>
          <div v-if="selectedAlert" class="alert-detail" aria-live="polite">
            <b>{{ result.targetLabel }} · {{ selectedAlert.series }}</b>
            <p>{{ dateText(selectedAlert.startAt) }} 至 {{ dateText(selectedAlert.endAt) }}</p>
            <p>峰值处预测 {{ numberText(selectedAlert.temperature, '℃') }}，设定 {{ numberText(selectedAlert.setpoint, '℃') }}。</p>
            <p>本次规则为偏差达到 {{ result.request.deviationC }} ℃ 且持续至少 {{ result.request.deviationMinutes }} 分钟。</p>
          </div>
        </div>
      </details>
    </div>
    <section v-if="result" class="report">
      <header><div><h3>分析总结</h3><p>起点 {{ dateText(result.originAt) }} · 模型 {{ result.bundleVersion }} · {{ result.targetLabel }} · 已保存本次计算</p></div>
        <button v-if="report" class="subtle" :disabled="stale || reporting" @click="downloadReport"><Download :size="14" />下载分析报告</button>
        <button v-if="reportError" class="subtle" :disabled="reporting || stale" @click="generateReport()">重试读取报告</button>
      </header>
      <dl class="report-metrics">
        <div v-if="result.metrics.peakTemperature != null"><dt>原计划预测峰值</dt><dd>{{ numberText(result.metrics.peakTemperature, '℃') }}</dd></div>
        <div v-if="comparison?.scenarioPeakTemperature != null"><dt>调整方案峰值</dt><dd>{{ filledPoint(comparison.scenarioPeakTemperature) }}</dd></div>
        <div v-if="comparison && result.request.targetC != null"><dt>原计划达到目标</dt><dd>{{ arrivalText(comparison.targetMinutes) }}</dd></div>
        <div v-if="comparison?.endDeltaC != null && result.request.targetC != null"><dt>调整后达到目标</dt><dd>{{ arrivalText(comparison.scenarioTargetMinutes) }}</dd></div>
        <div v-if="comparison"><dt>历史测试 · {{ result.metrics.trainedHorizonMinutes }} 分钟时距</dt><dd>{{ qualification }}</dd></div>
      </dl>
      <p v-if="result.metrics.endAt" class="muted">预测覆盖至 {{ dateText(result.metrics.endAt) }}<template v-if="stale"> · 对应上次已计算参数</template></p>
      <p v-if="reporting" class="muted" role="status">正在读取报告</p>
      <p v-if="reportError" class="feedback" role="alert">{{ reportError }}。可重新生成，温控曲线已保留。</p>
      <template v-if="report"><p>{{ report.summary }}</p><ul v-if="report.findings.length"><li v-for="finding in report.findings" :key="finding">{{ finding }}</li></ul><p v-for="limit in report.limitations" :key="limit" class="muted">{{ limit }}</p></template>
      <details v-if="result.mode !== 'rolling'">
        <summary>查看本次试算参数</summary>
        <p>设定温度偏移 {{ numberText(result.request.offsetC, '℃') }} · 延时 {{ result.request.delayMinutes }} 分钟 · 渐变 {{ result.request.rampMinutes }} 分钟</p>
        <p v-if="result.metrics.savedTauMinutes != null">原计划响应时间 {{ numberText(result.metrics.savedTauMinutes, '分钟') }}<template v-if="result.request.tauMinutes != null"> · 试算 {{ numberText(result.metrics.scenarioTauMinutes, '分钟') }}</template></p>
        <p v-if="comparison?.mechanismVersion">机理版本 {{ comparison.mechanismVersion }} · 温度按设定计划与热响应时间计算。</p>
      </details>
    </section>
  </section>
  <p v-else class="no-temperature">该版本未包含温度子模型。到「算法实验」选用一个温度算法后，生成包含温度的版本即可运行。</p>
</template>

<style scoped>
.forecast-desk { background:#101b25; color:#e9f2f7; border:1px solid #304553; border-radius:12px; overflow:hidden; font-size:13px; }
.desk-header { display:flex; align-items:center; justify-content:space-between; padding:22px 24px; border-bottom:1px solid #2c3d4a; gap:16px; }
h2,h3,p { margin:0; }
h2 { display:flex; align-items:center; gap:9px; font-size:20px; font-weight:650; }
h2 svg,.accent { color:#67d9ce; }
.desk-header p,.trend-heading p,.report header p { color:#a9bdca; font-size:12px; margin-top:6px; }
.status { display:flex; align-items:center; gap:8px; color:#a8ddd4; white-space:nowrap; }
.status i { width:7px; height:7px; background:#62c4b6; border-radius:50%; }
.desk-grid { display:grid; grid-template-columns:minmax(235px, 280px) minmax(0, 1fr); }
.setup,.readings,.trend { min-width:0; padding:18px; }
.setup { border-right:1px solid #2c3d4a; }
.readings { grid-column:1 / -1; margin-top:0; }
h3 { font-weight:650; font-size:14px; }
fieldset { padding:0; border:0; min-width:0; margin:0; }
label { display:grid; gap:6px; margin:13px 0 8px; color:#d3e0e8; font-size:12px; }
.record-heading { display:flex; align-items:center; justify-content:space-between; gap:6px; margin:12px 0 7px; }
.record-heading label { margin:0; }
select,input[type=number],input[type=datetime-local] { width:100%; min-width:0; padding:8px; border:1px solid #3b5262; border-radius:5px; background:#162632; color:#ecf5f8; color-scheme:dark; }
input[type=range] { width:100%; accent-color:#65d4c8; }
input[type=checkbox] { accent-color:#65d4c8; }
.check { display:flex; align-items:center; gap:8px; line-height:1.5; }
details { border-top:1px solid #304553; padding:12px 0 0; margin-top:14px; }
summary { cursor:pointer; color:#c9ebe6; }
.muted,.scope { color:#a5b9c6; font-size:11px; line-height:1.7; overflow-wrap:anywhere; }
.subtle,.run { display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:8px 10px; border-radius:6px; cursor:pointer; }
.subtle { color:#b8ddd9; border:1px solid #3a5965; margin-top:10px; }
.run { background:#286f6b; color:#fff; width:100%; margin:8px 0; font-weight:600; }
button:disabled { opacity:.5; cursor:not-allowed; }
.trend-heading,.report header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.trend-heading .check { margin:0; }
.curve-toggles { display:flex; flex-wrap:wrap; gap:12px; }
.trend-chart { height:435px; width:100%; }
.scenario-controls { border-top:1px solid #304553; margin-top:16px; padding-top:12px; }
.slider-input { display:grid; grid-template-columns:minmax(0,1fr) 72px; gap:8px; }
.time-inputs { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.key-results { display:grid; grid-template-columns:repeat(auto-fit,minmax(115px,1fr)); gap:10px; margin-top:16px; }
.key-results > div { background:#172631; border:1px solid #304553; border-radius:6px; padding:10px; }
.key-results span { display:block; color:#a9bdca; font-size:11px; }
.key-results strong { display:block; margin-top:4px; font-size:21px; font-variant-numeric:tabular-nums; }
.zoom-tools button[aria-pressed=true] { color:#fff; background:#286f6b; border-color:#286f6b; }
.zone-strip { display:flex; gap:6px; flex-wrap:wrap; margin:14px 0 0; }
.zone-strip span { border:1px solid #304553; border-radius:4px; padding:5px 7px; font-size:11px; color:#aec1cc; }
.zone-strip span.active { color:#9be6dc; border-color:#4e9b95; }
.zone-strip b { margin-left:4px; color:#e5f1f6; }
.zoom-tools { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:13px; }
.zoom-tools .subtle { font-size:11px; padding:4px 8px; }
.chart-placeholder { display:grid; align-content:center; justify-items:center; gap:14px; min-height:375px; text-align:center; color:#9db2bf; }
.timebar { border-top:1px solid #304553; padding:14px 0 8px; }
.timebar div { display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; color:#a8c1cd; font-size:11px; margin-bottom:9px; }
.timebar b { color:#e4f1f6; }
.feedback { margin:8px 0; padding:8px 10px; border-left:2px solid #e9aa72; background:#3c2e27; color:#ffccaa; overflow-wrap:anywhere; }
.stale { font-size:11px; }
dl { margin:12px 0; }
dl div,.telemetry p { display:flex; gap:7px; align-items:center; justify-content:space-between; padding:7px 0; }
dt,.telemetry p { color:#a7bfcd; font-size:11px; }
dd { margin:0; text-align:right; font-variant-numeric:tabular-nums; }
.purple { color:#c8adff; }
.telemetry,.alerts { border-top:1px solid #304553; padding-top:12px; margin-top:12px; }
.telemetry b { margin-left:auto; color:#e0edf3; }
.alerts h3 { margin-bottom:8px; }
.alerts h3 span { color:#e9b985; }
.alert { display:flex; align-items:center; gap:8px; justify-content:space-between; text-align:left; width:100%; padding:10px; margin:6px 0; color:#ffe1bc; background:#292a29; border:1px solid #504a42; border-radius:5px; cursor:pointer; }
.alert.selected { border-color:#e9b985; }
.alert small { display:block; margin-top:3px; color:#c7b6a1; font-size:10px; }
.alert-detail { padding:10px 2px; color:#c7d5de; font-size:11px; line-height:1.7; }
.report { border-top:1px solid #2c3d4a; padding:18px 24px; line-height:1.8; }
.report ul { padding-left:18px; list-style:disc; }
.report-metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(125px,1fr)); gap:10px; margin:14px 0 8px; }
.report-metrics div { padding:10px 12px; border:1px solid #304553; background:#172631; border-radius:6px; }
.report-metrics dt { color:#a9bdca; font-size:11px; }
.report-metrics dd { font-size:19px; font-weight:600; }
.report details { margin-top:10px; }
.no-temperature { padding:16px; background:var(--card); border:1px solid var(--border); border-radius:8px; }
@media (max-width:750px) { .desk-grid,.readings { display:block; }.setup { border-right:0; border-bottom:1px solid #2c3d4a; }.trend-chart { height:340px; } }
</style>
