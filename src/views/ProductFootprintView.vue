<script setup lang="ts">
import { computed, ref } from 'vue'
import { Package, Leaf, TrendingDown, ChevronRight, BadgeCheck } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { DonutChart, GroupBar } from '@/components/ui-kit/charts'
import { PRODUCTS_LCA, LCA_BREAKDOWN, COLOR } from '@/lib/mock'

type Tone = 'iron' | 'patina' | 'molybdenum' | 'sulfur'

const TEXT_CLS: Record<Tone, string> = {
  iron: 'text-iron',
  patina: 'text-patina',
  molybdenum: 'text-molybdenum',
  sulfur: 'text-sulfur',
}

const sel = ref(PRODUCTS_LCA[0])

const pieData = computed(() => [
  { name: '上游（原材料 + 运输）', value: sel.value.stages.up, color: '#FF6B35' },
  { name: '生产（车式窑工艺）', value: sel.value.stages.prod, color: '#F4C430' },
  { name: '下游（出厂 + 使用 + 处置）', value: sel.value.stages.down, color: '#7FB069' },
])

const lcaBarData = [
  { name: '原材料', kgCO2e: 642 },
  { name: '入厂运输', kgCO2e: 84 },
  { name: '车式窑工艺', kgCO2e: 526 },
  { name: '机加工', kgCO2e: 132 },
  { name: '包装出厂', kgCO2e: 38 },
  { name: '使用阶段', kgCO2e: 0 },
  { name: '寿终处置', kgCO2e: 28 },
]

const kpis: Array<{ label: string; value: string; hint: string; color: Tone }> = [
  { label: 'LCA 产品数', value: '5', hint: '覆盖 86% 产值', color: 'molybdenum' },
  { label: 'ISO 14067 认证', value: '2', hint: 'P-01 / P-02', color: 'patina' },
  { label: 'EPD 第三方声明', value: '1', hint: 'P-03 核电筒节', color: 'patina' },
  { label: '平均下降幅度', value: '-18.6%', hint: 'vs 基线值', color: 'iron' },
  { label: '客户披露次数', value: '124', hint: '2024 YTD', color: 'sulfur' },
]

const customers = [
  { customer: '欧洲风电整机厂 A', product: 'P-02 主轴锻件', items: 18, pdf: 'EPD-2024-Q3-A.pdf' },
  { customer: '国内核电集团 B', product: 'P-03 压力容器筒节', items: 6, pdf: 'EPD-2024-Q3-B.pdf' },
  { customer: '欧洲机床 C', product: 'P-01 大型铸钢件', items: 12, pdf: 'CFP-2024-Q3-C.pdf' },
]

function downPct(p: (typeof PRODUCTS_LCA)[number]) {
  return (((p.base - p.pcf) / p.base) * 100).toFixed(1)
}
</script>

<template>
  <Panel title="产品碳足迹概览 PCF" subtitle="ISO 14067 / GB/T 24067 · 从摇篮到大门 / 大门到坟墓">
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <div
        v-for="k in kpis"
        :key="k.label"
        class="rounded-md border border-hairline bg-bg-base/50 p-4"
      >
        <div :class="['text-xs', TEXT_CLS[k.color]]">{{ k.label }}</div>
        <div class="font-mono text-2xl mt-2 text-text-primary">{{ k.value }}</div>
        <div class="text-[11px] text-text-muted mt-1">{{ k.hint }}</div>
      </div>
    </div>
  </Panel>

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
    <Panel title="产品清单 (LCA)" subtitle="按车式窑产品归集" class-name="xl:col-span-1" flush>
      <div class="divide-y divide-hairline">
        <button
          v-for="p in PRODUCTS_LCA"
          :key="p.id"
          type="button"
          class="w-full text-left p-4 hover:bg-bg-base/40"
          :class="p.id === sel.id ? 'bg-molybdenum/10 border-l-2 border-molybdenum' : ''"
          @click="sel = p"
        >
          <div class="flex items-center justify-between">
            <div class="text-text-primary text-sm">{{ p.name }}</div>
            <ChevronRight class="w-3.5 h-3.5 text-text-muted" />
          </div>
          <div class="text-[11px] text-text-muted mt-1">
            {{ p.id }} · 产线 {{ p.furnace }} · 年产 {{ p.prodVol }}
          </div>
          <div class="flex items-center gap-3 mt-2 flex-wrap">
            <span class="font-mono text-iron text-sm">{{ p.pcf }} tCO₂/{{ p.unit }}</span>
            <span class="text-patina text-[11px] flex items-center gap-0.5">
              <TrendingDown class="w-3 h-3" />-{{ downPct(p) }}%
            </span>
            <span
              class="ml-auto px-2 py-0.5 rounded bg-patina/10 text-patina border border-patina/30 text-[10px] flex items-center gap-1"
            >
              <BadgeCheck class="w-3 h-3" />{{ p.cert }}
            </span>
          </div>
        </button>
      </div>
    </Panel>

    <Panel
      :title="`${sel.name} · 阶段碳排`"
      subtitle="生命周期阶段拆解"
      class-name="xl:col-span-2"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DonutChart :data="pieData" :height="288" />
        <div class="space-y-2">
          <div
            v-for="(s, i) in LCA_BREAKDOWN"
            :key="s.phase"
            class="flex items-start gap-3 p-2.5 rounded border border-hairline bg-bg-base/40"
          >
            <span
              class="w-6 h-6 rounded-full bg-molybdenum/20 text-molybdenum flex items-center justify-center text-[11px] font-mono"
            >
              {{ i + 1 }}
            </span>
            <div class="flex-1">
              <div class="text-[12px] text-text-primary">{{ s.phase }}</div>
              <div class="text-[11px] text-text-muted">{{ s.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  </div>

  <Panel title="LCA 碳因子明细" subtitle="基于 GaBi / ecoinvent 6.0 因子库 + 内部一手数据" class-name="mt-4">
    <GroupBar
      :data="lcaBarData"
      :keys="[{ key: 'kgCO2e', color: COLOR.iron, label: 'kgCO₂e' }]"
      :height="288"
    />
  </Panel>

  <Panel title="客户碳披露 & EPD" subtitle="按客户 / 行业出具产品碳证明" class-name="mt-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="c in customers"
        :key="c.customer"
        class="rounded border border-hairline bg-bg-base/40 p-4"
      >
        <div class="flex items-center justify-between">
          <span class="flex items-center gap-2 text-text-primary">
            <Leaf class="w-4 h-4 text-patina" />{{ c.customer }}
          </span>
          <span class="font-mono text-[11px] text-text-muted">×{{ c.items }}</span>
        </div>
        <div class="text-[12px] text-text-muted mt-2">{{ c.product }}</div>
        <div class="text-[11px] text-coolant mt-2 flex items-center gap-1">
          <Package class="w-3 h-3" />{{ c.pdf }}
        </div>
      </div>
    </div>
  </Panel>
</template>
