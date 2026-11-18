<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Loader2, RefreshCw } from 'lucide-vue-next'
import { studioGet, studioPost } from '@/lib/kiln-studio-api'
import { hasMinuteForecast, temperatureCandidates } from '@/lib/kiln-studio-state'
import { formatKilnNumber, formatKilnReading } from '@/lib/kiln-studio-format'
import type { AlgorithmMetadata, Bundle, Experiment, ExperimentConfig, Job } from '@/lib/kiln-studio-api'

const props = defineProps<{ bundle: Bundle; experiment: Experiment; library: AlgorithmMetadata[] }>()
const emit = defineEmits<{ updated: [bundle: Bundle, experiment: Experiment]; busy: [value: boolean] }>()
const source = computed(() => props.bundle.manifest.find(item => item.task === 'temperature')!)
const horizon = ref(10)
const historyMinutes = ref(props.experiment.config.historyMinutes)
const calibrateResponse = ref(!props.experiment.config.lockedParameters.includes('tauMinutes'))
const excludeZero = ref(props.experiment.config.excludeZeroTemperatureRecords ?? false)
const running = ref(false)
const saving = ref(false)
const error = ref('')
const status = ref('')
const trained = ref<Experiment>()
const trainedTrajectory = ref(false)
const pendingJob = ref<Job>()
const pendingHorizon = ref<number>()
const pendingZone = ref<number>()
type TrainMode = 'comparison' | 'trajectory'
const pendingMode = ref<TrainMode>()
const selected = ref('')
const saved = ref<Record<string, Bundle>>({})
const chosenKeys = ['baseline', 'ridge', 'physics', 'fusion', 'lstm']
const available = computed(() => props.library.filter(item => chosenKeys.includes(item.key) && item.status === 'enabled'))
const canRun = computed(() => Number.isInteger(historyMinutes.value) && historyMinutes.value >= 5 &&
  historyMinutes.value <= 240 && available.value.length > 0)
const canTrainTrajectory = computed(() => canRun.value && available.value.some(item => item.key === 'lstm'))
const candidates = computed(() => {
  const count = trained.value?.split.find(item => item.name === '验证')?.count ?? 0
  const usable = temperatureCandidates(trained.value?.algorithms ?? [], count)
  return trainedTrajectory.value ? usable.filter(item => hasMinuteForecast(item, 30)) : usable
})
const selectedCandidate = computed(() => candidates.value.find(item => item.key === selected.value))
watch(() => running.value || saving.value, value => emit('busy', value), { immediate: true })
let disposed = false
onBeforeUnmount(() => { disposed = true })

async function train(mode: TrainMode = pendingMode.value ?? 'comparison', zone = pendingZone.value ?? props.experiment.config.zone) {
  if (running.value || saving.value || !(mode === 'trajectory' ? canTrainTrajectory.value : canRun.value)) return
  running.value = true
  error.value = ''
  status.value = mode === 'trajectory' ? '正在提交 30 分钟逐点训练' : '正在提交标定与回测'
  trained.value = undefined
  selected.value = ''
  try {
    const locked: ExperimentConfig['lockedParameters'] = props.experiment.config.lockedParameters.filter(key => key !== 'tauMinutes')
    if (!calibrateResponse.value) locked.push('tauMinutes')
    const body: ExperimentConfig = {
      ...props.experiment.config, datasetId: props.bundle.datasetId, mechanismId: source.value.mechanismId, zone,
      horizonMinutes: mode === 'trajectory' ? 30 : horizon.value, historyMinutes: historyMinutes.value,
      calibrate: true, lockedParameters: locked,
      selectedAlgorithmKeys: mode === 'trajectory' ? ['lstm'] : available.value.map(item => item.key),
      excludeZeroTemperatureRecords: excludeZero.value,
    }
    const jobToResume = pendingJob.value
    let job = jobToResume ?? await studioPost<Job>(`/projects/${props.bundle.projectId}/experiments`, body)
    if (!jobToResume) {
      pendingHorizon.value = body.horizonMinutes
      pendingMode.value = mode
      pendingZone.value = zone
    }
    pendingJob.value = job
    const deadline = Date.now() + 20 * 60_000
    let failures = 0
    while (!disposed && ['queued', 'running'].includes(job.status)) {
      status.value = `${job.message} · ${formatKilnNumber(job.progress, 0)}%`
      if (Date.now() > deadline) throw new Error('实验仍在后台计算，完成后可从算法实验记录打开。')
      await new Promise<void>(resolve => window.setTimeout(resolve, 1400))
      if (disposed) return
      try {
        job = await studioGet<Job>(`/assets/${job.id}`)
        pendingJob.value = job
        failures = 0
      } catch (err) {
        if (++failures >= 3) throw err
        status.value = '暂时无法读取进度，正在重试'
      }
    }
    if (disposed) return
    if (job.status !== 'succeeded' || !job.resultId) {
      pendingJob.value = undefined
      pendingHorizon.value = undefined
      pendingMode.value = undefined
      pendingZone.value = undefined
      throw new Error(job.error ?? '本次标定与回测未完成')
    }
    const experiment = await studioGet<Experiment>(`/assets/${job.resultId}`)
    if (disposed) return
    trainedTrajectory.value = mode === 'trajectory'
    trained.value = experiment
    pendingJob.value = undefined
    pendingHorizon.value = undefined
    pendingMode.value = undefined
    pendingZone.value = undefined
    selected.value = candidates.value[0]?.key ?? ''
    status.value = mode === 'trajectory' ? '30 分钟模型回测已完成。' : '回测已完成。按验证记录建议候选，测试记录用于查看其留出表现。'
    if (!selected.value) error.value = mode === 'trajectory'
      ? '当前数据未生成可用的 30 个分钟预测点或完整验证结果。请核对分钟级训练数据及缺测情况。'
      : '本次没有完整验证记录且可保存的候选，请查看不可用原因。'
  } catch (err) {
    if (!disposed) {
      error.value = err instanceof Error ? err.message : '调优回测失败'
      status.value = pendingJob.value ? '后台任务已提交，可继续查看结果。' : '本次请求未完成，尚未生成新的训练结果。'
    }
  } finally {
    if (!disposed) running.value = false
  }
}

