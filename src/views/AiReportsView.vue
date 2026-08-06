<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  TriangleAlert,
  TrendingUp,
  Gauge,
  Leaf,
  Sparkles,
  Loader2,
  Play,
  Download,
  Clock,
  FileText,
  CircleCheck,
  Zap,
  Brain,
  Trash2,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import ChatMarkdown from '@/components/ai/ChatMarkdown.vue'
import { ApiError } from '@/lib/api'
import {
  deleteAiReport,
  getAiReport,
  listAiReports,
  streamGenerateReport,
  type AiReportItem,
  type ReportMode,
  type ReportType,
} from '@/lib/ai-reports-api'
import { listFurnaces, type FurnaceItem } from '@/lib/furnaces-api'

const REPORT_TYPES: {
  id: ReportType
  name: string
  desc: string
}[] = [
  {
    id: 'fault',
    name: '烧成故障分析报告',
    desc: '基于近 24h 工艺曲线 + 知识库故障树，定位异常根因，给出干预建议',
  },
  {
    id: 'forecast',
    name: '烧成温度趋势研判报告（30 分钟）',
    desc: '基于近时窗曲线做趋势研判与超限风险提示（无专用模型时会标注假设）',
  },
  {
    id: 'efficiency',
    name: '设备能效分析报告',
    desc: '对标 GB 21369-2008，结合流量/残氧/空燃比识别能效短板',
  },
  {
    id: 'carbon',
    name: '设备能碳分析报告',
    desc: '范围一燃气排放粗算 + 降碳路径建议（缺产量时不强行算强度）',
  },
]

const ICON_MAP = {
  fault: TriangleAlert,
  forecast: TrendingUp,
  efficiency: Gauge,
  carbon: Leaf,
} as const

const COLOR_MAP = {
  fault: 'text-iron border-iron/40 bg-iron/10',
  forecast: 'text-molybdenum border-molybdenum/40 bg-molybdenum/10',
  efficiency: 'text-sulfur border-sulfur/40 bg-sulfur/10',
  carbon: 'text-patina border-patina/40 bg-patina/10',
} as const

function fmtTime(ts: number) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function iconForType(type: string) {
  if (type in ICON_MAP) return ICON_MAP[type as ReportType]
  return ICON_MAP.efficiency
}

function colorForType(type: string) {
  if (type in COLOR_MAP) return COLOR_MAP[type as ReportType]
  return COLOR_MAP.efficiency
}

const activeType = ref<ReportType>('efficiency')
const furnaces = ref<FurnaceItem[]>([])
const furnaceId = ref('')
const mode = ref<ReportMode>('deep')
const generating = ref(false)
const content = ref('')
const meta = ref<{
  furnaceName?: string
  refs?: number
  hasSamples?: boolean
  reportId?: string
} | null>(null)
const history = ref<AiReportItem[]>([])
const historyLoading = ref(true)
const furnacesLoading = ref(true)
const toast = ref<string | null>(null)
const viewEl = ref<HTMLDivElement | null>(null)

let abortCtrl: AbortController | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

const meta0 = computed(
  () => REPORT_TYPES.find((t) => t.id === activeType.value) || REPORT_TYPES[0],
)

const panelSubtitle = computed(() => {
  if (!meta.value?.furnaceName) return '选择窑炉与模式后点击「生成报告」'
  const samples =
    meta.value.hasSamples === false ? ' · ⚠️ 无工况样本' : ''
  return `${meta.value.furnaceName} · 知识库 ${meta.value.refs ?? 0} 条${samples}`
})

async function loadHistory() {
  historyLoading.value = true
  try {
    history.value = await listAiReports({ limit: 30 })
  } catch (e) {
    toast.value = e instanceof Error ? e.message : '加载历史失败'
  } finally {
    historyLoading.value = false
  }
}

watch(toast, (v) => {
  if (toastTimer) clearTimeout(toastTimer)
  if (!v) return
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3600)
})

watch(content, async () => {
  await nextTick()
  if (viewEl.value) {
    viewEl.value.scrollTo({ top: viewEl.value.scrollHeight, behavior: 'smooth' })
  }
})

onMounted(() => {
  void (async () => {
    furnacesLoading.value = true
    try {
      const items = await listFurnaces({ lite: true })
      furnaces.value = items
      if (items.length && !furnaceId.value) furnaceId.value = items[0].code
    } catch (e) {
      toast.value = e instanceof Error ? e.message : '加载窑炉列表失败'
    } finally {
      furnacesLoading.value = false
    }
  })()
  void loadHistory()
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
  abortCtrl?.abort()
})

