<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { BarChart3, LineChart, Loader2, Sparkles } from 'lucide-vue-next'
import KilnModelEvidence from './KilnModelEvidence.vue'
import KilnOverviewDashboard from './KilnOverviewDashboard.vue'
import KilnPredictionReplay from './KilnPredictionReplay.vue'
import KilnPredictionQuality from './KilnPredictionQuality.vue'
import KilnTemperatureZoneReview from './KilnTemperatureZoneReview.vue'
import KilnTemperatureWorkbench from './KilnTemperatureWorkbench.vue'
import KilnTemperatureRefit from './KilnTemperatureRefit.vue'
import { createReplay, getReplay, studioGet, studioPost } from '@/lib/kiln-studio-api'
import { hasMinuteForecast } from '@/lib/kiln-studio-state'
import type { Bundle, DashboardLayout, Experiment, Job, ReplayPackage, ReplayRequest, StudioState, Task } from '@/lib/kiln-studio-api'

const props = defineProps<{ bundle: Bundle; state: StudioState }>()
const emit = defineEmits<{ updated: [bundle: Bundle, experiment: Experiment] }>()
const labels: Record<Task, string> = { temperature: '温度', energy: '燃气', afr: '空燃比' }
const tasks = computed(() => props.bundle.manifest.map(model => model.task))
const layout = ref<DashboardLayout>({
  task: tasks.value.includes('temperature') ? 'temperature' : tasks.value[0]!, chart: 'line',
  windowMinutes: 30,
})
// 顶层视图：总览（默认，一屏多图）/ 滚动回放 / 温度方案对比
const view = ref<'overview' | 'replay' | 'scenario'>('overview')
const scenarioOpened = ref(false)
// 总览聚焦的任务：优先燃气（便于用气/分阶段），否则温度，再退到 manifest 第一个
const overviewTask = computed<Task>(() =>
  tasks.value.includes('energy') ? 'energy'
    : tasks.value.includes('temperature') ? 'temperature'
      : tasks.value[0]!)
// 总览模式下当前任务绑定的模型、实验与回放包
const overviewModel = computed(() => props.bundle.manifest.find(item => item.task === overviewTask.value))
const overviewExperiment = computed(() => props.state.experiments.find(item => item.id === overviewModel.value?.experimentId))
const overviewReplay = computed(() => replays.value[overviewTask.value])
const refit = ref<InstanceType<typeof KilnTemperatureRefit>>()
const trainingDetails = ref<HTMLDetailsElement>()
const trainingPanel = ref<HTMLElement>()
const optimizing = ref(false)
const prompt = ref('')
const planning = ref(false)
const layoutError = ref('')
const replayError = ref('')
const request = ref<ReplayRequest>()
const replaying = ref(false)
const replays = ref<Partial<Record<Task, ReplayPackage>>>({})
const baselineReplays = ref<Partial<Record<Task, ReplayPackage>>>({})
const dataset = computed(() => props.state.datasets.find(item => item.id === props.bundle.datasetId))
const model = computed(() => props.bundle.manifest.find(item => item.task === layout.value.task))
const experiment = computed(() => props.state.experiments.find(item => item.id === model.value?.experimentId))
const hasThirtyMinuteForecast = computed(() => hasMinuteForecast(
  experiment.value?.algorithms.find(item => item.key === model.value?.algorithm), 30,
))
const mechanism = computed(() => props.state.mechanisms.find(item => item.id === model.value?.mechanismId))
const thermalEnabled = computed(() => {
  const temperature = props.bundle.manifest.find(item => item.task === 'temperature')
  return props.state.mechanisms.find(item => item.id === temperature?.mechanismId)?.templateKeys.includes('thermal') ?? false
})
const template = computed(() => props.state.templates.find(item =>
  item.key === { temperature: 'thermal', energy: 'energy', afr: 'combustion' }[layout.value.task]))
let disposed = false
let layoutRevision = 0
onBeforeUnmount(() => { disposed = true })

watch(layout, () => { layoutRevision++ }, { deep: true, flush: 'sync' })
watch(() => layout.value.task, task => {
  replayError.value = ''
  if (task !== 'temperature') selectView('replay')
})

