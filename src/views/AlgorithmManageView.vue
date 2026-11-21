<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Download, RefreshCw, Upload } from 'lucide-vue-next'
import { PageHeader } from '@/components/ui-kit'
import AppDialog from '@/components/ui/AppDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { downloadAlgorithmExample, studioGet, studioPost, uploadAlgorithmPackage } from '@/lib/kiln-studio-api'
import type { AlgorithmOptionValue, ExperimentConfig, Job, Project, StudioState } from '@/lib/kiln-studio-api'
import { RELEASE_STATES, releaseActions, validationInputIssue } from '@/lib/kiln-algorithm-management'
import type { AlgorithmManagementState, AlgorithmRelease, AlgorithmValidationReport } from '@/lib/kiln-algorithm-management'
import { algorithmParameterDefaults, algorithmParameterFields, validateAlgorithmParameters } from '@/lib/kiln-algorithm-library'
import { readAlgorithmLibraryOrigin } from '@/lib/kiln-algorithm-library-origin'
import { formatKilnReading, KILN_TASK_UNITS } from '@/lib/kiln-studio-format'

const auth = useAuthStore()
const route = useRoute()
const state = ref<AlgorithmManagementState>({ items: [], implementations: [], scope: 'current_account' })
const selectedId = ref('')
const selected = computed(() => state.value.items.find(item => item.id === selectedId.value))
const actions = computed(() => selected.value ? releaseActions(selected.value) : undefined)
const candidates = computed(() => state.value.implementations.filter(item => item.bindable))
const builtins = computed(() => state.value.implementations.filter(item => item.builtin))
const binding = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)
const createOpen = ref(false)
const uploadOpen = ref(false)
const uploadTarget = ref('')
const packageFile = ref<File>()
const draft = ref({ name: '', description: '', requestedKey: '' })
const report = ref<AlgorithmValidationReport | null>(null)
const currentJob = ref<Job>()
const projects = ref<Project[]>([])
const projectId = ref(typeof route.query.project === 'string' ? route.query.project : '')
const project = ref<StudioState>()
const datasetId = ref('')
const mechanismId = ref('')
const dataLoading = ref(false)
const task = ref<'temperature' | 'energy' | 'afr'>('temperature')
const history = ref(30)
const horizon = ref(30)
const options = ref<Record<string, AlgorithmOptionValue>>({})
const publishNotes = ref('')
const retireReason = ref('')
const definition = computed(() => selected.value?.definition)
const fields = computed(() => definition.value ? algorithmParameterFields(definition.value) : [])
const mechanisms = computed(() => project.value?.mechanisms.filter(item => item.datasetId === datasetId.value) ?? [])
const inputIssue = computed(() => validationInputIssue(projectId.value, project.value, datasetId.value, mechanisms.value, mechanismId.value))
const libraryOrigin = computed(() => readAlgorithmLibraryOrigin(route.query.libraryOrigin, auth.user?.id))
const returnToLibrary = computed(() => libraryOrigin.value ? {
  path: '/kiln-cycles',
  query: {
    project: libraryOrigin.value.projectId,
    libraryOrigin: route.query.libraryOrigin,
    openLibrary: '1',
    publishedAlgorithm: selected.value?.state === 'published' ? selected.value.implementationKey : undefined,
  },
} : undefined)
const preparationLink = computed(() => ({
  path: '/kiln-cycles',
  query: { project: projectId.value, prepare: inputIssue.value?.step, dataset: datasetId.value || undefined, validationRelease: selectedId.value, libraryOrigin: route.query.libraryOrigin },
}))
const taskNames = { temperature: '温度预测', energy: '燃气流量预测', afr: '空燃比预测' }
const jobActive = computed(() => ['queued', 'running'].includes(currentJob.value?.status ?? ''))
let timer: ReturnType<typeof setTimeout> | undefined
let disposed = false
let dataRequest = 0
let detailRequest = 0
const message = (err: unknown) => err instanceof Error ? err.message : '请求失败，请重试'
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

