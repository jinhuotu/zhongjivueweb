<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { Wallet, Flame, Zap, Leaf, TriangleAlert, CheckCircle, Calendar } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import {
  BUDGET_KPIS,
  BUDGET_DEPARTMENTS,
  BUDGET_TIMELINE,
  BUDGET_ALERTS,
} from '@/lib/mock'

ensureEcharts()

const palette = useChartPalette()

type Tone = 'iron' | 'patina' | 'molybdenum' | 'sulfur'

const TEXT_CLS: Record<Tone, string> = {
  iron: 'text-iron',
  patina: 'text-patina',
  molybdenum: 'text-molybdenum',
  sulfur: 'text-sulfur',
}

const BG_CLS: Record<Tone, string> = {
  iron: 'bg-iron',
  patina: 'bg-patina',
  molybdenum: 'bg-molybdenum',
  sulfur: 'bg-sulfur',
}

const STATUS_CLS: Record<'good' | 'warning' | 'ontrack', string> = {
  good: 'bg-patina/15 text-patina border border-patina/30',
  warning: 'bg-iron/15 text-iron border border-iron/30',
  ontrack: 'bg-molybdenum/15 text-molybdenum border border-molybdenum/30',
}

const k = BUDGET_KPIS

const cards: Array<{
  icon: Component
  label: string
  total: number
  used: number
  color: Tone
  unit: string
}> = [
  {
    icon: Flame,
    label: '能耗预算 (GJ/y)',
    total: k.energyBudgetGJ,
    used: k.energyConsumedGJ,
    color: 'iron',
    unit: 'GJ',
  },
  {
    icon: Leaf,
    label: '碳排预算 (tCO₂/y)',
    total: k.carbonBudgetT,
    used: k.carbonConsumedT,
    color: 'patina',
    unit: 'tCO₂',
  },
  {
    icon: Zap,
    label: '电力预算 (MWh/y)',
    total: k.electricBudgetMWh,
    used: k.electricConsumedMWh,
    color: 'molybdenum',
    unit: 'MWh',
  },
  {
    icon: Wallet,
    label: '天然气预算 (万 Nm³)',
    total: k.gasBudgetWan,
    used: k.gasConsumedWan,
    color: 'sulfur',
    unit: '万 Nm³',
  },
]

const strategies = [
  {
    title: '错峰用电策略',
    desc: '12 月日间高峰转夜间，电费节省 ¥38 万',
    icon: Zap,
    iconCls: 'text-molybdenum',
  },
  {
    title: '配额履约组合',
    desc: 'CEA 现货 60% + CCER 抵销 40%，履约成本 ¥-280 万',
    icon: Leaf,
    iconCls: 'text-patina',
  },
  {
    title: 'Q4 排产平滑',
    desc: '错峰检修 + 临时停炉，避免年度超耗 8%',
    icon: Calendar,
    iconCls: 'text-sulfur',
  },
]

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value
  const categories = BUDGET_TIMELINE.map((d) => d.name)
  return {
    backgroundColor: 'transparent',
    grid: { left: 52, right: 52, top: 40, bottom: 28 },
    legend: {
      top: 0,
      textStyle: { color: p.legend, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    tooltip: {
      ...tooltipBase(p),
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: p.pointerShadow } },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: p.grid } },
      axisTick: { show: false },
      axisLabel: {
        color: p.axis,
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
    },
    yAxis: [
      {
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
      {
        type: 'value',
        axisLine: { lineStyle: { color: p.grid } },
        axisTick: { show: false },
        axisLabel: {
          color: p.axis,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '能耗预算',
        type: 'bar',
        yAxisIndex: 0,
        barMaxWidth: 22,
        itemStyle: { color: '#93c5fd', borderRadius: [3, 3, 0, 0] },
        data: BUDGET_TIMELINE.map((d) => d.能耗预算),
      },
      {
        name: '能耗实际',
        type: 'bar',
        yAxisIndex: 0,
        barMaxWidth: 22,
        itemStyle: { color: '#2563eb', borderRadius: [3, 3, 0, 0] },
        data: BUDGET_TIMELINE.map((d) => d.能耗实际),
      },
      {
        name: '碳预算',
        type: 'bar',
        yAxisIndex: 1,
        barMaxWidth: 22,
        itemStyle: { color: '#bfdbfe', borderRadius: [3, 3, 0, 0] },
        data: BUDGET_TIMELINE.map((d) => d.碳预算),
      },
      {
        name: '碳实际',
        type: 'bar',
        yAxisIndex: 1,
        barMaxWidth: 22,
        itemStyle: { color: '#059669', borderRadius: [3, 3, 0, 0] },
        data: BUDGET_TIMELINE.map((d) => d.碳实际),
      },
    ],
  }
})

function statusLabel(status: 'good' | 'warning' | 'ontrack') {
  if (status === 'good') return '健康'
  if (status === 'warning') return '预警'
  return '在轨'
}

