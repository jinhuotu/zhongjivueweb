import { ApiError, apiDownloadPost, apiRequest, getApiBaseUrl } from './api'
import { clearTokens, getAccessToken, refreshTokens } from './auth'

function requireToken(): string {
  const token = getAccessToken()
  if (!token) throw new Error('请先登录')
  return token
}

/** 查询分析：MES 主链路通常数秒到一两分钟 */
const CASTING_TIMEOUT_MS = 120_000
/** 一键生成：模型写长文，单独加长 */
const CASTING_DOC_TIMEOUT_MS = 300_000

function withTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

function isTimeoutOrAbort(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const name = (e as { name?: string }).name || ''
  const msg = e instanceof Error ? e.message : String(e)
  return (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    /aborted|timeout|TimeoutError|AbortError/i.test(msg)
  )
}

async function castingRequest<T>(path: string, body: unknown): Promise<T> {
  try {
    return await apiRequest<T>(path, {
      method: 'POST',
      token: requireToken(),
      body,
      signal: withTimeoutSignal(CASTING_TIMEOUT_MS),
    })
  } catch (e) {
    if (isTimeoutOrAbort(e)) {
      throw new Error(
        '查询超时：后端业务可能已完成但响应未返回（常见于 Windows 下 MCP stdio 关闭卡住）。请重启 API 后再试；若仍超时，把后端日志里最后一条 casting.yield / API POST 发出来。',
      )
    }
    throw e
  }
}

export type InventoryCandidate = {
  inventoryGuid: string
  code?: string | null
  name?: string | null
  spec?: string | null
  commonName?: string | null
}

export type DrawingExtracted = {
  dims?: Array<{ label?: string; value?: number }>
  diameters?: number[]
  specHints?: string[]
  schemeText?: string
  keywords?: string[]
  confidence?: number | null
}

export type DrawingMatchCandidate = InventoryCandidate & {
  productSize?: string | null
  sizeA?: number | null
  sizeB?: number | null
  sizeH?: number | null
  similarity: number
  matchReasons?: string[]
}

export type DrawingMatchResult = {
  extracted: DrawingExtracted
  candidates: DrawingMatchCandidate[]
  candidateCount?: number
  warnings?: string[]
  message?: string
}

export type SaleOrderCandidate = {
  saleOrderGuid: string
  saleOrderCode?: string | null
  saleOrderDate?: string | null
  statusKey?: string | null
  kilnTypeKey?: string | null
}

export type SaleOrderItem = SaleOrderCandidate & {
  itemIndex?: number | null
  inventoryGuid: string
  code?: string | null
  name?: string | null
  spec?: string | null
  materialName?: string | null
  position?: string | null
  billOrderQty?: number | null
  scheduOrderQty?: number | null
  workingQty?: number | null
  stockQty?: number | null
  mpsingQty?: number | null
  deliveryQty?: number | null
  billOrderWeight?: number | null
}

export type YieldLine = {
  lineCode?: string | null
  lineName?: string | null
  lotCount?: number | null
  inputQty?: number | null
  passQty?: number | null
  scrapQty?: number | null
  yieldRate?: number | null
}

export type StockWarehouse = {
  warehouseCode?: string | null
  warehouseName?: string | null
  availableQty?: number | null
  lockedQty?: number | null
  inTransitQty?: number | null
  totalQty?: number | null
  category?: string | null
  isFinished?: boolean | null
}

export type StockSummary = {
  availableQty?: number | null
  lockedQty?: number | null
  inTransitQty?: number | null
  totalQty?: number | null
  warehouseCount?: number | null
  warehouses?: StockWarehouse[]
  allAvailableQty?: number | null
  allLockedQty?: number | null
  allInTransitQty?: number | null
  allTotalQty?: number | null
  allWarehouseCount?: number | null
  allWarehouses?: StockWarehouse[]
  note?: string | null
}

