<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, type Connection, type Edge, type Node } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import {
  ArrowLeft,
  Loader2,
  Play,
  Plus,
  Save,
  Upload,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { listAgents, type AgentItem } from '@/lib/agents-api'
import { listKnowledgeBases, type KnowledgeBaseItem } from '@/lib/knowledge-api'
import { listPrompts, type PromptItem } from '@/lib/prompts-api'
import { listMcpServers, type McpServerItem } from '@/lib/mcp-api'
import {
  getWorkflow,
  publishWorkflow,
  runWorkflowTrial,
  saveWorkflowGraph,
  updateWorkflow,
  type WorkflowGraph,
  type WorkflowItem,
  type WorkflowNodeType,
} from '@/lib/workflows-api'

const NODE_META: Record<
  WorkflowNodeType,
  { label: string; tone: string }
> = {
  start: { label: '开始', tone: 'bg-patina/20 border-patina/40' },
  end: { label: '结束', tone: 'bg-muted/40 border-border' },
  knowledge: { label: '知识检索', tone: 'bg-coolant/15 border-coolant/40' },
  llm: { label: 'LLM', tone: 'bg-molybdenum/15 border-molybdenum/40' },
  agent: { label: '场景智能体', tone: 'bg-iron/15 border-iron/40' },
  mcp: { label: 'MCP 工具', tone: 'bg-sulfur/15 border-sulfur/40' },
}

const PALETTE: WorkflowNodeType[] = ['knowledge', 'llm', 'agent', 'mcp']

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const workflowId = computed(() => String(route.params.id || ''))

const showGate = computed(() => auth.loading || (!auth.isAdmin && !auth.loading))

const item = ref<WorkflowItem | null>(null)
const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])
const selectedId = ref<string | null>(null)
const loading = ref(true)
const saving = ref(false)
const publishing = ref(false)
const running = ref(false)
const error = ref('')
const toast = ref('')
const nameEdit = ref('')
const trialInput = ref('窑炉当前工况是否正常？请结合知识库简要回答。')
const runLog = ref<string[]>([])
const runOutput = ref('')

const prompts = ref<PromptItem[]>([])
const kbs = ref<KnowledgeBaseItem[]>([])
const agents = ref<AgentItem[]>([])
const mcpServers = ref<McpServerItem[]>([])

const selected = computed(() => nodes.value.find((n) => n.id === selectedId.value) || null)

const toolOptions = computed(() => {
  const out: { id: string; label: string }[] = []
  for (const s of mcpServers.value) {
    for (const t of s.tools || []) {
      if (!t.enabled) continue
      out.push({ id: t.id, label: `${s.name} / ${t.name}` })
    }
  }
  return out
})

function onConnect(c: Connection) {
  if (!c.source || !c.target) return
  const id = `e_${c.source}_${c.target}_${Date.now()}`
  if (edges.value.some((e) => e.source === c.source && e.target === c.target)) return
  edges.value = [
    ...edges.value,
    {
      id,
      source: c.source,
      target: c.target,
      sourceHandle: c.sourceHandle || undefined,
      targetHandle: c.targetHandle || undefined,
    },
  ]
}

function toFlowNodes(graph: WorkflowGraph): Node[] {
  return (graph.nodes || []).map((n) => ({
    id: n.id,
    type: 'default',
    position: n.position || { x: 100, y: 100 },
    label: NODE_META[n.type as WorkflowNodeType]?.label || n.type,
    data: {
      nodeType: n.type,
      ...(n.data || {}),
    },
    class: NODE_META[n.type as WorkflowNodeType]?.tone || '',
  }))
}

function toFlowEdges(graph: WorkflowGraph): Edge[] {
  return (graph.edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || undefined,
    targetHandle: e.targetHandle || undefined,
  }))
}

