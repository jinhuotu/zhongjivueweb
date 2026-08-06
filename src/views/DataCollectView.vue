<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Component } from 'vue'
import {
  Network,
  Radio,
  Cpu,
  Database,
  CircleCheck,
  TriangleAlert,
  CircleAlert,
  Plus,
  Trash2,
  Activity,
  Thermometer,
  Gauge,
  Flame,
  Wind,
  Zap,
  Droplet,
  Eye,
  Plug,
  Wrench,
  ChevronRight,
  FilePlus,
  Save,
  Download,
  Upload,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import {
  FURNACES,
  FURNACE_SNAPSHOTS,
  PROTOCOLS,
  DEVICE_LINKS,
  DATA_POINTS_SAMPLE,
} from '@/lib/mock'

interface CanvasNode {
  id: string
  protocol: string
  x: number
  y: number
  name: string
  connected: boolean
  config: Record<string, string>
}

const PROTO_ICONS: Record<string, Component> = {
  'modbus-tcp': Network,
  mqtt: Radio,
  'opc-ua': Cpu,
}
const PROTO_COLORS: Record<string, string> = {
  'modbus-tcp': 'text-molybdenum border-molybdenum/50 bg-molybdenum/10',
  mqtt: 'text-patina border-patina/50 bg-patina/10',
  'opc-ua': 'text-iron border-iron/50 bg-iron/10',
}

const STATUS_COLORS = {
  connected: { label: '已连接', color: 'text-patina border-patina/40 bg-patina/10', icon: CircleCheck },
  warning: { label: '延迟告警', color: 'text-sulfur border-sulfur/40 bg-sulfur/10', icon: TriangleAlert },
  idle: { label: '未启用', color: 'text-text-muted border-hairline bg-bg-base', icon: CircleAlert },
} as const

const nodes = ref<CanvasNode[]>([
  {
    id: 'n-1',
    protocol: 'opc-ua',
    x: 80,
    y: 60,
    name: 'TC-04 烧成窑 OPC-UA',
    connected: true,
    config: { 'Endpoint URL': 'opc.tcp://10.20.31.24:4840', '安全策略': 'Basic256Sha256', '订阅周期': '1000ms' },
  },
  {
    id: 'n-2',
    protocol: 'modbus-tcp',
    x: 80,
    y: 220,
    name: 'TC-02 正火窑 Modbus',
    connected: true,
    config: { 'IP 地址': '10.20.31.22', '端口': '502', '从站 ID': '1', '轮询间隔(ms)': '500' },
  },
])
const edges = ref<[string, string][]>([
  ['n-1', 'sink'],
  ['n-2', 'sink'],
])
const selectedEdge = ref<number | null>(null)
const selectedId = ref<string | null>('n-1')
const hoverFurnace = ref<string | null>(null)
const showPreview = ref(false)
const rightCollapsed = ref(false)
const draggingProto = ref<string | null>(null)
const canvasRef = ref<HTMLDivElement | null>(null)
const dragRef = ref<{ id: string; offX: number; offY: number; moved: boolean } | null>(null)
const flowName = ref('车式窑数据采集工作流')
const toast = ref<string | null>(null)
const connectFrom = ref<string | null>(null)

const selected = computed(() => nodes.value.find((n) => n.id === selectedId.value))
const selectedProto = computed(() =>
  selected.value ? PROTOCOLS.find((p) => p.id === selected.value!.protocol) : null,
)

const stats = computed(() => {
  const total = DEVICE_LINKS.length
  const connected = DEVICE_LINKS.filter((l) => l.status === 'connected').length
  const points = DEVICE_LINKS.reduce((s, l) => s + l.points, 0)
  return { total, connected, points }
})

function flashToast(msg: string) {
  toast.value = msg
  setTimeout(() => {
    toast.value = null
  }, 2200)
}

function handleNew() {
  nodes.value = []
  selectedId.value = null
  edges.value = []
  flowName.value = '新建工作流'
  flashToast('已新建空白画布')
}

function handleSave() {
  flashToast(`已保存「${flowName.value}」`)
}

function handleExport() {
  const d = JSON.stringify(
    { name: flowName.value, nodes: nodes.value, edges: edges.value, exportedAt: new Date().toISOString() },
    null,
    2,
  )
  const b = new Blob([d], { type: 'application/json' })
  const u = URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = u
  a.download = `${flowName.value}.json`
  a.click()
  URL.revokeObjectURL(u)
  flashToast('已导出 JSON')
}

function handleImport() {
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.accept = '.json'
  inp.onchange = (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = (e) => {
      try {
        const d = JSON.parse(e.target?.result as string)
        if (d.nodes) {
          nodes.value = d.nodes
          if (d.edges) edges.value = d.edges
          flowName.value = d.name || '导入工作流'
          flashToast(`已导入「${d.name}」`)
        }
      } catch {
        flashToast('导入失败：格式错误')
      }
    }
    r.readAsText(f)
  }
  inp.click()
}

function startConnect(fromId: string, e: MouseEvent) {
  e.stopPropagation()
  connectFrom.value = fromId
  selectedEdge.value = null
}

function finishConnect(toId: string) {
  if (connectFrom.value && connectFrom.value !== toId) {
    const from = connectFrom.value
    const exists = edges.value.some((e) => e[0] === from && e[1] === toId)
    if (!exists) edges.value = [...edges.value, [from, toId]]
  }
  connectFrom.value = null
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

function onMove(e: MouseEvent) {
  if (!dragRef.value || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const x = Math.max(8, Math.min(rect.width - 220, e.clientX - rect.left - dragRef.value.offX))
  const y = Math.max(8, Math.min(rect.height - 110, e.clientY - rect.top - dragRef.value.offY))
  dragRef.value.moved = true
  const id = dragRef.value.id
  nodes.value = nodes.value.map((n) => (n.id === id ? { ...n, x, y } : n))
}

function onUp() {
  dragRef.value = null
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
})

function onNodeMouseDown(e: MouseEvent, node: CanvasNode) {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  dragRef.value = {
    id: node.id,
    offX: e.clientX - rect.left - node.x,
    offY: e.clientY - rect.top - node.y,
    moved: false,
  }
  selectedId.value = node.id
}

function addNode(protoId: string, x: number, y: number) {
  const proto = PROTOCOLS.find((p) => p.id === protoId)
  if (!proto) return
  const id = `n-${Date.now().toString(36)}`
  const defaults: Record<string, string> = {}
  proto.fields.forEach((f) => (defaults[f] = ''))
  nodes.value = [
    ...nodes.value,
    { id, protocol: protoId, x, y, name: `新建 ${proto.name} 节点`, connected: false, config: defaults },
  ]
  selectedId.value = id
  rightCollapsed.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  if (!draggingProto.value || !e.currentTarget) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  addNode(draggingProto.value, e.clientX - rect.left - 90, e.clientY - rect.top - 30)
  draggingProto.value = null
}

function testConnect() {
  if (!selected.value) return
  const id = selected.value.id
  nodes.value = nodes.value.map((n) => (n.id === id ? { ...n, connected: !n.connected } : n))
}

function removeNode() {
  if (!selected.value) return
  const id = selected.value.id
  nodes.value = nodes.value.filter((n) => n.id !== id)
  edges.value = edges.value.filter(([a, b]) => a !== id && b !== id)
  selectedId.value = null
}

function updateConfig(field: string, value: string) {
  if (!selected.value) return
  const id = selected.value.id
  nodes.value = nodes.value.map((n) =>
    n.id === id ? { ...n, config: { ...n.config, [field]: value } } : n,
  )
}

function updateNodeName(value: string) {
  if (!selected.value) return
  const id = selected.value.id
  nodes.value = nodes.value.map((x) => (x.id === id ? { ...x, name: value } : x))
}

function deleteEdge(i: number) {
  edges.value = edges.value.filter((_, idx) => idx !== i)
  selectedEdge.value = null
  flashToast('已删除连线')
}

function edgePath(fromId: string, toId: string) {
  const from = nodes.value.find((n) => n.id === fromId)
  const isSink = toId === 'sink'
  const to = isSink ? null : nodes.value.find((n) => n.id === toId)
  if (!from || (!isSink && !to)) return null
  const x1 = from.x + 176
  const y1 = from.y + 30
  const x2 = isSink ? 720 : to!.x
  const y2 = isSink ? 210 : to!.y + 30
  const cx = (x1 + x2) / 2
  return { x1, y1, x2, y2, cx, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, d: `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}` }
}

function furnaceLink(furnaceId: string) {
  return DEVICE_LINKS.find((l) => l.furnaceId === furnaceId)
}

function statusOf(status: keyof typeof STATUS_COLORS) {
  return STATUS_COLORS[status]
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-end justify-between">
      <div>
        <h1 class="text-xl font-semibold text-text-primary">低代码数据采集 · 工业协议接入</h1>
        <p class="text-sm text-text-muted mt-1">
          拖拽协议节点 → 配置参数 → 测试连接 → 入库预览，4 步打通车式窑数据通道
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-bg-elevated border border-hairline text-text-secondary hover:text-text-primary hover:border-molybdenum transition-colors"
          @click="handleNew"
        >
          <FilePlus class="size-3.5" />新建
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-bg-elevated border border-hairline text-text-secondary hover:text-text-primary hover:border-patina transition-colors"
          @click="handleSave"
        >
          <Save class="size-3.5" />保存
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-bg-elevated border border-hairline text-text-secondary hover:text-text-primary hover:border-coolant transition-colors"
          @click="handleExport"
        >
          <Download class="size-3.5" />导出
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-bg-elevated border border-hairline text-text-secondary hover:text-text-primary hover:border-sulfur transition-colors"
          @click="handleImport"
        >
          <Upload class="size-3.5" />导入
        </button>
      </div>
    </div>
    <div v-if="toast" class="text-xs px-3 py-1.5 rounded bg-bg-elevated border border-patina text-patina">
      {{ toast }}
    </div>
    <div class="flex items-center gap-4 text-xs">
      <div class="flex items-center gap-1.5 text-text-secondary">
        <Plug class="size-3.5 text-patina" />
        已接入 <span class="text-text-primary font-mono">{{ stats.connected }}/{{ stats.total }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-text-secondary">
        <Activity class="size-3.5 text-molybdenum" />
        采集点位 <span class="text-text-primary font-mono">{{ stats.points }}</span>
      </div>
    </div>

    <div
      class="grid gap-3"
      :style="{ gridTemplateColumns: `220px 1fr ${rightCollapsed ? '0px' : '320px'}` }"
    >
      <Panel title="协议节点库" subtitle="拖拽到画布">
        <div class="space-y-2">
          <div
            v-for="p in PROTOCOLS"
            :key="p.id"
            draggable="true"
            class="p-3 rounded border-2 border-dashed cursor-grab active:cursor-grabbing"
            :class="PROTO_COLORS[p.id]"
            @dragstart="draggingProto = p.id"
            @dragend="draggingProto = null"
          >
            <div class="flex items-center gap-2 mb-1">
              <component :is="PROTO_ICONS[p.id]" class="size-4" />
              <span class="text-sm font-semibold">{{ p.name }}</span>
            </div>
            <p class="text-[11px] text-text-muted leading-relaxed">{{ p.desc }}</p>
          </div>
          <div class="mt-4 pt-3 border-t border-hairline">
            <div class="flex items-center gap-1.5 text-xs text-text-muted">
              <Database class="size-3.5 text-coolant" />
              数据落库目标
            </div>
            <div class="mt-2 p-2.5 rounded bg-coolant/10 border border-coolant/30 text-xs text-coolant">
              TDengine 时序库
              <div class="text-[10px] text-text-muted mt-1">db: lujing_iot</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="工作空间画布" subtitle="左侧拖入节点 · 拖动节点重排 · 点击连线编辑 / Del 删除">
        <template #action>
          <div class="flex items-center gap-2">
            <button
              class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded bg-bg-elevated text-text-secondary border border-hairline hover:text-molybdenum hover:border-molybdenum/40 transition-colors"
              :title="rightCollapsed ? '收起画布 · 显示属性栏' : '展开画布 · 收起属性栏'"
              @click="rightCollapsed = !rightCollapsed"
            >
              <ChevronRight
                class="w-3.5 h-3.5 transition-transform"
                :class="rightCollapsed ? 'rotate-180' : ''"
              />
              {{ rightCollapsed ? '属性栏' : '展开画布' }}
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-molybdenum/20 text-molybdenum border border-molybdenum/40 hover:bg-molybdenum/30"
              @click="showPreview = true"
            >
              <Eye class="size-3.5" />
              数据预览
            </button>
          </div>
        </template>

        <div
          ref="canvasRef"
          class="relative h-[420px] rounded border border-dashed border-hairline bg-bg-base/40 overflow-hidden bg-[radial-gradient(circle,_rgba(74,158,255,0.08)_1px,_transparent_1px)] bg-[size:20px_20px]"
          @dragover.prevent
          @drop="handleDrop"
          @mouseup="connectFrom && (connectFrom = null)"
          @click="(e) => { if (e.target === e.currentTarget) selectedEdge = null }"
        >
          <div
            class="absolute right-6 top-1/2 -translate-y-1/2 w-32 p-3 rounded border-2"
            :class="connectFrom ? 'border-iron bg-iron/20 cursor-crosshair' : 'border-coolant/50 bg-coolant/10'"
            @mouseup.stop="connectFrom && finishConnect('sink')"
          >
            <div class="flex items-center gap-1.5 mb-1">
              <Database class="size-4 text-coolant" />
              <span class="text-xs font-bold text-coolant">TDengine</span>
            </div>
            <div class="text-[10px] text-text-muted">时序数据库</div>
            <div class="text-[10px] text-text-muted mt-0.5">lujing_iot</div>
          </div>

          <svg class="absolute inset-0 w-full h-full" style="pointer-events: none">
            <template v-for="(edge, i) in edges" :key="`e-${i}`">
              <g v-if="edgePath(edge[0], edge[1])" style="pointer-events: auto">
                <path
                  :d="edgePath(edge[0], edge[1])!.d"
                  fill="none"
                  stroke="transparent"
                  stroke-width="12"
                  style="cursor: pointer"
                  @click.stop="selectedEdge = selectedEdge === i ? null : i"
                />
                <path
                  :d="edgePath(edge[0], edge[1])!.d"
                  fill="none"
                  :stroke="selectedEdge === i ? '#FF6B35' : '#7FB069'"
                  :stroke-width="selectedEdge === i ? 2.5 : 1.5"
                  :stroke-dasharray="selectedEdge === i ? '5 3' : undefined"
                  style="pointer-events: none"
                />
                <g
                  v-if="selectedEdge === i"
                  style="cursor: pointer"
                  @click.stop="deleteEdge(i)"
                >
                  <circle :cx="edgePath(edge[0], edge[1])!.mx" :cy="edgePath(edge[0], edge[1])!.my" r="9" fill="#FF6B35" />
                  <text
                    :x="edgePath(edge[0], edge[1])!.mx"
                    :y="edgePath(edge[0], edge[1])!.my + 4"
                    text-anchor="middle"
                    font-size="12"
                    fill="#fff"
                    font-weight="bold"
                  >×</text>
                </g>
              </g>
            </template>
            <circle
              v-if="connectFrom && nodes.find((n) => n.id === connectFrom)"
              :cx="nodes.find((n) => n.id === connectFrom)!.x + 176"
              :cy="nodes.find((n) => n.id === connectFrom)!.y + 30"
              r="4"
              fill="#FF6B35"
              style="pointer-events: none"
            >
              <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
            </circle>
          </svg>

          <div
            v-for="n in nodes"
            :key="n.id"
            class="absolute w-44 rounded-md cursor-grab active:cursor-grabbing transition-shadow"
            :class="
              selectedId === n.id
                ? `${PROTO_COLORS[n.protocol]} ring-2 ring-iron/40 shadow-[0_0_20px_rgba(255,107,53,0.2)]`
                : `${PROTO_COLORS[n.protocol]} opacity-90`
            "
            :style="{ left: `${n.x}px`, top: `${n.y}px` }"
            @click="
              () => {
                if (!dragRef?.moved) {
                  selectedId = n.id
                  rightCollapsed = false
                }
              }
            "
            @mousedown="onNodeMouseDown($event, n)"
          >
            <div
              v-if="connectFrom && connectFrom !== n.id"
              class="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-molybdenum bg-bg-surface flex items-center justify-center cursor-crosshair hover:bg-molybdenum/30 z-10"
              title="连接到此节点"
              @mousedown.stop="finishConnect(n.id)"
            >
              <div class="w-2 h-2 rounded-full bg-molybdenum" />
            </div>
            <div class="p-2.5 border-b border-current/30">
              <div class="flex items-center gap-1.5 mb-0.5">
                <component :is="PROTO_ICONS[n.protocol]" class="size-3.5" />
                <span class="text-xs font-bold">{{ PROTOCOLS.find((p) => p.id === n.protocol)?.name }}</span>
              </div>
              <div class="text-[11px] text-text-secondary line-clamp-1">{{ n.name }}</div>
            </div>
            <div class="p-2 flex items-center justify-between">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded"
                :class="n.connected ? 'bg-patina/20 text-patina' : 'bg-sulfur/20 text-sulfur'"
              >
                {{ n.connected ? '● 已连接' : '○ 待测试' }}
              </span>
              <span class="text-[10px] text-text-muted font-mono">{{ n.id }}</span>
            </div>
            <div
              class="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-iron bg-bg-surface flex items-center justify-center cursor-crosshair hover:bg-iron/30 z-10"
              title="拖拽连线"
              @mousedown.stop="startConnect(n.id, $event)"
            >
              <div class="w-2 h-2 rounded-full bg-iron" />
            </div>
          </div>

          <div
            v-if="nodes.length === 0"
            class="absolute inset-0 flex items-center justify-center text-text-muted text-sm"
          >
            <Plus class="size-4 mr-1.5" />
            从左侧拖拽协议节点到此处
          </div>
        </div>
      </Panel>

      <Panel
        v-if="!rightCollapsed"
        :title="selected ? `${selectedProto?.name} 配置` : '节点配置'"
        :subtitle="selected?.name"
      >
        <div v-if="!selected" class="h-[420px] flex items-center justify-center text-text-muted text-sm">
          请在画布中选中节点
        </div>
        <div v-else class="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          <div>
            <label class="block text-[11px] text-text-muted mb-1">节点名称</label>
            <input
              :value="selected.name"
              class="w-full bg-bg-base border border-hairline rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-molybdenum"
              @input="updateNodeName(($event.target as HTMLInputElement).value)"
            />
          </div>
          <div v-for="f in selectedProto?.fields ?? []" :key="f">
            <label class="block text-[11px] text-text-muted mb-1">{{ f }}</label>
            <input
              :value="selected.config[f] ?? ''"
              class="w-full bg-bg-base border border-hairline rounded px-2.5 py-1.5 text-xs text-text-primary font-mono focus:outline-none focus:border-molybdenum"
              @input="updateConfig(f, ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="grid grid-cols-2 gap-2 pt-2 sticky bottom-0 bg-bg-surface">
            <button
              class="flex items-center justify-center gap-1 py-2 text-xs rounded"
              :class="
                selected.connected
                  ? 'bg-patina/20 text-patina border border-patina/40'
                  : 'bg-molybdenum/20 text-molybdenum border border-molybdenum/40'
              "
              @click="testConnect"
            >
              <Wrench class="size-3.5" />
              {{ selected.connected ? '断开' : '测试连接' }}
            </button>
            <button
              class="flex items-center justify-center gap-1 py-2 text-xs rounded bg-bg-base text-text-muted border border-hairline hover:text-iron hover:border-iron/40"
              @click="removeNode"
            >
              <Trash2 class="size-3.5" />
              移除
            </button>
          </div>
        </div>
      </Panel>
    </div>

    <Panel
      title="车式窑设备接入拓扑"
      subtitle="鼠标悬停设备查看实时简要信息（温度 / 压力 / 流量 / 电能 / 阀位 / 空燃比）"
    >
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          v-for="f in FURNACES"
          :key="f.id"
          class="relative p-3 rounded-md border border-hairline bg-bg-base/50 hover:border-iron/40 hover:shadow-[0_0_18px_rgba(255,107,53,0.15)] transition-all cursor-pointer"
          @mouseenter="hoverFurnace = f.id"
          @mouseleave="hoverFurnace = null"
        >
          <template v-if="furnaceLink(f.id)">
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="text-[11px] font-mono text-text-muted">{{ f.id }}</div>
                <div class="text-sm font-semibold text-text-primary line-clamp-1">
                  {{ f.name.replace(/车式窑$/, '') }}
                </div>
              </div>
              <Flame class="size-4 text-iron" />
            </div>
            <div
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
              :class="PROTO_COLORS[furnaceLink(f.id)!.protocol]"
            >
              <component :is="PROTO_ICONS[furnaceLink(f.id)!.protocol]" class="size-3" />
              {{ PROTOCOLS.find((p) => p.id === furnaceLink(f.id)!.protocol)?.name }}
            </div>
            <div class="mt-2 flex items-center justify-between text-[10px]">
              <span
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                :class="statusOf(furnaceLink(f.id)!.status).color"
              >
                <component :is="statusOf(furnaceLink(f.id)!.status).icon" class="size-3" />
                {{ statusOf(furnaceLink(f.id)!.status).label }}
              </span>
              <span class="text-text-muted font-mono">{{ furnaceLink(f.id)!.points }} pt</span>
            </div>

            <div
              v-if="hoverFurnace === f.id && FURNACE_SNAPSHOTS[f.id]"
              class="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 rounded-md border border-iron/40 bg-bg-elevated shadow-xl"
            >
              <div class="text-xs font-semibold text-text-primary mb-2 pb-1.5 border-b border-hairline">
                实时工艺简报
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <div class="flex items-center gap-1 text-text-muted"><Thermometer class="size-3 text-iron" />炉温</div>
                <div class="font-mono text-text-primary text-right">{{ FURNACE_SNAPSHOTS[f.id].temperature }} ℃</div>
                <div class="flex items-center gap-1 text-text-muted"><Gauge class="size-3 text-molybdenum" />炉压</div>
                <div class="font-mono text-text-primary text-right">{{ FURNACE_SNAPSHOTS[f.id].pressure }} Pa</div>
                <div class="flex items-center gap-1 text-text-muted"><Flame class="size-3 text-sulfur" />燃气流量</div>
                <div class="font-mono text-text-primary text-right">{{ FURNACE_SNAPSHOTS[f.id].flow }} Nm³/h</div>
                <div class="flex items-center gap-1 text-text-muted"><Zap class="size-3 text-coolant" />风机电能</div>
                <div class="font-mono text-text-primary text-right">{{ FURNACE_SNAPSHOTS[f.id].power }} kW</div>
                <div class="flex items-center gap-1 text-text-muted"><Droplet class="size-3 text-patina" />阀位</div>
                <div class="font-mono text-text-primary text-right">{{ FURNACE_SNAPSHOTS[f.id].valvePos }} %</div>
                <div class="flex items-center gap-1 text-text-muted"><Wind class="size-3 text-iron" />空燃比 λ</div>
                <div class="font-mono text-text-primary text-right">{{ FURNACE_SNAPSHOTS[f.id].airFuelRatio }}</div>
                <div class="flex items-center gap-1 text-text-muted">O₂ 残氧</div>
                <div class="font-mono text-text-primary text-right">{{ FURNACE_SNAPSHOTS[f.id].o2 }} %</div>
                <div class="flex items-center gap-1 text-text-muted">烟气温度</div>
                <div class="font-mono text-text-primary text-right">{{ FURNACE_SNAPSHOTS[f.id].smoke }} ℃</div>
              </div>
              <div class="mt-2 pt-1.5 border-t border-hairline flex items-center justify-between text-[10px] text-text-muted">
                <span>工况 <span class="text-molybdenum">{{ FURNACE_SNAPSHOTS[f.id].stage }}</span></span>
                <span>
                  燃烧
                  <span
                    :class="
                      FURNACE_SNAPSHOTS[f.id].combustion === 'OPTIMAL'
                        ? 'text-patina'
                        : FURNACE_SNAPSHOTS[f.id].combustion === 'LEAN'
                          ? 'text-sulfur'
                          : 'text-iron'
                    "
                  >{{ FURNACE_SNAPSHOTS[f.id].combustion }}</span>
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Panel>

    <div
      v-if="showPreview"
      class="fixed inset-0 z-50 bg-bg-base/70 backdrop-blur-sm flex items-end justify-end"
      @click="showPreview = false"
    >
      <div
        class="h-full w-full max-w-3xl bg-bg-surface border-l border-hairline overflow-y-auto"
        @click.stop
      >
        <div class="sticky top-0 bg-bg-surface border-b border-hairline px-5 py-3 flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold text-text-primary">采集点位数据预览（最近 10 条）</div>
            <div class="text-[11px] text-text-muted">采集成功 · TDengine · db.lujing_iot</div>
          </div>
          <button
            class="text-text-muted hover:text-iron text-xs px-3 py-1 rounded border border-hairline"
            @click="showPreview = false"
          >
            关闭
          </button>
        </div>
        <table class="w-full text-xs">
          <thead class="text-text-muted bg-bg-base/60">
            <tr>
              <th class="text-left px-3 py-2">标签</th>
              <th class="text-left px-3 py-2">说明</th>
              <th class="text-left px-3 py-2">单位</th>
              <th class="text-left px-3 py-2">类型</th>
              <th class="text-left px-3 py-2">地址</th>
              <th class="text-left px-3 py-2">频率</th>
              <th class="text-left px-3 py-2">质量</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in DATA_POINTS_SAMPLE"
              :key="p.tag"
              class="border-t border-hairline hover:bg-bg-base/30"
            >
              <td class="px-3 py-2 font-mono text-text-primary">{{ p.tag }}</td>
              <td class="px-3 py-2 text-text-secondary">{{ p.desc }}</td>
              <td class="px-3 py-2 text-text-secondary">{{ p.unit }}</td>
              <td class="px-3 py-2 text-coolant font-mono">{{ p.type }}</td>
              <td class="px-3 py-2 text-text-muted font-mono text-[10px]">{{ p.addr }}</td>
              <td class="px-3 py-2 text-text-secondary">{{ p.rate }}</td>
              <td class="px-3 py-2">
                <span
                  class="px-1.5 py-0.5 rounded text-[10px]"
                  :class="p.quality === 'VALID' ? 'bg-patina/15 text-patina' : 'bg-sulfur/15 text-sulfur'"
                >
                  {{ p.quality }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