export type InventoryProfile = {
  inventoryGuid?: string
  code?: string | null
  name?: string | null
  spec?: string | null
  commonName?: string | null
  shape?: string | null
  position?: string | null
  productSize?: string | null
  sizeA?: number | null
  sizeB?: number | null
  sizeH?: number | null
  volume?: number | null
  weightGross?: number | null
  cutRiserArea?: number | null
  machiningArea?: number | null
  drillingDepth?: number | null
  productAnnealingDays?: number | null
  materialTypeGuid?: string | null
  materialTypeName?: string | null
  castTypeGuid?: string | null
  productTypeCode?: string | null
  productTypeName?: string | null
  castingTypeKey?: string | null
  castingTypeName?: string | null
  riser?: {
    inventoryGuid?: string | null
    code?: string | null
    name?: string | null
    spec?: string | null
    weightGross?: number | null
  } | null
}

export type ProcessRow = {
  stage?: string
  processDate?: string
  lineCode?: string | null
  lineName?: string | null
  lotCount?: number | null
  allottedQty?: number | null
  allottedWeight?: number | null
  finishedQty?: number | null
  inputQty?: number | null
  passQty?: number | null
  scrapQty?: number | null
  yieldRate?: number | null
  furnaceTmpAvg?: number | null
  castingTmpAvg?: number | null
  annealingDaysAvg?: number | null
  castingDurationAvg?: number | null
  outdoorTempMeanC?: number | null
  samplePlanCode?: string | null
  sampleObjectCode?: string | null
  sampleCauseDesc?: string | null
  materialName?: string | null
  castingTypeKey?: string | null
  castingTypeName?: string | null
  riserSpec?: string | null
  position?: string | null
  areaName?: string | null
  spec?: string | null
  monthFurnaceNo?: string | null
  boxNo?: string | null
  shiftFurnaceNo?: string | null
  furnaceName?: string | null
  nodeCode?: string | null
  grossWeight?: number | null
  riserWeight?: number | null
}

export type ComboYieldRow = {
  shiftCode?: string | null
  shiftName?: string | null
  furnaceName?: string | null
  monthFurnaceNo?: string | null
  boxNo?: string | null
  weatherBin?: string | null
  lotCount?: number | null
  inputQty?: number | null
  passQty?: number | null
  scrapQty?: number | null
  yieldRate?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  sampleObjectCode?: string | null
}

export type ComboYieldSummary = {
  note?: string
  linkedDayGroups?: number
  comboCount?: number
  bestCombo?: ComboYieldRow | null
  bestComboSampleOk?: boolean
  combos?: ComboYieldRow[]
  combosTruncated?: number
  bestWeatherCombo?: ComboYieldRow | null
  weatherCombos?: ComboYieldRow[]
}

export type WeatherYieldBin = {
  label?: string
  dayCount?: number
  inputQty?: number
  passQty?: number
  scrapQty?: number
  yieldRate?: number | null
}

export type WeatherYieldBlock = {
  basis?: string
  note?: string
  sampleDays?: number
  bins?: WeatherYieldBin[]
  bestBin?: WeatherYieldBin | null
  worstBin?: WeatherYieldBin | null
}

export type YieldAnalysisResult = {
  found: boolean
  message: string
  inventoryGuid: string
  inventory?: InventoryProfile | null
  stockSummary?: StockSummary | null
  lines: YieldLine[]
  bestLine?: YieldLine | null
  productionCount?: number
  comboYield?: ComboYieldSummary | null
  weatherSummary?: Record<string, unknown> | null
  weatherYield?: {
    castingDay?: WeatherYieldBlock
    inspectDay?: WeatherYieldBlock
  } | null
  processSummary?: {
    groups?: Array<{ id?: string; label?: string; stages?: string[]; rowCount?: number }>
    stages?: Record<string, { stage?: string; label?: string; rowCount?: number; rows?: ProcessRow[]; rowsTruncated?: number }>
    note?: string
  } | null
  smeltElectrical?: {
    note?: string
    pointCount?: number
    truncated?: boolean
    points?: Array<{
      at?: string
      produceDate?: string
      furnaceName?: string
      shiftName?: string | null
      shiftFurnaceNo?: string | null
      voltage?: number | null
      currentA?: number | null
      currentB?: number | null
      currentC?: number | null
    }>
  } | null
  insights?: {
    summary?: string[]
    arrange?: string[]
    defects?: string[]
    risks?: string[]
    markdown?: string
  } | null
  rawContext?: string
  warnings?: string[]
  markdown?: string
  document?: { id?: string; name?: string } | null
  fileExport?: {
    ok?: boolean
    path?: string
    filename?: string
    root?: string
    message?: string
    error?: string
    serverName?: string
  } | null
  needSelect?: boolean
  candidates?: InventoryCandidate[]
  query?: string | null
}

