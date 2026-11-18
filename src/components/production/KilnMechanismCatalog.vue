<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { BookOpen, GitCompareArrows, Pencil, Search, X } from 'lucide-vue-next'
import { studioPost } from '@/lib/kiln-studio-api'
import type { CatalogRevision, CatalogVersion, Parameters } from '@/lib/kiln-studio-api'
import { catalogDifference, catalogUseIssue, matchingCatalogVersions, retainCatalogVersion } from '@/lib/kiln-mechanism-catalog'
import { formatKilnNumber, KILN_PARAMETER_DIGITS } from '@/lib/kiln-studio-format'

const props = defineProps<{
  open: boolean
  compareKey: string
  currentLabel: string
  items: CatalogVersion[]
  current: Record<string, CatalogVersion>
  enabledKeys: string[]
  alternatives: string[]
  hasDataset: boolean
  disabled: boolean
  loading: boolean
  error: string
}>()
const emit = defineEmits<{
  close: []
  saved: []
  refresh: []
  use: [version: CatalogVersion]
  alternative: [version: CatalogVersion]
}>()
const dialog = ref<HTMLDialogElement>()
const editName = ref<HTMLInputElement>()
const mode = ref<'library' | 'compare'>('library')
const search = ref('')
const filter = ref<'all' | 'pending' | 'approved' | 'alternatives'>('all')
const selectedId = ref('')
const key = ref('')
const edit = ref<CatalogRevision>()
const inputs = ref('')
const saving = ref(false)
const saveError = ref('')
let session = 0
const statusLabels: Record<CatalogVersion['status'], string> = {
  builtin: '内置', pending: '待审核', approved: '已收录', reviewed: '已处理候选',
}
const pendingCount = computed(() => props.items.filter(item => item.status === 'pending').length)
const groups = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  const grouped = new Map<string, CatalogVersion[]>()
  for (const item of props.items) {
    if (item.status === 'reviewed') continue
    if (filter.value === 'pending' && item.status !== 'pending') continue
    if (filter.value === 'approved' && !['approved', 'builtin'].includes(item.status)) continue
    if (filter.value === 'alternatives' && !props.alternatives.includes(item.id)) continue
    if (query && ![item.name, item.role, item.formula, item.explanation, ...item.evidence.map(s => s.file)]
      .some(value => value.toLocaleLowerCase().includes(query))) continue
    const group = grouped.get(item.key) ?? []
    group.push(item)
    grouped.set(item.key, group)
  }
  return [...grouped].map(([groupKey, versions]) => ({
    key: groupKey, versions,
    label: versions.find(item => item.status !== 'pending')?.name ?? versions[0]!.name,
  }))
})
const group = computed(() => groups.value.find(item => item.versions.some(version => version.id === selectedId.value)) ?? groups.value[0])
const currentItem = computed(() => props.current[key.value])
const comparisonSourceLabel = computed(() => currentItem.value?.status === 'approved'
  ? `本次机理 · ${currentItem.value.version}` : props.currentLabel)
const compareOptions = computed(() => currentItem.value ? matchingCatalogVersions(props.items, currentItem.value) : [])
const selected = computed(() => mode.value === 'compare'
  ? (compareOptions.value.find(item => item.version.id === selectedId.value) ?? compareOptions.value[0])?.version
  : group.value?.versions.find(item => item.id === selectedId.value) ?? group.value?.versions[0])
const difference = computed(() => currentItem.value && selected.value ? catalogDifference(currentItem.value, selected.value) : undefined)
const useIssue = computed(() => selected.value ? catalogUseIssue(selected.value, props.enabledKeys.includes(selected.value.key)) : '')
const isAlternative = computed(() => !!selected.value && props.alternatives.includes(selected.value.id))
const isCurrent = computed(() => !!selected.value && props.current[selected.value.key]?.id === selected.value.id
  && (selected.value.status !== 'builtin' || props.enabledKeys.includes(selected.value.key)))
