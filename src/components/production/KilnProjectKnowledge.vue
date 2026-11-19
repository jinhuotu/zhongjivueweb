<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowLeft, BookOpen, Download, FileText, Loader2, Plus, RotateCcw, Search, Sparkles, Trash2 } from 'lucide-vue-next'
import { appendStudioFiles, deleteStudioFile, downloadStudioFile, studioPost } from '@/lib/kiln-studio-api'
import type { CatalogVersion, Job, Project, StudioFile } from '@/lib/kiln-studio-api'

const props = defineProps<{ project: Project; catalog: CatalogVersion[]; disabled: boolean; catalogError: string }>()
const emit = defineEmits<{ close: []; catalog: []; changed: []; job: [job: Job] }>()
const picker = ref<HTMLInputElement>()
const search = ref('')
const selected = ref<string[]>([])
const detailId = ref('')
const pendingDelete = ref('')
const pending = ref(false)
const error = ref('')
const notice = ref('')
const mode = ref<'rules' | 'ai'>('rules')
let disposed = false
onBeforeUnmount(() => { disposed = true })
function receiveJob(job: Job) { if (!disposed) emit('job', job) }
const blocked = computed(() => pending.value || props.disabled)
const files = computed(() => props.project.files.filter(file => file.path.toLowerCase().includes(search.value.toLowerCase())))
const detail = computed(() => props.project.files.find(file => file.id === detailId.value))
const related = (file: StudioFile) => props.catalog.filter(item => item.status !== 'reviewed' && item.evidence.some(source => source.fileId === file.id))
const canRecognize = computed(() => props.project.files.some(file => (!selected.value.length || selected.value.includes(file.id)) && file.sources.length))
const allSelected = computed(() => !!files.value.length && files.value.every(file => selected.value.includes(file.id)))
const status: Record<string, string> = { ready: '已解析', confirm: '待确认', failed: '解析失败', unsupported: '暂不支持' }

