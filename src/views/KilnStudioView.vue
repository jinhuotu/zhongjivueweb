<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Download, FileArchive, FileText, FlaskConical, FolderOpen, History, Info, Loader2, PanelLeft, PanelRight, Play, Plus, RotateCcw, Save, Settings2, Sparkles, Upload, X } from 'lucide-vue-next'
import { PageHeader } from '@/components/ui-kit'
import { canAccessPath } from '@/config/nav'
import { algorithmParameterDefaults } from '@/lib/kiln-algorithm-library'
import { matchAlgorithmLibraryOrigin, readAlgorithmLibraryOrigin, rememberAlgorithmLibraryOrigin } from '@/lib/kiln-algorithm-library-origin'
import { useAuthStore } from '@/stores/auth'
import KilnAlgorithmComparisonCharts from '@/components/production/KilnAlgorithmComparisonCharts.vue'
import KilnAlgorithmResults from '@/components/production/KilnAlgorithmResults.vue'
import KilnAlgorithmLibrary from '@/components/production/KilnAlgorithmLibrary.vue'
import KilnMechanismCatalog from '@/components/production/KilnMechanismCatalog.vue'
import KilnProjectKnowledge from '@/components/production/KilnProjectKnowledge.vue'
import KilnDataConfirmation from '@/components/production/KilnDataConfirmation.vue'
import KilnMechanismLibrary from '@/components/production/KilnMechanismLibrary.vue'
import KilnPredictionReplay from '@/components/production/KilnPredictionReplay.vue'
import KilnTemperatureZoneReview from '@/components/production/KilnTemperatureZoneReview.vue'
import KilnStudioChart from '@/components/production/KilnStudioChart.vue'
import KilnStudioTopology from '@/components/production/KilnStudioTopology.vue'
import KilnProcessBoard from '@/components/production/KilnProcessBoard.vue'
import KilnSourceSignals from '@/components/production/KilnSourceSignals.vue'
import KilnForecastDashboard from '@/components/production/KilnForecastDashboard.vue'
import KilnExperimentRunsTable from '@/components/production/KilnExperimentRunsTable.vue'
import { createReplay, getDemoFile, getReplay, recommendAlgorithms, studioGet, studioPost, uploadStudio } from '@/lib/kiln-studio-api'
import { externalAlgorithmIssue, hasUsableBacktest, sameExperimentConfig, samePhysicsParameters, sameTemplateSelection } from '@/lib/kiln-studio-state'
import { algorithmTuningLabel, formatKilnNumber as fmt, formatKilnParameterInput, formatKilnReading, KILN_PARAMETER_DIGITS, kilnReadingDigits } from '@/lib/kiln-studio-format'
import { catalogUseIssue, matchingCatalogVersions, retainCatalogVersion } from '@/lib/kiln-mechanism-catalog'
import type { AlgorithmKey, AlgorithmMetadata, AlgorithmOptionValue, AlgorithmRecommendationResponse, Bundle, CatalogVersion, Dataset, Draft, Experiment, ExperimentConfig, Job, LockableParameter, Mapping, Mechanism, Parameters, Project, ReplayPackage, ReplayRequest, Selection, Simulation, Source, StudioState, Task } from '@/lib/kiln-studio-api'

type Step = 'archive' | 'data' | 'mechanism' | 'experiment' | 'bundle' | 'knowledge'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const canOpenModelPackage = computed(() => canAccessPath('/model-package', auth.isAdmin, auth.menus))
const requestedProjectId = computed(() => typeof route.query.project === 'string' ? route.query.project : '')
const validationRelease = computed(() => typeof route.query.validationRelease === 'string' ? route.query.validationRelease : '')
const steps: { key: Step; title: string; subtitle: string }[] = [
  { key: 'archive', title: '资料解析', subtitle: '理解设备与文档' }, { key: 'data', title: '数据确认', subtitle: '确认测点和口径' },
  { key: 'mechanism', title: '机理与参数', subtitle: '有来源的工程关系' }, { key: 'experiment', title: '算法库', subtitle: '观看预测效果' },
  { key: 'bundle', title: '模型与看板', subtitle: '保存模型、预测与试算' }, { key: 'knowledge', title: '历史方案验证', subtitle: '比较整套方案效果' },
]
const labels: Record<Task, string> = { temperature: '温度预测', energy: '燃气能耗预测', afr: '空燃比预测' }
const defaults: Parameters = { ambientC: 25, lhvMJ: 36, efficiency: .75, capacityKJ: 20000, lossKW: .3, tauMinutes: 30, theoreticalAfr: 9.5, excessAir: 1.1, minGas: .5 }
const initialTemplates = ['energy', 'thermal', 'combustion']
const initialExperiment: ExperimentConfig = {
  datasetId: '', mechanismId: '', task: 'temperature', zone: 0, horizonMinutes: 10,
  historyMinutes: 30, ridgeAlpha: 1, boostingRounds: 40, learningRate: .1,
  calibrate: true, lockedParameters: [], selectedAlgorithmKeys: ['baseline', 'lstm', 'physics'],
}
const bounds: Record<keyof Parameters, [number, number, number]> = { ambientC: [-40, 80, 1], lhvMJ: [10, 60, .1], efficiency: [.1, 1, .01], capacityKJ: [100, 1e7, 100], lossKW: [.0001, 100, .01], tauMinutes: [1, 600, 1], theoreticalAfr: [1, 30, .1], excessAir: [.5, 5, .01], minGas: [.01, 100, .1] }
const state = ref<StudioState | null>(null)
const projects = ref<Project[]>([])
const projectId = ref('')
const step = ref<Step>('archive')
const error = ref('')
const notice = ref('')
const busy = ref(false)
const savingDataset = ref(false)
const workflowNav = ref<HTMLElement>()
const loading = ref(false)
const activeJob = ref<Job | null>(null)
const input = ref<HTMLInputElement | null>(null)
const datasetId = ref('')
const mechanismId = ref('')
const draftId = ref('')
const selectedFileId = ref('')
const fileEnabled = ref<Record<string, boolean>>({})
const mappings = ref<Record<string, Mapping[]>>({})
const useStandard = ref<Record<string, boolean>>({})
const zoneCount = ref(6)
const burnerCount = ref(6)
const kilnCode = ref('KILN-01')
const flowConfirmed = ref(false)
const acknowledge = ref(false)
const parameters = ref<Parameters>({ ...defaults })
const provenance = ref<Record<string, string>>({})
const templateKeys = ref([...initialTemplates])
const activeTemplate = ref('energy')
const mechanismDetailsPanel = ref<HTMLElement | null>(null)
const mechanismTitle = ref('窑炉机理参数方案')
const notes = ref('')
const parentId = ref<string | null>(null)
const calibrationExperimentId = ref<string | null>(null)
const assumptionsAccepted = ref(false)
const library = ref<Mechanism[]>([])
const catalog = ref<CatalogVersion[]>([])
const catalogOpen = ref(false)
const knowledgeOpen = ref(false)
const catalogCompareKey = ref('')
const catalogLoading = ref(false)
const catalogError = ref('')
const catalogSelections = ref<Record<string, string>>({})
const catalogAlternatives = ref<string[]>([])
let catalogRequest = 0
const source = ref<Source | null>(null)
const showGuide = ref(false)
const config = ref<ExperimentConfig>({ ...initialExperiment, lockedParameters: [] })
const experimentId = ref('')
const replay = ref<ReplayPackage>()
const showBacktest = ref(false)
// 演示模式（默认，面向客户，只看结果与回放）/ 专家模式（工程师可改参数、看技术明细）
const expertMode = ref(false)
const replayExperimentSettings = ref<HTMLDetailsElement | null>(null)
const comparisonId = ref('')
const chartSplit = ref<'validation' | 'test'>('validation')
const selections = ref<Partial<Record<Task, Selection>>>({})
const pendingAlgorithm = ref<AlgorithmKey>()
const algorithmLibraryOpen = ref(false)
const algorithmLibraryFocus = ref('')
const advice = ref<AlgorithmRecommendationResponse>()
const adviceLoading = ref(false)
const adviceError = ref('')
let adviceRequest: AbortController | undefined
const savedAdvice = new Map<string, AlgorithmRecommendationResponse>()
const confidenceLabels = { high: '高', medium: '中', low: '低' }
const splitGuide: Record<string, { label: string; purpose: string }> = {
  训练: { label: '训练集', purpose: '用较早的记录建立模型。' },
  验证: { label: '验证集', purpose: '用随后一段记录比较模型并调整参数。' },
  测试: { label: '测试集', purpose: '用最后留出的记录核对预测与实测的偏差。' },
}
const bundleTitle = ref('窑炉预测组合模型')
const bundleId = ref('')
const baseBundleId = ref('')
const addedBundleTask = ref<Task>()
const dashboardTask = ref<Task>()
const bundleComposition = ref<HTMLDetailsElement>()
const cursorFraction = ref(.6)
const temperatureOffset = ref(0)
const simulation = ref<Simulation | null>(null)
let pollTimer: ReturnType<typeof setTimeout> | undefined
let pollSequence = 0
let loadSequence = 0
let disposed = false
let equipmentApplied = false

// 岭回归 α 实际范围 0.001–10000，跨度很大；滑块用对数刻度（0–100 的位置映射到对数空间），避免小数值挤在一起
const RIDGE_ALPHA_MIN = 0.001
const RIDGE_ALPHA_MAX = 10000
const ridgeAlphaSlider = computed<number>({
  get: () => {
    const current = Math.log10(config.value.ridgeAlpha || RIDGE_ALPHA_MIN)
    const lo = Math.log10(RIDGE_ALPHA_MIN), hi = Math.log10(RIDGE_ALPHA_MAX)
    return ((current - lo) / (hi - lo)) * 100
  },
  set: (position: number) => {
    const lo = Math.log10(RIDGE_ALPHA_MIN), hi = Math.log10(RIDGE_ALPHA_MAX)
    config.value.ridgeAlpha = Number(Math.pow(10, lo + (position / 100) * (hi - lo)).toFixed(4))
  },
})

// 恢复实验默认参数：保留当前数据/机理选择与已选算法，只把窗口和模型设置还原为初始值
function resetExperimentConfig() {
  config.value.historyMinutes = initialExperiment.historyMinutes
  config.value.ridgeAlpha = initialExperiment.ridgeAlpha
  config.value.boostingRounds = initialExperiment.boostingRounds
  config.value.learningRate = initialExperiment.learningRate
  config.value.calibrate = initialExperiment.calibrate
  config.value.lockedParameters = []
}

const project = computed(() => state.value?.project)
const dataset = computed(() => state.value?.datasets.find(x => x.id === datasetId.value))
const mechanism = computed(() => state.value?.mechanisms.find(x => x.id === mechanismId.value))
const draft = computed(() => state.value?.drafts.find(x => x.id === draftId.value))
const selectedFile = computed(() => project.value?.files.find(x => x.id === selectedFileId.value))
const dataFiles = computed(() => project.value?.files.filter(x => x.kind === 'table') ?? [])
const unexpandedZips = computed(() => project.value?.files.filter(x => /\.zip$/i.test(x.path) && x.status === 'unsupported') ?? [])
const catalogById = computed(() => new Map(catalog.value.map(item => [item.id, item])))
const pendingCatalogCount = computed(() => catalog.value.filter(item => item.status === 'pending').length)
const comparisonCatalog = computed(() => catalog.value.filter(item =>
  !item.sourcePlan || item.sourcePlan.id !== mechanismId.value || Object.values(catalogSelections.value).includes(item.id)))
const currentCatalog = computed(() => {
  const items: Record<string, CatalogVersion> = {}
  for (const item of catalog.value) if (item.status === 'builtin') items[item.key] = item
  for (const [key, id] of Object.entries(catalogSelections.value)) {
    const selected = catalogById.value.get(id)
    if (selected) items[key] = selected
  }
  for (const [key, item] of Object.entries(items)) {
    const parameterValues: Partial<Parameters> = {}
    const parameterSources: CatalogVersion['parameterSources'] = {}
    const evidence = item.status === 'builtin' ? projectMechanismEvidence(key) : item.evidence
    for (const param of item.parameterDefinitions) {
      if (item.status !== 'builtin' && (!item.task || !templateKeys.value.includes(key)) && item.parameterValues[param.key] !== undefined) {
        parameterValues[param.key] = item.parameterValues[param.key]
        parameterSources[param.key] = item.parameterSources?.[param.key] ?? '库机理版本'
        continue
      }
      parameterValues[param.key] = parameters.value[param.key]
      const source = provenance.value[param.key]
      const document = evidence.find(entry => entry.id === source)
      parameterSources[param.key] = document ? `${document.file} · ${document.location}`
        : source?.startsWith('experiment:') ? '训练集标定'
          : source?.startsWith('history:') ? '历史机理参数'
            : source?.startsWith('catalog:') ? item.parameterSources?.[param.key] ?? '库机理版本'
              : '人工输入或假设'
    }
    items[key] = { ...item, parameterValues, parameterSources, evidence }
  }
  return items
})
const catalogMatches = computed(() => Object.fromEntries(Object.entries(currentCatalog.value)
  .map(([key, item]) => [key, matchingCatalogVersions(comparisonCatalog.value, item)])))
const activeCatalogVersion = computed(() => currentCatalog.value[activeTemplate.value])
const activeTemplateDefinition = computed(() => state.value?.templates.find(item => item.key === activeTemplate.value))
const currentTemplate = computed(() => activeCatalogVersion.value ?? activeTemplateDefinition.value)
const scopeTemplates = computed(() => (state.value?.templates ?? []).map(template => {
  const item = currentCatalog.value[template.key]
  return {
    ...template,
    name: item?.name ?? template.name,
    explanation: item?.explanation ?? template.explanation,
    formula: item?.formula ?? template.formula,
    variables: item?.variables ?? template.variables,
    check: item?.check ?? template.check,
    version: draft.value && item?.status === 'builtin' ? '资料草稿' : item?.version,
    solverIssue: item ? catalogUseIssue(item, true) : '',
    referenceOnly: !!template.task && !!item && !item.solverSupported,
  }
}))
const extraMechanisms = computed(() => Object.values(currentCatalog.value).filter(item => !item.templateKey))
const enabledSolvers = computed(() => state.value?.templates.filter(item => item.task && templateKeys.value.includes(item.key)).length ?? 0)
const collectedMechanisms = computed(() => new Set([...templateKeys.value, ...Object.keys(catalogSelections.value)]).size - enabledSolvers.value)
const mechanismCoverage = computed(() => {
  const current = dataset.value
  if (!current) return []
  const totals = new Map<string, number>()
  for (const file of current.summary) {
    for (const { key, present } of file.fields ?? []) totals.set(key, (totals.get(key) ?? 0) + present)
  }
  const zones = Array.from({ length: current.config.zoneCount }, (_, i) => i + 1)
  return [
    { label: '实测温区', value: `${zones.filter(n => totals.has('z' + n + '_temp')).length} / ${zones.length}` },
    ...([['温度设定', 'temp_sp'], ['燃气流量', 'gas'], ['助燃风流量', 'air'], ['窑压', 'pressure'], ['氧含量', 'o2']] as const).map(
      ([label, key]) => ({ label, value: current.rowCount ? `${Math.round((totals.get(key) ?? 0) * 100 / current.rowCount)}%` : '—' }),
    ),
  ]
})
const parameterDefs = computed(() => {
  const keys = activeCatalogVersion.value?.parameterDefinitions.map(item => item.key) ?? activeTemplateDefinition.value?.parameters ?? []
  return state.value?.parameterDefinitions.filter(item => keys.includes(item.key)) ?? []
})
const canEditActiveParameters = computed(() => !!currentTemplate.value?.task
  && templateKeys.value.includes(activeTemplate.value)
  && (activeCatalogVersion.value?.solverSupported ?? true))
