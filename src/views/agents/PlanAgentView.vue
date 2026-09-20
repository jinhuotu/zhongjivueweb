<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Check,
  Clock,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  User,
  Zap,
} from 'lucide-vue-next'
import { Panel, Tag } from '@/components/ui-kit'
import SimpleWorkflow from '@/components/agents/SimpleWorkflow.vue'
import AbnormalDialog from '@/components/agents/AbnormalDialog.vue'
import type { WorkflowNode, WorkflowStep } from '@/components/agents/types'

type Objective = 'delivery' | 'energy' | 'balance'
type RunPhase = 'idle' | 'running' | 'done'
type OrderStatus = '已排程' | '待重排' | '已拆批' | '急单插入' | '已下发'

type PlanOrder = {
  order: string
  product: string
  qty: string
  kiln: string
  due: string
  status: OrderStatus
}

type Suggestion = {
  id: string
  title: string
  action: string
  reason: string
  impact: string
  tone: 'iron' | 'sulfur' | 'patina' | 'molybdenum'
}

type ChatMsg = {
  id: string
  role: 'user' | 'bot'
  text: string
  note?: string
  noteTone?: 'ok' | 'warn'
  follow?: string[]
}

const horizon = ref(14)
const loadFactor = ref(1.05)
const objective = ref<Objective>('balance')
const allowTransfer = ref(true)
const allowSplit = ref(false)
const valleyPower = ref(true)
const insertRush = ref(false)

const runPhase = ref<RunPhase>('idle')
const dispatched = ref(false)
const applied = ref<string[]>([])
const showAbnormal = ref(false)
const dirty = ref(false)

const visibleLogCount = ref(7)
const chatInput = ref('')
const typing = ref(false)
const chatBox = ref<HTMLElement | null>(null)
const timers: number[] = []

const btn =
  'inline-flex items-center h-8 px-3 text-xs rounded border border-hairline bg-transparent hover:bg-bg-surface/60 transition-colors disabled:opacity-40'
const btnPrimary =
  'inline-flex items-center h-8 px-3 text-xs rounded border border-transparent bg-iron text-white hover:brightness-110 transition-colors disabled:opacity-40'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    timers.push(window.setTimeout(resolve, ms))
  })
}

