<script setup lang="ts">
import { Plus, ListChecks, Bell, CheckCircle2, Clock } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_ALERTS } from '@/lib/mock-extended'

const al = FP_ALERTS

const kpis = [
  { label: '规则数', value: al.rules, color: 'text-molybdenum', icon: ListChecks },
  { label: '今日预警', value: al.todayAlerts, color: 'text-sulfur', icon: Bell },
  { label: '已处理', value: al.resolved, color: 'text-patina', icon: CheckCircle2 },
  { label: '待处理', value: al.pending, color: 'text-iron', icon: Clock },
]

function levelBadge(level: string) {
  if (level === 'critical') return 'bg-iron/15 text-iron border-iron/40'
  if (level === 'high') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
}

function levelLabel(level: string) {
  if (level === 'critical') return '严重'
  if (level === 'high') return '高'
  if (level === 'medium') return '中'
  return level
}

function statusBadge(status: string) {
  if (status === 'resolved') return 'bg-patina/15 text-patina border-patina/40'
  return 'bg-sulfur/15 text-sulfur border-sulfur/40'
}

function statusLabel(status: string) {
  return status === 'resolved' ? '已关闭' : '待处理'
}

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">故障预警管理</h1>
        <p class="text-sm text-muted-foreground mt-1">规则配置 · 通知分发 · 闭环跟踪</p>
      </div>
      <button :class="btnPrimary"><Plus class="size-3.5 mr-1" />新增规则</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <component :is="s.icon" class="size-3" />{{ s.label }}
        </div>
        <div :class="['data-num text-xl font-semibold mt-1', s.color]">{{ s.value }}</div>
      </Panel>
    </div>

    <Panel title="预警规则">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-medium">规则名称</th>
            <th class="text-left py-2 font-medium">条件</th>
            <th class="text-left py-2 font-medium">级别</th>
            <th class="text-left py-2 font-medium">通知</th>
            <th class="text-left py-2 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in al.rulesList"
            :key="r.id"
            class="border-b border-border-hairline/50 hover:bg-surface/50"
          >
            <td class="py-2.5 font-medium">{{ r.name }}</td>
            <td class="py-2.5 font-mono text-muted-foreground">{{ r.condition }}</td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
                  levelBadge(r.level),
                ]"
              >
                {{ levelLabel(r.level) }}
              </span>
            </td>
            <td class="py-2.5 text-muted-foreground">{{ r.notify }}</td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
                  r.enabled
                    ? 'bg-patina/15 text-patina border-patina/40'
                    : 'bg-muted text-muted-foreground border-border-hairline',
                ]"
              >
                {{ r.enabled ? '启用' : '禁用' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>

    <Panel title="近期预警">
      <div class="space-y-2">
        <div
          v-for="a in al.recentAlerts"
          :key="a.id"
          class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
        >
          <div class="flex-1 min-w-0">
            <div class="text-xs truncate">{{ a.message }}</div>
            <div class="text-[11px] text-muted-foreground mt-0.5">
              {{ a.device }} · {{ a.time }}
            </div>
          </div>
          <span
            :class="[
              'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] shrink-0',
              statusBadge(a.status),
            ]"
          >
            {{ statusLabel(a.status) }}
          </span>
        </div>
      </div>
    </Panel>
  </div>
</template>
