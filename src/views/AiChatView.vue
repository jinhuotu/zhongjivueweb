<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Send,
  Zap,
  Brain,
  Sparkles,
  Loader2,
  CornerDownLeft,
  Quote,
  BotMessageSquare,
  User as UserIcon,
  RotateCcw,
  Lightbulb,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
  Wand2,
  LibraryBig,
} from 'lucide-vue-next'
import { ApiError } from '@/lib/api'
import {
  createChatSession,
  deleteChatSession,
  fetchRelatedQuestions,
  getChatSession,
  listChatSessions,
  streamChat,
  summarizeChatSessionTitle,
  updateChatSession,
  type ChatMode,
  type ChatSessionItem,
  type ChatSessionMessage,
} from '@/lib/ai-chat-api'
import {
  listKnowledgeBases,
  type KnowledgeBaseItem,
} from '@/lib/knowledge-api'
import ChatMarkdown from '@/components/ai/ChatMarkdown.vue'

type Mode = ChatMode

interface RefChunk {
  content: string
  score: number
  doc_id?: string
  kb_id?: string
  kbId?: string
}

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  refs?: RefChunk[]
  related?: string[]
  loading?: boolean
  mode?: Mode
  thinking?: boolean
  knowledgeBaseIds?: string[]
  knowledgeBaseNames?: string[]
  useKnowledge?: boolean
}

function kbIdsFromMessages(
  messages: Array<{
    knowledgeBaseIds?: string[]
    refs?: RefChunk[] | ChatSessionMessage['refs']
  }>,
): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    const fromField = (m.knowledgeBaseIds || []).filter(Boolean)
    if (fromField.length > 0) return [...new Set(fromField)]
    const fromRefs = [
      ...new Set(
        (m.refs || [])
          .map((r) => (r as RefChunk).kb_id || (r as RefChunk).kbId)
          .filter((x): x is string => Boolean(x)),
      ),
    ]
    if (fromRefs.length > 0) return fromRefs
  }
  return []
}

const SUGGEST = [
  '燃气车式窑标准空燃比应控制在多少？依据是什么？',
  'TC-04 耐火材料烧成的升温-保温曲线如何设定？',
  '车式窑残氧 O₂ 超过 8% 会带来什么风险？',
  '依据 GB 21369-2008，热效率不达标如何整改？',
  'CCER 工业窑炉余热回收方法学的基准线如何识别？',
]

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function fmtAgo(ts: number) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

const mode = ref<Mode>('fast')
const kbList = ref<KnowledgeBaseItem[]>([])
const selectedKbIds = ref<string[]>([])
const kbPickerOpen = ref(false)
const messages = ref<Msg[]>([])
const input = ref('')
const sending = ref(false)
const sessions = ref<ChatSessionItem[]>([])
const activeSessionId = ref<string | null>(null)
const sessionsLoading = ref(true)
const creatingSession = ref(false)
const editingId = ref<string | null>(null)
const editTitle = ref('')
const pendingDelete = ref<ChatSessionItem | null>(null)
const deleting = ref(false)
const toast = ref<{ type: 'ok' | 'err'; msg: string } | null>(null)
const listRef = ref<HTMLDivElement | null>(null)
const kbPickerRef = ref<HTMLDivElement | null>(null)
let abortController: AbortController | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

const useKnowledge = computed(() => selectedKbIds.value.length > 0)
const selectedKbNames = computed(() =>
  kbList.value.filter((b) => selectedKbIds.value.includes(b.id)).map((b) => b.name),
)

watch(messages, async () => {
  await nextTick()
  listRef.value?.scrollTo({
    top: listRef.value.scrollHeight,
    behavior: 'smooth',
  })
}, { deep: true })

watch(toast, (v) => {
  if (toastTimer) clearTimeout(toastTimer)
  if (!v) return
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3600)
})

function onDocClick(e: MouseEvent) {
  if (!kbPickerOpen.value) return
  if (!kbPickerRef.value?.contains(e.target as Node)) {
    kbPickerOpen.value = false
  }
}