const plan = computed(() => {
  const lf = loadFactor.value
  const transfer = allowTransfer.value
  const split = allowSplit.value
  const valley = valleyPower.value
  const rush = insertRush.value
  const obj = objective.value
  const days = horizon.value
  const appliedSet = new Set(applied.value)

  let fill =
    88.4 +
    (transfer ? 3.1 : 0) +
    (split ? 2.0 : 0) +
    (days === 21 ? 1.4 : days === 7 ? -1.6 : 0) +
    (obj === 'delivery' ? 2.2 : obj === 'energy' ? -1.6 : 0.5) -
    Math.max(0, lf - 1) * 16 -
    (rush ? 2.6 : 0)
  if (appliedSet.has('transfer')) fill += 1.1
  if (appliedSet.has('split')) fill += 0.8
  if (appliedSet.has('valley')) fill += 0.3
  fill = +clamp(fill, 74, 99.1).toFixed(1)

  let util = 72 + lf * 16 + (rush ? 3.5 : 0) - (transfer ? 2.2 : 0)
  util = +clamp(util, 68, 97.8).toFixed(1)

  let tc06 = 96 * lf + (rush ? 9 : 0) - (transfer ? 17 : 0) - (split ? 9 : 0)
  if (appliedSet.has('transfer')) tc06 -= 6
  if (appliedSet.has('split')) tc06 -= 4
  tc06 = +clamp(tc06, 62, 128).toFixed(1)

  const overload = tc06 > 100
  const energySave = valley
    ? obj === 'energy'
      ? 3.6
      : 2.3
    : obj === 'energy'
      ? 1.1
      : 0.4
  const saveWan = +energySave.toFixed(1)
  const orders = 10 + (days >= 14 ? 2 : 0) + (rush ? 1 : 0)
  const confidence = overload && !transfer ? 62 : fill >= 95 ? 91 : fill >= 90 ? 84 : 73

  const kilns = [
    { id: 'TC-01', load: clamp(78 + lf * 6, 60, 98) },
    { id: 'TC-02', load: clamp(86 + lf * 8 - (transfer ? 4 : 0), 60, 99) },
    { id: 'TC-03', load: clamp(70 + lf * 5 + (transfer ? 9 : 0), 60, 99) },
    { id: 'TC-04', load: clamp(81 + lf * 6 + (split ? 7 : 0), 60, 99) },
    { id: 'TC-05', load: clamp(66 + lf * 4, 55, 92) },
    { id: 'TC-06', load: tc06 },
  ].map((k) => ({
    ...k,
    load: +k.load.toFixed(1),
    level: k.load > 100 ? ('high' as const) : k.load >= 92 ? ('mid' as const) : ('ok' as const),
  }))

  const rows: PlanOrder[] = [
    {
      order: 'PO-001',
      product: '高铝砖 A1',
      qty: '320 吨',
      kiln: 'TC-01',
      due: '9月12日',
      status: dispatched.value ? '已下发' : '已排程',
    },
    {
      order: 'PO-002',
      product: '高铝砖 A2',
      qty: '370 吨',
      kiln: transfer || appliedSet.has('transfer') ? 'TC-03' : 'TC-02',
      due: '9月13日',
      status: dispatched.value
        ? '已下发'
        : transfer || appliedSet.has('transfer')
          ? '已排程'
          : '待重排',
    },
    {
      order: 'PO-003',
      product: '高铝砖 A3',
      qty: '420 吨',
      kiln: 'TC-03',
      due: '9月14日',
      status: dispatched.value ? '已下发' : '已排程',
    },
    {
      order: 'PO-004',
      product: '高铝砖 A4',
      qty: '470 吨',
      kiln: 'TC-04',
      due: '9月15日',
      status: dispatched.value ? '已下发' : '已排程',
    },
    {
      order: 'PO-005',
      product: '莫来石 M1',
      qty: split || appliedSet.has('split') ? '160+120 吨' : '280 吨',
      kiln: split || appliedSet.has('split') ? 'TC-06 / TC-04' : 'TC-06',
      due: '9月16日',
      status: dispatched.value
        ? '已下发'
        : split || appliedSet.has('split')
          ? '已拆批'
          : overload
            ? '待重排'
            : '已排程',
    },
    {
      order: 'PO-006',
      product: '高铝砖 A5',
      qty: '310 吨',
      kiln: 'TC-05',
      due: '9月17日',
      status: dispatched.value ? '已下发' : '已排程',
    },
  ]
  if (rush) {
    rows.push({
      order: 'PO-RUSH',
      product: '急单 浇注料',
      qty: '180 吨',
      kiln: transfer ? 'TC-05' : 'TC-06',
      due: '9月13日',
      status: dispatched.value ? '已下发' : '急单插入',
    })
  }

  const voice: string[] = [
    `本轮按 ${days} 天窗口、负荷系数 ${lf.toFixed(2)}×、目标「${objLabel(obj)}」推演，共 ${orders} 张订单。`,
  ]
  if (overload) {
    voice.push(
      `TC-06 负荷 ${tc06}%，超过安全阈值。${transfer ? '已把 PO-002 转到 TC-03 降低冲突。' : '建议打开「允许转窑」，把冲突订单转到 TC-03。'}`,
    )
  } else {
    voice.push(`窑炉负荷均在阈值内，最高 ${Math.max(...kilns.map((k) => k.load)).toFixed(1)}%。`)
  }
  if (valley) {
    voice.push(`已把烧结保温段压到谷电时段，预计节省 ${saveWan} 万元。`)
  }
  if (rush) {
    voice.push('急单已插入，交期满足度被稀释，优先保障 PO-RUSH 的窑位。')
  }
  if (fill < 95) {
    voice.push(`当前满足度 ${fill}%，距 95% 目标还差 ${(95 - fill).toFixed(1)} 个点。`)
  } else {
    voice.push(`满足度 ${fill}%，已达到目标，可下发 MES 工单。`)
  }

  return {
    fill,
    util,
    tc06,
    overload,
    saveWan,
    orders,
    confidence,
    kilns,
    rows,
    voice: voice.join(''),
  }
})

function objLabel(v: Objective) {
  if (v === 'delivery') return '交期优先'
  if (v === 'energy') return '能耗优先'
  return '交期 / 能耗均衡'
}