function exportGraph(): WorkflowGraph {
  return {
    nodes: nodes.value.map((n) => ({
      id: n.id,
      type: String((n.data as { nodeType?: string })?.nodeType || n.type || 'llm'),
      position: { ...n.position },
      data: (() => {
        const d = { ...(n.data as Record<string, unknown>) }
        delete d.nodeType
        return d
      })(),
    })),
    edges: edges.value.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  }
}

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const [wf, p, kb, ag, mcp] = await Promise.all([
      getWorkflow(workflowId.value),
      listPrompts().catch(() => [] as PromptItem[]),
      listKnowledgeBases().catch(() => [] as KnowledgeBaseItem[]),
      listAgents().catch(() => [] as AgentItem[]),
      listMcpServers().catch(() => [] as McpServerItem[]),
    ])
    item.value = wf
    nameEdit.value = wf.name
    prompts.value = p
    kbs.value = kb
    agents.value = ag.filter((a) => a.enabled)
    mcpServers.value = mcp
    const graph = wf.draftVersion?.graph || { nodes: [], edges: [] }
    nodes.value = toFlowNodes(graph)
    edges.value = toFlowEdges(graph)
    selectedId.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function onNodeClick(ev: { node: Node }) {
  selectedId.value = ev.node.id
}

function onArgsChange(raw: string) {
  try {
    updateSelectedData('arguments', JSON.parse(raw || '{}'))
  } catch {
    updateSelectedData('arguments', raw)
  }
}

function addNode(type: WorkflowNodeType) {
  const id = `${type}_${Date.now().toString(36)}`
  const position = { x: 180 + (nodes.value.length % 3) * 40, y: 100 + nodes.value.length * 48 }
  nodes.value = [
    ...nodes.value,
    {
      id,
      type: 'default',
      position,
      label: NODE_META[type].label,
      data: { nodeType: type },
      class: NODE_META[type].tone,
    },
  ]
  selectedId.value = id
}

function updateSelectedData(key: string, value: unknown) {
  const n = selected.value
  if (!n) return
  nodes.value = nodes.value.map((x) =>
    x.id === n.id
      ? {
          ...x,
          data: { ...x.data, [key]: value },
        }
      : x,
  )
}

function toggleKb(id: string) {
  const cur = ((selected.value?.data as { knowledgeBaseIds?: string[] })?.knowledgeBaseIds ||
    []) as string[]
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
  updateSelectedData('knowledgeBaseIds', next)
}

