import { apiRequest } from './api'
import { getAccessToken } from './auth'

function requireToken(): string {
  const token = getAccessToken()
  if (!token) throw new Error('请先登录')
  return token
}

export type CycleItem = {
  id: number
  kilnCode: string
  kilnName: string
  batchNo: string
  sourceFile: string
  startTs: string | null
  endTs: string | null
  sampleCount: number
  curveVersion: string | null
  loadKg: number | null
  label: string
}

export type ZoneReading = {
  name: string
  temp: number | null
  gas: number | null
  air: number | null
  valve: number | null
}

export type WorkspacePoint = {
  hour: number
  stage: string
  measured: number | null
  similar: number | null
  data: number | null
  physics: number | null
  fusion: number | null
  low: number | null
  high: number | null
  tempSp: number | null
  tempMeas: number | null
  o2: number | null
  o2Sp: number | null
  afr: number | null
  air: number | null
  furnaceP: number | null
  zones: ZoneReading[]
}

export type ModelKey = 'similar' | 'data' | 'physics' | 'fusion'
export type ScenarioParameters = { temperatureOffsetC: number; remainingDurationScale: number }
export type AnalysisRequest = {
  selectedModel: ModelKey
  cursorHour: number
  parameters: ScenarioParameters
  instruction: string
}
export type PredictionAlert = {
  id: string
  level: 'info' | 'medium' | 'high'
  title: string
  detail: string
  evidence: string
  zone: string | null
  startHour: number
  endHour: number
  modelKey: ModelKey
}
export type AnalysisPoint = {
  hour: number
  sourceHour: number
  timestamp: string | null
  stage: string
  tempSp: number | null
  baselineTempSp: number | null
  tempMeas: number | null
  measured: number | null
  baseline: number | null
  predicted: number | null
  predictedTemperature: number | null
  temperatureLow: number | null
  temperatureHigh: number | null
  zones: ZoneReading[]
  zonePredictedTemperature: Record<string, number | null>
}
export type KilnAnalysis = {
  selectedModel: ModelCard
  cursorHour: number
  durationHours: number
  parameters: ScenarioParameters
  adjusted: boolean
  points: AnalysisPoint[]
  baselinePoints: Array<{
    hour: number
    predicted: number | null
    tempSp: number | null
    predictedTemperature: number | null
    temperatureLow: number | null
    temperatureHigh: number | null
    zonePredictedTemperature: Record<string, number | null>
  }>
  current: WorkspacePoint
  alerts: PredictionAlert[]
  windows: Array<{ minutes: number; coveredMinutes: number; gas: number }>
  metrics: {
    usedGas: number
    remainingGas: number
    wholeGas: number
    baselineRemainingGas: number
    baselineWholeGas: number
    deltaGas: number
    carbonKg: number
  }
  warnings: string[]
  temperatureModel: {
    name: string
    target: string
    horizon: string
    description: string
  }
  scope: string
}
export type AnalysisResult = { cycle: CycleItem; analysis: KilnAnalysis; models: ModelCard[] }
export type DashboardPanel = {
  kind: 'process' | 'gas' | 'temperature' | 'comparison' | 'windows' | 'carbon'
  title: string
  explanation: string
}
export type KpiKey = 'usedGas' | 'remainingGas' | 'wholeGas' | 'deltaGas' | 'carbonKg'
export type GeneratedDashboard = AnalysisResult & {
  id: string
  request: AnalysisRequest
  dashboard: {
    title: string
    summary: string
    kpis: KpiKey[]
    panels: DashboardPanel[]
    insights: string[]
    limitations: string[]
  }
  generatedBy: 'ai'
  llmModel: string
  generatedAt: string
}
export type RunItem = { id: string; title: string; request: AnalysisRequest; createdAt: string }
export type ImportPreview = {
  name: string
  status: 'ok' | 'failed' | 'skipped'
  message: string
  kilnCode: string | null
  batchNo: string
  rows: number
  columns: Array<{ id: string; label: string; sample: string }>
  mapping: Record<string, string>
  fields: Array<{ key: string; label: string; present: number }>
}