function selectTask(task: Task) {
  layout.value.task = task
  selectView(task === 'temperature' ? 'scenario' : 'replay')
}

function selectView(next: typeof view.value) {
  view.value = next
  if (next === 'scenario') scenarioOpened.value = true
}

// 进入总览时把工作任务同步为总览任务，保证 generate 的模型校验通过
watch(view, next => {
  if (next === 'overview') layout.value.task = overviewTask.value
}, { immediate: true })

// 总览请求回放：用总览任务绑定的算法、数据集第一个窑次、固定 5 分钟步长 / 30 分钟窗口
async function requestOverviewReplay() {
  layout.value.task = overviewTask.value
  await nextTick()
  const targetModel = overviewModel.value
  const targetExperiment = overviewExperiment.value
  const targetDataset = dataset.value
  if (!targetModel || !targetExperiment || !targetDataset) return
  // 取训练结束后的第一个窑次，避免选到训练区间
  const cutoff = targetExperiment.split.find(item => item.name === '训练')?.to
  const firstCycle = targetDataset.summary.find(item => !cutoff || item.to > cutoff)
  if (!firstCycle) return
  await generate({
    experimentId: targetExperiment.id,
    cycleId: firstCycle.fileId,
    frameStepMinutes: 5,
    horizonMinutes: 30,
    selectedAlgorithms: [targetModel.algorithm],
    includeMechanism: true,
  })
}

async function trainThirtyMinuteModel(zone?: number) {
  if (trainingDetails.value) trainingDetails.value.open = true
  await nextTick()
  trainingPanel.value?.scrollIntoView({ block: 'nearest' })
  await refit.value?.trainTrajectoryAndApply(zone)
}

async function planLayout() {
  const text = prompt.value.trim()
  if (!text || planning.value) return
  planning.value = true
  layoutError.value = ''
  const revision = layoutRevision
  try {
    const next = await studioPost<DashboardLayout>(`/bundles/${props.bundle.id}/dashboard-layout`, { prompt: text })
    if (disposed || revision !== layoutRevision) return
    layout.value = next
    selectView('replay')
  } catch (err) {
    if (!disposed) layoutError.value = err instanceof Error ? err.message : '暂时无法生成看板，可手动选择。'
  } finally {
    planning.value = false
  }
}

async function generate(body: ReplayRequest) {
  if (disposed || replaying.value || body.experimentId !== model.value?.experimentId) return
  const task = layout.value.task
  request.value = body
  const baseline = baselineReplays.value[task]
  if (!body.excludedRange && baseline && baseline.request.cycleId === body.cycleId &&
      baseline.request.frameStepMinutes === body.frameStepMinutes && baseline.request.experimentId === body.experimentId &&
      body.selectedAlgorithms.every(key => baseline.request.selectedAlgorithms.includes(key)) &&
      (task !== 'temperature' || !body.selectedAlgorithms.includes('baseline') ||
        baseline.algorithms.some(item => item.key === 'baseline' && item.temperatureTrajectory === 'persistence'))) {
    replays.value[task] = baseline
    replayError.value = ''
    return
  }
  replaying.value = true
  replayError.value = ''
  try {
    let job = await createReplay(props.bundle.projectId, body)
    const deadline = Date.now() + 5 * 60_000
    while (!disposed && ['pending', 'queued', 'running'].includes(job.status)) {
      if (Date.now() >= deadline) throw new Error('本次回放仍在计算，可稍后重试。')
      await new Promise<void>(resolve => window.setTimeout(resolve, 1000))
      if (disposed) return
      job = await studioGet<Job>(`/assets/${job.id}`)
    }
    if (disposed) return
    if (job.status !== 'succeeded' || !job.resultId) throw new Error(job.error ?? job.message ?? '回放生成失败')
    const result = await getReplay(job.resultId)
    if (!disposed) {
      replays.value[task] = result
      if (!result.request.excludedRange) baselineReplays.value[task] = result
    }
  } catch (err) {
    if (!disposed && task === layout.value.task) {
      replayError.value = err instanceof Error ? err.message : '回放生成失败'
    }
  } finally {
    replaying.value = false
  }
}
</script>

