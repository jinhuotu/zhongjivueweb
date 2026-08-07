<script setup lang="ts">
import { Package, PackageCheck, PackageX, TrendingUp } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_SPARES } from '@/lib/mock-extended'

const sp = FP_SPARES

const kpis = [
  { label: '品类总数', value: sp.categories, color: 'text-molybdenum', icon: Package },
  { label: '在库充足', value: sp.inStock, color: 'text-patina', icon: PackageCheck },
  { label: '低库存', value: sp.lowStock, color: 'text-iron', icon: PackageX },
  { label: '预测需求', value: sp.forecast, color: 'text-coolant', icon: TrendingUp },
]

function statusBadge(status: string) {
  if (status === 'sufficient') return 'bg-patina/15 text-patina border-patina/40'
  if (status === 'warning') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-iron/15 text-iron border-iron/40'
}

function statusLabel(status: string) {
  if (status === 'sufficient') return '充足'
  if (status === 'warning') return '预警'
  if (status === 'low') return '不足'
  return status
}

const maxForecast = Math.max(...sp.forecastData.flatMap((d) => [d.predicted, d.actual]))
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">备件与资源管理</h1>
      <p class="text-sm text-muted-foreground mt-1">库存水位 · 安全库存 · 需求预测</p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <component :is="s.icon" class="size-3" />{{ s.label }}
        </div>
        <div :class="['data-num text-xl font-semibold mt-1', s.color]">{{ s.value }}</div>
      </Panel>
    </div>

    <Panel title="备件清单">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-medium">名称</th>
            <th class="text-left py-2 font-medium">规格</th>
            <th class="text-left py-2 font-medium">库存</th>
            <th class="text-left py-2 font-medium">安全库存</th>
            <th class="text-left py-2 font-medium">月均消耗</th>
            <th class="text-left py-2 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in sp.sparesList"
            :key="s.id"
            class="border-b border-border-hairline/50 hover:bg-surface/50"
          >
            <td class="py-2.5 font-medium">{{ s.name }}</td>
            <td class="py-2.5 text-muted-foreground font-mono">{{ s.spec }}</td>
            <td class="py-2.5 data-num">{{ s.stock }}</td>
            <td class="py-2.5 data-num">{{ s.safety }}</td>
            <td class="py-2.5 data-num">{{ s.monthly }}</td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
                  statusBadge(s.status),
                ]"
              >
                {{ statusLabel(s.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>

    <Panel title="需求预测" subtitle="预测 vs 实际">
      <div class="flex items-end gap-4 h-40">
        <div
          v-for="(d, i) in sp.forecastData"
          :key="i"
          class="flex-1 flex flex-col items-center gap-1"
        >
          <div class="flex items-end gap-1 w-full h-32">
            <div
              class="flex-1 bg-molybdenum/50 rounded-t"
              :style="{ height: `${(d.predicted / maxForecast) * 100}%` }"
              :title="`预测 ${d.predicted}`"
            />
            <div
              class="flex-1 bg-patina/50 rounded-t"
              :style="{ height: `${(d.actual / maxForecast) * 100}%` }"
              :title="`实际 ${d.actual}`"
            />
          </div>
          <span class="text-[10px] text-muted-foreground">{{ d.month }}</span>
        </div>
      </div>
      <div class="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span><span class="inline-block w-2 h-2 bg-molybdenum/50 rounded mr-1" />预测</span>
        <span><span class="inline-block w-2 h-2 bg-patina/50 rounded mr-1" />实际</span>
      </div>
    </Panel>
  </div>
</template>