const suggestions = computed<Suggestion[]>(() => {
  const s: Suggestion[] = []
  const p = plan.value
  if (p.overload && !allowTransfer.value) {
    s.push({
      id: 'transfer',
      title: '转窑消峰 · PO-002 → TC-03',
      action: '把待重排订单转移到富余窑位',
      reason: `TC-06 负荷 ${p.tc06}%，TC-03 仍有余量。转窑后预计满足度 +3.1%。`,
      impact: '负荷 ↓17pt',
      tone: 'iron',
    })
  }
  if (p.fill < 95 && !allowSplit.value) {
    s.push({
      id: 'split',
      title: '拆批生产 · PO-005',
      action: '拆成 160 吨 + 120 吨两批次',
      reason: '避开 TC-06 检修窗口，剩余量改走 TC-04，满足度可再抬约 2 个点。',
      impact: '满足度 +2.0%',
      tone: 'sulfur',
    })
  }
  if (valleyPower.value) {
    s.push({
      id: 'valley',
      title: '谷电协同 · 保温段后移',
      action: '22:00–06:00 安排高温保温',
      reason: `峰谷电价差已计入。按当前方案预计节省 ${p.saveWan} 万元。`,
      impact: `节省 ¥${p.saveWan} 万`,
      tone: 'patina',
    })
  }
  if (insertRush.value) {
    s.push({
      id: 'rush',
      title: '急单插位 · PO-RUSH',
      action: '占用 TC-05 空窗，原 A5 后移 0.5 天',
      reason: '交期硬约束。插入后满足度会下降约 2.6%，需业务确认。',
      impact: '满足度 −2.6%',
      tone: 'molybdenum',
    })
  }
  if (s.length === 0) {
    s.push({
      id: 'dispatch',
      title: '方案已稳态 · 建议下发',
      action: '校验通过，可生成 MES 工单',
      reason: `满足度 ${p.fill}% · 设备利用率 ${p.util}% · 置信度 ${p.confidence}%。`,
      impact: '可下发',
      tone: 'patina',
    })
  }
  return s
})

const mainNodes = computed<WorkflowNode[]>(() => {
  const p = plan.value
  if (runPhase.value === 'idle' && !dirty.value) {
    return [
      { id: 'n1', label: '需求接收', status: 'done' },
      { id: 'n2', label: '产能测算', status: 'done' },
      { id: 'n3', label: '排程生成', status: 'current' },
      { id: 'n4', label: '异常校验', status: p.overload ? 'warning' : 'done' },
      { id: 'n5', label: '下发工单', status: dispatched.value ? 'done' : 'pending' },
    ]
  }
  if (runPhase.value === 'running') {
    const step = visibleLogCount.value
    return [
      { id: 'n1', label: '需求接收', status: step >= 1 ? 'done' : 'current' },
      { id: 'n2', label: '产能测算', status: step >= 2 ? 'done' : step === 1 ? 'current' : 'pending' },
      { id: 'n3', label: '排程生成', status: step >= 4 ? 'done' : step >= 3 ? 'current' : 'pending' },
      {
        id: 'n4',
        label: '异常校验',
        status: step >= 5 ? (p.overload ? 'warning' : 'done') : step === 4 ? 'current' : 'pending',
      },
      { id: 'n5', label: '下发工单', status: 'pending' },
    ]
  }
  return [
    { id: 'n1', label: '需求接收', status: 'done' },
    { id: 'n2', label: '产能测算', status: 'done' },
    { id: 'n3', label: '排程生成', status: 'done' },
    { id: 'n4', label: '异常校验', status: p.overload ? 'warning' : 'done' },
    { id: 'n5', label: '下发工单', status: dispatched.value ? 'done' : 'current' },
  ]
})

const allLogSteps = computed<WorkflowStep[]>(() => {
  const p = plan.value
  return [
    {
      id: 'l1',
      title: '从 ERP 拉取生产订单',
      type: 'static',
      desc: `${p.orders} 条订单，合计 ${insertRush.value ? 2970 : 2790} 吨`,
    },
    {
      id: 'l2',
      title: '读取窑炉设备状态',
      type: 'static',
      desc: '8 台窑炉在线，TC-06 计划检修窗口 9/15 晚班',
    },
    {
      id: 'l3',
      title: '调用产能测算模型',
      type: 'ai',
      desc: `目标 ${objLabel(objective.value)} · 负荷系数 ${loadFactor.value.toFixed(2)}×`,
    },
    {
      id: 'l4',
      title: '生成初始排程方案',
      type: 'ai',
      desc: `满足度 ${p.fill}% · 利用率 ${p.util}%`,
    },
    {
      id: 'l5',
      title: p.overload ? '校验异常 · TC-06 超负荷' : '校验通过 · 负荷均在阈值内',
      type: p.overload ? 'branch' : 'static',
      desc: p.overload ? `当前 ${p.tc06}%（阈值 100%）` : `最高 ${p.tc06}%`,
      children: p.overload
        ? [
            {
              id: 'l5-1',
              title: allowTransfer.value ? '策略 A：PO-002 转至 TC-03' : '策略 A：建议开启转窑',
              type: 'branch',
            },
            {
              id: 'l5-2',
              title: allowSplit.value ? '策略 B：PO-005 拆批已启用' : '策略 B：拆批待确认',
              type: 'branch',
            },
            { id: 'l5-3', title: '重算能耗 / 交期 / 换产成本', type: 'ai' },
          ]
        : undefined,
    },
    {
      id: 'l6',
      title: valleyPower.value ? '谷电协同已写入班次' : '交期校验',
      type: valleyPower.value ? 'ai' : 'static',
      desc: valleyPower.value ? `预计节省 ${p.saveWan} 万元` : '10/12 满足，2 单可微调',
    },
    {
      id: 'l7',
      title: dispatched.value ? 'MES 工单已下发' : '等待确认后下发 MES',
      type: 'static',
      desc: dispatched.value ? `${p.rows.length} 张工单已推送` : '待审批',
    },
  ]
})