const parameterImpact = computed(() => selected.value?.task && props.enabledKeys.includes(selected.value.key)
  ? selected.value.parameterDefinitions.filter(
  ({ key: param }) => selected.value?.parameterValues[param] !== undefined
    && selected.value?.parameterValues[param] !== currentItem.value?.parameterValues[param],
) : [])
const parameterValuesDiffer = computed(() => {
  const current = currentItem.value?.parameterValues ?? {}
  const candidate = selected.value?.parameterValues ?? {}
  return [...Object.entries(current), ...Object.entries(candidate)].some(([key]) =>
    current[key as keyof Parameters] !== candidate[key as keyof Parameters])
})
const rows = [
  { title: '说明', field: 'explanation' },
  { title: '核心公式', field: 'formula' },
  { title: '输入与单位', field: 'variables' },
  { title: '参数与依据', field: 'parameterNotes' },
  { title: '适用条件', field: 'check' },
  { title: '适用范围', field: 'scope' },
  { title: '当前数据验证', field: 'validationStatus' },
] as const

function versionLabel(item: CatalogVersion) {
  if (item.sourcePlan) return `${item.sourcePlan.title} · ${item.version}`
  return item.status === 'builtin' ? '内置版' : `${item.version} · ${statusLabels[item.status]}`
}

function fieldValue(item: CatalogVersion, field: typeof rows[number]['field']) {
  if (field === 'variables') return item.variables.join('\n')
  if (field === 'parameterNotes') {
    return [item.parameterNotes, ...item.parameterDefinitions
      .filter(({ key: param }) => item.parameterValues[param] !== undefined)
      .map(({ key: param, label, unit }) => {
        const source = item.parameterSources?.[param]
        return `${label} ${formatKilnNumber(item.parameterValues[param], KILN_PARAMETER_DIGITS)} ${unit}${source ? ' · ' + source : ''}`
      })].filter(Boolean).join('\n')
  }
  if (field === 'scope') {
    const scope = item.scope
    return [
      scope.kilnCode, scope.zoneCount ? `${scope.zoneCount} 温区` : '',
      scope.burnerCount ? `${scope.burnerCount} 烧嘴` : '',
      scope.flowBasis === 'normal' ? '标况流量' : scope.flowBasis === 'unknown' ? '流量口径待确认' : '',
    ].filter(Boolean).join(' · ') || '未限定设备'
  }
  return item[field]
}

function select(id: string) {
  selectedId.value = id
  edit.value = undefined
  saveError.value = ''
}

function compare(groupKey: string, versionId: string) {
  mode.value = 'compare'
  key.value = groupKey
  select(versionId)
}

function beginEdit(item: CatalogVersion) {
  edit.value = {
    name: item.name, explanation: item.explanation, formula: item.formula,
    variables: [...item.variables], parameterNotes: item.parameterNotes,
    parameterValues: { ...item.parameterValues }, check: item.check, scope: { ...item.scope },
  }
  inputs.value = item.variables.join('\n')
  saveError.value = ''
  void nextTick(() => editName.value?.focus())
}

function setParameter(key: keyof Parameters, event: Event) {
  if (!edit.value) return
  const input = event.target as HTMLInputElement
  if (input.value === '') delete edit.value.parameterValues[key]
  else edit.value.parameterValues[key] = input.valueAsNumber
}

async function save(item: CatalogVersion) {
  if (!edit.value || saving.value) return
  const startSession = session
  saving.value = true
  saveError.value = ''
  try {
    const base = await retainCatalogVersion(item)
    const result = await studioPost<CatalogVersion>(`/mechanism-catalog/${encodeURIComponent(base.id)}/revisions`, {
      ...edit.value, variables: inputs.value.split('\n').map(value => value.trim()).filter(Boolean),
    })
    emit('saved')
    if (session !== startSession) return
    if (filter.value === 'pending' || filter.value === 'alternatives') filter.value = 'all'
    if (mode.value === 'library') search.value = ''
    select(result.id)
  } catch (err) {
    if (session === startSession) saveError.value = err instanceof Error ? err.message : '保存机理失败'
  } finally {
    saving.value = false
  }
}