async function loadSessions() {
  sessionsLoading.value = true
  try {
    sessions.value = await listChatSessions()
  } catch (e) {
    toast.value = {
      type: 'err',
      msg: e instanceof ApiError || e instanceof Error ? e.message : '加载会话失败',
    }
  } finally {
    sessionsLoading.value = false
  }
}

onMounted(() => {
  void loadSessions()
  void (async () => {
    try {
      kbList.value = await listKnowledgeBases()
    } catch {
      // 未登录或接口失败时保持空列表
    }
  })()
  document.addEventListener('mousedown', onDocClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocClick)
  abortController?.abort()
  if (toastTimer) clearTimeout(toastTimer)
})

function toggleKb(id: string) {
  selectedKbIds.value = selectedKbIds.value.includes(id)
    ? selectedKbIds.value.filter((x) => x !== id)
    : [...selectedKbIds.value, id]
}

async function openSession(sessionId: string) {
  try {
    const item = await getChatSession(sessionId)
    activeSessionId.value = item.id
    mode.value = (item.mode as Mode) === 'deep' ? 'deep' : 'fast'
    const restoredMsgs = (item.messages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m: ChatSessionMessage) => {
        const kbIds = (m.knowledgeBaseIds || []).filter(Boolean)
        const names = kbList.value.filter((b) => kbIds.includes(b.id)).map((b) => b.name)
        return {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          refs: (m.refs as RefChunk[]) || [],
          mode: (m.mode as Mode) || undefined,
          knowledgeBaseIds: kbIds,
          knowledgeBaseNames: names,
          useKnowledge:
            Boolean(m.useKnowledge) || kbIds.length > 0 || (m.refs?.length || 0) > 0,
        }
      })
    messages.value = restoredMsgs
    const fromSession = (item.knowledgeBaseIds || []).filter(Boolean)
    const fromMsgs = kbIdsFromMessages(item.messages || [])
    selectedKbIds.value = fromSession.length > 0 ? fromSession : fromMsgs
  } catch (e) {
    toast.value = {
      type: 'err',
      msg: e instanceof Error ? e.message : '打开会话失败',
    }
  }
}

async function handleCreateSession() {
  if (creatingSession.value || sending.value) return
  creatingSession.value = true
  try {
    const item = await createChatSession({ mode: mode.value })
    sessions.value = [item, ...sessions.value]
    activeSessionId.value = item.id
    messages.value = []
    toast.value = { type: 'ok', msg: '已新建会话' }
  } catch (e) {
    toast.value = {
      type: 'err',
      msg: e instanceof Error ? e.message : '新建失败',
    }
  } finally {
    creatingSession.value = false
  }
}

async function ensureSession(): Promise<string> {
  if (activeSessionId.value) return activeSessionId.value
  const item = await createChatSession({ mode: mode.value })
  sessions.value = [item, ...sessions.value]
  activeSessionId.value = item.id
  return item.id
}

function startRename(s: ChatSessionItem, e: Event) {
  e.stopPropagation()
  editingId.value = s.id
  editTitle.value = s.title
}

async function saveRename() {
  if (!editingId.value) return
  const title = editTitle.value.trim()
  if (!title) {
    toast.value = { type: 'err', msg: '标题不能为空' }
    return
  }
  try {
    const item = await updateChatSession(editingId.value, { title })
    sessions.value = sessions.value.map((x) => (x.id === item.id ? { ...x, ...item } : x))
    editingId.value = null
  } catch (e) {
    toast.value = { type: 'err', msg: e instanceof Error ? e.message : '重命名失败' }
  }
}