async function generate() {
  if (generating.value) {
    abortCtrl?.abort()
    generating.value = false
    return
  }
  if (!furnaceId.value) {
    toast.value = '请先选择目标窑炉（需后端已有台账）'
    return
  }
  content.value = ''
  meta.value = null
  generating.value = true
  const ctrl = new AbortController()
  abortCtrl = ctrl
  let gotDone = false
  try {
    await streamGenerateReport(
      { type: activeType.value, furnaceId: furnaceId.value, mode: mode.value },
      {
        onMeta: (m) => {
          meta.value = {
            furnaceName: m.furnaceName,
            refs: m.refs,
            hasSamples: m.hasSamples,
            reportId: m.reportId,
          }
        },
        onDelta: (text) => {
          content.value += text
        },
        onDone: () => {
          gotDone = true
        },
        onError: (msg) => {
          content.value += `\n\n⚠️ 生成异常：${msg}`
        },
      },
      ctrl.signal,
    )
    if (gotDone) await loadHistory()
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      const msg =
        e instanceof ApiError || e instanceof Error ? e.message : '网络异常'
      content.value += `\n\n⚠️ ${msg}`
      toast.value = msg
    }
  } finally {
    generating.value = false
    abortCtrl = null
  }
}

async function openHistory(item: AiReportItem) {
  if (generating.value) return
  try {
    const full = await getAiReport(item.id)
    activeType.value = (full.type as ReportType) || activeType.value
    furnaceId.value = full.furnaceId
    content.value = full.content || full.errorMsg || '（无正文）'
    meta.value = {
      furnaceName: full.furnaceName || undefined,
      refs: full.refsCount,
      reportId: full.id,
    }
  } catch (e) {
    toast.value = e instanceof Error ? e.message : '打开报告失败'
  }
}

async function removeHistory(item: AiReportItem, e: Event) {
  e.stopPropagation()
  try {
    await deleteAiReport(item.id)
    history.value = history.value.filter((x) => x.id !== item.id)
    if (meta.value?.reportId === item.id) {
      content.value = ''
      meta.value = null
    }
  } catch (err) {
    toast.value = err instanceof Error ? err.message : '删除失败'
  }
}

