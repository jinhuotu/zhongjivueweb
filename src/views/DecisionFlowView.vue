<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type Component } from 'vue'
import {
  Boxes,
  Play,
  Save,
  Package,
  Sparkles,
  Filter,
  TrendingUp,
  Eye,
  Brain,
  Target,
  TriangleAlert,
  Network,
  Gauge,
  BookMarked,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Database,
  Layers,
  CircleCheck,
  Clock,
  Beaker,
  RotateCw,
  GitBranch,
  Search,
  FilePlus,
  Upload,
  Download,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import {
  ALGO_CATEGORIES,
  ALGORITHMS,
  MODELS,
  WORKFLOW_TEMPLATES,
  DEFAULT_FLOW_NODES,
  DEFAULT_FLOW_EDGES,
  WORKFLOW_PRESETS,
  ITERATION_HISTORY,
  FEED_DATASETS,
} from '@/lib/mock'

const ICON_MAP: Record<string, Component> = {
  Filter,
  TrendingUp,
  Eye,
  Brain,
  Target,
  TriangleAlert,
  Network,
  Gauge,
  BookMarked,
}

const COLOR_CLS: Record<string, { text: string; border: string; bg: string }> = {
  iron: { text: 'text-iron', border: 'border-iron/40', bg: 'bg-iron/10' },
  molybdenum: { text: 'text-molybdenum', border: 'border-molybdenum/40', bg: 'bg-molybdenum/10' },
  patina: { text: 'text-patina', border: 'border-patina/40', bg: 'bg-patina/10' },
  sulfur: { text: 'text-sulfur', border: 'border-sulfur/40', bg: 'bg-sulfur/10' },
  coolant: { text: 'text-coolant', border: 'border-coolant/40', bg: 'bg-coolant/10' },
}

interface FlowNode {
  id: string
  type?: 'source' | 'sink' | string
  algoId?: string
  modelId?: string
  name?: string
  meta?: string
  cat?: string
  x: number
  y: number
}

const CAPABILITY_CARDS = [
  { name: '温度预测', icon: TrendingUp, color: 'molybdenum', cnt: 4, desc: 'LSTM / ARIMA / Prophet / TCN' },
  { name: '火焰分析', icon: Eye, color: 'iron', cnt: 2, desc: 'YOLOv8 + 热成像 CNN' },
  { name: '故障预测', icon: TriangleAlert, color: 'sulfur', cnt: 3, desc: 'XGBoost / RF / RUL' },
  { name: '工艺寻优', icon: Target, color: 'patina', cnt: 3, desc: '贝叶斯 / GA / PSO' },
  { name: '能效优化', icon: Gauge, color: 'sulfur', cnt: 2, desc: '决策模型 + KPI 联动' },
  { name: '碳排优化', icon: Sparkles, color: 'patina', cnt: 1, desc: 'MILP 燃料 + 绿电' },
  { name: '数据清洗', icon: Filter, color: 'coolant', cnt: 4, desc: '去重 / 对齐 / 插补 / 归一' },
  { name: '工况识别', icon: Network, color: 'molybdenum', cnt: 3, desc: 'HMM / KMeans / DBSCAN' },
  { name: '异常检测', icon: TriangleAlert, color: 'iron', cnt: 3, desc: 'iForest / AE / 3σ' },
  { name: '模型管理', icon: BookMarked, color: 'patina', cnt: 2, desc: '注册 / 影子部署' },
  { name: '监控指标', icon: Gauge, color: 'sulfur', cnt: 2, desc: '能效 / 碳强度 KPI' },
  { name: '决策输出', icon: ChevronRight, color: 'molybdenum', cnt: 1, desc: 'OPC UA 下发 / 工单' },
]

const TRAIN_LOGS = [
  { t: '12:38:02', l: '加载数据集 ds-30d-all · 69 120 行 · 326 维', c: 'text-molybdenum' },
  { t: '12:38:08', l: '数据清洗 OK · 去重 0.42% · 异常剔除 128/h', c: 'text-coolant' },
  { t: '12:38:15', l: '时序对齐 5min 栅格 · NTP 偏差 ±3 ms', c: 'text-coolant' },
  { t: '12:38:22', l: 'Train epoch 1/30  loss=0.218  rmse=8.42℃', c: 'text-sulfur' },
  { t: '12:38:48', l: 'Train epoch 10/30 loss=0.0142 rmse=4.91℃', c: 'text-sulfur' },
  { t: '12:39:42', l: 'Train epoch 28/30 loss=0.0098 rmse=4.21℃', c: 'text-patina' },
  { t: '12:39:58', l: 'Eval ✓ MAE 3.18℃  R² 0.962  通过门控', c: 'text-patina' },
  { t: '12:40:02', l: '注册到 MLflow · 状态 SHADOW', c: 'text-molybdenum' },
]

const PACKAGE_READY = [
  { k: '模型权重', v: '已保存 · 6.8 MB', ok: true },
  { k: '推理代码', v: 'TorchScript 已编译', ok: true },
  { k: '数据预处理', v: 'Pipeline.pkl', ok: true },
  { k: '依赖清单', v: 'requirements.txt · 24 项', ok: true },
  { k: '测试集 score', v: 'RMSE 4.2℃ · R² 0.962', ok: true },
  { k: '签名与版本', v: 'v1.3-rc · 待审批', ok: false },
]

const activeCat = ref('all')
const search = ref('')
const nodes = ref<FlowNode[]>([...(DEFAULT_FLOW_NODES as FlowNode[])])
const edges = ref<Array<[string, string]>>([...DEFAULT_FLOW_EDGES])
const selectedEdge = ref<number | null>(null)
const selectedId = ref<string | null>('n5')
const scene = ref<'om' | 'carbon'>('om')
const feed = ref('ds-30d-all')
const drag = ref<string | null>(null)
const running = ref(false)
const showInspector = ref(true)
const seq = ref(1000)
const flowName = ref('炉温 30 分钟预测')
const activeWorkflowId = ref('wf-temp')
const algoOverview = ref(false)
const currentModelId = ref<string | null>(null)
const toast = ref('')
const importRef = ref<HTMLInputElement | null>(null)
const canvasRef = ref<HTMLDivElement | null>(null)
const dragNode = ref<{ id: string; offX: number; offY: number; moved: boolean } | null>(null)
const connectFrom = ref<{
  fromId: string
  startX: number
  startY: number
  curX: number
  curY: number
} | null>(null)

const filteredAlgos = computed(() =>
  ALGORITHMS.filter(
    (a) =>
      (activeCat.value === 'all' || a.cat === activeCat.value) &&
      (!search.value || a.name.includes(search.value) || a.desc.includes(search.value)),
  ),
)

const selectedNode = computed(() => nodes.value.find((n) => n.id === selectedId.value))
const selectedAlgo = computed(() =>
  selectedNode.value?.algoId ? ALGORITHMS.find((a) => a.id === selectedNode.value!.algoId) : null,
)
const activeTpl = computed(() => WORKFLOW_TEMPLATES.find((t) => t.id === activeWorkflowId.value))
const currentModel = computed(() =>
  currentModelId.value ? MODELS.find((x) => x.id === currentModelId.value) : null,
)

function flashToast(msg: string) {
  toast.value = msg
  setTimeout(() => {
    toast.value = ''
  }, 1800)
}

function onKeyDown(ev: KeyboardEvent) {
  if (selectedEdge.value === null) return
  const tag = (ev.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    ev.preventDefault()
    const idx = selectedEdge.value
    edges.value = edges.value.filter((_, i) => i !== idx)
    selectedEdge.value = null
    flashToast('已删除连线')
  } else if (ev.key === 'Escape') {
    selectedEdge.value = null
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

watch(dragNode, (dn, _prev, onCleanup) => {
  if (!dn) return
  const onMove = (e: MouseEvent) => {
    const rect = canvasRef.value?.getBoundingClientRect()
    if (!rect || !dragNode.value) return
    const x = Math.max(8, Math.min(rect.width - 180, e.clientX - rect.left - dragNode.value.offX))
    const y = Math.max(8, Math.min(rect.height - 80, e.clientY - rect.top - dragNode.value.offY))
    const id = dragNode.value.id
    nodes.value = nodes.value.map((n) => (n.id === id ? { ...n, x, y } : n))
    if (!dragNode.value.moved) dragNode.value = { ...dragNode.value, moved: true }
  }
  const onUp = () => {
    dragNode.value = null
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  onCleanup(() => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  })
})

function onNodeMouseDown(e: MouseEvent, nodeId: string) {
  const node = nodes.value.find((n) => n.id === nodeId)
  if (!node) return
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  e.stopPropagation()
  dragNode.value = {
    id: nodeId,
    offX: e.clientX - rect.left - node.x,
    offY: e.clientY - rect.top - node.y,
    moved: false,
  }
}

/** Start edge drag; finish on mouseup over a target node (intended UX). */
function startConnect(fromId: string, e: MouseEvent) {
  e.stopPropagation()
  const fromNode = nodes.value.find((n) => n.id === fromId)
  if (!fromNode || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const rectLeft = rect.left
  const rectTop = rect.top
  const startX = fromNode.x + 180
  const startY = fromNode.y + 36
  connectFrom.value = { fromId, startX, startY, curX: startX, curY: startY }
  selectedEdge.value = null

  function onMove(ev: MouseEvent) {
    if (!connectFrom.value) return
    connectFrom.value = {
      ...connectFrom.value,
      curX: ev.clientX - rectLeft,
      curY: ev.clientY - rectTop,
    }
  }
  function onUp(ev: MouseEvent) {
    const cf = connectFrom.value
    if (cf && canvasRef.value) {
      const r = canvasRef.value.getBoundingClientRect()
      const mx = ev.clientX - r.left
      const my = ev.clientY - r.top
      const target = nodes.value.find(
        (n) => mx >= n.x && mx <= n.x + 180 && my >= n.y && my <= n.y + 72,
      )
      if (target && target.id !== cf.fromId && target.type !== 'source') {
        const exists = edges.value.some((ed) => ed[0] === cf.fromId && ed[1] === target.id)
        if (!exists) edges.value = [...edges.value, [cf.fromId, target.id]]
      }
    }
    connectFrom.value = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function addAlgoNode(algoId: string) {
  const algo = ALGORITHMS.find((a) => a.id === algoId)
  if (!algo) return
  const id = `n${seq.value}`
  seq.value += 1
  const last = nodes.value[nodes.value.length - 1]
  const x = (last?.x ?? 60) + 220
  const y = last?.y ?? 60
  nodes.value = [
    ...nodes.value,
    { id, algoId, cat: algo.cat, x: x > 900 ? 60 : x, y: x > 900 ? y + 160 : y },
  ]
  selectedId.value = id
}

function removeNode(id: string) {
  if (id === 'n1' || id === 'n7') return
  nodes.value = nodes.value.filter((n) => n.id !== id)
  edges.value = edges.value.filter(([a, b]) => a !== id && b !== id)
  if (selectedId.value === id) selectedId.value = 'n5'
}

function loadTemplate(tplId: string) {
  const tpl = WORKFLOW_TEMPLATES.find((t) => t.id === tplId)
  const preset = WORKFLOW_PRESETS[tplId]
  if (!tpl || !preset) {
    nodes.value = [...(DEFAULT_FLOW_NODES as FlowNode[])]
    edges.value = [...DEFAULT_FLOW_EDGES]
    selectedId.value = null
    selectedEdge.value = null
    return
  }
  activeWorkflowId.value = tplId
  flowName.value = tpl.name
  nodes.value = [...(preset.nodes as FlowNode[])]
  edges.value = [...preset.edges]
  const firstAlgo = preset.nodes.find((n) => n.algoId || n.modelId)
  selectedId.value = firstAlgo?.id ?? preset.nodes[0]?.id ?? null
  selectedEdge.value = null
  connectFrom.value = null
  currentModelId.value = null
  flashToast(`已切换至「${tpl.name}」工作流`)
}

function runFlow() {
  running.value = true
  setTimeout(() => {
    running.value = false
  }, 1800)
}

function handleNew() {
  if (!confirm('新建画布将清空当前流图，是否继续？')) return
  nodes.value = [{ id: 'n1', type: 'source', name: '治理后特征库', x: 60, y: 60, meta: '请选择数据源' }]
  edges.value = []
  selectedId.value = 'n1'
  flowName.value = '未命名流图'
  seq.value = 1
  flashToast('已新建空白画布')
}

function handleSave() {
  try {
    localStorage.setItem(
      'lujing-flow:' + flowName.value,
      JSON.stringify({ flowName: flowName.value, scene: scene.value, nodes: nodes.value, edges: edges.value }),
    )
    flashToast(`已保存 "${flowName.value}" 到本地`)
  } catch {
    flashToast('保存失败')
  }
}

function handleExport() {
  const data = JSON.stringify(
    {
      flowName: flowName.value,
      scene: scene.value,
      nodes: nodes.value,
      edges: edges.value,
      version: 1,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  )
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${flowName.value.replace(/\s+/g, '_')}.flow.json`
  a.click()
  URL.revokeObjectURL(url)
  flashToast(`已导出 ${flowName.value}.flow.json`)
}

function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result))
      if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
        nodes.value = data.nodes
        edges.value = data.edges
        if (data.flowName) flowName.value = data.flowName
        if (data.scene) scene.value = data.scene
        flashToast(`已导入 ${file.name}`)
      } else {
        flashToast('文件格式不正确')
      }
    } catch {
      flashToast('解析失败')
    }
  }
  reader.readAsText(file)
  ;(e.target as HTMLInputElement).value = ''
}

function deleteEdge(i: number) {
  edges.value = edges.value.filter((_, idx) => idx !== i)
  selectedEdge.value = null
  flashToast('已删除连线')
}

function edgeGeom(from: string, to: string) {
  const fn = nodes.value.find((n) => n.id === from)
  const tn = nodes.value.find((n) => n.id === to)
  if (!fn || !tn) return null
  const fx = fn.x + 180
  const fy = fn.y + 36
  const tx = tn.x
  const ty = tn.y + 36
  const midX = (fx + tx) / 2
  return {
    fx,
    fy,
    tx,
    ty,
    midX,
    mx: (fx + tx) / 2,
    my: (fy + ty) / 2,
    d: `M ${fx} ${fy} C ${midX} ${fy}, ${midX} ${ty}, ${tx} ${ty}`,
  }
}

function tempConnectPath() {
  if (!connectFrom.value) return ''
  const { startX, startY, curX, curY } = connectFrom.value
  const midX = (startX + curX) / 2
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${curY}, ${curX} ${curY}`
}

function nodeMeta(node: FlowNode) {
  const algo = node.algoId ? ALGORITHMS.find((a) => a.id === node.algoId) : null
  const cat = algo ? ALGO_CATEGORIES.find((c) => c.id === algo.cat) : null
  const Icon = cat ? (ICON_MAP[cat.icon] ?? Filter) : Database
  const cls = cat ? COLOR_CLS[cat.color] : COLOR_CLS.coolant
  return { algo, cat, Icon, cls, isSrc: node.type === 'source', isSink: node.type === 'sink' }
}

function addModelToCanvas() {
  const m = currentModel.value
  if (!m) return
  const id = `m-${seq.value}`
  seq.value += 1
  nodes.value = [
    ...nodes.value,
    { id, name: m.name, meta: `${m.type} · ${m.metric}`, x: 400, y: 240, cat: m.cat },
  ]
  selectedId.value = id
}

function dragInAlgo(a: (typeof ALGORITHMS)[number]) {
  const id = `n-${seq.value}`
  seq.value += 1
  nodes.value = [
    ...nodes.value,
    { id, name: a.name, meta: a.desc, x: 320, y: 200 + nodes.value.length * 20, cat: a.cat, algoId: a.id },
  ]
  selectedId.value = id
  algoOverview.value = false
}

function onCanvasDrop(e: DragEvent) {
  e.preventDefault()
  if (drag.value) {
    addAlgoNode(drag.value)
    drag.value = null
  }
}

function modelCatCls(catId?: string) {
  const cat = ALGO_CATEGORIES.find((c) => c.id === catId)
  return COLOR_CLS[cat?.color ?? 'molybdenum']
}
</script>

<template>
  <div class="space-y-4">
    <Panel flush>
      <div class="flex flex-wrap items-center gap-3 px-4 py-3">
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-md border border-iron/50 bg-iron/10">
          <Boxes class="size-4 text-iron" />
          <input
            v-model="flowName"
            class="font-semibold text-text-primary bg-transparent outline-none border-b border-transparent hover:border-iron/40 focus:border-iron/60 min-w-[160px]"
          />
          <span class="text-xs text-text-muted">· v1.3-rc · 已自动保存 12:42</span>
        </div>
        <div class="flex items-center gap-1 bg-bg-base border border-hairline rounded-md p-0.5 text-xs">
          <button
            class="px-3 py-1 rounded"
            :class="scene === 'om' ? 'bg-molybdenum/20 text-molybdenum' : 'text-text-secondary'"
            @click="scene = 'om'"
          >
            设备运维
          </button>
          <button
            class="px-3 py-1 rounded"
            :class="scene === 'carbon' ? 'bg-patina/20 text-patina' : 'text-text-secondary'"
            @click="scene = 'carbon'"
          >
            碳排决策
          </button>
        </div>
        <div class="ml-auto flex items-center gap-1.5">
          <button
            class="px-3 py-1.5 text-xs rounded border border-hairline text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5"
            @click="handleNew"
          >
            <FilePlus class="size-3.5" /> 新建
          </button>
          <button
            class="px-3 py-1.5 text-xs rounded border border-hairline text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5"
            @click="handleSave"
          >
            <Save class="size-3.5" /> 保存
          </button>
          <button
            class="px-3 py-1.5 text-xs rounded border border-hairline text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5"
            @click="handleExport"
          >
            <Download class="size-3.5" /> 导出
          </button>
          <button
            class="px-3 py-1.5 text-xs rounded border border-hairline text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5"
            @click="importRef?.click()"
          >
            <Upload class="size-3.5" /> 导入
          </button>
          <input
            ref="importRef"
            type="file"
            accept=".json,.flow.json,application/json"
            class="hidden"
            @change="handleImportFile"
          />
          <button
            class="ml-1 px-4 py-1.5 text-xs rounded inline-flex items-center gap-1.5"
            :class="running ? 'bg-sulfur/20 text-sulfur' : 'bg-patina/20 text-patina border border-patina/40'"
            @click="runFlow"
          >
            <template v-if="running">
              <RotateCw class="size-3.5 animate-spin" /> 运行中…
            </template>
            <template v-else>
              <Play class="size-3.5" /> 运行流
            </template>
          </button>
          <a
            href="/model-package"
            class="px-3 py-1.5 text-xs rounded bg-iron/20 text-iron border border-iron/40 inline-flex items-center gap-1.5"
          >
            <Package class="size-3.5" /> 封装导出
          </a>
        </div>
      </div>
      <div v-if="toast" class="px-4 pb-2 text-xs text-patina">✓ {{ toast }}</div>
    </Panel>

    <div class="grid gap-4" :class="showInspector ? 'grid-cols-12' : 'grid-cols-10'">
      <div class="col-span-3 space-y-4">
        <Panel title="工作流模板" subtitle="点击切换 · 右侧画布即时刷新" flush>
          <div class="px-3 py-3 space-y-2">
            <button
              v-for="tpl in WORKFLOW_TEMPLATES"
              :key="tpl.id"
              class="w-full text-left p-2.5 rounded border transition relative"
              :class="
                tpl.id === activeWorkflowId
                  ? `${COLOR_CLS[tpl.color].border} ${COLOR_CLS[tpl.color].bg} ring-1 ring-inset shadow-[0_0_0_1px_inset]`
                  : `${COLOR_CLS[tpl.color].border} ${COLOR_CLS[tpl.color].bg} opacity-80 hover:opacity-100 hover:brightness-110`
              "
              @click="loadTemplate(tpl.id)"
            >
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium" :class="COLOR_CLS[tpl.color].text">{{ tpl.name }}</div>
                <span
                  v-if="tpl.id === activeWorkflowId"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-bg-base/70"
                  :class="[COLOR_CLS[tpl.color].border, COLOR_CLS[tpl.color].text]"
                >
                  当前
                </span>
              </div>
              <div class="text-[11px] text-text-muted mt-0.5 line-clamp-1">{{ tpl.desc }}</div>
            </button>
          </div>
        </Panel>

        <Panel :title="'算法库'" :subtitle="`共 ${ALGORITHMS.length} 个标准算法`" flush>
          <template #action>
            <button
              class="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-molybdenum/15 text-molybdenum border border-molybdenum/40 hover:bg-molybdenum/25 transition"
              title="向右展开全部算法"
              @click="algoOverview = true"
            >
              全览 <ChevronRight class="size-3" />
            </button>
          </template>
          <div class="px-3 py-3 space-y-3">
            <div class="relative">
              <Search class="size-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                v-model="search"
                placeholder="搜索算法…"
                class="w-full bg-bg-base border border-hairline rounded pl-8 pr-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div class="flex flex-wrap gap-1">
              <button
                class="px-2 py-0.5 rounded text-[11px]"
                :class="activeCat === 'all' ? 'bg-molybdenum/20 text-molybdenum' : 'text-text-muted border border-hairline'"
                @click="activeCat = 'all'"
              >
                全部
              </button>
              <button
                v-for="c in ALGO_CATEGORIES"
                :key="c.id"
                class="px-2 py-0.5 rounded text-[11px]"
                :class="
                  activeCat === c.id
                    ? `${COLOR_CLS[c.color].bg} ${COLOR_CLS[c.color].text}`
                    : 'text-text-muted border border-hairline'
                "
                @click="activeCat = c.id"
              >
                {{ c.name }}
              </button>
            </div>
            <div class="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
              <div
                v-for="algo in filteredAlgos"
                :key="algo.id"
                draggable="true"
                class="group p-2 rounded border cursor-grab active:cursor-grabbing hover:brightness-110 transition"
                :class="[
                  COLOR_CLS[ALGO_CATEGORIES.find((c) => c.id === algo.cat)!.color].border,
                  COLOR_CLS[ALGO_CATEGORIES.find((c) => c.id === algo.cat)!.color].bg,
                ]"
                @dragstart="drag = algo.id"
                @dragend="drag = null"
                @click="addAlgoNode(algo.id)"
              >
                <div class="flex items-center gap-2">
                  <component
                    :is="ICON_MAP[ALGO_CATEGORIES.find((c) => c.id === algo.cat)!.icon] ?? Filter"
                    class="size-3.5"
                    :class="COLOR_CLS[ALGO_CATEGORIES.find((c) => c.id === algo.cat)!.color].text"
                  />
                  <div
                    class="text-xs font-medium flex-1"
                    :class="COLOR_CLS[ALGO_CATEGORIES.find((c) => c.id === algo.cat)!.color].text"
                  >
                    {{ algo.name }}
                  </div>
                  <span
                    v-if="algo.tag === 'core'"
                    class="px-1 py-0 text-[10px] rounded bg-iron/30 text-iron"
                  >CORE</span>
                </div>
                <div class="text-[10px] text-text-muted mt-1 line-clamp-2">{{ algo.desc }}</div>
                <div class="text-[10px] text-text-muted mt-1 font-mono">
                  {{ algo.runtime }} · 热度 {{ algo.pop }}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div :class="showInspector ? 'col-span-6 space-y-4' : 'col-span-7 space-y-4'">
        <Panel
          :title="`决策画布 · ${flowName}`"
          :subtitle="`当前工作流：${activeTpl?.desc ?? '自定义流图'} · 拖拽节点重排 · 点击连线 / Del 删除`"
          flush
        >
          <template #action>
            <div class="flex items-center gap-3 text-xs text-text-muted">
              <span>
                场景：
                <span :class="scene === 'om' ? 'text-molybdenum' : 'text-patina'">
                  {{ scene === 'om' ? '设备运维' : '碳排决策' }}
                </span>
                · 节点 {{ nodes.length }} · 连线 {{ edges.length }}
              </span>
              <button
                v-if="!showInspector"
                class="px-2 py-1 rounded border border-hairline hover:border-molybdenum hover:text-molybdenum"
                @click="showInspector = true"
              >
                展开属性栏 ▶
              </button>
            </div>
          </template>

          <div
            ref="canvasRef"
            class="relative bg-bg-base rounded border border-hairline h-[560px] overflow-auto"
            style="background-image: radial-gradient(circle, rgba(31,58,107,0.4) 1px, transparent 1px); background-size: 20px 20px"
            @dragover.prevent
            @drop="onCanvasDrop"
            @click="(e) => { if (e.target === e.currentTarget) selectedEdge = null }"
          >
            <div
              v-if="activeTpl"
              class="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-md border bg-bg-elevated/85 backdrop-blur-sm shadow-lg shadow-black/40"
              :class="COLOR_CLS[activeTpl.color].border"
            >
              <Boxes class="size-4" :class="COLOR_CLS[activeTpl.color].text" />
              <span class="text-sm font-semibold" :class="COLOR_CLS[activeTpl.color].text">{{ activeTpl.name }}</span>
              <span class="text-[10px] text-text-muted">·</span>
              <span class="text-[10px] text-text-muted line-clamp-1 max-w-[360px]">{{ activeTpl.desc }}</span>
              <span
                class="ml-2 text-[10px] px-1.5 py-0.5 rounded border bg-bg-base/60"
                :class="[COLOR_CLS[activeTpl.color].border, COLOR_CLS[activeTpl.color].text]"
              >{{ activeTpl.id }}</span>
            </div>

            <div
              v-if="currentModel"
              class="absolute top-2 left-3 z-20 flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-bg-elevated/90 backdrop-blur-sm shadow-lg shadow-black/40"
              :class="modelCatCls(currentModel.cat).border"
            >
              <Brain class="size-3.5" :class="modelCatCls(currentModel.cat).text" />
              <div class="flex flex-col leading-tight">
                <span class="text-[11px] font-semibold" :class="modelCatCls(currentModel.cat).text">{{ currentModel.name }}</span>
                <span class="text-[10px] text-text-muted font-mono">
                  {{ currentModel.type }} · {{ currentModel.metric }} · {{ currentModel.size }}
                </span>
              </div>
              <button
                class="ml-2 text-text-muted hover:text-iron"
                title="取消预览"
                @click.stop="currentModelId = null"
              >
                <X class="size-3" />
              </button>
            </div>

            <svg
              class="absolute inset-0 w-full h-full"
              style="min-width: 1000px; min-height: 560px; pointer-events: none"
            >
              <template v-for="(edge, i) in edges" :key="i">
                <g v-if="edgeGeom(edge[0], edge[1])" style="pointer-events: auto">
                  <path
                    :d="edgeGeom(edge[0], edge[1])!.d"
                    stroke="transparent"
                    stroke-width="12"
                    fill="none"
                    style="cursor: pointer"
                    @click.stop="selectedEdge = selectedEdge === i ? null : i"
                  />
                  <path
                    :d="edgeGeom(edge[0], edge[1])!.d"
                    :stroke="selectedEdge === i ? '#FF6B35' : '#4A9EFF'"
                    :stroke-width="selectedEdge === i ? 2.5 : 1.5"
                    fill="none"
                    :stroke-dasharray="selectedEdge === i ? '5 3' : running ? '4 4' : undefined"
                    style="pointer-events: none"
                  />
                  <circle
                    :cx="edgeGeom(edge[0], edge[1])!.tx"
                    :cy="edgeGeom(edge[0], edge[1])!.ty"
                    r="3"
                    :fill="selectedEdge === i ? '#FF6B35' : '#4A9EFF'"
                    style="pointer-events: none"
                  />
                  <g
                    v-if="selectedEdge === i"
                    style="cursor: pointer"
                    @click.stop="deleteEdge(i)"
                  >
                    <circle :cx="edgeGeom(edge[0], edge[1])!.mx" :cy="edgeGeom(edge[0], edge[1])!.my" r="9" fill="#FF6B35" />
                    <text
                      :x="edgeGeom(edge[0], edge[1])!.mx"
                      :y="edgeGeom(edge[0], edge[1])!.my + 4"
                      text-anchor="middle"
                      font-size="12"
                      fill="#fff"
                      font-weight="bold"
                    >×</text>
                  </g>
                </g>
              </template>
              <path
                v-if="connectFrom"
                :d="tempConnectPath()"
                stroke="#FF6B35"
                stroke-width="2"
                fill="none"
                stroke-dasharray="6 3"
                opacity="0.7"
                style="pointer-events: none"
              />
            </svg>

            <div
              v-for="node in nodes"
              :key="node.id"
              class="absolute w-44 rounded border bg-bg-surface cursor-move transition shadow-lg shadow-black/30"
              :class="[
                selectedId === node.id ? 'ring-2 ring-molybdenum' : '',
                nodeMeta(node).isSrc
                  ? 'border-coolant/60'
                  : nodeMeta(node).isSink
                    ? 'border-iron/60'
                    : nodeMeta(node).cls.border,
              ]"
              :style="{ left: `${node.x}px`, top: `${node.y}px` }"
              @click="selectedId = node.id"
              @mousedown.stop="onNodeMouseDown($event, node.id)"
            >
              <div
                class="px-2.5 py-1.5 border-b text-[11px] flex items-center gap-1.5"
                :class="
                  nodeMeta(node).isSrc
                    ? 'border-coolant/30 text-coolant'
                    : nodeMeta(node).isSink
                      ? 'border-iron/30 text-iron'
                      : `${nodeMeta(node).cls.border} ${nodeMeta(node).cls.text}`
                "
              >
                <Database v-if="nodeMeta(node).isSrc" class="size-3.5" />
                <Target v-else-if="nodeMeta(node).isSink" class="size-3.5" />
                <component :is="nodeMeta(node).Icon" v-else class="size-3.5" />
                <span class="font-medium flex-1">
                  {{
                    nodeMeta(node).isSrc
                      ? '数据源'
                      : nodeMeta(node).isSink
                        ? '输出'
                        : nodeMeta(node).cat?.name
                  }}
                </span>
                <button
                  v-if="!nodeMeta(node).isSrc && !nodeMeta(node).isSink"
                  class="text-text-muted hover:text-iron"
                  @click.stop="removeNode(node.id)"
                >
                  <X class="size-3" />
                </button>
              </div>
              <div class="px-2.5 py-2">
                <div class="text-xs font-medium text-text-primary line-clamp-1">
                  {{
                    nodeMeta(node).isSrc || nodeMeta(node).isSink
                      ? node.name
                      : nodeMeta(node).algo?.name ?? node.name
                  }}
                </div>
                <div class="text-[10px] text-text-muted mt-1 line-clamp-2">
                  {{
                    nodeMeta(node).isSrc || nodeMeta(node).isSink
                      ? node.meta
                      : nodeMeta(node).algo?.desc ?? node.meta
                  }}
                </div>
              </div>
              <div
                v-if="!nodeMeta(node).isSink"
                class="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-bg-base border-2 border-molybdenum cursor-crosshair hover:bg-molybdenum/30 transition"
                title="拖拽连线到目标节点"
                @mousedown.stop="startConnect(node.id, $event)"
              />
              <div
                v-if="!nodeMeta(node).isSrc"
                class="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-bg-base border-2 border-coolant cursor-crosshair hover:bg-coolant/30 transition"
                title="连线接入点"
              />
            </div>

            <div
              v-if="currentModel"
              class="absolute right-4 bottom-4 z-20 w-[340px] rounded-lg border border-hairline bg-bg-elevated/95 backdrop-blur-md shadow-2xl shadow-black/50"
            >
              <div
                class="flex items-center gap-2 px-3 py-2 border-b"
                :class="modelCatCls(currentModel.cat).border"
              >
                <Brain class="size-4" :class="modelCatCls(currentModel.cat).text" />
                <div class="flex-1">
                  <div class="text-xs font-semibold" :class="modelCatCls(currentModel.cat).text">
                    {{ currentModel.name }}
                  </div>
                  <div class="text-[10px] text-text-muted">
                    {{ currentModel.type }} ·
                    {{ ALGO_CATEGORIES.find((c) => c.id === currentModel?.cat)?.name ?? '—' }}
                  </div>
                </div>
                <span
                  v-if="currentModel.finetuned"
                  class="px-1 py-0 text-[9px] rounded bg-patina/20 text-patina"
                >已微调</span>
                <button class="text-text-muted hover:text-iron" title="关闭" @click="currentModelId = null">
                  <X class="size-3.5" />
                </button>
              </div>
              <div class="px-3 py-3 space-y-2.5 text-[11px]">
                <p class="text-text-secondary leading-relaxed">{{ currentModel.desc }}</p>
                <div class="rounded border border-hairline bg-bg-base p-2">
                  <div class="text-[10px] text-text-muted mb-1.5">推理流程</div>
                  <div class="flex items-center justify-between gap-1">
                    <div class="flex-1 text-center py-1.5 rounded bg-coolant/10 border border-coolant/30 text-coolant text-[10px]">
                      输入
                    </div>
                    <ChevronRight class="size-3 text-text-muted shrink-0" />
                    <div
                      class="flex-1 text-center py-1.5 rounded text-[10px] font-semibold border"
                      :class="[
                        modelCatCls(currentModel.cat).bg,
                        modelCatCls(currentModel.cat).border,
                        modelCatCls(currentModel.cat).text,
                      ]"
                    >
                      {{ currentModel.type }}
                    </div>
                    <ChevronRight class="size-3 text-text-muted shrink-0" />
                    <div class="flex-1 text-center py-1.5 rounded bg-patina/10 border border-patina/30 text-patina text-[10px]">
                      输出
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                  <div class="rounded bg-bg-base border border-hairline px-2 py-1.5">
                    <div class="text-text-muted">核心指标</div>
                    <div class="text-text-primary font-mono mt-0.5">{{ currentModel.metric }}</div>
                  </div>
                  <div class="rounded bg-bg-base border border-hairline px-2 py-1.5">
                    <div class="text-text-muted">权重大小</div>
                    <div class="text-text-primary font-mono mt-0.5">{{ currentModel.size }}</div>
                  </div>
                  <div class="rounded bg-bg-base border border-hairline px-2 py-1.5">
                    <div class="text-text-muted">训练样本</div>
                    <div class="text-text-primary font-mono mt-0.5">{{ currentModel.samples }}</div>
                  </div>
                  <div class="rounded bg-bg-base border border-hairline px-2 py-1.5">
                    <div class="text-text-muted">License</div>
                    <div class="text-text-primary font-mono mt-0.5">{{ currentModel.license }}</div>
                  </div>
                </div>
                <div class="flex items-center justify-between pt-1">
                  <span class="text-[10px] text-text-muted">更新 {{ currentModel.updated }}</span>
                  <div class="flex gap-1.5">
                    <button
                      class="px-2 py-1 text-[10px] rounded border"
                      :class="[
                        modelCatCls(currentModel.cat).border,
                        modelCatCls(currentModel.cat).bg,
                        modelCatCls(currentModel.cat).text,
                      ]"
                      @click="addModelToCanvas"
                    >
                      <Plus class="size-3 inline -mt-0.5" /> 加入画布
                    </button>
                    <a
                      href="/model-package"
                      class="px-2 py-1 text-[10px] rounded border border-iron/40 bg-iron/10 text-iron"
                    >导出 →</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="迭代分析" subtitle="同一工作流的版本对比 · 训练历史">
          <template #action>
            <button class="text-xs text-molybdenum hover:underline inline-flex items-center gap-1">
              <GitBranch class="size-3" />新建分支
            </button>
          </template>
          <div class="overflow-x-auto -mx-4">
            <table class="w-full text-sm">
              <thead class="text-text-muted text-xs uppercase border-b border-hairline">
                <tr>
                  <th class="text-left py-2 px-4">版本</th>
                  <th class="text-left py-2 px-2">日期</th>
                  <th class="text-left py-2 px-2">投喂样本</th>
                  <th class="text-right py-2 px-2">Loss</th>
                  <th class="text-right py-2 px-2">RMSE</th>
                  <th class="text-right py-2 px-2">AUC</th>
                  <th class="text-center py-2 px-4">状态</th>
                </tr>
              </thead>
              <tbody class="font-mono text-xs">
                <tr
                  v-for="h in ITERATION_HISTORY"
                  :key="h.ver"
                  class="border-b border-hairline/40"
                >
                  <td class="py-2 px-4 text-text-primary font-semibold">{{ h.ver }}</td>
                  <td class="py-2 px-2 text-text-secondary">{{ h.date }}</td>
                  <td class="py-2 px-2 text-text-secondary">{{ h.samples }}</td>
                  <td class="py-2 px-2 text-right text-text-primary">{{ h.loss }}</td>
                  <td class="py-2 px-2 text-right text-text-primary">{{ h.rmse }}</td>
                  <td class="py-2 px-2 text-right text-text-primary">{{ h.auc }}</td>
                  <td class="py-2 px-4 text-center">
                    <span
                      v-if="h.status === 'production'"
                      class="px-2 py-0.5 rounded text-[10px] bg-patina/20 text-patina"
                    >PROD</span>
                    <span
                      v-else-if="h.status === 'shadow'"
                      class="px-2 py-0.5 rounded text-[10px] bg-sulfur/20 text-sulfur"
                    >SHADOW</span>
                    <span
                      v-else
                      class="px-2 py-0.5 rounded text-[10px] bg-bg-base text-text-muted"
                    >归档</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div v-if="showInspector" class="w-[300px] shrink-0 space-y-4 col-span-3">
        <Panel
          title="节点属性"
          :subtitle="
            selectedNode?.algoId
              ? '算法节点'
              : selectedNode?.type === 'source'
                ? '数据源节点'
                : '输出节点'
          "
          flush
        >
          <template #action>
            <button
              class="text-xs text-text-muted hover:text-text-primary"
              title="折叠右栏"
              @click="showInspector = false"
            >
              收起 ▶
            </button>
          </template>
          <div class="px-3 py-3 space-y-3 text-xs">
            <template v-if="selectedAlgo">
              <div class="p-2 rounded bg-bg-base border border-hairline">
                <div class="text-text-primary font-medium">{{ selectedAlgo.name }}</div>
                <div class="text-[11px] text-text-muted mt-1">{{ selectedAlgo.desc }}</div>
                <div class="flex gap-1.5 mt-2 flex-wrap">
                  <span class="px-1.5 py-0 text-[10px] rounded bg-molybdenum/20 text-molybdenum">
                    {{ selectedAlgo.runtime }}
                  </span>
                  <span class="px-1.5 py-0 text-[10px] rounded bg-bg-base border border-hairline text-text-muted">
                    输入 {{ selectedAlgo.inputs.length }}
                  </span>
                  <span class="px-1.5 py-0 text-[10px] rounded bg-bg-base border border-hairline text-text-muted">
                    输出 {{ selectedAlgo.outputs.length }}
                  </span>
                </div>
              </div>
              <div>
                <div class="text-text-muted mb-1.5">超参</div>
                <div class="space-y-1.5">
                  <div v-for="p in selectedAlgo.params" :key="p" class="flex items-center gap-2">
                    <span class="text-text-secondary w-20 text-[11px]">{{ p }}</span>
                    <input
                      class="flex-1 bg-bg-base border border-hairline rounded px-2 py-1 text-text-primary text-[11px]"
                      :value="p.includes('率') ? '0.001' : p.includes('数') ? '64' : 'auto'"
                    />
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="p-2 rounded bg-bg-base border border-hairline">
              <div class="text-text-primary font-medium">{{ selectedNode?.name }}</div>
              <div class="text-[11px] text-text-muted mt-1">{{ selectedNode?.meta }}</div>
            </div>
          </div>
        </Panel>

        <Panel title="数据投喂窗口" subtitle="从治理后的特征库中选择训练数据" flush>
          <div class="px-3 py-3 space-y-2 text-xs">
            <div class="text-text-muted">候选数据集</div>
            <div class="space-y-1.5">
              <label
                v-for="ds in FEED_DATASETS"
                :key="ds.id"
                class="block p-2 rounded border cursor-pointer transition"
                :class="
                  feed === ds.id
                    ? 'border-molybdenum/60 bg-molybdenum/10'
                    : 'border-hairline hover:border-molybdenum/40'
                "
              >
                <div class="flex items-center gap-2">
                  <input
                    v-model="feed"
                    type="radio"
                    :value="ds.id"
                    class="accent-molybdenum"
                  />
                  <span class="text-text-primary font-medium text-[11px] flex-1">{{ ds.name }}</span>
                  <span class="text-[10px] text-text-muted">{{ ds.range }}</span>
                </div>
                <div class="text-[10px] text-text-muted mt-1 flex gap-2 pl-5">
                  <span>{{ ds.size }}</span>
                  <span v-if="ds.cols > 0">· {{ ds.cols }} 维</span>
                  <span class="text-patina">· {{ ds.quality }}</span>
                </div>
              </label>
            </div>
            <div class="pt-2 border-t border-hairline/60">
              <div class="text-text-muted mb-1.5">训练 / 推理</div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  class="px-2 py-1.5 rounded border border-molybdenum/40 bg-molybdenum/10 text-molybdenum text-[11px] inline-flex items-center justify-center gap-1"
                >
                  <Beaker class="size-3" /> 训练新版
                </button>
                <button
                  class="px-2 py-1.5 rounded border border-patina/40 bg-patina/10 text-patina text-[11px] inline-flex items-center justify-center gap-1"
                >
                  <Play class="size-3" /> 推理回测
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="预训练模型库" subtitle="点击载入到画布预览 · 可微调">
          <template #action>
            <a href="/model-package" class="text-xs text-molybdenum hover:underline">导出 →</a>
          </template>
          <div class="space-y-2 text-xs max-h-[260px] overflow-y-auto pr-1 -mx-2 px-2">
            <button
              v-for="m in MODELS.slice(0, 8)"
              :key="m.id"
              type="button"
              class="block w-full text-left p-2 rounded border transition"
              :class="[
                modelCatCls(m.cat).border,
                currentModelId === m.id
                  ? `${modelCatCls(m.cat).bg} ring-2 ring-molybdenum shadow-[0_0_12px_rgba(74,158,255,0.25)]`
                  : 'bg-bg-base hover:brightness-110',
              ]"
              @click="currentModelId = currentModelId === m.id ? null : m.id"
            >
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-semibold" :class="modelCatCls(m.cat).text">{{ m.name }}</span>
                <span class="text-[10px] text-text-muted">{{ m.type }}</span>
                <span
                  v-if="m.finetuned"
                  class="ml-auto px-1 py-0 text-[9px] rounded bg-patina/20 text-patina"
                >已微调</span>
              </div>
              <div class="text-[10px] text-text-muted mt-1 line-clamp-2">{{ m.desc }}</div>
              <div class="text-[10px] text-text-secondary mt-1 font-mono">
                {{ m.metric }} · {{ m.size }}
              </div>
              <div v-if="currentModelId === m.id" class="mt-1 text-[10px] text-molybdenum">
                ● 当前画布预览中
              </div>
            </button>
          </div>
        </Panel>
      </div>

      <div
        v-else
        class="w-10 flex flex-col items-center gap-3 rounded border border-hairline bg-bg-surface py-3"
        title="展开属性面板"
      >
        <button
          class="rounded p-1 text-text-muted transition hover:bg-bg-elevated hover:text-text-primary"
          @click="showInspector = true"
        >
          <ChevronLeft :size="16" />
        </button>
        <div
          class="flex-1 flex items-center [writing-mode:vertical-rl] text-[11px] text-text-muted tracking-widest"
        >
          属性 · 数据投喂
        </div>
        <div class="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-molybdenum/15 text-molybdenum">
          {{ selectedId ? '已选' : '空' }}
        </div>
      </div>
    </div>

    <Panel title="算法 & 模型能力总览" subtitle="覆盖 11 类能碳运维核心场景">
      <template #action>
        <span class="text-xs text-text-muted">
          温度预测 · 火焰分析 · 故障预测 · 工艺寻优 · 能效 · 碳排 · 数据清洗 · 工况识别 · 异常检测 · 模型管理 · 监控指标
        </span>
      </template>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div
          v-for="c in CAPABILITY_CARDS"
          :key="c.name"
          class="p-3 rounded border"
          :class="[COLOR_CLS[c.color].border, COLOR_CLS[c.color].bg]"
        >
          <div class="flex items-center justify-between">
            <component :is="c.icon" class="size-4" :class="COLOR_CLS[c.color].text" />
            <span class="text-[10px] text-text-muted font-mono">×{{ c.cnt }}</span>
          </div>
          <div class="text-sm font-medium mt-2" :class="COLOR_CLS[c.color].text">{{ c.name }}</div>
          <div class="text-[10px] text-text-muted mt-1 line-clamp-2">{{ c.desc }}</div>
        </div>
      </div>
    </Panel>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Panel title="训练日志" subtitle="最近一次 · v1.3-rc · KilnTemp-LSTM-30m">
        <div class="font-mono text-[11px] space-y-1 text-text-secondary max-h-[180px] overflow-y-auto">
          <div v-for="(row, i) in TRAIN_LOGS" :key="i" class="flex gap-2">
            <span class="text-text-muted">{{ row.t }}</span>
            <span :class="row.c">{{ row.l }}</span>
          </div>
        </div>
      </Panel>

      <Panel title="数据血缘" subtitle="特征 → 模型 → 决策">
        <div class="text-xs space-y-2">
          <div class="flex items-center gap-2">
            <Database class="size-3.5 text-coolant" />
            <span class="text-text-secondary">治理后特征库 (TC-01)</span>
            <ChevronRight class="size-3 text-text-muted" />
            <span class="text-text-primary font-mono">326 维</span>
          </div>
          <div class="flex items-center gap-2">
            <Layers class="size-3.5 text-molybdenum" />
            <span class="text-text-secondary">流水线 wf-temp</span>
            <ChevronRight class="size-3 text-text-muted" />
            <span class="text-text-primary font-mono">v1.3-rc</span>
          </div>
          <div class="flex items-center gap-2">
            <Brain class="size-3.5 text-iron" />
            <span class="text-text-secondary">KilnTemp-LSTM-30m</span>
            <ChevronRight class="size-3 text-text-muted" />
            <span class="text-text-primary font-mono">RMSE 4.2℃</span>
          </div>
          <div class="flex items-center gap-2">
            <Target class="size-3.5 text-patina" />
            <span class="text-text-secondary">决策输出 OPC UA · 工单</span>
            <ChevronRight class="size-3 text-text-muted" />
            <span class="text-patina font-mono">PROD</span>
          </div>
        </div>
      </Panel>

      <Panel title="封装就绪状态" subtitle="可一键导出为 Skill / EXE / APP / Docker">
        <template #action>
          <a href="/model-package" class="text-xs text-iron hover:underline">导出中心 →</a>
        </template>
        <div class="space-y-2 text-xs">
          <div v-for="r in PACKAGE_READY" :key="r.k" class="flex items-center gap-2">
            <CircleCheck v-if="r.ok" class="size-3.5 text-patina" />
            <Clock v-else class="size-3.5 text-sulfur" />
            <span class="text-text-secondary w-20">{{ r.k }}</span>
            <span class="font-mono" :class="r.ok ? 'text-text-primary' : 'text-sulfur'">{{ r.v }}</span>
          </div>
          <a
            href="/model-package"
            class="mt-3 block text-center py-2 rounded border border-iron/40 bg-iron/10 text-iron font-medium inline-flex items-center justify-center gap-1.5 w-full"
          >
            <Plus class="size-3.5" /> 进入封装导出
          </a>
        </div>
      </Panel>
    </div>
  </div>

  <div v-if="algoOverview" class="fixed inset-0 z-50 flex">
    <div class="flex-1 bg-black/60 backdrop-blur-sm" @click="algoOverview = false" />
    <div
      class="w-[calc(100vw-260px)] max-w-[1280px] bg-bg-elevated border-l border-hairline shadow-2xl flex flex-col"
    >
      <div class="flex items-center justify-between px-5 py-3 border-b border-hairline bg-bg-surface">
        <div>
          <div class="text-sm font-semibold text-text-primary inline-flex items-center gap-2">
            <Boxes class="size-4 text-molybdenum" />
            算法库全览
            <span
              class="px-1.5 py-0.5 text-[10px] rounded bg-molybdenum/15 text-molybdenum border border-molybdenum/30"
            >
              共 {{ ALGORITHMS.length }} 个
            </span>
          </div>
          <div class="text-[11px] text-text-muted mt-0.5">
            按分类浏览全部决策分析算法 · 点击「拖入」加入画布
          </div>
        </div>
        <button
          class="text-text-muted hover:text-iron p-1.5 rounded hover:bg-bg-base"
          @click="algoOverview = false"
        >
          <X class="size-4" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <section
          v-for="cat in ALGO_CATEGORIES"
          :key="cat.id"
        >
          <template v-if="ALGORITHMS.filter((a) => a.cat === cat.id).length">
            <div class="flex items-center gap-2 mb-2 pb-1.5 border-b" :class="COLOR_CLS[cat.color].border">
              <span class="text-xs font-semibold" :class="COLOR_CLS[cat.color].text">{{ cat.name }}</span>
              <span class="text-[10px] text-text-muted">
                {{ ALGORITHMS.filter((a) => a.cat === cat.id).length }} 个算法
              </span>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              <div
                v-for="a in ALGORITHMS.filter((a) => a.cat === cat.id)"
                :key="a.id"
                class="p-2.5 rounded border bg-bg-surface hover:bg-bg-base transition group"
                :class="COLOR_CLS[cat.color].border"
              >
                <div class="flex items-start justify-between gap-2 mb-1">
                  <div class="flex items-center gap-1.5">
                    <component
                      :is="ICON_MAP[cat.icon] ?? Boxes"
                      class="size-3.5"
                      :class="COLOR_CLS[cat.color].text"
                    />
                    <span class="text-[12px] font-semibold text-text-primary">{{ a.name }}</span>
                  </div>
                  <span class="text-[9px] text-text-muted font-mono shrink-0">{{ a.runtime ?? '—' }}</span>
                </div>
                <p class="text-[10px] text-text-muted leading-snug line-clamp-2 mb-1.5">{{ a.desc }}</p>
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-text-secondary font-mono">热度 {{ a.pop ?? 0 }}</span>
                  <button
                    class="px-2 py-0.5 text-[10px] rounded border opacity-0 group-hover:opacity-100 transition"
                    :class="[COLOR_CLS[cat.color].border, COLOR_CLS[cat.color].bg, COLOR_CLS[cat.color].text]"
                    @click="dragInAlgo(a)"
                  >
                    + 拖入
                  </button>
                </div>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>
