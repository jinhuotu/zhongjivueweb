<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Eye,
  FileSpreadsheet,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-vue-next'
import { PageHeader, Panel } from '@/components/ui-kit'
import AppAlertDialog from '@/components/ui/AppAlertDialog.vue'
import {
  STATUS_LABEL,
  buildTaskSteps,
  createEmptyTask,
  progressPercent,
  type GovExcelPreview,
  type GovTask,
  type GovTaskStatus,
} from '@/lib/governance-tasks'
import { loadProvidedSampleExcel, parseExcelBuffer } from '@/lib/excel-preview'
import {
  createGovTask,
  deleteGovTask,
  listGovTasks,
  saveGovTaskExcel,
  updateGovTask,
  type GovTaskApi,
} from '@/lib/governance-api'

type ViewMode = 'list' | 'create' | 'detail'

const SOURCE_OPTIONS = [
  { value: 'excel', label: 'Excel 文件' },
  { value: 'opc', label: 'OPC / SCADA' },
  { value: 'api', label: 'API 接口' },
  { value: 'db', label: '业务数据库' },
] as const

function fromApi(item: GovTaskApi): GovTask {
  return {
    id: item.id,
    name: item.name,
    description: item.description || '',
    owner: item.owner,
    sourceType: (item.sourceType as GovTask['sourceType']) || 'excel',
    status: (item.status as GovTaskStatus) || 'draft',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    excel: (item.excel as GovExcelPreview | null) || null,
  }
}

async function fileToBase64(file: File | ArrayBuffer, mime = 'application/octet-stream') {
  if (file instanceof File) {
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    bytes.forEach((b) => {
      binary += String.fromCharCode(b)
    })
    return `data:${file.type || mime};base64,${btoa(binary)}`
  }
  const bytes = new Uint8Array(file)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return `data:${mime};base64,${btoa(binary)}`
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function sourceLabel(value: string) {
  return SOURCE_OPTIONS.find((s) => s.value === value)?.label || value
}

function statusPillClass(status: GovTaskStatus) {
  const map: Record<GovTaskStatus, string> = {
    draft: 'border-hairline text-text-muted bg-bg-base',
    imported: 'border-molybdenum/40 text-molybdenum bg-molybdenum/10',
    in_progress: 'border-sulfur/40 text-sulfur bg-sulfur/10',
    done: 'border-patina/40 text-patina bg-patina/10',
  }
  return map[status]
}

function stepCardClass(status: 'done' | 'current' | 'pending') {
  if (status === 'done') return 'border-patina/35 bg-patina/5'
  if (status === 'current') return 'border-molybdenum/45 bg-molybdenum/5'
  return 'border-hairline bg-bg-base/40'
}

const tasks = ref<GovTask[]>([])
const ready = ref(false)
const mode = ref<ViewMode>('list')
const draft = ref<GovTask>(createEmptyTask())
const isNewDraft = ref(true)
const activeId = ref<string | null>(null)
const toast = ref<string | null>(null)
const importing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const pendingDelete = ref<GovTask | null>(null)
const fileRef = ref<HTMLInputElement | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const active = computed(
  () => tasks.value.find((t) => t.id === activeId.value) || null,
)

const deleteDialogOpen = computed({
  get: () => Boolean(pendingDelete.value),
  set: (open: boolean) => {
    if (!open) pendingDelete.value = null
  },
})

const deleteDescription = computed(() => {
  const name = pendingDelete.value?.name
  if (!name) return ''
  return `确认删除「${name}」？删除后不可恢复，已导入的预览数据也会一并清除。`
})

const detailSteps = computed(() => (active.value ? buildTaskSteps(active.value) : []))
const detailPct = computed(() => (active.value ? progressPercent(active.value) : 0))

async function refresh() {
  const items = await listGovTasks()
  tasks.value = items.map(fromApi)
}

onMounted(() => {
  void (async () => {
    try {
      await refresh()
    } catch (e) {
      toast.value = e instanceof Error ? e.message : '加载任务失败'
    } finally {
      ready.value = true
    }
  })()
})

watch(toast, (v) => {
  if (toastTimer) clearTimeout(toastTimer)
  if (!v) return
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 2800)
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
})

