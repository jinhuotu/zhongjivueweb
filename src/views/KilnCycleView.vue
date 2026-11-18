<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { EChartsOption, LineSeriesOption } from 'echarts'
import { Check, Download, FileUp, Loader2, Sparkles, X } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import { PageHeader, Panel, Tag } from '@/components/ui-kit'
import KilnPredictionProcess from '@/components/production/KilnPredictionProcess.vue'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { formatKilnChartValue, formatKilnNumber } from '@/lib/kiln-studio-format'
import {
  type AnalysisRequest, type AnalysisResult, type CycleItem, type CycleWorkspace,
  type DashboardPanel, type GeneratedDashboard, type ImportPreview, type KpiKey,
  type ModelKey, type PredictionAlert, type RunItem,
  analyzeKilnCycle, generateKilnDashboard, getKilnCycleWorkspace, getKilnRun,
  listKilnCycles, listKilnRuns, previewKilnCycles, saveKilnCycleMeta, uploadKilnCycles,
} from '@/lib/kiln-cycles-api'
import { COLOR } from '@/lib/mock'

ensureEcharts()
type TabId = 'compare' | 'board' | 'curve'
const route = useRoute()
const router = useRouter()
const palette = useChartPalette()
const fileInput = ref<HTMLInputElement | null>(null)
const cycles = ref<CycleItem[]>([])
const cycleId = ref<number | null>(null)
const kilnFilter = ref('')
const fallbackKiln = ref('')
const ws = ref<CycleWorkspace | null>(null)
const selectedModel = ref<ModelKey | ''>('')
const cursor = ref(0)
const curve = ref('')
const load = ref('')
const offset = ref(0)
const durationScale = ref(1)
const instruction = ref('')
const temperatureZone = ref('六区平均')
const temperatureChartMode = ref<'line' | 'bar'>('line')
const temperatureAxisMin = ref<number | null>(null)
const temperatureAxisMax = ref<number | null>(null)
const temperatureWindowStart = ref(0)
const temperatureWindowEnd = ref(0)
const tab = ref<TabId>('compare')
const loading = ref(false)
const importing = ref(false)
const saving = ref(false)
const calculating = ref(false)
const generating = ref(false)
const error = ref('')
const historyError = ref('')
const notice = ref('')
const pendingFiles = ref<File[]>([])
const preview = ref<ImportPreview[]>([])
const customMapping = ref<Record<string, boolean>>({})
const mappings = ref<Record<string, Record<string, string>>>({})
const result = ref<AnalysisResult | null>(null)
const generated = ref<GeneratedDashboard | null>(null)
const runs = ref<RunItem[]>([])
const selectedAlert = ref<PredictionAlert | null>(null)
const selectedZone = ref<string | null>(null)
let workspaceSequence = 0
let actionSequence = 0
const busy = computed(() => calculating.value || generating.value)
const kilns = computed(() => [...new Set(cycles.value.map((c) => c.kilnCode))])
const visibleCycles = computed(() => cycles.value.filter((c) => !kilnFilter.value || c.kilnCode === kilnFilter.value))
const selectedCard = computed(() => ws.value?.models.find((m) => m.key === selectedModel.value))
const analysis = computed(() => result.value?.analysis ?? null)
const duration = computed(() => ws.value?.durationHours ?? 0)
const current = computed(() => analysis.value?.current ?? ws.value?.points.filter((p) => p.hour <= cursor.value).at(-1))
const canAnalyze = computed(() => !!selectedCard.value?.available && !loading.value && !busy.value)
const metadataDirty = computed(() => !!ws.value && (
  curve.value !== (ws.value.cycle.curveVersion || '') ||
  load.value !== (ws.value.cycle.loadKg == null ? '' : String(ws.value.cycle.loadKg))
))
const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'compare', label: '数据与模型选择' }, { id: 'board', label: 'AI 看板与报告' }, { id: 'curve', label: '温控曲线与提醒' },
]
const modelColors: Record<ModelKey, string> = {
  similar: COLOR.patina, data: COLOR.sulfur, physics: COLOR.coolant, fusion: COLOR.iron,
}
const kpiLabels: Record<KpiKey, { label: string; unit: string }> = {
  usedGas: { label: '已发生用气', unit: 'Nm³' },
  remainingGas: { label: '预计剩余用气', unit: 'Nm³' },
  wholeGas: { label: '预计整窑用气', unit: 'Nm³' },
  deltaGas: { label: '较原计划变化', unit: 'Nm³' },
  carbonKg: { label: '预计燃气碳排', unit: 'kgCO₂' },
}
const kpis = computed<KpiKey[]>(() => generated.value?.dashboard.kpis ?? ['usedGas', 'remainingGas', 'wholeGas', 'deltaGas'])
const temperatureZones = ['六区平均', '全部温区', '一区', '二区', '三区', '四区', '五区', '六区']
const zoneNames = ['一区', '二区', '三区', '四区', '五区', '六区']
const zoneLineColors = ['#ff7b72', '#f2c14e', '#63d5e0', '#77b7ff', '#b995ff', '#52d3ae']
const temperatureEnd = computed(() => duration.value || temperatureWindowEnd.value || 0)
const temperatureRange = computed<[number, number]>(() => {
  const end = Math.max(0, temperatureEnd.value)
  const start = Math.max(0, Math.min(temperatureWindowStart.value, end))
  const finish = Math.max(start, Math.min(temperatureWindowEnd.value || end, end))
  return [start, finish]
})
const temperatureAxisRange = computed<[number, number] | undefined>(() => {
  if (temperatureAxisMin.value == null || temperatureAxisMax.value == null) return undefined
  if (!Number.isFinite(temperatureAxisMin.value) || !Number.isFinite(temperatureAxisMax.value)) return undefined
  if (temperatureAxisMax.value <= temperatureAxisMin.value) return undefined
  return [temperatureAxisMin.value, temperatureAxisMax.value]
})
const panels = computed<DashboardPanel[]>(() => generated.value?.dashboard.panels ?? [
  { kind: 'process', title: '六温区工况', explanation: '当前回放时刻的上传工况，点击温区查看详情。' },
  { kind: 'gas', title: '所选模型用气预测', explanation: '计算预览，可继续生成 AI 分析看板。' },
  { kind: 'temperature', title: '设定计划与实测温度', explanation: '未来部分为设定计划，实测显示至当前时刻。' },
  { kind: 'windows', title: '未来窗口用气', explanation: '按所选模型预测积分，窗口不足时显示实际覆盖时长。' },
  ...(analysis.value?.adjusted ? [{ kind: 'comparison' as const, title: '调整前后对比', explanation: '对比同一模型下原计划和调整计划的预计耗气。' }] : []),
])

