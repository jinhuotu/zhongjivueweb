<script setup lang="ts">
import { CalendarRange, TrendingUp, AlertTriangle, Check, Plus } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_KPIS } from '@/lib/mock-extended'

const scenarios = [
  { id: 's1', name: '基准情景', demand: '100%', capacity: '88%', balance: 88, risk: '低' },
  { id: 's2', name: '旺季 +20%', demand: '120%', capacity: '96%', balance: 72, risk: '中' },
  { id: 's3', name: '插单 +15%', demand: '115%', capacity: '94%', balance: 78, risk: '中' },
  { id: 's4', name: '设备检修 -10%', demand: '100%', capacity: '78%', balance: 65, risk: '高' },
]

function riskClass(risk: string) {
  if (risk === '低') return 'bg-patina/15 text-patina border-patina/40'
  if (risk === '中') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-iron/15 text-iron border-iron/40'
}

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">主生产计划 MPS</h1>
      <p class="text-sm text-muted-foreground mt-1">
        中长期计划 · 需求-产能平衡 · 粗能力校验 · 多情景模拟
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Panel class-name="!p-4">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp class="size-3.5" />月度需求达成率
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="data-num text-2xl font-semibold text-patina">94.2</span>
          <span class="text-xs text-muted-foreground">%</span>
        </div>
      </Panel>
      <Panel class-name="!p-4">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarRange class="size-3.5" />产能负荷率
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="data-num text-2xl font-semibold text-molybdenum">86.8</span>
          <span class="text-xs text-muted-foreground">%</span>
        </div>
      </Panel>
      <Panel class-name="!p-4">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle class="size-3.5" />瓶颈工序
        </div>
        <div class="mt-2 flex items-baseline gap-1">
          <span class="data-num text-2xl font-semibold text-iron">3</span>
          <span class="text-xs text-muted-foreground">项</span>
        </div>
      </Panel>
    </div>

    <Panel title="需求-产能平衡表" subtitle="未来 6 个月滚动计划">
      <template #action>
        <button :class="btn"><Plus class="size-3.5 mr-1" />新增情景</button>
      </template>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-muted-foreground border-b border-border-hairline">
              <th class="py-2 font-medium">情景</th>
              <th class="py-2 font-medium text-right">需求</th>
              <th class="py-2 font-medium text-right">产能</th>
              <th class="py-2 font-medium text-right">平衡度</th>
              <th class="py-2 font-medium">风险</th>
              <th class="py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in scenarios"
              :key="s.id"
              class="border-b border-border-hairline/50 hover:bg-surface/40"
            >
              <td class="py-3 font-medium">{{ s.name }}</td>
              <td class="py-3 text-right data-num">{{ s.demand }}</td>
              <td class="py-3 text-right data-num">{{ s.capacity }}</td>
              <td class="py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <div class="w-24 h-1.5 rounded-full bg-background overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-molybdenum to-patina"
                      :style="{ width: `${s.balance}%` }"
                    />
                  </div>
                  <span class="data-num text-xs">{{ s.balance }}</span>
                </div>
              </td>
              <td class="py-3">
                <span
                  class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
                  :class="riskClass(s.risk)"
                  >{{ s.risk }}</span
                >
              </td>
              <td class="py-3">
                <button class="text-xs h-7 px-2 text-muted-foreground hover:text-foreground">
                  展开排程 →
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel title="KPI 对标" subtitle="排程核心指标达成情况">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="k in APS_KPIS"
          :key="k.id"
          class="panel-surface rounded-lg p-3 border border-border-hairline"
        >
          <div class="text-xs text-muted-foreground">{{ k.name }}</div>
          <div class="mt-1.5 flex items-baseline gap-2">
            <span class="data-num text-xl font-semibold">{{ k.value }}</span>
            <span class="text-xs text-muted-foreground">{{ k.unit }}</span>
            <span class="text-xs text-muted-foreground">/ 目标 {{ k.target }}</span>
          </div>
          <div class="mt-2 flex items-center gap-1 text-xs">
            <Check v-if="k.value >= k.target" class="size-3 text-patina" />
            <AlertTriangle v-else class="size-3 text-sulfur" />
            <span
              :class="
                k.delta > 0
                  ? 'text-patina'
                  : k.delta < 0
                    ? 'text-iron'
                    : 'text-muted-foreground'
              "
            >
              {{ k.delta > 0 ? '+' : '' }}{{ k.delta }}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  </div>
</template>
