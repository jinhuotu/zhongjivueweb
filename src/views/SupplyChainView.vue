<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { Truck, Leaf, BadgeCheck, TriangleAlert } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { SUPPLIERS, SCOPE3_CATEGORIES } from '@/lib/mock'

ensureEcharts()

const palette = useChartPalette()

type Tone = 'iron' | 'patina' | 'molybdenum' | 'sulfur'

const TEXT_CLS: Record<Tone, string> = {
  iron: 'text-iron',
  patina: 'text-patina',
  molybdenum: 'text-molybdenum',
  sulfur: 'text-sulfur',
}

const BG_BAR: Record<Tone, string> = {
  iron: 'bg-iron',
  patina: 'bg-patina',
  molybdenum: 'bg-molybdenum',
  sulfur: 'bg-sulfur',
}

const RISK_TONE = { low: 'patina', medium: 'sulfur', high: 'iron' } as const
const RISK_LABEL = { low: '低', medium: '中', high: '高' } as const

const RISK_BADGE: Record<keyof typeof RISK_TONE, string> = {
  low: 'bg-patina/15 text-patina border border-patina/30',
  medium: 'bg-sulfur/15 text-sulfur border border-sulfur/30',
  high: 'bg-iron/15 text-iron border border-iron/30',
}

const ECO_TEXT: Record<string, string> = {
  A: 'text-patina',
  'A-': 'text-patina',
  'B+': 'text-molybdenum',
  B: 'text-sulfur',
  'B-': 'text-sulfur',
}

const kpis: Array<{ label: string; value: string; hint: string; color: Tone }> = [
  { label: '供应商数', value: '42', hint: 'T1 28 / T2 14', color: 'molybdenum' },
  { label: '范围三排放', value: '42 836 tCO₂', hint: '占总排放 19.6%', color: 'patina' },
  { label: '一手数据覆盖', value: '62.4%', hint: '目标 ≥ 80%', color: 'sulfur' },
  { label: 'ISO 14064 供应商', value: '18 家', hint: '占采购额 76.8%', color: 'patina' },
  { label: '风险供应商', value: '3 家', hint: '需 90 天整改', color: 'iron' },
]

const maturity: Array<{ l: string; v: number; c: Tone }> = [
  { l: '一手数据 (Supplier Specific)', v: 62.4, c: 'patina' },
  { l: '行业平均 (Industry Average)', v: 28.6, c: 'molybdenum' },
  { l: '估算法 (Spend-Based)', v: 9.0, c: 'sulfur' },
]

const plans: Array<{ title: string; target: string; saving: string; icon: Component; iconCls: string }> = [
  {
    title: '推动 T1 全部 ISO 14064 认证',
    target: '2025 H2',
    saving: '范围三 ↓ 12%',
    icon: BadgeCheck,
    iconCls: 'text-patina',
  },
  {
    title: '绿色物流（陆改铁 + 新能源车）',
    target: '2025 Q4',
    saving: '运输 ↓ 28%',
    icon: Truck,
    iconCls: 'text-molybdenum',
  },
  {
    title: '低碳原材料替代 (LCA-Steel)',
    target: '2026',
    saving: '原材料 ↓ 18%',
    icon: Leaf,
    iconCls: 'text-patina',
  },
  {
    title: '高风险 T2 供应商辅导整改',
    target: '2025 Q1',
    saving: '披露完整度 ↑',
    icon: TriangleAlert,
    iconCls: 'text-iron',
  },
  {
    title: '产品包装减重 / 可回收',
    target: '2025 Q3',
    saving: '包装 ↓ 22%',
    icon: Leaf,
    iconCls: 'text-patina',
  },
  {
    title: '客户使用阶段联合减碳',
    target: '2026',
    saving: '范围三 ↓ 6%',
    icon: BadgeCheck,
    iconCls: 'text-patina',
  },
]