const referenceParameters = computed(() => catalogById.value.get(catalogSelections.value[activeTemplate.value] ?? '')?.parameterValues)
const experiments = computed(() => state.value?.experiments.filter(x => x.datasetId === datasetId.value && x.config.task === config.value.task) ?? [])
const comparison = computed(() => state.value?.experiments.find(x => x.id === comparisonId.value))
const bundle = computed(() => state.value?.bundles.find(x => x.id === bundleId.value))
const baseBundle = computed(() => state.value?.bundles.find(item => item.id === baseBundleId.value))
const running = computed(() => busy.value || ['queued', 'running'].includes(activeJob.value?.status ?? ''))
const mechanismDirty = computed(() => !!mechanism.value && (
  !samePhysicsParameters(parameters.value, mechanism.value.parameters) || !sameTemplateSelection(templateKeys.value, mechanism.value.templateKeys)
  || !sameTemplateSelection(Object.entries(catalogSelections.value).map(([key, id]) => key + ':' + id),
    Object.entries(mechanism.value.catalogSelections ?? {}).map(([key, id]) => key + ':' + id))
  || !sameTemplateSelection(catalogAlternatives.value, mechanism.value.catalogAlternatives ?? [])
))
const currentConfig = computed<ExperimentConfig>(() => ({ ...config.value, datasetId: datasetId.value, mechanismId: mechanismId.value }))
const algorithmsByKey = computed(() => new Map(state.value?.algorithmLibrary.map(item => [item.key, item]) ?? []))
const comparisonHorizons = computed(() => {
  const { task, zone, horizonMinutes } = currentConfig.value
  const imported = [...algorithmsByKey.value.values()].flatMap(({ external }) =>
    external && external.task === task && external.zone === zone ? [external.horizonMinutes] : [])
  return [...new Set([1, 5, 10, 15, 30, 60, horizonMinutes, ...imported])].sort((a, b) => a - b)
})
const comparisonAlgorithmKeys = computed(() => config.value.selectedAlgorithmKeys
  ?? [...algorithmsByKey.value.values()].filter(item => item.status === 'enabled' && !item.baseKey && !item.external).map(item => item.key))
const comparisonAlgorithms = computed(() => comparisonAlgorithmKeys.value.flatMap(key => {
  const item = algorithmsByKey.value.get(key)
  return item ? [item] : []
}))
const hasTaskMechanism = computed(() => templateKeys.value.includes(
  { temperature: 'thermal', energy: 'energy', afr: 'combustion' }[config.value.task],
))
const experiment = computed(() => experiments.value.find(x => x.id === experimentId.value)
  ?? experiments.value.find(x => sameExperimentConfig(currentConfig.value, x.config))
  ?? experiments.value[0])
const qualityChoice = ref<{ experimentId: string; algorithm: AlgorithmKey }>()
const qualityAlgorithms = computed(() => experiment.value?.algorithms.filter(item => hasUsableBacktest(item)) ?? [])
const qualityModel = computed({
  get: () => {
    const saved = selections.value[experiment.value?.config.task ?? 'temperature']
    const preferred = qualityChoice.value?.experimentId === experiment.value?.id ? qualityChoice.value?.algorithm
      : saved?.experimentId === experiment.value?.id ? saved?.algorithm : undefined
    return qualityAlgorithms.value.find(item => item.key === preferred)?.key ?? qualityAlgorithms.value[0]?.key ?? ''
  },
  set: (algorithm: AlgorithmKey) => { if (experiment.value) qualityChoice.value = { experimentId: experiment.value.id, algorithm } },
})
const replayDataset = computed(() => state.value?.datasets.find(x => x.id === experiment.value?.datasetId))
const replayMechanism = computed(() => state.value?.mechanisms.find(item => item.id === experiment.value?.mechanismId))
const replayTemplate = computed(() => {
  const task = experiment.value?.config.task
  const key = task && { temperature: 'thermal', energy: 'energy', afr: 'combustion' }[task]
  return state.value?.templates.find(item => item.key === key)
})
const replayMechanismRevision = computed(() => {
  const key = replayTemplate.value?.key
  const revision = key && replayMechanism.value?.catalogSelections?.[key]
  return revision ? catalogById.value.get(revision) : undefined
})
const replayVisible = computed(() => step.value === 'experiment' && !!experiment.value && !!replayDataset.value)
// 第3步（机理与参数）起进入专注模式：左右面板默认收起，可通过工具条手动展开，功能不丢失
const focusSteps: Step[] = ['mechanism', 'experiment', 'bundle', 'knowledge']
const focusMode = computed(() => focusSteps.includes(step.value))
const leftPanelOpen = ref(false)
const rightPanelOpen = ref(false)
// 非专注步骤面板常显；专注步骤仅在展开且非 bundle/replay 时显示
const showLeftPanel = computed(() => !focusMode.value ||
  (leftPanelOpen.value && step.value !== 'bundle' && !replayVisible.value))
const showRightPanel = computed(() => !focusMode.value ||
  (rightPanelOpen.value && step.value !== 'bundle' && !replayVisible.value))
// 工作区布局：非专注用默认三栏；专注时按展开情况给列，两侧都收起则单列
const workspaceLayout = computed(() => {
  if (!focusMode.value) return ''
  if (step.value === 'bundle' || replayVisible.value) return 'forecast-layout'
  if (leftPanelOpen.value && rightPanelOpen.value) return 'panels-both'
  if (leftPanelOpen.value) return 'panels-left'
  if (rightPanelOpen.value) return 'panels-right'
  return 'forecast-layout'
})
const comparisonOptions = computed(() => {
  const current = experiment.value
  return current ? experiments.value.filter(x => x.id !== current.id && x.config.zone === current.config.zone &&
    x.config.horizonMinutes === current.config.horizonMinutes && x.config.historyMinutes === current.config.historyMinutes) : []
})
const experimentCurrent = computed(() => {
  if (!experiment.value || mechanismDirty.value) return false
  return sameExperimentConfig(currentConfig.value, experiment.value.config)
})
const selectionContext = computed(() => JSON.stringify([
  projectId.value, mechanismDirty.value,
  Object.entries({ ...currentConfig.value, lockedParameters: [...currentConfig.value.lockedParameters].sort(),
    selectedAlgorithmKeys: currentConfig.value.selectedAlgorithmKeys?.slice().sort() ?? null }).sort(([left], [right]) => left.localeCompare(right)),
]))
const adviceContext = computed(() => JSON.stringify([
  projectId.value, experiment.value?.id ?? selectionContext.value,
]))
const advicePrimary = computed(() => advice.value?.algorithmCards.find(item => item.key === advice.value?.recommendation.primaryKey))
const advisoryTest = computed(() => advicePrimary.value?.backtestStatus === 'backtested' && experiment.value
  ? experiment.value.algorithms.find(item => item.key === advicePrimary.value?.key)?.test
  : undefined)
const adviceReasons = computed(() => [...new Set([
  ...(advice.value?.recommendation.reasons ?? []),
  ...(advicePrimary.value?.whyNow ? [advicePrimary.value.whyNow] : []),
])].slice(0, 3))
const experimentBlockReason = computed(() => {
  if (!dataset.value) return '请先到“数据确认”保存并选择数据版本。'
  if (!mechanism.value) return '请先到“机理与参数”保存机理，再在上方选择该机理版本。'
  if (mechanism.value.datasetId !== datasetId.value) return '所选机理属于其他数据版本，请选择当前数据版本的机理，或从知识库复用并另存。'
  if (mechanismDirty.value) return '当前机理参数或机理清单有未保存的修改。请返回“机理与参数”保存新版本，或点击“恢复已保存参数”。'
  if (!comparisonAlgorithmKeys.value.length) return '请从算法库加入至少一个算法。'
  if (comparisonAlgorithmKeys.value.some(key => algorithmsByKey.value.get(key)?.status !== 'enabled')) return '对比清单含已停用或不可用的算法，请从清单移出后运行。'
  const incompatible = comparisonAlgorithms.value.find(item => externalAlgorithmIssue(item, currentConfig.value))
  if (incompatible) return `${incompatible.name} · ${externalAlgorithmIssue(incompatible, currentConfig.value)}。请调整实验设置或将该模型移出本次对比。`
  return ''
})
const experimentValid = computed(() => !experimentBlockReason.value)
function projectMechanismEvidence(key: string) {
  if (draft.value) return draft.value.evidence[key] ?? []
  const items = [...(mechanism.value?.evidence[key] ?? []), ...(mechanism.value?.inheritedEvidence?.[key] ?? [])]
  return [...new Map(items.map(item => [item.id, item])).values()]
}
const activeEvidence = computed(() => activeCatalogVersion.value?.evidence ?? projectMechanismEvidence(activeTemplate.value))
const summaryCounts = computed(() => ({ files: project.value?.files.length ?? 0, rows: dataset.value?.rowCount ?? 0, experiments: state.value?.experiments.length ?? 0, versions: state.value?.mechanisms.length ?? 0 }))
const taskList: Task[] = ['temperature', 'energy', 'afr']
const selectedCount = computed(() => Object.keys(selections.value).length)
const statusLabel: Record<string, string> = { uploaded: '等待解析', parsing: '解析中', parsed: '解析完成', ready: '已解析', confirm: '待确认', unsupported: '暂不支持', failed: '失败', queued: '已排队', running: '执行中', succeeded: '已完成', interrupted: '已中断' }

