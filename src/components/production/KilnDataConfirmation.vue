<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-vue-next'
import type { Dataset, Mapping, MappingDraft, Project, Source, StudioFile } from '@/lib/kiln-studio-api'
import { formatKilnNumber as fmt } from '@/lib/kiln-studio-format'

const props = defineProps<{
  project: Project
  files: StudioFile[]
  fields: { key: string; label: string }[]
  dataset?: Dataset
  mappingDraft?: MappingDraft
  unexpandedZipCount: number
  disabled: boolean
  saving?: boolean
}>()
const kilnCode = defineModel<string>('kilnCode', { required: true })
const zoneCount = defineModel<number>('zoneCount', { required: true })
const burnerCount = defineModel<number>('burnerCount', { required: true })
const flowConfirmed = defineModel<boolean>('flowConfirmed', { required: true })
const acknowledge = defineModel<boolean>('acknowledge', { required: true })
const fileEnabled = defineModel<Record<string, boolean>>('fileEnabled', { required: true })
const useStandard = defineModel<Record<string, boolean>>('useStandard', { required: true })
const mappings = defineModel<Record<string, Mapping[]>>('mappings', { required: true })
const emit = defineEmits<{
  confirm: []
  interpret: []
  applySuggestions: []
  reparse: []
  source: [source: Source]
  column: [fileId: string, column: string, event: Event]
}>()
const search = ref('')
const filter = ref('all')
const page = ref(1)
const qualityPage = ref(1)
const pageSize = 8
const expandedId = ref('')
const selectedFiles = computed(() => props.files.filter(file => fileEnabled.value[file.id]))
const selectedRows = computed(() => selectedFiles.value.reduce((sum, file) => sum + (file.rowCount ?? 0), 0))
function needsReview(file: StudioFile) {
  return file.status !== 'ready' || (!useStandard.value[file.id] && !mappings.value[file.id]?.some(item => item.field === 'ts'))
}
const reviewCount = computed(() => props.files.filter(needsReview).length)
const filtered = computed(() => props.files.filter(file => {
  if (!file.path.toLowerCase().includes(search.value.trim().toLowerCase())) return false
  if (filter.value === 'selected') return fileEnabled.value[file.id]
  if (filter.value === 'excluded') return !fileEnabled.value[file.id]
  if (filter.value === 'review') return needsReview(file)
  return true
}))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const allFilteredSelected = computed(() => !!filtered.value.length && filtered.value.every(file => fileEnabled.value[file.id]))
const someFilteredSelected = computed(() => filtered.value.some(file => fileEnabled.value[file.id]) && !allFilteredSelected.value)
const canConfirm = computed(() => !props.disabled && props.project.status === 'parsed' && flowConfirmed.value && acknowledge.value && selectedFiles.value.length > 0)
const qualityPageCount = computed(() => Math.max(1, Math.ceil((props.dataset?.summary.length ?? 0) / pageSize)))
const qualityRows = computed(() => props.dataset?.summary.slice((qualityPage.value - 1) * pageSize, qualityPage.value * pageSize) ?? [])
watch(() => props.dataset?.id, () => { qualityPage.value = 1 })
watch(qualityPageCount, count => { qualityPage.value = Math.min(qualityPage.value, count) })
watch([search, filter], () => { page.value = 1; expandedId.value = '' })
watch(pageCount, count => { page.value = Math.min(page.value, count) })
watch(page, () => { expandedId.value = '' })
function selectFiltered() {
  const enabled = !allFilteredSelected.value
  const next = { ...fileEnabled.value }
  filtered.value.forEach(file => { next[file.id] = enabled })
  fileEnabled.value = next
}
function fileName(path: string) { return path.split('/').pop() ?? path }
function mappingLabel(file: StudioFile) {
  if (useStandard.value[file.id]) return '标准双表 · 自动合并'
  return `已映射 ${mappings.value[file.id]?.length ?? 0} 个测点`
}
function time(value: string) { return value.replace('T', ' ').slice(0, 16) }
</script>