watch(() => props.project.files, items => {
  const ids = new Set(items.map(file => file.id))
  selected.value = selected.value.filter(id => ids.has(id))
  if (!ids.has(detailId.value)) detailId.value = ''
  if (!ids.has(pendingDelete.value)) pendingDelete.value = ''
})
function toggleAll() {
  const visible = new Set(files.value.map(file => file.id))
  selected.value = allSelected.value ? selected.value.filter(id => !visible.has(id)) : [...new Set([...selected.value, ...visible])]
}
async function action(fn: () => Promise<void>) {
  if (blocked.value) return
  pending.value = true; error.value = ''; notice.value = ''
  try { await fn() } catch (err) { error.value = err instanceof Error ? err.message : '操作失败，请重试' }
  finally { pending.value = false }
}
function upload(event: Event) {
  const el = event.target as HTMLInputElement
  const uploads = Array.from(el.files ?? [])
  el.value = ''
  if (uploads.length) void action(async () => receiveJob(await appendStudioFiles(props.project.id, uploads)))
}
function recognize(fileIds = selected.value) {
  void action(async () => receiveJob(await studioPost<Job>(`/projects/${props.project.id}/knowledge/recognize`, { fileIds, mode: mode.value })))
}
function reparse(file: StudioFile) {
  void action(async () => receiveJob(await studioPost<Job>(`/projects/${props.project.id}/files/${file.id}/reparse`, {})))
}
function remove(file: StudioFile) {
  void action(async () => {
    await deleteStudioFile(props.project.id, file.id)
    pendingDelete.value = ''
    notice.value = '资料已从当前项目移除，历史机理与实验的来源快照已保留。'
    if (!disposed) emit('changed')
  })
}
function size(bytes: number) { return bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.ceil(bytes / 1e3)} KB` }
function time(value?: string) { return value ? new Date(value).toLocaleString('zh-CN') : '历史资料' }
</script>

<template>
  <section class="knowledge-page" aria-label="当前项目知识库">
    <input ref="picker" type="file" accept=".zip,.xls,.xlsx,.csv,.docx,.pdf,.txt,.md,.png,.jpg,.jpeg,.bmp" multiple hidden @change="upload" />
    <header class="knowledge-header">
      <div><h2><BookOpen :size="20" />项目知识库</h2><p>{{ project.title }} · {{ project.files.length }} 份资料</p></div>
      <div class="actions">
        <button type="button" @click="emit('close')"><ArrowLeft :size="14" />返回建模</button>
        <button type="button" @click="emit('catalog')"><BookOpen :size="14" />查看机理库</button>
        <button type="button" class="primary" :disabled="blocked" @click="picker?.click()"><Plus :size="14" />添加资料</button>
      </div>
    </header>
    <p class="intro">上传资料后自动解析并提取待审核机理。可进一步使用 AI 识别工程关系，无需先确认工况数据；审核通过后可在机理库复用。</p>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-if="notice" class="feedback success" role="status">{{ notice }}</p>
    <p v-if="catalogError" class="feedback error" role="alert">机理列表暂时无法读取：{{ catalogError }} <button @click="emit('catalog')">刷新机理库</button></p>
    <div class="toolbar">
      <label class="search"><Search :size="15" /><input v-model="search" placeholder="搜索资料名称" aria-label="搜索资料" /></label>
      <span class="muted">已选 {{ selected.length }} 份{{ selected.length ? '' : '，默认识别全部资料' }}</span>
      <select v-model="mode" :disabled="blocked" aria-label="机理识别方式"><option value="rules">规则识别</option><option value="ai">AI 机理识别</option></select>
      <button type="button" :disabled="blocked || !canRecognize" @click="recognize()"><Loader2 v-if="pending" class="spin" :size="14" /><Sparkles v-else :size="14" />{{ selected.length ? '识别所选资料' : '识别全部资料' }}</button>
    </div>
    <div class="content" :class="{ 'with-detail': detail }">
      <div class="file-list">
        <label class="select-all"><input type="checkbox" :checked="allSelected" :disabled="blocked || !files.length" @change="toggleAll" />全选当前列表<span>文件 / 解析状态 / 机理</span></label>
        <p v-if="!files.length" class="empty">{{ project.files.length ? '没有匹配的资料。' : '还没有资料，点击“添加资料”上传文件。' }}</p>
        <article v-for="file in files" :key="file.id" :class="{ selected: detailId === file.id }">
          <div class="file-heading">
            <input v-model="selected" type="checkbox" :value="file.id" :disabled="blocked" :aria-label="`选择 ${file.path}`" />
            <FileText :size="18" class="muted" />
            <button type="button" class="file-name" @click="detailId = detailId === file.id ? '' : file.id">{{ file.path }}</button>
            <span class="badge" :class="{ warning: file.status !== 'ready' }">{{ status[file.status] ?? file.status }}</span>
          </div>
          <p class="metadata">{{ size(file.size) }} · {{ file.sources.length }} 个原文片段 · {{ related(file).length }} 条机理 · {{ time(file.uploadedAt) }}</p>
          <p v-if="file.status !== 'ready'" class="file-message">{{ file.message }}<template v-if="file.path.toLowerCase().endsWith('.pdf') && !file.sources.length">；若为扫描 PDF，请先转成可检索 PDF 或上传页面图片。</template></p>
          <div class="row-actions">
            <button type="button" @click="detailId = file.id">查看原文与机理</button>
            <button type="button" :disabled="blocked" @click="action(() => downloadStudioFile(project.id, file))"><Download :size="12" />下载原文件</button>
            <button type="button" :disabled="blocked" @click="reparse(file)"><RotateCcw :size="12" />重新解析</button>
            <button type="button" :disabled="blocked || !file.sources.length" @click="recognize([file.id])"><Sparkles :size="12" />{{ mode === 'ai' ? 'AI 机理识别' : '机理识别' }}</button>
            <button type="button" class="danger" :disabled="blocked" @click="pendingDelete = file.id"><Trash2 :size="12" />删除</button>
          </div>
          <div v-if="pendingDelete === file.id" class="delete-confirm" role="alert">
            <p>确认从当前项目移除此资料？历史模型和已保存机理保留来源快照，重新解析资料包也不会恢复该文件。</p>
            <button type="button" :disabled="blocked" @click="pendingDelete = ''">取消</button><button type="button" class="danger" :disabled="blocked" @click="remove(file)">确认删除</button>
          </div>
        </article>
      </div>
      <aside v-if="detail" class="details">
        <h3>{{ detail.path }}</h3><p class="muted">{{ detail.message }}</p>
        <h4>关联机理 · {{ related(detail).length }}</h4>
        <p v-if="!related(detail).length" class="muted">暂无关联机理，可选择 AI 识别后查看结果。</p>
        <section v-for="item in related(detail)" :key="item.id" class="mechanism">
          <strong>{{ item.name }}</strong><span class="badge">{{ item.status === 'pending' ? '待审核' : '已收录' }}</span>
          <pre v-if="item.formula">{{ item.formula }}</pre><p>{{ item.explanation }}</p><p class="muted">{{ item.validationStatus }}</p>
        </section>
        <button type="button" @click="emit('catalog')">前往机理库审核与管理</button>
        <h4>原文片段 · {{ detail.sources.length }}</h4>
        <p v-if="!detail.sources.length" class="muted">暂无文本片段，可下载原文件查看。工况表请在“数据确认”中查看。</p>
        <details v-for="source in detail.sources" :key="source.id"><summary>{{ source.location }}</summary><pre>{{ source.text }}</pre></details>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.knowledge-page { border:1px solid var(--border); border-radius:10px; background:var(--card); color:var(--foreground); font-size:13px; overflow:hidden; }
.knowledge-header { padding:22px; display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; border-bottom:1px solid var(--border); }
h2 { display:flex; align-items:center; gap:9px; font-size:18px; font-weight:600; } h3 { font-size:14px; font-weight:600; overflow-wrap:anywhere; } h4 { margin:24px 0 12px; font-weight:600; }
.knowledge-header p,.intro { color:var(--muted-foreground); line-height:1.8; } .knowledge-header p { margin-top:7px; } .intro { padding:16px 22px 0; }
.actions,.toolbar,.row-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
button { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:8px 11px; border:1px solid var(--border); border-radius:6px; cursor:pointer; background:var(--card); font-size:12px; }
button:hover { background:var(--muted); } button:disabled { opacity:.45; cursor:not-allowed; } button.primary { background:#347f73; color:white; border-color:#347f73; }
.toolbar { padding:18px 22px; } .search { display:flex; gap:8px; align-items:center; border:1px solid var(--border); border-radius:6px; padding:8px 10px; flex:1; min-width:180px; }
.search input { background:transparent; width:100%; outline:none; } select { padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--card); }
.muted,.metadata { color:var(--muted-foreground); font-size:12px; } .with-detail { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(290px,1fr); }
.file-list { min-width:0; border-top:1px solid var(--border); } .select-all { display:flex; align-items:center; gap:10px; padding:13px 22px; background:var(--muted); } .select-all span { margin-left:auto; color:var(--muted-foreground); }
article { padding:18px 22px; border-bottom:1px solid var(--border); } article.selected { background:#3a897d08; } .file-heading { display:flex; align-items:center; gap:9px; }
.file-name { padding:0; border:0; text-align:left; flex:1; min-width:0; overflow-wrap:anywhere; justify-content:flex-start; font-weight:600; } .badge { border-radius:4px; padding:3px 6px; font-size:11px; background:#3a897d16; color:#347f73; white-space:nowrap; } .badge.warning { color:#ad7627; background:#ad762714; }
.metadata,.file-message { margin:9px 0 12px 28px; line-height:1.7; } .file-message { color:#ad7627; } .row-actions { margin-left:28px; } .row-actions button { padding:5px 8px; font-size:11px; }
.danger { color:#b64d4d; } .empty { padding:50px 22px; text-align:center; color:var(--muted-foreground); }
.details { padding:20px; border-left:1px solid var(--border); border-top:1px solid var(--border); max-height:76vh; overflow:auto; min-width:0; }
.details p { line-height:1.8; margin:8px 0; } .mechanism { padding:12px; border:1px solid var(--border); border-radius:6px; margin:10px 0; } .mechanism .badge { margin-left:8px; }
pre { white-space:pre-wrap; overflow-wrap:anywhere; font-family:inherit; font-size:12px; line-height:1.9; padding:10px; background:var(--muted); margin:8px 0; border-radius:4px; }
details { border-bottom:1px solid var(--border); padding:10px 0; } summary { cursor:pointer; color:var(--muted-foreground); } .feedback,.delete-confirm { padding:12px; margin:14px 22px; border:1px solid var(--border); border-radius:6px; line-height:1.8; }
.feedback.error { color:#b64d4d; } .feedback.success { color:#347f73; } .delete-confirm { margin:12px 0 0; background:var(--muted); } .delete-confirm p { margin-bottom:10px; } .delete-confirm button { margin-right:8px; }
.spin { animation:spin 1s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
@media(max-width:1000px) { .with-detail { grid-template-columns:1fr; } .details { border-left:0; max-height:none; } }
@media(max-width:600px) { .knowledge-header,.toolbar,article { padding:15px; } .row-actions,.metadata,.file-message { margin-left:0; } .select-all span { display:none; } .file-heading { flex-wrap:wrap; } }
</style>
