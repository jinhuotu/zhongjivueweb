<script setup lang="ts">
import {
  Sparkles,
  TrendingDown,
  Target,
  Play,
  CircleCheck,
  Lightbulb,
} from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import { optimizationSuggestions } from '@/lib/mock'

const history = [
  {
    t: '2024-10-22',
    m: '2# 正火车式窑 空燃比 1.15→1.05',
    d: '2# 正火车式窑',
    e: '780 tce',
    a: '826 tce',
    r: 105.9,
    c: '2178 tCO₂',
    s: 'done' as const,
  },
  {
    t: '2024-10-08',
    m: '3# 调质车式窑 蓄热体清灰',
    d: '3# 调质车式窑',
    e: '420 tce',
    a: '388 tce',
    r: 92.4,
    c: '1023 tCO₂',
    s: 'done' as const,
  },
  {
    t: '2024-09-30',
    m: '4# 烧成车式窑 烟气换热器吹灰',
    d: '4# 烧成车式窑',
    e: '320 tce',
    a: '344 tce',
    r: 107.5,
    c: '906 tCO₂',
    s: 'done' as const,
  },
  {
    t: '2024-09-15',
    m: '1# 退火车式窑 装炉密度提升至 82%',
    d: '1# 退火车式窑',
    e: '620 tce',
    a: '512 tce',
    r: 82.6,
    c: '1349 tCO₂',
    s: 'review' as const,
  },
  {
    t: '2024-08-21',
    m: '辅助系统 光伏 + 储能峰谷套利',
    d: '3.6MW 屋顶光伏',
    e: '—',
    a: '—',
    r: 100,
    c: '1240 tCO₂',
    s: 'done' as const,
  },
]

function rateClass(r: number) {
  if (r >= 100) return 'data-num text-patina'
  if (r >= 90) return 'data-num text-molybdenum'
  return 'data-num text-sulfur'
}
</script>

<template>
  <PageHeader
    title="节能优化"
    description="基于热力学第一定律 + 工艺寻优 + 强化学习的 AI 推荐引擎，给出可量化节能空间与投资回收期。所有建议均可一键下发到 DCS / 工单。"
  >
    <template #badges>
      <Tag tone="iron">
        <Sparkles class="size-3 mr-0.5 inline" />AI 推荐
      </Tag>
    </template>
  </PageHeader>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard
      label="待执行建议"
      :value="optimizationSuggestions.length"
      unit="项"
      tone="iron"
    >
      <template #icon><Lightbulb class="size-4" /></template>
    </KpiCard>
    <KpiCard label="累计可节能" value="5 510" unit="tce/年" tone="patina">
      <template #icon><TrendingDown class="size-4" /></template>
    </KpiCard>
    <KpiCard label="累计可减碳" value="17 610" unit="tCO₂/年" tone="molybdenum">
      <template #icon><Target class="size-4" /></template>
    </KpiCard>
    <KpiCard label="平均回收期" value="8.6" unit="个月" tone="coolant" />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
    <div
      v-for="(s, i) in optimizationSuggestions"
      :key="i"
      class="panel-surface rounded-lg p-5 hover:border-iron/40 transition"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <Tag :tone="s.confidence === 'high' ? 'patina' : 'sulfur'">
              置信度 {{ s.confidence === 'high' ? '高' : '中' }}
            </Tag>
            <Tag tone="molybdenum">{{ s.method }}</Tag>
            <span class="text-[11px] text-muted-foreground">· {{ s.target }}</span>
          </div>
          <h4 class="text-sm font-medium leading-snug">{{ s.title }}</h4>
        </div>
        <div
          class="size-9 rounded-md bg-iron/10 border border-iron/30 flex items-center justify-center shrink-0"
        >
          <Sparkles class="size-4 text-iron" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
        <div>
          <div class="text-[10px] text-muted-foreground">年节能</div>
          <div class="data-num text-sm font-semibold text-patina mt-0.5">{{ s.saveEnergy }}</div>
        </div>
        <div>
          <div class="text-[10px] text-muted-foreground">年减碳</div>
          <div class="data-num text-sm font-semibold text-molybdenum mt-0.5">
            {{ s.saveCarbon }}
          </div>
        </div>
        <div>
          <div class="text-[10px] text-muted-foreground">投资回收</div>
          <div class="data-num text-sm font-semibold text-sulfur mt-0.5">{{ s.payback }}</div>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-4">
        <button
          class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md bg-iron text-background hover:bg-iron/90"
        >
          <Play class="size-3" />立即下发
        </button>
        <button
          class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
        >
          查看详情
        </button>
      </div>
    </div>
  </div>

  <Panel title="已执行优化效果回溯" subtitle="过去 90 天 · 节能减碳实绩" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[900px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in [
                '执行时间',
                '措施',
                '设备',
                '预期节能',
                '实际节能',
                '达成率',
                '减碳量',
                '状态',
              ]"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="(r, i) in history" :key="i" class="hover:bg-background/40">
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.t }}</td>
            <td class="px-4 py-3">{{ r.m }}</td>
            <td class="px-4 py-3 text-foreground/80">{{ r.d }}</td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.e }}</td>
            <td class="px-4 py-3 data-num text-patina">{{ r.a }}</td>
            <td class="px-4 py-3">
              <span :class="rateClass(r.r)">{{ r.r.toFixed(1) }}%</span>
            </td>
            <td class="px-4 py-3 data-num text-molybdenum">{{ r.c }}</td>
            <td class="px-4 py-3">
              <span
                v-if="r.s === 'done'"
                class="inline-flex items-center gap-1 text-patina text-[11px]"
              >
                <CircleCheck class="size-3" />已完成
              </span>
              <Tag v-else tone="sulfur">待复盘</Tag>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>
</template>