function exportReport() {
  if (!content.value) return
  const blob = new Blob([`# ${meta0.value.name}\n\n${content.value}`], {
    type: 'text/markdown;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${activeType.value}-${furnaceId.value || 'kiln'}-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-semibold text-text-primary">AI 智能报告中心</h1>
        <p class="text-sm text-text-muted mt-1">
          主 API 生成：窑炉历史工况 + 知识库 RAG + 模型管理中的 LLM（已替换前端 Coze BFF）
        </p>
      </div>
      <div class="text-xs text-text-muted">
        已生成历史报告
        <span class="text-text-primary font-mono">{{ history.length }}</span> 份
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <button
        v-for="t in REPORT_TYPES"
        :key="t.id"
        type="button"
        :class="[
          'text-left p-4 rounded-lg border transition-all',
          activeType === t.id
            ? `${COLOR_MAP[t.id]} shadow-[0_0_24px_rgba(255,107,53,0.15)]`
            : 'bg-bg-surface border-hairline hover:border-text-muted',
        ]"
        @click="activeType = t.id"
      >
        <div class="flex items-center gap-2 mb-2">
          <component :is="ICON_MAP[t.id]" class="size-5" />
          <div class="text-sm font-semibold text-text-primary">{{ t.name }}</div>
        </div>
        <p class="text-xs text-text-muted leading-relaxed">{{ t.desc }}</p>
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Panel :title="`${meta0.name} · 实时生成`" :subtitle="panelSubtitle">
        <template #action>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="!content"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-hairline text-text-secondary hover:text-text-primary hover:border-text-muted disabled:opacity-40"
              @click="exportReport"
            >
              <Download class="size-3.5" />
              导出 Markdown
            </button>
            <button
              type="button"
              :disabled="!furnaceId && !generating"
              :class="[
                'flex items-center gap-1.5 px-4 py-1.5 text-xs rounded font-semibold',
                generating
                  ? 'bg-iron/20 text-iron border border-iron/40'
                  : 'bg-iron text-bg-base hover:bg-iron/90',
              ]"
              @click="generate()"
            >
              <template v-if="generating">
                <Loader2 class="size-3.5 animate-spin" />
                停止生成
              </template>
              <template v-else>
                <Play class="size-3.5" />
                生成报告
              </template>
            </button>
          </div>
        </template>

        <div
          ref="viewEl"
          class="min-h-[520px] max-h-[680px] overflow-y-auto rounded-md bg-bg-base/60 border border-hairline p-5 text-sm"
        >
          <div
            v-if="!content && !generating"
            class="h-full flex flex-col items-center justify-center text-text-muted py-20"
          >
            <FileText class="size-10 mb-3 opacity-40" />
            <div class="text-sm">尚未生成报告</div>
            <div class="text-xs mt-1">需已配置 LLM，并有窑炉台账（如 TC-03）</div>
          </div>
          <ChatMarkdown
            v-if="content"
            :content="content"
            :streaming="generating"
          />
          <div
            v-else-if="generating"
            class="inline-block w-2 h-4 bg-iron animate-pulse ml-1 align-middle"
          />
        </div>
      </Panel>

      <div class="space-y-4">
        <Panel title="生成参数">
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-text-muted mb-1.5">目标设备</label>
              <select
                v-model="furnaceId"
                :disabled="generating || furnacesLoading"
                class="w-full bg-bg-base border border-hairline rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-molybdenum"
              >
                <option v-if="furnaces.length === 0" value="">暂无窑炉台账</option>
                <option
                  v-for="f in furnaces"
                  :key="f.code"
                  :value="f.code"
                >
                  {{ f.code }} {{ f.name }}{{ f.dataRange ? '' : '（无样本）' }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1.5">推理模式</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  :disabled="generating"
                  :class="[
                    'flex items-center justify-center gap-1.5 py-2 text-xs rounded border',
                    mode === 'fast'
                      ? 'bg-molybdenum/10 text-molybdenum border-molybdenum/40'
                      : 'bg-bg-base border-hairline text-text-secondary',
                  ]"
                  @click="mode = 'fast'"
                >
                  <Zap class="size-3.5" />
                  快速
                </button>
                <button
                  type="button"
                  :disabled="generating"
                  :class="[
                    'flex items-center justify-center gap-1.5 py-2 text-xs rounded border',
                    mode === 'deep'
                      ? 'bg-iron/10 text-iron border-iron/40'
                      : 'bg-bg-base border-hairline text-text-secondary',
                  ]"
                  @click="mode = 'deep'"
                >
                  <Brain class="size-3.5" />
                  深度
                </button>
              </div>
              <p class="text-[11px] text-text-muted mt-1.5">
                {{
                  mode === 'fast'
                    ? '· 使用模型管理中的「快速」LLM'
                    : '· 使用模型管理中的「深度」LLM'
                }}
              </p>
            </div>
            <div
              class="rounded border border-hairline bg-bg-base/50 p-3 text-xs text-text-muted space-y-1.5"
            >
              <div class="flex items-center gap-1.5 text-text-secondary font-medium">
                <Sparkles class="size-3.5 text-sulfur" />
                本次报告将整合
              </div>
              <div>· 该窑最新快照 + 近 24h 抽稀统计</div>
              <div>· 知识库匹配 Top-5 片段</div>
              <div>· 缺数据处强制标注假设 / 缺失</div>
            </div>
          </div>
        </Panel>

        <Panel title="历史报告">
          <div class="space-y-2 max-h-[360px] overflow-y-auto">
            <div
              v-if="historyLoading"
              class="py-8 text-center text-[11px] text-text-muted"
            >
              <Loader2 class="inline size-3.5 animate-spin mr-1" />
              加载中…
            </div>
            <div
              v-else-if="history.length === 0"
              class="py-8 text-center text-[11px] text-text-muted"
            >
              暂无历史，生成后将落库保存
            </div>
            <template v-else>
              <button
                v-for="r in history"
                :key="r.id"
                type="button"
                class="w-full text-left p-2.5 rounded border border-hairline bg-bg-base/50 hover:border-text-muted group"
                @click="openHistory(r)"
              >
                <div class="flex items-center gap-1.5 mb-1">
                  <component
                    :is="iconForType(r.type)"
                    :class="['size-3.5 shrink-0', colorForType(r.type).split(' ')[0]]"
                  />
                  <div class="text-xs font-medium text-text-primary line-clamp-1 flex-1">
                    {{ r.title }}
                  </div>
                  <span
                    role="button"
                    tabindex="0"
                    title="删除"
                    class="size-6 rounded opacity-0 group-hover:opacity-100 text-text-muted hover:text-iron inline-flex items-center justify-center"
                    @click="removeHistory(r, $event)"
                    @keydown.enter="removeHistory(r, $event)"
                  >
                    <Trash2 class="size-3" />
                  </span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-text-muted">
                  <div class="flex items-center gap-1">
                    <Clock class="size-3" />
                    {{ fmtTime(r.createdAt) }}
                  </div>
                  <div class="flex items-center gap-1">
                    <span v-if="r.status === 'failed'" class="text-iron">失败</span>
                    <template v-else>
                      <CircleCheck class="size-3 text-patina" />
                      {{ r.size }}
                    </template>
                  </div>
                </div>
              </button>
            </template>
          </div>
        </Panel>
      </div>
    </div>

    <div
      v-if="toast"
      class="fixed bottom-6 right-6 z-[80] px-4 py-2.5 rounded-md text-[12px] border bg-iron/10 border-iron/40 text-iron"
    >
      {{ toast }}
    </div>
  </div>
</template>
