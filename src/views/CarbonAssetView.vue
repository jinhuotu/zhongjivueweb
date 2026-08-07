<script setup lang="ts">
import { computed } from 'vue'
import { Coins, ArrowUpRight, ArrowDownRight, BadgeCheck } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { DonutChart } from '@/components/ui-kit/charts'
import {
  CARBON_ASSETS,
  CARBON_ASSET_BREAKDOWN,
  CARBON_ASSET_OPS,
  ASSET_STRATEGIES,
} from '@/lib/mock'

type Tone = 'iron' | 'patina' | 'molybdenum' | 'sulfur'

const TEXT_CLS: Record<Tone, string> = {
  iron: 'text-iron',
  patina: 'text-patina',
  molybdenum: 'text-molybdenum',
  sulfur: 'text-sulfur',
}

const OP_BADGE: Record<string, string> = {
  买入: 'bg-patina/15 text-patina border border-patina/30',
  卖出: 'bg-iron/15 text-iron border border-iron/30',
  注销: 'bg-sulfur/15 text-sulfur border border-sulfur/30',
  认购: 'bg-molybdenum/15 text-molybdenum border border-molybdenum/30',
}

const PIE_COLORS: Record<string, string> = {
  'CEA 配额': '#4A9EFF',
  'CCER 减排量': '#7FB069',
  '绿证 GEC': '#F4C430',
  'CCER 远期合约': '#5DD3E0',
}

const pie = computed(() =>
  CARBON_ASSET_BREAKDOWN.map((a) => ({
    name: a.kind,
    value: a.held,
    color: PIE_COLORS[a.kind] ?? '#FF6B35',
  })),
)

const kpis: Array<{ label: string; value: string; hint: string; color: Tone }> = [
  {
    label: 'CEA 配额 (t)',
    value: CARBON_ASSETS.totalCEA.toLocaleString(),
    hint: '全国碳市场',
    color: 'molybdenum',
  },
  {
    label: 'CCER 减排量 (t)',
    value: CARBON_ASSETS.totalCCER.toLocaleString(),
    hint: '含远期 8 K t',
    color: 'patina',
  },
  {
    label: '绿证 GEC (张)',
    value: CARBON_ASSETS.totalGEC.toLocaleString(),
    hint: '折抵范围二',
    color: 'sulfur',
  },
  {
    label: '净持有 (tCO₂e)',
    value: CARBON_ASSETS.netPosition.toLocaleString(),
    hint: '多头敞口',
    color: 'iron',
  },
  {
    label: '账面价值 (元)',
    value: `¥ ${(CARBON_ASSETS.monetaryValue / 10000).toFixed(0)} 万`,
    hint: '按市价估值',
    color: 'patina',
  },
]

function formatPrice(price: number | string) {
  return typeof price === 'number' ? `¥ ${price.toFixed(1)}` : price
}
</script>