export type CastingProgress = {
  step?: string
  label?: string
  status?: string
}

export async function searchCastingOrders(input: {
  query: string
  top?: number
  signal?: AbortSignal
}): Promise<{ query: string; items: SaleOrderCandidate[]; count: number }> {
  return apiRequest('/api/v1/casting/order-search', {
    method: 'POST',
    token: requireToken(),
    body: { query: input.query.trim(), top: input.top ?? 12 },
    signal: input.signal,
  })
}

export async function loadCastingOrderItems(input: {
  saleOrderGuid?: string
  saleOrderCode?: string
}): Promise<{
  found: boolean
  message: string
  order: SaleOrderCandidate | null
  items: SaleOrderItem[]
  query?: string | null
}> {
  const body: Record<string, unknown> = {}
  if (input.saleOrderGuid?.trim()) body.saleOrderGuid = input.saleOrderGuid.trim()
  if (input.saleOrderCode?.trim()) body.saleOrderCode = input.saleOrderCode.trim()
  return apiRequest('/api/v1/casting/order-items', {
    method: 'POST',
    token: requireToken(),
    body,
  })
}

export async function searchCastingInventory(input: {
  query: string
  top?: number
  signal?: AbortSignal
}): Promise<{ query: string; items: InventoryCandidate[]; count: number }> {
  return apiRequest('/api/v1/casting/inventory-search', {
    method: 'POST',
    token: requireToken(),
    body: { query: input.query.trim(), top: input.top ?? 12 },
    signal: input.signal,
  })
}

export async function analyzeCastingYield(input: {
  inventoryGuid?: string
  query?: string
  includeWeather?: boolean
}): Promise<YieldAnalysisResult> {
  const body: Record<string, unknown> = { includeWeather: true }
  if (input.inventoryGuid?.trim()) body.inventoryGuid = input.inventoryGuid.trim()
  if (input.query?.trim()) body.query = input.query.trim()
  return castingRequest<YieldAnalysisResult>('/api/v1/casting/yield-analysis', body)
}

export async function generateCastingYieldDocument(input: {
  inventoryGuid?: string
  query?: string
  includeWeather?: boolean
  promptId?: string | null
  knowledgeBaseId?: string | null
  exportToFilesystem?: boolean
  mode?: 'fast' | 'deep'
}): Promise<YieldAnalysisResult> {
  const body: Record<string, unknown> = {
    includeWeather: true,
    promptId: input.promptId || undefined,
    exportToFilesystem: input.exportToFilesystem === true,
    mode: input.mode || 'deep',
  }
  if (input.inventoryGuid?.trim()) body.inventoryGuid = input.inventoryGuid.trim()
  if (input.query?.trim()) body.query = input.query.trim()
  return castingRequest<YieldAnalysisResult>('/api/v1/casting/yield-document', body)
}

function sseErrorMessage(
  payload: Record<string, unknown>,
  fallback: string,
): string {
  const nested =
    payload.error && typeof payload.error === 'object'
      ? (payload.error as Record<string, unknown>)
      : null
  const raw = payload.msg ?? payload.message ?? nested?.message ?? payload.error
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  if (typeof payload.errorType === 'string' && payload.errorType.trim()) {
    return `${fallback}（${payload.errorType}）`
  }
  return fallback
}

