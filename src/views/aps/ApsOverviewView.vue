<script setup lang="ts">
import {
  CalendarRange,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Flame,
  Zap,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_ORDERS, APS_SCHEDULE_RESULTS, APS_FURNACE_CAPACITY } from '@/lib/mock-extended'

const days = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2026, 5, 28 + i)
  return `${d.getMonth() + 1}/${d.getDate()}`
})

const sch = APS_SCHEDULE_RESULTS[0]!
const baseMs = new Date(2026, 5, 28).getTime()

function barStyle(start: string, end: string) {
  const startIdx = Math.max(0, Math.floor((new Date(start).getTime() - baseMs) / 86400000))
  const endIdx = Math.min(13, Math.ceil((new Date(end).getTime() - baseMs) / 86400000))
  const left = (startIdx / 14) * 100
  const width = Math.max(((endIdx - startIdx) / 14) * 100, 4)
  return { left: `${left}%`, width: `${width}%` }
}

const kpis = [
  { label: '订单达成率', value: 91.2, unit: '%', color: 'text-patina', icon: CheckCircle2 },
  { label: '产能利用率', value: 84.5, unit: '%', color: 'text-molybdenum', icon: Flame },
  { label: '在产订单', value: 4, unit: '单', color: 'text-coolant', icon: CalendarRange },
  { label: '待排订单', value: 3, unit: '单', color: 'text-sulfur', icon: TrendingUp },
  { label: '延期风险', value: 12, unit: '%', color: 'text-iron', icon: AlertTriangle },
  { label: '吨能耗成本', value: 148, unit: '¥', color: 'text-patina', icon: Zap },
]

const alerts = APS_ORDERS.filter((o) => o.status === '延期' || o.priority === 'P0-紧急')

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">排程总览</h1>
      <p class="text-sm text-muted-foreground mt-1">
        看板入口 · 达成率 · 甘特图 · 产能负荷 · 交付预警一图看全
      </p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

    <Panel title="甘特图 · 当前方案" :subtitle="sch.name">
      <template #action>
        <button :class="btn">对比方案 →</button>
      </template>
      <div class="overflow-x-auto">
        <div class="min-w-[900px]">
          <div class="grid grid-cols-[120px_1fr] gap-2">
            <div class="text-xs text-muted-foreground py-1">窑炉</div>
            <div
              class="grid gap-0.5"
              style="grid-template-columns: repeat(14, minmax(0, 1fr))"
            >
              <div
                v-for="d in days"
                :key="d"
                class="text-[10px] text-muted-foreground text-center"
              >
                {{ d }}
              </div>
            </div>
            <template v-for="f in APS_FURNACE_CAPACITY.slice(0, 6)" :key="f.id">
              <div class="text-xs py-2 font-mono">{{ f.id }}</div>
              <div class="relative h-8 bg-surface rounded border border-border-hairline">
                <div
                  v-for="o in sch.orders.filter((x) => x.furnace === f.id)"
                  :key="o.orderId"
                  class="absolute top-1 bottom-1 rounded text-[10px] text-background px-1.5 flex items-center truncate font-medium"
                  :style="{ ...barStyle(o.start, o.end), backgroundColor: o.color }"
                >
                  {{ o.orderId }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="产能负荷" subtitle="8 台窑炉当前负荷">
        <div class="space-y-2">
          <div v-for="f in APS_FURNACE_CAPACITY" :key="f.id" class="flex items-center gap-3">
            <span class="text-xs font-mono w-14">{{ f.id }}</span>
            <div class="flex-1 h-2 bg-surface rounded overflow-hidden">
              <div
                class="h-full"
                :class="f.bottleneck ? 'bg-iron' : 'bg-molybdenum'"
                :style="{ width: `${(f.currentLoad / f.maxLoad) * 100}%` }"
              />
            </div>
            <span class="data-num text-xs w-10 text-right">{{
              Math.round((f.currentLoad / f.maxLoad) * 100)
            }}%</span>
            <span
              v-if="f.bottleneck"
              class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border bg-iron/15 text-iron border-iron/40"
              >瓶颈</span
            >
          </div>
        </div>
      </Panel>
      <Panel title="交付预警" subtitle="近 7 天风险订单">
        <div class="space-y-2">
          <div
            v-for="o in alerts"
            :key="o.id"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2"
          >
            <AlertTriangle class="size-3.5 text-iron shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-mono text-molybdenum truncate">{{ o.code }}</div>
              <div class="text-[11px] text-muted-foreground truncate">
                {{ o.customer }} · {{ o.product }}
              </div>
            </div>
            <span
              class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
              :class="
                o.status === '延期'
                  ? 'bg-iron/15 text-iron border-iron/40'
                  : 'bg-sulfur/15 text-sulfur border-sulfur/40'
              "
              >{{ o.status }}</span
            >
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