function openCreate() {
  draft.value = createEmptyTask({ owner: '管理员', sourceType: 'excel' })
  isNewDraft.value = true
  mode.value = 'create'
}

async function saveDraft() {
  if (!draft.value.name.trim()) {
    toast.value = '请填写任务名称'
    return
  }
  saving.value = true
  try {
    if (isNewDraft.value || !tasks.value.some((t) => t.id === draft.value.id)) {
      const item = await createGovTask({
        name: draft.value.name.trim(),
        description: draft.value.description,
        owner: draft.value.owner,
        sourceType: draft.value.sourceType,
      })
      await refresh()
      toast.value = '任务已保存到服务器'
      activeId.value = item.id
      isNewDraft.value = false
      mode.value = 'detail'
    } else {
      const item = await updateGovTask(draft.value.id, {
        name: draft.value.name.trim(),
        description: draft.value.description,
        owner: draft.value.owner,
        sourceType: draft.value.sourceType,
      })
      await refresh()
      toast.value = '任务已更新'
      activeId.value = item.id
      mode.value = 'detail'
    }
  } catch (e) {
    toast.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

function openDetail(id: string) {
  activeId.value = id
  mode.value = 'detail'
}

function askDelete(id: string) {
  const target = tasks.value.find((t) => t.id === id)
  if (!target) return
  pendingDelete.value = target
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  deleting.value = true
  try {
    await deleteGovTask(id)
    await refresh()
    if (activeId.value === id) {
      activeId.value = null
      mode.value = 'list'
    }
    pendingDelete.value = null
    toast.value = '任务已删除'
  } catch (e) {
    toast.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    deleting.value = false
  }
}

async function pushExcel(preview: GovExcelPreview, contentBase64?: string) {
  if (!active.value) return
  const item = await saveGovTaskExcel(active.value.id, {
    fileName: preview.fileName,
    sheetName: preview.sheetName,
    headers: preview.headers,
    rows: preview.rows,
    rowCount: preview.rowCount,
    importedAt: preview.importedAt,
    contentBase64,
  })
  await refresh()
  activeId.value = item.id
}

async function onPickFile(file: File | null | undefined) {
  if (!file || !active.value) return
  importing.value = true
  try {
    const buf = await file.arrayBuffer()
    const preview = parseExcelBuffer(buf, file.name)
    const b64 = await fileToBase64(
      buf,
      file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    await pushExcel(preview, b64)
    toast.value = `已导入并保存 ${file.name}（${preview.rowCount} 行）`
  } catch (e) {
    toast.value = e instanceof Error ? e.message : 'Excel 解析失败'
  } finally {
    importing.value = false
    if (fileRef.value) fileRef.value.value = ''
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  void onPickFile(input.files?.[0] || null)
}

async function loadSample() {
  if (!active.value) return
  importing.value = true
  try {
    const preview = await loadProvidedSampleExcel()
    await pushExcel(preview)
    toast.value = '已载入样例 Excel 并保存到服务器'
  } catch (e) {
    toast.value = e instanceof Error ? e.message : '样例加载失败'
  } finally {
    importing.value = false
  }
}

function openEditMeta() {
  if (!active.value) return
  draft.value = { ...active.value }
  isNewDraft.value = false
  mode.value = 'create'
}

function triggerFilePick() {
  fileRef.value?.click()
}
</script>

<template>
  <div
    v-if="!ready"
    class="py-16 text-center text-sm text-text-muted"
  >
    加载任务列表…
  </div>

  <div
    v-else
    class="space-y-4"
  >
    <PageHeader
      title="数据治理"
      description="新建治理任务并保存到服务器；可导入 Excel 预览。对话可引用已导入表格内容。"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <span
            v-if="toast"
            class="text-[12px] text-patina font-mono mr-1"
          >{{ toast }}</span>
          <button
            v-if="mode !== 'list'"
            type="button"
            class="h-8 px-3 rounded-md border border-hairline text-[12px] text-text-secondary hover:bg-bg-elevated"
            @click="mode = 'list'"
          >
            返回列表
          </button>
          <button
            type="button"
            class="h-8 px-3 rounded-md bg-iron text-[#0b0f14] text-[12px] font-medium inline-flex items-center gap-1.5"
            @click="openCreate"
          >
            <Plus class="size-3.5" />
            新建
          </button>
        </div>
      </template>
    </PageHeader>

    <!-- List -->
    <Panel
      v-if="mode === 'list'"
      title="治理任务列表"
      subtitle="支持新建、保存后在此查看进度"
    >
      <template #action>
        <button
          type="button"
          class="h-7 px-2.5 rounded border border-hairline text-[11px] inline-flex items-center gap-1 hover:bg-bg-elevated"
          @click="openCreate"
        >
          <Plus class="size-3" />
          新建任务
        </button>
      </template>

      <div
        v-if="tasks.length === 0"
        class="py-12 text-center text-sm text-text-muted"
      >
        暂无任务，点击右上角「新建」开始
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-[12px]">
          <thead>
            <tr class="text-left text-text-muted border-b border-hairline">
              <th class="py-2 pr-3 font-normal">任务名称</th>
              <th class="py-2 pr-3 font-normal">负责人</th>
              <th class="py-2 pr-3 font-normal">来源</th>
              <th class="py-2 pr-3 font-normal">状态</th>
              <th class="py-2 pr-3 font-normal">进度</th>
              <th class="py-2 pr-3 font-normal">更新时间</th>
              <th class="py-2 font-normal text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in tasks"
              :key="t.id"
              class="border-b border-hairline/60 hover:bg-bg-elevated/40"
            >
              <td class="py-2.5 pr-3">
                <div class="text-text-primary font-medium">{{ t.name }}</div>
                <div class="text-[10px] text-text-muted line-clamp-1">
                  {{ t.description || '—' }}
                </div>
              </td>
              <td class="py-2.5 pr-3 text-text-secondary">{{ t.owner }}</td>
              <td class="py-2.5 pr-3 text-text-secondary">
                {{ sourceLabel(t.sourceType) }}
              </td>
              <td class="py-2.5 pr-3">
                <span
                  :class="[
                    'inline-flex px-1.5 py-0.5 rounded border text-[10px]',
                    statusPillClass(t.status),
                  ]"
                >
                  {{ STATUS_LABEL[t.status] }}
                </span>
              </td>
              <td class="py-2.5 pr-3 min-w-[120px]">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-bg-base overflow-hidden">
                    <div
                      class="h-full rounded-full bg-patina/80"
                      :style="{ width: `${progressPercent(t)}%` }"
                    />
                  </div>
                  <span class="font-mono text-[10px] text-text-muted w-8">
                    {{ progressPercent(t) }}%
                  </span>
                </div>
              </td>
              <td class="py-2.5 pr-3 font-mono text-[10px] text-text-muted">
                {{ fmtTime(t.updatedAt) }}
              </td>
              <td class="py-2.5 text-right">
                <div class="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md border border-hairline text-[11px] inline-flex items-center gap-1 hover:border-molybdenum/50 hover:text-molybdenum"
                    @click="openDetail(t.id)"
                  >
                    <Eye class="size-3" />
                    查看
                  </button>
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md border border-iron/35 text-[11px] text-iron inline-flex items-center gap-1 hover:bg-iron/10"
                    @click="askDelete(t.id)"
                  >
                    <Trash2 class="size-3" />
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <!-- Create / Edit -->
    <Panel
      v-else-if="mode === 'create'"
      title="新建数据治理任务"
      subtitle="保存后写入 MySQL，可供 AI 对话引用"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        <label class="block space-y-1">
          <span class="text-[11px] text-text-muted">任务名称 *</span>
          <input
            v-model="draft.name"
            placeholder="例如：窑炉点位样例治理"
            class="w-full h-9 px-3 rounded-md border border-hairline bg-bg-base text-[13px]"
          >
        </label>
        <label class="block space-y-1">
          <span class="text-[11px] text-text-muted">负责人</span>
          <input
            v-model="draft.owner"
            class="w-full h-9 px-3 rounded-md border border-hairline bg-bg-base text-[13px]"
          >
        </label>
        <label class="block space-y-1">
          <span class="text-[11px] text-text-muted">数据来源</span>
          <select
            v-model="draft.sourceType"
            class="w-full h-9 px-3 rounded-md border border-hairline bg-bg-base text-[13px]"
          >
            <option
              v-for="o in SOURCE_OPTIONS"
              :key="o.value"
              :value="o.value"
            >
              {{ o.label }}
            </option>
          </select>
        </label>
        <label class="block space-y-1">
          <span class="text-[11px] text-text-muted">任务说明</span>
          <input
            v-model="draft.description"
            placeholder="简要说明治理范围与目标"
            class="w-full h-9 px-3 rounded-md border border-hairline bg-bg-base text-[13px]"
          >
        </label>
      </div>
      <div class="mt-5 flex items-center gap-2">
        <button
          type="button"
          :disabled="saving"
          class="h-9 px-4 rounded-md bg-iron text-[#0b0f14] text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
          @click="saveDraft"
        >
          <Loader2
            v-if="saving"
            class="size-3.5 animate-spin"
          />
          <Save
            v-else
            class="size-3.5"
          />
          保存
        </button>
        <button
          type="button"
          class="h-9 px-4 rounded-md border border-hairline text-[13px] inline-flex items-center gap-1.5"
          @click="mode = 'list'"
        >
          <X class="size-3.5" />
          取消
        </button>
      </div>
    </Panel>

    <!-- Detail -->
    <div
      v-else-if="mode === 'detail' && active"
      class="space-y-4"
    >
      <Panel :title="active.name">
        <template #subtitle>
          负责人 {{ active.owner }} · {{ STATUS_LABEL[active.status] }} · 更新
          {{ fmtTime(active.updatedAt) }}
        </template>
        <template #action>
          <button
            type="button"
            class="h-7 px-2.5 rounded border border-hairline text-[11px] inline-flex items-center gap-1"
            @click="openEditMeta"
          >
            <Save class="size-3" />
            编辑并保存
          </button>
        </template>

        <p class="text-[12px] text-text-secondary mb-3">
          {{ active.description || '暂无说明' }}
        </p>
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 h-2 rounded-full bg-bg-base overflow-hidden max-w-md">
            <div
              class="h-full bg-patina/80 rounded-full"
              :style="{ width: `${detailPct}%` }"
            />
          </div>
          <span class="font-mono text-[12px] text-text-muted">本期进度 {{ detailPct }}%</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div
            v-for="(s, i) in detailSteps"
            :key="s.id"
            :class="['rounded-md border p-3', stepCardClass(s.status)]"
          >
            <div class="flex items-start gap-2">
              <Check
                v-if="s.status === 'done'"
                class="size-4 text-patina shrink-0 mt-0.5"
              />
              <CircleDot
                v-else-if="s.status === 'current'"
                class="size-4 text-molybdenum shrink-0 mt-0.5"
              />
              <Clock3
                v-else
                class="size-4 text-text-muted shrink-0 mt-0.5"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-mono text-text-muted">
                    {{ String(i + 1).padStart(2, '0') }}
                  </span>
                  <span class="text-[13px] font-medium text-text-primary">{{ s.title }}</span>
                  <span
                    v-if="s.id !== 'create' && s.id !== 'import' && s.id !== 'preview'"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted"
                  >
                    规划中
                  </span>
                </div>
                <p class="text-[11px] text-text-muted mt-1">{{ s.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div class="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <Panel
          title="导入 Excel"
          subtitle="支持平台样例或本地上传，仅预览不清洗"
        >
          <input
            ref="fileRef"
            type="file"
            accept=".xlsx,.xls,.csv"
            class="hidden"
            @change="onFileChange"
          >
          <div class="space-y-2">
            <button
              type="button"
              :disabled="importing"
              class="w-full h-9 rounded-md border border-molybdenum/40 bg-molybdenum/10 text-[12px] text-molybdenum inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              @click="loadSample"
            >
              <Loader2
                v-if="importing"
                class="size-3.5 animate-spin"
              />
              <FileSpreadsheet
                v-else
                class="size-3.5"
              />
              载入已提供的样例 Excel
            </button>
            <button
              type="button"
              :disabled="importing"
              class="w-full h-9 rounded-md border border-hairline text-[12px] inline-flex items-center justify-center gap-1.5 hover:bg-bg-elevated disabled:opacity-50"
              @click="triggerFilePick"
            >
              <Upload class="size-3.5" />
              上传本地 Excel / CSV
            </button>
            <div
              v-if="active.excel"
              class="mt-3 rounded border border-hairline bg-bg-base/50 p-2.5 text-[11px] space-y-1"
            >
              <div class="flex items-center gap-1.5 text-patina">
                <Check class="size-3.5" />
                已导入，可打开查看
              </div>
              <div class="font-mono text-text-secondary break-all">
                {{ active.excel.fileName }}
              </div>
              <div class="text-text-muted">
                Sheet：{{ active.excel.sheetName }} · {{ active.excel.rowCount }} 行 ·
                {{ active.excel.headers.length }} 列
              </div>
            </div>
            <p
              v-else
              class="text-[11px] text-text-muted pt-2"
            >
              尚未导入文件。可先载入样例，再在右侧表格中查看。
            </p>
          </div>
        </Panel>

        <Panel title="打开查看">
          <template #subtitle>
            <template v-if="active.excel">
              预览前 {{ Math.min(active.excel.rows.length, 200) }} 行（只读）
            </template>
            <template v-else>
              导入后在此查看内容
            </template>
          </template>

          <div
            v-if="!active.excel"
            class="py-16 text-center text-sm text-text-muted"
          >
            暂无数据可查看
          </div>
          <div
            v-else
            class="overflow-auto max-h-[420px] rounded border border-hairline"
          >
            <table class="w-full text-[11px] border-collapse">
              <thead class="sticky top-0 bg-bg-elevated">
                <tr>
                  <th
                    class="px-2 py-1.5 text-left font-normal text-text-muted border-b border-hairline w-10"
                  >
                    #
                  </th>
                  <th
                    v-for="h in active.excel.headers"
                    :key="h"
                    class="px-2 py-1.5 text-left font-medium text-text-secondary border-b border-hairline whitespace-nowrap"
                  >
                    {{ h || '—' }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in active.excel.rows"
                  :key="i"
                  class="border-b border-hairline/50 hover:bg-bg-elevated/30"
                >
                  <td class="px-2 py-1 font-mono text-text-muted">{{ i + 1 }}</td>
                  <td
                    v-for="(_, j) in active.excel.headers"
                    :key="j"
                    class="px-2 py-1 font-mono text-text-primary whitespace-nowrap"
                  >
                    {{ String(row[j] ?? '') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel
        title="下一步要做的工作（本期不执行）"
        subtitle="数据清洗及后续治理能力规划说明"
      >
        <ol class="space-y-2 text-[12px] text-text-secondary">
          <li class="flex gap-2">
            <ChevronRight class="size-3.5 mt-0.5 text-text-muted shrink-0" />
            <span>
              <b class="text-text-primary">字段映射</b>
              ：把 Excel 列对齐到点位字典（编码、单位、设备、质量码）。
            </span>
          </li>
          <li class="flex gap-2">
            <ChevronRight class="size-3.5 mt-0.5 text-text-muted shrink-0" />
            <span>
              <b class="text-text-primary">数据清洗</b>
              ：处理空值、异常尖峰、单位换算与时间戳对齐（当前仅展示，不落地清洗）。
            </span>
          </li>
          <li class="flex gap-2">
            <ChevronRight class="size-3.5 mt-0.5 text-text-muted shrink-0" />
            <span>
              <b class="text-text-primary">质量标注 / 特征工程 / 入库发布</b>
              ：形成可治理、可回溯的数据资产，并接入现有分层流水线。
            </span>
          </li>
        </ol>
      </Panel>
    </div>

    <AppAlertDialog
      v-model:open="deleteDialogOpen"
      title="删除治理任务"
      :description="deleteDescription"
      confirm-label="确认删除"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