async function onSave() {
  saving.value = true
  error.value = ''
  toast.value = ''
  try {
    if (nameEdit.value.trim() && nameEdit.value !== item.value?.name) {
      item.value = await updateWorkflow(workflowId.value, { name: nameEdit.value.trim() })
    }
    item.value = await saveWorkflowGraph(workflowId.value, exportGraph())
    toast.value = '草稿已保存'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function onPublish() {
  publishing.value = true
  error.value = ''
  try {
    await onSave()
    item.value = await publishWorkflow(workflowId.value, 'publish from editor')
    const graph = item.value.draftVersion?.graph
    if (graph) {
      nodes.value = toFlowNodes(graph)
      edges.value = toFlowEdges(graph)
    }
    toast.value = `已发布 v${item.value.publishedVersion?.version ?? ''}`
  } catch (e) {
    error.value = e instanceof Error ? e.message : '发布失败'
  } finally {
    publishing.value = false
  }
}

async function onTrial() {
  running.value = true
  error.value = ''
  runLog.value = []
  runOutput.value = ''
  try {
    await saveWorkflowGraph(workflowId.value, exportGraph())
    await runWorkflowTrial(
      workflowId.value,
      { input: trialInput.value, useDraft: true },
      {
        onStepStart: (p) => {
          runLog.value.push(`▶ ${p.nodeType || ''} (${p.nodeId || ''})`)
        },
        onStepEnd: (p) => {
          runLog.value.push(`✓ ${p.nodeType || ''} 完成`)
          if (p.detail) {
            try {
              runLog.value.push(`  ${JSON.stringify(p.detail).slice(0, 200)}`)
            } catch {
              /* ignore */
            }
          }
        },
        onDone: (p) => {
          const out = p.output as { text?: string } | string | undefined
          if (typeof out === 'string') runOutput.value = out
          else if (out && typeof out === 'object')
            runOutput.value = String(out.text || JSON.stringify(out))
          else runOutput.value = JSON.stringify(p.output ?? '')
          runLog.value.push('■ 运行完成')
        },
        onError: (msg) => {
          error.value = msg
          runLog.value.push(`✗ ${msg}`)
        },
      },
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : '试跑失败'
  } finally {
    running.value = false
  }
}

watch(
  () => workflowId.value,
  () => {
    if (auth.isAdmin && workflowId.value) void loadAll()
  },
)

onMounted(async () => {
  if (auth.isAdmin) {
    await loadAll()
    await nextTick()
  }
})
</script>

<template>
  <div v-if="showGate" class="p-8 text-sm text-muted-foreground">
    <span v-if="auth.loading">加载中…</span>
    <span v-else>仅管理员可编辑工作流。</span>
  </div>

  <div v-else class="flex flex-col h-[calc(100vh-7rem)] min-h-[560px]">
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <button
        type="button"
        class="h-8 px-2 inline-flex items-center gap-1 text-xs rounded-md border border-border hover:bg-accent"
        @click="router.push('/workflows')"
      >
        <ArrowLeft class="size-3.5" />返回
      </button>
      <input
        v-model="nameEdit"
        class="h-8 px-2 text-sm rounded-md border border-border bg-background min-w-[200px]"
      />
      <span class="text-[10px] text-muted-foreground">
        草稿 v{{ item?.draftVersion?.version ?? '—' }}
        · 已发布
        {{ item?.publishedVersion ? `v${item.publishedVersion.version}` : '无' }}
      </span>
      <div class="flex-1" />
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent disabled:opacity-50"
        :disabled="saving || loading"
        @click="onSave"
      >
        <Loader2 v-if="saving" class="size-3.5 animate-spin" />
        <Save v-else class="size-3.5" />
        保存草稿
      </button>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-molybdenum/40 text-molybdenum hover:bg-molybdenum/10 disabled:opacity-50"
        :disabled="publishing || loading"
        @click="onPublish"
      >
        <Upload class="size-3.5" />发布
      </button>
    </div>

    <p v-if="error" class="mb-2 text-xs text-iron">{{ error }}</p>
    <p v-if="toast" class="mb-2 text-xs text-patina">{{ toast }}</p>

    <div v-if="loading" class="text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <Loader2 class="size-3.5 animate-spin" />加载画布…
    </div>

    <div v-else class="flex-1 grid grid-cols-12 gap-3 min-h-0">
      <!-- palette -->
      <aside class="col-span-2 rounded-md border border-border bg-card/40 p-2 space-y-1.5 overflow-auto">
        <div class="text-[10px] text-muted-foreground px-1 mb-1">添加节点</div>
        <button
          v-for="t in PALETTE"
          :key="t"
          type="button"
          class="w-full text-left text-xs px-2 py-1.5 rounded-md border border-border hover:border-iron/40"
          @click="addNode(t)"
        >
          <Plus class="size-3 inline mr-1" />{{ NODE_META[t].label }}
        </button>
        <p class="text-[10px] text-muted-foreground px-1 pt-2 leading-relaxed">
          从开始连到结束。多出边时试跑仅走第一条。
        </p>
      </aside>

      <!-- canvas -->
      <div class="col-span-6 rounded-md border border-border overflow-hidden bg-background">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          fit-view-on-init
          :default-viewport="{ zoom: 1 }"
          @node-click="onNodeClick"
          @connect="onConnect"
        >
          <Background />
          <Controls />
        </VueFlow>
      </div>

      <!-- inspector + trial -->
      <aside class="col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden">
        <div class="rounded-md border border-border p-3 overflow-auto max-h-[45%]">
          <div class="text-xs font-medium mb-2">节点属性</div>
          <div v-if="!selected" class="text-[11px] text-muted-foreground">点击画布节点进行配置</div>
          <div v-else class="space-y-2 text-xs">
            <div>
              类型：
              <span class="font-medium">
                {{ NODE_META[(selected.data as any).nodeType as WorkflowNodeType]?.label || (selected.data as any).nodeType }}
              </span>
            </div>

            <template v-if="(selected.data as any).nodeType === 'knowledge'">
              <label class="block text-[11px] text-muted-foreground">知识库</label>
              <div class="max-h-28 overflow-auto space-y-1 border border-border rounded-md p-1.5">
                <label
                  v-for="kb in kbs"
                  :key="kb.id"
                  class="flex items-center gap-1.5 text-[11px]"
                >
                  <input
                    type="checkbox"
                    :checked="((selected.data as any).knowledgeBaseIds || []).includes(kb.id)"
                    @change="toggleKb(kb.id)"
                  />
                  {{ kb.name }}
                </label>
              </div>
              <label class="block text-[11px] text-muted-foreground">Top K</label>
              <input
                type="number"
                class="w-full h-7 px-2 rounded-md border border-border bg-background"
                :value="(selected.data as any).topK || 5"
                min="1"
                max="20"
                @change="updateSelectedData('topK', Number(($event.target as HTMLInputElement).value) || 5)"
              />
            </template>

            <template v-else-if="(selected.data as any).nodeType === 'llm'">
              <label class="block text-[11px] text-muted-foreground">模式</label>
              <select
                class="w-full h-7 px-2 rounded-md border border-border bg-background"
                :value="(selected.data as any).mode || 'fast'"
                @change="updateSelectedData('mode', ($event.target as HTMLSelectElement).value)"
              >
                <option value="fast">fast</option>
                <option value="deep">deep</option>
              </select>
              <label class="block text-[11px] text-muted-foreground">提示词</label>
              <select
                class="w-full h-7 px-2 rounded-md border border-border bg-background"
                :value="(selected.data as any).promptId || ''"
                @change="updateSelectedData('promptId', ($event.target as HTMLSelectElement).value || null)"
              >
                <option value="">（无）</option>
                <option v-for="p in prompts" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <label class="block text-[11px] text-muted-foreground">附加系统提示</label>
              <textarea
                class="w-full min-h-[64px] px-2 py-1 rounded-md border border-border bg-background"
                :value="(selected.data as any).systemPrompt || ''"
                @change="updateSelectedData('systemPrompt', ($event.target as HTMLTextAreaElement).value)"
              />
            </template>

            <template v-else-if="(selected.data as any).nodeType === 'agent'">
              <label class="block text-[11px] text-muted-foreground">场景智能体</label>
              <select
                class="w-full h-7 px-2 rounded-md border border-border bg-background"
                :value="(selected.data as any).agentId || ''"
                @change="updateSelectedData('agentId', ($event.target as HTMLSelectElement).value)"
              >
                <option value="">请选择</option>
                <option v-for="a in agents" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
            </template>

            <template v-else-if="(selected.data as any).nodeType === 'mcp'">
              <label class="block text-[11px] text-muted-foreground">工具</label>
              <select
                class="w-full h-7 px-2 rounded-md border border-border bg-background"
                :value="(selected.data as any).toolId || ''"
                @change="updateSelectedData('toolId', ($event.target as HTMLSelectElement).value)"
              >
                <option value="">请选择</option>
                <option v-for="t in toolOptions" :key="t.id" :value="t.id">{{ t.label }}</option>
              </select>
              <label class="block text-[11px] text-muted-foreground">
                参数 JSON（可用 {'{{'}input{'}}'} / {'{{'}query{'}}'}）
              </label>
              <textarea
                class="w-full min-h-[72px] px-2 py-1 rounded-md border border-border bg-background font-mono text-[10px]"
                :value="
                  typeof (selected.data as any).arguments === 'string'
                    ? (selected.data as any).arguments
                    : JSON.stringify((selected.data as any).arguments || {}, null, 2)
                "
                @change="onArgsChange(($event.target as HTMLTextAreaElement).value)"
              />
            </template>

            <template v-else>
              <p class="text-[11px] text-muted-foreground">该节点无需额外配置。</p>
            </template>
          </div>
        </div>

        <div class="rounded-md border border-border p-3 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div class="text-xs font-medium mb-2">试跑（草稿）</div>
          <textarea
            v-model="trialInput"
            class="w-full min-h-[56px] text-xs px-2 py-1 rounded-md border border-border bg-background mb-2"
          />
          <button
            type="button"
            class="h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs rounded-md bg-iron text-background hover:bg-iron/90 disabled:opacity-50 mb-2"
            :disabled="running"
            @click="onTrial"
          >
            <Loader2 v-if="running" class="size-3.5 animate-spin" />
            <Play v-else class="size-3.5" />
            试跑
          </button>
          <div class="text-[10px] text-muted-foreground mb-1">步骤</div>
          <pre class="flex-1 overflow-auto text-[10px] bg-background/60 rounded border border-border p-2 whitespace-pre-wrap">{{ runLog.join('\n') || '—' }}</pre>
          <div class="text-[10px] text-muted-foreground mt-2 mb-1">输出</div>
          <pre class="max-h-28 overflow-auto text-[10px] bg-background/60 rounded border border-border p-2 whitespace-pre-wrap">{{ runOutput || '—' }}</pre>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
:deep(.vue-flow) {
  width: 100%;
  height: 100%;
}
:deep(.vue-flow__node) {
  font-size: 12px;
  border-radius: 6px;
  border-width: 1px;
  padding: 6px 10px;
  min-width: 96px;
  text-align: center;
}
</style>