function fmt(value: number | null | undefined, digits = 1) {
  return formatKilnNumber(value, digits)
}
function when(value: string) { return new Date(value).toLocaleString('zh-CN') }
function message(err: unknown) { return err instanceof Error ? err.message : '操作失败，请重试' }
function invalidate() {
  actionSequence += 1
  result.value = null
  generated.value = null
  selectedAlert.value = null
  selectedZone.value = null
  calculating.value = false
  generating.value = false
}
function requestBody(): AnalysisRequest {
  if (!selectedModel.value || !selectedCard.value?.available) throw new Error('请先选择一个可用模型')
  if (metadataDirty.value) throw new Error('匹配参数已修改，请先保存并重新对比模型')
  if (![cursor.value, offset.value, durationScale.value].every(Number.isFinite)) throw new Error('请填写有效数字')
  if (offset.value < -100 || offset.value > 100 || durationScale.value < 0.5 || durationScale.value > 1.5) {
    throw new Error('温度偏移范围为 -100～100 ℃，剩余时长比例为 0.5～1.5')
  }
  return {
    selectedModel: selectedModel.value, cursorHour: cursor.value,
    parameters: { temperatureOffsetC: offset.value, remainingDurationScale: durationScale.value },
    instruction: instruction.value,
  }
}
function temperatureReading(point: { tempMeas: number | null; zones?: Array<{ name: string; temp: number | null }> }) {
  if (temperatureZone.value === '六区平均' || temperatureZone.value === '全部温区') return point.tempMeas
  return point.zones?.find((zone) => zone.name === temperatureZone.value)?.temp ?? null
}
function temperaturePrediction(point: { predictedTemperature: number | null; zonePredictedTemperature?: Record<string, number | null> }) {
  if (temperatureZone.value === '六区平均' || temperatureZone.value === '全部温区') return point.predictedTemperature
  return point.zonePredictedTemperature?.[temperatureZone.value] ?? null
}
function temperatureData<T extends { hour: number }>(rows: T[], pick: (row: T) => number | null) {
  const [start, end] = temperatureRange.value
  return rows.map((row) => [row.hour, row.hour >= start && row.hour <= end ? pick(row) : null] as [number, number | null])
}
function series(name: string, color: string, data: Array<[number, number | null]>, dashed = false): LineSeriesOption {
  return { name, type: 'line', showSymbol: false, connectNulls: false, data,
    lineStyle: { color, width: 2, type: dashed ? 'dashed' : 'solid' }, itemStyle: { color } }
}
function chart(
  lines: LineSeriesOption[],
  unit = 'Nm³/h',
  focus = false,
  industrial = false,
  xRange?: [number, number],
  yRange?: [number, number],
): EChartsOption {
  const tone = industrial
    ? {
        ...palette.value,
        grid: '#23445a',
        axis: '#9eb8c7',
        legend: '#d5e9ef',
        tooltipBg: '#102335',
        tooltipBorder: '#2e6074',
        tooltipText: '#e8fbff',
      }
    : palette.value
  const cutoff = analysis.value?.cursorHour ?? cursor.value
  if (lines[0]) {
    lines[0].markLine = { symbol: 'none', data: [{ xAxis: cutoff, label: { formatter: '当前时刻' } }] }
    if (focus && selectedAlert.value) {
      lines[0].markArea = { silent: true, data: [[{ xAxis: selectedAlert.value.startHour }, { xAxis: selectedAlert.value.endHour }]] }
    }
  }
  return {
    animation: false, grid: { left: 64, right: 38, top: 48, bottom: 50 },
    tooltip: {
      ...tooltipBase(tone), trigger: 'axis',
      axisPointer: { label: { formatter: info => formatKilnNumber(info.value) + ' h' } },
      valueFormatter: value => formatKilnChartValue(value, unit === '温度 / ℃' ? '℃' : unit),
    },
    legend: { top: 4, type: 'scroll', textStyle: { color: tone.legend, fontSize: 11 } },
    xAxis: { type: 'value', min: xRange?.[0], max: xRange?.[1], name: '时间 / h', nameLocation: 'middle', nameGap: 28,
      axisLabel: { color: tone.axis, formatter: value => formatKilnNumber(value) }, splitLine: { show: false } },
    yAxis: { type: 'value', min: yRange?.[0], max: yRange?.[1], name: unit, axisLabel: { color: tone.axis, formatter: value => formatKilnNumber(value) }, splitLine: { lineStyle: { color: tone.grid } } },
    series: lines,
  }
}
const compareOption = computed(() => {
  const points = ws.value?.points ?? []
  return chart([
    series('整窑实测（用于回放对比）', COLOR.molybdenum, points.map((p) => [p.hour, p.measured])),
    ...(ws.value?.models ?? []).filter((m) => m.available).map((m) => series(m.name, modelColors[m.key], points.map((p) => [p.hour, p[m.key]]), true)),
  ])
})
const gasOption = computed(() => {
  const a = analysis.value
  if (!a) return chart([])
  return chart([
    series('到当前时刻实测', COLOR.molybdenum, a.points.map((p) => [p.hour, p.measured])),
    series('原计划预测', COLOR.coolant, a.baselinePoints.map((p) => [p.hour, p.hour >= a.cursorHour ? p.predicted : null]), true),
    series(a.adjusted ? '调整后预测' : a.selectedModel.name, COLOR.iron, a.points.map((p) => [p.hour, p.hour >= a.cursorHour ? p.predicted : null])),
  ], 'Nm³/h', true, true)
})
const temperatureOption = computed(() => {
  const a = analysis.value
  if (a) {
    if (temperatureChartMode.value === 'bar') return zoneComparisonOption.value
    if (temperatureZone.value === '全部温区') {
      const zoneLines: LineSeriesOption[] = []
      for (const [index, zoneName] of zoneNames.entries()) {
        zoneLines.push(
          series(`${zoneName} 实时`, zoneLineColors[index], temperatureData(a.points, (point) => point.zones?.find((zone) => zone.name === zoneName)?.temp ?? null)),
          series(`${zoneName} 预测`, zoneLineColors[index], temperatureData(a.points, (point) => point.zonePredictedTemperature?.[zoneName] ?? null), true),
        )
      }
      return chart(zoneLines, '温度 / ℃', true, true, temperatureRange.value, temperatureAxisRange.value)
    }
    const visibleValues = [
      ...a.baselinePoints.map((point) => point.tempSp),
      ...a.points.map((point) => temperatureReading(point)),
      ...a.points.map((point) => temperaturePrediction(point)),
    ].filter((value): value is number => value != null && Number.isFinite(value))
    const yRange = temperatureAxisRange.value ?? (temperatureZone.value === '六区平均' || !visibleValues.length
      ? undefined
      : (() => {
          const low = Math.min(...visibleValues)
          const high = Math.max(...visibleValues)
          const span = Math.max(40, (high - low) * 1.35)
          const center = (low + high) / 2
          return [Math.max(0, Math.floor((center - span / 2) / 10) * 10), Math.ceil((center + span / 2) / 10) * 10] as [number, number]
        })())
    return chart([
    series(`${temperatureZone.value} 原设定计划`, COLOR.sulfur, temperatureData(a.baselinePoints, (p) => p.tempSp), true),
    series(`${temperatureZone.value} 实时温度`, COLOR.iron, temperatureData(a.points, (p) => temperatureReading(p))),
    series(`${temperatureZone.value} 预测温度`, COLOR.coolant, temperatureData(a.points, (p) => temperaturePrediction(p)), false),
    ...(temperatureZone.value === '六区平均' ? [
      series('预测区间下沿', COLOR.coolant, temperatureData(a.points, (p) => p.temperatureLow), true),
      series('预测区间上沿', COLOR.coolant, temperatureData(a.points, (p) => p.temperatureHigh), true),
    ] : []),
    ...(a.adjusted ? [series('调整后设定计划', COLOR.iron, temperatureData(a.points, (p) => p.tempSp))] : []),
    ], '温度 / ℃', true, true, temperatureRange.value, yRange)
  }
  const points = ws.value?.points ?? []
  return chart([
    series(`${temperatureZone.value} 设定计划`, COLOR.sulfur, temperatureData(points, (p) => p.tempSp)),
    series(`${temperatureZone.value} 实时温度`, COLOR.iron, temperatureData(points, (p) => p.hour <= cursor.value ? temperatureReading(p) : null)),
  ], '温度 / ℃', false, true, temperatureRange.value)
})
const zoneComparisonOption = computed<EChartsOption>(() => {
  const point = analysis.value?.current
  if (!point) return chart([])
  return {
    animation: false,
    grid: { left: 54, right: 18, top: 42, bottom: 42 },
    tooltip: { ...tooltipBase(palette.value), trigger: 'axis', valueFormatter: value => formatKilnChartValue(value, '℃') },
    legend: { top: 4, textStyle: { color: palette.value.legend, fontSize: 11 } },
    xAxis: { type: 'category', data: zoneNames, axisLabel: { color: palette.value.axis } },
    yAxis: { type: 'value', name: '温度 / ℃', min: temperatureAxisRange.value?.[0], max: temperatureAxisRange.value?.[1], axisLabel: { color: palette.value.axis, formatter: value => formatKilnNumber(value) }, splitLine: { lineStyle: { color: palette.value.grid } } },
    series: [
      { name: '当前实测', type: 'bar', data: zoneNames.map((name) => point.zones.find((zone) => zone.name === name)?.temp ?? null), itemStyle: { color: '#ff7b72' } },
      { name: '当前预测', type: 'bar', data: zoneNames.map((name) => analysis.value?.points.find((row) => Math.abs(row.hour - (analysis.value?.cursorHour ?? 0)) < 1e-6)?.zonePredictedTemperature?.[name] ?? null), itemStyle: { color: '#63d5e0' } },
    ],
  }
})
const comparisonOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', valueFormatter: value => formatKilnChartValue(value, 'Nm³') }, grid: { left: 70, right: 30, top: 25, bottom: 35 },
  xAxis: { type: 'category', data: ['预计剩余', '预计整窑'] },
  yAxis: { type: 'value', name: '用气 / Nm³', axisLabel: { formatter: value => formatKilnNumber(value) } },
  legend: { top: 0 },
  series: [
    { name: '原计划', type: 'bar', data: [analysis.value?.metrics.baselineRemainingGas ?? 0, analysis.value?.metrics.baselineWholeGas ?? 0], itemStyle: { color: COLOR.coolant } },
    { name: '调整后', type: 'bar', data: [analysis.value?.metrics.remainingGas ?? 0, analysis.value?.metrics.wholeGas ?? 0], itemStyle: { color: COLOR.iron } },
  ],
}))
const reportText = computed(() => {
  const a = analysis.value
  if (!a) return ''
  const d = generated.value?.dashboard
  return [
    '# ' + (d?.title ?? '窑次预测计算结果'),
    '', '窑次：' + result.value?.cycle.label,
    '用户所选模型：' + a.selectedModel.name,
    '当前时刻：' + fmt(a.cursorHour, 2) + ' h',
    '温度偏移：' + a.parameters.temperatureOffsetC + ' ℃；剩余时长比例：' + a.parameters.remainingDurationScale,
    ...kpis.value.map((key) => kpiLabels[key].label + '：' + fmt(a.metrics[key], 2) + ' ' + kpiLabels[key].unit),
    '', ...(d ? ['## AI 分析', d.summary, ...d.insights.map((s) => '- ' + s)] : ['计算结果预览，尚未生成 AI 分析。']),
    '', '## 预测窗口',
    ...a.windows.map((w) => w.minutes + ' 分钟窗口：覆盖 ' + w.coveredMinutes + ' 分钟，预计用气 ' + fmt(w.gas, 2) + ' Nm³'),
    '', '## 提醒与依据', ...a.alerts.flatMap((alert) => ['- ' + alert.title + '：' + alert.detail, '  ' + alert.evidence]),
    '', '## 适用范围与限制', a.scope,
    ...[...new Set([...a.warnings, ...(d?.limitations ?? [])])].map((s) => '- ' + s),
    ...(generated.value ? ['', 'AI 模型：' + generated.value.llmModel, '生成时间：' + when(generated.value.generatedAt), '快照编号：' + generated.value.id] : []),
  ].join('\n')
})