export type ModelCard = {
  key: ModelKey
  name: string
  summary: string
  available: boolean
  note: string
  totalGas: number | null
  mae: number | null
  stageGas: Record<string, number> | null
}

export type CycleReport = {
  title: string
  modelVersion: string
  scope: string
  physics: string
  alpha: number
  beta: number
  residuals: Record<string, number>
  stages: Array<{ name: string; actual: number; fusion: number }>
  carbonMeasuredKg: number
  carbonFusionKg: number
  carbonFactor: number
  trainCount: number
  excluded: string
  gaps: string[]
  notes: string[]
}

export type CycleWorkspace = {
  cycle: CycleItem
  durationHours: number
  suggestCursorHour: number
  points: WorkspacePoint[]
  models: ModelCard[]
  peers: Array<{
    id: number | null
    label: string
    kilnCode: string
    totalGas: number
    points: Array<{ hour: number; gas: number | null }>
  }>
  gaps: string[]
  notes: string[]
  trainCount: number
  report: CycleReport
  recognition: Array<{ key: string; label: string; unit: string; present: number; total: number }>
}

export type UploadFileResult = {
  name: string
  status: 'ok' | 'failed' | 'skipped' | string
  message: string
  kilnCode: string | null
  batchNo: string
  rows: number
  cycleId: number | null
}

export async function listKilnCycles(): Promise<CycleItem[]> {
  const data = await apiRequest<{ items: CycleItem[] }>('/api/v1/kiln-cycles', {
    token: requireToken(),
  })
  return data.items || []
}

export async function uploadKilnCycles(
  files: File[],
  kilnCode: string,
  mappings: Record<string, Record<string, string>> = {},
): Promise<{ files: UploadFileResult[]; cycles: CycleItem[]; cycleIds: number[] }> {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  if (kilnCode.trim()) form.append('kilnCode', kilnCode.trim())
  form.append('mappingsJson', JSON.stringify(mappings))
  return apiRequest('/api/v1/kiln-cycles/upload', {
    method: 'POST',
    form,
    token: requireToken(),
  })
}

export async function previewKilnCycles(files: File[], kilnCode: string): Promise<ImportPreview[]> {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))
  if (kilnCode.trim()) form.append('kilnCode', kilnCode.trim())
  return (await apiRequest<{ files: ImportPreview[] }>('/api/v1/kiln-cycles/preview', {
    method: 'POST', form, token: requireToken(),
  })).files
}

export function analyzeKilnCycle(id: number, body: AnalysisRequest): Promise<AnalysisResult> {
  return apiRequest(`/api/v1/kiln-cycles/${id}/analyze`, { method: 'POST', body, token: requireToken() })
}

export function generateKilnDashboard(id: number, body: AnalysisRequest): Promise<GeneratedDashboard> {
  return apiRequest(`/api/v1/kiln-cycles/${id}/report`, { method: 'POST', body, token: requireToken() })
}

export async function listKilnRuns(id: number): Promise<RunItem[]> {
  return (await apiRequest<{ items: RunItem[] }>(`/api/v1/kiln-cycles/${id}/runs`, {
    token: requireToken(),
  })).items
}

export function getKilnRun(id: number, runId: string): Promise<GeneratedDashboard> {
  return apiRequest(`/api/v1/kiln-cycles/${id}/runs/${encodeURIComponent(runId)}`, { token: requireToken() })
}

export async function saveKilnCycleMeta(
  id: number,
  body: { curveVersion: string; loadKg: number | null },
): Promise<CycleItem> {
  const data = await apiRequest<{ item: CycleItem }>(`/api/v1/kiln-cycles/${id}`, {
    method: 'PATCH',
    body,
    token: requireToken(),
  })
  return data.item
}

export async function getKilnCycleWorkspace(id: number): Promise<CycleWorkspace> {
  return apiRequest<CycleWorkspace>(`/api/v1/kiln-cycles/${id}`, {
    token: requireToken(),
  })
}