function time(value: string) {
  if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 16)
  return value?.replace('T', ' ').slice(0, 16)
}
function message(err: unknown) { return err instanceof Error ? err.message : '操作失败，请重试' }
async function action(fn: () => Promise<void>) {
  if (busy.value) return
  error.value = ''; notice.value = ''; busy.value = true
  try { await fn() } catch (err) { error.value = message(err) } finally { busy.value = false }
}
async function refreshProjects() { projects.value = (await studioGet<{ items: Project[] }>('/projects')).items }
async function refreshProject(id = projectId.value) {
  if (!id) return
  const seq = ++loadSequence
  const next = await studioGet<StudioState>(`/projects/${id}`)
  if (disposed || seq !== loadSequence || projectId.value !== id) return
  state.value = next
  if (!equipmentApplied && next.project.status === 'parsed' && !next.datasets.length) {
    zoneCount.value = next.project.equipmentSuggestion?.zoneCount ?? 6
    burnerCount.value = next.project.equipmentSuggestion?.burnerCount ?? 6
    equipmentApplied = true
  }
  next.project.files.forEach(file => {
    if (!(file.id in mappings.value)) mappings.value[file.id] = JSON.parse(JSON.stringify(file.mapping ?? [])) as Mapping[]
    if (!(file.id in fileEnabled.value)) fileEnabled.value[file.id] = file.kind === 'table' && ['ready', 'confirm'].includes(file.status)
    if (!(file.id in useStandard.value)) useStandard.value[file.id] = !!file.standard
  })
  if (!next.datasets.some(x => x.id === datasetId.value)) datasetId.value = next.datasets[0]?.id ?? ''
  if (!next.project.files.some(x => x.id === selectedFileId.value)) selectedFileId.value = next.project.files[0]?.id ?? ''
  if (!next.bundles.some(x => x.id === bundleId.value)) bundleId.value = next.bundles[0]?.id ?? ''
}
async function openProject(id: string) {
  knowledgeOpen.value = false
  clearTimeout(pollTimer); pollSequence++; loadSequence++; state.value = null; activeJob.value = null; equipmentApplied = false
  datasetId.value = ''; mechanismId.value = ''; draftId.value = ''; experimentId.value = ''; comparisonId.value = ''; bundleId.value = ''; selectedFileId.value = ''; source.value = null; selections.value = {}; simulation.value = null
  baseBundleId.value = ''; addedBundleTask.value = undefined; dashboardTask.value = undefined
  mappings.value = {}; fileEnabled.value = {}; useStandard.value = {}; parameters.value = { ...defaults }; provenance.value = {}; parentId.value = null; calibrationExperimentId.value = null; assumptionsAccepted.value = false
  templateKeys.value = [...initialTemplates]; activeTemplate.value = 'energy'; mechanismTitle.value = '窑炉机理参数方案'; notes.value = ''
  catalogSelections.value = {}; catalogAlternatives.value = []; catalogOpen.value = false
  algorithmLibraryOpen.value = false
  algorithmLibraryFocus.value = ''
  config.value = { ...initialExperiment, lockedParameters: [] }; chartSplit.value = 'validation'
  zoneCount.value = 6; burnerCount.value = 6; acknowledge.value = false; flowConfirmed.value = false; projectId.value = id; step.value = 'archive'; loading.value = !!id
  try {
    if (requestedProjectId.value !== id) {
      await router.replace({ query: { ...route.query, project: id || undefined, prepare: undefined, dataset: undefined, validationRelease: undefined, libraryOrigin: undefined, openLibrary: undefined, publishedAlgorithm: undefined } })
    }
    if (!id || disposed) return
    await refreshProject(id)
    if (disposed || requestedProjectId.value !== id) return
    const loaded = state.value as StudioState | null
    const origin = route.query.openLibrary === '1'
      ? readAlgorithmLibraryOrigin(route.query.libraryOrigin, auth.user?.id)
      : undefined
    const restored = origin && loaded ? matchAlgorithmLibraryOrigin(origin, loaded) : undefined
    if (restored?.dataset) datasetId.value = restored.dataset.id
    if (validationRelease.value) {
      const requestedDataset = loaded?.datasets.find(item => item.id === route.query.dataset)
      if (requestedDataset) datasetId.value = requestedDataset.id
      if (route.query.prepare === 'data' || route.query.prepare === 'mechanism') step.value = route.query.prepare
    }
    const pending = loaded?.jobs.find(x => ['queued', 'running'].includes(x.status))
    if (pending) watchJob(pending)
    else activeJob.value = loaded?.jobs[0] ?? null
    const saved = restored?.mechanism ?? loaded?.mechanisms.find(x => x.datasetId === datasetId.value)
    if (saved) loadMechanism(saved)
    else if (loaded?.drafts[0]) loadDraft(loaded.drafts[0])
    if (dataset.value) { zoneCount.value = dataset.value.config.zoneCount; burnerCount.value = dataset.value.config.burnerCount; kilnCode.value = dataset.value.config.kilnCode; flowConfirmed.value = true }
    if (restored && origin) {
      config.value = { ...origin.config, datasetId: datasetId.value, mechanismId: mechanismId.value }
      experimentId.value = restored.experiment?.id ?? ''
      algorithmLibraryFocus.value = typeof route.query.publishedAlgorithm === 'string' ? route.query.publishedAlgorithm : ''
      step.value = 'experiment'
      algorithmLibraryOpen.value = true
    }
  } finally { loading.value = false }
}
function returnToUpload() {
  void action(() => openProject(''))
}
function watchJob(job: Job) {
  activeJob.value = job
  const id = projectId.value
  const seq = ++pollSequence
  const isCurrent = () => !disposed && seq === pollSequence
  clearTimeout(pollTimer)
  let failures = 0
  const poll = async () => {
    if (!isCurrent()) return
    try {
      const next = await studioGet<Job>(`/assets/${job.id}`)
      if (!isCurrent()) return
      if (next.status === 'succeeded' && next.operation === 'replay' && next.resultId) {
        try {
          const result = await getReplay(next.resultId)
          if (isCurrent() && result.request.experimentId === experiment.value?.id) replay.value = result
        } catch (err) {
          if (isCurrent()) error.value = `暂时无法打开回放：${message(err)}`
        } finally {
          if (isCurrent()) activeJob.value = next
        }
        return
      }
      activeJob.value = next; failures = 0
      if (['queued', 'running'].includes(next.status)) { pollTimer = setTimeout(poll, 1400); return }
      await refreshProject(id)
      if (!isCurrent()) return
      if (next.status === 'failed') { error.value = next.error ?? '任务失败'; return }
      if (next.status === 'succeeded') {
        let completionNotice = '任务已完成，结果已保存，可刷新后继续。'
        if (next.operation === 'mechanisms') {
          const result = state.value?.drafts.find(x => x.id === next.resultId)
          if (result && result.datasetId === datasetId.value) { loadDraft(result); step.value = 'mechanism' }
          else completionNotice = '机理候选已保存。当前数据版本已切换，未覆盖当前配置。'
        } else if (next.operation === 'experiment') {
          const result = state.value?.experiments.find(x => x.id === next.resultId)
          const matches = result && !mechanismDirty.value && sameExperimentConfig(currentConfig.value, result.config)
          if (matches) {
            const pending = pendingAlgorithm.value
            openExperiment(result); step.value = 'experiment'
            if (pending && useBacktestedAlgorithm(pending)) {
              completionNotice = `回测已完成，已选用 ${algorithmName(pending)}。`
            } else if (pending) {
              completionNotice = '回测已保存。待选算法没有当前可用的回测结果，请查看卡片上的原因。'
            }
            pendingAlgorithm.value = undefined
          }
          else completionNotice = '实验已保存到历史记录。当前配置已变化，未用后台结果覆盖新配置。'
        } else if (next.operation === 'knowledge_recognition' || (next.operation === 'parse' && knowledgeOpen.value)) {
          await refreshProjects()
          await refreshCatalog()
          completionNotice = next.message
        } else if (next.operation !== 'replay') {
          step.value = 'data'
          await refreshProjects()
          if (isCurrent()) {
            void refreshCatalog()
            completionNotice = '资料已解析。可在机理库查看本次识别出的待审核机理。'
          }
        }
        if (isCurrent()) notice.value = completionNotice
      }
    } catch (err) {
      if (!isCurrent()) return
      if (++failures < 4) pollTimer = setTimeout(poll, 2500)
      else error.value = `暂时无法查询任务：${message(err)}。刷新页面可恢复。`
    }
  }
  pollTimer = setTimeout(poll, 700)
}
async function uploadFiles(files: File[], title = '') {
  const result = await uploadStudio(files, title || files[0]?.name || '窑炉建模项目')
  await refreshProjects(); await openProject(result.projectId); watchJob(result.job)
}
function onFiles(event: Event) {
  const el = event.target as HTMLInputElement
  const files = Array.from(el.files ?? [])
  if (files.length) void action(() => uploadFiles(files))
  el.value = ''
}
function onDrop(event: DragEvent) { const files = Array.from(event.dataTransfer?.files ?? []); if (files.length && !running.value) void action(() => uploadFiles(files)) }
function demo() { void action(async () => uploadFiles([await getDemoFile()], '合成演示 · 四温区燃气窑炉')) }
function setColumn(fileId: string, column: string, event: Event) {
  const field = (event.target as HTMLSelectElement).value
  const list = mappings.value[fileId] ?? []
  const existing = list.find(m => m.column === column)
  mappings.value[fileId] = list.filter(m => m.column !== column)
  if (field) mappings.value[fileId]!.push({ column, field, scale: existing?.scale ?? 1, offset: existing?.offset ?? 0 })
}
function confirm() {
  if (running.value) return
  void action(async () => {
    const id = projectId.value
    savingDataset.value = true
    try {
      const files = dataFiles.value.filter(f => fileEnabled.value[f.id]).map(f => ({ fileId: f.id, mappings: mappings.value[f.id] ?? [], useStandard: useStandard.value[f.id] ?? false }))
      const result = await studioPost<Dataset>(`/projects/${id}/datasets`, { name: `数据版本 ${new Date().toLocaleString('zh-CN')}`, kilnCode: kilnCode.value, zoneCount: zoneCount.value, burnerCount: burnerCount.value, files, acknowledgeConflicts: acknowledge.value, flowBasis: flowConfirmed.value ? 'normal' : 'unknown' })
      if (disposed || projectId.value !== id || !state.value) return
      // The save response is the committed dataset. Avoid waiting for a full project reload.
      clearTimeout(pollTimer); pollSequence++; loadSequence++
      state.value = { ...state.value, datasets: [result, ...state.value.datasets.filter(item => item.id !== result.id)] }
      datasetId.value = result.id; mechanismId.value = ''; experimentId.value = ''; selections.value = {}; draftId.value = ''; assumptionsAccepted.value = false
      catalogSelections.value = {}; catalogAlternatives.value = []
      knowledgeOpen.value = false
      step.value = 'mechanism'
      notice.value = '数据版本已保存，已进入第三步“机理与参数”。'
      await nextTick()
      if (!disposed && projectId.value === id) workflowNav.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } finally { savingDataset.value = false }
  })
}
function interpretFields() { void action(async () => watchJob(await studioPost<Job>(`/projects/${projectId.value}/interpret`, {}))) }
function applyFieldSuggestions() {
  const suggestion = state.value?.mappingDrafts[0]
  if (!suggestion) return
  for (const file of suggestion.files) mappings.value[file.fileId] = JSON.parse(JSON.stringify(file.mappings)) as Mapping[]
  notice.value = '已填入AI建议。请逐项确认测点与单位倍率后，再保存数据版本。'
}
function loadDraft(value: Draft) {
  calibrationExperimentId.value = null
  catalogSelections.value = {}; catalogAlternatives.value = []
  draftId.value = value.id; mechanismId.value = ''; parameters.value = { ...value.parameters }; provenance.value = { ...value.provenance }; templateKeys.value = [...value.templateKeys]; parentId.value = null; assumptionsAccepted.value = false; mechanismTitle.value = '资料机理与参数方案'; notes.value = ''; activeTemplate.value = value.templateKeys[0] ?? 'energy'
}
function generate(mode: 'ai' | 'template') { void action(async () => watchJob(await studioPost<Job>(`/projects/${projectId.value}/mechanisms/generate`, { datasetId: datasetId.value, mode }))) }
function loadMechanism(value: Mechanism) {
  calibrationExperimentId.value = null
  catalogSelections.value = { ...value.catalogSelections }
  catalogAlternatives.value = [...(value.catalogAlternatives ?? [])]
  mechanismId.value = value.id; draftId.value = ''; parameters.value = { ...value.parameters }; provenance.value = { ...value.provenance }; templateKeys.value = [...value.templateKeys]; parentId.value = value.id; notes.value = value.notes; mechanismTitle.value = value.title; assumptionsAccepted.value = false; activeTemplate.value = value.templateKeys[0] ?? 'energy'
}
function editMechanismParameter(key: keyof Parameters, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.valueAsNumber
  if (Number.isFinite(value) && value !== parameters.value[key]) {
    parameters.value[key] = value
    provenance.value[key] = '人工输入/假设'
    assumptionsAccepted.value = false
    calibrationExperimentId.value = null
  }
  input.value = formatKilnParameterInput(parameters.value[key])
}
function saveMechanism() { void action(async () => {
  const result = await studioPost<Mechanism>(`/projects/${projectId.value}/mechanisms`, { datasetId: datasetId.value, title: mechanismTitle.value, templateKeys: templateKeys.value, catalogSelections: catalogSelections.value, catalogAlternatives: catalogAlternatives.value, parameters: parameters.value, provenance: provenance.value, notes: notes.value, parentId: parentId.value, calibrationExperimentId: calibrationExperimentId.value, acceptAssumptions: assumptionsAccepted.value })
  await refreshProject(); loadMechanism(state.value?.mechanisms.find(item => item.id === result.id) ?? result); notice.value = '机理和参数已保存为新版本。标定参数将随实验另行保存，历史版本不会覆盖。'; step.value = 'experiment'
}) }
function openExperiment(value: Experiment) {
  experimentId.value = value.id; config.value = JSON.parse(JSON.stringify(value.config)) as ExperimentConfig; datasetId.value = value.datasetId
  const mech = state.value?.mechanisms.find(x => x.id === value.mechanismId)
  if (mech) loadMechanism(mech)
  comparisonId.value = ''; chartSplit.value = 'validation'
}
function train() { void action(async () => {
  if (experimentBlockReason.value) throw new Error(experimentBlockReason.value)
  watchJob(await studioPost<Job>(`/projects/${projectId.value}/experiments`, currentConfig.value))
}) }
function generateReplay(request: ReplayRequest) { void action(async () => {
  if (!replayVisible.value || request.experimentId !== experiment.value?.id) return
  const project = projectId.value
  const job = await createReplay(project, request)
  if (!disposed && projectId.value === project) watchJob(job)
}) }
function showReplayExperimentSettings() {
  expertMode.value = true  // 需要调整参数时自动进入专家模式，确保设置面板可见
  const settings = replayExperimentSettings.value
  if (!settings) return
  settings.open = true
  settings.scrollIntoView({ block: 'start' })
}
function prepareZoneExperiment(zone: number) {
  config.value.zone = zone
  config.value.horizonMinutes = 30
  if (algorithmsByKey.value.get('lstm')?.status === 'enabled') {
    config.value.selectedAlgorithmKeys = ['lstm']
  }
  showReplayExperimentSettings()
}
function restoreSavedMechanism() {
  if (mechanism.value) loadMechanism(mechanism.value)
}
function promoteCalibration() {
  if (!experiment.value) return
  const exp = experiment.value
  const original = state.value?.mechanisms.find(m => m.id === exp.mechanismId)
  if (!original) return
  loadMechanism(original)
  parameters.value = { ...exp.parameters }
  calibrationExperimentId.value = exp.id
  const calibrated: LockableParameter[] = exp.config.task === 'temperature' ? ['tauMinutes'] : exp.config.task === 'energy' ? ['capacityKJ', 'lossKW'] : []
  for (const key of calibrated) if (exp.config.calibrate && !exp.config.lockedParameters.includes(key)) provenance.value[key] = `experiment:${exp.id}`
  mechanismTitle.value = `${original.title} · 标定参数`
  notes.value = `标定参数来自 ${labels[exp.config.task]} 实验 ${exp.id}，请结合其适用范围复用。`
  step.value = 'mechanism'; assumptionsAccepted.value = false
  notice.value = '已载入本次实验参数，确认后另存为知识版本；原机理与原实验均不改变。'
}
function algorithmName(key: AlgorithmKey | null) {
  if (key === null) return '暂无'
  return state.value?.algorithmLibrary?.find(item => item.key === key)?.name ?? key
}
function toggleComparisonAlgorithm(key: AlgorithmKey) {
  if (running.value) return
  const keys = comparisonAlgorithmKeys.value
  if (keys.includes(key)) {
    config.value.selectedAlgorithmKeys = keys.filter(item => item !== key)
    const options = { ...config.value.algorithmOptions }; delete options[key]
    config.value.algorithmOptions = options
  }
  else if (keys.length < 32) {
    const item = algorithmsByKey.value.get(key)
    if (item?.status !== 'enabled' || externalAlgorithmIssue(item, currentConfig.value)) return
    if (item.capabilities && !item.capabilities.supportedTasks.includes(config.value.task)) return
    if (item.parameterSchema) config.value.algorithmOptions = { ...config.value.algorithmOptions,
      [key]: algorithmParameterDefaults(item, config.value.algorithmOptions?.[key]) }
    config.value.selectedAlgorithmKeys = [...keys, key]
  }
}
function configureAlgorithm(key: string, values: Record<string, AlgorithmOptionValue>) {
  if (running.value) return
  const item = algorithmsByKey.value.get(key)
  if (!item || item.status !== 'enabled' || (item.capabilities && !item.capabilities.supportedTasks.includes(config.value.task))) return
  config.value.algorithmOptions = { ...config.value.algorithmOptions, [key]: values }
  if (!comparisonAlgorithmKeys.value.includes(key)) toggleComparisonAlgorithm(key)
}
function updateAlgorithmLibrary(item: AlgorithmMetadata) {
  if (!state.value) return
  const index = state.value.algorithmLibrary.findIndex(existing => existing.key === item.key)
  if (index < 0) state.value.algorithmLibrary = [item, ...state.value.algorithmLibrary]
  else state.value.algorithmLibrary.splice(index, 1, item)
}
async function refreshAlgorithmLibrary() {
  try {
    const result = await studioGet<{ items: AlgorithmMetadata[] }>('/algorithm-library')
    if (state.value) state.value.algorithmLibrary = result.items
  } catch (err) { error.value = err instanceof Error ? err.message : '算法列表刷新失败' }
}
function openAlgorithmManagement() {
  if (!auth.user || !projectId.value) return
  const libraryOrigin = rememberAlgorithmLibraryOrigin({
    accountId: auth.user.id, projectId: projectId.value, experimentId: experiment.value?.id ?? '',
    config: { ...currentConfig.value, selectedAlgorithmKeys: [...comparisonAlgorithmKeys.value] },
  })
  void router.push({ path: '/algorithm-manage', query: { project: projectId.value, dataset: datasetId.value || undefined, libraryOrigin } })
}
function useBacktestedAlgorithm(key: AlgorithmKey): boolean {
  const current = experiment.value
  if (!current || !experimentCurrent.value) return false
  const definition = state.value?.algorithmLibrary?.find(item => item.key === key)
  const result = current.algorithms.find(item => item.key === key)
  if (definition?.status !== 'enabled' || (result?.version ?? '1') !== definition.version ||
    !hasUsableBacktest(result)) return false
  selections.value = { ...selections.value, [current.config.task]: { experimentId: current.id, algorithm: key } }
  return true
}
function selectAlgorithm(key: AlgorithmKey) {
  if (running.value || !experimentValid.value) return
  if (useBacktestedAlgorithm(key)) {
    pendingAlgorithm.value = undefined
    notice.value = `已选用 ${algorithmName(key)}。`
    return
  }
  pendingAlgorithm.value = key
  notice.value = `已待选 ${algorithmName(key)}。请运行同批算法回测，系统会在结果可用后选用。`
}
function clearAdvice() {
  adviceRequest?.abort()
  adviceRequest = undefined
  advice.value = undefined
  adviceError.value = ''
  adviceLoading.value = false
}
async function requestAdvice(refresh = false) {
  const saved = experiment.value
  if ((!saved && !experimentValid.value) || adviceLoading.value) return
  const context = adviceContext.value
  const cached = saved && savedAdvice.get(context)
  if (!refresh && cached) {
    advice.value = cached
    return
  }
  const request = new AbortController()
  adviceRequest = request
  adviceLoading.value = true
  adviceError.value = ''
  try {
    const result = await recommendAlgorithms(projectId.value, {
      ...(saved?.config ?? currentConfig.value),
      experimentId: saved?.id ?? null,
    }, request.signal, !!saved && !refresh)
    if (!disposed && adviceContext.value === context && adviceRequest === request) {
      if (saved) savedAdvice.set(context, result)
      advice.value = result
    }
  } catch (err) {
    if (!request.signal.aborted && adviceRequest === request) adviceError.value = message(err)
  } finally {
    if (adviceRequest === request) adviceLoading.value = false
  }
}
function selectionLabel(task: Task) {
  const selected = selections.value[task]
  const exp = state.value?.experiments.find(x => x.id === selected?.experimentId)
  return exp ? `${exp.algorithms.find(a => a.key === selected?.algorithm)?.name} · ${exp.config.horizonMinutes} min · 机理 ${exp.mechanismVersion}` : '尚未选用'
}
function selectBundle(id: string) {
  if (running.value) return
  dashboardTask.value = undefined
  bundleId.value = id
}
function bundleOptionLabel(item: Bundle) {
  const coverage = item.manifest.map(model => labels[model.task]).join('、')
  return `${item.title} · ${item.version} · ${coverage} · ${time(item.createdAt)}`
}
async function useBaseBundle(source: Bundle) {
  if (running.value || source.projectId !== projectId.value) return false
  if (!state.value?.datasets.some(item => item.id === source.datasetId)) {
    error.value = '当前版本缺少绑定的数据集，无法用于组合新版本。'
    return false
  }
  if (datasetId.value !== source.datasetId) {
    datasetId.value = source.datasetId
    await nextTick()
  }
  if (disposed || source.id !== bundleId.value || source.projectId !== projectId.value ||
    source.datasetId !== datasetId.value) return false
  if (baseBundleId.value !== source.id) {
    const inherited = Object.fromEntries(source.manifest.map(model => [
      model.task, { experimentId: model.experimentId, algorithm: model.algorithm },
    ]))
    selections.value = { ...selections.value, ...inherited }
    baseBundleId.value = source.id
    addedBundleTask.value = undefined
  }
  error.value = ''
  return true
}
async function inheritBundle() {
  if (!bundle.value || !await useBaseBundle(bundle.value)) return
  if (bundleComposition.value) bundleComposition.value.open = true
}
async function addBundleTask(task: Task) {
  const source = bundle.value
  if (!source || !await useBaseBundle(source)) return
  addedBundleTask.value = task
  config.value.task = task
  config.value.zone = 0
  const preferred = selections.value[task]?.experimentId
  const saved = experiments.value.find(item => item.id === preferred) ?? experiments.value.find(item =>
    item.algorithms.some(algorithm => {
      const definition = algorithmsByKey.value.get(algorithm.key)
      return definition?.status === 'enabled' && (algorithm.version ?? '1') === definition.version &&
        hasUsableBacktest(algorithm)
    })) ?? experiments.value[0]
  if (saved) openExperiment(saved)
  else {
    experimentId.value = ''
    comparisonId.value = ''
    config.value = {
      ...initialExperiment, task, lockedParameters: [],
      selectedAlgorithmKeys: initialExperiment.selectedAlgorithmKeys?.filter(key => {
        const definition = algorithmsByKey.value.get(key)
        return definition?.status === 'enabled' && (definition.capabilities?.supportedTasks.includes(task) ?? true)
      }),
    }
    const savedMechanism = state.value?.mechanisms.find(item => item.datasetId === source.datasetId &&
      source.manifest.some(model => model.mechanismId === item.id))
    if (savedMechanism) loadMechanism(savedMechanism)
  }
  notice.value = `正在为版本 ${source.version} 补充${labels[task]}。选用算法后，返回「模型与看板」生成新版本。`
  step.value = 'experiment'
  await nextTick()
  if (step.value === 'experiment') workflowNav.value?.scrollIntoView({ block: 'start' })
}
function build() { void action(async () => {
  const baseId = baseBundleId.value
  const addedTask = addedBundleTask.value
  const result = await studioPost<Bundle>(`/projects/${projectId.value}/bundles`, {
    title: bundleTitle.value, selections: Object.values(selections.value),
    ...(baseId ? { baseBundleId: baseId } : {}),
  })
  await refreshProject()
  if (disposed || result.projectId !== projectId.value) return
  dashboardTask.value = result.manifest.some(item => item.task === addedTask) ? addedTask : undefined
  if (baseId && baseBundleId.value === baseId) {
    baseBundleId.value = result.id
    addedBundleTask.value = undefined
  }
  bundleId.value = result.id; simulation.value = null; step.value = 'bundle'
  notice.value = `已保存版本 ${result.version}，包含${result.manifest.map(item => labels[item.task]).join('、')}。`
}) }
function runSimulation() { void action(async () => {
  const id = bundleId.value
  const body = { cursorFraction: cursorFraction.value, temperatureOffsetC: temperatureOffset.value }
  const result = await studioPost<Simulation>(`/bundles/${id}/simulate`, body)
  if (id === bundleId.value && body.cursorFraction === cursorFraction.value && body.temperatureOffsetC === temperatureOffset.value) simulation.value = result
  else notice.value = '试算期间输入已变化，请按当前配置重新计算。'
}) }
async function useRefittedBundle(next: Bundle, trained: Experiment) {
  const project = projectId.value
  if (next.projectId !== project || trained.projectId !== project || !state.value) return
  state.value = {
    ...state.value,
    bundles: [next, ...state.value.bundles.filter(item => item.id !== next.id)],
    experiments: [trained, ...state.value.experiments.filter(item => item.id !== trained.id)],
  }
  dashboardTask.value = trained.config.task
  bundleId.value = next.id
  simulation.value = null
  step.value = 'bundle'
  const applied = next.manifest.find(item => item.task === trained.config.task)
  notice.value = applied
    ? `已应用 ${applied.algorithmName}，提前 ${applied.config.horizonMinutes} 分钟。独立测试平均相差 ${formatKilnReading(applied.test.mae, applied.unit)}，综合温差 ${formatKilnReading(applied.test.rmse, applied.unit)}。`
    : '已应用新模型版本。'
  try {
    await refreshProject(project)
  } catch {
    if (projectId.value === project) notice.value += ' 模型已应用，历史列表可稍后刷新。'
  }
}
function openModelPackage() {
  if (!bundle.value || !canOpenModelPackage.value) return
  // 带上当前项目和已保存版本，导出页无需重新查找源模型。
  void router.push({ path: '/model-package', query: { project: projectId.value, bundle: bundle.value.id } })
}
function exportBundle() { void action(async () => {
  const data = await studioGet<unknown>(`/bundles/${bundleId.value}/export`)
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = `kiln-model-${bundle.value?.version ?? 'bundle'}.json`; a.click(); URL.revokeObjectURL(url)
}) }
function refreshLibrary() {
  if (dataset.value) { step.value = 'knowledge'; return }
  void action(async () => { library.value = (await studioGet<{ items: Mechanism[] }>('/knowledge')).items; step.value = 'knowledge' })
}
function openKnowledge() {
  knowledgeOpen.value = true
  void refreshCatalog()
}
async function refreshKnowledge() {
  try { await refreshProject(); await refreshProjects(); await refreshCatalog() }
  catch (err) { error.value = message(err) }
}
async function refreshCatalog() {
  const request = ++catalogRequest
  const suffix = datasetId.value ? '?dataset_id=' + encodeURIComponent(datasetId.value) : ''
  catalogLoading.value = true
  catalogError.value = ''
  try {
    const result = await studioGet<{ items: CatalogVersion[] }>('/mechanism-catalog' + suffix)
    if (request === catalogRequest && !disposed) catalog.value = result.items
  } catch (err) {
    if (request === catalogRequest && !disposed) catalogError.value = message(err)
  } finally {
    if (request === catalogRequest && !disposed) catalogLoading.value = false
  }
}
function openCatalog(key = '') {
  catalogCompareKey.value = key
  catalogOpen.value = true
  void refreshCatalog()
}
function applyCatalogParameters(item: CatalogVersion) {
  for (const { key } of item.parameterDefinitions) {
    const value = item.parameterValues[key]
    if (value === undefined) continue
    parameters.value[key] = value
    provenance.value[key] = 'catalog:' + item.id + ':' + key
  }
}
function useCatalogVersion(item: CatalogVersion) {
  if (!dataset.value || running.value || catalogLoading.value || catalogError.value) return
  if (catalogUseIssue(item, templateKeys.value.includes(item.key))) return
  if (item.projected) {
    const dataset = datasetId.value
    void action(async () => {
      const version = await retainCatalogVersion(item, dataset)
      if (disposed || datasetId.value !== dataset) return
      const issue = catalogUseIssue(version, templateKeys.value.includes(item.key))
      if (issue) throw new Error(issue)
      catalog.value = catalog.value.map(entry => entry.id === version.id ? version : entry)
      applyCatalogVersion(version)
    })
    return
  }
  applyCatalogVersion(item)
}
function applyCatalogVersion(item: CatalogVersion) {
  if (item.status === 'builtin') {
    delete catalogSelections.value[item.key]
  } else {
    catalogSelections.value[item.key] = item.id
    catalogAlternatives.value = catalogAlternatives.value.filter(id => id !== item.id)
    if (item.templateKey && !item.task && !templateKeys.value.includes(item.key)) {
      templateKeys.value.push(item.key)
    }
    if (item.task && templateKeys.value.includes(item.key)) applyCatalogParameters(item)
  }
  activeTemplate.value = item.key
  assumptionsAccepted.value = false
  calibrationExperimentId.value = null
  if (!baseBundleId.value) selections.value = {}
  comparisonId.value = ''
  step.value = 'mechanism'
  catalogOpen.value = false
  notice.value = `已将「${item.name}」${item.version} 应用到当前草稿。请核对后保存方案，已有实验可在历史中查看。`
}
function toggleCatalogAlternative(item: CatalogVersion) {
  if (!dataset.value || running.value || catalogLoading.value || item.status !== 'approved') return
  if (catalogAlternatives.value.includes(item.id)) {
    catalogAlternatives.value = catalogAlternatives.value.filter(id => id !== item.id)
  } else if (catalogSelections.value[item.key] !== item.id) {
    if (item.projected) {
      const dataset = datasetId.value
      void action(async () => {
        const version = await retainCatalogVersion(item, dataset)
        if (disposed || datasetId.value !== dataset) return
        catalog.value = catalog.value.map(entry => entry.id === version.id ? version : entry)
        catalogAlternatives.value.push(version.id)
        notice.value = '已加入当前草稿的备选机理。'
      })
      return
    }
    catalogAlternatives.value.push(item.id)
  }
  notice.value = '已更新当前草稿的备选机理，保存方案后可再次查看。'
}
function removeCatalogSelection(key: string) {
  delete catalogSelections.value[key]
  assumptionsAccepted.value = false
  calibrationExperimentId.value = null
  if (activeTemplate.value === key) activeTemplate.value = templateKeys.value[0] ?? 'energy'
}
function useHistoryVersion(id: string, calibrate: boolean) {
  void action(async () => reuse(await studioGet<Mechanism>(`/assets/${id}`), calibrate))
}
function reuse(value: Mechanism, calibrate: boolean) {
  const suffix = calibrate ? ' · 新数据标定' : ' · 原参数验证'
  loadMechanism(value); mechanismId.value = ''; mechanismTitle.value = value.title.slice(0, 160 - suffix.length) + suffix; notes.value = `复用 ${value.id} / ${value.version}；${calibrate ? '允许训练集重新标定' : '固定旧参数验证'}`; config.value.calibrate = calibrate; step.value = 'mechanism'
  notice.value = '已载入历史机理与参数。请确认兼容性与假设，保存到当前数据版本后再训练比较。'
}
function showSource(id: string) { source.value = project.value?.files.flatMap(f => f.sources).find(s => s.id === id) ?? null }
function retry() { if (activeJob.value) void action(async () => watchJob(await studioPost<Job>(`/jobs/${activeJob.value!.id}/retry`, {}))) }
function reparseProject() { void action(async () => {
  const job = await studioPost<Job>(`/projects/${projectId.value}/reparse`, {})
  await refreshProject()
  watchJob(job)
}) }
function toggleTemplate(key: string) {
  if (templateKeys.value.includes(key)) {
    templateKeys.value = templateKeys.value.filter(item => item !== key)
    if (!currentCatalog.value[key]?.task) delete catalogSelections.value[key]
  } else {
    const selected = currentCatalog.value[key]
    if (selected && catalogUseIssue(selected, true)) return
    templateKeys.value = [...templateKeys.value, key]
    const version = catalogById.value.get(catalogSelections.value[key] ?? '')
    if (version?.task) applyCatalogParameters(version)
  }
  assumptionsAccepted.value = false
  calibrationExperimentId.value = null
}