async function load() {
  const result = await studioGet<AlgorithmManagementState>('/algorithm-management')
  if (disposed) return
  state.value = result
  if (!result.items.some(item => item.id === selectedId.value)) {
    selectedId.value = result.items.find(item => item.id === route.query.release)?.id ?? result.items[0]?.id ?? ''
  }
}
async function perform(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await action() } catch (err) { if (!disposed) error.value = message(err) }
  finally { if (!disposed) busy.value = false }
}
async function loadDetails(id: string) {
  clearTimeout(timer)
  const sequence = ++detailRequest
  report.value = null; currentJob.value = undefined; publishNotes.value = ''; retireReason.value = ''
  const item = state.value.items.find(row => row.id === id)
  binding.value = item?.implementationKey ?? ''
  options.value = item?.definition ? algorithmParameterDefaults(item.definition) : {}
  const tasks = item?.definition?.capabilities?.supportedTasks
  if (tasks?.length) task.value = tasks[0]!
  if (!item) return
  try {
    const result = await studioGet<{ report: AlgorithmValidationReport | null }>(`/algorithm-management/${id}/validation`)
    if (disposed || sequence !== detailRequest) return
    report.value = result.report
    if (item.activeJobId || item.latestJobId) await pollJob((item.activeJobId || item.latestJobId)!, id, sequence)
  } catch (err) { if (!disposed && sequence === detailRequest) error.value = message(err) }
}
async function pollJob(jobId: string, releaseId: string, sequence = detailRequest) {
  clearTimeout(timer)
  try {
    const job = await studioGet<Job>(`/algorithm-management/${releaseId}/job`)
    if (disposed || sequence !== detailRequest || selectedId.value !== releaseId || job.id !== jobId) return
    currentJob.value = job
    if (['queued', 'running'].includes(job.status)) timer = setTimeout(() => { void pollJob(jobId, releaseId, sequence) }, 1800)
    else {
      await load()
      if (disposed || sequence !== detailRequest || selectedId.value !== releaseId) return
      const result = await studioGet<{ report: AlgorithmValidationReport | null }>(`/algorithm-management/${releaseId}/validation`)
      if (!disposed && sequence === detailRequest) report.value = result.report
      if (job.status === 'failed') error.value = job.error || '验证失败'
    }
  } catch (err) { if (!disposed && sequence === detailRequest) error.value = message(err) }
}
async function loadProject(id: string) {
  const sequence = ++dataRequest
  const sameProject = project.value?.project.id === id
  const preferredDataset = sameProject ? datasetId.value : (id === route.query.project ? route.query.dataset : '')
  if (!sameProject) { project.value = undefined; datasetId.value = ''; mechanismId.value = '' }
  dataLoading.value = !!id
  if (!id) return
  try {
    const result = await studioGet<StudioState>(`/projects/${encodeURIComponent(id)}`)
    if (disposed || sequence !== dataRequest) return
    project.value = result
    datasetId.value = result.datasets.find(item => item.id === preferredDataset)?.id ?? result.datasets[0]?.id ?? ''
    if (!mechanisms.value.some(item => item.id === mechanismId.value)) mechanismId.value = mechanisms.value[0]?.id ?? ''
  } catch (err) { if (!disposed && sequence === dataRequest) error.value = message(err) }
  finally { if (!disposed && sequence === dataRequest) dataLoading.value = false }
}

async function refresh() {
  await load()
  projects.value = (await studioGet<{ items: Project[] }>('/projects')).items
  if (!projects.value.some(item => item.id === projectId.value)) projectId.value = projects.value[0]?.id ?? ''
  else await loadProject(projectId.value)
}
function create() {
  void perform(async () => {
    const item = await studioPost<AlgorithmRelease>('/algorithm-management', { ...draft.value, requestedKey: draft.value.requestedKey || null })
    createOpen.value = false; draft.value = { name: '', description: '', requestedKey: '' }
    await load(); selectedId.value = item.id; notice.value = '已登记。请选择此记录并上传算法包。'
  })
}

function openUpload(releaseId = '') {
  error.value = ''
  packageFile.value = undefined
  uploadTarget.value = releaseId
  uploadOpen.value = true
}

function selectPackage(event: Event) {
  const input = event.target as HTMLInputElement
  packageFile.value = input.files?.[0]
}

function upload() {
  void perform(async () => {
    const file = packageFile.value
    if (!file || !file.name.toLowerCase().endsWith('.zip')) throw new Error('请选择 ZIP 算法包')
    if (file.size > 1_000_000) throw new Error('算法包大小上限为 1 MB')
    const item = await uploadAlgorithmPackage(file, uploadTarget.value)
    uploadOpen.value = false
    await load()
    if (selectedId.value === item.id) await loadDetails(item.id)
    else selectedId.value = item.id
    notice.value = '算法包已上传并锁定版本。请选择项目数据运行训练验证。'
  })
}