function statusIcon(status: 'good' | 'warning' | 'ontrack') {
  return status === 'warning' ? TriangleAlert : CheckCircle
}
</script>

<template>
  <Panel title="用能与碳排预算总览" subtitle="集团年度预算 · 已执行 YTD · 剩余可用" flush>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <div
        v-for="c in cards"
        :key="c.label"
        class="rounded-md border border-hairline bg-bg-base/50 p-4"
      >
        <div class="flex items-center gap-2 text-xs" :class="TEXT_CLS[c.color]">
          <component :is="c.icon" class="w-4 h-4" />
          <span>{{ c.label }}</span>
        </div>
        <div class="font-mono text-xl mt-2">
          {{ c.used.toLocaleString() }} / {{ c.total.toLocaleString() }}
        </div>
        <div class="text-[11px] text-text-muted mt-1">
          已用 {{ ((c.used / c.total) * 100).toFixed(1) }}% · 剩余
          {{ (c.total - c.used).toLocaleString() }} {{ c.unit }}
        </div>
        <div class="h-1.5 rounded bg-bg-base overflow-hidden mt-3">
          <div
            class="h-full"
            :class="BG_CLS[c.color]"
            :style="{ width: `${Math.min((c.used / c.total) * 100, 100)}%` }"
          />
        </div>
      </div>
    </div>
  </Panel>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
    <Panel title="季度预算 vs 实际" subtitle="2024 YTD" class-name="lg:col-span-2" flush>
      <div class="p-4 h-72">
        <VChart :option="chartOption" autoresize class="w-full h-full" />
      </div>
    </Panel>

    <Panel title="超额 / 预警" subtitle="预算执行风险项" flush>
      <div class="p-4 space-y-3">
        <div
          v-for="a in BUDGET_ALERTS"
          :key="a.id"
          class="rounded border border-sulfur/30 bg-sulfur/5 p-3"
        >
          <div class="flex items-center justify-between text-[12px]">
            <span class="text-sulfur flex items-center gap-1">
              <TriangleAlert class="w-3.5 h-3.5" />{{ a.dept }}
            </span>
            <span class="font-mono text-sulfur">{{ a.actual }}</span>
          </div>
          <div class="text-[11px] text-text-muted mt-1">{{ a.kpi }}</div>
          <div class="text-[12px] text-text-primary mt-1">{{ a.advice }}</div>
        </div>
      </div>
    </Panel>
  </div>

  <Panel title="部门 / 车间预算执行明细" subtitle="按车间维度分配 + 履约状态" class-name="mt-4" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-[12px] min-w-[900px]">
        <thead class="text-text-muted">
          <tr class="border-b border-hairline">
            <th class="text-left px-4 py-3">车间 / 部门</th>
            <th class="text-left">范围</th>
            <th class="text-right">能耗预算 (GJ)</th>
            <th class="text-right">能耗实际</th>
            <th class="text-right">执行率</th>
            <th class="text-right">碳预算 (tCO₂)</th>
            <th class="text-right">碳实际</th>
            <th class="text-right">执行率</th>
            <th class="text-center px-4">状态</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-hairline">
          <tr
            v-for="d in BUDGET_DEPARTMENTS"
            :key="d.dept"
            class="hover:bg-bg-base/40"
          >
            <td class="px-4 py-3 text-text-primary">{{ d.dept }}</td>
            <td class="text-text-muted">{{ d.scope }}</td>
            <td class="font-mono text-right">{{ d.eBud.toLocaleString() }}</td>
            <td class="font-mono text-right">{{ d.eUse.toLocaleString() }}</td>
            <td class="font-mono text-right text-molybdenum">
              {{ ((d.eUse / d.eBud) * 100).toFixed(1) }}%
            </td>
            <td class="font-mono text-right">{{ d.cBud.toLocaleString() }}</td>
            <td class="font-mono text-right">{{ d.cUse.toLocaleString() }}</td>
            <td class="font-mono text-right text-patina">
              {{ ((d.cUse / d.cBud) * 100).toFixed(1) }}%
            </td>
            <td class="text-center px-4 py-3">
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px]"
                :class="STATUS_CLS[d.status]"
              >
                <component :is="statusIcon(d.status)" class="w-3 h-3" />
                {{ statusLabel(d.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>

  <Panel title="预算调度策略" subtitle="基于工况预测 + AI 推荐" class-name="mt-4" flush>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div
        v-for="s in strategies"
        :key="s.title"
        class="rounded border border-hairline bg-bg-base/40 p-4"
      >
        <div class="flex items-center gap-2">
          <component :is="s.icon" class="w-4 h-4" :class="s.iconCls" />
          <span class="text-sm text-text-primary">{{ s.title }}</span>
        </div>
        <div class="text-[12px] text-text-muted mt-2 leading-relaxed">{{ s.desc }}</div>
      </div>
    </div>
  </Panel>
</template>