watch([cursorFraction, temperatureOffset, bundleId], () => { simulation.value = null })
watch(datasetId, (value, old) => {
  if (value === old) return
  selections.value = {}; simulation.value = null; comparisonId.value = ''
  baseBundleId.value = ''; addedBundleTask.value = undefined
  if (old && mechanism.value?.datasetId !== value && draft.value?.datasetId !== value) {
    catalogSelections.value = {}; catalogAlternatives.value = []
    for (const { key } of state.value?.parameterDefinitions ?? []) {
      if (!provenance.value[key]?.startsWith('catalog:')) continue
      parameters.value[key] = defaults[key]
      delete provenance.value[key]
    }
  }
})
watch([projectId, datasetId], () => { void refreshCatalog() }, { immediate: true })
watch(activeTemplate, () => {
  if (step.value === 'mechanism' && mechanismDetailsPanel.value) mechanismDetailsPanel.value.scrollTop = 0
}, { flush: 'post' })
watch(selectionContext, () => { pendingAlgorithm.value = undefined })
watch([step, adviceContext], ([currentStep, context], previous) => {
  if (context !== previous?.[1]) clearAdvice()
  leftPanelOpen.value = false
  rightPanelOpen.value = false
  if (currentStep === 'experiment' && experiment.value) void requestAdvice()
}, { immediate: true })
watch([projectId, () => experiment.value?.id], () => {
  if (replay.value?.request.experimentId !== experiment.value?.id) replay.value = undefined
  showBacktest.value = false
  chartSplit.value = 'validation'
  comparisonId.value = ''
})
watch([requestedProjectId, busy], ([id, working]) => {
  if (!working && route.path === '/kiln-cycles' && id !== projectId.value) void action(() => openProject(id))
})
onMounted(() => { void action(async () => { await refreshProjects(); if (requestedProjectId.value) await openProject(requestedProjectId.value) }) })
onBeforeUnmount(() => { disposed = true; loadSequence++; clearTimeout(pollTimer); clearAdvice() })
</script>

