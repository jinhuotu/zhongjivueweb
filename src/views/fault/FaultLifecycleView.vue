<script setup lang="ts">
import { Layers, AlertTriangle, Clock, TrendingDown } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_LIFECYCLE } from '@/lib/mock-extended'

const lc = FP_LIFECYCLE

const kpis = [
  { label: '关键部件', value: lc.components, unit: '项', color: 'text-molybdenum', icon: Layers },
  { label: '待更换', value: lc.needReplace, unit: '项', color: 'text-iron', icon: AlertTriangle },
  { label: '平均剩余寿命', value: lc.avgLife, unit: 'h', color: 'text-coolant', icon: Clock },
  {
    label: '劣化速率',
    value: lc.degradationRate,
    unit: '%/月',
    color: 'text-sulfur',
    icon: TrendingDown,
  },
]

function actionBadge(action: string) {
  if (action === '正常') return 'bg-patina/15 text-patina border-patina/40'
  if (action === '关注') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-iron/15 text-iron border-iron/40'
}

function healthBarColor(health: number) {
  if (health >= 80) return 'bg-patina'
  if (health >= 60) return 'bg-sulfur'
  return 'bg-iron'
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">设备寿命与劣化管理</h1>
      <p class="text-sm text-muted-foreground mt-1">关键部件寿命 · 更换建议 · 劣化因子</p>
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

    <Panel title="关键部件清单">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-medium">部件</th>
            <th class="text-left py-2 font-medium">设备</th>
            <th class="text-left py-2 font-medium">已用</th>
            <th class="text-left py-2 font-medium">剩余</th>
            <th class="text-left py-2 font-medium">健康度</th>
            <th class="text-left py-2 font-medium">建议</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in lc.componentsList"
            :key="c.id"
            class="border-b border-border-hairline/50 hover:bg-surface/50"
          >
            <td class="py-2.5 font-medium">{{ c.name }}</td>
            <td class="py-2.5 font-mono text-molybdenum">{{ c.device }}</td>
            <td class="py-2.5 data-num">{{ c.used }} h</td>
            <td class="py-2.5 data-num">{{ c.remaining }} h</td>
            <td class="py-2.5">
              <div class="flex items-center gap-2 min-w-[100px]">
                <div class="flex-1 h-1.5 bg-surface rounded overflow-hidden">
                  <div
                    :class="['h-full', healthBarColor(c.health)]"
                    :style="{ width: `${c.health}%` }"
                  />
                </div>
                <span class="data-num text-[11px]">{{ c.health }}</span>
              </div>
            </td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
                  actionBadge(c.action),
                ]"
              >
                {{ c.action }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>

    <Panel title="劣化影响因子">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="(f, i) in lc.factors"
          :key="i"
          class="panel-surface rounded border border-border-hairline p-3"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium">{{ f.factor }}</span>
            <span class="data-num text-sulfur text-sm">×{{ f.impact }}</span>
          </div>
          <p class="text-[11px] text-muted-foreground">{{ f.desc }}</p>
        </div>
      </div>
    </Panel>
  </div>
</template>