watch(() => props.open, async open => {
  session++
  if (open) {
    mode.value = props.compareKey ? 'compare' : 'library'
    key.value = props.compareKey
    search.value = ''
    filter.value = 'all'
    select('')
    await nextTick()
    if (props.open && !dialog.value?.open) dialog.value?.showModal()
  } else if (dialog.value?.open) {
    dialog.value.close()
  }
}, { flush: 'post' })
</script>

<template>
  <dialog ref="dialog" class="mechanism-dialog" aria-labelledby="mechanism-dialog-title" @close="emit('close')">
    <header class="dialog-header">
      <div>
        <button v-if="mode === 'compare'" class="text-link" type="button" @click="mode = 'library'; select('')">返回机理库</button>
        <h2 id="mechanism-dialog-title"><BookOpen v-if="mode === 'library'" :size="19" />{{ mode === 'library' ? '机理库' : `${currentItem?.name ?? ''} · 机理版本对比` }}</h2>
      </div>
      <button type="button" class="icon-button" aria-label="关闭机理库" @click="dialog?.close()"><X :size="20" /></button>
    </header>
    <div v-if="error" class="dialog-message" role="alert">{{ error }} <button class="text-link" type="button" @click="emit('refresh')">重试</button></div>
    <p v-if="loading" class="dialog-message" role="status">正在刷新机理库…</p>
    <div v-if="!edit && mode === 'library'" class="browse-layout">
      <aside class="browse-list" aria-label="机理列表">
        <label class="search-box"><Search :size="16" /><input v-model="search" autofocus type="search" aria-label="搜索机理" placeholder="搜索名称、公式或资料" /></label>
        <label class="filter-label">筛选
          <select v-model="filter">
            <option value="all">全部机理</option>
            <option value="pending">待审核（{{ pendingCount }}）</option>
            <option value="approved">已收录与内置</option>
            <option value="alternatives">当前草稿的备选（{{ alternatives.length }}）</option>
          </select>
        </label>
        <button v-for="entry in groups" :key="entry.key" type="button" class="group-button"
          :title="entry.versions[0]?.explanation || entry.versions[0]?.formula"
          :aria-pressed="entry.key === group?.key" :disabled="saving" @click="select(entry.versions[0]!.id)">
          <strong>{{ entry.label }}</strong>
          <small>{{ entry.versions.length }} 个版本<span v-if="entry.versions.some(item => item.status === 'pending')"> · 待审核</span></small>
          <span class="group-preview">{{ entry.versions[0]?.explanation || entry.versions[0]?.formula }}</span>
        </button>
        <p v-if="!groups.length && !loading" class="muted">没有符合条件的机理。</p>
      </aside>
      <section v-if="group && selected" class="dialog-detail">
        <div class="detail-head">
          <div><h3>{{ selected.name }}</h3><p>{{ selected.role }} · {{ statusLabels[selected.status] }} · {{ selected.validationStatus }}</p></div>
          <label class="filter-label">版本
            <select :value="selected.id" :disabled="saving" @change="select(($event.target as HTMLSelectElement).value)">
              <option v-for="version in group.versions" :key="version.id" :value="version.id">{{ versionLabel(version) }}</option>
            </select>
          </label>
        </div>
        <template v-if="!edit">
          <dl class="details">
            <template v-for="row in rows.slice(0, -1)" :key="row.field">
              <template v-if="fieldValue(selected, row.field)">
                <dt>{{ row.title }}</dt><dd :class="{ formula: row.field === 'formula' }">{{ fieldValue(selected, row.field) }}</dd>
              </template>
            </template>
          </dl>
          <details v-for="source in selected.evidence" :key="source.id" class="source">
            <summary>{{ source.file }} · {{ source.location }}</summary><p>{{ source.text }}</p>
          </details>
          <p v-if="selected.parseJobId" class="muted">解析任务 {{ selected.parseJobId }}</p>
          <p v-if="selected.sourcePlan" class="muted">来源方案 {{ selected.sourcePlan.title }}<template v-if="selected.sourcePlan.kilnCode"> · {{ selected.sourcePlan.kilnCode }}</template></p>
          <p v-if="useIssue" class="issue">{{ useIssue }}</p>
          <p v-else-if="!selected.solverSupported" class="muted">可收录为参考，求解取决于对应的求解器和输入映射。</p>
          <div class="action-row">
            <button class="action" type="button" @click="beginEdit(selected)"><Pencil :size="15" />{{ selected.status === 'pending' ? '审核与编辑' : '编辑' }}</button>
            <button v-if="current[selected.key]" class="action" type="button" @click="compare(selected.key, selected.id)"><GitCompareArrows :size="15" />与本次机理对比</button>
            <button v-else-if="hasDataset && !isCurrent && selected.status === 'approved'" class="action primary" type="button" :disabled="disabled || !!useIssue" @click="emit('use', selected)">收录到当前草稿</button>
            <button v-if="isAlternative" class="action" type="button" :disabled="disabled" @click="emit('alternative', selected)">移除备选</button>
          </div>
        </template>
      </section>
    </div>

    <section v-else-if="!edit && currentItem && selected" class="dialog-detail comparison">
      <div class="detail-head">
        <p class="compare-status" :class="{ recommended: difference?.recommends }">{{ difference?.text }}</p>
        <label class="filter-label">对比版本
          <select :value="selected.id" :disabled="saving" @change="select(($event.target as HTMLSelectElement).value)">
            <option v-for="option in compareOptions" :key="option.version.id" :value="option.version.id">{{ versionLabel(option.version) }}</option>
          </select>
        </label>
      </div>
      <template v-if="!edit">
        <div class="diff-table">
          <table>
            <thead><tr><th scope="col">对比项</th><th scope="col">{{ comparisonSourceLabel }}</th><th scope="col">库中版本 · {{ selected.version }}</th></tr></thead>
            <tbody>
              <tr v-if="selected.sourcePlan">
                <th scope="row">来源方案</th><td>{{ currentItem.sourcePlan?.title ?? comparisonSourceLabel }}</td>
                <td>{{ selected.sourcePlan.title }}<template v-if="selected.sourcePlan.kilnCode"> · {{ selected.sourcePlan.kilnCode }}</template><template v-if="selected.sourcePlan.notes"><br />{{ selected.sourcePlan.notes }}</template></td>
              </tr>
              <tr v-for="row in rows" :key="row.field">
                <th scope="row">{{ row.title }}</th>
                <td>{{ fieldValue(currentItem, row.field) || '—' }}</td>
                <td :class="{ changed: (row.field === 'parameterNotes' && parameterValuesDiffer) || fieldValue(currentItem, row.field) !== fieldValue(selected, row.field) }">{{ fieldValue(selected, row.field) || '—' }}</td>
              </tr>
              <tr>
                <th scope="row">资料出处</th>
                <td v-for="version in [currentItem, selected]" :key="version.id">
                  <span v-if="!version.evidence.length" class="muted">暂无出处</span>
                  <details v-for="source in version.evidence" :key="source.id" class="source">
                    <summary>{{ source.file }} · {{ source.location }}</summary><p>{{ source.text }}</p>
                  </details>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="useIssue" class="issue">{{ useIssue }}</p>
        <p v-else-if="parameterImpact.length" class="issue">替换将采用库中参数 {{ parameterImpact.map(param => `${param.label} ${formatKilnNumber(selected?.parameterValues[param.key], KILN_PARAMETER_DIGITS)} ${param.unit}`).join('、') }}，保存后需在当前数据重新验证。</p>
        <p v-else-if="selected.task && !enabledKeys.includes(selected.key)" class="muted">应用后收录到草稿。符合求解条件时，可在清单中启用。</p>
        <div class="action-row">
          <button v-if="selected.status === 'pending'" class="action primary" type="button" @click="beginEdit(selected)"><Pencil :size="15" />审核与编辑</button>
          <button v-else class="action primary" type="button" :disabled="!hasDataset || disabled || !!useIssue" @click="emit('use', selected)">替换本次机理</button>
          <button class="action" type="button" @click="dialog?.close()">保留当前</button>
          <button v-if="selected.status === 'approved'" class="action" type="button" :disabled="!hasDataset || disabled" @click="emit('alternative', selected)">{{ isAlternative ? '移除备选' : '作为备选' }}</button>
        </div>
      </template>
    </section>
    <section v-else-if="!edit && !loading && !error" class="dialog-detail">
      <h3 v-if="currentItem">{{ currentItem.name }} · {{ currentLabel }}</h3>
      <p class="muted">此机理暂无可比较的其他版本。上传并解析新资料、审核候选，或保存过同类机理的历史方案后，可在这里对比。</p>
      <button class="action" type="button" @click="mode = 'library'; select('')">浏览机理库</button>
    </section>

    <form v-if="edit && selected" class="edit-form" @submit.prevent="save(selected)">
      <h3>{{ selected.status === 'pending' ? '审核资料机理' : '编辑机理版本' }}</h3>
      <p v-if="selected.evidence.length" class="muted">保存时会保留来源。请核对原文再确认公式和适用范围。</p>
      <details v-for="source in selected.evidence" :key="source.id" class="source">
        <summary>{{ source.file }} · {{ source.location }}</summary><p>{{ source.text }}</p>
      </details>
      <label>机理名称<input ref="editName" v-model.trim="edit.name" required maxlength="160" /></label>
      <label>说明<textarea v-model.trim="edit.explanation" maxlength="2400" rows="2" /></label>
      <label>公式<textarea v-model.trim="edit.formula" maxlength="1500" rows="2" /></label>
      <label>输入与单位（每行一个）<textarea v-model="inputs" maxlength="3864" rows="3" /></label>
      <label>参数、单位与取值依据<textarea v-model.trim="edit.parameterNotes" maxlength="2400" rows="3" /></label>
      <div v-if="selected.parameterDefinitions.length" class="fields">
        <label v-for="param in selected.parameterDefinitions" :key="param.key">{{ param.label }}（{{ param.unit }}）
          <input type="number" step="any" :value="edit.parameterValues[param.key]" placeholder="沿用项目参数" @input="setParameter(param.key, $event)" />
        </label>
      </div>
      <label>适用条件<textarea v-model.trim="edit.check" maxlength="1800" rows="2" /></label>
      <div class="fields">
        <label>适用窑炉编号<input v-model.trim="edit.scope.kilnCode" maxlength="40" placeholder="不限" /></label>
        <label>温区数<input type="number" :value="edit.scope.zoneCount ?? ''" min="1" max="16" step="1" placeholder="不限" @input="edit.scope.zoneCount = ($event.target as HTMLInputElement).valueAsNumber || null" /></label>
        <label>烧嘴数<input type="number" :value="edit.scope.burnerCount ?? ''" min="1" max="64" step="1" placeholder="不限" @input="edit.scope.burnerCount = ($event.target as HTMLInputElement).valueAsNumber || null" /></label>
        <label>流量口径<select v-model="edit.scope.flowBasis"><option value="">不限</option><option value="normal">标况</option><option value="unknown">待确认</option></select></label>
      </div>
      <p v-if="saveError" class="issue" role="alert">{{ saveError }}</p>
      <div class="action-row">
        <button class="action primary" type="submit" :disabled="saving || !edit.name">{{ saving ? '正在保存…' : selected.status === 'pending' ? '确认入库' : '保存新版本' }}</button>
        <button class="action" type="button" :disabled="saving" @click="edit = undefined">取消</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.mechanism-dialog { position: fixed; inset: 0; width: min(940px, calc(100% - 32px)); max-height: 88dvh; margin: auto; overflow: auto; background: var(--card); color: var(--foreground); border: 1px solid var(--border); border-radius: 12px; font-size: 13px; }