function consumeSseBlock(
  block: string,
  handlers: { onProgress?: (p: CastingProgress) => void },
  state: { result: YieldAnalysisResult | null; errMsg: string },
  fallbackError: string,
): void {
  let event = 'message'
  const dataParts: string[] = []
  for (const raw of block.split('\n')) {
    const ln = raw.replace(/\r$/, '')
    if (ln.startsWith('event:')) event = ln.slice(6).trim()
    else if (ln.startsWith('data:')) dataParts.push(ln.slice(5).replace(/^\s/, ''))
  }
  const data = dataParts.join('\n')
  if (!data) return
  try {
    const payload = JSON.parse(data) as Record<string, unknown>
    if (event === 'progress') handlers.onProgress?.(payload as CastingProgress)
    else if (event === 'done') state.result = payload as YieldAnalysisResult
    else if (event === 'error') state.errMsg = sseErrorMessage(payload, fallbackError)
  } catch (parseErr) {
    if (event === 'done' || event === 'error') {
      const detail = parseErr instanceof Error ? parseErr.message : String(parseErr)
      state.errMsg = `SSE ${event} 事件解析失败：${detail}`
    }
  }
}

async function readHttpErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const j = (await res.json()) as { msg?: string; detail?: unknown }
    if (typeof j.msg === 'string' && j.msg.trim()) return j.msg.trim()
    if (typeof j.detail === 'string' && j.detail.trim()) return j.detail.trim()
  } catch {
    /* ignore */
  }
  return fallback
}

async function fetchCastingSse(
  path: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Response> {
  const open = (token: string) =>
    fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal,
    })

  let token = requireToken()
  let res = await open(token)
  if (res.status !== 401) return res

  const refreshed = await refreshTokens()
  if (!refreshed) {
    clearTokens()
    throw new Error('登录已过期或未登录，请重新登录后再试')
  }
  token = requireToken()
  return open(token)
}

async function readCastingSse(
  path: string,
  body: Record<string, unknown>,
  handlers: {
    onProgress?: (p: CastingProgress) => void
    signal?: AbortSignal
  },
  timeoutMs?: number,
  fallbackError = '分析失败',
): Promise<YieldAnalysisResult> {
  const res = await fetchCastingSse(
    path,
    body,
    handlers.signal ?? withTimeoutSignal(timeoutMs ?? CASTING_TIMEOUT_MS),
  )
  if (!res.ok || !res.body) {
    const raw = await readHttpErrorMessage(res, `服务异常 ${res.status}`)
    if (res.status === 401) {
      throw new Error('登录已过期或未登录，请重新登录后再试')
    }
    throw new Error(raw)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const state: { result: YieldAnalysisResult | null; errMsg: string } = {
    result: null,
    errMsg: '',
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (value) buffer += decoder.decode(value, { stream: !done })
      if (done) {
        buffer += decoder.decode()
        break
      }
      buffer = buffer.replace(/\r\n/g, '\n')
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        consumeSseBlock(block, handlers, state, fallbackError)
      }
    }
    buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      consumeSseBlock(block, handlers, state, fallbackError)
    }
    if (buffer.trim()) consumeSseBlock(buffer, handlers, state, fallbackError)
  } finally {
    try {
      reader.releaseLock()
    } catch {
      /* ignore */
    }
  }
  if (state.result) return state.result
  if (state.errMsg) throw new Error(state.errMsg)
  throw new Error('未收到分析结果')
}

async function parseDrawingMatchResponse(res: Response): Promise<DrawingMatchResult> {
  let payload: { code?: number; msg?: string; data?: DrawingMatchResult } | null = null
  try {
    payload = (await res.json()) as { code?: number; msg?: string; data?: DrawingMatchResult }
  } catch {
    throw new ApiError(res.statusText || '图纸匹配失败', -1, res.status)
  }
  if (!res.ok || payload.code !== 0 || !payload.data) {
    throw new ApiError(payload.msg || '图纸匹配失败', payload.code ?? -1, res.status)
  }
  return payload.data
}

