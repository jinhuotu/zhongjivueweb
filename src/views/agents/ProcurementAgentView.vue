<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import {
  AlertTriangle,
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

type PriceScene = 'up' | 'flat' | 'dn'
type LeadScene = 'normal' | 'long'
type RunPhase = 'idle' | 'running' | 'done'
type PrStatus = '建议采购' | '立即锁量' | '可替代' | '延后分批' | '待复核' | '已下单'

type MaterialRow = {
  id: string
  name: string
  unit: string
  gross: number
  avail: number
  need: number
  doh: number
  price: number
  status: PrStatus
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

type SupplierRow = {
  name: string
  material: string
  quote: string
  lead: string
  score: number
  status: '已合格' | '待复核'
}

const BASE = [
  { id: 'bauxite', name: '特级铝矾土', unit: '吨', bom: 1.15, stock: 420, intransit: 80, safe: 180, price: 1850 },
  { id: 'alumina', name: '氧化铝微粉', unit: '吨', bom: 0.22, stock: 96, intransit: 20, safe: 60, price: 4200 },
  { id: 'sic', name: '碳化硅 98%', unit: '吨', bom: 0.08, stock: 28, intransit: 0, safe: 40, price: 6800 },
  { id: 'binder', name: '结合剂', unit: '吨', bom: 0.12, stock: 75, intransit: 15, safe: 40, price: 920 },
  { id: 'fiber', name: '耐火纤维毯', unit: '吨', bom: 0.03, stock: 18, intransit: 6, safe: 12, price: 12500 },
] as const

const cycle = ref(8)
const demand = ref(1.0)
const priceScene = ref<PriceScene>('up')
const leadScene = ref<LeadScene>('long')
const altBom = ref(true)
const hedge = ref(false)
const rushPo = ref(false)

const runPhase = ref<RunPhase>('idle')
const dispatched = ref(false)
const applied = ref<string[]>([])
const showAbnormal = ref(false)
const dirty = ref(false)

const visibleLogCount = ref(6)
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

function fmt(n: number) {
  return Math.round(n).toLocaleString('zh-CN')
}

function yuan(n: number) {
  if (Math.abs(n) >= 10000) return `¥${(n / 10000).toFixed(1)} 万`
  return `¥${Math.round(n).toLocaleString('zh-CN')}`
}

function priceLabel(v: PriceScene) {
  if (v === 'up') return '上涨'
  if (v === 'dn') return '下跌'
  return '震荡'
}

const plan = computed(() => {
  const cyc = cycle.value
  const pd = demand.value
  const appliedSet = new Set(applied.value)
  const useAlt = altBom.value || appliedSet.has('alt')
  const useHedge = hedge.value || appliedSet.has('hedge')
  const rush = rushPo.value || appliedSet.has('rush')

  const prod = Math.round(500 * pd * (cyc / 8) + (rush ? 60 : 0))
  const rows: MaterialRow[] = BASE.map((b) => {
    const gross = Math.round(prod * b.bom * 1.02)
    const avail = b.stock + b.intransit
    const need = gross + b.safe - avail
    const weekly = gross / cyc
    const doh = Math.round(weekly > 0 ? (avail / weekly) * 7 : 999)
    let status: PrStatus = '建议采购'
    if (need <= 0) status = '延后分批'
    else if (b.id === 'sic' && leadScene.value === 'long') status = useAlt ? '可替代' : '立即锁量'
    else if (priceScene.value === 'up' && (b.id === 'bauxite' || b.id === 'alumina')) status = '立即锁量'
    else if (priceScene.value === 'dn') status = '延后分批'
    if (dispatched.value && status !== '延后分批') status = '已下单'
    return { id: b.id, name: b.name, unit: b.unit, gross, avail, need, doh, price: b.price, status }
  })

  const shortCount = rows.filter((r) => r.doh < 14 || r.need > 0 && r.status === '立即锁量').length
  const pendingQualify = leadScene.value === 'long' ? 2 : 1

  let saveAlt = 0
  if (useAlt) {
    const sic = rows.find((r) => r.id === 'sic')
    if (sic && sic.need > 0) saveAlt += Math.min(sic.need, 40) * 860
    const alu = rows.find((r) => r.id === 'alumina')
    if (alu && alu.need > 0) saveAlt += Math.min(alu.need, 30) * 180
  }

  let spend = 0
  rows.forEach((r) => {
    if (r.need > 0) spend += r.need * r.price
  })
  if (useHedge && priceScene.value === 'up') spend *= 1.02

  const sku = 12 + (cyc >= 8 ? 2 : 0) + (rush ? 1 : 0)
  let success = 96.4 - (leadScene.value === 'long' ? 3.2 : 0) + (useAlt ? 1.6 : 0)
  success = +clamp(success, 88, 99.2).toFixed(1)
  const confidence = pendingQualify >= 2 && !useAlt ? 64 : shortCount >= 2 ? 78 : 88

  const coverage = rows.map((r) => ({
    ...r,
    level: r.doh < 14 ? ('high' as const) : r.doh < 28 ? ('mid' as const) : ('ok' as const),
  }))

  const suppliers: SupplierRow[] = [
    {
      name: '山西晋铝',
      material: '特级铝矾土',
      quote: '¥1,820 / 吨',
      lead: '12 天',
      score: 92,
      status: '已合格',
    },
    {
      name: '河南中耐',
      material: '特级铝矾土',
      quote: '¥1,760 / 吨',
      lead: '18 天',
      score: 81,
      status: pendingQualify >= 2 ? '待复核' : '已合格',
    },
    {
      name: '宁夏东方',
      material: '碳化硅 98%',
      quote: useAlt ? '¥5,940 / 吨' : '¥6,800 / 吨',
      lead: leadScene.value === 'long' ? '34 天' : '16 天',
      score: useAlt ? 89 : 84,
      status: '已合格',
    },
    {
      name: '青岛海运',
      material: '氧化铝微粉',
      quote: '¥4,150 / 吨',
      lead: '21 天',
      score: 76,
      status: '待复核',
    },
  ]

  const voice: string[] = [
    `本周期 ${cyc} 周、排产强度 ${pd.toFixed(2)}×，对应成品约 ${fmt(prod)} 吨，共 ${sku} 类物料。`,
  ]
  const sic = rows.find((r) => r.id === 'sic')
  if (sic && sic.need > 0) {
    voice.push(
      `碳化硅净缺口 ${fmt(sic.need)} 吨、覆盖仅 ${sic.doh} 天${leadScene.value === 'long' ? '，进口交期拉长' : ''}。${useAlt ? '已匹配宁夏国产替代，预计可节省 ' + yuan(saveAlt) + '。' : '建议打开「替代料」，切到已认证国产料。'}`,
    )
  }
  if (priceScene.value === 'up') {
    voice.push(
      `氧化铝 / 铝矾土行情看涨，建议本周锁量${useHedge ? '并启动锁价条款' : ''}。`,
    )
  } else if (priceScene.value === 'dn') {
    voice.push('行情偏弱，大宗料可延后分批，控制资金占用。')
  }
  if (pendingQualify >= 2) {
    voice.push(`有 ${pendingQualify} 家供应商资质待复核，合同节点暂不可下发。`)
  }
  if (rush) voice.push('急采已插入，优先保障碳化硅与铝矾土到货窗口。')

  return {
    prod,
    sku,
    rows,
    coverage,
    suppliers,
    shortCount,
    pendingQualify,
    saveAlt,
    spend,
    success,
    confidence,
    voice: voice.join(''),
  }
})

const suggestions = computed<Suggestion[]>(() => {
  const s: Suggestion[] = []
  const p = plan.value
  const sic = p.rows.find((r) => r.id === 'sic')
  if (sic && sic.need > 0 && leadScene.value === 'long' && !altBom.value) {
    s.push({
      id: 'alt',
      title: '国产替代 · 碳化硅 98%',
      action: '进口绿碳 → 宁夏东方已认证料',
      reason: `净缺口 ${fmt(sic.need)} 吨，进口交期 34 天。切换后交期缩至 16 天，单吨省 ¥860。`,
      impact: `节省 ${yuan(Math.min(sic.need, 40) * 860)}`,
      tone: 'patina',
    })
  }
  if (priceScene.value === 'up') {
    s.push({
      id: 'hedge',
      title: '锁价条款 · 铝矾土 / 氧化铝',
      action: '本周签订 4 周锁价，覆盖净需求',
      reason: '氧化铝看涨。锁价可对冲后续涨幅，资金占用略增约 2%。',
      impact: '提前锁量',
      tone: 'sulfur',
    })
  }
  if (p.pendingQualify >= 2) {
    s.push({
      id: 'qualify',
      title: '资质复核 · 河南中耐 / 青岛海运',
      action: '触发备选询价 + 工商 / 体系核验',
      reason: '2 家报价更低但资质过期或待审。智能体已准备好备选供应商询价。',
      impact: '2 家待复核',
      tone: 'iron',
    })
  }
  if (rushPo.value) {
    s.push({
      id: 'rush',
      title: '急采插单 · 碳化硅 + 铝矾土',
      action: '走已合格供应商加急批次',
      reason: '与计划智能体急单联动，优先保障 9/13 窑位用料。',
      impact: '交期优先',
      tone: 'molybdenum',
    })
  }
  if (s.length === 0) {
    s.push({
      id: 'dispatch',
      title: '建议已稳态 · 可生成合同',
      action: '询比价完成，推送审批流',
      reason: `成功率 ${p.success}% · 预计节省 ${yuan(p.saveAlt)} · 置信度 ${p.confidence}%。`,
      impact: '可下单',
      tone: 'patina',
    })
  }
  return s
})

const mainNodes = computed<WorkflowNode[]>(() => {
  const pending = plan.value.pendingQualify >= 2
  if (runPhase.value === 'idle' && !dirty.value) {
    return [
      { id: 'n1', label: '需求汇总', status: 'done' },
      { id: 'n2', label: '询比价', status: 'done' },
      { id: 'n3', label: '供应商筛选', status: pending ? 'warning' : 'current' },
      { id: 'n4', label: '合同生成', status: 'pending' },
      { id: 'n5', label: '入库对账', status: 'pending' },
    ]
  }
  if (runPhase.value === 'running') {
    const step = visibleLogCount.value
    return [
      { id: 'n1', label: '需求汇总', status: step >= 1 ? 'done' : 'current' },
      { id: 'n2', label: '询比价', status: step >= 2 ? 'done' : step === 1 ? 'current' : 'pending' },
      {
        id: 'n3',
        label: '供应商筛选',
        status: step >= 4 ? (pending ? 'warning' : 'done') : step >= 3 ? 'current' : 'pending',
      },
      { id: 'n4', label: '合同生成', status: step >= 5 ? 'current' : 'pending' },
      { id: 'n5', label: '入库对账', status: 'pending' },
    ]
  }
  return [
    { id: 'n1', label: '需求汇总', status: 'done' },
    { id: 'n2', label: '询比价', status: 'done' },
    { id: 'n3', label: '供应商筛选', status: pending ? 'warning' : 'done' },
    { id: 'n4', label: '合同生成', status: dispatched.value ? 'done' : pending ? 'pending' : 'current' },
    { id: 'n5', label: '入库对账', status: dispatched.value ? 'current' : 'pending' },
  ]
})

const allLogSteps = computed<WorkflowStep[]>(() => {
  const p = plan.value
  return [
    {
      id: 'l1',
      title: '合并计划 / 仓储 / 维修三路需求',
      type: 'static',
      desc: `${p.sku} 类物料，对应成品 ${fmt(p.prod)} 吨`,
    },
    {
      id: 'l2',
      title: '自动生成询价单并推送',
      type: 'ai',
      desc: `推送到 ${p.suppliers.length} 家合格及备选供应商`,
    },
    {
      id: 'l3',
      title: '多维度比价分析',
      type: 'ai',
      desc: `价格 / 交期 / 账期 / 运费 · 氧化铝行情「${priceLabel(priceScene.value)}」`,
    },
    {
      id: 'l4',
      title: p.pendingQualify >= 2 ? '供应商资质校验 · 发现待复核' : '供应商资质校验通过',
      type: p.pendingQualify >= 2 ? 'branch' : 'static',
      desc: p.pendingQualify >= 2 ? `${p.pendingQualify} 家资质待审` : '4 家均在合格名录',
      children:
        p.pendingQualify >= 2
          ? [
              { id: 'l4-1', title: '触发备选供应商询价', type: 'branch' },
              { id: 'l4-2', title: '调用工商 / 体系 API 核验', type: 'static' },
              { id: 'l4-3', title: 'AI 风险评估打分', type: 'ai' },
            ]
          : undefined,
    },
    {
      id: 'l5',
      title: altBom.value ? '替代料方案已写入建议' : '按主料生成采购建议',
      type: altBom.value ? 'ai' : 'static',
      desc: altBom.value ? `预计节省 ${yuan(p.saveAlt)}` : '未启用替代 BOM',
    },
    {
      id: 'l6',
      title: dispatched.value ? '合同草案已推送审批' : '等待确认后生成合同',
      type: 'static',
      desc: dispatched.value ? `金额 ${yuan(p.spend)}` : '待审批',
    },
  ]
})

const shownLogs = computed(() => allLogSteps.value.slice(0, visibleLogCount.value))

const abnormalSteps: WorkflowStep[] = [
  { id: 'a1', title: '识别异常：河南中耐资质过期、青岛海运体系证书待审', type: 'static' },
  { id: 'a2', title: '从合格名录拉取备选供应商', type: 'ai' },
  { id: 'a3', title: '策略 A：山西晋铝承接铝矾土缺口', type: 'branch' },
  { id: 'a4', title: '策略 B：宁夏东方国产碳化硅替代进口', type: 'branch' },
  { id: 'a5', title: '重新比价并评估交期 / 质量风险', type: 'ai' },
  { id: 'a6', title: '生成可下单短名单，待人工确认', type: 'static' },
]

const chips = [
  '哪个料会先断？',
  '替代能省多少？',
  '为什么供应商待复核？',
  '氧化铝涨价怎么买？',
]

const messages = ref<ChatMsg[]>([
  {
    id: 'm0',
    role: 'bot',
    text: '我是采购智能体，和计划排程联动。改左侧情景看净需求与覆盖天数；也可以问我会断哪种料、要不要替代、谁的资质有问题。',
    follow: chips,
  },
])

watch(
  [cycle, demand, priceScene, leadScene, altBom, hedge, rushPo],
  () => {
    if (runPhase.value === 'done') dirty.value = true
    dispatched.value = false
  },
)

function dohBar(level: 'ok' | 'mid' | 'high') {
  if (level === 'high') return 'bg-iron'
  if (level === 'mid') return 'bg-sulfur'
  return 'bg-patina'
}

function statusTone(status: PrStatus) {
  if (status === '立即锁量' || status === '待复核') return 'sulfur' as const
  if (status === '可替代' || status === '已下单') return 'patina' as const
  if (status === '延后分批') return 'molybdenum' as const
  return 'default' as const
}

function applySuggestion(id: string) {
  if (id === 'alt') altBom.value = true
  if (id === 'hedge') hedge.value = true
  if (id === 'rush') rushPo.value = true
  if (id === 'qualify') {
    showAbnormal.value = true
    leadScene.value = 'normal'
  }
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
  if (plan.value.pendingQualify >= 2) {
    showAbnormal.value = true
    return
  }
  if (runPhase.value !== 'done') await runAgent()
  dispatched.value = true
  visibleLogCount.value = allLogSteps.value.length
}

function resetParams() {
  cycle.value = 8
  demand.value = 1.0
  priceScene.value = 'up'
  leadScene.value = 'long'
  altBom.value = true
  hedge.value = false
  rushPo.value = false
  applied.value = []
  dispatched.value = false
  dirty.value = false
  runPhase.value = 'idle'
  visibleLogCount.value = 6
}

function onNodeClick(node: WorkflowNode) {
  if (node.status === 'warning') showAbnormal.value = true
}

function answerQuestion(q: string): Omit<ChatMsg, 'id' | 'role'> {
  const p = plan.value
  const t = q.trim()
  const sic = p.rows.find((r) => r.id === 'sic')
  if (/断|缺料|覆盖|哪个料/.test(t)) {
    const worst = [...p.coverage].sort((a, b) => a.doh - b.doh)[0]
    return {
      text: `覆盖天数最短的是 ${worst?.name}，仅 ${worst?.doh} 天（红线 14 天）。${sic && sic.need > 0 ? `碳化硅净缺口 ${fmt(sic.need)} 吨，是本轮最紧的料。` : ''}可打开替代料或缩短交期情景后再看。`,
      note: p.shortCount ? `${p.shortCount} 项低于安全覆盖` : '覆盖整体健康',
      noteTone: p.shortCount ? 'warn' : 'ok',
      follow: ['替代能省多少？', '氧化铝涨价怎么买？'],
    }
  }
  if (/替代|省多少|国产/.test(t)) {
    return {
      text: altBom.value
        ? `替代已启用。碳化硅走宁夏东方已认证料、氧化铝可部分国产化，本周期预计节省 ${yuan(p.saveAlt)}。`
        : '当前未启用替代料。打开开关后，碳化硅可切国产已认证料，单吨约省 ¥860，交期从 34 天降到 16 天。',
      note: `置信度 ${p.confidence}%`,
      noteTone: 'ok',
      follow: ['哪个料会先断？', '为什么供应商待复核？'],
    }
  }
  if (/复核|资质|供应商/.test(t)) {
    return {
      text: `河南中耐（铝矾土报价更低）与青岛海运（氧化铝）共 ${p.pendingQualify} 家待复核。低价不能直接下单。点建议卡「资质复核」会走备选询价，并把交期情景切回正常。`,
      note: p.pendingQualify >= 2 ? '合同节点被拦住，需先处理资质。' : '合格名录可用。',
      noteTone: p.pendingQualify >= 2 ? 'warn' : 'ok',
      follow: ['替代能省多少？', '氧化铝涨价怎么买？'],
    }
  }
  if (/涨价|氧化铝|锁价|行情/.test(t)) {
    return {
      text:
        priceScene.value === 'up'
          ? `氧化铝 / 铝矾土看涨。建议本周按净需求锁量${hedge.value ? '，锁价条款已打开。' : '，再勾选「锁价 / 套保」写入合同。'}`
          : priceScene.value === 'dn'
            ? '行情偏弱，大宗料建议延后分批，少占资金。'
            : '震荡市按周补货即可，不必提前锁量。',
      follow: ['哪个料会先断？', '和计划排程怎么联动？'],
    }
  }
  if (/计划|排程|联动/.test(t)) {
    return {
      text: `排产强度 ${demand.value.toFixed(2)}× 对应计划智能体的成品产量（约 ${fmt(p.prod)} 吨）。计划侧插急单时，把「插入急采」打开，我会优先保障碳化硅和铝矾土到货窗口。`,
      follow: ['哪个料会先断？', '插入急采会怎样？'],
    }
  }
  if (/急采|急单/.test(t)) {
    return {
      text: rushPo.value
        ? '急采已插入，加急批次走已合格供应商，优先对齐 9/13 窑位。'
        : '勾选「插入急采」后，我会按计划急单倒推物料窗口，通常会抬高碳化硅与铝矾土的净需求。',
      note: '急采会挤占账期和运力，建议先试算。',
      noteTone: 'warn',
      follow: ['哪个料会先断？', '和计划排程怎么联动？'],
    }
  }
  return {
    text: `已记下「${t}」。当前 ${p.sku} 类物料、资金占用 ${yuan(p.spend)}、预计节省 ${yuan(p.saveAlt)}。可以问断料、替代、资质或行情。`,
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
  messages.value.push({
    id,
    role: 'bot',
    text: '',
    follow: ans.follow,
    note: ans.note,
    noteTone: ans.noteTone,
  })
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

onUnmounted(() => {
  timers.forEach((t) => clearTimeout(t))
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-semibold">
          采购智能体
          <span class="text-sm text-muted-foreground font-normal">· 智能寻源与锁价</span>
        </h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          对接计划排程：调情景看净需求 / 覆盖天数 / 替代节省，确认后生成合同并推送审批。
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <Tag :tone="runPhase === 'running' ? 'molybdenum' : dispatched ? 'patina' : 'default'" class-name="gap-1">
          <Loader2 v-if="runPhase === 'running'" class="size-3 animate-spin" />
          <Sparkles v-else class="size-3" />
          {{ runPhase === 'running' ? '寻源中' : dispatched ? '已下单' : dirty ? '参数已变' : '待命' }}
        </Tag>
        <Tag class-name="gap-1">
          <Clock class="size-3" />第 2 次寻源 · 2026-09-10
        </Tag>
        <button type="button" :class="btn" :disabled="runPhase === 'running'" @click="resetParams">
          <RotateCcw class="size-3.5 mr-1" />恢复默认
        </button>
        <button type="button" :class="btnPrimary" :disabled="runPhase === 'running'" @click="runAgent">
          <Zap class="size-3.5 mr-1" />
          {{ runPhase === 'running' ? '正在寻源…' : '启动采购智能体' }}
        </button>
      </div>
    </div>

    <Panel
      title="当前寻源进度"
      :subtitle="dirty ? '情景已改，建议重新运行智能体' : '需求汇总 → 询比价 → 供应商筛选 → 合同生成 → 入库对账'"
    >
      <SimpleWorkflow :nodes="mainNodes" @node-click="onNodeClick" />
    </Panel>

    <div class="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-4">
      <Panel title="情景参数" subtitle="与计划智能体同一套操作">
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between text-[11px] mb-1">
              <span class="text-muted-foreground">预测周期</span>
              <span class="data-num text-molybdenum">{{ cycle }} 周</span>
            </div>
            <input v-model.number="cycle" type="range" min="4" max="12" step="4" class="w-full" />
            <div class="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>4</span><span>8</span><span>12</span>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between text-[11px] mb-1">
              <span class="text-muted-foreground">排产强度</span>
              <span class="data-num text-molybdenum">{{ demand.toFixed(2) }}×</span>
            </div>
            <input v-model.number="demand" type="range" min="0.7" max="1.3" step="0.05" class="w-full" />
            <div class="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>保守</span><span>满产</span>
            </div>
          </div>
          <div>
            <div class="text-[11px] text-muted-foreground mb-1.5">氧化铝 / 铝矾土行情</div>
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="opt in [
                  { id: 'up', label: '上涨' },
                  { id: 'flat', label: '震荡' },
                  { id: 'dn', label: '下跌' },
                ]"
                :key="opt.id"
                type="button"
                class="h-7 text-[11px] rounded border transition-colors"
                :class="
                  priceScene === opt.id
                    ? 'bg-iron text-white border-transparent'
                    : 'border-hairline hover:bg-bg-surface/60'
                "
                @click="priceScene = opt.id as PriceScene"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div>
            <div class="text-[11px] text-muted-foreground mb-1.5">碳化硅交期</div>
            <div class="grid grid-cols-2 gap-1">
              <button
                type="button"
                class="h-7 text-[11px] rounded border transition-colors"
                :class="
                  leadScene === 'normal'
                    ? 'bg-iron text-white border-transparent'
                    : 'border-hairline hover:bg-bg-surface/60'
                "
                @click="leadScene = 'normal'"
              >
                16 天
              </button>
              <button
                type="button"
                class="h-7 text-[11px] rounded border transition-colors"
                :class="
                  leadScene === 'long'
                    ? 'bg-iron text-white border-transparent'
                    : 'border-hairline hover:bg-bg-surface/60'
                "
                @click="leadScene = 'long'"
              >
                延长 34 天
              </button>
            </div>
          </div>
          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input v-model="altBom" type="checkbox" class="accent-[var(--accent-iron)]" />
            启用替代料
          </label>
          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input v-model="hedge" type="checkbox" class="accent-[var(--accent-iron)]" />
            锁价 / 套保
          </label>
          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input v-model="rushPo" type="checkbox" class="accent-[var(--accent-iron)]" />
            插入急采（联动计划）
          </label>
          <p class="text-[10px] text-muted-foreground leading-relaxed">
            排产强度对应计划智能体成品产量。改开关后覆盖天数和建议会马上变；点「启动」可回放询比价推理。
          </p>
        </div>
      </Panel>

      <div class="space-y-4 min-w-0">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Panel class-name="!p-3">
            <div class="text-[11px] text-muted-foreground">物料种类</div>
            <div class="data-num text-xl font-semibold mt-1">{{ plan.sku }}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">成品 {{ fmt(plan.prod) }} 吨</div>
          </Panel>
          <Panel class-name="!p-3">
            <div class="text-[11px] text-muted-foreground">资金占用</div>
            <div class="data-num text-xl font-semibold mt-1">{{ yuan(plan.spend) }}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">按净需求估算</div>
          </Panel>
          <Panel class-name="!p-3">
            <div class="text-[11px] text-muted-foreground">替代节省</div>
            <div class="data-num text-xl font-semibold mt-1 text-patina">{{ yuan(plan.saveAlt) }}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">置信 {{ plan.confidence }}%</div>
          </Panel>
          <Panel class-name="!p-3">
            <div class="text-[11px] text-muted-foreground">缺料风险</div>
            <div
              class="data-num text-xl font-semibold mt-1"
              :class="plan.shortCount ? 'text-iron' : 'text-patina'"
            >
              {{ plan.shortCount }}
            </div>
            <div class="text-[10px] text-muted-foreground mt-0.5">覆盖 &lt; 14 天</div>
          </Panel>
        </div>

        <Panel title="库存覆盖天数" subtitle="红 &lt;14 天 · 黄 &lt;28 天 · 绿 ≥28 天">
          <div class="space-y-2">
            <div
              v-for="k in plan.coverage"
              :key="k.id"
              class="grid grid-cols-[108px_1fr_52px] gap-2 items-center text-xs"
            >
              <span :class="k.level === 'high' ? 'text-iron' : k.level === 'mid' ? 'text-sulfur' : ''">
                {{ k.name }}
              </span>
              <div class="h-2 rounded bg-muted overflow-hidden">
                <div
                  class="h-full rounded transition-all duration-300"
                  :class="dohBar(k.level)"
                  :style="{ width: `${Math.min(100, (k.doh / 70) * 100)}%` }"
                />
              </div>
              <span class="data-num text-right">{{ k.doh }} 天</span>
            </div>
          </div>
        </Panel>

        <Panel title="净需求与采购建议" subtitle="随排产强度 / 行情实时重算">
          <div class="overflow-x-auto">
            <table class="w-full text-xs min-w-[640px]">
              <thead class="text-muted-foreground border-b border-hairline">
                <tr>
                  <th class="text-left py-2 font-medium">物料</th>
                  <th class="text-left font-medium">排产需求</th>
                  <th class="text-left font-medium">现存+在途</th>
                  <th class="text-left font-medium">净需求</th>
                  <th class="text-left font-medium">覆盖</th>
                  <th class="text-left font-medium">建议</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in plan.rows" :key="row.id" class="border-b border-hairline/50">
                  <td class="py-2">{{ row.name }}</td>
                  <td class="font-mono">{{ fmt(row.gross) }} {{ row.unit }}</td>
                  <td class="font-mono">{{ fmt(row.avail) }} {{ row.unit }}</td>
                  <td
                    class="font-mono"
                    :class="row.need > 0 ? 'text-iron' : 'text-patina'"
                  >
                    {{ fmt(row.need) }} {{ row.unit }}
                  </td>
                  <td class="font-mono">{{ row.doh }} 天</td>
                  <td>
                    <Tag :tone="statusTone(row.status)">{{ row.status }}</Tag>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="供应商短名单" subtitle="点击预警节点可看自动复核流程">
          <div class="overflow-x-auto">
            <table class="w-full text-xs min-w-[560px]">
              <thead class="text-muted-foreground border-b border-hairline">
                <tr>
                  <th class="text-left py-2 font-medium">供应商</th>
                  <th class="text-left font-medium">物料</th>
                  <th class="text-left font-medium">报价</th>
                  <th class="text-left font-medium">交期</th>
                  <th class="text-left font-medium">综合分</th>
                  <th class="text-left font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in plan.suppliers" :key="s.name" class="border-b border-hairline/50">
                  <td class="py-2">{{ s.name }}</td>
                  <td>{{ s.material }}</td>
                  <td class="font-mono">{{ s.quote }}</td>
                  <td>{{ s.lead }}</td>
                  <td class="font-mono">{{ s.score }}</td>
                  <td>
                    <Tag :tone="s.status === '待复核' ? 'sulfur' : 'patina'">{{ s.status }}</Tag>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="采购参谋 · 本期建议">
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
                <span
                  v-if="applied.includes(s.id) || (s.id === 'dispatch' && dispatched)"
                  class="inline-flex items-center gap-1"
                >
                  <Check class="size-3" />已采纳
                </span>
                <span v-else>{{ s.id === 'dispatch' ? '生成合同' : s.id === 'qualify' ? '去复核' : '采纳' }}</span>
              </button>
            </div>
          </div>
          <div class="mt-3 flex justify-end">
            <button type="button" :class="btnPrimary" :disabled="runPhase === 'running'" @click="dispatchOrders">
              推送审批 / 生成合同
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
        <Panel title="问采购智能体" subtitle="情景感知问答" class-name="flex flex-col">
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
                智能体正在检索库存与行情…
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
                placeholder="问问哪个料会断、替代能省多少…"
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
              v-if="plan.pendingQualify >= 2"
              type="button"
              class="w-full flex items-start gap-2 p-2 rounded-md bg-sulfur/10 border border-sulfur/30 hover:bg-sulfur/20 transition-colors text-left"
              @click="showAbnormal = true"
            >
              <AlertTriangle class="size-4 text-sulfur mt-0.5 shrink-0" />
              <div>
                <div class="text-xs font-medium text-sulfur">供应商资质待复核</div>
                <div class="text-[11px] text-muted-foreground">
                  {{ plan.pendingQualify }} 家低价供应商未过审，点击查看自动处理
                </div>
              </div>
            </button>
            <div
              v-if="plan.shortCount"
              class="flex items-start gap-2 p-2 rounded-md bg-iron/10 border border-iron/30"
            >
              <AlertTriangle class="size-4 text-iron mt-0.5 shrink-0" />
              <div>
                <div class="text-xs font-medium text-iron">覆盖天数告警</div>
                <div class="text-[11px] text-muted-foreground">
                  {{ plan.shortCount }} 项物料低于 14 天，优先锁碳化硅 / 铝矾土
                </div>
              </div>
            </div>
            <div
              v-if="altBom && plan.saveAlt > 0"
              class="flex items-start gap-2 p-2 rounded-md bg-patina/10 border border-patina/30"
            >
              <Sparkles class="size-4 text-patina mt-0.5 shrink-0" />
              <div>
                <div class="text-xs font-medium text-patina">替代降本已计入</div>
                <div class="text-[11px] text-muted-foreground">本周期预计节省 {{ yuan(plan.saveAlt) }}</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>

    <AbnormalDialog
      v-model:open="showAbnormal"
      title="供应商资质异常 · 智能体自动复核中"
      description="检测到低价供应商资质过期或待审。智能体已启动备选询价与核验，详情如下："
      :steps="abnormalSteps"
    />
  </div>
</template>