<template>
  <div class="studio space-y-4">
    <input ref="input" type="file" accept=".zip,.xls,.xlsx,.csv,.docx,.pdf,.txt,.md,.png,.jpg,.jpeg" multiple hidden @change="onFiles" />
    <PageHeader title="窑炉机理与预测建模" description="从资料依据出发，构建机理、比较算法，并保存可以复现的模型版本。">
      <template #actions>
        <RouterLink v-if="auth.isAdmin && validationRelease" class="btn" :to="{ path: '/algorithm-manage', query: { release: validationRelease, project: projectId, dataset: datasetId || undefined, libraryOrigin: route.query.libraryOrigin } }"><ArrowLeft :size="14" />返回算法验证</RouterLink>
        <button v-if="project" type="button" class="btn" @click="openKnowledge"><BookOpen :size="14" />知识库</button>
        <button v-if="!project || step !== 'mechanism'" type="button" class="btn" @click="openCatalog()"><BookOpen :size="14" />机理库<span v-if="pendingCatalogCount"> · {{ pendingCatalogCount }} 条待审核</span></button>
        <button class="btn" @click="showGuide = true"><Info :size="14" />演示讲解</button>
        <button class="btn" :disabled="running" title="载入新项目；合成数据不代表现场精度" @click="demo"><Play :size="14" />合成样例</button>
        <button v-if="project" class="btn" :disabled="running" @click="reparseProject"><RotateCcw :size="14" />重新解析资料包</button>
        <RouterLink class="btn" to="/kiln-cycles/legacy"><History :size="14" />原窑次回放</RouterLink>
        <button v-if="projectId" class="btn primary" :disabled="busy || loading" @click="returnToUpload"><ArrowLeft :size="14" />返回上传首页</button>
      </template>
    </PageHeader>

    <div v-if="error" class="feedback error" role="alert"><span>{{ error }}</span><button @click="error = ''"><X :size="15" /></button></div>
    <div v-if="notice" class="feedback success" role="status"><span>{{ notice }}</span><button @click="notice = ''"><X :size="15" /></button></div>

    <div v-if="projects.length || projectId" class="project-bar">
      <div class="flex items-center gap-3 min-w-0"><FolderOpen :size="17" class="text-muted-foreground shrink-0" /><select :value="projectId" class="project-select" :disabled="running" aria-label="选择建模项目" @change="action(() => openProject(($event.target as HTMLSelectElement).value))"><option value="" disabled>打开已保存项目</option><option v-for="item in projects" :key="item.id" :value="item.id">{{ item.title }}</option></select><span v-if="project" class="badge">{{ statusLabel[project.status] ?? project.status }}</span></div>
      <div v-if="project" class="flex gap-5 text-[11px] text-muted-foreground"><span>{{ summaryCounts.files }} 份文件</span><span>{{ fmt(summaryCounts.rows, 0) }} 行数据</span><span>{{ summaryCounts.experiments }} 次实验</span><span>{{ summaryCounts.versions }} 个机理版本</span></div>
    </div>

    <nav v-if="project" ref="workflowNav" class="step-nav" aria-label="建模流程"><button v-for="(item, i) in steps" :key="item.key" :class="{ active: !knowledgeOpen && step === item.key }" @click="knowledgeOpen = false; item.key === 'knowledge' ? refreshLibrary() : step = item.key"><span class="step-number">{{ i + 1 }}</span><span><strong>{{ item.title }}</strong><small>{{ item.subtitle }}</small></span><ChevronRight v-if="i < steps.length - 1" :size="13" class="step-chevron" /></button></nav>

    <div v-if="activeJob" class="job-bar" :class="{ failed: activeJob.status === 'failed' }">
      <Loader2 v-if="['queued', 'running'].includes(activeJob.status)" class="animate-spin" :size="15" /><Check v-else-if="activeJob.status === 'succeeded'" :size="15" /><Info v-else :size="15" />
      <span>{{ activeJob.message }}</span><div class="job-track"><i :style="{ width: activeJob.progress + '%' }" /></div><small>{{ activeJob.progress }}%</small>
      <button v-if="['failed', 'interrupted'].includes(activeJob.status)" class="btn tiny" :disabled="busy" @click="retry"><RotateCcw :size="12" />重试</button>
    </div>

    <div v-if="loading" class="loading"><Loader2 class="animate-spin" :size="22" />正在读取项目与版本…</div>
    <template v-else-if="!project">
      <section class="welcome" @dragover.prevent @drop.prevent="onDrop"><div class="welcome-icon"><FileArchive :size="34" /></div><p class="eyebrow">DOCUMENTS → PHYSICS → MODELS</p><h2>把一份窑炉资料包，变成有依据的预测模型</h2><p>上传工况表、设备说明、测点和工艺资料。先确认数据，再选择机理和参数，最后用真实回测曲线比较算法。</p><div class="flex justify-center gap-3 mt-6"><button class="btn primary" :disabled="running" @click="input?.click()"><Upload :size="15" />上传 ZIP 或资料文件</button><button class="btn" :disabled="running" @click="demo"><Play :size="15" />载入合成演示样例</button></div><small>样例为明确标识的合成数据，用于讲解流程；指标由算法实际训练计算，不代表现场精度。</small></section>
      <div class="intro-grid"><article><span>01 / 资料有来源</span><h3>每个机理都能打开依据</h3><p>文档片段、字段映射与人工假设分别展示，识别冲突后再确认。</p></article><article><span>02 / 算法能解释</span><h3>按预测任务比较算法</h3><p>温度、燃气能耗和空燃比各自实验，展示公式、输入、误差和限制。</p></article><article><span>03 / 经验能复用</span><h3>保留机理与参数版本</h3><p>新数据不覆盖旧知识，可沿用旧参数验证，或使用新数据重新标定。</p></article></div>
    </template>

    <KilnProjectKnowledge v-else-if="knowledgeOpen" :key="project.id" :project="project" :catalog="catalog"
      :disabled="running" :catalog-error="catalogError" @close="knowledgeOpen = false" @catalog="openCatalog()"
      @changed="refreshKnowledge" @job="watchJob" />
    <template v-else>
      <div v-if="focusMode" class="focus-toolbar">
        <button type="button" class="focus-toggle" :aria-expanded="leftPanelOpen" @click="leftPanelOpen = !leftPanelOpen">
          <PanelLeft :size="13" />项目资料
        </button>
        <button type="button" class="focus-toggle" :aria-expanded="rightPanelOpen" @click="rightPanelOpen = !rightPanelOpen">
          <PanelRight :size="13" />{{ step === 'mechanism' ? '机理参数与依据' : '建模依据与选型' }}
        </button>
      </div>
      <div class="workspace" :class="workspaceLayout">
        <aside v-if="showLeftPanel" class="left-panel surface">
          <div class="section-head"><span>项目资料</span>
            <span class="head-actions"><span class="text-muted-foreground">{{ project.files.length }}</span>
              <button v-if="focusMode" type="button" class="panel-close" aria-label="收起项目资料" @click="leftPanelOpen = false"><X :size="13" /></button>
            </span></div>
          <div class="file-list"><button v-for="file in project.files" :key="file.id" :class="{ selected: selectedFileId === file.id }" @click="selectedFileId = file.id; if (step !== 'data') step = 'archive'"><FileText :size="14" /><span><strong>{{ file.path }}</strong><small>{{ statusLabel[file.status] }} · {{ file.kind === 'table' ? `${fmt(file.rowCount, 0)} 行` : `${file.sources.length} 个片段` }}</small></span><span class="dot" :class="file.status" /></button><p v-if="!project.files.length" class="hint p-4">资料正在排队处理，完成后显示文件清单。</p></div>
          <div class="section-head border-top"><span>数据版本</span><small>{{ state?.datasets.length }}</small></div>
          <div class="p-3"><select v-model="datasetId" class="control w-full" aria-label="选择数据版本"><option value="" disabled>先完成数据确认</option><option v-for="item in state?.datasets" :key="item.id" :value="item.id">{{ item.title }}</option></select><div v-if="dataset" class="dataset-meta"><span>{{ dataset.config.kilnCode }} · {{ dataset.config.zoneCount }} 温区</span><span>{{ fmt(dataset.rowCount, 0) }} 行 · {{ dataset.summary.length }} 个文件</span><span :class="{ warning: dataset.sourceKind === 'synthetic' }">{{ dataset.sourceKind === 'synthetic' ? '合成演示数据，非现场实测' : '来自用户上传资料' }}</span><span class="mono">{{ dataset.dataHash.slice(0, 12) }}</span></div></div>
          <button class="sidebar-action" @click="refreshLibrary"><History :size="14" /><span>历史方案验证</span><ChevronRight :size="13" /></button>
          <div class="sidebar-note"><Info :size="13" /><p>文档与数据版本固定后，训练和试算使用同一份输入。修改配置需要重新运行对应步骤。</p></div>
        </aside>

        <main class="center-panel min-w-0">
          <template v-if="step === 'archive'">
            <section class="surface"><div class="section-head"><div><h2>资料解析结果</h2><p>工况数值由解析器提取，文档理解保留原文位置。</p></div><button class="btn tiny" :disabled="busy || loading" @click="returnToUpload"><Plus :size="12" />新建资料项目</button></div><div class="p-5">
              <template v-if="selectedFile"><div class="flex items-start justify-between gap-4 mb-4"><div class="min-w-0"><h3 class="break-all">{{ selectedFile.path }}</h3><p class="hint mt-2">{{ selectedFile.message }}</p></div><span class="badge">{{ statusLabel[selectedFile.status] }}</span></div>
                <KilnSourceSignals v-if="selectedFile.kind === 'table' && selectedFile.status !== 'failed'" :project-id="projectId" :file="selectedFile" />
                <div v-else-if="selectedFile.sources.length" class="source-list"><button v-for="fragment in selectedFile.sources" :key="fragment.id" @click="source = fragment"><small>{{ fragment.location }} · {{ fragment.id.slice(-5) }}</small><p>{{ fragment.text }}</p></button></div>
                <div v-else class="empty-inline">{{ selectedFile.status === 'failed' ? '当前文件解析失败，请查看原因并重试任务，或转换为支持的格式后重新上传。' : '原文件已保留；当前没有可以展示的文本或数据。' }}</div>
              </template><p v-else class="hint">选择左侧文件查看解析结果。</p>
            </div></section>
            <section v-if="project.conflicts.length" class="surface p-5"><h3 class="mb-3">需要人工确认的资料信息</h3><p v-for="item in project.conflicts" :key="item" class="warning-note">{{ item }}</p></section>
            <div class="flex justify-end"><button class="btn primary" :disabled="project.status !== 'parsed'" @click="step = 'data'">确认数据与设备<ArrowRight :size="14" /></button></div>
          </template>

          <KilnDataConfirmation v-else-if="step === 'data'" :key="project.id"
            :project="project" :files="dataFiles" :fields="state?.fields ?? []" :dataset="dataset"
            :mapping-draft="state?.mappingDrafts[0]" :unexpanded-zip-count="unexpandedZips.length" :disabled="running" :saving="savingDataset"
            v-model:kiln-code="kilnCode" v-model:zone-count="zoneCount" v-model:burner-count="burnerCount"
            v-model:flow-confirmed="flowConfirmed" v-model:acknowledge="acknowledge"
            v-model:file-enabled="fileEnabled" v-model:use-standard="useStandard" v-model:mappings="mappings"
            @confirm="confirm" @interpret="interpretFields" @apply-suggestions="applyFieldSuggestions"
            @reparse="reparseProject" @source="source = $event" @column="setColumn" />

          <template v-else-if="step === 'mechanism'">
            <KilnProcessBoard v-if="dataset" :key="dataset.id" :dataset="dataset" :initial-cycle="selectedFileId" @mechanism="activeTemplate = $event" />
            <section class="surface p-5"><div class="flex flex-wrap gap-3 justify-between items-center"><div><h2>从资料构建机理候选</h2><p class="hint mt-1">先解释关系与假设，再标定参数；所有计算使用受控求解器。</p></div><div class="flex gap-2"><button class="btn" :disabled="running || !dataset" @click="generate('template')">资料匹配模板</button><button class="btn primary" :disabled="running || !dataset" @click="generate('ai')"><Sparkles :size="14" />AI 理解资料并构建机理</button></div></div><p v-if="!dataset" class="warning-note mt-3">先到“数据确认”保存数据版本。</p><div v-if="draft" class="interpretation"><span class="badge">{{ draft.mode === 'ai' ? `AI 资料解析 · ${draft.llmModel}` : '工程模板匹配 · 未调用大模型' }}</span><p>{{ draft.summary }}</p><p v-if="draft.citationAudit" class="hint mt-2">已核验 {{ draft.citationAudit.verifiedCount }} 条资料引用；已排除 {{ draft.citationAudit.discardedCount }} 条不匹配引用。原文由系统从来源提取，AI关联解释仍需人工确认。</p><button v-for="item in draft.aiEvidence" :key="item.sourceId + item.quote" class="citation" @click="source = item.source">{{ item.source.file }} · {{ item.source.location }}<small>{{ item.reason }}</small></button><p v-for="text in draft.warnings" :key="text" class="hint mt-2">{{ text }}</p></div></section>
            <KilnStudioTopology v-if="!dataset" :zones="zoneCount" :burners="burnerCount" :templates="state?.templates ?? []" :active="activeTemplate" :enabled="templateKeys" @select="activeTemplate = $event" />
            <section class="surface">
              <div class="section-head scope-head"><div><h2>机理清单与求解范围</h2><p>启用 {{ enabledSolvers }} 个求解机理 · 收录 {{ collectedMechanisms }} 个参考关系<span v-if="catalogAlternatives.length"> · {{ catalogAlternatives.length }} 个备选</span></p></div><button type="button" class="btn tiny" @click="openCatalog()"><BookOpen :size="13" />机理库<span v-if="pendingCatalogCount"> · {{ pendingCatalogCount }} 条待审核</span></button></div>
              <div v-if="mechanismCoverage.length" class="scope-coverage" aria-label="当前数据字段覆盖">
                <span v-for="signal in mechanismCoverage" :key="signal.label">{{ signal.label }} <b>{{ signal.value }}</b></span>
              </div>
              <div class="scope-grid">
                <article v-for="item in scopeTemplates" :key="item.key" :class="{ selected: activeTemplate === item.key }" @click="activeTemplate = item.key">
                  <div class="scope-title">
                    <button type="button" :aria-pressed="activeTemplate === item.key">{{ item.name }}</button>
                    <label :title="item.solverIssue" @click.stop><input type="checkbox" :checked="templateKeys.includes(item.key)" :disabled="running || (!templateKeys.includes(item.key) && !!item.solverIssue)" @change="toggleTemplate(item.key)" />{{ item.task ? '启用' : '收录' }}</label>
                  </div>
                  <span class="badge" :class="{ executable: item.task && !item.referenceOnly }">{{ item.referenceOnly ? '参考收录' : item.role }}</span>
                  <span v-if="item.version" class="badge ml-2">{{ item.version }}</span>
                  <p>{{ item.explanation }}</p>
                  <div class="formula">{{ item.formula }}</div>
                  <details><summary>输入、参数与适用条件</summary>
                    <p>{{ item.variables.join(' · ') }}</p>
                    <p v-if="item.parameters.length">{{ state?.parameterDefinitions.filter(def => item.parameters.includes(def.key)).map(def => def.label + ' ' + fmt(parameters[def.key], KILN_PARAMETER_DIGITS) + ' ' + def.unit).join(' · ') }}</p>
                    <p>{{ item.check }}</p>
                  </details>
                  <div class="catalog-card-actions">
                    <small v-if="catalogMatches[item.key]?.[0]" :class="{ recommended: catalogMatches[item.key]?.[0]?.recommends }">{{ catalogMatches[item.key]?.[0]?.text }}</small>
                    <button type="button" class="btn tiny" @click.stop="openCatalog(item.key)">与库版本对比</button>
                    <button v-if="catalogSelections[item.key] && !templateKeys.includes(item.key)" type="button" class="btn tiny" :disabled="running" @click.stop="removeCatalogSelection(item.key)">移除参考版本</button>
                  </div>
                  <small v-if="item.solverIssue" class="hint block mt-2">{{ item.solverIssue }}</small>
                </article>
                <article v-for="item in extraMechanisms" :key="item.key" :class="{ selected: activeTemplate === item.key }" @click="activeTemplate = item.key">
                  <div class="scope-title">
                    <button type="button" :aria-pressed="activeTemplate === item.key">{{ item.name }}</button>
                    <label @click.stop><input type="checkbox" checked :disabled="running" @change="removeCatalogSelection(item.key)" />收录</label>
                  </div>
                  <span class="badge">资料机理 · {{ item.version }}</span>
                  <p>{{ item.explanation }}</p>
                  <div v-if="item.formula" class="formula">{{ item.formula }}</div>
                  <details><summary>输入、参数与适用条件</summary><p>{{ item.variables.join(' · ') }}</p><p>{{ item.parameterNotes }}</p><p>{{ item.check }}</p></details>
                  <div class="catalog-card-actions">
                    <small v-if="catalogMatches[item.key]?.length">{{ catalogMatches[item.key]?.[0]?.text }}</small>
                    <button type="button" class="btn tiny" @click.stop="openCatalog(item.key)">与库版本对比</button>
                  </div>
                </article>
              </div>
            </section>
            <section class="surface p-5 space-y-4"><div class="form-grid"><label>机理与参数版本名称<input v-model="mechanismTitle" class="control" maxlength="160" /></label><label class="span-2">使用说明<input v-model="notes" class="control" placeholder="适用工况、假设与变更原因" maxlength="1500" /></label></div><label class="check-line"><input v-model="assumptionsAccepted" type="checkbox" />我已核对参数及来源，并接受未实测项作为本次试算假设</label><div class="flex flex-wrap items-center justify-between gap-3"><span class="hint">{{ parentId ? '从历史版本派生；保存会新建版本，不覆盖原版本。' : '保存后可在算法库中标定，也可直接沿用参数验证。' }}</span><button class="btn primary" :disabled="running || !dataset || !assumptionsAccepted || !(enabledSolvers + collectedMechanisms)" @click="saveMechanism"><Save :size="14" />保存机理与参数版本</button></div></section>
          </template>

          <template v-else-if="step === 'experiment'">
            <section class="surface conclusion-card" aria-labelledby="kiln-conclusion-title">
              <h2 id="kiln-conclusion-title">选型结论</h2>
              <div class="p-4 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div v-if="advicePrimary"><h3>建议先试用 {{ advicePrimary.name }}</h3><p>{{ advicePrimary.oneLine }}</p></div>
                  <p v-else class="hint">{{ adviceLoading ? '正在根据已保存的实验整理选型结论。' : advice ? '当前记录还不足以给出首选算法。' : '完成算法对比后，这里会给出首选和历史误差。' }}</p>
                  <button type="button" class="btn" :disabled="(!experiment && !experimentValid) || adviceLoading" @click="requestAdvice(true)">
                    <Loader2 v-if="adviceLoading" :size="14" class="animate-spin" /><Sparkles v-else :size="14" />
                    {{ adviceLoading ? '正在整理建议' : advice ? 'AI 补充说明' : '查看建议' }}
                  </button>
                </div>
                <p v-if="adviceError" class="warning-note" role="alert">{{ adviceError }}</p>
                <template v-if="advice">
                  <p v-if="advicePrimary && advisoryTest?.mae != null && advisoryTest.count > 0">
                    {{ experiment?.sourceKind === 'synthetic' ? '在合成演示的测试集上' : '在历史记录的测试集上' }}，提前 {{ experiment?.config.horizonMinutes }} 分钟预测的数值平均与实测相差
                    <strong>{{ formatKilnReading(advisoryTest.mae, experiment?.unit) }}</strong>。
                    <span v-if="advisoryTest.coverage < 1" class="hint">基于有预测结果的 {{ fmt(advisoryTest.coverage * 100, 1) }}% 时刻。</span>
                  </p>
                  <p v-else class="hint">{{ experiment ? '这个建议暂无可展示的历史误差。' : '还没有回测结果。以下为适配建议。' }}</p>
                  <div v-if="adviceReasons.length"><h4>为什么推荐</h4><ul class="list-disc pl-4"><li v-for="reason in adviceReasons" :key="reason">{{ reason }}</li></ul></div>
                  <p v-if="advicePrimary?.benefits.length"><b>能帮你做什么</b> {{ advicePrimary.benefits.join('。') }}</p>
                  <p v-if="advice.recommendation.backupKey">备选 {{ advice.algorithmCards.find(item => item.key === advice?.recommendation.backupKey)?.name ?? algorithmName(advice.recommendation.backupKey) }}</p>
                  <details class="hint">
                    <summary class="cursor-pointer">{{ advice.mode === 'ai' ? 'AI 整理' : '规则建议' }} · 置信度{{ confidenceLabels[advice.recommendation.confidence] }} · 适用范围</summary>
                    <p>{{ advice.recommendation.confidenceBasis }}</p>
                    <p v-for="caveat in advice.recommendation.dataCaveats" :key="caveat">{{ caveat }}</p>
                  </details>
                  <p class="hint">{{ advice.recommendation.disclaimer }}</p>
                </template>
              </div>
            </section>
            <section class="surface">
              <div class="task-tabs">
                <button v-for="task in taskList" :key="task" :class="{ active: config.task === task }"
                  @click="if (config.task !== task) { config.task = task; config.zone = 0; experimentId = '' }">
                  {{ labels[task] }}<Check v-if="selections[task]" :size="13" />
                </button>
              </div>
              <div v-if="experiments.length" class="p-4 flex flex-wrap items-end gap-3">
                <label class="flex-1 min-w-56">使用的实验
                  <select :value="experiment?.id ?? ''" class="control"
                    @change="openExperiment(experiments.find(item => item.id === ($event.target as HTMLSelectElement).value)!)">
                    <option v-for="item in experiments" :key="item.id" :value="item.id">{{ time(item.createdAt) }} · {{ item.title }}</option>
                  </select>
                </label>
                <div v-if="experiment && !experimentCurrent" class="flex flex-wrap items-center gap-2">
                  <span class="hint">正在查看已保存结果</span>
                  <button type="button" class="btn tiny" :disabled="running" @click="openExperiment(experiment)">使用该实验的配置</button>
                </div>
              </div>
            </section>

            <KilnPredictionReplay v-if="replayVisible && experiment && replayDataset" :key="experiment.id"
              :experiment="experiment" :dataset="replayDataset" :replay="replay" :busy="running"
              :mechanism="replayMechanism" :mechanism-template="replayTemplate" :mechanism-revision="replayMechanismRevision"
              :parameter-definitions="state?.parameterDefinitions ?? []"
              :preferred-algorithm="selections[experiment.config.task]?.experimentId === experiment.id ? selections[experiment.config.task]?.algorithm : undefined"
              @generate="generateReplay"
              @configure="experiment.config.task === 'temperature' ? prepareZoneExperiment(experiment.config.zone) : showReplayExperimentSettings()" />
            <p v-else-if="!experiment" class="surface p-5 hint">当前任务还没有已保存的结果。完成一次算法对比后即可查看。</p>
            <p v-else class="surface p-5 hint">当前项目未加载实验对应的数据版本。可展开技术详情查看已保存的对比。</p>

            <section class="surface">
              <div class="section-head">
                <div><h2>本次算法对比</h2><p>{{ labels[config.task] }} · {{ comparisonAlgorithmKeys.length }} 个参选项</p></div>
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="segmented" role="group" aria-label="操作模式">
                    <button type="button" :class="{ active: !expertMode }" @click="expertMode = false">演示模式</button>
                    <button type="button" :class="{ active: expertMode }" @click="expertMode = true">专家模式</button>
                  </div>
                  <button type="button" class="btn" @click="algorithmLibraryOpen = true"><BookOpen :size="14" />算法库</button>
                </div>
              </div>
              <div class="algorithm-comparison">
                <div v-if="comparisonAlgorithmKeys.length" class="algorithm-chips" aria-label="本次对比清单">
                  <span v-for="key in comparisonAlgorithmKeys" :key="key" class="algorithm-chip">
                    <span>{{ algorithmName(key) }}
                      <small v-if="algorithmsByKey.get(key)?.tuning">{{ algorithmTuningLabel(algorithmsByKey.get(key)?.tuning) }}</small>
                      <small v-if="algorithmsByKey.get(key)?.status !== 'enabled'">当前不可用</small>
                    </span>
                    <button type="button" :disabled="running" :aria-label="'移出 ' + algorithmName(key)" @click="toggleComparisonAlgorithm(key)"><X :size="13" /></button>
                  </span>
                </div>
                <p v-else class="hint">从算法库搜索并加入要回测的算法。</p>
                <div class="flex flex-wrap justify-between items-center gap-3">
                  <p class="hint">{{ pendingAlgorithm ? '待选 · ' + algorithmName(pendingAlgorithm) : '使用同一批历史记录比较所选算法的预测表现。' }}</p>
                  <button type="button" class="btn primary" :disabled="running || !experimentValid" @click="train"><FlaskConical :size="14" />运行算法对比</button>
                </div>
                <div v-if="experimentBlockReason && comparisonAlgorithmKeys.length" class="warning-note">
                  <p>{{ experimentBlockReason }}</p>
                  <button v-if="mechanismDirty" class="btn tiny mt-2" :disabled="running" @click="restoreSavedMechanism">恢复已保存参数</button>
                </div>
              </div>
            </section>
            <KilnAlgorithmResults
              v-if="experiment || comparisonAlgorithms.length"
              :library="comparisonAlgorithms"
              :experiment="experiment"
              :selection-matches-experiment="experimentCurrent"
              :split="chartSplit"
              :comparison="comparison"
              :selected="experimentCurrent && selections[config.task]?.experimentId === experiment?.id ? selections[config.task]?.algorithm : undefined"
              :pending="pendingAlgorithm"
              :advice="experimentCurrent || !experiment ? advice?.algorithmCards : undefined"
              :can-select="experimentValid && !running"
              @select="selectAlgorithm"
            />
            <KilnAlgorithmComparisonCharts :key="experiment?.id ?? config.task" :library="state?.algorithmLibrary ?? []" :experiment="experiment" />
            <KilnExperimentRunsTable v-show="expertMode" :experiments="experiments" :active-id="experimentId"
              :unit="experiments[0]?.unit ?? ''" :busy="running" @open="openExperiment" />
            <details v-if="experiment" v-show="expertMode" class="surface result-details" :open="showBacktest"
              @toggle="showBacktest = ($event.currentTarget as HTMLDetailsElement).open">
              <summary>技术详情 · 回测明细 <span class="hint ml-2">查看历史对照、误差和数据划分</span></summary>
              <template v-if="showBacktest">
                <div class="p-4 space-y-3 border-top">
                  <div class="split-summary">
                    <article v-for="item in experiment.split" :key="item.name">
                      <h3>{{ item.name }}集 · {{ splitGuide[item.name]?.label }}</h3>
                      <p>{{ splitGuide[item.name]?.purpose }}</p>
                      <p>{{ fmt(item.count, 0) }} 个可用预测时刻 · {{ time(item.from) }} 至 {{ time(item.to) }}</p>
                    </article>
                  </div>
                  <p class="hint">严格按时间划分学习和检验。每次预测只用预测起点、之前的测点与已知设定。现场表现仍需独立验证。</p>
                  <p v-if="experiment.splitMethod.includes('同窑次')" class="hint">这次在同一窑次内按时间检查，跨窑次的表现仍需核对。</p>
                  <p v-if="chartSplit === 'test'" class="hint">如果参考了测试集选算法，可另留一段新记录做最终核验。</p>
                  <details>
                    <summary class="cursor-pointer">标定参数与输入范围</summary>
                    <p class="hint">{{ experiment.splitMethod }}</p>
                    <p v-for="item in experiment.calibration" :key="item" class="hint">{{ item }}</p>
                    <div class="flex flex-wrap gap-2 my-3">
                      <span v-for="key in (['capacityKJ', 'lossKW', 'tauMinutes'] as const)" :key="key" class="badge">{{ state?.parameterDefinitions.find(p => p.key === key)?.label }} {{ fmt(experiment.parameters[key], KILN_PARAMETER_DIGITS) }}</span>
                    </div>
                    <p v-for="item in experiment.warnings" :key="item" class="hint">{{ item }}</p>
                    <p class="hint">{{ experiment.featureNames.join('、') }}</p>
                    <button type="button" class="btn tiny mt-3" :disabled="running" @click="promoteCalibration"><Save :size="12" />将标定参数存为知识版本</button>
                  </details>
                </div>
                <section aria-label="静态回测曲线">
                    <div class="p-4 border-top flex flex-wrap justify-between gap-3">
                      <div>
                        <h3>预测与实测对比 · {{ labels[experiment.config.task] }} · 提前 {{ experiment.config.horizonMinutes }} 分钟</h3>
                        <p class="hint">同一窑次、同一时刻对齐实测与各算法预测。</p>
                      </div>
                      <div class="segmented">
                        <button :class="{ active: chartSplit === 'validation' }" @click="chartSplit = 'validation'">验证集</button>
                        <button :class="{ active: chartSplit === 'test' }" @click="chartSplit = 'test'">测试集</button>
                      </div>
                    </div>
                    <label v-if="comparisonOptions.length" class="block px-4 pb-3">对照机理
                      <select v-model="comparisonId" class="control">
                        <option value="">不比较</option>
                        <option v-for="item in comparisonOptions" :key="item.id" :value="item.id">{{ item.title }} · {{ time(item.createdAt) }}</option>
                      </select>
                    </label>
                    <KilnStudioChart :key="experiment.id" :experiment="experiment" :split="chartSplit" :comparison="comparison" />
                </section>
                <section v-if="experiment?.config.task === 'temperature' && replayDataset && qualityAlgorithms.length" class="surface p-4 space-y-3" aria-label="算法验收指标">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div><h3>查看这个算法是否满足温度预测要求</h3><p class="hint">切换核验算法，可查看完整留出记录的误差和对应温度曲线。</p></div>
                    <label>核验算法<select v-model="qualityModel" class="control ml-2" aria-label="选择核验算法"><option v-for="item in qualityAlgorithms" :key="item.key" :value="item.key">{{ item.name }}</option></select></label>
                  </div>
                  <KilnTemperatureZoneReview :key="experiment.id" :experiment="experiment" :algorithm="qualityModel"
                    :experiments="experiments" :dataset="replayDataset" :busy="running"
                    train-label="打开该区的 30 分钟训练设置" @train="prepareZoneExperiment" />
                </section>
              </template>
            </details>

            <details ref="replayExperimentSettings" v-show="expertMode" class="surface result-details" :open="!experiment">
              <summary>算法选用与实验设置</summary>
              <div class="p-5 space-y-4">
                <div class="flex gap-3 flex-wrap items-center">
                  <label class="flex-1 min-w-48">使用机理版本
                    <select :value="mechanismId" class="control w-full mt-1" @change="loadMechanism(state!.mechanisms.find(x => x.id === ($event.target as HTMLSelectElement).value)!)">
                      <option value="" disabled>先保存机理与参数</option>
                      <option v-for="item in state?.mechanisms.filter(x => x.datasetId === datasetId)" :key="item.id" :value="item.id">{{ item.title }} · {{ item.version }}</option>
                    </select>
                  </label>
                  <label v-if="config.task === 'temperature'">预测温区
                    <select v-model.number="config.zone" class="control mt-1">
                      <option :value="0">有效温区平均</option>
                      <option v-for="n in dataset?.config.zoneCount ?? 0" :key="n" :value="n">{{ n }} 区</option>
                    </select>
                  </label>
                  <label>训练预测时距
                    <select v-model.number="config.horizonMinutes" class="control mt-1">
                      <option v-for="minutes in comparisonHorizons" :key="minutes" :value="minutes">{{ minutes }} 分钟</option>
                    </select>
                  </label>
                </div>
                <p class="hint">回放要在 5 分钟内显示多个算法预测点时，可按数据采样频率选择 1 分钟时距。采样较疏时，可选择 5 分钟时距。</p>
                <details class="border-top pt-3">
                  <summary class="cursor-pointer text-xs font-semibold">高级设置</summary>
                  <div class="slider-grid mt-4">
                    <div class="slider-field">
                      <div class="slider-head"><span>历史窗口</span><b>{{ config.historyMinutes }} min</b></div>
                      <input v-model.number="config.historyMinutes" type="range" min="5" max="240" step="1" />
                      <p class="slider-note">每次预测参考之前多少分钟的历史记录</p>
                    </div>
                    <div class="slider-field">
                      <div class="slider-head"><span>岭回归 α（对数刻度）</span><b>{{ config.ridgeAlpha }}</b></div>
                      <input v-model="ridgeAlphaSlider" type="range" min="0" max="100" step="0.1" />
                      <p class="slider-note">正则强度：数值越大越抑制过拟合，实际范围 0.001–10000</p>
                    </div>
                    <div class="slider-field">
                      <div class="slider-head"><span>提升树轮数</span><b>{{ config.boostingRounds }}</b></div>
                      <input v-model.number="config.boostingRounds" type="range" min="5" max="120" step="1" />
                      <p class="slider-note">树的数量：越多拟合能力越强，但过多会变慢</p>
                    </div>
                    <div class="slider-field">
                      <div class="slider-head"><span>提升学习率</span><b>{{ config.learningRate }}</b></div>
                      <input v-model.number="config.learningRate" type="range" min="0.01" max="0.5" step="0.01" />
                      <p class="slider-note">每一步的更新幅度：较大收敛快，较小更平稳</p>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <button type="button" class="btn tiny" @click="resetExperimentConfig"><RotateCcw :size="12" />恢复默认参数</button>
                    <div class="flex flex-wrap items-center gap-4">
                      <label class="check-line"><input v-model="config.calibrate" type="checkbox" />仅用训练集重新标定机理参数</label>
                      <label v-for="key in (['capacityKJ', 'lossKW', 'tauMinutes'] as const)" :key="key" class="check-line">
                        <input v-model="config.lockedParameters" type="checkbox" :value="key" />锁定{{ state?.parameterDefinitions.find(p => p.key === key)?.label }}
                      </label>
                    </div>
                  </div>
                </details>
              </div>
            </details>
            <div v-if="selectedCount" class="p-4">
              <button type="button" class="btn primary" @click="step = 'bundle'">确认模型组合<ArrowRight :size="13" /></button>
            </div>
          </template>

          <template v-else-if="step === 'bundle'">
            <section v-if="state?.bundles.length" class="surface p-5">
              <div class="bundle-export-row">
                <label class="bundle-version-field">已生成版本
                  <select :value="bundleId" class="control w-full mt-2" :disabled="running"
                    @change="selectBundle(($event.target as HTMLSelectElement).value)">
                    <option v-for="item in state.bundles" :key="item.id" :value="item.id">{{ bundleOptionLabel(item) }}</option>
                  </select>
                </label>
                <div class="bundle-export-actions">
                  <button type="button" class="btn primary" :disabled="!bundle || !canOpenModelPackage" :title="canOpenModelPackage ? '导出当前已保存的模型版本' : '当前账号未开通模型封装导出菜单权限'" @click="openModelPackage"><Download :size="14" />模型封装导出</button>
                  <p class="hint mt-2">{{ canOpenModelPackage ? 'ONNX 部署包 · JSON · AI Skill · Python' : '当前账号未开通导出页权限，请联系管理员。' }}</p>
                </div>
              </div>
            </section>
            <KilnForecastDashboard v-if="bundle && state" :key="bundle.id" :bundle="bundle" :state="state"
              :initial-task="dashboardTask" @updated="useRefittedBundle" />
            <details ref="bundleComposition" class="surface p-5" :open="!bundle || !!baseBundle">
              <summary class="cursor-pointer font-semibold">组合生成模型版本</summary>
              <p v-if="baseBundle" class="hint mt-2">
                基于版本 {{ baseBundle.version }}<template v-if="addedBundleTask"> · 补充{{ labels[addedBundleTask] }}</template>
                · 使用数据版本 {{ dataset?.title }}
              </p>
              <p v-else class="hint mt-2">可生成单任务或多任务模型。组合中的实验须使用同一数据版本。</p>
              <button v-if="bundle && bundle.id !== baseBundleId" type="button" class="btn mt-2" :disabled="running" @click="inheritBundle">
                带入当前版本 {{ bundle.version }} 的模型
              </button>
              <div class="selection-list">
                <article v-for="task in taskList" :key="task">
                  <span>{{ labels[task] }}</span><strong>{{ selectionLabel(task) }}</strong>
                  <button v-if="selections[task]" type="button" :disabled="running" :aria-label="`移除${labels[task]}`"
                    @click="delete selections[task]"><X :size="13" /></button>
                  <button v-else-if="bundle && !bundle.manifest.some(model => model.task === task)" type="button"
                    class="btn tiny" :disabled="running" :aria-label="`补充${labels[task]}`" @click="addBundleTask(task)">
                    <Plus :size="13" />补充
                  </button>
                </article>
              </div>
              <div class="flex gap-3">
                <input v-model="bundleTitle" class="control flex-1" maxlength="160" aria-label="模型版本名称" />
                <button type="button" class="btn primary" :disabled="running || !selectedCount" @click="build"><Save :size="14" />生成模型版本</button>
              </div>
            </details>
            <template v-if="bundle"><details class="surface"><summary class="cursor-pointer px-5 py-4 font-semibold">模型清单与来源</summary><div class="section-head"><div><h2>{{ bundle.title }}</h2><p>版本 {{ bundle.version }} · {{ bundle.validationStatus }}</p></div><button class="btn tiny" :disabled="busy" @click="exportBundle"><Download :size="13" />导出数值模型</button></div><div class="p-5"><p class="hint">{{ bundle.dataFlow }}</p><article v-for="item in bundle.manifest" :key="item.task" class="manifest-row"><strong>{{ labels[item.task] }} · {{ item.algorithmName }}</strong><p>{{ item.config.horizonMinutes }}分钟 · {{ item.config.zone ? `${item.config.zone}区` : '总管 / 有效均温' }} · 机理 {{ item.mechanismVersion }}</p><p>{{ item.mechanismRole }} · 验证 MAE {{ formatKilnReading(item.validation.mae, item.unit) }}</p><small class="mono">数据 {{ item.dataHash.slice(0, 12) }} · 实验 {{ item.experimentId }}</small></article><p class="hint mono mt-4 break-all">产物 SHA256：{{ bundle.artifactHash }}</p></div></details>
