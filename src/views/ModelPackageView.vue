<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Download, FileCode, Loader2, LockKeyhole, PackageOpen, RefreshCw } from 'lucide-vue-next'
import { PageHeader, Panel } from '@/components/ui-kit'
import { PACKAGE_EXPORT_FORMATS } from '@/config/package-formats'
import { studioGet } from '@/lib/kiln-studio-api'
import type { Bundle, Project, StudioState } from '@/lib/kiln-studio-api'
import { fetchModelExport, fetchNumericModel, fetchBinaryModelPackage, fetchExportCapabilities } from '@/lib/model-package-api'
import type { NumericModelExport } from '@/lib/model-package-api'
import { packageFileName, pythonExportIssue } from '@/lib/model-package'
import { formatKilnReading } from '@/lib/kiln-studio-format'

const route = useRoute()
const projects = ref<Project[]>([])
const bundles = ref<Bundle[]>([])
const projectId = ref('')
const bundleId = ref('')
const data = ref<NumericModelExport>()
const formatId = ref('json')
const name = ref('')
const loadingProjects = ref(false)
const loadingModels = ref(false)
const loadingDetails = ref(false)
const running = ref(false)
const error = ref('')
const projectError = ref('')
const detailError = ref('')
const lastDownload = ref<{ filename: string; bytes: number }>()
let projectRequest = 0
let modelRequest = 0
let disposed = false
const selectedFormat = computed(() => PACKAGE_EXPORT_FORMATS.find(item => item.id === formatId.value)!)
const bundle = computed(() => data.value?.bundle)
const pythonIssue = computed(() => pythonExportIssue(data.value))
const onnxIssue = ref('请选择模型后检查 ONNX 导出能力。')
const summary = computed(() => bundle.value?.manifest.map(item => `${item.algorithmName}：${taskNames[item.task]}，提前 ${item.config.horizonMinutes} 分钟`).join('；') ?? '')
const taskNames = { temperature: '温度', energy: '燃气流量', afr: '空燃比' }
const canExport = computed(() => !!data.value && !!name.value.trim() && selectedFormat.value.available &&
  !unavailable(selectedFormat.value.id) && !running.value && !loadingDetails.value)

function errorText(err: unknown) { return err instanceof Error ? err.message : '请求失败，请重试。' }
function date(value: string) { return new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) }
function unavailable(id: string) { return id === 'python' ? pythonIssue.value : id === 'onnx' ? onnxIssue.value : '' }

async function loadProjects() {
  loadingProjects.value = true; projectError.value = ''
  try {
    const result = await studioGet<{ items: Project[] }>('/projects')
    if (disposed) return
    projects.value = result.items
    const requested = typeof route.query.project === 'string' ? route.query.project : projectId.value
    projectId.value = result.items.find(item => item.id === requested)?.id ?? result.items[0]?.id ?? ''
  } catch (err) { if (!disposed) projectError.value = errorText(err) }
  finally { if (!disposed) loadingProjects.value = false }
}

async function loadBundles(id = projectId.value) {
  const request = ++projectRequest
  bundles.value = []; bundleId.value = ''; projectError.value = ''
  loadingModels.value = false
  if (!id) return
  loadingModels.value = true
  try {
    // 复用六步工作台的真实项目详情接口；不生成虚构模型或工作流。
    const result = await studioGet<StudioState>(`/projects/${encodeURIComponent(id)}`)
    if (disposed || request !== projectRequest) return
    bundles.value = result.bundles
    const requested = typeof route.query.bundle === 'string' ? route.query.bundle : ''
    bundleId.value = result.bundles.find(item => item.id === requested)?.id ?? result.bundles[0]?.id ?? ''
  } catch (err) { if (!disposed && request === projectRequest) projectError.value = errorText(err) }
  finally { if (!disposed && request === projectRequest) loadingModels.value = false }
}

