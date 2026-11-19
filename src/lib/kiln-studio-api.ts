import { apiDownload, apiRequest, getApiBaseUrl } from './api'
import { getAccessToken } from './auth'

export type Task = 'temperature' | 'energy' | 'afr'
export type AlgorithmKey = string
export type AlgorithmStatus = 'enabled' | 'experimental' | 'disabled'
export type AlgorithmTuning = { ridgeAlpha?: number | null; boostingRounds?: number | null; learningRate?: number | null }
export type ExternalAlgorithmSpec = Pick<ExperimentConfig, 'task' | 'zone' | 'horizonMinutes' | 'historyMinutes'> & {
  name: string; description: string; trainedUntil: string; featureIndices: number[]; probe: number[]
}
export type ExternalAlgorithmMetadata = Omit<ExternalAlgorithmSpec, 'name' | 'description'> & {
  fileName: string; sha256: string; byteSize: number; inputName: string; outputName: string
  inputType: 'float32' | 'float64'; probeOutput: number
}
export type ExternalAlgorithmContract = { features: string[]; maxBytes: number }
type Level = 'high' | 'medium' | 'low'
export type AlgorithmMetadata = {
  key: AlgorithmKey; name: string; category: string; oneLine: string
  strengths: string[]; benefits: string[]; fitScenarios: string[]; limitations: string[]; dataRequirements: string[]
  interpretability: Level; sampleSizeRisk: Level; inferenceComplexity?: Level | null
  interventionCapable: boolean; status: AlgorithmStatus; version: string
  formula: string; explanation: string; mechanismRole: string
  baseKey?: 'ridge' | 'boosting' | null
  tuning?: AlgorithmTuning | null
  parentKey?: AlgorithmKey | null
  external?: ExternalAlgorithmMetadata | null
}
export type BacktestStatus = 'not_run' | 'unavailable' | 'backtested'
type BacktestMetric = Pick<Metric, 'mae' | 'rmse' | 'coverage' | 'count'>
export type SelectionEvidenceRef = {
  id: string; kind: 'dataset' | 'backtest' | 'mechanism'; assetId: string
  label: string; detail: string; file: string | null; location: string | null
}
export type AlgorithmRecommendationCard = Pick<AlgorithmMetadata, 'key' | 'name' | 'category' | 'oneLine' | 'strengths' | 'benefits' | 'limitations'> & {
  whyNow: string; backtestStatus: BacktestStatus
  metrics: { validation: BacktestMetric | null; test: BacktestMetric | null } | null
  evidenceRefs: SelectionEvidenceRef[]
}
export type AlgorithmRecommendationRequest = ExperimentConfig & { experimentId?: string | null }
export type AlgorithmRecommendationResponse = {
  mode: 'ai' | 'rules'
  taskSummary: string
  algorithmCards: AlgorithmRecommendationCard[]
  recommendation: {
    primaryKey: AlgorithmKey | null; backupKey: AlgorithmKey | null; reasons: string[]
    confidence: Level; confidenceBasis: string; dataCaveats: string[]; disclaimer: string
  }
}
export type Mapping = { column: string; field: string; scale: number; offset: number }
export type Source = { id: string; fileId: string; file: string; location: string; text: string }
export type StudioFile = { id: string; path: string; kind: string; status: string; message: string; size: number; sources: Source[]; uploadedAt?: string; parsedAt?: string; columns?: { id: string; label: string; sample: string }[]; mapping?: Mapping[]; standard?: boolean; rowCount?: number }
export type Parameters = { ambientC: number; lhvMJ: number; efficiency: number; capacityKJ: number; lossKW: number; tauMinutes: number; theoreticalAfr: number; excessAir: number; minGas: number }
export type BaseAsset = { id: string; projectId: string; kind: string; title: string; createdAt: string }
export type Project = BaseAsset & { status: string; files: StudioFile[]; conflicts: string[]; archiveSummary?: { archiveCount: number; nestedArchiveCount: number; maxDepth: number; expandedEntries: number; expandedBytes: number; tableCount: number; attentionCount: number }; equipmentSuggestion?: { zoneCount: number | null; burnerCount: number | null; dataZoneCount: number | null; evidence: Source[] } }
export type Dataset = BaseAsset & { rowCount: number; dataHash: string; sourceKind: string; config: { zoneCount: number; burnerCount: number; kilnCode: string; flowBasis: string }; qualityNotes: string[]; summary: { fileId: string; file: string; count: number; from: string; to: string; skippedTimeRows: number; duplicateTimes: number; fields: { key: string; present: number; total: number }[] }[]; sample: Record<string, string | number | null>[] }
export type Draft = BaseAsset & { datasetId: string; mode: string; llmModel?: string; summary: string; templateKeys: string[]; parameters: Parameters; provenance: Record<string, string>; evidence: Record<string, Source[]>; aiEvidence: { sourceId: string; quote: string; reason: string; verification?: string; source: Source }[]; citationAudit?: { attempts: number; verifiedCount: number; discardedCount: number; layoutNormalizedCount: number } | null; warnings: string[] }
export type MappingDraft = BaseAsset & { summary: string; llmModel: string; warnings: string[]; files: { fileId: string; mappings: Mapping[]; reason: string; sourceIds: string[] }[] }
export type Mechanism = BaseAsset & { datasetId: string; templateKeys: string[]; parameters: Parameters; provenance: Record<string, string>; notes: string; parentId?: string; version: string; evidence: Record<string, Source[]>; inheritedEvidence?: Record<string, Source[]>; validationStatus: string; scope: { zoneCount: number; burnerCount?: number; kilnCode: string; flowBasis: string }; catalogSelections?: Record<string, string>; catalogAlternatives?: string[] }
export type Metric = {
  mae: number | null; rmse: number | null; bias: number | null; coverage: number; count: number
  mape?: number | null; mapeCount?: number; mapeExcludedCount?: number; mapeMinActual?: number
  totalCount?: number; maxAbsError?: number | null
  windowActualNm3?: number; windowPredictedNm3?: number; totalErrorPct?: number | null; coveredHours?: number; fuelEnergyMJ?: number
}
export type PredictionEvaluationRequest = {
  algorithm: AlgorithmKey; split: 'validation' | 'test'; cycleId: string | null; mapeMinActual: number
  overtemperatureC?: number | null; eventDurationMinutes?: number; eventToleranceMinutes?: number
}
export type PredictionEvaluationPoint = {
  origin: string; ts: string; cycle: string; actual: number; prediction: number | null
  actualTemperatureSource?: TemperatureObservationSource | null
  reference: number | null; deviation: number | null
  lower?: number | null; upper?: number | null
}
export type EnergyPeriod = {
  start: string; end: string; actual: number | null; prediction: number | null
  coveredMinutes: number; complete: boolean; reason: string
}
export type EnergyPeriodEvaluation = {
  thresholdPct: number; metrics: Metric; periodCount: number; completeCount: number
  incompleteCount: number; meetsTarget: boolean | null; periods: EnergyPeriod[]
}
export type OvertemperatureEvaluation = {
  thresholdC: number; durationMinutes: number; toleranceMinutes: number; minimumLeadMinutes: number
  actualCount: number; alertCount: number; timelyCount: number; lateCount: number; missedCount: number
  falseAlertCount: number; pendingActualCount: number; pendingAlertCount: number
  hitRate: number | null; falseAlertRate: number | null; hitTarget: boolean | null; falseAlertTarget: boolean | null
  events: { cycle: string; actualStart: string; actualEnd: string; alertAt: string | null; leadMinutes: number | null; timely: boolean; peak: number }[]
}
export type PredictionEvaluation = {
  experimentId: string; dataHash: string; algorithmName: string; referenceName: string | null
  horizonMinutes: number; unit: string; request: PredictionEvaluationRequest
  metrics: Metric; points: PredictionEvaluationPoint[]; worstPoints: PredictionEvaluationPoint[]
  cycles: { id: string; name: string }[]; from: string | null; to: string | null
  actualTemperatureSources?: TemperatureObservationSource[]
  architecture?: string
  trainingSummary?: { trainingCount: number; availableTrainingCount: number; epochs: number; hiddenSize: number; sequenceLength: number } | null
  interval?: { radius: number; level: number; calibrationCount: number; count: number; coveredCount: number; coverage: number | null; meetsTarget: boolean | null; method: string } | null
  inferenceBenchmark?: { environment: string; count: number; maxMs: number | null; meanMs: number | null; batchMs: number } | null
  overtemperature?: OvertemperatureEvaluation | null
  energy?: { hourly: EnergyPeriodEvaluation; daily: EnergyPeriodEvaluation }
}
export type TemperatureObservationSource = 'provided' | 'zoneAverage' | 'unknown'
export type ZoneObservationTrend = {
  cycleName: string; rowCount: number; displayCount: number; zones: number[]
  points: { timestampMs: number; temperatures: (number | null)[] }[]
}
type AlgorithmIdentity = Pick<AlgorithmMetadata, 'key' | 'name' | 'formula' | 'explanation' | 'mechanismRole'>
export type Algorithm = AlgorithmIdentity & Partial<Omit<AlgorithmMetadata, keyof AlgorithmIdentity>> & {
  available: boolean; note: string; validation: Metric | null; test: Metric | null
  inferenceBenchmark?: PredictionEvaluation['inferenceBenchmark']
  predictionOffsets?: number[]
}
export type LockableParameter = 'capacityKJ' | 'lossKW' | 'tauMinutes'
export type ExperimentConfig = { datasetId: string; mechanismId: string; task: Task; zone: number; horizonMinutes: number; historyMinutes: number; ridgeAlpha: number; boostingRounds: number; learningRate: number; calibrate: boolean; excludeZeroTemperatureRecords?: boolean; lockedParameters: LockableParameter[]; selectedAlgorithmKeys?: AlgorithmKey[] | null }
export type ExperimentPoint = {
  ts: string; origin: string; cycle: string; split: 'validation' | 'test'; actual: number; setpoint: number | null
  cumulative?: Partial<Record<AlgorithmKey, number>>
  [field: string]: string | number | null | Partial<Record<AlgorithmKey, number>> | undefined
}
export type Experiment = BaseAsset & { datasetId: string; mechanismId: string; config: ExperimentConfig; parameters: Parameters; calibration: string[]; algorithms: Algorithm[]; points: ExperimentPoint[]; split: { name: string; count: number; from: string; to: string; cycles: string[] }[]; splitMethod: string; featureNames: string[]; warnings: string[]; unit: string; mechanismVersion: string; sourceKind: string; observationQuality?: { sentinelRows: number; zeroTemperatureRows: number; excludeZeroTemperatureRecords: boolean; gasCounterResets?: number; counterNonzeroStart?: boolean; frozenRows?: number; longestFreezeMinutes?: number } }
export type Selection = { experimentId: string; algorithm: AlgorithmKey }
export type Bundle = BaseAsset & { datasetId: string; version: string; artifactHash: string; status: string; validationStatus: string; dataFlow: string; manifest: { task: Task; experimentId: string; algorithm: AlgorithmKey; algorithmName: string; mechanismId: string; mechanismVersion: string; dataHash: string; parameters: Parameters; config: ExperimentConfig; validation: Metric; test: Metric; mechanismRole: string; unit: string }[] }
export type Job = BaseAsset & { operation: string; status: string; progress: number; message: string; error: string | null; resultId: string | null }
export type Template = { key: string; name: string; formula: string; explanation: string; variables: string[]; parameters: string[]; task: Task | null; role: string; check?: string }
export type CatalogScope = { kilnCode: string; zoneCount: number | null; burnerCount: number | null; flowBasis: '' | 'normal' | 'unknown' }
export type CatalogRevision = {
  name: string; explanation: string; formula: string; variables: string[]; parameterNotes: string
  parameterValues: Partial<Parameters>; check: string; scope: CatalogScope
}
export type CatalogVersion = CatalogRevision & {
  id: string; key: string; templateKey: string | null; parentId?: string; version: string
  status: 'builtin' | 'pending' | 'approved' | 'reviewed'; role: string; task: Task | null
  solverSupported: boolean; compatibilityIssues: string[]; solverIssues: string[]
  evidence: Source[]; createdAt?: string; validationStatus: string; parseJobId?: string
  projected?: boolean
  sourcePlan?: { id: string; title: string; datasetId: string; notes: string; kilnCode: string }
  parameterSources?: Partial<Record<keyof Parameters, string>>
  parameterDefinitions: { key: keyof Parameters; label: string; unit: string }[]
}
export type MechanismLibraryEntry = {
  mechanism: Pick<Mechanism, 'id' | 'title' | 'version' | 'createdAt' | 'templateKeys' | 'notes' | 'parameters' | 'validationStatus' | 'scope'>
  blockedReason: string
  crossProject: boolean
}
export type MechanismComparison = {
  scores: { id: string; title: string; version: string; metric: Metric | null }[]
  bestIds: string[]
  points: { ts: string; actual: number; fold: string; values: Record<string, number | null> }[]
  count: number; validationCount: number; afrFloor: number | null; splitMethod: string
  start: string; end: string; unit: string
}
export type StudioState = { project: Project; datasets: Dataset[]; drafts: Draft[]; mappingDrafts: MappingDraft[]; mechanisms: Mechanism[]; experiments: Experiment[]; bundles: Bundle[]; temperatureRuns?: TemperatureRun[]; jobs: Job[]; fields: { key: string; label: string }[]; parameterDefinitions: { key: keyof Parameters; label: string; unit: string; explanation: string }[]; templates: Template[]; algorithmLibrary: AlgorithmMetadata[] }
export type TemperatureRun = BaseAsset & { bundleId: string; originAt: string; targetLabel: string }
export type TemperatureRecordStats = {
  count: number; from: string | null; to: string | null; measuredCount: number; setpointCount: number
  skippedTimeRows: number; duplicateTimes: number; recommendedCursorFraction: number | null; minimumWindowMinutes: number | null
}
export type UploadedTemperatureRecord = TemperatureRecordStats & {
  fileId: string; file: string; from: string; to: string; cycleSource: 'upload'; fileHash: string; createdAt: string
}
export type TemperatureRecordPreview = {
  file: string; fileHash: string; kilnCode: string; rowCount: number; useStandard: boolean; mappings: Mapping[]
  fields: { key: string; label: string }[]; columns: NonNullable<StudioFile['columns']>
  stats: TemperatureRecordStats | null; issues: string[]
}
export type TemperatureRecordSettings = Pick<TemperatureRecordPreview, 'fileHash' | 'useStandard' | 'mappings'> & {
  acknowledgeInputs: boolean
}
export type TemperatureRequest = {
  cycleId: string; cursorFraction: number; durationMinutes: number; offsetC: number
  cycleSource?: 'dataset' | 'upload'
  delayMinutes: number; rampMinutes: number; tauMinutes: number | null
  deviationC: number; deviationMinutes: number
  comparePlans?: boolean; holdMinutes?: number | null; targetC?: number | null
  excludedRange?: ReplayExcludedRange | null
}
export type TemperaturePoint = {
  minute: number; timestamp: string; actual: number | null; actualAfter: number | null
  setpoint: number | null; adjustedSetpoint: number | null; forecast: number | null
  scenario: number | null; rolling: number | null; gas: number | null; air: number | null
  algorithmForecast?: number | null
  recordPoint?: boolean
  beforeExclusionAlgorithm?: number | null; beforeExclusionMechanism?: number | null
  pressure: number | null; oxygen: number | null
  zoneTemperatures: (number | null)[]
}
export type TemperatureAlert = {
  series: string; start: number; end: number; peak: number; deviation: number
  temperature: number; setpoint: number; startAt: string; endAt: string
}
export type TemperatureComparison = {
  mechanismEnabled: boolean; originTemperature: number; originSetpoint: number | null
  coveredMinutes: number; algorithmCoveredMinutes: number; algorithmPoints: number
  algorithmTrajectory?: TemperatureTrajectory | null
  endDeltaC: number | null; scenarioPeakTemperature: number | null
  maxChangeC?: number | null; maxChangeMinutes?: number | null
  targetMinutes: number | null; scenarioTargetMinutes: number | null; excludedCount: number
  exclusionMaxDeltaC?: number | null; exclusionComparableCount?: number
  mechanismActual: Metric; algorithmActual: Metric; commonMechanismActual: Metric; commonAlgorithmActual: Metric
  dataHash?: string | null; trainingEnd?: string | null; afterTraining?: boolean
  algorithmName?: string; mechanismVersion?: string; historicalTest?: Metric | null
}
export type TemperatureForecast = {
  runId: string; bundleVersion: string; mode: 'trajectory' | 'rolling' | 'comparison'; cycleId: string; cycleName: string
  zone: number; targetLabel: string; algorithm: AlgorithmKey; originAt: string; originMinute: number
  scope: string; request: TemperatureRequest; points: TemperaturePoint[]; alerts: TemperatureAlert[]; notes: string[]
  inputRecord?: UploadedTemperatureRecord
  comparison?: TemperatureComparison
  metrics: {
    pointCount: number; endAt: string | null; endTemperature: number | null; scenarioEndTemperature: number | null
    peakTemperature: number | null; savedTauMinutes: number | null; scenarioTauMinutes: number | null
    trainedHorizonMinutes: number
  }
}
export type TemperatureReport = { runId: string; summary: string; findings: string[]; limitations: string[] }
export type ReplayHorizon = 5 | 10 | 30 | 60
export type DashboardLayout = { task: Task; chart: 'line' | 'bar'; windowMinutes: 5 | 10 | 30 }
export type ReplayExcludedRange = { start: string; end: string }
export type ReplayRequest = { experimentId: string; cycleId: string; frameStepMinutes?: number; horizonMinutes: ReplayHorizon; selectedAlgorithms: AlgorithmKey[]; includeMechanism?: boolean; excludedRange?: ReplayExcludedRange | null }
export type ReplayPoint = { minuteOffset: number; value: number | null }
export type ReplayBasePoint = { minute: number; ts: string; actual: number | null; setpoint: number | null }
export type ReplayZone = { zone: number; temp: number | null; gas: number | null; air: number | null; airValve: number | null }
export type ReplaySnapshot = {
  temp: number | null; temp_sp: number | null; gas: number | null; air: number | null
  afr: number | null; o2: number | null; pressure: number | null; zones: ReplayZone[]
}
export type ReplayFrame = {
  frameId: number; originTs: string; originMinute: number; snapshot: ReplaySnapshot
  future: Partial<Record<AlgorithmKey, ReplayPoint[]>>; actualFuture: ReplayPoint[]
  fusionReference: ReplayPoint[] | null
  mechanismFuture?: ReplayPoint[] | null
  mechanismIssue?: string | null
}
export type TemperatureTrajectory = 'mechanism' | 'persistence' | 'minuteRecursive' | 'multiOutput' | 'fixedHorizon'
export type ReplayPackage = {
  request: ReplayRequest & { frameStepMinutes: number }; cycleName: string; zone: number; targetLabel: string
  task: Task; unit: string
  algorithms: { key: AlgorithmKey; name: string; mode: 'mechanism' | 'fusion' | 'recursive'; trainedHorizonMinutes: number; temperatureTrajectory?: TemperatureTrajectory | null }[]
  baseSeries: ReplayBasePoint[]; frames: ReplayFrame[]; notes: string[]; excludedCount?: number
}
export type Simulation = { cursor: string; cycle: string; temperatureOffsetC: number; bundleId: string; bundleVersion: string; scope: string; outputs: { task: Task; algorithm: AlgorithmKey; baseline: number | null; adjusted: number | null; unit?: string; horizonMinutes?: number; note: string }[] }