.mechanism-dialog::backdrop { background: #14242d85; }
.dialog-header { position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; align-items: center; padding: 16px 22px; background: var(--card); border-bottom: 1px solid var(--border); }
.dialog-header h2 { display: flex; align-items: center; gap: 9px; font-size: 18px; font-weight: 650; }
.icon-button { padding: 6px; border-radius: 5px; color: var(--muted-foreground); cursor: pointer; }
.icon-button:hover { background: var(--muted); color: var(--foreground); }
.browse-layout { display: grid; grid-template-columns: minmax(190px, 245px) minmax(0, 1fr); min-height: 350px; }
.browse-list { border-right: 1px solid var(--border); background: var(--muted); padding: 14px; }
.search-box { display: flex; align-items: center; gap: 8px; padding: 0 8px; background: var(--card); border: 1px solid var(--border); border-radius: 5px; }
.search-box input { min-width: 0; width: 100%; outline: 0; padding: 8px 0; }
.search-box:focus-within { outline: 2px solid var(--ring); }
.filter-label { display: flex; align-items: center; gap: 8px; font-size: 12px; margin: 10px 0; color: var(--muted-foreground); }
.filter-label select, .edit-form input, .edit-form textarea, .edit-form select { background: var(--card); color: var(--foreground); border: 1px solid var(--border); border-radius: 5px; padding: 7px 9px; min-width: 0; }
.filter-label select { max-width: 100%; }
.group-button { width: 100%; text-align: left; display: grid; gap: 3px; padding: 9px; margin: 3px 0; border: 1px solid transparent; border-radius: 6px; cursor: pointer; overflow-wrap: anywhere; }
.group-button small, .muted, .detail-head p { color: var(--muted-foreground); }
.group-button[aria-pressed="true"], .group-button:hover, .group-button:focus-visible { background: var(--card); border-color: var(--border); }
.group-preview { display: none; font-size: 12px; color: var(--muted-foreground); }
.group-button:hover .group-preview, .group-button:focus-visible .group-preview { display: block; }
.dialog-detail, .edit-form { padding: 18px 22px; min-width: 0; }
.detail-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.dialog-detail h3, .edit-form h3 { font-size: 16px; font-weight: 650; }
.details dt { color: var(--muted-foreground); margin-top: 14px; font-size: 12px; }
.details dd { margin: 4px 0; }
.details dd, .source p, .diff-table td { white-space: pre-wrap; overflow-wrap: anywhere; }
.formula { background: var(--muted); border: 1px solid var(--border); border-radius: 5px; padding: 8px; font-family: Consolas, monospace; }
.source { margin-top: 8px; }
.source summary { cursor: pointer; overflow-wrap: anywhere; }
.source p { margin-top: 6px; padding: 8px; background: var(--muted); }
.action-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.action { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border: 1px solid var(--border); background: var(--card); border-radius: 5px; cursor: pointer; }
.action.primary { background: #286e69; border-color: #286e69; color: white; }
.action:disabled { opacity: .55; cursor: default; }
.text-link { color: var(--foreground); text-decoration: underline; cursor: pointer; font-size: 12px; }
.issue, .dialog-message { padding: 8px 11px; background: var(--muted); border-left: 3px solid #b88636; margin: 10px 0; }
.dialog-message { margin: 10px 18px; }
.compare-status.recommended { font-weight: 650; color: var(--foreground); }
.diff-table { overflow: auto; }
.diff-table table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.diff-table th, .diff-table td { text-align: left; vertical-align: top; padding: 8px; border-bottom: 1px solid var(--border); }
.diff-table th:first-child { width: 18%; }
.diff-table thead, .diff-table td.changed { background: var(--muted); }
.edit-form { display: grid; gap: 10px; border-top: 1px solid var(--border); }
.edit-form label { display: grid; gap: 4px; min-width: 0; }
.fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); gap: 8px; }
@media (max-width: 640px) {
  .browse-layout { grid-template-columns: 1fr; }
  .browse-list { max-height: 240px; overflow: auto; border-right: 0; border-bottom: 1px solid var(--border); }
  .dialog-header, .dialog-detail, .edit-form { padding: 12px; }
  .diff-table th, .diff-table td { padding: 6px; }
}
</style>
