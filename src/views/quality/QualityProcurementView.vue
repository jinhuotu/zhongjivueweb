<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-vue-next'
import { Panel, Tag } from '@/components/ui-kit'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import {
  hexAlpha,
  tooltipBase,
  useChartPalette,
} from '@/components/ui-kit/charts/theme'
import { useThemeStore } from '@/stores/theme'

ensureEcharts()

const theme = useThemeStore()
const palette = useChartPalette()

function cssColor(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

const accents = computed(() => {
  void theme.mode
  return {
    molybdenum: cssColor('--accent-molybdenum', '#3b82f6'),
    patina: cssColor('--accent-patina', '#059669'),
    iron: cssColor('--accent-iron', '#2563eb'),
    sulfur: cssColor('--accent-sulfur', '#38bdf8'),
    coolant: cssColor('--accent-coolant', '#0ea5e9'),
  }
})

const kpis = [
  {
    label: '采购成本节约',
    value: '1.6',
    prefix: '¥',
    suffix: 'M',
    hint: '近 12 个月累计',
    trend: '+2.8%',
    up: true,
    tone: 'molybdenum' as const,
  },
  {
    label: '预测准确率',
    value: '91.4',
    suffix: '%',
    hint: '价格预测 MAPE 8.6%',
    trend: '+3.2%',
    up: true,
    tone: 'coolant' as const,
  },
  {
    label: '缺料预警提前',
    value: '21',
    suffix: '天',
    hint: '平均提前期',
    trend: '',
    up: true,
    tone: 'iron' as const,
  },
  {
    label: '替代元器件覆盖',
    value: '82',
    suffix: '%',
    hint: '68 / 83 种元器件',
    trend: '+18%',
    up: true,
    tone: 'sulfur' as const,
  },
  {
    label: '库存周转率',
    value: '9.4',
    suffix: 'x',
    hint: '目标 > 8x',
    trend: '+2.1',
    up: true,
    tone: 'patina' as const,
  },
  {
    label: '停线风险事件',
    value: '1',
    suffix: '次',
    hint: '去年同期 7 次',
    trend: '-86%',
    up: false,
    tone: 'iron' as const,
  },
]

const toneText: Record<string, string> = {
  iron: 'text-iron',
  molybdenum: 'text-molybdenum',
  patina: 'text-patina',
  sulfur: 'text-sulfur',
  coolant: 'text-coolant',
}

const toneBar: Record<string, string> = {
  iron: 'bg-iron',
  molybdenum: 'bg-molybdenum',
  patina: 'bg-patina',
  sulfur: 'bg-sulfur',
  coolant: 'bg-coolant',
}

type ArchLayer = {
  title: string
  desc: string
  meta: string
  width: string
}

const priceArch: ArchLayer[] = [
  { title: '输入层 · 元器件价格时序', desc: '历史报价、交期、汇率', meta: '96 dims', width: '46%' },
  { title: 'LSTM ① · 价格序列编码', desc: '长短期价格波动特征', meta: '192 units', width: '78%' },
  { title: 'LSTM ② · 替代元器件关联', desc: '原厂 / 替代料价差耦合', meta: '128 units', width: '62%' },
  { title: '注意力层 · 供应链事件权重', desc: '缺料、产能、地缘扰动', meta: '动态窗口', width: '38%' },
  { title: '输出层 · 未来 N 期价格', desc: '滚动预测区间', meta: 't+1 ~ t+45', width: '52%' },
]

const demandArch: ArchLayer[] = [
  { title: '输入层 · 订单 + BOM + 替代记录', desc: '用量、切换、生命周期', meta: '84 dims', width: '42%' },
  { title: 'LSTM ① · 需求模式编码', desc: '季节性与订单节奏', meta: '192 units', width: '78%' },
  { title: 'LSTM ② · 替代转移建模', desc: '原厂需求向替代分流', meta: '96 units', width: '48%' },
  { title: '注意力层 · 产品周期权重', desc: '导入 / 量产 / 尾声', meta: '季节性 + 趋势', width: '44%' },
  { title: '输出层 · 未来 N 期需求量', desc: '原厂 + 替代分流', meta: 't+1 ~ t+45', width: '56%' },
]

type AltOption = { kind: string; name: string; vendor: string }

type BomCard = {
  id: string
  category: string
  part: string
  monthly: string
  tone: 'patina' | 'iron' | 'sulfur' | 'molybdenum' | 'coolant'
  alts: AltOption[]
  condition: string
}

const bomCards: BomCard[] = [
  {
    id: 'mcu',
    category: 'MCU 主控芯片',
    part: 'STM32F103',
    monthly: '月需 2,400 片',
    tone: 'patina',
    alts: [
      { kind: '国产替代', name: 'GD32F103', vendor: '兆易创新' },
      { kind: '品牌替代', name: 'NUC123', vendor: 'Nuvoton' },
    ],
    condition: '切换条件：Pin to Pin 兼容，固件适配 3 天',
  },
  {
    id: 'mosfet',
    category: '功率 MOSFET',
    part: 'IRFP460',
    monthly: '月需 1,800 只',
    tone: 'iron',
    alts: [
      { kind: '国产替代', name: 'SLP40N50C', vendor: '华润微' },
      { kind: '规格替代', name: 'STP40NF50', vendor: 'ST（引脚兼容）' },
    ],
    condition: '切换条件：Vds / Id 参数匹配，散热重新评估',
  },
  {
    id: 'cap',
    category: '电解电容',
    part: '470μF / 63V',
    monthly: '月需 12,000 只',
    tone: 'sulfur',
    alts: [
      { kind: '品牌替代', name: 'Nichicon UVR 系列', vendor: '进口品牌' },
      { kind: '国产替代', name: '艾华集团', vendor: '同规格' },
    ],
    condition: '切换条件：容量 ±20%，寿命等效验证',
  },
  {
    id: 'igbt',
    category: 'IGBT 模块',
    part: 'FF600R12KE4',
    monthly: '月需 320 只',
    tone: 'iron',
    alts: [{ kind: '国产替代', name: 'CM600DZ-12H', vendor: '中车时代' }],
    condition: '切换条件：封装兼容，驱动参数调整，可靠性测试 2 周',
  },
  {
    id: 'sensor',
    category: '电流传感器',
    part: 'LA 55-P',
    monthly: '月需 960 只',
    tone: 'coolant',
    alts: [
      { kind: '国产替代', name: '莱姆电子同系列', vendor: 'LEM 体系' },
      { kind: '技术替代', name: 'ACS712', vendor: '霍尔集成电路' },
    ],
    condition: '切换条件：精度 ±1%，PCB 布局调整',
  },
]

const selectedBom = ref('mcu')

const priceMonths = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月']

const priceSeries: Record<string, { original: number[]; alt: number[]; originalName: string; altName: string }> = {
  mcu: {
    originalName: 'STM32F103（原厂）',
    altName: 'GD32F103（国产替代）',
    original: [22.1, 22.4, 23.0, 24.2, 25.6, 24.8, 25.2, 27.4, 29.8, 32.6, 34.8, 36.5, 37.8],
    alt: [20.0, 19.6, 20.8, 21.6, 22.8, 22.2, 23.1, 23.8, 24.4, 24.9, 25.3, 25.7, 26.1],
  },
  mosfet: {
    originalName: 'IRFP460（原厂）',
    altName: 'SLP40N50C（华润微）',
    original: [8.2, 8.3, 8.5, 8.7, 8.9, 9.0, 9.1, 9.4, 9.7, 10.1, 10.4, 10.6, 10.8],
    alt: [6.8, 6.7, 6.9, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.6, 7.7, 7.8],
  },
  cap: {
    originalName: 'Nichicon 470μF（进口）',
    altName: '艾华 470μF（国产）',
    original: [1.85, 1.86, 1.88, 1.9, 1.92, 1.9, 1.88, 1.86, 1.84, 1.82, 1.8, 1.79, 1.78],
    alt: [1.42, 1.43, 1.45, 1.46, 1.48, 1.49, 1.5, 1.51, 1.52, 1.52, 1.53, 1.53, 1.54],
  },
  igbt: {
    originalName: 'FF600R12KE4（英飞凌）',
    altName: 'CM600DZ-12H（中车）',
    original: [980, 995, 1010, 1040, 1080, 1120, 1180, 1260, 1340, 1420, 1480, 1520, 1560],
    alt: [720, 725, 730, 738, 745, 752, 760, 768, 775, 782, 788, 792, 796],
  },
  sensor: {
    originalName: 'LA 55-P（原厂）',
    altName: 'ACS712（技术替代）',
    original: [42, 42.4, 43.1, 43.8, 44.6, 45.0, 45.8, 47.2, 48.6, 50.1, 51.2, 52.0, 52.8],
    alt: [18.2, 18.1, 18.0, 17.9, 17.8, 17.8, 17.7, 17.6, 17.6, 17.5, 17.5, 17.4, 17.4],
  },
}

const activePrice = computed(() => priceSeries[selectedBom.value] ?? priceSeries.mcu)

const priceGap = computed(() => {
  const s = activePrice.value
  const i = 9
  return +(s.original[i] - s.alt[i]).toFixed(1)
})

const priceOption = computed<EChartsOption>(() => {
  const p = palette.value
  const a = accents.value
  const s = activePrice.value
  return {
    animation: false,
    grid: { left: 44, right: 16, top: 36, bottom: 28 },
    tooltip: {
      ...tooltipBase(p),
      trigger: 'axis',
      valueFormatter: (v) => (v == null ? '—' : `¥${Number(v).toFixed(1)}`),
    },
    legend: {
      top: 0,
      textStyle: { color: p.legend, fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
    xAxis: {
      type: 'category',
      data: priceMonths,
      boundaryGap: false,
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: { color: p.axis, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: p.axis,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        formatter: (v: number) => `¥${v}`,
      },
      splitLine: { lineStyle: { color: p.grid, type: [2, 4] } },
    },
    series: [
      {
        name: s.originalName,
        type: 'line',
        data: s.original,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: a.molybdenum, width: 2.2 },
        itemStyle: { color: a.molybdenum },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: hexAlpha(a.molybdenum, 0.22) },
              { offset: 1, color: hexAlpha(a.molybdenum, 0) },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: {
            formatter: '← 历史  |  预测 →',
            color: p.legend,
            fontSize: 10,
            position: 'end',
          },
          lineStyle: { type: 'dashed', color: p.axis, width: 1 },
          data: [{ xAxis: '7月' }],
        },
      },
      {
        name: s.altName,
        type: 'line',
        data: s.alt,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: a.patina, width: 2.2 },
        itemStyle: { color: a.patina },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: hexAlpha(a.patina, 0.18) },
              { offset: 1, color: hexAlpha(a.patina, 0) },
            ],
          },
        },
      },
    ],
  }
})

const demandWeeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']
const demandOriginal = [1980, 2010, 2060, 2110, 2180, 2240, 2280]
const demandAlt = [420, 480, 560, 640, 720, 790, 860]
const demandHighlight = 2

const demandOption = computed<EChartsOption>(() => {
  const p = palette.value
  const a = accents.value
  return {
    animation: false,
    grid: { left: 44, right: 12, top: 32, bottom: 28 },
    tooltip: {
      ...tooltipBase(p),
      trigger: 'axis',
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params]
        const orig = Number(items.find((i) => i.seriesName === '原厂元器件')?.value ?? 0)
        const alt = Number(items.find((i) => i.seriesName === '替代分流需求')?.value ?? 0)
        const total = orig + alt
        const share = total ? Math.round((orig / total) * 100) : 0
        return [
          `<div class="text-[11px]">周需求 <b>${total.toLocaleString()} 片</b></div>`,
          `<div class="text-[11px] mt-1">原厂：${orig.toLocaleString()}（${share}%）</div>`,
          `<div class="text-[11px]">替代：${alt.toLocaleString()}（${100 - share}%）</div>`,
        ].join('')
      },
    },
    legend: {
      top: 0,
      textStyle: { color: p.legend, fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
    xAxis: {
      type: 'category',
      data: demandWeeks,
      boundaryGap: false,
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: { color: p.axis, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
    },
    yAxis: {
      type: 'value',
      min: 1500,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: p.axis,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        formatter: (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${v}`),
      },
      splitLine: { lineStyle: { color: p.grid, type: [2, 4] } },
    },
    series: [
      {
        name: '原厂元器件',
        type: 'line',
        stack: 'demand',
        data: demandOriginal,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: a.molybdenum, width: 2 },
        itemStyle: { color: a.molybdenum },
        areaStyle: { color: hexAlpha(a.molybdenum, 0.55) },
      },
      {
        name: '替代分流需求',
        type: 'line',
        stack: 'demand',
        data: demandAlt,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: a.patina, width: 2 },
        itemStyle: { color: a.patina },
        areaStyle: { color: hexAlpha(a.patina, 0.45) },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: p.axis, width: 1 },
          label: {
            formatter: () => {
              const o = demandOriginal[demandHighlight]
              const t = o + demandAlt[demandHighlight]
              return `周需求 ${t.toLocaleString()} 片\n原厂：${o.toLocaleString()}（${Math.round((o / t) * 100)}%）`
            },
            color: p.legend,
            fontSize: 10,
          },
          data: [{ xAxis: demandWeeks[demandHighlight] }],
        },
      },
    ],
  }
})

const signals = [
  {
    tone: 'iron' as const,
    icon: Zap,
    title: '价差触发',
    body: 'STM32 vs GD32 价差 ¥8.5 / 片，超过切换阈值 ¥6 / 片。建议：启动国产替代。',
  },
  {
    tone: 'iron' as const,
    icon: ShieldAlert,
    title: '供应风险',
    body: 'IGBT 模块交期延长至 26 周，中车替代方案已验证。窗口：立即切换，置信 95%。',
  },
  {
    tone: 'patina' as const,
    icon: CheckCircle2,
    title: '价格稳定',
    body: '电解电容国产 / 进口价差收窄至 ¥0.3 / 只，替代优势减弱。策略：维持现状。',
  },
]

const mapeRows = [
  { label: '原厂需求 MAPE', value: '5.2%', width: '52%', color: 'bg-molybdenum' },
  { label: '替代分流 MAPE', value: '8.1%', width: '81%', color: 'bg-patina' },
  { label: '总需求准确率', value: '91.4%', width: '91%', color: 'bg-coolant' },
]

type RiskLevel = '高' | '中' | '低'

const riskRows: Array<{
  part: string
  price: string
  up: boolean
  demand: string
  risk: RiskLevel
  alt: string
  action: string
}> = [
  { part: 'MCU STM32F103', price: '15.2%', up: true, demand: '600 片 / 周', risk: '高', alt: '2 种可用', action: '切换 GD32 50%' },
  { part: 'IGBT FF600R12KE4', price: '22.8%', up: true, demand: '80 只 / 周', risk: '高', alt: '1 种已验证', action: '立即切换中车' },
  { part: 'MOSFET IRFP460', price: '6.5%', up: true, demand: '450 只 / 周', risk: '中', alt: '2 种可用', action: '测试华润微' },
  { part: '电解电容 470μF', price: '2.1%', up: false, demand: '3,000 只 / 周', risk: '低', alt: '3 种可用', action: '常规采购' },
  { part: '电流传感器 LA55-P', price: '8.3%', up: true, demand: '240 只 / 周', risk: '中', alt: '2 种可用', action: '监控 · 备安全库存' },
  { part: '母线电容 2,200μF', price: '1.6%', up: false, demand: '120 只 / 周', risk: '低', alt: '2 种可用', action: '按需采购' },
]

function riskBadge(risk: RiskLevel) {
  if (risk === '低') return 'bg-patina/15 text-patina border-patina/40'
  if (risk === '中') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-iron/15 text-iron border-iron/40'
}

const strategies = [
  {
    tone: 'patina' as const,
    title: '立即执行 · MCU 国产替代',
    body: 'STM32 预测涨幅 15.2%，GD32 Pin to Pin 兼容且价差 ¥8.5 / 片。建议本周启动 50% 需求切换至兆易创新，固件适配 3 天可完成。',
    footer: '月省 ¥10.2 万',
  },
  {
    tone: 'iron' as const,
    title: '紧急切换 · IGBT 模块',
    body: '英飞凌 IGBT 交期 26 周，中车时代已通过 2 周可靠性测试。建议立即切换 60% 需求，剩余 40% 锁定英飞凌长协。',
    footer: '规避停线风险',
  },
  {
    tone: 'sulfur' as const,
    title: '验证推进 · MOSFET 华润微',
    body: 'IRFP460 预测涨 6.5%，华润微 SLP40N50C 引脚兼容。建议启动小批量验证（500 只），评估散热性能后决策全量切换。',
    footer: '潜在节约 ¥2.8 万 / 月',
  },
  {
    tone: 'coolant' as const,
    title: '安全库存 · 电流传感器',
    body: 'LA 55-P 预测涨 8.3% 且供应中等风险。建议建立 2 周安全库存（480 只），同时推进 ACS712 技术替代验证。',
    footer: '供应保障 +45%',
  },
]

const strategyBorder: Record<string, string> = {
  patina: 'border-l-patina',
  iron: 'border-l-iron',
  sulfur: 'border-l-sulfur',
  coolant: 'border-l-coolant',
}

const passiveItems = [
  '芯片缺货后产线停线等待',
  'IGBT 交期 26 周才寻找替代',
  '元器件涨价后被动接受成本上涨',
  'BOM 单一供应商绑定，无替代方案',
  '库存积压或缺料反复出现',
]

const activeItems = [
  'LSTM 提前 21 天预警缺料风险',
  '替代方案预验证就绪，触发即切换',
  '价格预测驱动锁价 / 替代决策',
  '82% 元器件有国产 / 品牌 / 规格替代',
  '需求预测精准，周转率 9.4x',
]
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">采购预测分析</h1>
      <p class="text-sm text-muted-foreground mt-1">
        元器件价格 / 需求双模型 · 替代图谱 · 供应风险与切换策略
      </p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <div
        v-for="k in kpis"
        :key="k.label"
        class="panel-surface rounded-lg p-3 relative overflow-hidden"
      >
        <div :class="['absolute inset-x-0 top-0 h-0.5', toneBar[k.tone]]" />
        <div class="text-[11px] text-muted-foreground">{{ k.label }}</div>
        <div class="mt-1 flex items-baseline gap-0.5">
          <span v-if="k.prefix" class="text-xs text-muted-foreground">{{ k.prefix }}</span>
          <span :class="['data-num text-xl font-semibold', toneText[k.tone]]">{{ k.value }}</span>
          <span v-if="k.suffix" class="text-xs text-muted-foreground">{{ k.suffix }}</span>
        </div>
        <div class="mt-1 flex items-center justify-between gap-1 text-[10px]">
          <span class="text-muted-foreground truncate">{{ k.hint }}</span>
          <span
            v-if="k.trend"
            :class="['data-num shrink-0', k.up ? 'text-patina' : 'text-iron']"
          >
            {{ k.up ? '↑' : '↓' }} {{ k.trend }}
          </span>
        </div>
      </div>
    </div>

    <Panel title="LSTM 双模型架构 · 元器件专用" subtitle="价格预测 LSTM-COMPPRICE  +  需求预测 LSTM-COMPDEMAND">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-md border border-hairline bg-bg-base/40 p-3.5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Cpu class="size-3.5 text-molybdenum" />
              <span class="text-xs font-medium">价格预测模型</span>
            </div>
            <Tag tone="molybdenum">LSTM-COMPPRICE</Tag>
          </div>
          <div class="space-y-2">
            <div v-for="layer in priceArch" :key="layer.title">
              <div class="flex items-center justify-between text-[11px] mb-1">
                <span>{{ layer.title }}</span>
                <span class="data-num text-muted-foreground">{{ layer.meta }}</span>
              </div>
              <div class="h-1.5 bg-muted rounded overflow-hidden">
                <div class="h-full rounded bg-gradient-to-r from-molybdenum/80 to-coolant/70" :style="{ width: layer.width }" />
              </div>
            </div>
          </div>
          <p class="text-[10px] text-muted-foreground mt-3 leading-relaxed">
            输入：历史价格 + 替代料价格 + 汇率 + 芯片产能指数 + 供应交期
          </p>
        </div>

        <div class="rounded-md border border-hairline bg-bg-base/40 p-3.5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <TrendingUp class="size-3.5 text-patina" />
              <span class="text-xs font-medium">需求预测模型</span>
            </div>
            <Tag tone="patina">LSTM-COMPDEMAND</Tag>
          </div>
          <div class="space-y-2">
            <div v-for="layer in demandArch" :key="layer.title">
              <div class="flex items-center justify-between text-[11px] mb-1">
                <span>{{ layer.title }}</span>
                <span class="data-num text-muted-foreground">{{ layer.meta }}</span>
              </div>
              <div class="h-1.5 bg-muted rounded overflow-hidden">
                <div class="h-full rounded bg-gradient-to-r from-patina/80 to-coolant/60" :style="{ width: layer.width }" />
              </div>
            </div>
          </div>
          <p class="text-[10px] text-muted-foreground mt-3 leading-relaxed">
            输入：产品订单 + BOM 用量 + 替代切换记录 + 产品生命周期阶段
          </p>
        </div>
      </div>
    </Panel>

    <Panel title="元器件替代图谱 · 产品 BOM 可替换关系" subtitle="关键元器件 · 国产 / 品牌 / 规格替代方案">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <button
          v-for="card in bomCards"
          :key="card.id"
          type="button"
          class="text-left rounded-md border bg-bg-base/40 p-3 transition-colors"
          :class="
            selectedBom === card.id
              ? 'border-molybdenum/60 ring-1 ring-molybdenum/30'
              : 'border-hairline hover:border-molybdenum/40'
          "
          @click="selectedBom = card.id"
        >
          <div :class="['text-[10px] font-medium mb-1', toneText[card.tone]]">{{ card.category }}</div>
          <div class="text-xs font-semibold">{{ card.part }}</div>
          <div class="text-[10px] text-muted-foreground mt-0.5">{{ card.monthly }}</div>
          <div class="mt-2 space-y-1.5">
            <div v-for="alt in card.alts" :key="alt.name" class="text-[10px] leading-snug">
              <Tag :tone="card.tone" class-name="mb-0.5">{{ alt.kind }}</Tag>
              <div class="mt-0.5">{{ alt.name }} · {{ alt.vendor }}</div>
            </div>
          </div>
          <div class="text-[10px] text-muted-foreground mt-2 leading-relaxed">{{ card.condition }}</div>
        </button>
      </div>
    </Panel>

    <div class="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-4">
      <Panel
        :title="`元器件价格预测 · ${activePrice.originalName.split('（')[0]} vs 替代料`"
        subtitle="含替代料关联 · 点击上方图谱切换物料"
      >
        <div class="relative">
          <VChart :option="priceOption" autoresize class="w-full h-[280px]" />
          <div
            class="absolute top-10 right-6 max-w-[160px] rounded-md border border-patina/40 bg-background/90 backdrop-blur px-2.5 py-2 shadow-sm pointer-events-none"
          >
            <div class="text-[10px] text-muted-foreground">国产替代价差</div>
            <div class="data-num text-sm text-patina font-semibold">-¥{{ priceGap }} / 片</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">30 天后预测</div>
          </div>
        </div>
      </Panel>

      <Panel title="替代策略信号" subtitle="价差 / 交期 / 稳定度触发">
        <div class="space-y-2.5">
          <div
            v-for="s in signals"
            :key="s.title"
            class="rounded-md border border-hairline bg-bg-base/40 p-2.5"
          >
            <div class="flex items-center gap-1.5 mb-1">
              <component :is="s.icon" :class="['size-3.5', toneText[s.tone]]" />
              <span class="text-xs font-medium">{{ s.title }}</span>
            </div>
            <p class="text-[11px] text-muted-foreground leading-relaxed">{{ s.body }}</p>
          </div>
        </div>
      </Panel>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-4">
      <Panel title="元器件需求预测 · 含替代分流" subtitle="未来 45 天 · 原厂 + 替代分流">
        <VChart :option="demandOption" autoresize class="w-full h-[240px]" />
      </Panel>

      <Panel title="预测准确率" subtitle="纳入替代切换记录后的误差分解">
        <div class="space-y-4 pt-1">
          <div v-for="row in mapeRows" :key="row.label">
            <div class="flex items-center justify-between text-[11px] mb-1.5">
              <span>{{ row.label }}</span>
              <span class="data-num">{{ row.value }}</span>
            </div>
            <div class="h-2 rounded bg-muted overflow-hidden">
              <div :class="['h-full rounded', row.color]" :style="{ width: row.width }" />
            </div>
          </div>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            纳入替代切换记录后，总预测准确率提升
            <span class="text-patina data-num">6.8%</span>
            ，替代分流置信度
            <span class="text-coolant data-num">87%</span>。
          </p>
        </div>
      </Panel>
    </div>

    <Panel title="元器件风险看板 · 含替代评估" flush>
      <div class="overflow-x-auto">
        <table class="w-full text-xs min-w-[760px]">
          <thead>
            <tr class="border-b border-hairline text-muted-foreground">
              <th class="text-left font-medium px-4 py-2.5">元器件</th>
              <th class="text-left font-medium py-2.5">45 天价格预测</th>
              <th class="text-left font-medium py-2.5">需求预测</th>
              <th class="text-left font-medium py-2.5">供应风险</th>
              <th class="text-left font-medium py-2.5">替代可用</th>
              <th class="text-left font-medium py-2.5 pr-4">建议动作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in riskRows"
              :key="row.part"
              class="border-b border-hairline/60 hover:bg-surface/50"
            >
              <td class="px-4 py-2.5 font-medium">{{ row.part }}</td>
              <td class="py-2.5">
                <span :class="['data-num inline-flex items-center gap-0.5', row.up ? 'text-iron' : 'text-patina']">
                  <component :is="row.up ? TrendingUp : TrendingDown" class="size-3" />
                  {{ row.price }}
                </span>
              </td>
              <td class="py-2.5 text-muted-foreground">{{ row.demand }}</td>
              <td class="py-2.5">
                <span
                  :class="['inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border', riskBadge(row.risk)]"
                >
                  {{ row.risk }}
                </span>
              </td>
              <td class="py-2.5">{{ row.alt }}</td>
              <td class="py-2.5 pr-4">{{ row.action }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel title="AI 智能采购策略 · 含替代切换">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div
          v-for="s in strategies"
          :key="s.title"
          :class="['rounded-md border border-hairline bg-bg-base/40 p-3 border-l-2', strategyBorder[s.tone]]"
        >
          <div :class="['text-xs font-medium mb-1.5', toneText[s.tone]]">{{ s.title }}</div>
          <p class="text-[11px] text-muted-foreground leading-relaxed">{{ s.body }}</p>
          <div :class="['text-[11px] mt-2 data-num', toneText[s.tone]]">{{ s.footer }}</div>
        </div>
      </div>
    </Panel>

    <Panel title="采购策略转变：被动响应 → 主动预防">
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        <div class="rounded-md border border-hairline bg-bg-base/40 p-3.5">
          <div class="flex items-center gap-1.5 mb-2.5">
            <AlertTriangle class="size-3.5 text-iron" />
            <span class="text-xs font-medium">被动响应模式</span>
          </div>
          <ul class="space-y-2">
            <li
              v-for="item in passiveItems"
              :key="item"
              class="flex items-start gap-2 text-[11px] text-muted-foreground"
            >
              <span class="mt-1 size-1.5 rounded-full bg-iron shrink-0" />
              {{ item }}
            </li>
          </ul>
        </div>

        <div class="hidden lg:flex items-center justify-center px-1">
          <div class="flex flex-col items-center gap-1 text-molybdenum">
            <ArrowRight class="size-5" />
            <span class="text-[10px] text-muted-foreground">策略升级</span>
          </div>
        </div>

        <div class="rounded-md border border-patina/30 bg-patina/5 p-3.5">
          <div class="flex items-center gap-1.5 mb-2.5">
            <Wallet class="size-3.5 text-patina" />
            <span class="text-xs font-medium">主动预防模式</span>
          </div>
          <ul class="space-y-2">
            <li
              v-for="item in activeItems"
              :key="item"
              class="flex items-start gap-2 text-[11px] text-muted-foreground"
            >
              <span class="mt-1 size-1.5 rounded-full bg-patina shrink-0" />
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </Panel>
  </div>
</template>