/** 上传图纸 → 多模态识参 → Top5 相似度物料 */
export async function matchCastingDrawing(input: {
  file: File
  extracted?: DrawingExtracted | null
  mode?: string
  top?: number
  visionModelId?: string | null
}): Promise<DrawingMatchResult> {
  const token = requireToken()
  const form = new FormData()
  form.append('file', input.file)
  form.append('mode', input.mode || 'fast')
  form.append('top', String(input.top ?? 5))
  if (input.visionModelId?.trim()) {
    form.append('visionModelId', input.visionModelId.trim())
  }
  if (input.extracted) {
    form.append('extracted', JSON.stringify(input.extracted))
  }

  const doFetch = async (accessToken: string) =>
    fetch(`${getApiBaseUrl()}/api/v1/casting/drawing-match`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
      signal: withTimeoutSignal(CASTING_DOC_TIMEOUT_MS),
    })

  try {
    let res = await doFetch(token)
    if (res.status === 401) {
      const refreshed = await refreshTokens()
      if (refreshed) {
        res = await doFetch(getAccessToken() || '')
      } else {
        clearTokens()
        throw new ApiError('登录已过期或未登录，请重新登录后再试', 40100, 401)
      }
    }
    return await parseDrawingMatchResponse(res)
  } catch (e) {
    if (e instanceof ApiError) throw e
    if (isTimeoutOrAbort(e)) {
      throw new Error('图纸识参超时，请稍后重试或换一张更清晰的图')
    }
    throw e
  }
}

/** 用已修正抽参重新匹配（不传图） */
export async function rematchCastingDrawing(
  extracted: DrawingExtracted,
  top = 5,
): Promise<DrawingMatchResult> {
  try {
    return await castingRequest<DrawingMatchResult>('/api/v1/casting/drawing-match/json', {
      extracted,
      top,
      mode: 'fast',
    })
  } catch (e) {
    if (isTimeoutOrAbort(e)) {
      throw new Error('重新匹配超时，请稍后重试')
    }
    throw e
  }
}

export async function streamCastingYieldAnalysis(
  input: { inventoryGuid?: string; query?: string; orderContext?: Record<string, unknown> },
  handlers: { onProgress?: (p: CastingProgress) => void; signal?: AbortSignal },
): Promise<YieldAnalysisResult> {
  const body: Record<string, unknown> = { includeWeather: true }
  if (input.inventoryGuid?.trim()) body.inventoryGuid = input.inventoryGuid.trim()
  if (input.query?.trim()) body.query = input.query.trim()
  if (input.orderContext) body.orderContext = input.orderContext
  try {
    return await readCastingSse('/api/v1/casting/yield-analysis/stream', body, handlers)
  } catch (e) {
    if (isTimeoutOrAbort(e)) {
      throw new Error(
        '查询超时：后端业务可能已完成但响应未返回（常见于 Windows 下 MCP stdio 关闭卡住）。请重启 API 后再试。',
      )
    }
    throw e
  }
}

export async function streamCastingYieldDocument(
  input: {
    inventoryGuid?: string
    query?: string
    promptId?: string | null
    rawContext?: string
    inventory?: YieldAnalysisResult['inventory']
    orderContext?: Record<string, unknown>
    insights?: YieldAnalysisResult['insights']
    exportToFilesystem?: boolean
  },
  handlers: { onProgress?: (p: CastingProgress) => void; signal?: AbortSignal },
): Promise<YieldAnalysisResult> {
  const body: Record<string, unknown> = {
    includeWeather: true,
    exportToFilesystem: input.exportToFilesystem === true,
    mode: 'deep',
    promptId: input.promptId || undefined,
  }
  if (input.inventoryGuid?.trim()) body.inventoryGuid = input.inventoryGuid.trim()
  if (input.query?.trim()) body.query = input.query.trim()
  if (input.rawContext?.trim()) body.rawContext = input.rawContext
  if (input.inventory) body.inventory = input.inventory
  if (input.orderContext) body.orderContext = input.orderContext
  if (input.insights) body.insights = input.insights
  try {
    return await readCastingSse(
      '/api/v1/casting/yield-document/stream',
      body,
      handlers,
      CASTING_DOC_TIMEOUT_MS,
      '文档生成失败',
    )
  } catch (e) {
    if (isTimeoutOrAbort(e)) {
      throw new Error(
        '生成超时：后端可能仍在写文档。请稍后重试，或重启 API 后再试。',
      )
    }
    throw e
  }
}