function downloadExample() {
  void perform(downloadAlgorithmExample)
}

function bind() {
  void perform(async () => {
    const impl = candidates.value.find(item => item.definition.key === binding.value)
    if (!selected.value || !impl) throw new Error('请选择已部署的新算法实现')
    await studioPost(`/algorithm-management/${selected.value.id}/bind`, { implementationKey: impl.definition.key, version: impl.definition.version })
    await load(); await loadDetails(selectedId.value); notice.value = '已绑定实际实现，下一步使用真实项目数据验证。'
  })
}
function validate() {
  void perform(async () => {
    if (!selected.value || !definition.value) return
    if (inputIssue.value) throw new Error(inputIssue.value.message)
    const releaseId = selected.value.id
    const key = selected.value.implementationKey!
    const parameters = validateAlgorithmParameters(definition.value, options.value)
    const config: ExperimentConfig = { datasetId: datasetId.value, mechanismId: mechanismId.value, task: task.value, zone: 0, historyMinutes: history.value, horizonMinutes: horizon.value, ridgeAlpha: 1, boostingRounds: 40, learningRate: .1, calibrate: false, lockedParameters: [], selectedAlgorithmKeys: [key], algorithmOptions: { [key]: parameters } }
    const job = await studioPost<Job>(`/algorithm-management/${releaseId}/validate`, { projectId: projectId.value, config })
    await load()
    if (selectedId.value !== releaseId || disposed) return
    currentJob.value = job; report.value = null; await pollJob(job.id, releaseId)
  })
}
function publish() {
  void perform(async () => {
    if (!selected.value) return
    await studioPost(`/algorithm-management/${selected.value.id}/publish`, { validationId: selected.value.validationId, notes: publishNotes.value })
    await load()
    notice.value = returnToLibrary.value ? '已发布到当前账号的业务算法库。' : '已发布到当前账号的业务算法库。工作台刷新算法列表后可选择。'
  })
}
function retire() {
  void perform(async () => {
    if (!selected.value) return
    await studioPost(`/algorithm-management/${selected.value.id}/retire`, { reason: retireReason.value })
    await load(); notice.value = '已停止用于新实验；历史模型和推理实现保留。'
  })
}
watch(selectedId, id => { void loadDetails(id) })
watch(projectId, id => { void loadProject(id) })
watch(datasetId, () => { if (!mechanisms.value.some(item => item.id === mechanismId.value)) mechanismId.value = mechanisms.value[0]?.id ?? '' })
onMounted(() => { if (auth.isAdmin) void perform(refresh) })
onBeforeUnmount(() => { disposed = true; clearTimeout(timer); ++dataRequest; ++detailRequest })
</script>