async function loadDetails(id = bundleId.value) {
  const request = ++modelRequest
  data.value = undefined; name.value = ''; detailError.value = ''; error.value = ''; lastDownload.value = undefined
  loadingDetails.value = false
  onnxIssue.value = '请选择模型后检查 ONNX 导出能力。'
  if (!id) return
  loadingDetails.value = true
  try {
    const result = await fetchNumericModel(id)
    if (disposed || request !== modelRequest) return
    if (result.format !== 'kiln-studio-numeric-model-v1') throw new Error('后端返回了无法识别的模型包。')
    data.value = result
    name.value = result.bundle.title
    if (formatId.value === 'python' && pythonExportIssue(result)) formatId.value = 'json'
    onnxIssue.value = '正在检查服务端 ONNX 导出能力…'
    try {
      const capabilities = await fetchExportCapabilities(id)
      if (disposed || request !== modelRequest) return
      onnxIssue.value = capabilities.onnx.available ? '' : capabilities.onnx.reason
    } catch (err) {
      if (disposed || request !== modelRequest) return
      onnxIssue.value = `无法检查 ONNX 导出能力：${errorText(err)}`
    }
  } catch (err) { if (!disposed && request === modelRequest) detailError.value = errorText(err) }
  finally { if (!disposed && request === modelRequest) loadingDetails.value = false }
}

async function exportSelected() {
  if (!canExport.value || !bundle.value || !selectedFormat.value.format) return
  const id = bundle.value.id
  const selected = selectedFormat.value
  const version = bundle.value.version
  running.value = true; error.value = ''; lastDownload.value = undefined
  try {
    const filename = packageFileName(name.value, version, selected)
    const blob = selected.download === 'zip' ? await fetchBinaryModelPackage(id, selected.format as 'python' | 'onnx') :
      new Blob([JSON.stringify(await fetchModelExport(id, selected.format as 'json' | 'skill'), null, 2)], { type: 'application/json;charset=utf-8' })
    if (disposed) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = filename
    document.body.appendChild(anchor); anchor.click(); anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    lastDownload.value = { filename, bytes: blob.size }
  } catch (err) { if (!disposed) error.value = errorText(err) }
  finally { if (!disposed) running.value = false }
}

watch(projectId, id => { void loadBundles(id) })
watch(bundleId, id => { void loadDetails(id) })
watch([formatId, name], () => { lastDownload.value = undefined; error.value = '' })
onMounted(() => { void loadProjects() })
onBeforeUnmount(() => { disposed = true; projectRequest++; modelRequest++ })
</script>