const scope3Option = computed<EChartsOption>(() => {
  const p = palette.value
  return {
    backgroundColor: 'transparent',
    grid: { left: 130, right: 24, top: 12, bottom: 24 },
    tooltip: {
      ...tooltipBase(p),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: {
        color: p.axis,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
      splitLine: {
        lineStyle: { color: p.grid, type: [2, 4] },
      },
    },
    yAxis: {
      type: 'category',
      data: SCOPE3_CATEGORIES.map((d) => d.name),
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: {
        color: p.axis,
        fontSize: 11,
      },
    },
    series: [
      {
        type: 'bar',
        data: SCOPE3_CATEGORIES.map((d) => d.value),
        itemStyle: { color: '#059669', borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 16,
      },
    ],
  }
})
</script>

<template>
  <Panel title="供应链碳管理概览" subtitle="范围三 (Scope 3) 15 类活动 · 上下游碳排归集">
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <div
        v-for="k in kpis"
        :key="k.label"
        class="rounded-md border border-hairline bg-bg-base/50 p-4"
      >
        <div :class="['text-xs', TEXT_CLS[k.color]]">{{ k.label }}</div>
        <div class="font-mono text-2xl mt-2 text-text-primary">{{ k.value }}</div>
        <div class="text-[11px] text-text-muted mt-1">{{ k.hint }}</div>
      </div>
    </div>
  </Panel>

  <div class="grid grid-cols-1 xl:grid-cols-5 gap-4 mt-4">
    <Panel title="范围三 15 类活动归集" subtitle="GHG Protocol Scope 3" class-name="xl:col-span-3">
      <div class="h-80">
        <VChart :option="scope3Option" autoresize class="w-full h-full" />
      </div>
    </Panel>

    <Panel title="数据成熟度" subtitle="一手 / 行业平均 / 估算" class-name="xl:col-span-2">
      <div class="space-y-3">
        <div v-for="d in maturity" :key="d.l">
          <div class="flex items-center justify-between text-[12px]">
            <span class="text-text-primary">{{ d.l }}</span>
            <span :class="['font-mono', TEXT_CLS[d.c]]">{{ d.v }}%</span>
          </div>
          <div class="h-1.5 rounded bg-bg-base overflow-hidden mt-1">
            <div :class="['h-full', BG_BAR[d.c]]" :style="{ width: `${d.v}%` }" />
          </div>
        </div>
        <div class="text-[11px] text-text-muted mt-3 leading-relaxed">
          依据 GHG Protocol Corporate Value Chain Standard 6.0：优先获取一手数据；T1 供应商覆盖 ≥ 80% 为合规阈值。
        </div>
      </div>
    </Panel>
  </div>

  <Panel title="核心供应商画像" subtitle="T1/T2 评级 + ESG + 风险" class-name="mt-4" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-[12px] min-w-[900px]">
        <thead class="text-text-muted">
          <tr class="border-b border-hairline">
            <th class="text-left px-4 py-3">供应商</th>
            <th class="text-left">层级</th>
            <th class="text-left">类别</th>
            <th class="text-right">采购占比</th>
            <th class="text-right">范围三 tCO₂</th>
            <th class="text-center px-3">环保评级</th>
            <th class="text-center px-3">ESG 得分</th>
            <th class="text-left">认证</th>
            <th class="text-center px-3">风险</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-hairline">
          <tr v-for="s in SUPPLIERS" :key="s.id" class="hover:bg-bg-base/40">
            <td class="px-4 py-2.5 text-text-primary">
              <span class="flex items-center gap-2">
                <Truck class="w-3.5 h-3.5 text-text-muted" />{{ s.name }}
              </span>
            </td>
            <td class="text-text-muted">{{ s.tier }}</td>
            <td class="text-text-muted">{{ s.cat }}</td>
            <td class="font-mono text-right text-molybdenum">{{ s.share }}%</td>
            <td class="font-mono text-right">{{ s.scope3T.toLocaleString() }}</td>
            <td class="text-center px-3">
              <span :class="['font-mono text-[11px]', ECO_TEXT[s.ecoRating] ?? 'text-text-muted']">
                {{ s.ecoRating }}
              </span>
            </td>
            <td class="text-center px-3 font-mono text-patina">{{ s.esgScore }}</td>
            <td class="text-[11px] text-text-muted">{{ s.certs.join(' · ') }}</td>
            <td class="text-center px-3">
              <span :class="['px-2 py-0.5 rounded text-[11px]', RISK_BADGE[s.risk]]">
                {{ RISK_LABEL[s.risk] }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>

  <Panel title="供应链碳减排计划" subtitle="协同减排路径 · 2025 ~ 2030" class-name="mt-4">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="p in plans"
        :key="p.title"
        class="rounded border border-hairline bg-bg-base/40 p-4"
      >
        <div class="flex items-center gap-2">
          <component :is="p.icon" :class="['w-4 h-4', p.iconCls]" />
          <span class="text-sm text-text-primary">{{ p.title }}</span>
        </div>
        <div class="flex items-center justify-between mt-3 text-[12px]">
          <span class="text-text-muted">目标 {{ p.target }}</span>
          <span class="font-mono text-patina">{{ p.saving }}</span>
        </div>
      </div>
    </div>
  </Panel>
</template>
