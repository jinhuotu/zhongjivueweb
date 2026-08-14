<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { FlaskConical, Loader2, FileText, Search, CloudSun, Copy, Download } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import ChatMarkdown from '@/components/ai/ChatMarkdown.vue'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { ApiError } from '@/lib/api'
import {
  searchCastingOrders,
  loadCastingOrderItems,
  streamCastingYieldAnalysis,
  streamCastingYieldDocument,
  type InventoryCandidate,
  type ProcessRow,
  type SaleOrderCandidate,
  type SaleOrderItem,
  type WeatherYieldBlock,
  type YieldAnalysisResult,
} from '@/lib/casting-api'
import { listPrompts, type PromptItem } from '@/lib/prompts-api'

ensureEcharts()

const palette = useChartPalette()

const query = ref('')
const selectedOrderGuid = ref('')
const selectedOrderCode = ref('')
const selectedGuid = ref('')
const analyzing = ref(false)
const generating = ref(false)
const searching = ref(false)
const loadingOrder = ref(false)
const error = ref('')
const toast = ref('')
const result = ref<YieldAnalysisResult | null>(null)
const candidates = ref<InventoryCandidate[]>([])
const orderCandidates = ref<SaleOrderCandidate[]>([])
const orderItems = ref<SaleOrderItem[]>([])
const orderHeader = ref<SaleOrderCandidate | null>(null)
const suggestions = ref<SaleOrderCandidate[]>([])
const showSuggest = ref(false)
const markdown = ref('')
const prompts = ref<PromptItem[]>([])
const analyzedItem = ref<SaleOrderItem | null>(null)
const promptId = ref('')
const copied = ref(false)

const PROGRESS_STEPS = [
  { id: 'match', label: '正在匹配物料' },
  { id: 'mes', label: '正在查库存 / 良率 / 工序' },
  { id: 'weather', label: '正在关联历史气温' },
  { id: 'correlate', label: '正在对照气温与良率' },
  { id: 'document', label: '正在生成文档' },
] as const

const progressStep = ref('')
const progressLabel = ref('')

const busy = computed(() => analyzing.value || generating.value || loadingOrder.value)
const showProgress = computed(() => busy.value && !!progressStep.value)
const visibleSteps = computed(() =>
  generating.value ? PROGRESS_STEPS : PROGRESS_STEPS.filter((s) => s.id !== 'document'),
)

const bestYieldText = computed(() => {
  const combo = result.value?.comboYield?.bestCombo?.yieldRate
  if (typeof combo === 'number') return `${(combo * 100).toFixed(1)}%`
  const rate = result.value?.bestLine?.yieldRate
  if (typeof rate !== 'number') return '—'
  return `${(rate * 100).toFixed(1)}%`
})

const bestYieldLabel = computed(() =>
  result.value?.comboYield?.bestCombo ? '组合最优良率' : '班组最优良率',
)

type WeatherStageBlock = {
  label?: string
  dayCount?: number
  tempMeanAvgC?: number | null
  tempMeanMinC?: number | null
  tempMeanMaxC?: number | null
  display?: string
  days?: Array<{ date?: string; tempMeanC?: number | null; tempMaxC?: number | null; tempMinC?: number | null }>
  daysTruncated?: number
}

const PROCESS_GROUP_DEFS = [
  { id: 'sand_ops', label: '砂型作业', stages: ['sand', 'sand_build', 'sand_paste'] },
  {
    id: 'cast_ops',
    label: '熔铸作业',
    stages: ['furnace', 'casting_plan', 'inbox', 'casting', 'outbox', 'first_inspect'],
  },
  {
    id: 'machine_ops',
    label: '加工作业',
    stages: [
      'cut_riser',
      'modify',
      'cut_inspect',
      'machining_daily',
      'machining_task',
      'second_inspect',
      'scrap',
      'final_inspect',
    ],
  },
] as const

const STAGE_LABELS: Record<string, string> = {
  sand: '砂型班计划',
  sand_build: '打型任务',
  sand_paste: '粘型任务',
  furnace: '电炉计划',
  casting_plan: '浇铸计划',
  inbox: '组型任务',
  casting: '浇铸任务',
  outbox: '出箱任务',
  first_inspect: '一检',
  cut_riser: '切冒计划',
  modify: '改型计划',
  cut_inspect: '切检',
  machining_daily: '加工日计划',
  machining_task: '加工任务',
  second_inspect: '二检',
  scrap: '实物报废',
  final_inspect: '终检',
}

const PROCESS_STAGE_ORDER = PROCESS_GROUP_DEFS.flatMap((g) => [...g.stages]) as string[]

type ProcessStageView = {
  key: string
  label: string
  rows: ProcessRow[]
  truncated: number
}

type ProcessGroupView = {
  id: string
  label: string
  rowCount: number
  stages: ProcessStageView[]
}

const weatherStages = computed(() => {
  const stages = (result.value?.weatherSummary as { stages?: Record<string, WeatherStageBlock> } | null)?.stages
  if (!stages) return [] as Array<{ key: string; block: WeatherStageBlock }>
  const keys = [
    ...PROCESS_STAGE_ORDER.filter((k) => stages[k]),
    ...Object.keys(stages).filter((k) => !PROCESS_STAGE_ORDER.includes(k)),
  ]
  return keys.map((key) => ({ key, block: stages[key] }))
})

const weatherLocationText = computed(() => {
  const loc = (
    result.value?.weatherSummary as {
      location?: { name?: string; latitude?: number; longitude?: number; source?: string }
    } | null
  )?.location
  if (!loc) return ''
  const name = loc.name || '厂区'
  const src = loc.source === 'mcp' ? '天气工具配置' : loc.source === 'env' ? '环境变量' : ''
  const coord =
    loc.latitude != null && loc.longitude != null ? `（${loc.latitude}, ${loc.longitude}）` : ''
  return src ? `${name}${coord} · ${src}` : `${name}${coord}`
})

const processGroups = computed((): ProcessGroupView[] => {
  const stages = result.value?.processSummary?.stages || {}
  if (!Object.keys(stages).length) return []
  const defs = result.value?.processSummary?.groups?.length
    ? result.value.processSummary.groups.map((g) => ({
        id: g.id || '',
        label: g.label || '',
        stages: g.stages || [],
      }))
    : PROCESS_GROUP_DEFS.map((g) => ({ id: g.id, label: g.label, stages: [...g.stages] }))
  return defs.map((g) => {
    const stageViews: ProcessStageView[] = (g.stages || []).map((key) => ({
      key,
      label: stages[key]?.label || STAGE_LABELS[key] || key,
      rows: (stages[key]?.rows || []) as ProcessRow[],
      truncated: stages[key]?.rowsTruncated || 0,
    }))
    return {
      id: g.id,
      label: g.label,
      rowCount: stageViews.reduce((n, s) => n + s.rows.length, 0),
      stages: stageViews,
    }
  })
})

const FURNACE_TMP_COLORS: Record<string, [string, string]> = {
  A: ['#2563eb', '#38bdf8'],
  B: ['#dc2626', '#fb923c'],
  C: ['#16a34a', '#4ade80'],
}

type HeatHover = {
  left: number
  top: number
  heat: string
  date: string
  furnace: string
  shift: string
}

const heatHover = ref<HeatHover | null>(null)

function onPlanHeatEnter(ev: MouseEvent, row: ProcessRow) {
  const heat = String(row.monthFurnaceNo || '').trim()
  if (!heat) {
    heatHover.value = null
    return
  }
  const el = ev.currentTarget as HTMLElement
  const box = el.getBoundingClientRect()
  const width = 340
  heatHover.value = {
    left: Math.min(Math.max(8, box.left), window.innerWidth - width - 8),
    top: Math.min(box.bottom + 6, window.innerHeight - 280),
    heat,
    date: String(row.processDate || '').slice(0, 10),
    furnace: String(row.furnaceName || row.areaName || '').trim(),
    shift: String(row.lineName || '').trim(),
  }
}

function onPlanHeatLeave() {
  heatHover.value = null
}

function numRange(nums: number[], unit: string) {
  if (!nums.length) return '—'
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  if (min === max) return `${min}${unit}`
  return `${min}~${max}${unit}`
}