<template>
  <section class="dashboard-heading" aria-label="预测与分析看板设置">
    <header>
      <div>
        <h2>预测与分析看板</h2>
        <p>{{ bundle.title }} · {{ dataset?.config.kilnCode }} · 模型版本 {{ bundle.version }}</p>
      </div>
      <form class="layout-form" @submit.prevent="planLayout">
        <input v-model="prompt" maxlength="500" aria-label="用一句话配置看板" placeholder="例如：看未来 30 分钟的燃气累计柱状图" />
        <button class="primary" :disabled="planning || !prompt.trim()">
          <Loader2 v-if="planning" class="animate-spin" :size="15" /><Sparkles v-else :size="15" />{{ planning ? '正在配置' : 'AI 配置看板' }}
        </button>
      </form>
    </header>
    <p v-if="layoutError" class="error" role="alert">{{ layoutError }}</p>
    <div class="dashboard-controls">
      <div class="segmented" role="group" aria-label="看板视图">
        <button type="button" :aria-pressed="view === 'overview'" @click="selectView('overview')">总览</button>
        <button type="button" :aria-pressed="view !== 'overview'"
          @click="selectView(layout.task === 'temperature' ? 'scenario' : 'replay')">详细分析</button>
      </div>
      <template v-if="view !== 'overview'">
        <div class="segmented" role="group" aria-label="预测指标">
          <button v-for="task in tasks" :key="task" type="button" :aria-pressed="layout.task === task" @click="selectTask(task)">{{ labels[task] }}</button>
        </div>
        <div v-if="layout.task === 'temperature'" class="segmented" role="group" aria-label="温度分析方式">
          <button type="button" :aria-pressed="view === 'scenario'" @click="selectView('scenario')">温度方案对比</button>
          <button type="button" :aria-pressed="view === 'replay'" @click="selectView('replay')">滚动回放</button>
        </div>
        <div v-if="view === 'replay'" class="segmented chart-modes" role="group" aria-label="图表类型">
          <button type="button" :aria-pressed="layout.chart === 'line'" @click="layout.chart = 'line'"><LineChart :size="15" />折线</button>
          <button type="button" :aria-pressed="layout.chart === 'bar'" @click="layout.chart = 'bar'"><BarChart3 :size="15" />柱状</button>
        </div>
        <label v-if="view === 'replay'" class="window">未来
          <select v-model.number="layout.windowMinutes" aria-label="滚动预测窗口"><option :value="5">5 分钟</option><option :value="10">10 分钟</option><option :value="30">30 分钟</option></select>
        </label>
      </template>
    </div>
    <div v-if="view !== 'overview' && layout.task === 'temperature' && experiment" class="minute-status">
      <p v-if="hasThirtyMinuteForecast"><strong>支持未来 30 分钟逐分钟预测</strong> · 每次从同一起点计算 +1 至 +30 分钟温度。</p>
      <template v-else>
        <p><strong>生成未来 30 分钟逐分钟预测</strong> · 在当前数据版本上训练 LSTM，每分钟输出一个温度预测。</p>
        <button class="primary" type="button" :disabled="optimizing" @click="trainThirtyMinuteModel()">
          {{ optimizing ? '正在处理模型' : '训练并启用 30 分钟逐点模型' }}
        </button>
      </template>
    </div>
  </section>
  <KilnOverviewDashboard v-if="view === 'overview'" :bundle="bundle" :replay="overviewReplay"
    :busy="replaying" :experiment="overviewExperiment" :algorithm-key="overviewModel?.algorithm ?? ''"
    @request-replay="requestOverviewReplay" @configure="trainThirtyMinuteModel()" />
  <div v-if="view === 'replay'" class="dashboard-body">
    <p v-if="!experiment || !dataset" class="surface feedback">当前版本缺少绑定的实验或数据版本，无法生成历史回放。</p>
    <template v-else>
      <div v-if="replayError" class="surface feedback" role="alert">
        {{ replayError }}
        <button v-if="request" type="button" :disabled="replaying" @click="generate(request)">重试回放</button>
      </div>
      <KilnPredictionReplay
        :key="experiment.id"
        :experiment="experiment" :dataset="dataset" :replay="replays[layout.task]"
        :baseline-replay="baselineReplays[layout.task]" :busy="replaying"
        :mechanism="mechanism" :mechanism-template="template" :parameter-definitions="state.parameterDefinitions"
        :preferred-algorithm="model?.algorithm" :dashboard-layout="layout"
        @generate="generate" @configure="trainThirtyMinuteModel()"
      />
    </template>
  </div>
  <KilnTemperatureWorkbench v-if="scenarioOpened" v-show="view === 'scenario' && layout.task === 'temperature'"
    :bundle="bundle" :dataset="dataset" :runs="state.temperatureRuns ?? []" :default-window="layout.windowMinutes"
    :thermal-enabled="thermalEnabled"
    @configure="trainThirtyMinuteModel()"
  />
  <details v-if="view !== 'overview' && model && dataset" class="dashboard-detail">
    <summary>算法选型与建模依据</summary>
    <KilnModelEvidence :model="model" :dataset="dataset" :experiment="experiment" :mechanism="mechanism" />
  </details>
  <details v-if="view !== 'overview' && layout.task !== 'afr' && experiment && model" ref="trainingDetails" :key="experiment.id" class="dashboard-detail" :open="layout.task === 'energy'">
    <summary>{{ layout.task === 'temperature' ? '温区预测核验、实测对比与模型训练' : '历史预测核验与模型训练' }}</summary>
    <div class="dashboard-body">
      <KilnTemperatureZoneReview v-if="layout.task === 'temperature' && dataset"
        :experiment="experiment" :algorithm="model.algorithm" :experiments="state.experiments" :dataset="dataset"
        :busy="optimizing" can-optimize can-apply @optimize="refit?.optimizeAndApply()"
        @train="trainThirtyMinuteModel" @apply="(next, algorithm) => refit?.applyModel(next, algorithm)" />
      <KilnPredictionQuality v-else :experiment="experiment" :algorithm="model.algorithm" />
      <div v-if="layout.task === 'temperature'" ref="trainingPanel">
        <KilnTemperatureRefit ref="refit" :bundle="bundle" :experiment="experiment" :library="state.algorithmLibrary"
          @busy="optimizing = $event" @updated="(next, experiment) => emit('updated', next, experiment)" />
      </div>
    </div>
  </details>
