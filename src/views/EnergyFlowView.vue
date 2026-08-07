<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { Lightbulb, Gauge, Recycle, Activity, ArrowRight } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import Sankey from '@/components/ui-kit/Sankey.vue'
import { ENERGY_FLOW } from '@/lib/mock'

type Period = 'realtime' | 'day' | 'week' | 'month'
type Tone = 'patina' | 'coolant' | 'sulfur' | 'iron'

const period = ref<Period>('realtime')

const COLOR_CLS: Record<Tone, string> = {
  patina: 'text-patina',
  coolant: 'text-coolant',
  sulfur: 'text-sulfur',
  iron: 'text-iron',
}

const totals = computed(() => {
  const cols = ENERGY_FLOW.columns
  const inputs = cols[0].nodes.reduce((s, n) => s + n.value, 0)
  const effective = cols[2].nodes.find((n) => n.id === 'EFFECT')?.value ?? 0
  const reco = cols[2].nodes.find((n) => n.id === 'RECO')?.value ?? 0
  const stack = cols[2].nodes.find((n) => n.id === 'STACK')?.value ?? 0
  return {
    inputs,
    eff: ((effective / inputs) * 100).toFixed(1),
    reco: ((reco / inputs) * 100).toFixed(1),
    stack: ((stack / inputs) * 100).toFixed(1),
  }
})

const kpis: Array<{
  icon: Component
  label: string
  value: string
  hint: string
  color: Tone
}> = [
  {
    icon: Gauge,
    label: '设备综合热效率 η',
    value: '',
    hint: '对标 GB 21369 先进值 45%',
    color: 'patina',
  },
  {
    icon: Recycle,
    label: '余热回收率',
    value: '',
    hint: '目标 ≥ 16%',
    color: 'coolant',
  },
  {
    icon: Activity,
    label: '排烟损失占比',
    value: '',
    hint: 'GB 21369 限定值 ≤ 32%',
    color: 'sulfur',
  },
  {
    icon: Lightbulb,
    label: '损耗 → 节能潜力',
    value: '86 GJ/h',
    hint: '折合 380 万元/年',
    color: 'iron',
  },
]

const kpiValues = computed(() => [
  `${totals.value.eff}%`,
  `${totals.value.reco}%`,
  `${totals.value.stack}%`,
  '86 GJ/h',
])

const kilnRanking = computed(() =>
  ENERGY_FLOW.columns[1].nodes
    .filter((n) => n.id !== 'AUX')
    .slice()
    .sort((a, b) => b.value - a.value),
)

function periodLabel(p: Period) {
  if (p === 'realtime') return '实时'
  if (p === 'day') return '日'
  if (p === 'week') return '周'
  return '月'
}
</script>

<template>
  <Panel
    title="能流分析 · Sankey 桑基图"
    :subtitle="`基于 GB/T 17358 / GB 21369 实时核算 · 单位 GJ/h · 总入能 ${totals.inputs} GJ/h`"
    flush
  >
    <template #action>
      <div class="flex items-center gap-1 text-[12px]">
        <button
          v-for="p in (['realtime', 'day', 'week', 'month'] as const)"
          :key="p"
          class="px-3 py-1 rounded"
          :class="
            period === p
              ? 'bg-molybdenum/20 text-molybdenum border border-molybdenum/40'
              : 'border border-hairline text-text-muted hover:text-text-primary'
          "
          @click="period = p"
        >
          {{ periodLabel(p) }}
        </button>
      </div>
    </template>

    <div class="p-4 lg:p-6">
      <Sankey
        :columns="ENERGY_FLOW.columns"
        :links="ENERGY_FLOW.links"
        :width="1100"
        :height="560"
        unit="GJ/h"
      />
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div
          v-for="(k, i) in kpis"
          :key="k.label"
          class="rounded-md border border-hairline bg-bg-base/50 p-4"
        >
          <div class="flex items-center gap-2 text-xs" :class="COLOR_CLS[k.color]">
            <component :is="k.icon" class="w-4 h-4" />
            <span>{{ k.label }}</span>
          </div>
          <div class="font-mono text-2xl mt-2 text-text-primary">{{ kpiValues[i] }}</div>
          <div class="text-[11px] text-text-muted mt-1">{{ k.hint }}</div>
        </div>
      </div>
    </div>
  </Panel>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
    <Panel title="能源输入构成" subtitle="按一次能源折标煤" flush>
      <div class="p-4 space-y-3">
        <div v-for="n in ENERGY_FLOW.columns[0].nodes" :key="n.id" class="space-y-1">
          <div class="flex justify-between text-[12px]">
            <span class="flex items-center gap-2 text-text-primary">
              <span class="w-2 h-2 rounded-full" :style="{ background: n.color }" />
              {{ n.name }}
            </span>
            <span class="font-mono text-text-muted"
              >{{ n.value }} GJ/h · {{ ((n.value / totals.inputs) * 100).toFixed(1) }}%</span
            >
          </div>
          <div class="h-1.5 rounded bg-bg-base overflow-hidden">
            <div
              class="h-full"
              :style="{
                width: `${((n.value / totals.inputs) * 100).toFixed(1)}%`,
                background: n.color,
              }"
            />
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="车式窑能耗排行" subtitle="按设备汇总 (含燃气 + 电 + 蒸汽)" flush>
      <div class="p-4 space-y-3">
        <div v-for="(n, i) in kilnRanking" :key="n.id" class="flex items-center gap-3">
          <span class="w-5 font-mono text-iron text-[11px]">#{{ i + 1 }}</span>
          <span class="flex-1 text-[12px] text-text-primary">{{ n.name }}</span>
          <span class="font-mono text-[12px]">{{ n.value }} GJ/h</span>
        </div>
      </div>
    </Panel>

    <Panel title="用能去向占比" subtitle="终端用能分布" flush>
      <div class="p-4 space-y-3">
        <div
          v-for="n in ENERGY_FLOW.columns[2].nodes"
          :key="n.id"
          class="flex items-center gap-3 text-[12px]"
        >
          <span
            class="w-2 h-2 rounded-full"
            :class="n.id === 'EFFECT' || n.id === 'RECO' ? 'bg-patina' : 'bg-iron'"
          />
          <span class="flex-1 text-text-primary">{{ n.name }}</span>
          <span class="font-mono text-text-muted">{{ n.value }} GJ/h</span>
          <span
            class="font-mono w-12 text-right"
            :class="n.id === 'EFFECT' || n.id === 'RECO' ? 'text-patina' : 'text-iron'"
          >
            {{ ((n.value / totals.inputs) * 100).toFixed(1) }}%
          </span>
        </div>
      </div>
    </Panel>
  </div>

  <Panel title="损耗诊断与节能机会" subtitle="基于桑基连边 + 知识库工艺规程" class-name="mt-4" flush>
    <div class="divide-y divide-hairline">
      <div
        v-for="d in ENERGY_FLOW.diagnostics"
        :key="d.id"
        class="flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-4 px-5 py-4"
      >
        <div class="w-12 font-mono text-iron text-xs shrink-0">{{ d.id }}</div>
        <div class="w-40 text-text-primary text-sm shrink-0">{{ d.target }}</div>
        <div class="w-44 font-mono text-sulfur text-[12px] shrink-0">{{ d.loss }}</div>
        <div class="w-28 text-text-muted text-[12px] shrink-0">{{ d.pct }}</div>
        <div class="flex-1 flex items-center gap-2 text-[12px] text-patina">
          <ArrowRight class="w-3.5 h-3.5 shrink-0" />
          <span>{{ d.advice }}</span>
        </div>
      </div>
    </div>
  </Panel>
</template>
