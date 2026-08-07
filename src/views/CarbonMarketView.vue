<script setup lang="ts">
import { Coins, TrendingUp, ArrowDown, ArrowUp, Sun, Zap, Battery } from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import { TrendLine, DonutChart } from '@/components/ui-kit/charts'
import { carbonMarketTrades, COLOR } from '@/lib/mock'

const ceaPrice = Array.from({ length: 30 }, (_, i) => ({
  name: `${i + 1}`,
  CEA: +(86 + Math.sin(i / 4) * 6 + Math.random() * 2).toFixed(2),
  CCER: +(72 + Math.cos(i / 5) * 4 + Math.random() * 1.5).toFixed(2),
}))

const greenMix = [
  { name: '屋顶光伏', value: 1240, color: COLOR.sulfur },
  { name: '集中式光伏 PPA', value: 480, color: COLOR.iron },
  { name: '陆上风电', value: 260, color: COLOR.coolant },
  { name: '绿证 I-REC', value: 68, color: COLOR.patina },
]

const portfolio = [
  { name: '全国碳市场配额 CEA', amount: 42800, price: 88.4, color: COLOR.iron, share: 64 },
  { name: 'CCER 自愿减排', amount: 8200, price: 74.1, color: COLOR.patina, share: 12 },
  { name: '绿证 I-REC', amount: 800, price: 36.0, color: COLOR.coolant, share: 4 },
  { name: '配额储备金', amount: 14000, price: 90.0, color: COLOR.sulfur, share: 20 },
]

function tradeTone(type: string) {
  if (type.includes('CEA')) return 'iron' as const
  if (type.includes('CCER')) return 'patina' as const
  if (type.includes('绿电')) return 'coolant' as const
  return 'sulfur' as const
}
</script>

<template>
  <PageHeader
    title="碳市场 & 绿电"
    description="对接全国碳排放权交易市场（上海环境能源交易所） + CCER 自愿减排 + 绿电 / 绿证三大交易渠道，统一管控碳资产与绿电消纳。"
  >
    <template #badges>
      <Tag tone="patina">CEA · CCER · 绿证</Tag>
    </template>
  </PageHeader>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard label="CEA 持仓" value="42 800" unit="tCO₂" tone="iron" hint="均价 ¥88.40">
      <template #icon><Coins class="size-4" /></template>
    </KpiCard>
    <KpiCard label="CCER 持仓" value="8 200" unit="tCO₂" tone="patina" hint="均价 ¥74.10" />
    <KpiCard
      label="本年绿电消纳"
      value="2 048"
      unit="MWh"
      tone="coolant"
      :trend="{ value: '32.4%', up: true }"
    >
      <template #icon><Sun class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="年度交易盈亏"
      value="+184.6"
      unit="万元"
      tone="molybdenum"
      :trend="{ value: '21.8%', up: true }"
    >
      <template #icon><TrendingUp class="size-4" /></template>
    </KpiCard>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
    <Panel class-name="xl:col-span-2" title="碳价 30 日走势" subtitle="单位：元/tCO₂">
      <TrendLine
        :data="ceaPrice"
        :keys="[
          { key: 'CEA', color: COLOR.iron, label: '全国碳市场 CEA' },
          { key: 'CCER', color: COLOR.patina, label: 'CCER 自愿减排' },
        ]"
        y-unit=" 元"
        :height="280"
      />
    </Panel>
    <Panel title="绿电来源结构" subtitle="本年累计 2 048 MWh">
      <DonutChart :data="greenMix" :height="280" />
    </Panel>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
    <Panel title="光伏储能实时" flush>
      <div class="grid grid-cols-3 gap-3 p-5">
        <div class="text-center panel-elevated rounded-lg py-4">
          <Sun class="size-5 text-sulfur mx-auto mb-1.5" />
          <div class="text-[10px] text-muted-foreground">光伏出力</div>
          <div class="data-num text-lg font-semibold text-sulfur mt-1">8.42</div>
          <div class="text-[10px] text-muted-foreground">MW / 12MW</div>
        </div>
        <div class="text-center panel-elevated rounded-lg py-4">
          <Battery class="size-5 text-patina mx-auto mb-1.5" />
          <div class="text-[10px] text-muted-foreground">储能 SOC</div>
          <div class="data-num text-lg font-semibold text-patina mt-1">68%</div>
          <div class="text-[10px] text-muted-foreground">5.44 MWh</div>
        </div>
        <div class="text-center panel-elevated rounded-lg py-4">
          <Zap class="size-5 text-molybdenum mx-auto mb-1.5" />
          <div class="text-[10px] text-muted-foreground">市电反送</div>
          <div class="data-num text-lg font-semibold text-molybdenum mt-1">2.10</div>
          <div class="text-[10px] text-muted-foreground">MW</div>
        </div>
      </div>
      <div class="px-5 pb-5">
        <div class="rounded-md bg-background/40 p-3 border border-border text-xs">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-muted-foreground">今日峰谷套利预期</span>
            <span class="data-num text-patina font-semibold">+ ¥18 420</span>
          </div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-muted-foreground">谷时充电窗口</span>
            <span class="data-num">23:00 – 06:00</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">峰时放电窗口</span>
            <span class="data-num">10:00 – 12:00 / 18:00 – 21:00</span>
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="碳资产组合" flush>
      <div class="p-5 space-y-4">
        <div v-for="(p, i) in portfolio" :key="i">
          <div class="flex items-center justify-between text-xs mb-1.5">
            <span>{{ p.name }}</span>
            <div class="flex items-center gap-3">
              <span class="data-num text-muted-foreground">{{ p.amount.toLocaleString() }} t</span>
              <span class="data-num" :style="{ color: p.color }">¥{{ p.price.toFixed(2) }}</span>
            </div>
          </div>
          <div class="h-1.5 rounded-full bg-background overflow-hidden">
            <div
              class="h-full"
              :style="{ width: `${p.share * 1.5}%`, background: p.color }"
            />
          </div>
        </div>
        <div class="pt-3 mt-2 border-t border-border flex items-center justify-between">
          <span class="text-xs text-muted-foreground">组合市值</span>
          <span class="data-num text-lg text-foreground font-semibold">¥ 5 824 600</span>
        </div>
      </div>
    </Panel>
  </div>

  <Panel title="近期交易流水" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[800px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in ['交易日期', '品种', '方向', '价格', '数量', '金额', '交易对手 / 交易所']"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="(t, i) in carbonMarketTrades" :key="i" class="hover:bg-background/40">
            <td class="px-4 py-3 data-num text-muted-foreground">{{ t.date }}</td>
            <td class="px-4 py-3">
              <Tag :tone="tradeTone(t.type)">{{ t.type }}</Tag>
            </td>
            <td class="px-4 py-3">
              <span v-if="t.dir === 'buy'" class="inline-flex items-center gap-1 text-molybdenum">
                <ArrowDown class="size-3" />买入
              </span>
              <span v-else class="inline-flex items-center gap-1 text-iron">
                <ArrowUp class="size-3" />卖出
              </span>
            </td>
            <td class="px-4 py-3 data-num">¥ {{ t.price.toLocaleString() }}</td>
            <td class="px-4 py-3 data-num">{{ t.volume.toLocaleString() }}</td>
            <td class="px-4 py-3 data-num text-foreground/90">
              ¥ {{ (t.price * t.volume).toLocaleString(undefined, { maximumFractionDigits: 0 }) }}
            </td>
            <td class="px-4 py-3 text-muted-foreground">{{ t.party }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>
</template>