const prefix = '/api/v1/kiln-studio'
export function studioGet<T>(path: string): Promise<T> { return apiRequest<T>(prefix + path, { token: getAccessToken() }) }
export function studioPost<T>(path: string, body: unknown): Promise<T> { return apiRequest<T>(prefix + path, { method: 'POST', body, token: getAccessToken() }) }
export function deleteStudioFile(projectId: string, fileId: string): Promise<{ deletedId: string }> {
  return apiRequest(prefix + `/projects/${projectId}/files/${fileId}`, { method: 'DELETE', token: getAccessToken() })
}
export function downloadStudioFile(projectId: string, file: StudioFile): Promise<void> {
  return apiDownload(prefix + `/projects/${projectId}/files/${file.id}/download`, { token: getAccessToken(), fallbackName: file.path.split('/').pop() })
}
export function appendStudioFiles(projectId: string, files: File[]): Promise<Job> {
  const form = new FormData()
  files.forEach(file => form.append('files', file))
  return apiRequest(prefix + `/projects/${projectId}/files`, { method: 'POST', form, token: getAccessToken() })
}
export function importExternalAlgorithm(file: File, spec: ExternalAlgorithmSpec): Promise<AlgorithmMetadata> {
  const form = new FormData()
  form.append('file', file)
  form.append('spec', JSON.stringify(spec))
  return apiRequest(prefix + '/algorithm-library/external', { method: 'POST', form, token: getAccessToken() })
}
export function recommendAlgorithms(projectId: string, body: AlgorithmRecommendationRequest, signal?: AbortSignal, rulesOnly = false): Promise<AlgorithmRecommendationResponse> {
  return apiRequest(prefix + `/projects/${projectId}/algorithm-recommendation${rulesOnly ? '?rulesOnly=true' : ''}`, {
    method: 'POST', body, token: getAccessToken(), signal,
  })
}
export function createReplay(projectId: string, body: ReplayRequest): Promise<Job> {
  return studioPost(`/projects/${projectId}/replays`, body)
}
export function getReplay(replayId: string): Promise<ReplayPackage> {
  return studioGet(`/replays/${replayId}`)
}
export function uploadTemperatureRecord(bundleId: string, file: File): Promise<TemperatureRecordPreview>
export function uploadTemperatureRecord(bundleId: string, file: File, settings: TemperatureRecordSettings): Promise<UploadedTemperatureRecord>
export function uploadTemperatureRecord(bundleId: string, file: File, settings?: TemperatureRecordSettings): Promise<TemperatureRecordPreview | UploadedTemperatureRecord> {
  const form = new FormData()
  form.append('file', file)
  if (settings) form.append('settings', JSON.stringify(settings))
  return apiRequest(prefix + `/bundles/${bundleId}/temperature-records${settings ? '' : '/preview'}`, {
    method: 'POST', form, token: getAccessToken(),
  })
}
export function uploadStudio(files: File[], title: string): Promise<{ projectId: string; job: Job }> {
  const form = new FormData()
  files.forEach(file => form.append('files', file))
  form.append('title', title)
  return apiRequest(prefix + '/projects', { method: 'POST', form, token: getAccessToken() })
}
export async function getDemoFile(): Promise<File> {
  const response = await fetch(getApiBaseUrl() + prefix + '/demo.zip', { headers: { Authorization: `Bearer ${getAccessToken()}` } })
  if (!response.ok) throw new Error('样例下载失败，请检查登录状态')
  return new File([await response.blob()], '窑炉合成演示资料.zip', { type: 'application/zip' })
}