</template>

<style scoped>
.dashboard-heading { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:20px; }
header,.dashboard-controls,.layout-form { display:flex; align-items:center; flex-wrap:wrap; gap:12px; }
header { justify-content:space-between; gap:16px; }
h2 { font-size:21px; font-weight:650; }
p { margin-top:5px; color:var(--muted-foreground); line-height:1.55; }
.layout-form { flex:1 1 345px; max-width:560px; justify-content:flex-end; }
input,select { padding:8px 10px; min-width:0; background:var(--background); border:1px solid var(--border); border-radius:6px; color:var(--foreground); }
input { flex:1 1 215px; }
button { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:7px 10px; border-radius:5px; cursor:pointer; }
button:disabled { opacity:.5; cursor:not-allowed; }
.primary { background:#266e6b; color:#fff; }
.segmented { display:flex; padding:3px; gap:3px; border:1px solid var(--border); border-radius:7px; }
.segmented button[aria-pressed="true"] { background:#266e6b; color:#fff; }
.dashboard-controls { margin-top:15px; border-top:1px solid var(--border); padding-top:15px; }
.minute-status { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; margin-top:14px; padding:10px 12px; border-radius:6px; background:var(--muted); }
.minute-status p { margin:0; }
.chart-modes { margin-left:auto; }
.window { display:flex; align-items:center; gap:6px; }
.feedback { padding:12px; border:1px solid var(--border); border-radius:6px; }
.feedback button { border:1px solid var(--border); margin-left:6px; }
.dashboard-body { display:grid; gap:10px; }
.dashboard-detail { padding:14px 18px; min-width:0; background:var(--card); border:1px solid var(--border); border-radius:8px; }
.dashboard-detail > summary { cursor:pointer; font-weight:600; }
.dashboard-detail[open] > :not(summary) { margin-top:12px; }
.error { color:var(--destructive); }
@media (max-width:610px) { .chart-modes { margin-left:0; } }
</style>
