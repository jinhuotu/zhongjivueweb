<script setup lang="ts">
import { Package, ArrowRight, Flame, Weight } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_LOADING_RULES } from '@/lib/mock-extended'

const rules = APS_LOADING_RULES
const carts = ['窑车 A-01', '窑车 A-02', '窑车 B-01', '窑车 B-02', '窑车 C-01']

const suggestions = [
  { from: 'o2 (HA-75)', to: 'TC-03 · 07-01', gain: '装载率 +4.2%', icon: Weight },
  { from: 'o4 (MT-80)', to: 'TC-05 · 07-03', gain: '混装温差 -22℃', icon: Flame },
  { from: 'o1 (GY-90)', to: 'TC-01 · 06-30', gain: '换产时间 -2h', icon: ArrowRight },
]

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">装窑优化</h1>
      <p class="text-sm text-muted-foreground mt-1">
        装载效率最大化 · 混装规则 · 装载率优化 · 窑具/窑车调度
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel
        v-for="s in [
          { label: '平均装载率', value: 87.3, unit: '%', color: 'text-patina' },
          { label: '混装冲突', value: 2, unit: '单', color: 'text-sulfur' },
          { label: '窑车调度', value: 14, unit: '辆', color: 'text-molybdenum' },
          { label: '装载建议', value: 6, unit: '条', color: 'text-coolant' },
        ]"
        :key="s.label"
        class-name="!p-3"
      >
        <div class="text-[11px] text-muted-foreground">{{ s.label }}</div>
        <div class="mt-1 flex items-baseline gap-1">
          <span :class="['data-num text-xl font-semibold', s.color]">{{ s.value }}</span>
          <span class="text-xs text-muted-foreground">{{ s.unit }}</span>
        </div>
      </Panel>
    </div>

    <Panel title="混装规则库" :subtitle="`${rules.length} 条规则`">
      <template #action>
        <button :class="btn">+ 新增规则</button>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="r in rules"
          :key="r.id"
          class="panel-surface rounded border border-border-hairline p-3"
        >
          <div class="flex items-center gap-2 mb-2">
            <span
              class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
              :class="
                r.strict
                  ? 'bg-iron/15 text-iron border-iron/40'
                  : 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
              "
              >{{ r.strict ? '严格' : '建议' }}</span
            >
            <span class="text-xs font-medium">{{ r.name }}</span>
          </div>
          <div class="text-[11px] text-muted-foreground leading-tight">{{ r.desc }}</div>
          <div class="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>条件:</span>
            <span class="font-mono text-coolant">{{ r.condition }}</span>
          </div>
        </div>
      </div>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="窑车调度">
        <div class="space-y-2">
          <div
            v-for="(c, i) in carts"
            :key="c"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2"
          >
            <Package class="size-4 text-molybdenum" />
            <span class="text-xs font-mono flex-1">{{ c }}</span>
            <span
              class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
              :class="
                i < 2
                  ? 'bg-patina/15 text-patina border-patina/40'
                  : 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
              "
              >{{ i < 2 ? '装窑中' : '待命' }}</span
            >
            <span class="text-xs text-muted-foreground">{{ 70 + i * 5 }}%</span>
          </div>
        </div>
      </Panel>

      <Panel title="装载优化建议">
        <div class="space-y-2">
          <div
            v-for="(s, i) in suggestions"
            :key="i"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <div class="size-7 rounded bg-molybdenum/10 flex items-center justify-center">
              <component :is="s.icon" class="size-3.5 text-molybdenum" />
            </div>
            <div class="flex-1">
              <div class="text-xs">
                <span class="text-muted-foreground">{{ s.from }}</span>
                <ArrowRight class="size-3 inline mx-1 text-muted-foreground" />
                <span class="text-coolant">{{ s.to }}</span>
              </div>
              <div class="text-[11px] text-patina mt-0.5">{{ s.gain }}</div>
            </div>
            <button :class="btn">应用</button>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