<details v-if="bundle.manifest.some(item => item.task !== 'temperature')" class="surface p-5"><summary class="cursor-pointer font-semibold">燃气与空燃比单点试算</summary><p class="hint mt-2">在最新时间的文件内选择预测起点。温度偏移仅用于有机理响应的温度/能耗模型，结果是工程假设下的试算。</p><div class="form-grid mt-4"><label class="span-2">回放位置 {{ fmt(cursorFraction * 100, 0) }}%<input v-model.number="cursorFraction" type="range" min="0.1" max="0.85" step="0.01" /></label><label>未来设定偏移 / ℃<input v-model.number="temperatureOffset" type="number" min="-100" max="100" class="control" /></label></div><div class="flex justify-end mt-4"><button class="btn primary" :disabled="running" @click="runSimulation"><Play :size="14" />按保存模型计算</button></div><div v-if="simulation" class="mt-5"><p class="hint">预测起点 {{ time(simulation.cursor) }} · 版本 {{ simulation.bundleVersion }}</p><div v-for="item in simulation.outputs.filter(output => output.task !== 'temperature')" :key="item.task" class="simulation-row"><div><strong>{{ labels[item.task] }}</strong><p>{{ item.note }}</p></div><div v-if="item.baseline != null" class="simulation-values"><span>原计划 <b>{{ fmt(item.baseline, kilnReadingDigits(item.unit)) }}</b></span><ArrowRight :size="15" /><span>调整后 <b>{{ fmt(item.adjusted, kilnReadingDigits(item.unit)) }}</b></span><small>{{ item.unit }} · {{ item.horizonMinutes }}min</small></div></div><p class="hint mt-3">{{ simulation.scope }}</p></div></details></template>
          </template>

          <template v-else-if="step === 'knowledge'">
            <KilnMechanismLibrary v-if="dataset && state" :key="dataset.id + ':' + state.mechanisms.length" :project-id="projectId" :dataset="dataset" :current-id="mechanismId" :current-parameters="parameters" :current-template-keys="templateKeys" :descriptions="state.parameterDefinitions" :disabled="running" @use="useHistoryVersion" />
            <template v-else>
            <section class="surface p-5"><h2>历史方案验证</h2><p class="hint mt-2">保存当前项目的数据版本后，可在同一验证集上比较并复用整套历史方案。</p></section>
            <section v-for="item in library" :key="item.id" class="surface p-5"><div class="flex justify-between gap-3"><div><h3>{{ item.title }}</h3><p class="hint mt-2">版本 {{ item.version }} · {{ time(item.createdAt) }} · {{ item.scope.kilnCode }} / {{ item.scope.zoneCount }} 温区</p></div><span class="badge">{{ item.validationStatus }}</span></div><div class="flex flex-wrap gap-2 my-3"><span v-for="key in item.templateKeys" :key="key" class="badge">{{ state?.templates.find(t => t.key === key)?.name ?? key }}</span></div><p v-if="item.notes" class="hint">{{ item.notes }}</p><div class="flex flex-wrap gap-4 text-xs my-4"><span>热容 {{ fmt(item.parameters.capacityKJ) }} kJ/K</span><span>损失 {{ fmt(item.parameters.lossKW, 4) }} kW/K</span><span>响应 {{ fmt(item.parameters.tauMinutes) }} min</span></div><div class="flex flex-wrap gap-2"><button class="btn" :disabled="!dataset || running" @click="reuse(item, true)">用于新数据并重新标定</button><button class="btn" :disabled="!dataset || running" @click="reuse(item, false)">保持旧参数进行验证</button></div></section>
            <div v-if="!library.length" class="surface p-6 hint">还没有保存的机理版本。完成“机理与参数”配置并保存后，即可在这里复用。</div>
            </template>
          </template>
        </main>

        <aside v-if="showRightPanel" ref="mechanismDetailsPanel" class="right-panel surface">
          <div class="section-head"><span><Settings2 :size="14" class="inline mr-2" />{{ step === 'mechanism' ? '机理参数与依据' : '建模依据与选型' }}</span>
            <button v-if="focusMode" type="button" class="panel-close" aria-label="收起侧栏" @click="rightPanelOpen = false"><X :size="13" /></button>
          </div>
          <div v-if="step === 'mechanism'" class="p-4 space-y-4">
            <template v-if="currentTemplate">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3>{{ currentTemplate.name }}</h3>
                  <span v-if="activeCatalogVersion" class="badge">{{ activeCatalogVersion.version }}</span>
                </div>
                <p class="hint mt-2">{{ currentTemplate.role }}</p>
                <p v-if="currentTemplate.explanation" class="hint mt-2">{{ currentTemplate.explanation }}</p>
                <div v-if="currentTemplate.formula" class="formula mt-3">{{ currentTemplate.formula }}</div>
              </div>
              <div v-if="currentTemplate.variables.length">
                <h4>输入与单位</h4>
                <p v-for="variable in currentTemplate.variables" :key="variable" class="hint mt-1">{{ variable }}</p>
              </div>
              <div v-if="currentTemplate.check">
                <h4>适用条件</h4>
                <p class="hint mt-2">{{ currentTemplate.check }}</p>
              </div>
              <div class="border-top pt-4">
                <h4 class="mb-3">{{ canEditActiveParameters ? '参数配置' : '参数参考' }}</h4>
                <p v-if="activeCatalogVersion?.status === 'approved' && activeCatalogVersion.parameterNotes" class="hint mb-3 whitespace-pre-line">{{ activeCatalogVersion.parameterNotes }}</p>
                <p v-if="!parameterDefs.length" class="hint">该机理暂无可配置的数值参数。</p>
                <div v-for="item in parameterDefs" :key="item.key" class="parameter-field">
                  <label v-if="canEditActiveParameters" :for="'mechanism-parameter-' + item.key">{{ item.label }} <small>{{ item.unit }}</small></label>
                  <span v-else>{{ item.label }} <small>{{ item.unit }}</small></span>
                  <template v-if="canEditActiveParameters">
                    <input :id="'mechanism-parameter-' + item.key" :value="formatKilnParameterInput(parameters[item.key])" type="number"
                      :min="bounds[item.key][0]" :max="bounds[item.key][1]" :step="bounds[item.key][2]" class="control" @change="editMechanismParameter(item.key, $event)" />
                    <small v-if="provenance[item.key]?.startsWith('experiment:')" class="parameter-source">来源：训练集标定 · 实验 {{ provenance[item.key]?.slice(11, 19) }}</small>
                    <small v-else-if="provenance[item.key]?.startsWith('history:')" class="parameter-source">来源：历史机理参数 · {{ provenance[item.key]?.slice(8, 16) }}</small>
                    <small v-else-if="provenance[item.key]?.startsWith('catalog:')" class="parameter-source">来源：库机理版本 · {{ provenance[item.key]?.slice(8, 16) }}</small>
                    <button v-else-if="provenance[item.key]?.includes(':')" type="button" class="parameter-source" @click="showSource(provenance[item.key]!)">来源：文档片段 ↗</button>
                    <small v-else class="parameter-source">来源：{{ provenance[item.key] ?? '人工待确认假设' }}</small>
                  </template>
                  <template v-else>
                    <strong class="mono">{{ fmt(referenceParameters?.[item.key] ?? parameters[item.key], KILN_PARAMETER_DIGITS) }}</strong>
                    <small class="parameter-source">{{ referenceParameters?.[item.key] === undefined ? '来源：当前项目参数' : '来源：库机理版本' }}</small>
                  </template>
                  <small class="hint">{{ item.explanation }}</small>
                </div>
              </div>
              <div>
                <h4>资料依据</h4>
                <button v-for="item in activeEvidence" :key="item.id" type="button" class="citation" @click="source = item">
                  {{ item.file }}<small>{{ item.location }} · {{ item.text.slice(0, 90) }}</small>
                </button>
                <p v-if="!activeEvidence.length" class="hint mt-2">当前机理暂无关联的资料片段。</p>
              </div>
            </template>
            <p v-if="mechanismDirty" class="warning-note">机理或参数已修改，需保存新版本后训练。</p>
          </div>
          <div v-else class="p-4 space-y-5"><div><h4>当前数据</h4><p class="hint mt-2">{{ dataset?.title ?? '尚未确认' }}</p><p v-if="dataset" class="hint mt-1">{{ dataset.config.zoneCount }} 温区 / {{ dataset.config.burnerCount }} 烧嘴 · {{ fmt(dataset.rowCount, 0) }} 行</p></div><div><h4>当前机理</h4><p class="hint mt-2">{{ mechanism ? `${mechanism.title} · ${mechanism.version}` : '尚未保存或选用' }}</p><p class="hint mt-2">标定结果保存在对应实验，不会覆盖知识库中的原参数。</p></div><div class="border-top pt-4"><h4 class="mb-3">已选用的任务算法</h4><div v-for="task in taskList" :key="task" class="selected-task"><span>{{ labels[task] }}</span><p>{{ selectionLabel(task) }}</p></div><button class="btn primary w-full justify-center mt-3" :disabled="!selectedCount" @click="step = 'bundle'">确认模型组合<ArrowRight :size="13" /></button></div><div class="border-top pt-4"><h4>演示时可以解释</h4><ol class="talk-points"><li>资料从哪里来，字段如何识别。</li><li>为什么启用这条机理，哪些参数是假设。</li><li>算法读取什么，如何训练与验证。</li><li>为什么选这个算法，误差和局限是什么。</li><li>如何复用过去的机理及参数。</li></ol></div></div>
        </aside>
      </div>
      <footer class="studio-footer"><span>版本化资料 → 受控机理 → 真实算法 → 可复现产物</span><span>当前仅离线建模与试算，不直接下发设备控制指令</span></footer>
    </template>

    <KilnAlgorithmLibrary :open="algorithmLibraryOpen" :items="state?.algorithmLibrary ?? []" :selected="comparisonAlgorithmKeys"
      :task-label="labels[config.task]" :has-task-mechanism="hasTaskMechanism" :disabled="running" :defaults="currentConfig" :focus-key="algorithmLibraryFocus"
      @close="algorithmLibraryOpen = false; algorithmLibraryFocus = ''" @manage="openAlgorithmManagement" @toggle="toggleComparisonAlgorithm" @updated="updateAlgorithmLibrary" @configure="configureAlgorithm" @refresh="refreshAlgorithmLibrary" />
    <KilnMechanismCatalog :open="catalogOpen" :compare-key="catalogCompareKey" :items="comparisonCatalog" :current="currentCatalog"
      :current-label="draft ? '本次资料生成 · 草稿' : mechanism ? '当前方案 · ' + mechanism.version : '本次配置'"
      :enabled-keys="templateKeys" :alternatives="catalogAlternatives" :has-dataset="!!dataset"
      :disabled="running || catalogLoading || !!catalogError" :loading="catalogLoading" :error="catalogError"
      @close="catalogOpen = false" @saved="refreshCatalog" @refresh="refreshCatalog" @use="useCatalogVersion" @alternative="toggleCatalogAlternative" />
    <div v-if="source" class="modal-backdrop" @click.self="source = null"><section class="source-modal"><div class="section-head"><div class="min-w-0"><h3 class="break-all">{{ source.file }}</h3><p>{{ source.location }} · 原文片段</p></div><button @click="source = null" aria-label="关闭原文"><X :size="18" /></button></div><pre>{{ source.text }}</pre><small class="hint mono px-5 pb-5 block">证据 ID：{{ source.id }}</small></section></div>
    <div v-if="showGuide" class="modal-backdrop" @click.self="showGuide = false"><section class="source-modal guide-modal"><div class="section-head"><h2>演示讲解顺序</h2><button @click="showGuide = false" aria-label="关闭讲解"><X :size="18" /></button></div><div class="p-6 space-y-5"><article><h3>1. 上传与理解资料</h3><p>这份资料包同时包含设备说明和历史工况。系统解析原始数值，并保留文档依据；AI 负责理解资料与选择受控机理。</p></article><article><h3>2. 确认设备和口径</h3><p>温区数与烧嘴数分别确认，空气/燃气流量统一单位。阀位比与实际空燃比不同，不能直接混用。</p></article><article><h3>3. 说明机理和参数</h3><p>能耗使用集总能量平衡，温度使用闭环热惯性。页面说明每个参数来自文档、人工假设还是训练标定，复杂机理缺少数据时不强行计算。</p></article><article><h3>4. 比较算法</h3><p>在算法库查看各算法的用途与风险。运行同窗口回测，再结合测试误差、覆盖率和选型建议选择。</p></article><article><h3>5. 保存与试算</h3><p>最终保存数据版本、预处理、算法权重、机理参数和验证记录。更改温度计划时，有机理响应的模型可试算，结果不等于现场节能成果。</p></article><article><h3>6. 复用过去的有效知识</h3><p>从知识库选旧机理，可保持原参数验证，也可用新训练数据重新标定；两次实验使用相同验证窗口时可比较。</p></article></div></section></div>
  </div>