const heatHoverDetail = computed(() => {
  const h = heatHover.value
  if (!h) return null
  const casting = (result.value?.processSummary?.stages?.casting?.rows || []) as ProcessRow[]
  const tempRows = casting.filter((r) => String(r.monthFurnaceNo || '').trim() === h.heat)
  const furnaceTemps = tempRows
    .map((r) => r.furnaceTmpAvg)
    .filter((x): x is number => typeof x === 'number')
  const castingTemps = tempRows
    .map((r) => r.castingTmpAvg)
    .filter((x): x is number => typeof x === 'number')
  const points = (result.value?.smeltElectrical?.points || []).filter((p) => {
    const day = String(p.produceDate || '').slice(0, 10)
    const furnace = String(p.furnaceName || '').trim()
    return day === h.date && (!h.furnace || furnace === h.furnace)
  })
  const volts = points.map((p) => p.voltage).filter((x): x is number => typeof x === 'number')
  const amps = points.map((p) => p.currentA).filter((x): x is number => typeof x === 'number')
  return {
    heat: h.heat,
    date: h.date,
    furnace: h.furnace || '—',
    shift: h.shift || '—',
    boxCount: tempRows.length,
    furnaceTempText: numRange(furnaceTemps, '℃'),
    castingTempText: numRange(castingTemps, '℃'),
    voltText: numRange(volts, 'V'),
    ampText: numRange(amps, 'A'),
    pointCount: points.length,
    points,
  }
})

const heatHoverChartOption = computed<EChartsOption | null>(() => {
  const d = heatHoverDetail.value
  if (!d?.points.length) return null
  const p = palette.value
  const pair = FURNACE_TMP_COLORS[d.furnace] || ['#64748b', '#94a3b8']
  const voltage: Array<[string, number]> = []
  const current: Array<[string, number]> = []
  for (const pt of d.points) {
    const at = String(pt.at || '')
    if (!at) continue
    if (typeof pt.voltage === 'number') voltage.push([at, pt.voltage])
    if (typeof pt.currentA === 'number') current.push([at, pt.currentA])
  }
  if (!voltage.length && !current.length) return null
  const series: EChartsOption['series'] = []
  if (voltage.length) {
    series.push({
      name: '电压',
      type: 'line',
      yAxisIndex: 0,
      showSymbol: voltage.length < 24,
      symbolSize: 5,
      lineStyle: { width: 1.5, color: pair[0] },
      itemStyle: { color: pair[0] },
      data: voltage,
    })
  }
  if (current.length) {
    series.push({
      name: '电流A',
      type: 'line',
      yAxisIndex: 1,
      showSymbol: current.length < 24,
      symbolSize: 5,
      lineStyle: { width: 1.5, color: pair[1], type: 'dashed' },
      itemStyle: { color: pair[1] },
      data: current,
    })
  }
  return {
    animation: false,
    grid: { left: 36, right: 36, top: 22, bottom: 22, containLabel: false },
    legend: { top: 0, textStyle: { color: p.legend, fontSize: 10 } },
    tooltip: { ...tooltipBase(p), trigger: 'axis' },
    xAxis: {
      type: 'time',
      axisTick: { show: false },
      axisLine: { lineStyle: { color: p.grid } },
      axisLabel: { color: p.axis, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: 'V',
        nameTextStyle: { color: p.axis, fontSize: 9 },
        axisTick: { show: false },
        axisLabel: { color: p.axis, fontSize: 9 },
        splitLine: { lineStyle: { color: p.grid, type: 'dashed' } },
      },
      {
        type: 'value',
        name: 'A',
        nameTextStyle: { color: p.axis, fontSize: 9 },
        axisTick: { show: false },
        axisLabel: { color: p.axis, fontSize: 9 },
        splitLine: { show: false },
      },
    ],
    series,
  }
})

function stageTableKind(
  key: string,
): 'sand' | 'sandMaking' | 'count' | 'furnace' | 'castingPlan' | 'inbox' | 'outbox' | 'casting' | 'inspect' {
  if (key === 'sand') return 'sand'
  if (key === 'sand_build' || key === 'sand_paste') return 'sandMaking'
  if (key === 'furnace') return 'furnace'
  if (key === 'casting_plan') return 'castingPlan'
  if (key === 'inbox') return 'inbox'
  if (key === 'outbox') return 'outbox'
  if (key === 'casting') return 'casting'
  if (
    key === 'cut_riser' ||
    key === 'modify' ||
    key === 'machining_daily' ||
    key === 'machining_task'
  ) {
    return 'count'
  }
  return 'inspect'
}

function countCodeLabel(row: ProcessRow) {
  return row.samplePlanCode || row.sampleObjectCode || row.areaName || '—'
}

const showRawContextSource = ref(false)
const expandedWeatherStages = ref<Record<string, boolean>>({})

function toggleWeatherStage(key: string) {
  expandedWeatherStages.value = {
    ...expandedWeatherStages.value,
    [key]: !expandedWeatherStages.value[key],
  }
}

function fmtTemp(v?: number | null) {
  if (typeof v !== 'number') return '—'
  return `${v}℃`
}

function fmtRate(rate?: number | null) {
  if (typeof rate !== 'number') return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function fmtNum(v?: number | string | null) {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

function buildOrderContext(item?: SaleOrderItem | null) {
  const it = item || analyzedItem.value
  if (!it && !selectedOrderCode.value && !orderHeader.value) return undefined
  return {
    saleOrderCode: selectedOrderCode.value || it?.saleOrderCode || orderHeader.value?.saleOrderCode || '',
    saleOrderGuid: selectedOrderGuid.value || it?.saleOrderGuid || orderHeader.value?.saleOrderGuid || '',
    saleOrderDate: orderHeader.value?.saleOrderDate || it?.saleOrderDate || '',
    inventoryGuid: it?.inventoryGuid || selectedGuid.value,
    code: it?.code,
    name: it?.name,
    spec: it?.spec,
    materialName: it?.materialName,
    position: it?.position,
    billOrderQty: it?.billOrderQty,
    scheduOrderQty: it?.scheduOrderQty,
    workingQty: it?.workingQty,
    stockQty: it?.stockQty,
    mpsingQty: it?.mpsingQty,
  }
}

function analyzePayload(item?: SaleOrderItem | null) {
  const body: { inventoryGuid: string; orderContext?: ReturnType<typeof buildOrderContext> } = {
    inventoryGuid: selectedGuid.value.trim(),
  }
  const orderContext = buildOrderContext(item)
  if (orderContext) body.orderContext = orderContext
  return body
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchAbort: AbortController | null = null

function scheduleSuggest() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void loadSuggestions()
  }, 380)
}

async function loadSuggestions() {
  const q = query.value.trim()
  if (selectedOrderGuid.value || q.length < 1 || busy.value) {
    suggestions.value = []
    showSuggest.value = false
    return
  }
  searchAbort?.abort()
  searchAbort = new AbortController()
  searching.value = true
  try {
    const data = await searchCastingOrders({ query: q, top: 12, signal: searchAbort.signal })
    suggestions.value = data.items || []
    showSuggest.value = suggestions.value.length > 0
  } catch {
    suggestions.value = []
    showSuggest.value = false
  } finally {
    searching.value = false
  }
}

async function loadOptions() {
  try {
    prompts.value = (await listPrompts()) || []
    const docPrompt = prompts.value.find((p) => p.name === '铸造同型号良率最优文档')
    const castingPrompt = docPrompt || prompts.value.find((p) => p.name.includes('铸造同型号良率最优文档'))
    if (castingPrompt) promptId.value = castingPrompt.id
  } catch {
    /* 选项失败不阻塞主流程 */
  }
}

function applyResult(data: YieldAnalysisResult, kind: 'analyze' | 'generate') {
  expandedWeatherStages.value = {}
  showRawContextSource.value = false
  if (kind === 'generate') markdown.value = data.markdown || ''
  else markdown.value = ''

  if (data.needSelect && data.candidates?.length) {
    candidates.value = data.candidates
    selectedGuid.value = ''
    toast.value = data.message || '请从候选中选择物料'
    if (kind === 'generate') markdown.value = ''
    result.value = data
    return
  }
  if (!data.found) {
    candidates.value = []
    toast.value = data.message || '未找到物料档案'
    result.value = data
    return
  }

  candidates.value = []
  selectedGuid.value = data.inventoryGuid || selectedGuid.value
  // 生成文档会复用上次分析；不要用精简 payload 把表格冲掉
  if (kind === 'generate' && result.value?.found && result.value.inventoryGuid === data.inventoryGuid) {
    result.value = {
      ...result.value,
      markdown: data.markdown,
      fileExport: data.fileExport,
      warnings: data.warnings?.length ? data.warnings : result.value.warnings,
    }
  } else {
    result.value = data
  }

  if (kind === 'analyze') toast.value = '分析完成'
  else {
    const parts: string[] = []
    if (data.fileExport?.ok && data.fileExport.path) parts.push(`已写入本地：${data.fileExport.path}`)
    else if (data.fileExport && !data.fileExport.ok) {
      parts.push(`本地写入失败：${data.fileExport.error || '未知错误'}`)
    }
    toast.value = parts.length ? parts.join('；') : '文档已生成'
  }
}