const shownLogs = computed(() => allLogSteps.value.slice(0, visibleLogCount.value))

const abnormalSteps: WorkflowStep[] = [
  { id: 'a1', title: '识别超限点：PO-002 与 PO-005 时间冲突', type: 'static' },
  { id: 'a2', title: '调用重排算法 v2.3', type: 'ai' },
  { id: 'a3', title: '策略 A：转移 PO-002 到 TC-03', type: 'branch' },
  { id: 'a4', title: '策略 B：拆分为两批次生产', type: 'branch' },
  { id: 'a5', title: '评估能耗 / 交期 / 碳排多维指标', type: 'ai' },
  { id: 'a6', title: '选择最优组合，回写排程结果', type: 'static' },
  { id: 'a7', title: '等待确认后下发 MES', type: 'static' },
]

const chips = [
  '为什么 TC-06 超负荷？',
  '怎样把满足度做到 95%？',
  '今晚谷电怎么排？',
  '插入一单急单会怎样？',
]

const messages = ref<ChatMsg[]>([
  {
    id: 'm0',
    role: 'bot',
    text: '我是计划智能体。你可以改左侧情景，点「启动排程」看我怎么推理；也可以直接问排程冲突、满足度或谷电策略。',
    follow: chips,
  },
])

watch(
  [horizon, loadFactor, objective, allowTransfer, allowSplit, valleyPower, insertRush],
  () => {
    if (runPhase.value === 'done') dirty.value = true
    dispatched.value = false
  },
)

function kilnBar(level: 'ok' | 'mid' | 'high') {
  if (level === 'high') return 'bg-iron'
  if (level === 'mid') return 'bg-sulfur'
  return 'bg-patina'
}

function statusTone(status: OrderStatus) {
  if (status === '待重排' || status === '急单插入') return 'sulfur'
  if (status === '已下发') return 'patina'
  if (status === '已拆批') return 'molybdenum'
  return 'default'
}

function applySuggestion(id: string) {
  if (id === 'transfer') allowTransfer.value = true
  if (id === 'split') allowSplit.value = true
  if (id === 'valley') valleyPower.value = true
  if (id === 'rush') insertRush.value = true
  if (id === 'dispatch') {
    void dispatchOrders()
    return
  }
  if (!applied.value.includes(id)) applied.value = [...applied.value, id]
}

async function runAgent() {
  if (runPhase.value === 'running') return
  runPhase.value = 'running'
  dirty.value = false
  dispatched.value = false
  visibleLogCount.value = 0
  for (let i = 1; i <= allLogSteps.value.length; i++) {
    visibleLogCount.value = i
    await sleep(420)
  }
  runPhase.value = 'done'
}

async function dispatchOrders() {
  if (plan.value.overload && !allowTransfer.value && !allowSplit.value) {
    showAbnormal.value = true
    return
  }
  if (runPhase.value !== 'done') await runAgent()
  dispatched.value = true
  visibleLogCount.value = allLogSteps.value.length
}

function resetParams() {
  horizon.value = 14
  loadFactor.value = 1.05
  objective.value = 'balance'
  allowTransfer.value = true
  allowSplit.value = false
  valleyPower.value = true
  insertRush.value = false
  applied.value = []
  dispatched.value = false
  dirty.value = false
  runPhase.value = 'idle'
  visibleLogCount.value = 7
}

function onNodeClick(node: WorkflowNode) {
  if (node.status === 'warning') showAbnormal.value = true
}