async function loadHistory(id: number) {
  try {
    const items = await listKilnRuns(id)
    if (cycleId.value === id) { runs.value = items; historyError.value = '' }
  } catch (err) { if (cycleId.value === id) historyError.value = message(err) }
}
async function loadWorkspace() {
  const id = cycleId.value
  const ticket = ++workspaceSequence
  invalidate()
  ws.value = null
  selectedModel.value = ''
  offset.value = 0
  durationScale.value = 1
  instruction.value = ''
  runs.value = []
  historyError.value = ''
  if (!id) return
  loading.value = true
  error.value = ''
  try {
    const workspace = await getKilnCycleWorkspace(id)
    if (ticket !== workspaceSequence) return
    ws.value = workspace
    curve.value = workspace.cycle.curveVersion ?? ''
    load.value = workspace.cycle.loadKg == null ? '' : String(workspace.cycle.loadKg)
    cursor.value = workspace.suggestCursorHour
    temperatureZone.value = '六区平均'
    temperatureChartMode.value = 'line'
    temperatureAxisMin.value = null
    temperatureAxisMax.value = null
    temperatureWindowStart.value = 0
    temperatureWindowEnd.value = workspace.durationHours
    tab.value = 'compare'
    void loadHistory(id)
  } catch (err) { if (ticket === workspaceSequence) error.value = message(err) }
  finally { if (ticket === workspaceSequence) loading.value = false }
}
async function inspectFiles(files: File[]) {
  if (!files.length) return
  importing.value = true
  error.value = ''
  notice.value = ''
  pendingFiles.value = files
  preview.value = []
  try {
    preview.value = await previewKilnCycles(files, fallbackKiln.value)
    mappings.value = Object.fromEntries(preview.value.map((p) => [p.name, { ...p.mapping }]))
    customMapping.value = {}
  } catch (err) { error.value = message(err); pendingFiles.value = [] }
  finally { importing.value = false }
}
function onFiles(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) void inspectFiles([...target.files])
  target.value = ''
}
function onDrop(event: DragEvent) {
  if (event.dataTransfer?.files && !importing.value) void inspectFiles([...event.dataTransfer.files])
}
async function confirmImport() {
  importing.value = true
  error.value = ''
  try {
    const map: Record<string, Record<string, string>> = {}
    for (const p of preview.value) if (customMapping.value[p.name]) {
      map[p.name] = Object.fromEntries(Object.entries(mappings.value[p.name] ?? {}).filter(([, value]) => value))
    }
    const response = await uploadKilnCycles(pendingFiles.value, fallbackKiln.value, map)
    cycles.value = response.cycles
    const failures = response.files.filter((f) => f.status === 'failed')
    const first = response.cycleIds[0]
    if (failures.length) error.value = failures.map((f) => f.name + '：' + f.message).join('；')
    if (first) {
      kilnFilter.value = ''
      if (cycleId.value === first) await loadWorkspace()
      else cycleId.value = first
      notice.value = '已导入 ' + response.cycleIds.length + ' 个窑次，请确认匹配信息并选择模型。'
    }
    if (!failures.length) { preview.value = []; pendingFiles.value = [] }
  } catch (err) { error.value = message(err) }
  finally { importing.value = false }
}
async function saveMeta() {
  if (!cycleId.value) return
  const value = load.value.trim() === '' ? null : Number(load.value)
  if (value != null && (!Number.isFinite(value) || value < 0 || value > 1_000_000)) {
    error.value = '装载量须为 0～1000000 kg'; return
  }
  saving.value = true
  error.value = ''
  try {
    await saveKilnCycleMeta(cycleId.value, { curveVersion: curve.value, loadKg: value })
    cycles.value = await listKilnCycles()
    await loadWorkspace()
    notice.value = '匹配参数已保存，请根据更新后的对比重新选择模型。'
  } catch (err) { error.value = message(err) }
  finally { saving.value = false }
}
async function calculate(useAI: boolean) {
  const id = cycleId.value
  if (!id) return
  error.value = ''
  let body: AnalysisRequest
  try { body = requestBody() } catch (err) { error.value = message(err); return }
  const ticket = ++actionSequence
  calculating.value = true
  generated.value = null
  try {
    const computedResult = await analyzeKilnCycle(id, body)
    if (ticket !== actionSequence) return
    result.value = computedResult
    tab.value = 'board'
    if (useAI) {
      calculating.value = false
      generating.value = true
      const dashboard = await generateKilnDashboard(id, body)
      if (ticket !== actionSequence) return
      result.value = dashboard
      generated.value = dashboard
      void loadHistory(id)
      notice.value = 'AI 看板与报告已生成并保存为独立快照。'
    } else notice.value = '试算已完成；可继续生成 AI 看板与分析报告。'
  } catch (err) {
    if (ticket === actionSequence) error.value = (useAI && result.value ? '计算完成，AI 看板未生成：' : '') + message(err)
  } finally { if (ticket === actionSequence) { calculating.value = false; generating.value = false } }
}
async function restoreRun(run: RunItem) {
  const id = cycleId.value
  if (!id) return
  invalidate()
  const ticket = actionSequence
  calculating.value = true
  error.value = ''
  try {
    const snapshot = await getKilnRun(id, run.id)
    if (ticket !== actionSequence) return
    selectedModel.value = snapshot.request.selectedModel
    cursor.value = snapshot.request.cursorHour
    offset.value = snapshot.request.parameters.temperatureOffsetC
    durationScale.value = snapshot.request.parameters.remainingDurationScale
    instruction.value = snapshot.request.instruction
    await nextTick()
    result.value = snapshot
    generated.value = snapshot
    tab.value = 'board'
    notice.value = '正在查看历史快照；修改参数后将重新计算。'
  } catch (err) { error.value = message(err) }
  finally { calculating.value = false }
}
function chooseModel(key: ModelKey) {
  selectedModel.value = key
  if (key === 'similar') offset.value = 0
}
function openAlert(item: PredictionAlert) { selectedAlert.value = item; selectedZone.value = null; tab.value = 'curve' }
function openZone(name: string) { selectedZone.value = name; selectedAlert.value = null }
function downloadReport() {
  const url = URL.createObjectURL(new Blob([reportText.value], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = (result.value?.cycle.kilnCode ?? 'kiln') + '-预测分析报告.md'
  link.click()
  URL.revokeObjectURL(url)
}
function onTemperatureClick(event: { value?: unknown }) {
  if (!analysis.value || !Array.isArray(event.value)) return
  const hour = Number(event.value[0])
  const nearby = analysis.value.alerts.find((a) => hour >= a.startHour && hour <= a.endHour)
  if (nearby) openAlert(nearby)
}
watch([selectedModel, cursor, offset, durationScale, instruction, curve, load], () => {
  const hadResult = !!result.value
  invalidate()
  if (hadResult) notice.value = '输入已修改，请重新试算或生成 AI 看板。'
})
watch(cycleId, () => { void loadWorkspace() })
watch(kilnFilter, () => {
  if (!visibleCycles.value.some((c) => c.id === cycleId.value)) cycleId.value = visibleCycles.value[0]?.id ?? null
})
watch([cycleId, tab], () => {
  void router.replace({ query: { ...route.query, cycle: cycleId.value ? String(cycleId.value) : undefined, view: tab.value } })
})
onMounted(async () => {
  try {
    const initialId = Number(route.query.cycle)
    cycles.value = await listKilnCycles()
    cycleId.value = cycles.value.find((c) => c.id === initialId)?.id ?? cycles.value[0]?.id ?? null
  } catch (err) { error.value = message(err) }
})
</script>

<template>
  <div class="space-y-4">
    <PageHeader title="窑次预测" description="上传数据，比较四种模型，手动选择后生成 AI 看板和报告，调整未来计划并查看预测提醒。">
      <template #actions>
        <button class="secondary-button" :disabled="!reportText" @click="downloadReport"><Download class="size-4" /> 下载报告</button>
      </template>
    </PageHeader>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
      <div class="workflow-step"><span>01</span> 上传与字段确认</div>
      <div class="workflow-step"><span>02</span> 四模型对比与选择</div>
      <div class="workflow-step"><span>03</span> AI 看板与参数试算</div>
      <div class="workflow-step"><span>04</span> 曲线提醒与追溯</div>
    </div>
    <div v-if="error" role="alert" class="rounded-lg border border-iron/30 bg-iron/5 p-3 text-sm text-iron">{{ error }}</div>
    <div v-if="notice" role="status" class="rounded-lg border border-border p-3 text-xs text-muted-foreground">{{ notice }}</div>

    <Panel flush title="上传与识别" subtitle="支持 xls / xlsx / zip。先预览字段，确认后导入；标准温度/压力双表自动合并。">
      <div class="p-4 space-y-4">
        <div class="rounded-lg border border-dashed border-border p-5 flex flex-wrap justify-between items-center gap-4" @dragover.prevent @drop.prevent="onDrop">
          <div class="flex gap-3 items-center"><FileUp class="size-6 text-muted-foreground" /><div><div class="text-sm">拖入窑次工况表，开始分析</div><div class="mt-1 text-xs text-muted-foreground">文件名自动识别窑号和窑次；照片及说明书会跳过。</div></div></div>
          <div class="flex gap-2 flex-wrap">
            <input v-model="fallbackKiln" class="field w-48" placeholder="备用窑号，如 TC-03" :disabled="importing" />
            <button class="secondary-button" :disabled="importing" @click="fileInput?.click()"><Loader2 v-if="importing" class="size-4 animate-spin" />选择文件</button>
            <input ref="fileInput" type="file" accept=".xls,.xlsx,.zip" multiple class="hidden" @change="onFiles" />
          </div>
        </div>
        <div v-if="preview.length" class="space-y-3">
          <div v-for="(file, index) in preview" :key="index" class="rounded-lg border border-border p-3 space-y-3">
            <div class="flex flex-wrap justify-between gap-2 text-xs">
              <div><b>{{ file.name }}</b> · {{ file.kilnCode ?? '未识别窑号' }} · {{ file.rows }} 行 <Tag :tone="file.status === 'ok' ? 'patina' : 'sulfur'">{{ file.message }}</Tag></div>
              <label v-if="file.columns.length" class="flex items-center gap-2"><input v-model="customMapping[file.name]" type="checkbox" />自定义列映射（单工作表）</label>
            </div>
            <div v-if="!customMapping[file.name]" class="flex flex-wrap gap-2">
              <Tag v-for="field in file.fields.filter((f) => f.present > 0)" :key="field.key">{{ field.label }} · {{ field.present }} 行</Tag>
              <span v-if="file.status === 'failed' && file.columns.length" class="text-xs text-muted-foreground">可启用自定义列映射，指定时间和工况字段。</span>
            </div>
            <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <label v-for="field in file.fields" :key="field.key" class="text-xs space-y-1">
                <span>{{ field.label }}{{ field.key === 'ts' ? '（必填）' : '' }}</span>
                <select v-model="mappings[file.name]![field.key]" class="field w-full">
                  <option value="">不映射</option><option v-for="column in file.columns" :key="column.id" :value="column.id">{{ column.label }}{{ column.sample ? ' · ' + column.sample : '' }}</option>
                </select>
              </label>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="primary-button" :disabled="importing || !preview.some((f) => f.status === 'ok' || customMapping[f.name])" @click="confirmImport">确认字段并导入</button>
            <button class="secondary-button" :disabled="importing" @click="preview = []; pendingFiles = []">取消</button>
          </div>
        </div>
      </div>
    </Panel>

    <Panel flush title="选择窑次与匹配信息" subtitle="曲线版本和装载量用于历史窑次匹配；保存后重新比较模型。">
      <div class="p-4 grid sm:grid-cols-2 xl:grid-cols-6 gap-3">
        <label class="label"><span>窑炉</span><select v-model="kilnFilter" class="field" :disabled="busy"><option value="">全部窑炉</option><option v-for="kiln in kilns" :key="kiln">{{ kiln }}</option></select></label>
        <label class="label xl:col-span-2"><span>窑次</span><select v-model="cycleId" class="field" :disabled="busy"><option :value="null" disabled>请选择窑次</option><option v-for="cycle in visibleCycles" :key="cycle.id" :value="cycle.id">{{ cycle.label }}</option></select></label>
        <label class="label"><span>曲线版本</span><input v-model="curve" class="field" maxlength="64" placeholder="如 V3.2" :disabled="busy || !ws" /></label>
        <label class="label"><span>装载量 / kg</span><input v-model="load" type="number" min="0" max="1000000" class="field" placeholder="可补充" :disabled="busy || !ws" /></label>
        <div class="flex items-end"><button class="secondary-button" :disabled="!ws || saving || busy || !metadataDirty" @click="saveMeta">保存匹配信息</button></div>
      </div>
      <div v-if="ws" class="px-4 pb-4 space-y-2">
        <div class="flex justify-between text-xs"><span>回放当前时刻 {{ fmt(cursor, 2) }} h · {{ current?.stage }}</span><span class="text-muted-foreground">整窑 {{ fmt(duration, 2) }} h · {{ ws.cycle.sampleCount }} 个采样点</span></div>
        <input v-model.number="cursor" aria-label="回放当前时刻" type="range" class="w-full" min="0" :max="duration" step="0.01" :disabled="busy" />
        <div class="flex gap-1 flex-wrap"><Tag v-for="gap in ws.gaps" :key="gap" tone="sulfur">{{ gap }}</Tag></div>
      </div>
    </Panel>
    <div v-if="loading" class="flex gap-2 text-sm text-muted-foreground"><Loader2 class="size-4 animate-spin" /> 正在加载窑次与模型对比</div>
    <div v-else-if="!ws" class="text-sm text-muted-foreground py-10 text-center">上传并确认工况数据后，开始比较模型。</div>
    <template v-if="ws">
      <div class="flex flex-wrap gap-2">
        <button v-for="item in tabs" :key="item.id" class="secondary-button" :class="{ 'active-tab': tab === item.id }" @click="tab = item.id">{{ item.label }}</button>
      </div>
      <div v-if="tab === 'compare'" class="space-y-4">
        <Panel flush title="识别结果" subtitle="确认数据覆盖情况；缺失字段不会自动补成真实工况。">
          <div class="p-4 grid grid-cols-2 lg:grid-cols-6 gap-3"><div v-for="field in ws.recognition" :key="field.key" class="text-xs"><div class="text-muted-foreground">{{ field.label }} / {{ field.unit }}</div><div class="mt-1 font-medium">{{ field.present }} / {{ field.total }} 点</div></div></div>
        </Panel>
        <div class="flex flex-wrap justify-between gap-2 items-end"><div><div class="text-base font-medium">四类模型对比</div><p class="text-xs text-muted-foreground mt-1">误差为本窑次整窑回放 MAE，用于查看效果；不作为已验证的在线精度，也不自动决定选型。</p></div><Tag>{{ selectedCard ? '已选择：' + selectedCard.name : '请手动选择一个可用模型' }}</Tag></div>
        <div class="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div v-for="model in ws.models" :key="model.key" class="model-card" :class="{ chosen: selectedModel === model.key, unavailable: !model.available }">
            <div class="flex justify-between gap-2"><h3 class="text-sm font-medium">{{ model.name }}</h3><Check v-if="selectedModel === model.key" class="size-4 text-iron shrink-0" /></div>
            <p class="text-xs text-muted-foreground mt-2 min-h-10">{{ model.summary }}</p>
            <div class="text-2xl font-medium mt-4">{{ model.available ? fmt(model.totalGas, 0) : '不可用' }}<span v-if="model.available" class="text-xs ml-1 font-normal">Nm³</span></div>
            <p class="text-xs mt-2">回放 MAE：{{ fmt(model.mae, 2) }} Nm³/h</p>
            <p class="text-xs text-muted-foreground mt-2 leading-5 min-h-16">{{ model.note }}</p>
            <button class="secondary-button mt-3 w-full justify-center" :disabled="!model.available || busy" :aria-pressed="selectedModel === model.key" @click="chooseModel(model.key)">{{ selectedModel === model.key ? '已选择此模型' : model.available ? '使用此模型' : '数据不足，暂不可用' }}</button>
          </div>
        </div>
        <Panel flush title="实测与四模型预测曲线" :subtitle="'历史训练窑次 ' + ws.trainCount + ' 个；当前窑次不参与拟合，仅使用其开始之前结束的窑次。'"><div class="p-3"><VChart :option="compareOption" style="height: 330px" autoresize /></div></Panel>
      </div>

      <Panel flush title="试算参数与 AI 生成" :subtitle="selectedCard ? '本次采用：' + selectedCard.name + '。修改参数后请重新计算。' : '先在模型对比中选择一个模型，再生成看板。'">
        <div class="p-4 space-y-4">
          <div class="grid md:grid-cols-3 gap-3">
            <label class="label"><span>未来设定温度偏移 / ℃</span><input v-model.number="offset" type="number" class="field" min="-100" max="100" step="5" :disabled="busy || !selectedModel || selectedModel === 'similar'" /><small class="text-muted-foreground">{{ selectedModel === 'similar' ? '相似窑次基线不支持温度偏移' : '-100～100 ℃；从当前时刻平滑过渡' }}</small></label>
            <label class="label"><span>剩余计划时长比例</span><input v-model.number="durationScale" type="number" class="field" min="0.5" max="1.5" step="0.05" :disabled="busy || !selectedModel" /><small class="text-muted-foreground">0.5～1.5；1 为原计划，1.1 表示延长 10%</small></label>
            <label class="label"><span>看板与报告侧重点（可选）</span><input v-model="instruction" class="field" maxlength="1500" placeholder="如：重点展示升温阶段用气和六温区偏差" :disabled="busy" /><small class="text-muted-foreground">AI 根据数据与所选模型组织展示内容</small></label>
          </div>
          <p class="text-xs text-muted-foreground leading-5">以上为试算输入边界，设备工艺限值需另行确认。仅调整当前时刻之后的设定计划；原始实测数据保持不变。当前模型不支持装载量变化的热负荷试算。</p>
          <div class="flex flex-wrap gap-2 items-center">
            <button class="primary-button" :disabled="!canAnalyze || metadataDirty" @click="calculate(true)"><Loader2 v-if="busy" class="size-4 animate-spin" /><Sparkles v-else class="size-4" />{{ generating ? 'AI 正在生成看板与报告' : calculating ? '正在计算所选模型' : '生成 AI 看板与报告' }}</button>
            <button class="secondary-button" :disabled="!canAnalyze || metadataDirty" @click="calculate(false)"><Loader2 v-if="calculating" class="size-4 animate-spin" />仅重新试算</button>
            <button class="secondary-button" :disabled="busy || (offset === 0 && durationScale === 1)" @click="offset = 0; durationScale = 1">恢复原计划参数</button>
            <span v-if="metadataDirty" class="text-xs text-iron">请先保存匹配信息</span>
          </div>
        </div>
      </Panel>

      <template v-if="tab === 'board'">
        <div v-if="!analysis" class="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">选择模型后，点击“生成 AI 看板与报告”或“仅重新试算”。</div>
        <template v-else>
          <div class="industrial-dashboard">
            <header class="industrial-header">
              <div>
                <div class="industrial-kicker">KILN ENERGY CONTROL / AI ANALYSIS</div>
                <h2>{{ generated?.dashboard.title ?? '窑炉能耗预测看板' }}</h2>
                <p>{{ result?.cycle.label }} · {{ analysis.selectedModel.name }} · 当前 {{ fmt(analysis.cursorHour, 2) }} h · {{ analysis.current.stage }}</p>
              </div>
              <div class="industrial-status"><span class="status-dot" />{{ generated ? 'AI 看板已保存' : '计算预览' }}<small>{{ generated ? when(generated.generatedAt) : '等待生成报告' }}</small></div>
            </header>

            <div class="industrial-strip">
              <span>窑炉 {{ result?.cycle.kilnCode }}</span><span>阶段 {{ analysis.current.stage }}</span><span>模型 {{ analysis.selectedModel.name }}</span><span>温度目标 {{ fmt(analysis.current.tempSp, 0) }} ℃</span><span>样本 {{ result?.cycle.sampleCount }} 点</span>
            </div>

            <div class="industrial-kpis">
              <div v-for="key in kpis" :key="key" class="industrial-kpi">
                <span>{{ kpiLabels[key].label }}</span><strong>{{ fmt(analysis.metrics[key], 1) }}</strong><small>{{ kpiLabels[key].unit }} · {{ key === 'deltaGas' ? '估算变化' : '实时计算' }}</small>
              </div>
            </div>

            <div class="industrial-grid">
              <section v-for="panel in panels" :key="panel.kind" class="scada-panel" :class="{ 'scada-wide': panel.kind === 'process' || panel.kind === 'gas' }">
                <div class="scada-panel-head"><div><span class="panel-code">{{ panel.kind.toUpperCase() }}</span><h3>{{ panel.title }}</h3></div><span class="panel-live">● LIVE</span></div>
                <p class="scada-panel-note">{{ panel.explanation }}</p>
                <KilnPredictionProcess v-if="panel.kind === 'process'" :current="analysis.current" :kiln-name="result?.cycle.kilnName ?? ''" :model-name="analysis.selectedModel.name" @zone="openZone" />
                <VChart v-else-if="panel.kind === 'gas'" :option="gasOption" class="scada-chart" autoresize />
                <div v-else-if="panel.kind === 'temperature'">
                  <div class="temperature-controls scada-controls"><label>温区<select v-model="temperatureZone"><option v-for="zone in temperatureZones" :key="zone" :value="zone">{{ zone }}</option></select></label><label>图形<select v-model="temperatureChartMode"><option value="line">趋势折线</option><option value="bar">当前温区对比</option></select></label><label>起始 / h<input v-model.number="temperatureWindowStart" type="number" min="0" :max="temperatureEnd" step="0.1" /></label><label>结束 / h<input v-model.number="temperatureWindowEnd" type="number" min="0" :max="temperatureEnd" step="0.1" /></label><label>温度下限<input v-model.number="temperatureAxisMin" type="number" step="10" placeholder="自动" /></label><label>温度上限<input v-model.number="temperatureAxisMax" type="number" step="10" placeholder="自动" /></label><button type="button" @click="temperatureWindowStart = 0; temperatureWindowEnd = temperatureEnd; temperatureAxisMin = null; temperatureAxisMax = null">自动范围</button></div>
                  <VChart :option="temperatureOption" class="scada-chart scada-chart-short" autoresize @click="onTemperatureClick" />
                </div>
                <VChart v-else-if="panel.kind === 'comparison'" :option="comparisonOption" class="scada-chart scada-chart-short" autoresize />
                <div v-else-if="panel.kind === 'windows'" class="window-grid"><div v-for="window in analysis.windows" :key="window.minutes"><span>+{{ window.minutes }} MIN</span><strong>{{ fmt(window.gas) }}</strong><small>Nm³ · 覆盖 {{ window.coveredMinutes }} min</small></div></div>
                <div v-else class="carbon-readout"><strong>{{ fmt(analysis.metrics.carbonKg) }}</strong><span>kgCO₂</span><small>按预计整窑燃气 × 2.16 kgCO₂/Nm³估算</small></div>
              </section>
            </div>

            <section class="scada-alerts">
              <div class="scada-panel-head"><div><span class="panel-code">ALARM CENTER</span><h3>预测提醒</h3></div><span class="panel-live">{{ analysis.alerts.length }} EVENTS</span></div>
              <div class="alert-grid"><button v-for="item in analysis.alerts" :key="item.id" class="scada-alert" :class="item.level" @click="openAlert(item)"><span class="alert-led" /><div><strong>{{ item.title }}</strong><p>{{ item.detail }}</p><small>{{ fmt(item.startHour, 2) }} h · {{ item.zone ?? '整窑' }} · 点击查看依据</small></div></button></div>
            </section>

            <section v-if="generated" class="scada-analysis"><div class="scada-panel-head"><div><span class="panel-code">AI INSIGHT</span><h3>AI 分析与建议</h3></div><span class="panel-live">{{ generated.llmModel }}</span></div><div class="insight-grid"><p v-for="(insight, i) in generated.dashboard.insights" :key="i">{{ insight }}</p></div></section>
            <section class="scada-limitations"><span class="panel-code">DATA SCOPE</span><span>{{ analysis.scope }}</span><span v-for="warning in [...new Set([...analysis.warnings, ...(generated?.dashboard.limitations ?? [])])]" :key="warning">{{ warning }}</span></section>
          </div>
        </template>
      </template>

      <div v-if="tab === 'curve'" class="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <section class="curve-scada-panel">
          <div class="scada-panel-head"><div><span class="panel-code">TEMPERATURE CONTROL</span><h3>温控曲线与预测</h3></div><span class="panel-live">{{ temperatureZone }} · {{ analysis ? 'PREDICTING' : 'WAITING' }}</span></div>
          <p class="scada-panel-note">{{ analysis ? `${analysis.temperatureModel.name} · ${temperatureZone}` : '选择模型并试算后显示未来温度预测。' }}</p>
          <div class="p-2"><div class="temperature-controls scada-controls"><label>查看温区<select v-model="temperatureZone"><option v-for="zone in temperatureZones" :key="zone" :value="zone">{{ zone }}</option></select></label><label>图形<select v-model="temperatureChartMode"><option value="line">趋势折线</option><option value="bar">当前温区对比</option></select></label><label>起始 / h<input v-model.number="temperatureWindowStart" type="number" min="0" :max="temperatureEnd" step="0.1" /></label><label>结束 / h<input v-model.number="temperatureWindowEnd" type="number" min="0" :max="temperatureEnd" step="0.1" /></label><label>温度下限<input v-model.number="temperatureAxisMin" type="number" step="10" placeholder="自动" /></label><label>温度上限<input v-model.number="temperatureAxisMax" type="number" step="10" placeholder="自动" /></label><button type="button" @click="temperatureWindowStart = 0; temperatureWindowEnd = temperatureEnd; temperatureAxisMin = null; temperatureAxisMax = null">自动范围</button></div><VChart :option="temperatureOption" style="height: 360px" autoresize @click="onTemperatureClick" /></div>
          <p class="curve-footnote">红线为实时温度，蓝线为当前时刻之后的预测温度，虚线为预测区间。</p>
        </section>
        <section class="curve-scada-panel curve-alert-panel">
          <div class="scada-panel-head"><div><span class="panel-code">ALARM CENTER</span><h3>预测与状态提醒</h3></div><span class="panel-live">{{ analysis?.alerts.length ?? 0 }} EVENTS</span></div>
          <p class="scada-panel-note">点击提醒定位并查看判断依据。</p>
          <div class="p-2 space-y-2"><template v-if="analysis"><button v-for="item in analysis.alerts" :key="item.id" class="curve-alert" :class="item.level" @click="openAlert(item)"><span class="alert-led" /><div><strong>{{ item.title }}</strong><p>{{ item.detail }}</p><small>{{ fmt(item.startHour, 2) }} h · {{ item.zone ?? '整窑' }}</small></div></button></template><p v-else class="curve-empty">选择模型并完成试算后展示提醒。</p></div>
        </section>
        <section v-if="selectedAlert && analysis" class="curve-scada-panel xl:col-span-2">
          <div class="scada-panel-head"><div><span class="panel-code">EVENT DETAIL</span><h3>{{ selectedAlert.title }}</h3></div><span class="panel-live">{{ fmt(selectedAlert.startHour, 2) }} h</span></div>
          <div class="p-3 space-y-3"><div class="flex flex-wrap gap-2 text-xs"><span class="curve-tag">{{ result?.cycle.label }}</span><span class="curve-tag">{{ selectedAlert.zone ?? '整窑' }}</span><span class="curve-tag">{{ analysis.selectedModel.name }}</span></div><p class="curve-detail">{{ selectedAlert.detail }}</p><p class="curve-evidence">判断依据：{{ selectedAlert.evidence }}</p><VChart :option="gasOption" style="height: 260px" autoresize /><button class="curve-back" @click="tab = 'board'">返回本次看板</button></div>
        </section>
      </div>
      <details class="rounded-lg border border-border p-4">
        <summary class="text-sm cursor-pointer">已保存的 AI 看板与试算快照（{{ runs.length }}）</summary>
        <p v-if="historyError" class="text-xs text-iron mt-3">{{ historyError }}</p>
        <p v-else-if="!runs.length" class="text-xs text-muted-foreground mt-3">成功生成 AI 看板后自动保存，可随时回看当时的数据、模型与参数。</p>
        <div v-for="run in runs" :key="run.id" class="flex items-center justify-between gap-3 border-t border-border mt-3 pt-3"><div><div class="text-sm">{{ run.title }}</div><div class="text-xs text-muted-foreground mt-1">{{ when(run.createdAt) }} · {{ run.request.selectedModel }} · {{ fmt(run.request.cursorHour, 2) }} h</div></div><button class="secondary-button shrink-0" :disabled="busy" @click="restoreRun(run)">查看快照</button></div>
      </details>
    </template>

    <div v-if="selectedZone && analysis" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" @click.self="selectedZone = null" @keydown.esc="selectedZone = null">
      <section role="dialog" aria-modal="true" :aria-label="selectedZone + '工况详情'" class="rounded-lg border border-border bg-background max-w-lg w-full p-5 space-y-4">
        <div class="flex justify-between"><h2 class="font-medium">{{ selectedZone }} · 当前工况</h2><button aria-label="关闭详情" @click="selectedZone = null"><X class="size-5" /></button></div>
        <div class="text-xs text-muted-foreground">{{ result?.cycle.label }} · {{ fmt(analysis.cursorHour, 2) }} h · {{ analysis.selectedModel.name }}</div>
        <div v-for="zone in analysis.current.zones.filter((z) => z.name === selectedZone)" :key="zone.name" class="grid grid-cols-2 gap-4 text-sm"><div>温度 {{ fmt(zone.temp, 0) }} ℃</div><div>燃气 {{ fmt(zone.gas) }} Nm³/h</div><div>助燃风 {{ fmt(zone.air) }} Nm³/h</div><div>阀位 {{ fmt(zone.valve) }}%</div></div>
        <p class="text-xs text-muted-foreground">以上为上传数据中的当前状态；预测耗气目前按整窑计算。</p>
        <button v-for="alert in analysis.alerts.filter((a) => a.zone === selectedZone)" :key="alert.id" class="alert-button w-full" @click="openAlert(alert)">{{ alert.title }}：{{ alert.detail }} · 查看依据</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";
.field { @apply h-9 rounded-md border border-border bg-background px-2 text-xs min-w-0 disabled:opacity-50; }
.label { @apply flex flex-col gap-1.5 text-xs; }
.label > span { @apply text-muted-foreground; }
.primary-button { @apply min-h-9 px-4 py-2 rounded-md bg-iron text-white text-xs inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed; }
.secondary-button { @apply min-h-9 px-3 py-2 rounded-md border border-border text-xs inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed; }
.active-tab { @apply bg-iron text-white border-iron; }
.workflow-step { @apply rounded-md border border-border p-3 flex gap-3 items-center text-muted-foreground; }
.workflow-step span { @apply text-iron font-medium; }
.model-card { @apply rounded-lg border border-border p-4 bg-background; }
.model-card.chosen { @apply border-iron ring-1 ring-iron; }
.model-card.unavailable { @apply opacity-60; }
.alert-button { @apply rounded-md border border-border p-3 text-left; }
.alert-button.medium { @apply border-sulfur/40 bg-sulfur/5; }
.alert-button.high { @apply border-iron/40 bg-iron/5; }
.industrial-dashboard { background: #0b1724; color: #dcecf3; border: 1px solid #24465d; border-radius: 10px; padding: 18px; overflow: hidden; }
.industrial-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 1px solid #24465d; padding: 4px 4px 16px; }
.industrial-kicker, .panel-code { color: #62c6d5; font: 10px/1.2 'JetBrains Mono', monospace; letter-spacing: .12em; }
.industrial-header h2 { margin: 6px 0 4px; color: #eefbff; font-size: 22px; font-weight: 600; letter-spacing: .02em; }
.industrial-header p { color: #8eacba; font-size: 12px; }
.industrial-status { min-width: 145px; padding: 10px 12px; border: 1px solid #2d6672; background: #102735; color: #a7e8e8; font-size: 12px; text-align: right; }
.industrial-status small { display: block; color: #7193a2; margin-top: 5px; font-size: 10px; }
.status-dot { display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 999px; background: #52d3ae; box-shadow: 0 0 10px #52d3ae; }
.industrial-strip { display: flex; flex-wrap: wrap; gap: 8px 22px; border-bottom: 1px solid #19364b; padding: 10px 4px; color: #88a8b8; font: 11px 'JetBrains Mono', monospace; }
.industrial-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 12px 0; }
.industrial-kpi { border-left: 3px solid #3ab6c6; background: #102638; padding: 12px 14px; }
.industrial-kpi span, .industrial-kpi small { display: block; color: #87a5b3; font-size: 11px; }
.industrial-kpi strong { display: block; margin: 5px 0 3px; color: #e8fbff; font: 24px 'JetBrains Mono', monospace; }
.industrial-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.scada-panel, .scada-alerts, .scada-analysis { min-width: 0; border: 1px solid #25495f; background: #0f2233; padding: 14px; }
.scada-wide { grid-column: 1 / -1; }
.scada-panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.scada-panel-head h3 { margin-top: 4px; color: #e5f7fb; font-size: 14px; font-weight: 600; }
.panel-live { color: #58d2c2; font: 10px 'JetBrains Mono', monospace; white-space: nowrap; }
.scada-panel-note { margin: 6px 0 8px; color: #7896a5; font-size: 11px; }
.scada-controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 2px; }
.temperature-controls label { display: inline-flex; align-items: center; gap: 5px; color: #86a7b5; font: 10px 'JetBrains Mono', monospace; }
.temperature-controls select, .temperature-controls input, .temperature-controls button { height: 26px; border: 1px solid #2d5b70; background: #102b3d; color: #d9eef2; padding: 0 7px; font-size: 11px; }
.temperature-controls input { width: 72px; font-family: 'JetBrains Mono', monospace; }
.temperature-controls button { cursor: pointer; color: #74d5d5; }
.light-controls { align-items: center; margin-bottom: 10px; }
.light-controls label { color: #657f8c; font-size: 11px; }
.light-controls select, .light-controls input, .light-controls button { height: 30px; border: 1px solid #d6e2f0; background: #fff; color: #263d48; padding: 0 8px; font-size: 11px; }
.scada-chart { height: 310px; width: 100%; }
.scada-chart-short { height: 260px; }
.window-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 28px 0 18px; }
.window-grid > div { border: 1px solid #27516a; background: #122b3d; padding: 12px 8px; text-align: center; }
.window-grid span, .window-grid small { display: block; color: #7ea2b2; font: 10px 'JetBrains Mono', monospace; }
.window-grid strong { display: block; color: #f3c96b; font: 20px 'JetBrains Mono', monospace; margin: 10px 0 6px; }
.carbon-readout { display: flex; align-items: baseline; gap: 8px; padding: 26px 8px; }
.carbon-readout strong { color: #f3c96b; font: 30px 'JetBrains Mono', monospace; }
.carbon-readout span { color: #9dc0ca; font-size: 12px; }
.carbon-readout small { display: block; width: 100%; color: #7896a5; font-size: 11px; }
.scada-alerts, .scada-analysis { margin-top: 10px; }
.alert-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 10px; }
.scada-alert { display: flex; gap: 10px; width: 100%; border: 1px solid #294d61; background: #122a3c; padding: 11px; color: #dcecf3; text-align: left; }
.scada-alert:hover { border-color: #58d2c2; background: #15364a; }
.scada-alert strong { font-size: 12px; }
.scada-alert p { margin-top: 4px; color: #a1bac5; font-size: 11px; }
.scada-alert small { display: block; margin-top: 6px; color: #6f94a4; font: 10px 'JetBrains Mono', monospace; }
.alert-led { flex: 0 0 6px; height: 34px; background: #58d2c2; }
.scada-alert.medium .alert-led { background: #f3c96b; }
.scada-alert.high .alert-led { background: #ff6b68; box-shadow: 0 0 9px #ff6b68; }
.insight-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.insight-grid p { border-left: 2px solid #58d2c2; background: #122a3c; padding: 10px 12px; color: #b5d1d9; font-size: 12px; line-height: 1.7; }
.scada-limitations { display: flex; flex-wrap: wrap; gap: 7px 12px; margin-top: 10px; padding: 10px 4px 0; color: #718e9d; font-size: 10px; }
.scada-limitations span:not(.panel-code) { border-left: 1px solid #31556a; padding-left: 8px; }
.curve-scada-panel { min-width: 0; border: 1px solid #25495f; border-radius: 8px; background: #0f2233; color: #dcecf3; padding: 14px; }
.curve-alert-panel { min-height: 420px; }
.curve-footnote, .curve-empty { padding: 0 10px 8px; color: #7896a5; font-size: 11px; }
.curve-alert { display: flex; gap: 10px; width: 100%; border: 1px solid #294d61; background: #122a3c; padding: 11px; color: #dcecf3; text-align: left; }
.curve-alert:hover { border-color: #58d2c2; background: #15364a; }
.curve-alert strong { font-size: 12px; }
.curve-alert p { margin-top: 4px; color: #a1bac5; font-size: 11px; }
.curve-alert small { display: block; margin-top: 6px; color: #6f94a4; font: 10px 'JetBrains Mono', monospace; }
.curve-alert .alert-led { flex: 0 0 6px; height: 34px; background: #58d2c2; }
.curve-alert.medium .alert-led { background: #f3c96b; }
.curve-alert.high .alert-led { background: #ff6b68; box-shadow: 0 0 9px #ff6b68; }
.curve-tag { border: 1px solid #2d5b70; background: #122a3c; color: #8dcad1; padding: 4px 8px; }
.curve-detail { color: #e2f3f5; font-size: 13px; }
.curve-evidence { border-left: 2px solid #58d2c2; padding: 8px 10px; background: #122a3c; color: #9db8c3; font-size: 11px; line-height: 1.7; }
.curve-back { border: 1px solid #2d5b70; background: #122a3c; color: #8ed5d8; padding: 7px 12px; font-size: 11px; cursor: pointer; }
@media (max-width: 900px) {
  .industrial-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .industrial-grid, .alert-grid, .insight-grid { grid-template-columns: 1fr; }
  .scada-wide { grid-column: auto; }
}
</style>