</template>

<style scoped>
.conclusion-card { border-top:3px solid #3f8c7e; font-size:13px; }
.conclusion-card>h2 { padding:14px 16px 0; font-size:16px; font-weight:650; }
.conclusion-card h3 { font-size:18px; font-weight:650; }
.conclusion-card h4 { font-size:12px; font-weight:650; }
.result-details>summary { cursor:pointer; padding:12px 16px; font-weight:600; }
.advice-options { display:flex; flex-wrap:wrap; gap:12px; }
.advice-options>div { flex:1 1 120px; display:grid; gap:5px; padding:10px 12px; background:var(--muted); border:1px solid var(--border); border-radius:6px; }
.advice-options small { color:var(--muted-foreground); font-size:11px; }
.advice-options strong { font-size:13px; }
.scope-head p { color:var(--muted-foreground); margin-top:5px; font-size:11px; }
.scope-coverage { display:flex; flex-wrap:wrap; gap:8px 16px; padding:10px 12px 0; color:var(--muted-foreground); font-size:11px; }
.scope-coverage b { margin-left:4px; color:var(--foreground); }
.scope-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; padding:12px; }
.scope-grid article { min-width:0; padding:12px; border:1px solid var(--border); border-radius:7px; cursor:pointer; }
.scope-grid article.selected,.scope-grid article:hover { border-color:#528e84; }
.scope-grid article.selected { background:#3a897d08; }
.scope-title { display:flex; align-items:center; justify-content:space-between; gap:5px; margin-bottom:6px; }
.scope-title button { text-align:left; font-weight:650; cursor:pointer; }
.scope-title label { display:flex; align-items:center; gap:4px; white-space:nowrap; }
.scope-grid p { margin:8px 0; color:var(--muted-foreground); font-size:11px; line-height:1.7; }
.scope-grid .executable { border-color:#468b8059; color:var(--foreground); }
.scope-grid details { margin-top:8px; }
.scope-grid summary { color:var(--muted-foreground); font-size:11px; cursor:pointer; }
@media(max-width:1000px) { .scope-grid { grid-template-columns:1fr; } }
.workspace.forecast-layout { grid-template-columns: minmax(0, 1fr); }
.workspace.panels-both { grid-template-columns:210px minmax(0,1fr) 285px; }
.workspace.panels-left { grid-template-columns:210px minmax(0,1fr); }
.workspace.panels-right { grid-template-columns:minmax(0,1fr) 285px; }
.focus-toolbar { display:flex; gap:8px; flex-wrap:wrap; }
.focus-toggle { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--border); background:var(--card); color:var(--muted-foreground); border-radius:6px; padding:6px 10px; font-size:11px; cursor:pointer; }
.focus-toggle[aria-expanded="true"] { border-color:#448d85; color:#448d85; }
.head-actions { display:inline-flex; align-items:center; gap:8px; }
.panel-close { display:inline-flex; align-items:center; border:1px solid var(--border); border-radius:5px; padding:3px; color:var(--muted-foreground); cursor:pointer; }
.panel-close:hover { color:var(--foreground); background:var(--muted); }
.studio { font-size:12px; }.studio h2 { font-size:14px; font-weight:600; }.studio h3 { font-size:13px; font-weight:600; }.studio h4 { font-size:12px; font-weight:600; }.btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; border:1px solid var(--border); border-radius:6px; padding:8px 12px; font-size:11px; background:var(--card); color:var(--foreground); cursor:pointer; line-height:1.4; }.btn:hover { background:var(--muted); }.btn.primary { background:#266e6b; border-color:#266e6b; color:#fff; }.btn.primary:hover { background:#215c5b; }.btn:disabled { opacity:.45; cursor:not-allowed; }.btn.tiny { padding:5px 9px; font-size:10px; }.control { border:1px solid var(--border); background:var(--background); border-radius:5px; padding:8px 9px; color:var(--foreground); min-width:0; font-size:11px; }.control:focus { outline:2px solid #4a928b66; border-color:#568e88; }label { font-size:11px; }label>.control { display:block; margin-top:6px; width:100%; }input[type=checkbox] { accent-color:#317e75; flex-shrink:0; }input[type=range] { accent-color:#317e75; width:100%; margin-top:13px; }.check-line { display:flex; align-items:center; gap:8px; line-height:1.6; }.hint { color:var(--muted-foreground); font-size:11px; line-height:1.8; }.mono { font-family:Consolas,monospace; }.badge { display:inline-flex; align-items:center; border:1px solid var(--border); color:var(--muted-foreground); background:var(--muted); font-size:10px; padding:3px 6px; border-radius:4px; line-height:1.4; }.surface { background:var(--card); border:1px solid var(--border); border-radius:8px; overflow:hidden; }.section-head { padding:14px 17px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; gap:12px; font-weight:500; }.section-head p { font-size:10px; color:var(--muted-foreground); margin-top:5px; font-weight:400; }.section-head small { color:var(--muted-foreground); font-size:10px; }.border-top { border-top:1px solid var(--border); }.feedback { padding:10px 14px; border:1px solid var(--border); border-radius:6px; display:flex; justify-content:space-between; gap:12px; font-size:12px; line-height:1.7; }.feedback.error { background:#a6423410; color:#bf675b; }.feedback.success { background:#2f887312; color:#4b9f8a; }.warning-note { border-left:2px solid #c49554; color:var(--muted-foreground); background:#c495540c; padding:9px 12px; font-size:11px; line-height:1.7; }.warning { color:#c49554; }.project-bar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:12px 16px; border:1px solid var(--border); border-radius:7px; background:var(--card); }.project-select { background:transparent; border:none; font-size:12px; max-width:360px; min-width:180px; color:var(--foreground); }.project-select option { background:var(--card); }.step-nav { display:flex; border:1px solid var(--border); border-radius:7px; background:var(--card); overflow:auto; }.step-nav>button { display:flex; align-items:center; gap:9px; flex:1; text-align:left; min-width:140px; padding:14px 12px; position:relative; color:var(--muted-foreground); border-bottom:2px solid transparent; cursor:pointer; }.step-nav>button.active { border-bottom-color:#448d85; color:var(--foreground); background:#3a897d0c; }.step-number { width:23px; height:23px; border:1px solid var(--border); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0; }.active .step-number { background:#2c746b; color:white; border-color:#2c746b; }.step-nav strong { display:block; font-size:11px; font-weight:500; }.step-nav small { display:block; font-size:9px; margin-top:3px; color:var(--muted-foreground); }.step-chevron { margin-left:auto; color:var(--muted-foreground); flex-shrink:0; }.job-bar { display:flex; align-items:center; gap:10px; background:#3a897d0a; border:1px solid var(--border); padding:11px 14px; border-radius:6px; font-size:11px; }.job-bar span { flex:1; }.job-track { width:100px; height:4px; background:var(--muted); border-radius:3px; overflow:hidden; }.job-track i { display:block; height:100%; background:#4a9988; }.job-bar.failed { color:#be6e61; }.workspace { display:grid; grid-template-columns:210px minmax(0,1fr) 285px; gap:16px; align-items:start; }.left-panel,.right-panel { position:sticky; top:12px; }.file-list { max-height:360px; overflow:auto; }.file-list>button { display:flex; text-align:left; align-items:flex-start; gap:8px; width:100%; padding:12px; border-bottom:1px solid var(--border); cursor:pointer; }.file-list>button.selected { background:#3a897d12; }.file-list>button>svg { margin-top:2px; flex-shrink:0; color:var(--muted-foreground); }.file-list strong { display:block; word-break:break-all; font-size:10px; font-weight:500; line-height:1.7; }.file-list small { display:block; color:var(--muted-foreground); margin-top:4px; font-size:9px; }.dot { height:5px; width:5px; border-radius:50%; background:#9b927a; flex-shrink:0; margin:7px 0 0 auto; }.dot.ready { background:#529d83; }.dot.failed { background:#be6e61; }.dataset-meta { display:flex; flex-direction:column; gap:7px; color:var(--muted-foreground); font-size:10px; margin-top:12px; }.sidebar-action { width:100%; display:flex; gap:9px; align-items:center; padding:13px; border-top:1px solid var(--border); font-size:11px; cursor:pointer; }.sidebar-action span { flex:1; text-align:left; }.sidebar-note { display:flex; gap:8px; padding:14px; border-top:1px solid var(--border); color:var(--muted-foreground); background:var(--muted); }.sidebar-note svg { flex-shrink:0; margin-top:2px; }.sidebar-note p { font-size:10px; line-height:1.8; }.center-panel { display:flex; flex-direction:column; gap:16px; }.right-panel { max-height:calc(100vh - 30px); overflow:auto; }.loading { display:flex; align-items:center; justify-content:center; gap:12px; min-height:300px; color:var(--muted-foreground); }.welcome { text-align:center; padding:55px 24px; border:1px dashed var(--border); border-radius:9px; background:var(--card); }.welcome-icon { display:flex; justify-content:center; color:#59998f; margin-bottom:20px; }.eyebrow { font-size:10px; letter-spacing:2px; color:var(--muted-foreground); margin-bottom:14px; }.welcome h2 { font-size:23px; font-weight:500; }.welcome>p:not(.eyebrow) { color:var(--muted-foreground); font-size:12px; line-height:1.9; max-width:630px; margin:16px auto 0; }.welcome>small { display:block; font-size:10px; color:var(--muted-foreground); margin-top:24px; }.intro-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; padding:15px 4px; }.intro-grid span { color:#64998e; font-size:10px; }.intro-grid h3 { margin:12px 0 8px; }.intro-grid p { color:var(--muted-foreground); line-height:1.8; font-size:11px; }.source-list { max-height:650px; overflow:auto; display:flex; flex-direction:column; gap:12px; }.source-list button { padding:13px; text-align:left; border:1px solid var(--border); border-radius:5px; }.source-list button:hover { background:var(--muted); }.source-list small { font-size:10px; color:#59998f; }.source-list p { margin-top:7px; white-space:pre-wrap; font-size:12px; line-height:1.9; }.empty-inline { padding:20px 0; color:var(--muted-foreground); line-height:1.8; }.table-wrap { overflow:auto; }table { border-collapse:collapse; width:100%; font-size:11px; }th { font-weight:500; text-align:left; background:var(--muted); color:var(--muted-foreground); padding:10px; white-space:nowrap; }td { padding:9px 10px; border-bottom:1px solid var(--border); line-height:1.6; }td small { font-size:9px; }.mapping-select { min-width:150px; }.small-number { width:68px; }.form-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }.form-grid.four { grid-template-columns:repeat(4,minmax(0,1fr)); }.slider-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px 18px; }.slider-field { display:flex; flex-direction:column; min-width:0; }.slider-head { display:flex; justify-content:space-between; align-items:baseline; gap:8px; font-size:11px; color:var(--muted-foreground); }.slider-head b { font-size:13px; color:var(--foreground); font-weight:650; white-space:nowrap; }.slider-field input[type=range] { margin-top:8px; }.slider-note { margin:5px 0 0; font-size:10px; line-height:1.5; color:var(--muted-foreground); }.form-grid label { display:flex; flex-direction:column; gap:4px; color:var(--muted-foreground); font-size:10px; }.span-2 { grid-column:span 2; }.quality-row { margin-top:16px; padding-bottom:14px; border-bottom:1px solid var(--border); }.quality-row p { color:var(--muted-foreground); font-size:10px; margin-top:6px; }.interpretation { margin-top:18px; padding-top:16px; border-top:1px solid var(--border); }.interpretation>p { margin-top:12px; line-height:1.9; }.citation { display:block; width:100%; text-align:left; padding:9px 10px; border:1px solid var(--border); background:var(--muted); border-radius:5px; font-size:10px; margin-top:9px; overflow-wrap:anywhere; cursor:pointer; }.citation:hover { border-color:#538e84; }.citation small { display:block; color:var(--muted-foreground); line-height:1.7; margin-top:5px; }.mechanism-list article { padding:17px 20px; border-bottom:1px solid var(--border); }.mechanism-list article:last-child { border-bottom:none; }.mechanism-list article.selected { background:#3a897d08; }.mechanism-list label { display:flex; align-items:flex-start; gap:10px; }.mechanism-list label>input { margin-top:4px; }.mechanism-list button { display:flex; flex-direction:column; gap:5px; text-align:left; cursor:pointer; }.mechanism-list small { color:var(--muted-foreground); font-size:10px; }.mechanism-list p { font-size:11px; color:var(--muted-foreground); line-height:1.8; margin:10px 0; }.formula { font-family:Consolas,'Microsoft YaHei',monospace; font-size:11px; line-height:1.9; padding:9px 11px; border:1px solid var(--border); background:var(--muted); border-radius:5px; overflow-wrap:anywhere; }.parameter-field { display:flex; flex-direction:column; gap:5px; margin-bottom:17px; }.parameter-field>span { display:flex; justify-content:space-between; align-items:center; font-size:11px; }.parameter-field>span small { color:var(--muted-foreground); font-size:10px; }.parameter-source { color:#679f94; font-size:9px; text-align:left; }.parameter-field>.hint { font-size:9px; }.task-tabs { display:flex; border-bottom:1px solid var(--border); padding:0 10px; }.task-tabs button { display:flex; align-items:center; justify-content:center; gap:9px; flex:1; padding:16px 8px; color:var(--muted-foreground); border-bottom:2px solid transparent; cursor:pointer; font-size:12px; }.task-tabs button.active { color:#59998f; border-bottom-color:#59998f; }.segmented { display:flex; border:1px solid var(--border); border-radius:4px; padding:2px; }.segmented button { font-size:10px; color:var(--muted-foreground); padding:5px 7px; cursor:pointer; }.segmented button.active { background:var(--muted); color:var(--foreground); }.split-summary { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--border); border-radius:7px; background:var(--card); }.split-summary article { padding:15px; border-right:1px solid var(--border); }.split-summary article:last-child { border:none; }.split-summary span { font-size:10px; color:var(--muted-foreground); }.split-summary strong { display:block; margin-top:8px; font-size:18px; font-weight:500; }.split-summary small { font-size:9px; font-weight:400; color:var(--muted-foreground); }.split-summary p { font-size:9px; line-height:1.8; color:var(--muted-foreground); margin-top:7px; }.selected-task { margin-bottom:14px; }.selected-task>span { color:#679f94; font-size:10px; }.selected-task>p { font-size:10px; color:var(--muted-foreground); line-height:1.8; margin-top:5px; }.talk-points { padding-left:16px; margin-top:10px; list-style:decimal; color:var(--muted-foreground); font-size:10px; line-height:2.2; }.selection-list { margin:18px 0; }.selection-list article { display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); }.selection-list article>span { font-size:11px; color:var(--muted-foreground); min-width:80px; }.selection-list article>strong { font-size:11px; font-weight:400; flex:1; }.manifest-row { padding:17px 0; border-bottom:1px solid var(--border); }.manifest-row p { font-size:11px; color:var(--muted-foreground); margin-top:7px; }.manifest-row small { display:block; color:var(--muted-foreground); font-size:9px; margin-top:8px; }.simulation-row { display:flex; justify-content:space-between; gap:20px; padding:18px 0; border-bottom:1px solid var(--border); }.simulation-row strong { font-size:11px; }.simulation-row p { font-size:10px; color:var(--muted-foreground); margin-top:6px; line-height:1.7; }.simulation-values { display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:flex-end; font-size:10px; min-width:160px; }.simulation-values b { display:block; margin-top:4px; font-size:19px; font-weight:500; }.simulation-values small { width:100%; color:var(--muted-foreground); text-align:right; font-size:9px; }.knowledge-intro { display:grid; grid-template-columns:1fr 1fr; gap:25px; margin-top:20px; padding-top:17px; border-top:1px solid var(--border); }.knowledge-intro strong { font-size:11px; }.knowledge-intro p { font-size:11px; line-height:1.8; color:var(--muted-foreground); margin-top:8px; }.studio-footer { display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; color:var(--muted-foreground); font-size:10px; padding:14px 0; }.modal-backdrop { position:fixed; inset:0; background:#0008; z-index:70; display:flex; justify-content:center; align-items:center; padding:24px; }.source-modal { width:720px; max-width:100%; max-height:85vh; overflow:auto; border:1px solid var(--border); border-radius:9px; background:var(--card); color:var(--foreground); }.source-modal pre { white-space:pre-wrap; overflow-wrap:anywhere; padding:22px; font:12px/2 'Microsoft YaHei',sans-serif; }.guide-modal article p { font-size:12px; color:var(--muted-foreground); line-height:1.9; margin-top:9px; }
@media(min-width:1600px) { .workspace { grid-template-columns:235px minmax(0,1fr) 310px; } }
@media(max-width:1200px) { .workspace { grid-template-columns:185px minmax(0,1fr); }.right-panel { grid-column:1/-1; position:static; max-height:none; }.right-panel>div.p-4 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }}
@media(max-width:760px) { .workspace { grid-template-columns:1fr; }.left-panel { position:static; }.file-list { max-height:150px; }.right-panel>div.p-4 { display:block; }.intro-grid { grid-template-columns:1fr; }.form-grid,.form-grid.four { grid-template-columns:repeat(2,minmax(0,1fr)); }.slider-grid { grid-template-columns:1fr; }.welcome h2 { font-size:19px; }.project-select { max-width:230px; }.section-head { flex-wrap:wrap; }.simulation-row { flex-direction:column; }.simulation-values { justify-content:flex-start; }.simulation-values small { text-align:left; } }
.catalog-card-actions { display:flex; flex-wrap:wrap; align-items:center; gap:7px 10px; margin-top:12px; padding-top:10px; border-top:1px solid var(--border); }
.catalog-card-actions small { flex:1 1 130px; color:var(--muted-foreground); }
.catalog-card-actions .recommended { color:#28756d; font-weight:600; }
.parameter-field>label { display:flex; justify-content:space-between; align-items:center; font-size:11px; }
.parameter-field>label small { color:var(--muted-foreground); font-size:10px; }
.algorithm-comparison { display:grid; gap:12px; padding:16px 20px; }
.algorithm-chips { display:flex; flex-wrap:wrap; gap:7px; }
.algorithm-chip { display:flex; gap:7px; align-items:center; padding:5px 7px 5px 10px; background:var(--muted); border:1px solid var(--border); border-radius:6px; }
.algorithm-chip small { margin-left:6px; color:var(--muted-foreground); }
.algorithm-chip button { display:inline-flex; padding:3px; cursor:pointer; border-radius:4px; }
.algorithm-chip button:hover { background:var(--card); }
.bundle-export-row { display:flex; align-items:flex-end; flex-wrap:wrap; gap:16px; }
.bundle-version-field { flex:1 1 320px; min-width:0; }
.bundle-export-actions { max-width:100%; }
</style>