<template>
  <main class="algorithm-management">
    <PageHeader title="算法管理" description="上传 Python 算法包，在项目数据上训练验证，通过后发布到当前账号的算法库。">
      <template #actions>
        <RouterLink v-if="returnToLibrary && !busy" class="am-button" :to="returnToLibrary"><ArrowLeft :size="15" />返回算法库</RouterLink>
        <button v-if="auth.isAdmin" class="am-button" :disabled="busy" @click="downloadExample"><Download :size="15" />下载示例包</button>
        <button class="am-button" :disabled="busy" @click="perform(refresh)"><RefreshCw :size="15" />刷新</button>
        <button class="am-button primary" :disabled="busy || !auth.isAdmin" @click="openUpload()"><Upload :size="15" />上传算法包</button>
      </template>
    </PageHeader>
    <p v-if="!auth.isAdmin" role="alert">仅管理员可接入及发布算法。</p>
    <template v-else>
      <p v-if="error" class="am-error" role="alert">{{ error }}</p><p v-if="notice" class="am-notice" role="status">{{ notice }}</p>
      <div class="am-layout">
        <aside class="am-panel"><h2>算法版本</h2>
          <p v-if="!state.items.length" class="am-muted">上传 ZIP 后，平台会创建一个待验证版本。</p>
          <button v-for="item in state.items" :key="item.id" class="am-item" :aria-pressed="selectedId === item.id" @click="selectedId = item.id"><strong>{{ item.name }}</strong><span>{{ RELEASE_STATES[item.state] }}</span><small>{{ item.implementationKey || item.requestedKey || '尚未绑定' }}<template v-if="item.implementationVersion"> · {{ item.implementationVersion }}</template></small></button>
          <button v-if="candidates.length" class="am-button" :disabled="busy" @click="createOpen = true">登记受控实现</button>
          <details class="am-existing"><summary>已有内置算法（{{ builtins.length }}）</summary><p v-for="item in builtins" :key="item.definition.key">{{ item.definition.name }} · {{ item.definition.version }}</p></details>
        </aside>
        <section v-if="selected" class="am-panel am-detail">
          <header class="am-title"><div><h2>{{ selected.name }}</h2><p class="am-muted">{{ selected.description || '未填写用途说明' }}</p></div><span>{{ RELEASE_STATES[selected.state] }}</span></header>
          <p v-if="selected.runtimeIssue" class="am-error" role="alert">{{ selected.runtimeIssue }}</p>
          <section><h3>1. 接入算法</h3>
            <p v-if="definition?.package" class="am-muted">已绑定 {{ definition.name }} · {{ definition.version }}。训练和预测由隔离容器执行。</p>
            <p v-else-if="!definition" class="am-muted">将包含 algorithm.json 和 algorithm.py 的 ZIP 上传到当前记录。</p>
            <button v-if="actions?.bind" class="am-button" :disabled="busy" @click="openUpload(selected.id)"><Upload :size="15" />{{ definition ? '更换算法包' : '为此记录上传算法包' }}</button>
            <details v-if="candidates.length && actions?.bind"><summary>选择已部署的受控实现</summary>
              <div class="am-inline"><label>受控实现<select v-model="binding" :disabled="busy"><option value="">请选择已部署实现</option><option v-for="item in candidates" :key="item.definition.key" :value="item.definition.key">{{ item.definition.name }} · {{ item.definition.key }} · {{ item.definition.version }}</option></select></label><button class="am-button" :disabled="!binding || busy" @click="bind">绑定并固定版本</button></div>
            </details>
            <details v-if="definition"><summary>实现契约与能力</summary><p>{{ definition.explanation }}</p><p>输入：{{ definition.dataRequirements.join('；') }}</p><p>参数字段：{{ fields.length }} · 实现版本 {{ selected.implementationVersion }}</p><p>{{ definition.capabilities?.minuteForecast.detail }}</p><p>ONNX：{{ definition.capabilities?.onnxExport.detail }} Python：{{ definition.capabilities?.pythonExport.detail }}</p><p class="am-hash">绑定指纹：{{ selected.implementationFingerprint }}</p></details>
          </section>
          <section><h3>2. 用真实项目验证</h3><p class="am-muted">仅将训练窗口传给训练回调，留出集核对预测和 JSON 保存后恢复；本次不自动验证边缘部署。</p>
            <form class="am-form" @submit.prevent="validate">
              <fieldset :disabled="busy || jobActive || !actions?.validate || dataLoading">
                <label>项目<select v-model="projectId" required><option value="">请选择</option><option v-for="item in projects" :key="item.id" :value="item.id">{{ item.title }}</option></select></label>
                <label>数据版本<select v-model="datasetId" required><option value="">请选择</option><option v-for="item in project?.datasets" :key="item.id" :value="item.id">{{ item.title }} · {{ item.rowCount }} 行</option></select></label>
                <label>匹配的机理版本<select v-model="mechanismId" required><option value="">请选择</option><option v-for="item in mechanisms" :key="item.id" :value="item.id">{{ item.title }} · {{ item.version }}</option></select></label>
                <label>验证任务<select v-model="task"><option v-for="value in definition?.capabilities?.supportedTasks ?? []" :key="value" :value="value">{{ taskNames[value] }}</option></select></label>
                <label>历史窗口 / 分钟<input v-model.number="history" type="number" required min="5" max="240"></label><label>预测时距 / 分钟<input v-model.number="horizon" type="number" required min="1" max="120"></label>
                <label v-for="field in fields" :key="field.key">{{ field.title || field.key }}<select v-if="field.enum" v-model="options[field.key]" :required="field.required"><option v-for="value in field.enum" :key="String(value)" :value="value">{{ value }}</option></select><input v-else-if="field.type === 'boolean'" v-model="options[field.key]" type="checkbox"><input v-else-if="field.type === 'number' || field.type === 'integer'" v-model.number="options[field.key]" type="number" :step="field.type === 'integer' ? 1 : 'any'" :min="field.minimum" :max="field.maximum" :required="field.required"><input v-else v-model="options[field.key]" :required="field.required"><small>{{ field.description }}</small></label>
              </fieldset>
              <p v-if="dataLoading" class="am-muted" role="status">正在读取数据和机理版本…</p>
              <div v-else-if="actions?.validate && inputIssue" class="am-inline" role="status">
                <p class="am-muted">{{ inputIssue.message }}</p>
                <RouterLink v-if="inputIssue.step" class="am-button" :to="preparationLink">{{ inputIssue.step === 'data' ? '去确认数据' : '去保存机理版本' }}</RouterLink>
              </div>
              <button class="am-button" type="submit" :disabled="busy || jobActive || !actions?.validate || dataLoading || !!inputIssue">{{ jobActive ? '验证中…' : '运行真实验证' }}</button>
            </form>
            <p v-if="currentJob" class="am-muted" role="status">{{ currentJob.message }}<template v-if="currentJob.error"> · {{ currentJob.error }}</template></p>
            <template v-if="report"><div class="am-report"><h4>技术验证通过 · 效果待发布者确认</h4><p>{{ report.splitMethod }}</p><p>验证集 MAE：{{ formatKilnReading(report.validation.mae, KILN_TASK_UNITS[report.config.task]) }} · 有效 {{ report.validation.count }} 点 · 覆盖 {{ (report.validation.coverage * 100).toFixed(1) }}%</p><p>测试集 MAE：{{ formatKilnReading(report.test.mae, KILN_TASK_UNITS[report.config.task]) }} · 有效 {{ report.test.count }} 点 · 覆盖 {{ (report.test.coverage * 100).toFixed(1) }}%</p><p>保存恢复核对 {{ report.probeCount }} 个输入 · 最大差异 {{ report.restoreMaxDifference }} · 实际耗时 {{ report.elapsedSeconds.toFixed(2) }} 秒</p><p>真实输出时距：{{ report.predictionOffsets.join('、') }} 分钟</p><details><summary>数据与验证边界</summary><p>数据版本 {{ report.config.datasetId }} · 机理版本 {{ report.mechanismVersion }} · 历史 {{ report.config.historyMinutes }} 分钟 / 提前 {{ report.config.horizonMinutes }} 分钟</p><p v-for="line in report.limitations" :key="line">{{ line }}</p></details></div></template>
          </section>
          <section><h3>3. 发布到业务算法库</h3><p class="am-muted">发布表示确认本次验证任务的适用范围，不代表所有任务精度达标。正式实验仍需独立训练评估；发布后请在工作台刷新列表。</p>
            <template v-if="selected.state !== 'published' && selected.state !== 'retired'">
              <p id="publish-requirement" class="am-muted">{{ actions?.publish ? '请填写发布说明，确认本次验证的适用范围。' : '完成第 2 步并通过训练验证后，才能发布此版本。' }}</p>
              <label v-if="actions?.publish">发布说明<textarea v-model.trim="publishNotes" rows="2" maxlength="1500" required placeholder="确认适用任务、数据范围、验证结果与局限" /></label>
              <button class="am-button primary" aria-describedby="publish-requirement" :disabled="busy || !actions?.publish || !publishNotes" @click="publish">确认并发布</button>
            </template>
            <template v-if="actions?.retire">
              <RouterLink v-if="returnToLibrary && !busy" class="am-button primary" :to="returnToLibrary"><ArrowLeft :size="15" />返回算法库</RouterLink>
              <label>停用原因<input v-model.trim="retireReason" maxlength="600"></label><button class="am-button" :disabled="busy || !retireReason" @click="retire">停止用于新实验</button>
            </template>
          </section>
          <details><summary>版本操作记录</summary><p v-for="(entry, index) in selected.history" :key="index">{{ date(entry.at) }} · {{ entry.detail }}</p><p class="am-muted">每个版本保留独立记录；修改实现请创建新版本键并重新验证。</p></details>
        </section>
        <section v-else class="am-panel"><h2>接入 Python 算法</h2><p>下载示例包查看接口格式，或上传自己的算法包。ZIP 根目录需要包含算法说明和训练、预测入口。</p></section>
      </div>
    </template>
    <AppDialog :open="uploadOpen" title="上传 Python 算法包" description="ZIP 根目录包含 algorithm.json 和 algorithm.py，压缩前后均不超过 1 MB。" @close="uploadOpen = false">
      <form id="algorithm-package-form" class="am-form" @submit.prevent="upload">
        <label>算法包<input type="file" accept=".zip,application/zip" required :disabled="busy" @change="selectPackage"></label>
        <p v-if="uploadTarget && selected?.definition" class="am-muted">更换算法包后，需要重新验证才能发布。</p>
        <p v-if="error" class="am-error" role="alert">{{ error }}</p>
      </form>
      <template #footer><button class="am-button" :disabled="busy" @click="uploadOpen = false">取消</button><button class="am-button primary" form="algorithm-package-form" type="submit" :disabled="busy || !packageFile">{{ busy ? '正在上传…' : '上传并固定版本' }}</button></template>
    </AppDialog>
    <AppDialog :open="createOpen" title="新增算法" description="先登记接入需求，绑定真实实现后才具备训练能力。" @close="createOpen = false"><form id="algorithm-draft-form" class="am-form" @submit.prevent="create"><label>算法名称<input v-model.trim="draft.name" required maxlength="120" placeholder="填写需要接入的真实训练方法"></label><label>预期算法键（选填）<input v-model.trim="draft.requestedKey" pattern="[a-z][a-z0-9_]{0,39}" maxlength="40" placeholder="用于与研发约定，不会自动创建实现"></label><label>用途与数据要求<textarea v-model.trim="draft.description" rows="4" maxlength="1500" /></label><p v-if="error" class="am-error" role="alert">{{ error }}</p></form><template #footer><button class="am-button" :disabled="busy" @click="createOpen = false">取消</button><button class="am-button primary" form="algorithm-draft-form" type="submit" :disabled="busy">{{ busy ? '保存中…' : '登记算法' }}</button></template></AppDialog>
  </main>
