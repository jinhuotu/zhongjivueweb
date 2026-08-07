<script setup lang="ts">
import { Battery, Flame, Leaf, TrendingDown, Zap, DollarSign } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_ENERGY_SCHEDULE } from '@/lib/mock-extended'

const hours = Array.from({ length: 24 }, (_, i) => i)

function priceAt(h: number) {
  if (h >= 8 && h < 11) return 1.2
  if (h >= 18 && h < 21) return 1.1
  if (h >= 23 || h < 7) return 0.4
  return 0.7
}

function loadAt(h: number) {
  return APS_ENERGY_SCHEDULE.find((e) => e.hour === h)?.load ?? 0
}

const kpis = [
  { label: '峰电占比', value: 18, unit: '%', color: 'text-iron', icon: Zap },
  { label: '谷电占比', value: 42, unit: '%', color: 'text-patina', icon: Battery },
  { label: '燃气消耗', value: 2840, unit: 'm³', color: 'text-molybdenum', icon: Flame },
  { label: '碳排放', value: 12.4, unit: 'tCO₂', color: 'text-coolant', icon: Leaf },
  { label: '电费节省', value: 8.2, unit: '万元', color: 'text-patina', icon: DollarSign },
  { label: '绿色评分', value: 87, unit: '分', color: 'text-patina', icon: TrendingDown },
]

const scopes = [
  { scope: '范围 1 · 直接排放', value: 8.2, unit: 'tCO₂', pct: 66 },
  { scope: '范围 2 · 电力间接', value: 3.1, unit: 'tCO₂', pct: 25 },
  { scope: '范围 3 · 其他间接', value: 1.1, unit: 'tCO₂', pct: 9 },
]

const gasRows = APS_ENERGY_SCHEDULE.filter((e) => e.gasFlow > 0).slice(0, 6)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">能耗排程协同</h1>
      <p class="text-sm text-muted-foreground mt-1">
        峰谷电价利用 · 燃气调度 · 碳排放核算 · 绿色排程优化
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

    <Panel title="24h 峰谷电价调度" subtitle="电价曲线 × 负荷曲线">
      <div class="flex items-end gap-0.5 h-40">
        <div
          v-for="h in hours"
          :key="h"
          class="flex-1 flex flex-col items-center justify-end gap-0.5 h-full relative"
        >
          <div
            class="w-full bg-iron/40 rounded-t"
            :style="{ height: `${(priceAt(h) / 1.3) * 100}%` }"
            :title="`电价 ${priceAt(h)} 元`"
          />
          <div
            class="w-full bg-molybdenum/50 rounded-t"
            :style="{ height: `${loadAt(h)}%` }"
            :title="`负荷 ${loadAt(h)}%`"
          />
          <span
            v-if="h % 3 === 0"
            class="absolute -bottom-4 text-[9px] text-muted-foreground"
            >{{ h }}</span
          >
        </div>
      </div>
      <div class="flex items-center gap-4 mt-6 text-[10px] text-muted-foreground flex-wrap">
        <span><span class="inline-block w-2 h-2 bg-iron/40 rounded mr-1" />电价 (元/kWh)</span>
        <span><span class="inline-block w-2 h-2 bg-molybdenum/50 rounded mr-1" />负荷 (%)</span>
        <span class="ml-auto">峰时 8-11, 18-21 · 谷时 23-7</span>
      </div>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="燃气调度">
        <div class="space-y-2">
          <div
            v-for="e in gasRows"
            :key="e.hour"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2"
          >
            <Flame class="size-4 text-molybdenum" />
            <span class="text-xs font-mono w-10">{{ e.hour }}:00</span>
            <div class="flex-1 h-2 bg-surface rounded overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-molybdenum to-coolant"
                :style="{ width: `${(e.gasFlow / 500) * 100}%` }"
              />
            </div>
            <span class="data-num text-xs w-16 text-right">{{ e.gasFlow }} m³/h</span>
          </div>
        </div>
      </Panel>

      <Panel title="碳排放核算">
        <div class="space-y-3">
          <div v-for="s in scopes" :key="s.scope">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-muted-foreground">{{ s.scope }}</span>
              <span class="data-num">{{ s.value }} {{ s.unit }}</span>
            </div>
            <div class="h-1.5 bg-surface rounded overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-patina to-coolant"
                :style="{ width: `${s.pct}%` }"
              />
            </div>
          </div>
          <div
            class="pt-2 border-t border-border-hairline flex items-center justify-between"
          >
            <span class="text-xs text-muted-foreground">总排放</span>
            <span class="data-num text-lg text-patina">12.4 tCO₂</span>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
