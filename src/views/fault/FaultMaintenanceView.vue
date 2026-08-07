<script setup lang="ts">
import { Plus, ClipboardList, CheckCircle2, Loader2, Clock } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_MAINTENANCE } from '@/lib/mock-extended'

const mt = FP_MAINTENANCE

const kpis = [
  { label: '本月工单', value: mt.monthlyOrders, unit: '单', color: 'text-molybdenum', icon: ClipboardList },
  { label: '已完成', value: mt.completed, unit: '单', color: 'text-patina', icon: CheckCircle2 },
  { label: '执行中', value: mt.inProgress, unit: '单', color: 'text-sulfur', icon: Loader2 },
  { label: '平均工期', value: mt.avgDuration, unit: 'h', color: 'text-coolant', icon: Clock },
]

function statusBadge(status: string) {
  if (status === '已完成' || status === 'completed')
    return 'bg-patina/15 text-patina border-patina/40'
  if (status === '执行中' || status === 'in_progress')
    return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  if (status === '待执行' || status === 'pending')
    return 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
  return 'bg-muted text-muted-foreground border-border-hairline'
}

function statusLabel(status: string) {
  if (status === 'completed') return '已完成'
  if (status === 'in_progress') return '执行中'
  if (status === 'pending') return '待执行'
  return status
}

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">预测性维护计划</h1>
        <p class="text-sm text-muted-foreground mt-1">工单排程 · 执行跟踪 · 工期统计</p>
      </div>
      <button :class="btnPrimary"><Plus class="size-3.5 mr-1" />新建工单</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <component :is="s.icon" class="size-3" />{{ s.label }}
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span :class="['data-num text-xl font-semibold', s.color]">{{ s.value }}</span>
          <span class="text-xs text-muted-foreground">{{ s.unit }}</span>
        </div>
      </Panel>
    </div>

    <Panel title="维护工单">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-medium">工单号</th>
            <th class="text-left py-2 font-medium">设备</th>
            <th class="text-left py-2 font-medium">类型</th>
            <th class="text-left py-2 font-medium">计划日期</th>
            <th class="text-left py-2 font-medium">负责人</th>
            <th class="text-left py-2 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in mt.orders"
            :key="o.id"
            class="border-b border-border-hairline/50 hover:bg-surface/50"
          >
            <td class="py-2.5 font-mono text-molybdenum">{{ o.id }}</td>
            <td class="py-2.5">{{ o.device }}</td>
            <td class="py-2.5">{{ o.type }}</td>
            <td class="py-2.5 text-muted-foreground">{{ o.planned }}</td>
            <td class="py-2.5">{{ o.assignee }}</td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
                  statusBadge(o.status),
                ]"
              >
                {{ statusLabel(o.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  </div>
</template>