</template>

<style scoped>
.algorithm-management { color:var(--foreground); }
.am-muted { color:var(--muted-foreground); font-size:13px; line-height:1.7; }
.am-layout { display:grid; grid-template-columns:minmax(230px, .75fr) minmax(0, 2fr); gap:20px; align-items:start; }
.am-panel { border:1px solid var(--border); border-radius:10px; background:var(--card); padding:20px; min-width:0; }
.am-panel h2 { font-size:17px; font-weight:600; margin-bottom:10px; }
.am-panel h3 { font-size:15px; font-weight:600; margin-bottom:8px; }
.am-panel p,.am-panel small { overflow-wrap:anywhere; }
.am-button { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:8px 12px; border:1px solid var(--border); border-radius:6px; background:var(--card); font-size:13px; cursor:pointer; }
.am-button.primary { background:var(--primary); color:var(--primary-foreground); }
.am-button:disabled { opacity:.5; cursor:default; }
.am-item { display:grid; width:100%; text-align:left; gap:5px; padding:12px 0; border-bottom:1px solid var(--border); cursor:pointer; overflow-wrap:anywhere; }
.am-item[aria-pressed=true] { background:var(--muted); padding:12px 8px; border-radius:6px; }
.am-item span,.am-item small { color:var(--muted-foreground); font-size:12px; }
.am-existing { margin-top:20px; font-size:12px; }
.am-title,.am-inline { display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; }
.am-title>div { flex:1; min-width:0; }
.am-detail>section { padding:20px 0; border-bottom:1px solid var(--border); }
.am-form,.am-panel label { display:grid; gap:8px; font-size:13px; }
.am-form { margin-top:12px; }
.am-form fieldset { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; min-width:0; }
.am-inline label { flex:1; min-width:180px; margin:12px 0; }
.am-panel input,.am-panel select,.am-panel textarea,.am-form input,.am-form textarea { width:100%; min-width:0; background:var(--background); border:1px solid var(--border); padding:9px; border-radius:6px; color:var(--foreground); }
.am-form input[type=checkbox] { width:auto; justify-self:start; }
.am-report { margin-top:16px; padding:14px; background:var(--muted); border-radius:6px; font-size:13px; line-height:1.9; }
.am-error { color:var(--destructive); margin:10px 0; overflow-wrap:anywhere; }
.am-notice { background:var(--muted); padding:12px; margin-bottom:12px; border-radius:6px; }
.am-panel details { margin-top:12px; line-height:1.8; font-size:13px; }
.am-panel summary { cursor:pointer; }
.am-hash { font-family:monospace; font-size:12px; }
@media(max-width:850px) { .am-layout { grid-template-columns:1fr; } }
@media(max-width:480px) { .am-form fieldset { grid-template-columns:1fr; } .am-panel { padding:14px; } }
</style>