async function apply() {
  if (!trained.value || !selectedCandidate.value) return
  await applyModel(trained.value, selected.value)
}

async function applyModel(experiment: Experiment, algorithm: string) {
  if (saving.value || running.value) return
  saving.value = true
  error.value = ''
  const key = experiment.id + '/' + algorithm
  const zoneLabel = experiment.config.zone ? `${experiment.config.zone}区` : '总体温度'
  try {
    const bundle = saved.value[key] ?? await studioPost<Bundle>(`/projects/${props.bundle.projectId}/bundles`, {
      title: (`${zoneLabel} · ${experiment.config.horizonMinutes}分钟 · ${props.bundle.title}`).slice(0, 160),
      selections: props.bundle.manifest.map(item => item.task === 'temperature'
        ? { experimentId: experiment.id, algorithm }
        : { experimentId: item.experimentId, algorithm: item.algorithm }),
    })
    saved.value[key] = bundle
    if (!disposed) emit('updated', bundle, experiment)
  } catch (err) {
    if (!disposed) error.value = err instanceof Error ? err.message : '保存模型版本失败'
  } finally {
    if (!disposed) saving.value = false
  }
}

async function optimizeAndApply() {
  if (running.value || saving.value) return
  if (pendingJob.value && pendingHorizon.value !== 10) {
    error.value = '已有其他预测时长的后台任务，请先完成该任务，再生成 10 分钟版本。'
    return
  }
  horizon.value = 10
  if (!canRun.value) return
  await train('comparison')
  if (!disposed && trained.value?.config.horizonMinutes === 10 && selectedCandidate.value) {
    status.value = '正在保存并应用验证记录推荐的模型'
    await apply()
  }
}

async function trainTrajectoryAndApply(zone = pendingZone.value ?? props.experiment.config.zone) {
  if (running.value || saving.value) return
  if (pendingJob.value && (pendingMode.value !== 'trajectory' || pendingZone.value !== zone)) {
    error.value = '请先查看正在回测的实验结果，再训练 30 分钟逐点模型。'
    return
  }
  if (!canTrainTrajectory.value) {
    error.value = '请启用算法库中的 LSTM，并将历史窗口设为 5 到 240 分钟的整数。'
    return
  }
  await train('trajectory', zone)
  if (!disposed && trainedTrajectory.value && selectedCandidate.value) {
    status.value = '正在保存并启用 30 分钟逐点模型'
    await apply()
  }
}

defineExpose({ optimizeAndApply, trainTrajectoryAndApply, applyModel })
</script>