<template>
  <div class="data-confirmation">
    <section class="surface equipment">
      <details>
        <summary class="equipment-summary"><span><strong>设备与数据口径</strong><small>{{ kilnCode }} · {{ zoneCount }} 温区 · {{ burnerCount }} 烧嘴</small></span><span class="summary-action">修改设备 / 查看依据</span></summary>
        <div class="equipment-body">
          <div class="form-grid">
            <label>窑炉编号<input v-model="kilnCode" :disabled="disabled" maxlength="40" class="control" /></label>
            <label>有效温区数<input v-model.number="zoneCount" :disabled="disabled" type="number" min="1" max="16" class="control" /></label>
            <label>烧嘴数量<input v-model.number="burnerCount" :disabled="disabled" type="number" min="1" max="64" class="control" /></label>
          </div>
          <p v-if="project.equipmentSuggestion" class="hint">设备数量已根据资料预填，请核对。</p>
          <button v-for="item in project.equipmentSuggestion?.evidence" :key="item.id" type="button" class="citation" @click="emit('source', item)">{{ item.file }} · {{ item.location }}：{{ item.text }}</button>
        </div>
      </details>
      <div class="checks">
        <label><input v-model="flowConfirmed" :disabled="disabled" type="checkbox" />空气、燃气均采用相同标况口径（Nm³/h）</label>
        <label><input v-model="acknowledge" :disabled="disabled" type="checkbox" />已核对设备数量、资料冲突及流量空燃比与阀位比的区别</label>
        <details v-if="project.conflicts.length" class="conflicts"><summary>{{ project.conflicts.length }} 条资料提醒 · 点击核对</summary><p v-for="item in project.conflicts" :key="item">{{ item }}</p></details>
      </div>
    </section>

    <section class="surface files">
      <header class="section-head">
        <div><h2>工况文件</h2><p>已选 {{ selectedFiles.length }} / {{ files.length }} 份 · {{ fmt(selectedRows, 0) }} 行<span v-if="reviewCount"> · {{ reviewCount }} 份待核对</span></p></div>
        <div class="actions"><button type="button" class="btn" :disabled="disabled || project.status !== 'parsed'" @click="emit('interpret')"><Sparkles :size="13" />AI 识别测点</button><button type="button" class="btn primary" :disabled="!canConfirm" :aria-busy="saving" @click="emit('confirm')"><Check :size="14" />{{ saving ? '正在保存…' : '确认并保存数据版本' }}</button></div>
      </header>
      <p class="hint file-intro">每份勾选文件作为一个独立窑次。列表每页 {{ pageSize }} 份，保存包含所有页面中勾选的文件。</p>
      <p v-if="!flowConfirmed || !acknowledge || !selectedFiles.length" class="hint pending-hint">待完成：{{ [!flowConfirmed && '确认流量口径', !acknowledge && '核对设备与资料', !selectedFiles.length && '勾选工况文件'].filter(Boolean).join('、') }}。</p>
      <div class="toolbar">
        <label class="search"><Search :size="14" /><input v-model="search" type="search" placeholder="搜索文件名或路径" aria-label="搜索工况文件" /></label>
        <select v-model="filter" class="control" aria-label="筛选工况文件"><option value="all">全部文件</option><option value="selected">已勾选</option><option value="excluded">未勾选</option><option value="review">待核对</option></select>
        <label class="select-all"><input type="checkbox" :checked="allFilteredSelected" :indeterminate="someFilteredSelected" :disabled="disabled || !filtered.length" @change="selectFiltered" />全选筛选结果（{{ filtered.length }}）</label>
      </div>
      <div class="file-list">
        <article v-for="file in visible" :key="file.id" class="file-row">
          <div class="file-summary">
            <input v-model="fileEnabled[file.id]" type="checkbox" :disabled="disabled" :aria-label="`选择 ${fileName(file.path)}`" />
            <button type="button" class="file-title" :title="file.path" :aria-expanded="expandedId === file.id" @click="expandedId = expandedId === file.id ? '' : file.id"><span>{{ fileName(file.path) }}</span><small :class="{ warning: needsReview(file) }">{{ mappingLabel(file) }}<template v-if="needsReview(file)"> · 待核对</template></small></button>
            <span class="row-count">{{ fmt(file.rowCount, 0) }} 行</span>
            <button type="button" class="btn tiny" :aria-expanded="expandedId === file.id" @click="expandedId = expandedId === file.id ? '' : file.id">{{ expandedId === file.id ? '收起' : '配置' }}</button>
          </div>
          <div v-if="expandedId === file.id" class="file-details">
            <p class="full-path">{{ file.path }}</p>
            <p v-if="needsReview(file)" class="warning-note">{{ file.message }}<template v-if="!useStandard[file.id] && !mappings[file.id]?.some(item => item.field === 'ts')"> · 请映射时间列。</template></p>
            <p v-if="!fileEnabled[file.id]" class="hint">此文件未勾选，不会保存到新数据版本。</p>
            <label v-if="file.standard" class="standard-check"><input v-model="useStandard[file.id]" :disabled="disabled" type="checkbox" />使用标准温度/压力双表自动合并</label>
            <template v-if="!useStandard[file.id]">
              <p class="hint">标准值 = 原始值 × 倍率 + 偏移。温度 ℃、流量 Nm³/h、窑压 Pa、燃气与助燃风压力 kPa、氧含量与输出 %；时间列按原值解析。</p>
              <div class="table-wrap"><table><thead><tr><th>原始字段 / 样本</th><th>标准测点</th><th>倍率</th><th>偏移</th></tr></thead><tbody>
                <tr v-for="column in file.columns" :key="column.id">
                  <td>{{ column.label }}<small>{{ column.sample }}</small></td>
                  <td><select :value="mappings[file.id]?.find(m => m.column === column.id)?.field ?? ''" :disabled="disabled" class="control mapping-select" :aria-label="column.label + '映射'" @change="emit('column', file.id, column.id, $event)"><option value="">不使用</option><option v-for="field in fields" :key="field.key" :value="field.key">{{ field.label }}</option></select></td>
                  <template v-if="mappings[file.id]?.find(m => m.column === column.id && m.field !== 'ts')"><td><input v-model.number="mappings[file.id]!.find(m => m.column === column.id)!.scale" :disabled="disabled" type="number" min="0.000001" step="any" class="control small-number" aria-label="单位换算倍率" /></td><td><input v-model.number="mappings[file.id]!.find(m => m.column === column.id)!.offset" :disabled="disabled" type="number" step="any" class="control small-number" aria-label="单位换算偏移" /></td></template><template v-else><td>—</td><td>—</td></template>
                </tr>
              </tbody></table></div>
            </template>
          </div>
        </article>
        <p v-if="files.length && !filtered.length" class="empty">没有匹配的文件，试试调整搜索或筛选条件。</p>
        <div v-if="!files.length" class="empty">
          <template v-if="unexpandedZipCount"><p>有 {{ unexpandedZipCount }} 个内层 ZIP 尚未展开。</p><button type="button" class="btn" :disabled="disabled" @click="emit('reparse')">展开 ZIP 并重新解析</button></template>
          <p v-else>暂无可用工况表，请到“资料解析”查看原因或重新解析资料包。</p>
        </div>
      </div>
      <footer v-if="filtered.length" class="pagination"><span>共 {{ filtered.length }} 份 · 第 {{ page }} / {{ pageCount }} 页</span><div class="actions"><button type="button" class="btn tiny" :disabled="page <= 1" aria-label="上一页工况文件" @click="page--"><ChevronLeft :size="14" />上一页</button><button type="button" class="btn tiny" :disabled="page >= pageCount" aria-label="下一页工况文件" @click="page++">下一页<ChevronRight :size="14" /></button></div></footer>
    </section>

    <details v-if="mappingDraft" class="surface extra-details" :key="mappingDraft.id">
      <summary>AI 测点建议 · {{ mappingDraft.files.length }} 份文件<span>展开查看</span></summary>
      <div class="extra-body"><button type="button" class="btn tiny" :disabled="disabled" @click="emit('applySuggestions')">填入建议并人工确认</button><p class="hint">{{ mappingDraft.summary }}</p><div class="bounded-details"><p v-for="file in mappingDraft.files" :key="file.fileId" class="hint">{{ fileName(project.files.find(f => f.id === file.fileId)?.path ?? file.fileId) }}：{{ file.reason }}</p><p v-for="text in mappingDraft.warnings" :key="text" class="warning-note">{{ text }}</p></div></div>
    </details>
    <details v-if="dataset" class="surface extra-details">
      <summary>已保存数据质量 · {{ fmt(dataset.rowCount, 0) }} 行 / {{ dataset.summary.length }} 份文件<span>展开查看</span></summary>
      <div class="extra-body"><p class="hint">对应 {{ dataset.title }}，每页展示 {{ pageSize }} 份已保存文件。</p><div class="bounded-details"><div v-for="item in qualityRows" :key="item.fileId" class="quality-row"><strong :title="item.file">{{ fileName(item.file) }}</strong><p>{{ time(item.from) }} — {{ time(item.to) }} · {{ fmt(item.count, 0) }} 行 · 无效时间 {{ item.skippedTimeRows }} · 重复时间 {{ item.duplicateTimes }}</p><div class="badges"><span v-for="field in item.fields" :key="field.key" class="badge">{{ fields.find(f => f.key === field.key)?.label ?? field.key }} {{ field.total ? fmt(field.present / field.total * 100, 1) : '0' }}%</span></div></div><p v-for="text in dataset.qualityNotes" :key="text" class="hint">{{ text }}</p></div><div v-if="qualityPageCount > 1" class="pagination"><span>第 {{ qualityPage }} / {{ qualityPageCount }} 页</span><div class="actions"><button type="button" class="btn tiny" :disabled="qualityPage <= 1" @click="qualityPage--">上一页</button><button type="button" class="btn tiny" :disabled="qualityPage >= qualityPageCount" @click="qualityPage++">下一页</button></div></div></div>
    </details>
  </div>