async function autoSummarize(s: ChatSessionItem, e: Event) {
  e.stopPropagation()
  try {
    const item = await summarizeChatSessionTitle(s.id)
    sessions.value = sessions.value.map((x) => (x.id === item.id ? { ...x, ...item } : x))
    toast.value = { type: 'ok', msg: `已总结为「${item.title}」` }
  } catch (err) {
    toast.value = {
      type: 'err',
      msg: err instanceof Error ? err.message : '自动总结失败',
    }
  }
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await deleteChatSession(pendingDelete.value.id)
    sessions.value = sessions.value.filter((x) => x.id !== pendingDelete.value!.id)
    if (activeSessionId.value === pendingDelete.value.id) {
      activeSessionId.value = null
      messages.value = []
    }
    pendingDelete.value = null
    toast.value = { type: 'ok', msg: '会话已删除' }
  } catch (e) {
    toast.value = { type: 'err', msg: e instanceof Error ? e.message : '删除失败' }
  } finally {
    deleting.value = false
  }
}

async function sendQuestion(text: string) {
  const q = text.trim()
  if (!q || sending.value) return
  input.value = ''
  sending.value = true

  let sessionId: string
  try {
    sessionId = await ensureSession()
  } catch (e) {
    sending.value = false
    toast.value = {
      type: 'err',
      msg: e instanceof Error ? e.message : '无法创建会话',
    }
    return
  }

  const userMsg: Msg = { id: genId(), role: 'user', content: q }
  const assistantId = genId()
  const assistantMsg: Msg = {
    id: assistantId,
    role: 'assistant',
    content: '',
    refs: [],
    loading: true,
    mode: mode.value,
    thinking: mode.value === 'deep',
    useKnowledge: useKnowledge.value,
    knowledgeBaseIds: [...selectedKbIds.value],
    knowledgeBaseNames: [...selectedKbNames.value],
  }
  messages.value = [...messages.value, userMsg, assistantMsg]

  const controller = new AbortController()
  abortController = controller
  let accumulated = ''

  const patchAssistant = (patch: Partial<Msg>) => {
    messages.value = messages.value.map((m) =>
      m.id === assistantId ? { ...m, ...patch } : m,
    )
  }

  try {
    await streamChat(
      {
        content: q,
        mode: mode.value,
        sessionId,
        knowledgeBaseIds: selectedKbIds.value,
      },
      {
        onRefs: (chunks) => {
          patchAssistant({ refs: chunks as RefChunk[] })
        },
        onDelta: (textDelta) => {
          if (!textDelta) return
          accumulated += textDelta
          patchAssistant({ content: accumulated, thinking: false, loading: true })
        },
        onError: (msg) => {
          accumulated += `\n\n⚠️ 调用失败：${msg}`
          patchAssistant({ content: accumulated, thinking: false })
        },
        onDone: (payload) => {
          sessions.value = sessions.value.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  title: payload.title || s.title,
                  updatedAt: Date.now(),
                  lastMessageAt: Date.now(),
                  messageCount: (s.messageCount || 0) + 2,
                }
              : s,
          )
        },
      },
      controller.signal,
    )

    if (!accumulated.trim()) {
      try {
        const item = await getChatSession(sessionId)
        const lastAssistant = [...(item.messages || [])]
          .reverse()
          .find((m) => m.role === 'assistant' && (m.content || '').trim())
        if (lastAssistant?.content) {
          accumulated = lastAssistant.content
          patchAssistant({
            content: accumulated,
            thinking: false,
            loading: false,
            refs: (lastAssistant.refs as RefChunk[]) || undefined,
          })
        }
      } catch {
        // ignore
      }
    }

    patchAssistant({ loading: false, thinking: false })

    if (accumulated.trim().length > 0) {
      fetchRelatedQuestions({ question: q, answer: accumulated })
        .then((questions) => {
          patchAssistant({ related: questions })
        })
        .catch(() => {})
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') {
      patchAssistant({ loading: false, thinking: false })
    } else {
      const cur = messages.value.find((m) => m.id === assistantId)
      patchAssistant({
        loading: false,
        thinking: false,
        content:
          (cur?.content || '') +
          `\n\n⚠️ 请求失败：${e instanceof Error ? e.message : '未知错误'}`,
      })
    }
  } finally {
    sending.value = false
    abortController = null
  }
}

function stop() {
  abortController?.abort()
}