<template>
  <div class="package-page space-y-4">
    <PageHeader title="模型封装导出" description="选择已保存的窑炉模型，交付通用 ONNX 部署包，或下载数值模型、智能体调用规格与 Python 离线包。" />
    <p v-if="projectError" class="feedback error" role="alert">{{ projectError }} <button class="text-link" @click="projectId ? loadBundles() : loadProjects()">重新加载</button></p>
    <div class="package-layout">
      <div class="package-main space-y-4">
        <Panel title="① 选择已保存的模型" subtitle="与窑炉建模工作台中的模型版本一致">
          <div class="source-fields">
            <label>项目<select v-model="projectId" :disabled="running || loadingProjects"><option value="" disabled>{{ loadingProjects ? '正在加载项目…' : '请选择项目' }}</option><option v-for="item in projects" :key="item.id" :value="item.id">{{ item.title }}</option></select></label>
            <label>模型版本<select v-model="bundleId" :disabled="running || loadingModels || !bundles.length"><option value="" disabled>{{ loadingModels ? '正在加载模型…' : '请选择模型版本' }}</option><option v-for="item in bundles" :key="item.id" :value="item.id">{{ item.title }} · {{ item.version }}</option></select></label>
          </div>
          <div class="source-actions"><button type="button" class="small-button" :disabled="running || loadingModels || !projectId" @click="loadBundles()"><RefreshCw :size="13" />刷新模型列表</button><RouterLink class="text-link" :to="{ path: '/kiln-cycles', query: { project: projectId || undefined } }">前往窑炉建模</RouterLink></div>
          <p v-if="!loadingProjects && !projects.length && !projectError" class="empty"><PackageOpen :size="24" />当前账号没有可用项目。请先在窑炉建模工作台上传资料并保存模型。</p>
          <p v-else-if="projectId && !loadingModels && !bundles.length && !projectError" class="empty">此项目尚未保存模型组合，请在第五步保存后再导出。</p>
          <p v-if="loadingDetails" class="loading" role="status"><Loader2 :size="15" class="animate-spin" />正在读取真实模型参数…</p>
          <p v-if="detailError" class="feedback error" role="alert">{{ detailError }} <button class="text-link" @click="loadDetails()">重试</button></p>
        </Panel>

        <Panel title="② 选择导出格式">
          <h3 class="group-title">可立即导出</h3>
          <div class="format-grid">
            <button v-for="item in PACKAGE_EXPORT_FORMATS.filter(f => f.available)" :key="item.id" type="button" class="format-card" :class="{ active: formatId === item.id }" :aria-pressed="formatId === item.id" :disabled="running || !!unavailable(item.id)" :title="unavailable(item.id) || item.purpose" @click="formatId = item.id">
              <span class="format-title"><FileCode :size="17" />{{ item.name }}</span><small>{{ item.extension }}</small><p>{{ item.purpose }}</p><p v-if="unavailable(item.id)" class="restriction">{{ unavailable(item.id) }}</p>
            </button>
          </div>
          <h3 class="group-title planned-title">规划中</h3>
          <div class="planned-grid">
            <button v-for="item in PACKAGE_EXPORT_FORMATS.filter(f => !f.available)" :key="item.id" type="button" class="format-card planned" disabled :title="item.prerequisite"><span class="format-title"><LockKeyhole :size="14" />{{ item.name }}<small>规划中</small></span><p>{{ item.prerequisite }}</p></button>
          </div>
        </Panel>

        <Panel title="③ 元信息 & 版本">
          <div class="metadata-grid">
            <label>产物名称<input v-model="name" maxlength="120" :disabled="running || !data" placeholder="请选择真实模型" /><small>仅用于下载文件命名，不回写模型。</small></label>
            <label>模型版本<input :value="bundle?.version ?? ''" readonly placeholder="请选择模型" /></label>
            <label>作者 / 团队<input :value="bundle ? bundle.author || '未记录' : ''" readonly /><small v-if="bundle && !bundle.author">当前模型记录未保存作者信息。</small></label>
            <label>创建时间<input :value="bundle ? date(bundle.createdAt) : ''" readonly /></label>
            <label class="full-width">用途摘要<textarea :value="summary" readonly rows="3" /></label>
          </div>
        </Panel>

        <Panel title="④ 下载产物">
          <div class="download-row"><div><strong>{{ selectedFormat.name }}</strong><p>{{ selectedFormat.purpose }}</p></div><button type="button" class="download-button" :disabled="!canExport" :aria-busy="running" @click="exportSelected"><Loader2 v-if="running" :size="16" class="animate-spin" /><Download v-else :size="16" />{{ running ? '正在生成并下载…' : '导出并下载' }}</button></div>
          <p class="note">文件大小以实际生成结果为准。下载期间请等待接口返回，浏览器会接管文件保存。</p>
          <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
          <p v-if="lastDownload" class="feedback success" role="status">已生成并发起下载：{{ lastDownload.filename }} · {{ lastDownload.bytes.toLocaleString('zh-CN') }} 字节</p>
        </Panel>
      </div>

      <aside class="package-aside space-y-4">
        <Panel title="源模型摘要" subtitle="以下内容均来自所选模型记录">
          <p v-if="!data" class="note">选择项目和模型后查看真实参数。</p>
          <template v-else><dl class="source-summary"><div><dt>模型名称</dt><dd>{{ data.bundle.title }}</dd></div><div><dt>版本</dt><dd>{{ data.bundle.version }}</dd></div><div><dt>引擎</dt><dd>{{ data.engineVersion }}</dd></div><div><dt>子模型数</dt><dd>{{ data.models.length }}</dd></div><div><dt>验证范围</dt><dd>{{ data.bundle.validationStatus }}</dd></div></dl>
            <article v-for="(item, index) in data.bundle.manifest" :key="item.task" class="model-summary"><h3>{{ taskNames[item.task] }} · {{ item.algorithmName }}</h3><p>提前 {{ item.config.horizonMinutes }} 分钟 · 历史窗口 {{ item.config.historyMinutes }} 分钟</p><p>真实输入特征：{{ data.models[index]?.features.length ?? '未记录' }} 项</p><p>独立测试 MAE：{{ formatKilnReading(item.test?.mae, item.unit) }}</p><details><summary>输入字段与输出</summary><ol><li v-for="field in data.models[index]?.features" :key="field">{{ field }}</li></ol><p>输出：{{ taskNames[item.task] }}，单位 {{ item.unit }}</p></details></article>
            <p class="note">{{ data.bundle.dataFlow }}</p>
          </template>
        </Panel>
        <Panel title="格式说明">
          <p class="note">通用 ONNX 包使用 FP32，包含标准模型文件、独立预处理及 CPU 运行程序、真实样例和逐点核对报告。生成时核对失败会返回具体原因。</p>
          <p class="note">LSTM 保留已训练的全部预测时距；带完整分钟预测头的 Ridge/Fusion 保留曲线。输出覆盖以包内清单为准，不插值补齐。TensorRT、INT8 和目标设备性能尚待专项验证。</p>
          <p class="note">JSON 保留工作台原有导出结构。AI Skill JSON 是包含完整模型的调用规格，不代表已经部署了 HTTP 服务或完成第三方平台接入。</p>
          <p class="note">Python 包仅依赖 NumPy，按模型原生预测时距推理。分钟输出权重保留在包内；滚动回放和历史特征构建由调用方负责。</p>
          <p v-if="pythonIssue" class="restriction">{{ pythonIssue }}</p>
        </Panel>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.package-page { color:var(--foreground); }