function onProgress(p: { step?: string; label?: string }) {
  if (p.step) progressStep.value = p.step
  if (p.label) progressLabel.value = p.label
}

async function applyOrderItems(data: {
  found: boolean
  message: string
  order: SaleOrderCandidate | null
  items: SaleOrderItem[]
}) {
  orderCandidates.value = []
  if (!data.found) {
    orderItems.value = []
    orderHeader.value = null
    error.value = data.message || '没有该订单编号的订货清单'
    return
  }
  orderHeader.value = data.order
  orderItems.value = data.items || []
  selectedOrderGuid.value = data.order?.saleOrderGuid || selectedOrderGuid.value
  selectedOrderCode.value = data.order?.saleOrderCode || selectedOrderCode.value
  query.value = selectedOrderCode.value || query.value
  toast.value = data.message
}

async function fetchOrderItems(input: { saleOrderGuid?: string; saleOrderCode?: string }) {
  error.value = ''
  toast.value = ''
  markdown.value = ''
  result.value = null
  selectedGuid.value = ''
  analyzedItem.value = null
  candidates.value = []
  showSuggest.value = false
  loadingOrder.value = true
  try {
    const data = await loadCastingOrderItems(input)
    await applyOrderItems(data)
  } catch (e) {
    orderItems.value = []
    orderHeader.value = null
    error.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : '查询订单失败'
  } finally {
    loadingOrder.value = false
  }
}

async function onQueryOrder() {
  const q = query.value.trim()
  if (!q && !selectedOrderGuid.value) {
    error.value = '请输入订单编号'
    return
  }
  if (selectedOrderGuid.value) {
    await fetchOrderItems({ saleOrderGuid: selectedOrderGuid.value })
    return
  }
  loadingOrder.value = true
  error.value = ''
  toast.value = ''
  showSuggest.value = false
  try {
    const data = await searchCastingOrders({ query: q, top: 20 })
    const items = data.items || []
    const exact = items.filter((it) => (it.saleOrderCode || '').toLowerCase() === q.toLowerCase())
    const pick = exact.length === 1 ? exact[0] : items.length === 1 ? items[0] : null
    if (pick) {
      selectedOrderGuid.value = pick.saleOrderGuid
      selectedOrderCode.value = pick.saleOrderCode || q
      await fetchOrderItems({ saleOrderGuid: pick.saleOrderGuid })
      return
    }
    if (!items.length) {
      orderItems.value = []
      orderHeader.value = null
      orderCandidates.value = []
      error.value = '没有该订单编号'
      return
    }
    orderCandidates.value = items
    orderItems.value = []
    orderHeader.value = null
    toast.value = '匹配到多个订单，请选择'
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : '查询订单失败'
  } finally {
    loadingOrder.value = false
  }
}

async function onSelectOrder(item: SaleOrderCandidate) {
  selectedOrderGuid.value = item.saleOrderGuid
  selectedOrderCode.value = item.saleOrderCode || ''
  query.value = item.saleOrderCode || item.saleOrderGuid
  suggestions.value = []
  showSuggest.value = false
  orderCandidates.value = []
  await fetchOrderItems({ saleOrderGuid: item.saleOrderGuid })
}

async function onSelectCandidate(item: InventoryCandidate) {
  await onAnalyzeItem({
    inventoryGuid: item.inventoryGuid,
    saleOrderGuid: selectedOrderGuid.value,
    saleOrderCode: selectedOrderCode.value,
    code: item.code,
    name: item.name,
    spec: item.spec,
  })
}

async function onAnalyzeItem(item: SaleOrderItem) {
  error.value = ''
  toast.value = ''
  markdown.value = ''
  candidates.value = []
  showSuggest.value = false
  if (!item.inventoryGuid) {
    error.value = '该行没有物料 GUID，无法分析'
    return
  }
  selectedGuid.value = item.inventoryGuid
  analyzedItem.value = item
  analyzing.value = true
  progressStep.value = 'match'
  progressLabel.value = '正在匹配物料'
  try {
    const data = await streamCastingYieldAnalysis(analyzePayload(item), { onProgress })
    applyResult(data, 'analyze')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : '分析失败'
    result.value = null
  } finally {
    analyzing.value = false
    progressStep.value = ''
    progressLabel.value = ''
  }
}

async function onGenerate() {
  error.value = ''
  toast.value = ''
  showSuggest.value = false
  if (!result.value?.found || !result.value.inventoryGuid) {
    error.value = '请先点订货清单中的「分析」，再导出文档'
    return
  }
  if (!result.value.rawContext?.trim()) {
    error.value = '当前分析结果缺少上下文，请重新点「分析」后再导出'
    return
  }
  generating.value = true
  progressStep.value = 'document'
  progressLabel.value = '正在生成文档'
  try {
    const data = await streamCastingYieldDocument(
      {
        ...analyzePayload(),
        promptId: promptId.value || null,
        rawContext: result.value.rawContext,
        inventory: result.value.inventory,
        orderContext: buildOrderContext(),
        insights: result.value.insights,
      },
      { onProgress },
    )
    applyResult(data, 'generate')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : '生成失败'
  } finally {
    generating.value = false
    progressStep.value = ''
    progressLabel.value = ''
  }
}

async function copyMarkdown() {
  if (!markdown.value) return
  try {
    await navigator.clipboard.writeText(markdown.value)
    copied.value = true
    toast.value = '文档已复制'
    setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    error.value = '复制失败，请手动选择文档内容'
  }
}