function resetCurrent() {
  if (sending.value) return
  messages.value = []
}
</script>

<template>
  <div class="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
    <div class="flex flex-wrap items-end justify-between gap-3 shrink-0">
      <div>
        <h1 class="text-xl font-semibold flex items-center gap-2">
          <BotMessageSquare class="size-5 text-iron" />
          AI 智能问答 · 车式窑领域助手
        </h1>
        <p class="mt-1 text-[12px] text-text-secondary">
          左侧管理历史会话：新建、改名、删除；首轮问答后可自动总结标题。
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap justify-end">
        <div class="flex p-0.5 rounded-md border border-hairline bg-bg-base/60">
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] transition-colors"
            :class="
              mode === 'fast'
                ? 'bg-iron text-bg-base font-medium'
                : 'text-text-secondary hover:text-text-primary'
            "
            @click="mode = 'fast'"
          >
            <Zap class="size-3.5" /> 快速回答
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] transition-colors"
            :class="
              mode === 'deep'
                ? 'bg-molybdenum text-bg-base font-medium'
                : 'text-text-secondary hover:text-text-primary'
            "
            @click="mode = 'deep'"
          >
            <Brain class="size-3.5" /> 深度推理
          </button>
        </div>

        <div ref="kbPickerRef" class="relative">
          <button
            type="button"
            :title="
              useKnowledge
                ? `已选 ${selectedKbNames.join('、')}，将仅在这些库中检索`
                : '未选知识库 = 不检索；点击选择一个或多个库'
            "
            :disabled="sending"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] border transition-colors disabled:opacity-40"
            :class="
              useKnowledge
                ? 'bg-patina/15 text-patina border-patina/40 font-medium'
                : 'text-text-secondary border-hairline hover:text-text-primary bg-bg-base/60'
            "
            @click="kbPickerOpen = !kbPickerOpen"
          >
            <LibraryBig class="size-3.5" />
            {{ useKnowledge ? `知识库 ${selectedKbIds.length}` : '选择知识库' }}
          </button>
          <div
            v-if="kbPickerOpen"
            class="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-lg border border-hairline bg-bg-elevated shadow-xl p-2"
          >
            <div class="px-1.5 pb-1.5 mb-1.5 border-b border-hairline text-[11px] text-text-muted">
              未选 = 不检索；可多选缩小范围
            </div>
            <div
              v-if="kbList.length === 0"
              class="px-2 py-4 text-center text-[11px] text-text-muted"
            >
              暂无知识库，请先到「知识库」创建并导入资料
            </div>
            <div v-else class="max-h-56 overflow-y-auto space-y-0.5">
              <button
                v-for="b in kbList"
                :key="b.id"
                type="button"
                class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] transition-colors"
                :class="
                  selectedKbIds.includes(b.id)
                    ? 'bg-patina/15 text-patina'
                    : 'text-text-secondary hover:bg-bg-base/60 hover:text-text-primary'
                "
                @click="toggleKb(b.id)"
              >
                <span
                  class="size-3.5 rounded border inline-flex items-center justify-center shrink-0"
                  :class="
                    selectedKbIds.includes(b.id)
                      ? 'border-patina bg-patina text-bg-base'
                      : 'border-hairline'
                  "
                >
                  <Check v-if="selectedKbIds.includes(b.id)" class="size-2.5" />
                </span>
                <span class="truncate flex-1">{{ b.name }}</span>
                <span class="text-[10px] font-mono text-text-muted shrink-0">
                  {{ b.docCount }}资料
                </span>
              </button>
            </div>
            <button
              v-if="selectedKbIds.length > 0"
              type="button"
              class="mt-1.5 w-full h-7 rounded-md text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-base/50"
              @click="selectedKbIds = []"
            >
              清空选择（不检索）
            </button>
          </div>
        </div>

        <button
          type="button"
          :disabled="sending || messages.length === 0"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-text-secondary hover:text-text-primary border border-hairline disabled:opacity-40"
          @click="resetCurrent"
        >
          <RotateCcw class="size-3.5" /> 清空当前
        </button>
      </div>
    </div>

    <div class="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-4 min-h-0">
      <!-- 会话列表 -->
      <aside class="hidden lg:flex flex-col rounded-lg border border-hairline bg-bg-surface min-h-0">
        <div class="px-3 py-2.5 border-b border-hairline flex items-center justify-between gap-2">
          <div class="text-[12px] font-medium text-text-primary flex items-center gap-1.5">
            <MessageSquare class="size-3.5 text-molybdenum" />
            会话
          </div>
          <button
            type="button"
            :disabled="creatingSession"
            class="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] bg-iron/15 text-iron border border-iron/30 hover:bg-iron/25 disabled:opacity-50"
            @click="handleCreateSession()"
          >
            <Loader2 v-if="creatingSession" class="size-3 animate-spin" />
            <Plus v-else class="size-3" />
            新建
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <div
            v-if="sessionsLoading"
            class="py-8 text-center text-[11px] text-text-muted"
          >
            <Loader2 class="inline size-3.5 animate-spin mr-1" />
            加载中…
          </div>
          <div
            v-else-if="sessions.length === 0"
            class="py-8 px-2 text-center text-[11px] text-text-muted leading-relaxed"
          >
            暂无会话。点击「新建」或直接提问自动创建。
          </div>
          <div
            v-for="s in sessions"
            v-else
            :key="s.id"
            class="group rounded-md border px-2.5 py-2 cursor-pointer transition-colors"
            :class="
              s.id === activeSessionId
                ? 'border-iron/40 bg-iron/10'
                : 'border-transparent hover:border-hairline hover:bg-bg-base/50'
            "
            @click="editingId !== s.id && openSession(s.id)"
          >
            <div
              v-if="editingId === s.id"
              class="flex items-center gap-1"
              @click.stop
            >
              <input
                v-model="editTitle"
                autofocus
                class="flex-1 h-7 px-1.5 rounded border border-molybdenum/50 bg-bg-base text-[11px] text-text-primary outline-none"
                @keydown.enter="saveRename()"
                @keydown.escape="editingId = null"
              />
              <button
                type="button"
                class="size-6 rounded text-patina hover:bg-patina/10 inline-flex items-center justify-center"
                @click="saveRename()"
              >
                <Check class="size-3.5" />
              </button>
              <button
                type="button"
                class="size-6 rounded text-text-muted hover:bg-hairline/40 inline-flex items-center justify-center"
                @click="editingId = null"
              >
                <X class="size-3.5" />
              </button>
            </div>
            <template v-else>
              <div class="flex items-start justify-between gap-1">
                <div class="text-[12px] text-text-primary line-clamp-2 leading-snug flex-1 min-w-0">
                  {{ s.title || '新对话' }}
                </div>
                <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    title="自动总结标题"
                    class="size-6 rounded text-text-muted hover:text-molybdenum hover:bg-molybdenum/10 inline-flex items-center justify-center"
                    @click="autoSummarize(s, $event)"
                  >
                    <Wand2 class="size-3" />
                  </button>
                  <button
                    type="button"
                    title="重命名"
                    class="size-6 rounded text-text-muted hover:text-molybdenum hover:bg-molybdenum/10 inline-flex items-center justify-center"
                    @click="startRename(s, $event)"
                  >
                    <Pencil class="size-3" />
                  </button>
                  <button
                    type="button"
                    title="删除"
                    class="size-6 rounded text-text-muted hover:text-iron hover:bg-iron/10 inline-flex items-center justify-center"
                    @click.stop="pendingDelete = s"
                  >
                    <Trash2 class="size-3" />
                  </button>
                </div>
              </div>
              <div class="mt-1 text-[10px] font-mono text-text-muted">
                {{ s.messageCount }} 条 · {{ fmtAgo(s.updatedAt || s.lastMessageAt) }}
              </div>
            </template>
          </div>
        </div>
      </aside>

      <!-- Chat 区 -->
      <div class="flex flex-col rounded-lg border border-hairline bg-bg-surface min-h-0">
        <div ref="listRef" class="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <!-- Welcome -->
          <div
            v-if="messages.length === 0"
            class="h-full flex flex-col items-center justify-center text-center py-10"
          >
            <div
              class="size-14 rounded-xl bg-gradient-to-br from-iron via-iron/70 to-sulfur flex items-center justify-center mb-4 shadow-[0_0_28px_rgba(255,107,53,0.35)]"
            >
              <BotMessageSquare class="size-7 text-bg-base" :stroke-width="2.4" />
            </div>
            <div class="text-[15px] font-semibold mb-1">车式窑助手</div>
            <div class="text-[12px] text-text-secondary max-w-md mb-5 leading-relaxed">
              <template v-if="useKnowledge">
                已选知识库「{{ selectedKbNames.join('」「') }}」：将仅在这些库中检索片段辅助回答。
              </template>
              <template v-else>
                未选知识库 = 不检索向量库，仅基于领域提示词与会话上下文回答。可在右上角「选择知识库」勾选一个或多个库。
              </template>
              左侧可管理会话；直接提问会自动创建新会话。
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-xl px-4">
              <button
                v-for="s in SUGGEST.slice(0, 4)"
                :key="s"
                type="button"
                class="text-left px-3 py-2.5 text-[12px] rounded-md border border-hairline bg-bg-base/40 hover:border-iron/50 hover:bg-iron/5 text-text-secondary hover:text-text-primary transition-colors"
                @click="sendQuestion(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <template v-for="m in messages" :key="m.id">
            <!-- User -->
            <div v-if="m.role === 'user'" class="flex justify-end gap-2.5">
              <div
                class="max-w-[85%] bg-molybdenum/10 border border-molybdenum/25 px-3.5 py-2.5 rounded-lg rounded-tr-sm text-[13px] leading-relaxed text-text-primary whitespace-pre-wrap"
              >
                {{ m.content }}
              </div>
              <div
                class="size-8 rounded-md bg-molybdenum/15 border border-molybdenum/30 flex items-center justify-center shrink-0"
              >
                <UserIcon class="size-4 text-molybdenum" />
              </div>
            </div>

            <!-- Assistant -->
            <div v-else class="flex gap-2.5">
              <div
                class="size-8 rounded-md bg-iron/15 border border-iron/30 flex items-center justify-center shrink-0"
              >
                <BotMessageSquare class="size-4 text-iron" />
              </div>
              <div class="flex-1 max-w-[85%] space-y-3">
                <div class="bg-bg-base/50 border border-hairline px-4 py-3 rounded-lg rounded-tl-sm">
                  <div class="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border"
                      :class="
                        m.mode === 'deep'
                          ? 'text-molybdenum border-molybdenum/40 bg-molybdenum/10'
                          : 'text-iron border-iron/40 bg-iron/10'
                      "
                    >
                      <Brain v-if="m.mode === 'deep'" class="size-3" />
                      <Zap v-else class="size-3" />
                      {{ m.mode === 'deep' ? 'DEEP' : 'FAST' }}
                    </span>
                    <span
                      v-if="m.refs && m.refs.length > 0"
                      class="text-[10px] text-text-muted font-mono"
                    >
                      · 已检索 {{ m.refs.length }} 条参考片段
                    </span>
                    <span v-if="m.useKnowledge === false" class="text-[10px] text-text-muted">
                      · 未用知识库
                    </span>
                    <span
                      v-if="m.useKnowledge && m.knowledgeBaseNames?.length"
                      class="text-[10px] text-patina truncate max-w-[220px]"
                      :title="m.knowledgeBaseNames.join('、')"
                    >
                      · {{ m.knowledgeBaseNames.join('、') }}
                    </span>
                  </div>

                  <div
                    v-if="m.thinking && !m.content"
                    class="flex items-center gap-2 text-[12px] text-text-secondary"
                  >
                    <Loader2 class="size-3.5 animate-spin text-molybdenum" />
                    {{
                      m.useKnowledge
                        ? '正在检索知识库并深度推理...'
                        : '正在深度推理...'
                    }}
                  </div>
                  <div
                    v-else-if="!m.thinking && m.loading && !m.content"
                    class="flex items-center gap-2 text-[12px] text-text-secondary"
                  >
                    <Loader2 class="size-3.5 animate-spin text-iron" />
                    {{
                      m.useKnowledge
                        ? '正在检索知识库并生成回答...'
                        : '正在生成回答...'
                    }}
                  </div>

                  <ChatMarkdown
                    v-if="m.content"
                    :content="m.content"
                    :streaming="Boolean(m.loading)"
                  />
                </div>

                <details
                  v-if="m.refs && m.refs.length > 0 && !m.loading"
                  class="text-[11.5px]"
                >
                  <summary
                    class="cursor-pointer text-text-secondary hover:text-text-primary flex items-center gap-1.5 select-none"
                  >
                    <Quote class="size-3.5" />
                    查看 {{ m.refs.length }} 条知识库参考片段
                  </summary>
                  <div class="mt-2 space-y-1.5 pl-4 border-l-2 border-hairline">
                    <div
                      v-for="(r, i) in m.refs"
                      :key="i"
                      class="px-2.5 py-1.5 rounded bg-bg-base/40 border border-hairline"
                    >
                      <div class="flex justify-between text-[10px] text-text-muted font-mono mb-0.5">
                        <span>#{{ i + 1 }}</span>
                        <span class="text-molybdenum">
                          相似度 {{ (r.score ?? 0).toFixed(3) }}
                        </span>
                      </div>
                      <div
                        class="text-text-secondary leading-snug line-clamp-3 whitespace-pre-wrap"
                      >
                        {{ r.content }}
                      </div>
                    </div>
                  </div>
                </details>

                <div
                  v-if="m.related && m.related.length > 0"
                  class="rounded-lg border border-sulfur/30 bg-sulfur/[0.04] px-3.5 py-3"
                >
                  <div class="flex items-center gap-1.5 text-[11px] text-sulfur mb-2">
                    <Lightbulb class="size-3.5" /> 可能想继续了解
                  </div>
                  <div class="space-y-1.5">
                    <button
                      v-for="q in m.related"
                      :key="q"
                      type="button"
                      class="block w-full text-left text-[12px] leading-snug px-2.5 py-1.5 rounded border border-hairline hover:border-sulfur/50 hover:text-text-primary text-text-secondary bg-bg-base/40 transition-colors"
                      @click="sendQuestion(q)"
                    >
                      → {{ q }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="border-t border-hairline px-4 py-3 bg-bg-elevated/40 shrink-0">
          <div class="flex gap-2 items-end">
            <textarea
              v-model="input"
              rows="2"
              :placeholder="
                mode === 'deep'
                  ? '深度推理模式：适合复杂工艺诊断、对标分析、合规论证...'
                  : '快速回答模式：参数查询、操作要点、术语解释...'
              "
              class="flex-1 resize-none bg-bg-base/60 border border-hairline rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-molybdenum/70"
              :disabled="sending"
              @keydown.enter.exact.prevent="sendQuestion(input)"
            />
            <button
              v-if="sending"
              type="button"
              class="self-stretch px-4 rounded-md border border-iron/60 text-iron text-[12px] hover:bg-iron/10"
              @click="stop"
            >
              停止
            </button>
            <button
              v-else
              type="button"
              :disabled="!input.trim()"
              class="self-stretch flex items-center gap-1.5 px-5 rounded-md bg-iron text-bg-base text-[13px] font-medium hover:bg-[#ff7d4e] disabled:opacity-50"
              @click="sendQuestion(input)"
            >
              <Send class="size-4" />
              发送
            </button>
          </div>
          <div class="mt-2 flex justify-between text-[10.5px] text-text-muted">
            <span>
              <CornerDownLeft class="inline size-3" /> Enter 发送 · Shift+Enter 换行
            </span>
            <span>
              {{ activeSessionId ? '已关联会话' : '发送后自动新建会话' }} ·
              <span :class="mode === 'deep' ? 'text-molybdenum' : 'text-iron'">
                {{ mode === 'deep' ? '深度推理' : '快速回答' }}
              </span>
              ·
              <span :class="useKnowledge ? 'text-patina' : 'text-text-muted'">
                {{
                  useKnowledge
                    ? `知识库：${selectedKbNames.join('、')}`
                    : '未选知识库'
                }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <aside class="hidden lg:flex flex-col gap-3 min-h-0 overflow-hidden">
        <div class="rounded-lg border border-hairline bg-bg-surface p-4 shrink-0">
          <div class="flex items-center gap-1.5 text-[12px] font-medium text-text-primary mb-2">
            <Sparkles class="size-3.5 text-iron" /> 两种模式差异
          </div>
          <div class="space-y-2 text-[11.5px] leading-relaxed">
            <div class="flex gap-2">
              <Zap class="size-3.5 text-iron mt-0.5 shrink-0" />
              <div>
                <div class="text-text-primary">快速回答</div>
                <div class="text-text-secondary">
                  Lite 模型，毫秒级响应；适合参数查询、术语解释、操作要点。
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <Brain class="size-3.5 text-molybdenum mt-0.5 shrink-0" />
              <div>
                <div class="text-text-primary">深度推理</div>
                <div class="text-text-secondary">
                  Pro 模型 + thinking 模式；适合工艺诊断、对标分析、合规论证。
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-hairline bg-bg-surface p-4 flex-1 min-h-0 overflow-y-auto">
          <div class="flex items-center gap-1.5 text-[12px] font-medium text-text-primary mb-2">
            <Lightbulb class="size-3.5 text-sulfur" /> 推荐问题
          </div>
          <div class="space-y-2">
            <button
              v-for="q in SUGGEST"
              :key="q"
              type="button"
              :disabled="sending"
              class="block w-full text-left px-2.5 py-2 text-[11.5px] rounded-md border border-hairline bg-bg-base/40 hover:border-molybdenum/60 hover:text-text-primary text-text-secondary leading-snug transition-colors"
              @click="sendQuestion(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Delete confirm modal -->
    <div
      v-if="pendingDelete"
      class="fixed inset-0 z-[60] bg-bg-base/80 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="!deleting && (pendingDelete = null)"
    >
      <div class="w-full max-w-md rounded-lg border border-hairline bg-bg-elevated shadow-2xl overflow-hidden">
        <div class="px-5 pt-5 pb-3">
          <div class="text-[14px] font-medium text-text-primary">删除会话</div>
          <div class="mt-1.5 text-[12px] text-text-secondary">
            确认删除「
            <span class="text-text-primary font-medium">{{ pendingDelete.title }}</span>
            」？历史消息将一并删除。
          </div>
        </div>
        <div class="px-5 py-3 border-t border-hairline bg-bg-base/30 flex justify-end gap-2">
          <button
            type="button"
            :disabled="deleting"
            class="h-8 px-3 text-[12px] rounded-md border border-hairline bg-transparent text-text-secondary hover:bg-hairline/40"
            @click="pendingDelete = null"
          >
            取消
          </button>
          <button
            type="button"
            :disabled="deleting"
            class="h-8 px-3 text-[12px] rounded-md bg-iron text-[#0b0f14] hover:bg-[#ff7d4e] inline-flex items-center gap-1.5"
            @click="confirmDelete()"
          >
            <Loader2 v-if="deleting" class="size-3.5 animate-spin" />
            <Trash2 v-else class="size-3.5" />
            确认删除
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="toast"
      class="fixed bottom-6 right-6 z-[80] px-4 py-2.5 rounded-md text-[12px] shadow-lg border"
      :class="
        toast.type === 'ok'
          ? 'bg-patina/10 border-patina/40 text-patina'
          : 'bg-iron/10 border-iron/40 text-iron'
      "
    >
      {{ toast.msg }}
    </div>
  </div>
</template>
