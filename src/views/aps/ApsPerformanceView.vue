<script setup lang="ts">
import { TrendingUp, FileText } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_KPIS } from '@/lib/mock-extended'

const stability = [
  { metric: '排程冻结率', value: 82, target: 85, desc: '冻结期内排程不变动比例' },
  { metric: '插单频率', value: 3.2, target: 2.0, desc: '周均插单次数', unit: '次/周' },
  { metric: '换产次数', value: 18, target: 15, desc: '月度换产次数', unit: '次' },
  { metric: '延期率', value: 8.5, target: 5.0, desc: '订单延期比例', unit: '%' },
]

const benchmarks = [
  { metric: '订单达成率', ours: 91.2, benchmark: 95.0, gap: -3.8 },
  { metric: '产能利用率', ours: 84.5, benchmark: 88.0, gap: -3.5 },
  { metric: '准交率', ours: 88.3, benchmark: 92.0, gap: -3.7 },
  { metric: '吨能耗', ours: 148, benchmark: 135, gap: 13, unit: '¥' },
]

const suggestions = [
  {
    priority: '高',
    title: '优化 TC-03 排程策略',
    desc: '该窑炉瓶颈负荷 96%，建议引入弹性缓冲时段，减少插单冲击',
    impact: '准交率 +2.3%',
  },
  {
    priority: '中',
    title: '合并同材质订单',
    desc: 'GY-90 与 HA-75 在 TC-01 连续排产可节省换产 4h',
    impact: '产能 +3.2%',
  },
  {
    priority: '中',
    title: '调整峰谷用电策略',
    desc: '高能耗工序移至谷电时段 (23:00-07:00)',
    impact: '电费 -8.2 万/月',
  },
  {
    priority: '低',
    title: '建立插单审批流程',
    desc: '减少临时插单对冻结期排程的冲击',
    impact: '稳定性 +5%',
  },
]

function priorityClass(p: string) {
  if (p === '高') return 'bg-iron/15 text-iron border-iron/40'
  if (p === '中') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
}

function deltaLabel(delta: number) {
  if (delta > 0) return `+${delta}`
  return `${delta}`
}

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">排程绩效与统计分析</h1>
      <p class="text-sm text-muted-foreground mt-1">
        KPI 分析 · 排程稳定性评估 · 对标分析 · 改善建议
      </p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Panel v-for="k in APS_KPIS" :key="k.id" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <TrendingUp
            class="size-3"
            :class="k.trend === 'up' ? 'text-patina' : 'text-iron rotate-180'"
          />
          {{ k.name }}
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span
            class="data-num text-xl font-semibold"
            :class="k.value >= k.target ? 'text-patina' : 'text-sulfur'"
            >{{ k.value }}</span
          >
          <span class="text-xs text-muted-foreground">{{ k.unit }}</span>
        </div>
        <div class="text-[10px] text-muted-foreground mt-1">
          目标 {{ k.target }} · 环比 {{ deltaLabel(k.delta) }}{{ k.unit === '%' ? '%' : '' }}
        </div>
      </Panel>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="排程稳定性评估" subtitle="近 30 天">
        <div class="space-y-3">
          <div
            v-for="(m, i) in stability"
            :key="i"
            class="panel-surface rounded border border-border-hairline p-2.5"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-medium">{{ m.metric }}</span>
              <span class="data-num text-sm"
                >{{ m.value }}{{ m.unit ? ` ${m.unit}` : '%' }}</span
              >
            </div>
            <div class="h-1.5 bg-surface rounded overflow-hidden">
              <div
                class="h-full"
                :class="m.value <= m.target ? 'bg-patina' : 'bg-sulfur'"
                :style="{
                  width: `${Math.min(100, (m.value / (m.target * 1.5)) * 100)}%`,
                }"
              />
            </div>
            <div
              class="flex items-center justify-between mt-1 text-[10px] text-muted-foreground"
            >
              <span>{{ m.desc }}</span>
              <span>目标 {{ m.target }}{{ m.unit ? ` ${m.unit}` : '%' }}</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="对标分析" subtitle="与行业标杆对比">
        <div class="space-y-3">
          <div
            v-for="(m, i) in benchmarks"
            :key="i"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <div class="flex-1">
              <div class="text-xs font-medium">{{ m.metric }}</div>
              <div class="flex items-center gap-2 mt-1">
                <div class="flex-1 h-1.5 bg-surface rounded overflow-hidden relative">
                  <div
                    class="absolute inset-y-0 left-0 bg-molybdenum"
                    :style="{
                      width: `${Math.min(100, (m.ours / m.benchmark) * 100)}%`,
                    }"
                  />
                </div>
                <span class="data-num text-xs">{{ m.ours }}{{ m.unit || '' }}</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-muted-foreground">标杆</div>
              <div class="data-num text-xs text-patina">
                {{ m.benchmark }}{{ m.unit || '' }}
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>

    <Panel title="改善建议">
      <template #action>
        <button :class="btn"><FileText class="size-3.5 mr-1" />导出报告</button>
      </template>
      <div class="space-y-2">
        <div
          v-for="(s, i) in suggestions"
          :key="i"
          class="flex items-start gap-3 panel-surface rounded border border-border-hairline p-2.5"
        >
          <span
            class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
            :class="priorityClass(s.priority)"
            >{{ s.priority }}</span
          >
          <div class="flex-1">
            <div class="text-xs font-medium">{{ s.title }}</div>
            <div class="text-[11px] text-muted-foreground mt-0.5">{{ s.desc }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs data-num text-patina">{{ s.impact }}</div>
          </div>
        </div>
      </div>
    </Panel>
  </div>
</template>