function answerQuestion(q: string): Omit<ChatMsg, 'id' | 'role'> {
  const p = plan.value
  const t = q.trim()
  if (/超负荷|TC-06|负荷/.test(t)) {
    return {
      text: `TC-06 当前负荷 ${p.tc06}%。根因是 PO-005 与 9/15 检修窗口重叠，再叠上负荷系数 ${loadFactor.value.toFixed(2)}×。${allowTransfer.value ? '已启用转窑，PO-002 改走 TC-03。' : '打开「允许转窑」后，智能体会把 PO-002 转到 TC-03，负荷大约能降 17 个点。'}`,
      note: p.overload ? '超过 100% 阈值，下发前必须处理。' : '负荷已回到安全区。',
      noteTone: p.overload ? 'warn' : 'ok',
      follow: ['怎样把满足度做到 95%？', 'PO-002 为什么待重排？'],
    }
  }
  if (/95|满足度/.test(t)) {
    return {
      text: `现在满足度 ${p.fill}%，目标 95%。最快的组合是：允许转窑（+3.1%）+ 拆批 PO-005（+2.0%）+ 交期优先。当前参数下${p.fill >= 95 ? '已经达标，可以直接下发。' : `还差 ${(95 - p.fill).toFixed(1)} 个点，点建议卡上的「采纳」我可以立刻改参数重算。`}`,
      note: `置信度 ${p.confidence}%`,
      noteTone: p.fill >= 95 ? 'ok' : 'warn',
      follow: ['允许转窑后会怎样？', '今晚谷电怎么排？'],
    }
  }
  if (/谷电|能耗|电价/.test(t)) {
    return {
      text: valleyPower.value
        ? `谷电协同已打开。高温保温集中在 22:00–06:00，预计节省 ${p.saveWan} 万元。若把目标切到「能耗优先」，节省可到 3.6 万，但满足度会略降。`
        : '谷电协同未打开。勾选「谷电协同」后，我会把烧结保温段挪到低谷电价，预计节省约 2.3 万元。',
      note: objective.value === 'energy' ? '当前目标：能耗优先' : '当前目标仍兼顾交期',
      noteTone: 'ok',
      follow: ['交期优先和能耗优先差在哪？', '怎样把满足度做到 95%？'],
    }
  }
  if (/急单|插单/.test(t)) {
    return {
      text: insertRush.value
        ? `急单 PO-RUSH（180 吨）已插入，占用 ${allowTransfer.value ? 'TC-05' : 'TC-06'}。满足度因此下降约 2.6%，A5 可能后移半天。`
        : '勾选「插入急单」后，我会挤占空窗窑位。通常满足度下降 2–3 个点，需要业务确认能否接受。',
      note: '急单会改写已发布的班次，建议先试算再下发。',
      noteTone: 'warn',
      follow: ['怎样把满足度做到 95%？', '为什么 TC-06 超负荷？'],
    }
  }
  if (/交期|能耗优先|差在/.test(t)) {
    return {
      text: '交期优先：满足度最高，但谷电收益较小。能耗优先：峰谷电套利更明显，个别订单可能延 0.5 天。均衡模式是默认，适合日常排产。你可以在左侧切换目标，数字会马上变。',
      follow: ['今晚谷电怎么排？', '怎样把满足度做到 95%？'],
    }
  }
  if (/PO-002|待重排/.test(t)) {
    return {
      text: allowTransfer.value
        ? 'PO-002 已转到 TC-03，状态变为已排程。'
        : 'PO-002 和 PO-005 抢 TC-06 的同一窗口，所以停在「待重排」。采纳「转窑消峰」即可自动落位。',
      follow: ['为什么 TC-06 超负荷？', '允许转窑后会怎样？'],
    }
  }
  if (/转窑/.test(t)) {
    return {
      text: allowTransfer.value
        ? `转窑已启用。PO-002 → TC-03，TC-06 负荷约 ${p.tc06}%。`
        : '当前未允许转窑。打开开关后我会立刻重算窑位，不必重新导入订单。',
      follow: ['怎样把满足度做到 95%？'],
    }
  }
  return {
    text: `已记录问题「${t}」。你可以改左侧情景后点「启动排程」，或问我负荷、满足度、谷电、急单这几类问题。当前满足度 ${p.fill}%，TC-06 ${p.tc06}%。`,
    follow: chips,
  }
}

async function sendChat(text?: string) {
  const q = (text ?? chatInput.value).trim()
  if (!q || typing.value) return
  chatInput.value = ''
  messages.value.push({ id: `u-${Date.now()}`, role: 'user', text: q })
  await scrollChat()
  typing.value = true
  await sleep(480)
  const ans = answerQuestion(q)
  typing.value = false
  const id = `b-${Date.now()}`
  messages.value.push({ id, role: 'bot', text: '', follow: ans.follow, note: ans.note, noteTone: ans.noteTone })
  const target = ans.text
  const msg = messages.value.find((m) => m.id === id)
  if (!msg) return
  for (let i = 1; i <= target.length; i += 2) {
    msg.text = target.slice(0, i)
    if (i % 8 === 1) await scrollChat()
    await sleep(12)
  }
  msg.text = target
  await scrollChat()
}

async function scrollChat() {
  await nextTick()
  const el = chatBox.value
  if (el) el.scrollTop = el.scrollHeight
}

function onNodeWarningFromLog() {
  showAbnormal.value = true
}