.package-layout { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(290px,1fr); gap:16px; align-items:start; }
.package-main,.package-aside { min-width:0; }
.source-fields,.metadata-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
label { display:flex; flex-direction:column; gap:7px; color:var(--muted-foreground); font-size:12px; min-width:0; }
input,select,textarea { padding:9px 10px; border:1px solid var(--border); border-radius:6px; color:var(--foreground); background:var(--background); width:100%; min-width:0; }
select { text-overflow:ellipsis; } textarea { resize:vertical; line-height:1.7; } input[readonly],textarea[readonly] { color:var(--muted-foreground); }
small,.note { color:var(--muted-foreground); font-size:11px; line-height:1.8; } .full-width { grid-column:1/-1; }
.source-actions,.loading { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-top:12px; } .loading { color:var(--muted-foreground); font-size:12px; }
.text-link { color:var(--foreground); text-decoration:underline; font-size:12px; cursor:pointer; }
.small-button { display:inline-flex; align-items:center; gap:6px; padding:6px 9px; border:1px solid var(--border); border-radius:5px; font-size:11px; cursor:pointer; }
.group-title { font-size:13px; font-weight:600; margin-bottom:10px; } .planned-title { margin-top:20px; color:var(--muted-foreground); }
.format-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .planned-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.format-card { display:block; min-width:0; text-align:left; border:1px solid var(--border); border-radius:7px; background:var(--card); padding:12px; cursor:pointer; }
.format-card.active { border-color:var(--foreground); background:var(--muted); box-shadow:inset 0 0 0 1px var(--foreground); } .format-card:not(:disabled):hover { background:var(--muted); }
.format-title { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:12px; font-weight:600; } .format-title svg { flex-shrink:0; } .format-card>small { display:block; margin:5px 0; } .format-card p { color:var(--muted-foreground); font-size:11px; line-height:1.8; margin-top:6px; overflow-wrap:anywhere; }
button:disabled { cursor:not-allowed; opacity:.55; } .format-card.planned { opacity:.6; } .format-title small { font-size:10px; border:1px solid var(--border); padding:0 4px; border-radius:4px; }
.download-row { display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap; } .download-row strong { font-size:14px; } .download-row p { margin-top:5px; color:var(--muted-foreground); font-size:12px; line-height:1.7; }
.download-button { display:inline-flex; justify-content:center; align-items:center; gap:8px; padding:10px 16px; background:var(--foreground); color:var(--background); border-radius:6px; cursor:pointer; font-size:13px; }
.note { margin-top:10px; } .feedback { padding:12px; border:1px solid var(--border); border-radius:6px; font-size:12px; line-height:1.8; overflow-wrap:anywhere; margin-top:12px; }
.error,.restriction { color:var(--destructive,#b94d4d); } .success { color:var(--foreground); background:var(--muted); } .restriction { font-size:11px; line-height:1.8; }
.empty { display:flex; flex-direction:column; gap:10px; align-items:center; color:var(--muted-foreground); text-align:center; padding:24px 0; font-size:13px; }
.source-summary>div { display:grid; grid-template-columns:72px minmax(0,1fr); gap:10px; margin:9px 0; font-size:12px; } dt { color:var(--muted-foreground); } dd { overflow-wrap:anywhere; }
.model-summary { border-top:1px solid var(--border); margin-top:14px; padding-top:14px; } .model-summary h3 { font-weight:600; font-size:13px; } .model-summary p { color:var(--muted-foreground); font-size:11px; line-height:1.8; margin:6px 0; }
summary { cursor:pointer; font-size:12px; margin:10px 0; } ol { padding-left:22px; color:var(--muted-foreground); font-size:11px; line-height:1.9; }
@media(max-width:1100px) { .package-layout { grid-template-columns:1fr; } }
@media(max-width:600px) { .source-fields,.metadata-grid,.format-grid,.planned-grid { grid-template-columns:1fr; } .download-button { width:100%; } }
</style>