<template>
  <Panel title="碳资产总览" subtitle="持仓 / 货币化 / 净敞口 — 实时 mark-to-market">
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
    <Panel title="资产结构" subtitle="配额 + CCER + 绿证" class-name="xl:col-span-1">
      <DonutChart :data="pie" :height="320" />
    </Panel>

    <Panel title="资产明细" subtitle="持仓成本 vs 当前市价 vs YTD 损益" class-name="xl:col-span-2" flush>
      <table class="w-full text-[12px]">
        <thead class="text-text-muted">
          <tr class="border-b border-hairline">
            <th class="text-left px-4 py-3">资产</th>
            <th class="text-right">持有量</th>
            <th class="text-right">成本均价</th>
            <th class="text-right">市场价</th>
            <th class="text-right pr-4">YTD 损益</th>
            <th class="text-center px-3">头寸</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-hairline">
          <tr v-for="a in CARBON_ASSET_BREAKDOWN" :key="a.kind" class="hover:bg-bg-base/40">
            <td class="px-4 py-2.5 text-text-primary">
              <span class="flex items-center gap-2">
                <Coins class="w-3.5 h-3.5 text-sulfur" />{{ a.kind }}
              </span>
            </td>
            <td class="font-mono text-right">{{ a.held.toLocaleString() }}</td>
            <td class="font-mono text-right text-text-muted">¥ {{ a.avgCost.toFixed(1) }}</td>
            <td class="font-mono text-right text-molybdenum">¥ {{ a.marketPrice.toFixed(1) }}</td>
            <td
              class="font-mono text-right pr-4"
              :class="a.ytdPL > 0 ? 'text-patina' : 'text-iron'"
            >
              <span class="inline-flex items-center gap-0.5">
                <ArrowUpRight v-if="a.ytdPL > 0" class="w-3 h-3" />
                <ArrowDownRight v-else class="w-3 h-3" />
                ¥ {{ Math.abs(a.ytdPL).toLocaleString() }}
              </span>
            </td>
            <td class="text-center px-3">
              <span
                class="px-2 py-0.5 rounded text-[11px] bg-molybdenum/10 text-molybdenum border border-molybdenum/30"
              >
                {{ a.status === 'long' ? '现货多头' : '远期合约' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  </div>

  <Panel title="资产运作策略" subtitle="对应集团 ESG / 履约 / 增信 三大目标" class-name="mt-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <div
        v-for="s in ASSET_STRATEGIES"
        :key="s.id"
        class="rounded border border-hairline bg-bg-base/40 p-3"
      >
        <div class="flex items-center justify-between">
          <span class="font-mono text-[10px] text-text-muted">{{ s.id }}</span>
          <span
            :class="[
              'px-2 py-0.5 rounded text-[10px]',
              s.status === '已完成'
                ? 'bg-patina/15 text-patina'
                : 'bg-molybdenum/15 text-molybdenum',
            ]"
          >
            {{ s.status }}
          </span>
        </div>
        <div class="text-[13px] text-text-primary mt-2">{{ s.name }}</div>
        <div class="text-[11px] text-text-muted mt-1 leading-relaxed">{{ s.logic }}</div>
        <div class="text-[11px] text-sulfur mt-2 flex items-center gap-1">
          <BadgeCheck class="w-3 h-3" />目标 {{ s.target }}
        </div>
      </div>
    </div>
  </Panel>

  <Panel title="近期交易流水" subtitle="覆盖 全国碳市场 / 北交所 / 上海环交 / OTC" class-name="mt-4" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-[12px] min-w-[800px]">
        <thead class="text-text-muted">
          <tr class="border-b border-hairline">
            <th class="text-left px-4 py-3">日期</th>
            <th class="text-left">操作</th>
            <th class="text-left">品种</th>
            <th class="text-right">数量</th>
            <th class="text-right">价格</th>
            <th class="text-right">金额</th>
            <th class="text-left px-3">对手方</th>
            <th class="text-left">操作员</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-hairline">
          <tr v-for="(o, i) in CARBON_ASSET_OPS" :key="i" class="hover:bg-bg-base/40">
            <td class="px-4 py-2.5 text-text-muted font-mono">{{ o.date }}</td>
            <td>
              <span
                :class="[
                  'px-2 py-0.5 rounded text-[11px] border',
                  OP_BADGE[o.op] ?? 'bg-molybdenum/15 text-molybdenum border-molybdenum/30',
                ]"
              >
                {{ o.op }}
              </span>
            </td>
            <td class="text-text-primary">{{ o.kind }}</td>
            <td class="font-mono text-right">{{ o.volume.toLocaleString() }}</td>
            <td class="font-mono text-right text-text-muted">{{ formatPrice(o.price) }}</td>
            <td class="font-mono text-right text-molybdenum">
              {{ o.amount > 0 ? `¥ ${o.amount.toLocaleString()}` : '—' }}
            </td>
            <td class="px-3 text-[11px] text-text-muted">{{ o.counter }}</td>
            <td class="text-text-muted">{{ o.operator }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>
</template>