<template>
  <section class="refit" aria-label="温度模型重新标定与对比">
    <header>
      <div><h3>重新标定并比较温度模型</h3><p>当前为 {{ source.algorithmName }}，提前 {{ source.config.horizonMinutes }} 分钟。可在同一数据版本上重新训练并比较候选。</p></div>
      <button type="button" class="primary" :disabled="running || saving || !canRun" @click="pendingMode === 'trajectory' ? trainTrajectoryAndApply() : train()">
        <Loader2 v-if="running" class="animate-spin" :size="15" /><RefreshCw v-else :size="15" />{{ running ? '正在回测' : pendingJob ? '继续查看后台结果' : '标定并比较模型' }}
      </button>
    </header>
    <details>
      <summary>训练设置</summary>
      <div class="settings">
        <label>预测提前量<select v-model.number="horizon" :disabled="running || !!pendingJob"><option :value="10">10 分钟</option><option v-if="source.config.horizonMinutes !== 10" :value="source.config.horizonMinutes">{{ source.config.horizonMinutes }} 分钟（与当前模型一致）</option></select></label>
        <label>历史窗口 / 分钟<input v-model.number="historyMinutes" type="number" min="5" max="240" :disabled="running || !!pendingJob" /></label>
        <label><input v-model="calibrateResponse" type="checkbox" :disabled="running || !!pendingJob" />用训练记录重新标定热响应时间</label>
        <label><input v-model="excludeZero" type="checkbox" :disabled="running || !!pendingJob" />将设定与全部温区同时为零的记录按缺测处理</label>
      </div>
      <p>本次比较 {{ available.map(item => item.name).join('、') }}。标定和模型训练使用训练记录，候选建议依据完整验证记录。</p>
      <p>全零规则需结合现场确认，勾选后对训练、验证、测试和回放使用同一规则。-9999 缺测值统一按缺测处理。</p>
    </details>
    <p v-if="status" role="status">{{ status }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template v-if="trained">
      <p v-if="trained.observationQuality">发现 -9999 缺测记录 {{ trained.observationQuality.sentinelRows }} 条、温区和设定同时为零的记录 {{ trained.observationQuality.zeroTemperatureRows }} 条。全零记录{{ trained.observationQuality.excludeZeroTemperatureRecords ? '已按缺测处理' : '保留参与核对' }}。</p>
      <p v-if="trained.config.horizonMinutes !== source.config.horizonMinutes">当前旧模型提前 {{ source.config.horizonMinutes }} 分钟，本次实验提前 {{ trained.config.horizonMinutes }} 分钟。下表候选共享本次时距和评估范围。</p>
      <div class="candidate-table"><table>
        <caption>{{ trainedTrajectory ? '30 分钟逐点模型 · 指标按 +30 分钟终点计算' : '选择要用于预测的模型 · 已按验证记录排序' }}</caption>
        <thead><tr><th scope="col">模型</th><th scope="col">验证平均相差</th><th scope="col">验证综合温差</th><th scope="col">测试平均相差</th><th scope="col">测试综合温差</th></tr></thead>
        <tbody><tr v-for="item in candidates" :key="item.key">
          <th scope="row"><label><input v-model="selected" type="radio" :value="item.key" :disabled="saving" />{{ item.name }}</label></th>
          <td>{{ formatKilnReading(item.validation?.mae, '℃') }}</td><td>{{ formatKilnReading(item.validation?.rmse, '℃') }}</td>
          <td>{{ formatKilnReading(item.test?.mae, '℃') }}</td><td>{{ formatKilnReading(item.test?.rmse, '℃') }}</td>
        </tr></tbody>
      </table></div>
      <p v-for="item in trained.algorithms.filter(item => !item.available)" :key="item.key">{{ item.name }} · {{ item.note }}</p>
      <button type="button" class="primary" :disabled="saving || !selectedCandidate" @click="apply">
        <Loader2 v-if="saving" class="animate-spin" :size="15" />{{ saving ? '正在保存' : '保存新版本并查看预测' }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.refit { padding:16px 20px; border:1px solid var(--border); border-radius:10px; background:var(--card); color:var(--foreground); font-size:13px; }
header,.settings { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
h3 { font-weight:650; font-size:16px; }
p { color:var(--muted-foreground); line-height:1.7; margin:7px 0; }
button,select,input[type=number] { padding:7px 10px; border:1px solid var(--border); border-radius:5px; color:var(--foreground); background:var(--background); }
button { display:inline-flex; align-items:center; gap:7px; cursor:pointer; }
button:disabled { opacity:.5; cursor:default; }
.primary { background:#266e6b; border-color:#266e6b; color:#fff; }
summary { cursor:pointer; margin-top:10px; }
.settings { justify-content:flex-start; margin:10px 0; }
label { display:flex; align-items:center; gap:7px; }
input[type=number] { width:90px; }
.candidate-table { overflow:auto; margin:12px 0; }
table { width:100%; border-collapse:collapse; text-align:left; white-space:nowrap; }
caption { text-align:left; color:var(--muted-foreground); padding-bottom:6px; }
th,td { padding:8px 10px; border-bottom:1px solid var(--border); }
.error { color:var(--destructive); }
</style>