</template>

<style scoped>
.data-confirmation { display:grid; gap:12px; font-size:12px; }
.surface { background:var(--card); border:1px solid var(--border); border-radius:9px; min-width:0; }
.equipment-summary { padding:14px 18px; cursor:pointer; } .equipment-summary>span:first-child { display:inline-flex; flex-wrap:wrap; gap:8px 20px; align-items:center; } .equipment-summary strong { font-size:14px; } .equipment-summary small,.summary-action { color:var(--muted-foreground); font-size:12px; } .summary-action { float:right; }
.equipment-body { padding:0 18px 14px; } .form-grid { display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; } .form-grid label { display:grid; gap:6px; color:var(--muted-foreground); }
.checks { padding:12px 18px; display:grid; gap:10px; border-top:1px solid var(--border); } .checks>label,.standard-check,.select-all { display:flex; gap:8px; align-items:center; line-height:1.6; }
input[type=checkbox] { accent-color:#347f73; flex-shrink:0; } .conflicts { color:#ad7627; } .conflicts summary { cursor:pointer; } .conflicts p { margin-top:7px; padding-left:12px; border-left:2px solid #c89b52; line-height:1.7; }
.section-head { display:flex; gap:12px; align-items:center; justify-content:space-between; padding:14px 18px 8px; flex-wrap:wrap; } h2 { font-size:15px; font-weight:600; } .section-head p { margin-top:5px; color:var(--muted-foreground); }
.actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; } .btn { display:inline-flex; align-items:center; justify-content:center; gap:5px; border:1px solid var(--border); border-radius:5px; padding:8px 12px; cursor:pointer; white-space:nowrap; background:var(--card); font-size:12px; } .btn:hover { background:var(--muted); } .btn:disabled { opacity:.45; cursor:not-allowed; } .btn.primary { background:#347f73; border-color:#347f73; color:white; } .btn.tiny { padding:5px 8px; font-size:11px; }
.hint { color:var(--muted-foreground); font-size:11px; line-height:1.8; } .file-intro,.pending-hint { padding:0 18px; } .pending-hint { color:#ad7627; }
.toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding:12px 18px; } .search { display:flex; align-items:center; gap:7px; border:1px solid var(--border); border-radius:5px; padding:7px 9px; flex:1; min-width:140px; } .search input { width:100%; min-width:0; background:transparent; outline:none; }
.control { border:1px solid var(--border); border-radius:5px; padding:7px 9px; background:var(--muted); color:var(--foreground); min-width:0; } .toolbar>.control { width:auto; }
.file-row { border-top:1px solid var(--border); } .file-summary { display:flex; align-items:center; gap:12px; padding:10px 18px; } .file-title { text-align:left; flex:1; min-width:0; cursor:pointer; } .file-title>span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; } .file-title small { display:block; margin-top:3px; font-size:10px; color:var(--muted-foreground); } .file-title small.warning { color:#ad7627; } .row-count { white-space:nowrap; color:var(--muted-foreground); font-size:11px; }
.file-details { padding:0 18px 16px; } .full-path { overflow-wrap:anywhere; color:var(--muted-foreground); font-size:10px; margin:0 0 12px; } .standard-check { margin:10px 0; }
.table-wrap { margin-top:10px; max-height:330px; overflow:auto; border:1px solid var(--border); border-radius:5px; } table { width:100%; border-collapse:collapse; font-size:11px; } th,td { padding:8px; border-bottom:1px solid var(--border); text-align:left; } th { position:sticky; top:0; background:var(--muted); z-index:1; } td small { display:block; color:var(--muted-foreground); margin-top:3px; } .mapping-select { min-width:130px; } .small-number { width:85px; }
.pagination { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 18px; border-top:1px solid var(--border); color:var(--muted-foreground); font-size:11px; } .empty { padding:24px 18px; color:var(--muted-foreground); } .empty button { margin-top:10px; }
.extra-details>summary { padding:13px 18px; cursor:pointer; } .extra-details>summary span { float:right; color:var(--muted-foreground); font-size:11px; } .extra-body { padding:0 18px 14px; } .bounded-details { max-height:260px; overflow:auto; } .quality-row { padding:12px 0; border-bottom:1px solid var(--border); } .quality-row p { margin:5px 0; font-size:11px; color:var(--muted-foreground); } .badges { display:flex; flex-wrap:wrap; gap:5px; } .badge { font-size:10px; border:1px solid var(--border); border-radius:4px; padding:3px 5px; color:var(--muted-foreground); } .warning-note { padding:8px 10px; margin:8px 0; border-left:2px solid #c89b52; color:#ad7627; background:#c89b5208; line-height:1.8; } .citation { display:block; width:100%; margin-top:8px; padding:8px; text-align:left; overflow-wrap:anywhere; background:var(--muted); color:var(--muted-foreground); border-radius:5px; cursor:pointer; font-size:11px; }
@media(max-width:700px) { .summary-action { display:none; } .form-grid { grid-template-columns:1fr; } .section-head>.actions { width:100%; } .file-summary { gap:8px; padding:10px 12px; } .row-count { display:none; } .extra-details>summary span { display:none; } }
</style>