onUnmounted(() => {
  timers.forEach((t) => clearTimeout(t))
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-semibold">
          计划智能体
          <span class="text-sm text-muted-foreground font-normal">· 生产计划排程</span>
        </h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          调情景 → 看推理 → 采纳建议 → 下发工单。订单、窑炉负荷与满足度会跟着参数实时变化。
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <Tag :tone="runPhase === 'running' ? 'molybdenum' : dispatched ? 'patina' : 'default'" class-name="gap-1">
          <Loader2 v-if="runPhase === 'running'" class="size-3 animate-spin" />
          <Sparkles v-else class="size-3" />
          {{ runPhase === 'running' ? '推理中' : dispatched ? '已下发' : dirty ? '参数已变' : '待命' }}
        </Tag>
        <Tag class-name="gap-1">
          <Clock class="size-3" />第 3 次排程 · 2026-09-10
        </Tag>
        <button type="button" :class="btn" :disabled="runPhase === 'running'" @click="resetParams">
          <RotateCcw class="size-3.5 mr-1" />恢复默认
        </button>
        <button type="button" :class="btnPrimary" :disabled="runPhase === 'running'" @click="runAgent">
          <Zap class="size-3.5 mr-1" />
          {{ runPhase === 'running' ? '正在排程…' : '启动排程智能体' }}
        </button>
      </div>
    </div>

    <Panel title="当前排程进度" :subtitle="dirty ? '情景已改，建议重新运行智能体' : '需求接收 → 产能测算 → 排程生成 → 异常校验 → 下发工单'">
      <SimpleWorkflow :nodes="mainNodes" @node-click="onNodeClick" />
    </Panel>

    <div class="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-4">
      <Panel title="情景参数" subtitle="左侧调节，右侧立刻重算">
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between text-[11px] mb-1">
              <span class="text-muted-foreground">排程窗口</span>
              <span class="data-num text-molybdenum">{{ horizon }} 天</span>
            </div>
            <input v-model.number="horizon" type="range" min="7" max="21" step="7" class="w-full" />
            <div class="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>7</span><span>14</span><span>21</span>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between text-[11px] mb-1">
              <span class="text-muted-foreground">负荷系数</span>
              <span class="data-num text-molybdenum">{{ loadFactor.toFixed(2) }}×</span>
            </div>
            <input v-model.number="loadFactor" type="range" min="0.8" max="1.25" step="0.05" class="w-full" />
            <div class="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>保守</span><span>满产</span>
            </div>
          </div>
          <div>
            <div class="text-[11px] text-muted-foreground mb-1.5">优化目标</div>
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="opt in [
                  { id: 'delivery', label: '交期' },
                  { id: 'balance', label: '均衡' },
                  { id: 'energy', label: '能耗' },
                ]"
                :key="opt.id"
                type="button"
                class="h-7 text-[11px] rounded border transition-colors"
                :class="
                  objective === opt.id
                    ? 'bg-iron text-white border-transparent'
                    : 'border-hairline hover:bg-bg-surface/60'
                "
                @click="objective = opt.id as Objective"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input v-model="allowTransfer" type="checkbox" class="accent-[var(--accent-iron)]" />
            允许转窑
          </label>
          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input v-model="allowSplit" type="checkbox" class="accent-[var(--accent-iron)]" />
            允许拆批
          </label>
          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input v-model="valleyPower" type="checkbox" class="accent-[var(--accent-iron)]" />
            谷电协同
          </label>
          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input v-model="insertRush" type="checkbox" class="accent-[var(--accent-iron)]" />
            插入急单
          </label>
          <p class="text-[10px] text-muted-foreground leading-relaxed">
            演示数据为模拟排程。改开关后 KPI、窑炉负荷和建议会马上变；点「启动排程」可回放推理过程。
          </p>
        </div>
      </Panel>

      <div class="space-y-4 min-w-0">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Panel class-name="!p-3">
            <div class="text-[11px] text-muted-foreground">计划订单</div>
            <div class="data-num text-xl font-semibold mt-1">{{ plan.orders }}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">窗口 {{ horizon }} 天</div>
          </Panel>
          <Panel class-name="!p-3">
            <div class="text-[11px] text-muted-foreground">排程满足度</div>
            <div
              class="data-num text-xl font-semibold mt-1"
              :class="plan.fill >= 95 ? 'text-patina' : 'text-sulfur'"
            >
              {{ plan.fill }}%
            </div>
            <div class="text-[10px] text-muted-foreground mt-0.5">目标 ≥ 95%</div>
          </Panel>
          <Panel class-name="!p-3">
            <div class="text-[11px] text-muted-foreground">设备利用率</div>
            <div class="data-num text-xl font-semibold mt-1">{{ plan.util }}%</div>
            <div class="text-[10px] text-patina mt-0.5">置信 {{ plan.confidence }}%</div>
          </Panel>
          <Panel class-name="!p-3">
            <div class="text-[11px] text-muted-foreground">谷电节省</div>
            <div class="data-num text-xl font-semibold mt-1 text-patina">{{ plan.saveWan }}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">万元 / 本周期</div>
          </Panel>
        </div>

        <Panel title="窑炉负荷" subtitle="红 &gt;100% · 黄 ≥92% · 绿正常">
          <div class="space-y-2">
            <div v-for="k in plan.kilns" :key="k.id" class="grid grid-cols-[52px_1fr_48px] gap-2 items-center text-xs">
              <span :class="k.level === 'high' ? 'text-iron' : k.level === 'mid' ? 'text-sulfur' : ''">
                {{ k.id }}
              </span>
              <div class="h-2 rounded bg-muted overflow-hidden">
                <div
                  class="h-full rounded transition-all duration-300"
                  :class="kilnBar(k.level)"
                  :style="{ width: `${Math.min(100, k.load)}%` }"
                />
              </div>
              <span class="data-num text-right">{{ k.load }}%</span>
            </div>
          </div>
        </Panel>

        <Panel title="排程结果" subtitle="随情景实时重算 · 可点建议卡采纳">
          <div class="overflow-x-auto">
            <table class="w-full text-xs min-w-[560px]">
              <thead class="text-muted-foreground border-b border-hairline">
                <tr>
                  <th class="text-left py-2 font-medium">订单号</th>
                  <th class="text-left font-medium">产品</th>
                  <th class="text-left font-medium">数量</th>
                  <th class="text-left font-medium">窑炉</th>
                  <th class="text-left font-medium">交期</th>
                  <th class="text-left font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in plan.rows" :key="row.order" class="border-b border-hairline/50">
                  <td class="py-2 font-mono">{{ row.order }}</td>
                  <td>{{ row.product }}</td>
                  <td>{{ row.qty }}</td>
                  <td>{{ row.kiln }}</td>
                  <td>{{ row.due }}</td>
                  <td>
                    <Tag :tone="statusTone(row.status)">{{ row.status }}</Tag>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="计划参谋 · 本期建议">
          <div
            class="rounded-md border-l-[3px] border-l-molybdenum bg-bg-base/40 px-3 py-2.5 mb-3 text-[12px] leading-relaxed"
          >
            <span class="text-molybdenum font-medium">智能体：</span>
            {{ plan.voice }}
          </div>
          <div class="space-y-2">
            <div
              v-for="s in suggestions"
              :key="s.id"
              class="rounded-md border border-hairline bg-bg-base/40 p-3 flex items-start gap-3"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-medium">{{ s.title }}</span>
                  <Tag :tone="s.tone">{{ s.impact }}</Tag>
                </div>
                <div class="text-[11px] mt-1">{{ s.action }}</div>
                <div class="text-[11px] text-muted-foreground mt-0.5">{{ s.reason }}</div>
              </div>
              <button
                type="button"
                class="shrink-0 h-7 px-2.5 text-[11px] rounded border border-hairline hover:bg-bg-surface/60"
                :disabled="applied.includes(s.id) || (s.id === 'dispatch' && dispatched)"
                @click="applySuggestion(s.id)"
              >
                <span v-if="applied.includes(s.id) || (s.id === 'dispatch' && dispatched)" class="inline-flex items-center gap-1">
                  <Check class="size-3" />已采纳
                </span>
                <span v-else>{{ s.id === 'dispatch' ? '下发工单' : '采纳' }}</span>
              </button>
            </div>
          </div>
          <div class="mt-3 flex justify-end">
            <button type="button" :class="btnPrimary" :disabled="runPhase === 'running'" @click="dispatchOrders">
              下发 MES 工单
            </button>
          </div>
        </Panel>

        <Panel title="AI 推理日志" :subtitle="`${shownLogs.length} / ${allLogSteps.length} 步`">
          <div class="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            <div v-for="step in shownLogs" :key="step.id" class="text-xs">
              <div class="flex items-start gap-2">
                <Sparkles v-if="step.type === 'ai'" class="size-3.5 text-molybdenum mt-0.5 shrink-0" />
                <AlertTriangle
                  v-else-if="step.type === 'branch'"
                  class="size-3.5 text-sulfur mt-0.5 shrink-0"
                />
                <Zap v-else class="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <div class="font-medium">{{ step.title }}</div>
                  <div v-if="step.desc" class="text-[11px] text-muted-foreground">{{ step.desc }}</div>
                </div>
              </div>
              <div v-if="step.children?.length" class="ml-5 mt-1 space-y-0.5 border-l border-hairline pl-3">
                <div v-for="c in step.children" :key="c.id" class="text-[11px] text-muted-foreground">
                  {{ c.title }}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div class="space-y-3">
        <Panel title="问计划智能体" subtitle="情景感知问答" class-name="flex flex-col h-[640px] max-h-[70vh]">
          <div class="flex flex-col h-[540px]">
            <div ref="chatBox" class="flex-1 overflow-y-auto space-y-3 pr-1">
              <div v-for="m in messages" :key="m.id" class="flex gap-2" :class="m.role === 'user' ? 'justify-end' : ''">
                <div
                  v-if="m.role === 'bot'"
                  class="size-7 rounded-md bg-molybdenum/15 text-molybdenum grid place-items-center shrink-0"
                >
                  <Bot class="size-3.5" />
                </div>
                <div
                  class="max-w-[85%] rounded-lg px-2.5 py-2 text-[12px] leading-relaxed"
                  :class="
                    m.role === 'user'
                      ? 'bg-iron text-white rounded-tr-sm'
                      : 'bg-bg-base/70 border border-hairline rounded-tl-sm'
                  "
                >
                  {{ m.text }}
                  <div
                    v-if="m.note"
                    class="mt-2 px-2 py-1.5 rounded text-[11px]"
                    :class="m.noteTone === 'warn' ? 'bg-sulfur/10 text-sulfur' : 'bg-patina/10 text-patina'"
                  >
                    {{ m.note }}
                  </div>
                  <div v-if="m.follow?.length" class="mt-2 flex flex-wrap gap-1">
                    <button
                      v-for="f in m.follow"
                      :key="f"
                      type="button"
                      class="h-6 px-2 rounded-full border border-hairline text-[10px] hover:border-molybdenum/50 hover:text-molybdenum"
                      @click="sendChat(f)"
                    >
                      {{ f }}
                    </button>
                  </div>
                </div>
                <div
                  v-if="m.role === 'user'"
                  class="size-7 rounded-md bg-muted grid place-items-center shrink-0"
                >
                  <User class="size-3.5" />
                </div>
              </div>
              <div v-if="typing" class="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 class="size-3.5 animate-spin" />
                智能体正在检索排程上下文…
              </div>
            </div>
            <div class="flex flex-wrap gap-1 py-2">
              <button
                v-for="c in chips"
                :key="c"
                type="button"
                class="h-6 px-2 rounded-full bg-molybdenum/10 text-molybdenum text-[10px] hover:bg-molybdenum/20"
                @click="sendChat(c)"
              >
                {{ c }}
              </button>
            </div>
            <div class="flex items-end gap-2 border border-hairline rounded-lg px-2 py-1.5">
              <textarea
                v-model="chatInput"
                rows="1"
                class="flex-1 bg-transparent text-xs resize-none outline-none min-h-[28px] pt-1"
                placeholder="问问为什么超负荷、怎么提到 95%…"
                @keydown.enter.exact.prevent="sendChat()"
              />
              <button
                type="button"
                class="size-8 rounded-md bg-iron text-white grid place-items-center disabled:opacity-40"
                :disabled="typing || !chatInput.trim()"
                @click="sendChat()"
              >
                <Send class="size-3.5" />
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="异常提示">
          <div class="space-y-2">
            <button
              v-if="plan.overload"
              type="button"
              class="w-full flex items-start gap-2 p-2 rounded-md bg-sulfur/10 border border-sulfur/30 hover:bg-sulfur/20 transition-colors text-left"
              @click="onNodeWarningFromLog"
            >
              <AlertTriangle class="size-4 text-sulfur mt-0.5 shrink-0" />
              <div>
                <div class="text-xs font-medium text-sulfur">TC-06 设备负荷超标</div>
                <div class="text-[11px] text-muted-foreground">当前 {{ plan.tc06 }}%，点击查看自动重排策略</div>
              </div>
            </button>
            <div v-else class="flex items-start gap-2 p-2 rounded-md bg-patina/10 border border-patina/30">
              <BarChart3 class="size-4 text-patina mt-0.5 shrink-0" />
              <div>
                <div class="text-xs font-medium text-patina">负荷已回到安全区</div>
                <div class="text-[11px] text-muted-foreground">最高窑炉 {{ plan.tc06 }}%，可下发工单</div>
              </div>
            </div>
            <div
              v-if="valleyPower"
              class="flex items-start gap-2 p-2 rounded-md bg-patina/10 border border-patina/30"
            >
              <BarChart3 class="size-4 text-patina mt-0.5 shrink-0" />
              <div>
                <div class="text-xs font-medium text-patina">能耗协同优化</div>
                <div class="text-[11px] text-muted-foreground">谷电偏移预计节省 {{ plan.saveWan }} 万元</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>

    <AbnormalDialog
      v-model:open="showAbnormal"
      title="设备负荷超标 · 智能体自动重排中"
      :description="`TC-06 窑炉排程负荷达到 ${plan.tc06}%，超过安全阈值。智能体已准备好转窑 / 拆批策略：`"
      :steps="abnormalSteps"
    />
  </div>
</template>