function downloadMarkdown() {
  if (!markdown.value) return
  const name = result.value?.inventory?.name || result.value?.inventory?.code || '良率分析'
  const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}_良率分析.md`
  a.click()
  URL.revokeObjectURL(url)
  toast.value = '已开始下载'
}

function stepState(id: string) {
  const ids = visibleSteps.value.map((s) => s.id)
  const cur = ids.indexOf(progressStep.value)
  const idx = ids.indexOf(id)
  if (cur < 0) return 'idle'
  if (idx < cur) return 'done'
  if (idx === cur) return 'active'
  return 'idle'
}

watch(query, () => {
  scheduleSuggest()
})

onMounted(() => {
  void loadOptions()
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  searchAbort?.abort()
})
</script>

<template>
  <div class="h-full overflow-auto p-4 md:p-6 space-y-4">
    <div class="flex items-start gap-3">
      <div class="h-10 w-10 rounded-lg bg-iron/15 border border-iron/30 flex items-center justify-center">
        <FlaskConical class="h-5 w-5 text-iron" />
      </div>
      <div>
        <h1 class="text-lg font-semibold tracking-tight">铸造同型号良率分析</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          输入订单编号查看订货清单，再点某一物料分析同型号生产与良率；分析完成后可导出文档
        </p>
      </div>
    </div>

    <Panel class="p-4 space-y-3">
      <label class="block text-xs text-muted-foreground">订单编号</label>
      <div class="relative">
        <input
          v-model="query"
          class="w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
          placeholder="例如 25120311"
          autocomplete="off"
          @input="selectedOrderGuid = ''; selectedOrderCode = ''"
          @focus="showSuggest = suggestions.length > 0"
          @keydown.enter.prevent="onQueryOrder"
          @keydown.esc="showSuggest = false"
        />
        <div
          v-if="showSuggest && suggestions.length"
          class="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-background shadow-lg"
        >
          <button
            v-for="item in suggestions"
            :key="item.saleOrderGuid"
            type="button"
            class="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border/60 last:border-0"
            :disabled="busy"
            @mousedown.prevent="onSelectOrder(item)"
          >
            <div class="font-medium font-mono">{{ item.saleOrderCode || '—' }}</div>
            <div class="text-[11px] text-muted-foreground">
              {{ item.saleOrderDate || '无日期' }}
            </div>
          </button>
        </div>
        <p v-if="searching" class="absolute right-2 top-2 text-[11px] text-muted-foreground">检索中…</p>
      </div>
      <p v-if="selectedOrderCode" class="text-[11px] text-muted-foreground font-mono">
        已选定订单：{{ selectedOrderCode }}
      </p>

      <div class="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          class="h-9 px-4 inline-flex items-center gap-1.5 rounded-md bg-background border border-border text-sm hover:bg-muted/40 disabled:opacity-50"
          :disabled="busy"
          @click="onQueryOrder"
        >
          <Loader2 v-if="loadingOrder" class="h-4 w-4 animate-spin" />
          <Search v-else class="h-4 w-4" />
          查询订单
        </button>
      </div>

      <div v-if="showProgress" class="rounded-md border border-border bg-muted/20 p-3 space-y-2">
        <div class="text-xs font-medium">{{ progressLabel || '处理中…' }}</div>
        <ol class="space-y-1.5">
          <li
            v-for="s in visibleSteps"
            :key="s.id"
            class="flex items-center gap-2 text-xs"
            :class="
              stepState(s.id) === 'active'
                ? 'text-foreground'
                : stepState(s.id) === 'done'
                  ? 'text-patina'
                  : 'text-muted-foreground'
            "
          >
            <Loader2 v-if="stepState(s.id) === 'active'" class="h-3.5 w-3.5 animate-spin" />
            <span
              v-else
              class="inline-block h-2 w-2 rounded-full"
              :class="stepState(s.id) === 'done' ? 'bg-patina' : 'bg-border'"
            />
            {{ s.label }}
          </li>
        </ol>
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <p v-else-if="toast" class="text-sm text-patina">{{ toast }}</p>
    </Panel>

    <Panel
      v-if="!orderHeader && !orderItems.length && !orderCandidates.length && !result && !candidates.length && !busy"
      class="p-6 text-sm text-muted-foreground space-y-2"
    >
      <div class="text-foreground font-medium">输入订单编号后点「查询订单」</div>
      <p>1. 输入订单编号，下方会边打边出候选，点选即可带出订货清单。</p>
      <p>2. 清单列出本单全部物料（编码 / 名称 / 规格 / 材质 / 合同数量 / 计划数量）。</p>
      <p>3. 点某一行「分析」，再查该型号历史库存、良率、工序和厂区气温。</p>
      <p>4. 分析完成后再点「导出文档」，会按本页数据生成 Markdown 并写入本机导出目录。</p>
    </Panel>

    <Panel v-if="orderCandidates.length" class="p-4 space-y-3">
      <div class="text-sm font-medium">匹配到多个订单，请选择</div>
      <div class="overflow-auto rounded-md border border-border">
        <table class="w-full text-sm">
          <thead class="bg-muted/30 text-left text-xs text-muted-foreground">
            <tr>
              <th class="px-3 py-2">订单编号</th>
              <th class="px-3 py-2">日期</th>
              <th class="px-3 py-2 w-[7.5rem] whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in orderCandidates" :key="item.saleOrderGuid" class="border-t border-border">
              <td class="px-3 py-2 font-mono text-xs">{{ item.saleOrderCode || '—' }}</td>
              <td class="px-3 py-2">{{ item.saleOrderDate || '—' }}</td>
              <td class="px-3 py-2 whitespace-nowrap">
                <button
                  type="button"
                  class="inline-flex h-8 items-center justify-center whitespace-nowrap rounded border border-border px-3 text-xs hover:bg-muted/40 disabled:opacity-50"
                  :disabled="busy"
                  @click="onSelectOrder(item)"
                >
                  查看清单
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel v-if="orderHeader" class="p-4 space-y-3">
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <span class="px-2 py-0.5 rounded border text-xs border-patina/40 bg-patina/10 text-patina">订货清单</span>
        <span class="font-mono text-xs">{{ orderHeader.saleOrderCode }}</span>
        <span class="text-muted-foreground text-xs">{{ orderHeader.saleOrderDate || '' }}</span>
        <span class="text-muted-foreground text-xs">{{ orderItems.length }} 种物料</span>
      </div>
      <div class="overflow-auto rounded-md border border-border">
        <table class="w-full text-sm">
          <thead class="bg-muted/30 text-left text-xs text-muted-foreground">
            <tr>
              <th class="px-3 py-2">物料编码</th>
              <th class="px-3 py-2">物料名称</th>
              <th class="px-3 py-2">规格型号</th>
              <th class="px-3 py-2">材质</th>
              <th class="px-3 py-2">部位</th>
              <th class="px-3 py-2">合同数量</th>
              <th class="px-3 py-2">计划数量</th>
              <th class="px-3 py-2">在制</th>
              <th class="px-3 py-2">库存</th>
              <th class="px-3 py-2">已排产</th>
              <th class="px-3 py-2 w-[6rem] whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in orderItems"
              :key="`${item.inventoryGuid}-${item.itemIndex}`"
              class="border-t border-border"
              :class="selectedGuid === item.inventoryGuid ? 'bg-muted/40' : ''"
            >
              <td class="px-3 py-2 font-mono text-xs">{{ item.code || '—' }}</td>
              <td class="px-3 py-2">{{ item.name || '—' }}</td>
              <td class="px-3 py-2 text-xs text-muted-foreground">{{ item.spec || '—' }}</td>
              <td class="px-3 py-2">{{ item.materialName || '—' }}</td>
              <td class="px-3 py-2">{{ item.position || '—' }}</td>
              <td class="px-3 py-2">{{ fmtNum(item.billOrderQty) }}</td>
              <td class="px-3 py-2">{{ fmtNum(item.scheduOrderQty) }}</td>
              <td class="px-3 py-2">{{ fmtNum(item.workingQty) }}</td>
              <td class="px-3 py-2">{{ fmtNum(item.stockQty) }}</td>
              <td class="px-3 py-2">{{ fmtNum(item.mpsingQty) }}</td>
              <td class="px-3 py-2 whitespace-nowrap">
                <button
                  type="button"
                  class="inline-flex h-8 items-center justify-center whitespace-nowrap rounded border border-border px-3 text-xs hover:bg-muted/40 disabled:opacity-50"
                  :disabled="busy"
                  @click="onAnalyzeItem(item)"
                >
                  <Loader2 v-if="analyzing && selectedGuid === item.inventoryGuid" class="h-3.5 w-3.5 animate-spin mr-1" />
                  分析
                </button>
              </td>
            </tr>
            <tr v-if="!orderItems.length">
              <td colspan="11" class="px-3 py-3 text-center text-muted-foreground">该订单没有物料行</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel v-if="candidates.length" class="p-4 space-y-3">
      <div class="text-sm font-medium">匹配到多个物料，请选择</div>
      <div class="overflow-auto rounded-md border border-border">
        <table class="w-full text-sm">
          <thead class="bg-muted/30 text-left text-xs text-muted-foreground">
            <tr>
              <th class="px-3 py-2">名称</th>
              <th class="px-3 py-2">编码</th>
              <th class="px-3 py-2">规格</th>
              <th class="px-3 py-2">GUID</th>
              <th class="px-3 py-2 w-[7.5rem] whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in candidates" :key="item.inventoryGuid" class="border-t border-border">
              <td class="px-3 py-2">{{ item.name || '—' }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ item.code || '—' }}</td>
              <td class="px-3 py-2 text-xs text-muted-foreground">{{ item.spec || '—' }}</td>
              <td class="px-3 py-2 font-mono text-[11px] text-muted-foreground">{{ item.inventoryGuid }}</td>
              <td class="px-3 py-2 whitespace-nowrap">
                <button
                  type="button"
                  class="inline-flex h-8 items-center justify-center whitespace-nowrap rounded border border-border px-3 text-xs hover:bg-muted/40 disabled:opacity-50"
                  :disabled="busy"
                  @click="onSelectCandidate(item)"
                >
                  分析此物料
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel v-if="result && !result.needSelect" class="p-4 space-y-3">
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <span
          class="px-2 py-0.5 rounded border text-xs"
          :class="result.found ? 'border-patina/40 bg-patina/10 text-patina' : 'border-iron/40 bg-iron/10 text-iron'"
        >
          {{ result.found ? '已找到物料档案' : '未找到' }}
        </span>
        <span v-if="result.inventoryGuid" class="text-muted-foreground font-mono text-xs">{{ result.inventoryGuid }}</span>
        <span v-if="result.found" class="text-muted-foreground">
          {{ bestYieldLabel }} <b class="text-foreground">{{ bestYieldText }}</b>
        </span>
        <button
          v-if="result.found"
          type="button"
          class="ml-auto h-8 px-3 inline-flex items-center gap-1.5 rounded-md bg-iron text-background text-xs hover:bg-iron/90 disabled:opacity-50"
          :disabled="busy"
          @click="onGenerate"
        >
          <Loader2 v-if="generating" class="h-3.5 w-3.5 animate-spin" />
          <FileText v-else class="h-3.5 w-3.5" />
          导出文档
        </button>
      </div>

      <p v-if="!result.found" class="text-sm">{{ result.message }}</p>

      <template v-else>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div class="rounded-md border border-border p-2">
            <div class="text-[11px] text-muted-foreground">物料编码</div>
            <div class="font-medium">{{ result.inventory?.code || '—' }}</div>
          </div>
          <div class="rounded-md border border-border p-2">
            <div class="text-[11px] text-muted-foreground">名称</div>
            <div class="font-medium">{{ result.inventory?.name || '—' }}</div>
          </div>
          <div class="rounded-md border border-border p-2">
            <div class="text-[11px] text-muted-foreground">规格 / 尺寸</div>
            <div class="font-medium">{{ result.inventory?.productSize || result.inventory?.spec || '—' }}</div>
          </div>
          <div class="rounded-md border border-border p-2">
            <div class="text-[11px] text-muted-foreground">最优班组（原口径）</div>
            <div class="font-medium">
              {{ result.bestLine?.lineName || '—' }}
              <span class="text-muted-foreground text-xs">({{ result.bestLine?.lineCode }})</span>
            </div>
          </div>
          <div v-if="result.comboYield?.bestCombo" class="rounded-md border border-patina/40 bg-patina/5 p-2 md:col-span-2">
            <div class="text-[11px] text-muted-foreground">推荐组合（浇铸→二检）</div>
            <div class="font-medium">
              {{ result.comboYield.bestCombo.shiftName || '—' }}
              · 电炉 {{ result.comboYield.bestCombo.furnaceName || '—' }}
              · 月炉次 {{ result.comboYield.bestCombo.monthFurnaceNo || '—' }}
              · 箱 {{ result.comboYield.bestCombo.boxNo || '—' }}
            </div>
            <div class="text-[11px] text-muted-foreground mt-0.5">
              良率 {{ fmtRate(result.comboYield.bestCombo.yieldRate) }}
              · 投入 {{ fmtNum(result.comboYield.bestCombo.inputQty) }}
            </div>
          </div>
          <div v-if="result.inventory?.position" class="rounded-md border border-border p-2">
            <div class="text-[11px] text-muted-foreground">部位</div>
            <div class="font-medium">{{ result.inventory.position }}</div>
          </div>
          <div class="rounded-md border border-border p-2">
            <div class="text-[11px] text-muted-foreground">冒口规格</div>
            <div class="font-medium">
              {{ result.inventory?.riser?.spec || '—' }}
              <span class="text-muted-foreground text-xs">{{ result.inventory?.riser?.name }}</span>
            </div>
          </div>
          <div class="rounded-md border border-border p-2">
            <div class="text-[11px] text-muted-foreground">单重 / 体积</div>
            <div class="font-medium">{{ fmtNum(result.inventory?.weightGross) }} / {{ fmtNum(result.inventory?.volume) }}</div>
          </div>
          <div class="rounded-md border border-border p-2">
            <div class="text-[11px] text-muted-foreground">材质 / 浇筑类型</div>
            <div class="font-medium">
              {{ result.inventory?.materialTypeName || result.inventory?.materialTypeGuid || '数据不足' }}
              ·
              {{ result.inventory?.castingTypeName || result.inventory?.castingTypeKey || '数据不足' }}
            </div>
          </div>
        </div>

        <div v-if="result.insights" class="rounded-md border border-patina/40 bg-patina/5 p-3 space-y-3">
          <div class="text-sm font-medium">查询解读（与导出文档结论一致）</div>
          <div v-if="result.insights.summary?.length" class="space-y-1">
            <div class="text-xs font-medium text-muted-foreground">1. 结论摘要</div>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li v-for="(line, i) in result.insights.summary" :key="`sum-${i}`">{{ line }}</li>
            </ul>
          </div>
          <div v-if="result.insights.arrange?.length" class="space-y-1">
            <div class="text-xs font-medium text-muted-foreground">8. 推荐生产安排</div>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li v-for="(line, i) in result.insights.arrange" :key="`arr-${i}`">{{ line }}</li>
            </ul>
          </div>
          <div v-if="result.insights.defects?.length" class="space-y-1">
            <div class="text-xs font-medium text-muted-foreground">9. 主要缺陷与预防</div>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li v-for="(line, i) in result.insights.defects" :key="`def-${i}`">{{ line }}</li>
            </ul>
          </div>
          <div v-if="result.insights.risks?.length" class="space-y-1">
            <div class="text-xs font-medium text-muted-foreground">10. 风险与待确认项</div>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li v-for="(line, i) in result.insights.risks" :key="`risk-${i}`">{{ line }}</li>
            </ul>
          </div>
        </div>

        <div v-if="result.stockSummary" class="rounded-md border border-border p-3 space-y-3">
          <div class="text-sm font-medium">库存（分析前）</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div class="rounded-md bg-muted/20 border border-border/60 p-2">
              <div class="text-[11px] text-muted-foreground">全仓可用合计</div>
              <div class="font-medium text-base">{{ result.stockSummary.allAvailableQty ?? 0 }}</div>
            </div>
            <div class="rounded-md bg-muted/20 border border-border/60 p-2">
              <div class="text-[11px] text-muted-foreground">全仓占用</div>
              <div class="font-medium">{{ result.stockSummary.allLockedQty ?? 0 }}</div>
            </div>
            <div class="rounded-md bg-muted/20 border border-border/60 p-2">
              <div class="text-[11px] text-muted-foreground">全仓在途/预留</div>
              <div class="font-medium">{{ result.stockSummary.allInTransitQty ?? 0 }}</div>
            </div>
            <div class="rounded-md bg-muted/20 border border-border/60 p-2">
              <div class="text-[11px] text-muted-foreground">全仓合计</div>
              <div class="font-medium">{{ result.stockSummary.allTotalQty ?? 0 }}</div>
            </div>
          </div>
          <div class="overflow-auto rounded-md border border-border" v-if="result.stockSummary.allWarehouses?.length">
            <table class="w-full text-sm">
              <thead class="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th class="px-3 py-2">类型</th>
                  <th class="px-3 py-2">仓库</th>
                  <th class="px-3 py-2">编码</th>
                  <th class="px-3 py-2">可用</th>
                  <th class="px-3 py-2">占用</th>
                  <th class="px-3 py-2">在途</th>
                  <th class="px-3 py-2">小计</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(wh, idx) in result.stockSummary.allWarehouses"
                  :key="`all-${idx}`"
                  class="border-t border-border"
                  :class="wh.isFinished ? 'bg-patina/5' : ''"
                >
                  <td class="px-3 py-2 text-xs">{{ wh.category || '其它' }}</td>
                  <td class="px-3 py-2">{{ wh.warehouseName || '—' }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ wh.warehouseCode || '—' }}</td>
                  <td class="px-3 py-2">{{ wh.availableQty ?? 0 }}</td>
                  <td class="px-3 py-2">{{ wh.lockedQty ?? 0 }}</td>
                  <td class="px-3 py-2">{{ wh.inTransitQty ?? 0 }}</td>
                  <td class="px-3 py-2">{{ wh.totalQty ?? 0 }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-[11px] text-muted-foreground">{{ result.stockSummary.note }}</p>
        </div>

        <div v-if="result.comboYield" class="rounded-md border border-border overflow-auto">
          <div class="px-3 py-2 text-sm font-medium bg-muted/30 flex justify-between gap-2">
            <span>组合良率（浇铸任务 → 二检）</span>
            <span class="text-xs font-normal text-muted-foreground">{{ result.comboYield.comboCount || 0 }} 组</span>
          </div>
          <p class="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border">
            {{ result.comboYield.note }}
          </p>
          <table class="w-full text-sm">
            <thead class="text-left text-xs text-muted-foreground">
              <tr>
                <th class="px-3 py-2">班别</th>
                <th class="px-3 py-2">电炉</th>
                <th class="px-3 py-2">月炉次</th>
                <th class="px-3 py-2">箱号</th>
                <th class="px-3 py-2">批次</th>
                <th class="px-3 py-2">投入</th>
                <th class="px-3 py-2">合格</th>
                <th class="px-3 py-2">报废</th>
                <th class="px-3 py-2">良率</th>
                <th class="px-3 py-2">日期</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in result.comboYield.combos || []"
                :key="`combo-${idx}`"
                class="border-t border-border"
                :class="idx === 0 ? 'bg-patina/5' : ''"
              >
                <td class="px-3 py-2">{{ row.shiftName || '—' }}</td>
                <td class="px-3 py-2">{{ row.furnaceName || '—' }}</td>
                <td class="px-3 py-2 font-mono text-xs">{{ row.monthFurnaceNo || '—' }}</td>
                <td class="px-3 py-2">{{ row.boxNo || '—' }}</td>
                <td class="px-3 py-2">{{ fmtNum(row.lotCount) }}</td>
                <td class="px-3 py-2">{{ fmtNum(row.inputQty) }}</td>
                <td class="px-3 py-2">{{ fmtNum(row.passQty) }}</td>
                <td class="px-3 py-2">{{ fmtNum(row.scrapQty) }}</td>
                <td class="px-3 py-2 font-medium">{{ fmtRate(row.yieldRate) }}</td>
                <td class="px-3 py-2 font-mono text-xs">{{ row.dateFrom || '—' }}{{ row.dateTo && row.dateTo !== row.dateFrom ? ` ~ ${row.dateTo}` : '' }}</td>
              </tr>
              <tr v-if="!(result.comboYield.combos || []).length">
                <td colspan="10" class="px-3 py-3 text-center text-muted-foreground">无组合行</td>
              </tr>
            </tbody>
          </table>
          <p v-if="result.comboYield.combosTruncated" class="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-border">
            另有 {{ result.comboYield.combosTruncated }} 组未展示
          </p>
        </div>

        <div class="overflow-auto rounded-md border border-border">
          <div class="px-3 py-2 text-xs text-muted-foreground bg-muted/20">班组二检良率（原口径，对照用）</div>
          <table class="w-full text-sm">
            <thead class="bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th class="px-3 py-2">班组</th>
                <th class="px-3 py-2">编码</th>
                <th class="px-3 py-2">批次</th>
                <th class="px-3 py-2">投入</th>
                <th class="px-3 py-2">合格</th>
                <th class="px-3 py-2">报废</th>
                <th class="px-3 py-2">良率</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(line, idx) in result.lines"
                :key="idx"
                class="border-t border-border"
                :class="idx === 0 ? 'bg-patina/5' : ''"
              >
                <td class="px-3 py-2">{{ line.lineName }}</td>
                <td class="px-3 py-2 font-mono text-xs">{{ line.lineCode }}</td>
                <td class="px-3 py-2">{{ line.lotCount }}</td>
                <td class="px-3 py-2">{{ line.inputQty }}</td>
                <td class="px-3 py-2">{{ line.passQty }}</td>
                <td class="px-3 py-2">{{ line.scrapQty }}</td>
                <td class="px-3 py-2 font-medium">{{ fmtRate(line.yieldRate) }}</td>
              </tr>
              <tr v-if="!result.lines?.length">
                <td colspan="7" class="px-3 py-4 text-center text-muted-foreground">无良率行</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="result.weatherYield" class="rounded-md border border-border p-3 space-y-3">
          <div class="text-sm font-medium">气温与良率对照</div>
          <p class="text-[11px] text-muted-foreground">
            浇铸日对照更贴近浇铸环境；二检日对照仅作观察。样本量不足时不要当成因果结论。
          </p>
          <div
            v-for="block in [result.weatherYield.castingDay, result.weatherYield.inspectDay] as WeatherYieldBlock[]"
            :key="block?.basis || 'x'"
            class="space-y-1.5"
          >
            <div class="text-xs font-medium">{{ block?.basis === 'casting_day' ? '按浇铸日' : '按二检日' }}</div>
            <p class="text-[11px] text-muted-foreground">{{ block?.note }}</p>
            <div class="overflow-auto rounded-md border border-border" v-if="block?.bins?.length">
              <table class="w-full text-sm">
                <thead class="bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2">气温区间</th>
                    <th class="px-3 py-2">天数</th>
                    <th class="px-3 py-2">投入</th>
                    <th class="px-3 py-2">合格</th>
                    <th class="px-3 py-2">报废</th>
                    <th class="px-3 py-2">良率</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="b in block.bins" :key="b.label" class="border-t border-border">
                    <td class="px-3 py-2">{{ b.label }}</td>
                    <td class="px-3 py-2">{{ b.dayCount }}</td>
                    <td class="px-3 py-2">{{ b.inputQty }}</td>
                    <td class="px-3 py-2">{{ b.passQty }}</td>
                    <td class="px-3 py-2">{{ b.scrapQty }}</td>
                    <td class="px-3 py-2 font-medium">{{ fmtRate(b.yieldRate) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-xs text-muted-foreground">暂无足够日期可分箱</p>
          </div>
        </div>

        <div v-if="processGroups.length" class="space-y-3">
          <div>
            <div class="text-sm font-medium">工序工艺对照（含室外气温）</div>
            <p class="text-[11px] text-muted-foreground mt-0.5">
              按砂型作业 / 熔铸作业 / 加工作业展开；无记录的工序仍占位。组装作业未纳入。
            </p>
          </div>
          <details
            v-for="group in processGroups"
            :key="group.id"
            open
            class="rounded-md border border-border overflow-hidden"
          >
            <summary class="px-3 py-2 text-sm font-medium bg-muted/40 cursor-pointer flex justify-between gap-2">
              <span>{{ group.label }}</span>
              <span class="text-xs font-normal text-muted-foreground">{{ group.rowCount }} 行 · {{ group.stages.length }} 工序</span>
            </summary>
            <div class="space-y-2 p-2 bg-background">
              <div v-for="stage in group.stages" :key="stage.key" class="rounded-md border border-border overflow-auto">
                <div class="px-3 py-2 text-xs font-medium bg-muted/30 flex justify-between">
                  <span>{{ stage.label }}</span>
                  <span class="text-muted-foreground">{{ stage.rows.length }} 行</span>
                </div>
                <table class="w-full text-sm">
                  <thead class="text-left text-xs text-muted-foreground">
                    <tr v-if="stageTableKind(stage.key) === 'sand'">
                      <th class="px-3 py-2">日期</th>
                      <th class="px-3 py-2">室外均温</th>
                      <th class="px-3 py-2">班别</th>
                      <th class="px-3 py-2">材质</th>
                      <th class="px-3 py-2">浇筑类型</th>
                      <th class="px-3 py-2">冒口规格</th>
                      <th class="px-3 py-2">配给量</th>
                      <th class="px-3 py-2">配给重量</th>
                      <th class="px-3 py-2">完工量</th>
                      <th class="px-3 py-2">计划号</th>
                    </tr>
                    <tr v-else-if="stageTableKind(stage.key) === 'sandMaking'">
                      <th class="px-3 py-2">日期</th>
                      <th class="px-3 py-2">室外均温</th>
                      <th class="px-3 py-2">班组</th>
                      <th class="px-3 py-2">完工件数</th>
                      <th class="px-3 py-2">材质</th>
                      <th class="px-3 py-2">浇筑类型</th>
                      <th class="px-3 py-2">冒口规格</th>
                      <th class="px-3 py-2">部位</th>
                      <th class="px-3 py-2">区域</th>
                      <th class="px-3 py-2">在制件样例</th>
                    </tr>
                    <tr v-else-if="stageTableKind(stage.key) === 'furnace'">
                      <th class="px-3 py-2">日期</th>
                      <th class="px-3 py-2">室外均温</th>
                      <th class="px-3 py-2">班组/班别</th>
                      <th class="px-3 py-2">材质</th>
                      <th class="px-3 py-2">件数</th>
                      <th class="px-3 py-2">完工</th>
                      <th class="px-3 py-2">计划号/炉次</th>
                    </tr>
                    <tr v-else-if="stageTableKind(stage.key) === 'castingPlan'">
                      <th class="px-3 py-2">日期</th>
                      <th class="px-3 py-2">室外均温</th>
                      <th class="px-3 py-2">班组/班别</th>
                      <th class="px-3 py-2">电炉</th>
                      <th class="px-3 py-2">炉次</th>
                      <th class="px-3 py-2">件数</th>
                      <th class="px-3 py-2">完工</th>
                      <th class="px-3 py-2">计划号</th>
                    </tr>
                    <tr v-else-if="stageTableKind(stage.key) === 'inbox'">
                      <th class="px-3 py-2">日期</th>
                      <th class="px-3 py-2">室外均温</th>
                      <th class="px-3 py-2">班组/班别</th>
                      <th class="px-3 py-2">炉次</th>
                      <th class="px-3 py-2">电炉</th>
                      <th class="px-3 py-2">部位</th>
                      <th class="px-3 py-2">冒重</th>
                      <th class="px-3 py-2">毛重</th>
                      <th class="px-3 py-2">冒口规格</th>
                      <th class="px-3 py-2">件数</th>
                      <th class="px-3 py-2">完工</th>
                      <th class="px-3 py-2">计划号/样例</th>
                    </tr>
                    <tr v-else-if="stageTableKind(stage.key) === 'count'">
                      <th class="px-3 py-2">日期</th>
                      <th class="px-3 py-2">室外均温</th>
                      <th class="px-3 py-2">班组/班别</th>
                      <th class="px-3 py-2">件数</th>
                      <th class="px-3 py-2">完工</th>
                      <th class="px-3 py-2">计划号/样例</th>
                    </tr>
                    <tr v-else-if="stageTableKind(stage.key) === 'outbox'">
                      <th class="px-3 py-2">日期</th>
                      <th class="px-3 py-2">室外均温</th>
                      <th class="px-3 py-2">班组/班别</th>
                      <th class="px-3 py-2">件数</th>
                      <th class="px-3 py-2">完工</th>
                      <th class="px-3 py-2">保温天数</th>
                      <th class="px-3 py-2">计划号/样例</th>
                    </tr>
                    <tr v-else-if="stageTableKind(stage.key) === 'casting'">
                      <th class="px-3 py-2">日期</th>
                      <th class="px-3 py-2">室外均温</th>
                      <th class="px-3 py-2">月炉次</th>
                      <th class="px-3 py-2">箱号</th>
                      <th class="px-3 py-2">班炉次</th>
                      <th class="px-3 py-2">班别</th>
                      <th class="px-3 py-2">电炉</th>
                      <th class="px-3 py-2">节点</th>
                      <th class="px-3 py-2">规格型号</th>
                      <th class="px-3 py-2">部位</th>
                      <th class="px-3 py-2">浇铸类型</th>
                      <th class="px-3 py-2">材质</th>
                      <th class="px-3 py-2">炉温</th>
                      <th class="px-3 py-2">浇铸温</th>
                      <th class="px-3 py-2">保温天数</th>
                      <th class="px-3 py-2">序列号</th>
                    </tr>
                    <tr v-else>
                      <th class="px-3 py-2">日期</th>
                      <th class="px-3 py-2">室外均温</th>
                      <th class="px-3 py-2">班组</th>
                      <th class="px-3 py-2">投入</th>
                      <th class="px-3 py-2">合格</th>
                      <th class="px-3 py-2">报废</th>
                      <th class="px-3 py-2">分日良率</th>
                      <th class="px-3 py-2">缺陷样例</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in stage.rows" :key="`${stage.key}-${i}`" class="border-t border-border">
                      <template v-if="stageTableKind(stage.key) === 'sand'">
                        <td class="px-3 py-2 font-mono text-xs">{{ row.processDate }}</td>
                        <td class="px-3 py-2">{{ fmtTemp(row.outdoorTempMeanC) }}</td>
                        <td class="px-3 py-2">{{ row.lineName || '—' }}</td>
                        <td class="px-3 py-2">{{ row.materialName || '—' }}</td>
                        <td class="px-3 py-2">{{ row.castingTypeName || row.castingTypeKey || '—' }}</td>
                        <td class="px-3 py-2">{{ row.riserSpec || '—' }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.allottedQty) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.allottedWeight) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.finishedQty) }}</td>
                        <td class="px-3 py-2 text-xs">{{ row.samplePlanCode || '—' }}</td>
                      </template>
                      <template v-else-if="stageTableKind(stage.key) === 'sandMaking'">
                        <td class="px-3 py-2 font-mono text-xs">{{ row.processDate }}</td>
                        <td class="px-3 py-2">{{ fmtTemp(row.outdoorTempMeanC) }}</td>
                        <td class="px-3 py-2">{{ row.lineName || '—' }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.finishedQty) }}</td>
                        <td class="px-3 py-2">{{ row.materialName || '—' }}</td>
                        <td class="px-3 py-2">{{ row.castingTypeName || row.castingTypeKey || '—' }}</td>
                        <td class="px-3 py-2">{{ row.riserSpec || '—' }}</td>
                        <td class="px-3 py-2">{{ row.position || '—' }}</td>
                        <td class="px-3 py-2">{{ row.areaName || '—' }}</td>
                        <td class="px-3 py-2 text-xs">{{ row.sampleObjectCode || '—' }}</td>
                      </template>
                      <template v-else-if="stageTableKind(stage.key) === 'furnace'">
                        <td class="px-3 py-2 font-mono text-xs">{{ row.processDate }}</td>
                        <td class="px-3 py-2">{{ fmtTemp(row.outdoorTempMeanC) }}</td>
                        <td class="px-3 py-2">{{ row.lineName || '—' }}</td>
                        <td class="px-3 py-2">{{ row.materialName || '—' }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.lotCount) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.finishedQty) }}</td>
                        <td class="px-3 py-2 text-xs">{{ row.samplePlanCode || row.monthFurnaceNo || '—' }}</td>
                      </template>
                      <template v-else-if="stageTableKind(stage.key) === 'castingPlan'">
                        <td class="px-3 py-2 font-mono text-xs">{{ row.processDate }}</td>
                        <td class="px-3 py-2">{{ fmtTemp(row.outdoorTempMeanC) }}</td>
                        <td class="px-3 py-2">{{ row.lineName || '—' }}</td>
                        <td class="px-3 py-2">{{ row.furnaceName || row.areaName || '—' }}</td>
                        <td
                          class="px-3 py-2 font-mono text-xs text-patina cursor-help underline decoration-dotted underline-offset-2"
                          @mouseenter="onPlanHeatEnter($event, row)"
                          @mouseleave="onPlanHeatLeave"
                        >
                          {{ row.monthFurnaceNo || '—' }}
                        </td>
                        <td class="px-3 py-2">{{ fmtNum(row.lotCount) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.finishedQty) }}</td>
                        <td class="px-3 py-2 text-xs">{{ row.samplePlanCode || '—' }}</td>
                      </template>
                      <template v-else-if="stageTableKind(stage.key) === 'inbox'">
                        <td class="px-3 py-2 font-mono text-xs">{{ row.processDate }}</td>
                        <td class="px-3 py-2">{{ fmtTemp(row.outdoorTempMeanC) }}</td>
                        <td class="px-3 py-2">{{ row.lineName || '—' }}</td>
                        <td class="px-3 py-2 font-mono text-xs">{{ row.monthFurnaceNo || '—' }}</td>
                        <td class="px-3 py-2">{{ row.furnaceName || '—' }}</td>
                        <td class="px-3 py-2">{{ row.position || '—' }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.riserWeight) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.grossWeight) }}</td>
                        <td class="px-3 py-2">{{ row.riserSpec || '—' }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.lotCount) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.finishedQty) }}</td>
                        <td class="px-3 py-2 text-xs">{{ row.sampleObjectCode || countCodeLabel(row) }}</td>
                      </template>
                      <template v-else-if="stageTableKind(stage.key) === 'count'">
                        <td class="px-3 py-2 font-mono text-xs">{{ row.processDate }}</td>
                        <td class="px-3 py-2">{{ fmtTemp(row.outdoorTempMeanC) }}</td>
                        <td class="px-3 py-2">{{ row.lineName || '—' }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.lotCount) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.finishedQty) }}</td>
                        <td class="px-3 py-2 text-xs">{{ countCodeLabel(row) }}</td>
                      </template>
                      <template v-else-if="stageTableKind(stage.key) === 'outbox'">
                        <td class="px-3 py-2 font-mono text-xs">{{ row.processDate }}</td>
                        <td class="px-3 py-2">{{ fmtTemp(row.outdoorTempMeanC) }}</td>
                        <td class="px-3 py-2">{{ row.lineName || '—' }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.lotCount) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.finishedQty) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.annealingDaysAvg) }}</td>
                        <td class="px-3 py-2 text-xs">{{ countCodeLabel(row) }}</td>
                      </template>
                      <template v-else-if="stageTableKind(stage.key) === 'casting'">
                        <td class="px-3 py-2 font-mono text-xs">{{ row.processDate }}</td>
                        <td class="px-3 py-2">{{ fmtTemp(row.outdoorTempMeanC) }}</td>
                        <td class="px-3 py-2 font-mono text-xs">{{ row.monthFurnaceNo || row.samplePlanCode || '—' }}</td>
                        <td class="px-3 py-2">{{ row.boxNo || '—' }}</td>
                        <td class="px-3 py-2">{{ row.shiftFurnaceNo || '—' }}</td>
                        <td class="px-3 py-2">{{ row.lineName || '—' }}</td>
                        <td class="px-3 py-2">{{ row.furnaceName || '—' }}</td>
                        <td class="px-3 py-2">{{ row.nodeCode || '—' }}</td>
                        <td class="px-3 py-2">{{ row.spec || '—' }}</td>
                        <td class="px-3 py-2">{{ row.position || '—' }}</td>
                        <td class="px-3 py-2">{{ row.castingTypeName || row.castingTypeKey || '—' }}</td>
                        <td class="px-3 py-2">{{ row.materialName || '—' }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.furnaceTmpAvg) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.castingTmpAvg) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.annealingDaysAvg) }}</td>
                        <td class="px-3 py-2 text-xs">{{ row.sampleObjectCode || '—' }}</td>
                      </template>
                      <template v-else>
                        <td class="px-3 py-2 font-mono text-xs">{{ row.processDate }}</td>
                        <td class="px-3 py-2">{{ fmtTemp(row.outdoorTempMeanC) }}</td>
                        <td class="px-3 py-2">{{ row.lineName || '—' }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.inputQty) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.passQty) }}</td>
                        <td class="px-3 py-2">{{ fmtNum(row.scrapQty) }}</td>
                        <td class="px-3 py-2 font-medium">{{ fmtRate(row.yieldRate) }}</td>
                        <td class="px-3 py-2 text-xs">{{ row.sampleCauseDesc || '—' }}</td>
                      </template>
                    </tr>
                    <tr v-if="!stage.rows.length">
                      <td colspan="10" class="px-3 py-3 text-center text-muted-foreground">无工艺行</td>
                    </tr>
                  </tbody>
                </table>
                <p v-if="stage.truncated" class="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-border">
                  另有 {{ stage.truncated }} 行未展示
                </p>
              </div>
            </div>
          </details>
        </div>

        <div v-if="result.weatherSummary" class="rounded-md border border-border p-3 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-sm font-medium flex items-center gap-1.5">
              <CloudSun class="h-4 w-4" /> 历史气温摘要
            </div>
            <div v-if="weatherLocationText" class="text-[11px] text-muted-foreground">{{ weatherLocationText }}</div>
          </div>
          <div v-if="weatherStages.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="{ key, block } in weatherStages"
              :key="key"
              class="rounded-md border border-border/80 bg-muted/10 p-3 space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="text-sm font-medium">{{ block.label || key }}</div>
                <div class="text-[11px] text-muted-foreground">{{ block.dayCount || 0 }} 天</div>
              </div>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div class="text-muted-foreground">均值</div>
                  <div class="font-medium">{{ fmtTemp(block.tempMeanAvgC) }}</div>
                </div>
                <div>
                  <div class="text-muted-foreground">最低</div>
                  <div class="font-medium">{{ fmtTemp(block.tempMeanMinC) }}</div>
                </div>
                <div>
                  <div class="text-muted-foreground">最高</div>
                  <div class="font-medium">{{ fmtTemp(block.tempMeanMaxC) }}</div>
                </div>
              </div>
              <button
                type="button"
                class="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                @click="toggleWeatherStage(key)"
              >
                {{ expandedWeatherStages[key] ? '收起明细' : '展开日期明细' }}
              </button>
              <div v-if="expandedWeatherStages[key]" class="max-h-40 overflow-auto rounded border border-border bg-background">
                <table class="w-full text-[11px]">
                  <thead class="sticky top-0 bg-muted/40 text-muted-foreground text-left">
                    <tr>
                      <th class="px-2 py-1.5 font-normal">日期</th>
                      <th class="px-2 py-1.5 font-normal">均温</th>
                      <th class="px-2 py-1.5 font-normal">最低</th>
                      <th class="px-2 py-1.5 font-normal">最高</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(d, i) in block.days || []" :key="`${key}-${d.date}-${i}`" class="border-t border-border/60">
                      <td class="px-2 py-1 font-mono">{{ d.date }}</td>
                      <td class="px-2 py-1">{{ fmtTemp(d.tempMeanC) }}</td>
                      <td class="px-2 py-1">{{ fmtTemp(d.tempMinC) }}</td>
                      <td class="px-2 py-1">{{ fmtTemp(d.tempMaxC) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <details v-if="result.rawContext" class="rounded-md border border-border group">
          <summary class="cursor-pointer list-none px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground flex items-center justify-between gap-2">
            <span>分析上下文预览（供 LLM）</span>
            <span class="text-[11px] opacity-70">点击展开</span>
          </summary>
          <div class="border-t border-border p-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] text-muted-foreground">以下为送入大模型的结构化上下文</p>
              <button
                type="button"
                class="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                @click.stop="showRawContextSource = !showRawContextSource"
              >
                {{ showRawContextSource ? '看排版预览' : '看原文' }}
              </button>
            </div>
            <div v-if="!showRawContextSource" class="max-h-96 overflow-auto rounded-md bg-muted/20 border border-border/60 p-3">
              <ChatMarkdown :content="result.rawContext" />
            </div>
            <pre
              v-else
              class="max-h-96 overflow-auto rounded-md bg-muted/30 border border-border/60 p-3 whitespace-pre-wrap text-[11px] leading-relaxed font-mono"
            >{{ result.rawContext }}</pre>
          </div>
        </details>

        <div v-if="result.warnings?.length" class="rounded-md border border-border/70 p-3 space-y-1.5">
          <div class="text-xs font-medium text-muted-foreground">提示</div>
          <ul class="text-xs text-muted-foreground list-disc pl-4 space-y-1">
            <li v-for="(w, i) in result.warnings" :key="i">{{ w }}</li>
          </ul>
        </div>
      </template>
    </Panel>

    <Panel v-if="markdown" class="p-4">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div class="text-sm font-medium">生成文档预览</div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="h-8 px-3 inline-flex items-center gap-1 rounded border border-border text-xs hover:bg-muted/40"
            @click="copyMarkdown"
          >
            <Copy class="h-3.5 w-3.5" />
            {{ copied ? '已复制' : '复制' }}
          </button>
          <button
            type="button"
            class="h-8 px-3 inline-flex items-center gap-1 rounded border border-border text-xs hover:bg-muted/40"
            @click="downloadMarkdown"
          >
            <Download class="h-3.5 w-3.5" />
            下载
          </button>
          <div v-if="result?.fileExport?.ok && result.fileExport.path" class="text-[11px] text-patina font-mono">
            已写入：{{ result.fileExport.path }}
          </div>
        </div>
      </div>
      <ChatMarkdown :content="markdown" />
    </Panel>
    <Teleport to="body">
      <div
        v-if="heatHover && heatHoverDetail"
        class="fixed z-[80] w-[340px] rounded-md border border-border bg-popover text-popover-foreground shadow-lg p-3 space-y-2 pointer-events-none"
        :style="{ left: `${heatHover.left}px`, top: `${heatHover.top}px` }"
      >
        <div class="text-xs font-medium">
          炉次 {{ heatHoverDetail.heat }} · {{ heatHoverDetail.date }} · 电炉 {{ heatHoverDetail.furnace }}
        </div>
        <div class="text-[11px] text-muted-foreground">{{ heatHoverDetail.shift }}</div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div>炉温 {{ heatHoverDetail.furnaceTempText }}</div>
          <div>浇铸温 {{ heatHoverDetail.castingTempText }}</div>
          <div>电压 {{ heatHoverDetail.voltText }}</div>
          <div>电流A {{ heatHoverDetail.ampText }}</div>
        </div>
        <p class="text-[11px] text-muted-foreground">
          温度来自该月炉次的浇铸任务登记；电压电流为当天该电炉熔化炉报，不是单月炉次专属。
        </p>
        <VChart
          v-if="heatHoverChartOption"
          :option="heatHoverChartOption"
          :style="{ height: '140px', width: '100%' }"
        />
        <p v-else class="text-[11px] text-muted-foreground">当日该电炉无电压/电流记录</p>
      </div>
    </Teleport>
  </div>
</template>