/** 将已生成的 Markdown 转为 Word 并触发浏览器下载 */
export async function downloadCastingYieldDocx(input: {
  markdown: string
  inventoryName?: string | null
  inventoryCode?: string | null
  filename?: string
}): Promise<void> {
  const md = input.markdown.trim()
  if (!md) throw new Error('文档内容为空，无法导出')
  const name =
    (input.inventoryName || input.inventoryCode || '良率分析').replace(
      /[<>:"/\\|?*\u0000-\u001f]/g,
      '_',
    ) || '良率分析'
  const fallbackName = input.filename?.trim() || `${name}_良率分析.docx`
  await apiDownloadPost('/api/v1/casting/yield-document/export-docx', {
    token: requireToken(),
    fallbackName,
    body: {
      markdown: md,
      inventoryName: input.inventoryName || undefined,
      inventoryCode: input.inventoryCode || undefined,
      filename: input.filename || undefined,
    },
  })
}

export type PeelMetrics = {
  brickCnt: number
  peelCnt: number
  peelRate: number | null
}

export type PeelTableRow = {
  kind: 'shift' | 'furnaceTotal' | 'grandTotal' | 'shiftTotal'
  furnaceName: string
  shiftName: string
  total: PeelMetrics
  byDate: Record<string, PeelMetrics>
}

export type PeelPieSlice = PeelMetrics & { name: string }

export type PeelPositionSlice = {
  name: string
  peelCnt: number
  share: number
}

export type PeelReportResult = {
  found: boolean
  message: string
  contractCode: string
  dateFrom?: string | null
  dateTo?: string | null
  specCnt: number
  specs?: Array<{
    inventoryGuid: string
    code?: string | null
    name?: string | null
    spec?: string | null
    materialName?: string | null
  }>
  rules?: {
    peelCode?: string
    peelName?: string
    excludeCodes?: string[]
    brickScope?: string
    materialLike?: string
  }
  dates: string[]
  furnaces: string[]
  shifts: string[]
  rows: PeelTableRow[]
  furnacePie: PeelPieSlice[]
  shiftPie: PeelPieSlice[]
  dailyBars: Array<Record<string, string | number>>
  positionPie: PeelPositionSlice[]
  summary: PeelMetrics
  warnings?: string[]
}

export async function queryCastingPeelReport(input: {
  contractCode: string
  dateFrom?: string
  dateTo?: string
  materialLike?: string
}): Promise<PeelReportResult> {
  return castingRequest<PeelReportResult>('/api/v1/casting/peel-report', {
    contractCode: input.contractCode.trim(),
    dateFrom: input.dateFrom?.trim() || null,
    dateTo: input.dateTo?.trim() || null,
    materialLike: input.materialLike?.trim() || 'PT',
  })
}

export type QaDefectItem = {
  name: string
  rate: number | null
}

export type QaSection = {
  inputTon: number | null
  passTon: number | null
  yieldRate: number | null
  topDefects: QaDefectItem[]
  details: string
}

export type WechatDailyParseResult = {
  kind: 'daily' | 'weekly' | 'unknown'
  reportDate?: string | null
  year?: number | null
  month?: number | null
  day?: number | null
  casting: QaSection
  machining: QaSection
  taiShu: number | null
  heGeRate: number | null
  firstRate: number | null
  secondRate: number | null
  recycleRate: number | null
  targetRate: number | null
  firstDeviation: number | null
  secondDeviation: number | null
  firstDetails: string
  secondDetails: string
  warnings?: string[]
  parseSource?: string
}

export async function parseWechatDaily(input: {
  text: string
  year: number
  month: number
  useLlm?: boolean
}): Promise<WechatDailyParseResult> {
  return apiRequest<WechatDailyParseResult>('/api/v1/casting/wechat-daily-parse', {
    method: 'POST',
    token: requireToken(),
    body: {
      text: input.text,
      year: input.year,
      month: input.month,
      useLlm: input.useLlm !== false,
    },
  })
}
