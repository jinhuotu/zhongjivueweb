<script setup lang="ts">
import { CloudCog, Leaf, FileText, Download, ShieldCheck, BookOpen } from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import { TrendArea, DonutChart, GroupBar } from '@/components/ui-kit/charts'
import { carbonTrend24h, carbonScope, COLOR } from '@/lib/mock'

const monthlyCarbon = Array.from({ length: 12 }, (_, i) => ({
  name: `${i + 1}月`,
  范围一: +(6800 - i * 120 + Math.sin(i) * 320).toFixed(0),
  范围二: +(1240 - i * 22 + Math.cos(i) * 90).toFixed(0),
  范围三: +(420 + Math.sin(i / 2) * 60).toFixed(0),
}))

const factorRows = [
  { n: '天然气（NG）', u: 'tCO₂/万m³', f: '21.6210', s: 'GB/T 32151.1', v: '2024' },
  { n: '焦炉煤气（备用）', u: 'tCO₂/万m³', f: '8.4070', s: 'GB/T 32151.1', v: '2024' },
  { n: '液化石油气 LPG', u: 'tCO₂/t', f: '3.1013', s: 'GB/T 32151.1', v: '2024' },
  { n: '轻柴油（点火/应急）', u: 'tCO₂/t', f: '3.0959', s: 'IPCC 2006', v: '2019 修订' },
  { n: '外购电力（华北区域）', u: 'tCO₂/MWh', f: '0.7921', s: '生态环境部 2024 公告', v: '2024' },
  { n: '外购蒸汽', u: 'tCO₂/GJ', f: '0.1100', s: 'GB/T 32151.1', v: '2024' },
  { n: '甲烷上游逸散（范围三）', u: 'tCO₂e/万m³', f: '0.7280', s: 'IPCC AR6', v: '2023' },
]

const scope1Rows = [
  { src: '燃料燃烧', d: '4# 烧成车式窑', f: '天然气', a: '928 万m³', ef: '21.6210', e: '20 065', p: 25.6 },
  { src: '燃料燃烧', d: '1# 退火车式窑', f: '天然气', a: '742 万m³', ef: '21.6210', e: '16 043', p: 20.5 },
  { src: '燃料燃烧', d: '2# 正火车式窑', f: '天然气', a: '684 万m³', ef: '21.6210', e: '14 789', p: 18.9 },
  { src: '燃料燃烧', d: '3# 调质车式窑', f: '天然气', a: '562 万m³', ef: '21.6210', e: '12 151', p: 15.5 },
  { src: '燃料燃烧', d: '7# 风电主轴回火车式窑', f: '天然气', a: '294 万m³', ef: '21.6210', e: '6 357', p: 8.1 },
  { src: '燃料燃烧', d: '5#/6# 大件车式窑', f: '天然气', a: '348 万m³', ef: '21.6210', e: '7 524', p: 9.6 },
  { src: '应急点火', d: '全车间', f: '轻柴油', a: '18 t', ef: '3.0959', e: '56', p: 0.1 },
  { src: '备用燃料', d: '8# 核电消应车式窑', f: '焦炉煤气', a: '142 万m³', ef: '8.4070', e: '1 194', p: 1.7 },
]
</script>

<template>
  <PageHeader
    title="碳排核算"
    description="依据 GB/T 32151 系列温室气体排放核算与报告要求 + GB/T 13338-2018 燃料炉热平衡 + ISO 14064-1 标准，对 8 台燃气车式窑自动核算范围一 / 二 / 三排放，生成可追溯审计的碳账本。"
  >
    <template #badges>
      <Tag tone="patina">GB/T 32151.1-2024</Tag>
      <Tag tone="molybdenum">ISO 14064-1</Tag>
    </template>
    <template #actions>
      <button
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md bg-iron text-background hover:bg-iron/90"
      >
        <Download class="size-3.5" />导出排放清单
      </button>
    </template>
  </PageHeader>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard
      label="本年累计排放"
      value="78 420"
      unit="tCO₂e"
      tone="iron"
      :trend="{ value: '12.4%', up: false }"
    >
      <template #icon><CloudCog class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="碳排强度"
      value="0.42"
      unit="tCO₂/t产品"
      tone="patina"
      :trend="{ value: '8.6%', up: false }"
    >
      <template #icon><Leaf class="size-4" /></template>
    </KpiCard>
    <KpiCard label="范围一占比" value="82.6" unit="%" tone="sulfur" hint="天然气燃烧主导">
      <template #icon><FileText class="size-4" /></template>
    </KpiCard>
    <KpiCard label="数据完整性评分" value="98.6" unit="分" tone="coolant" hint="第三方核查就绪">
      <template #icon><ShieldCheck class="size-4" /></template>
    </KpiCard>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
    <Panel class-name="xl:col-span-2" title="本年度月度碳排趋势" subtitle="按 GHG Protocol 范围划分">
      <GroupBar
        :data="monthlyCarbon"
        :keys="[
          { key: '范围一', color: COLOR.iron },
          { key: '范围二', color: COLOR.molybdenum },
          { key: '范围三', color: COLOR.coolant },
        ]"
        y-unit=" t"
        :height="300"
      />
    </Panel>
    <Panel title="排放范围构成" subtitle="本年累计">
      <DonutChart :data="carbonScope" :height="300" />
    </Panel>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
    <Panel title="24h 排放 vs 配额基线" subtitle="结合 CEA 全国碳市场配额">
      <TrendArea
        :data="carbonTrend24h"
        :keys="[
          { key: '实际排放', color: COLOR.iron },
          { key: '配额基线', color: COLOR.molybdenum },
        ]"
        y-unit=" t"
        :height="260"
      />
    </Panel>

    <Panel title="排放因子库" flush>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="text-muted-foreground bg-background/40">
            <tr class="border-b border-border">
              <th
                v-for="h in ['能源/原料', '单位', '排放因子', '来源', '版本']"
                :key="h"
                class="text-left font-medium px-4 py-2.5"
              >
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="(r, i) in factorRows" :key="i" class="hover:bg-background/40">
              <td class="px-4 py-2.5">{{ r.n }}</td>
              <td class="px-4 py-2.5 text-muted-foreground">{{ r.u }}</td>
              <td class="px-4 py-2.5 data-num text-iron">{{ r.f }}</td>
              <td class="px-4 py-2.5 text-foreground/80">{{ r.s }}</td>
              <td class="px-4 py-2.5 data-num text-muted-foreground">{{ r.v }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </div>

  <Panel
    title="范围一排放明细 · 直接排放"
    subtitle="按设备 + 燃料类型核算，支持追溯到分钟级原始数据"
    flush
  >
    <template #action>
      <button class="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <BookOpen class="size-3" />核算方法
      </button>
    </template>
    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[900px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in ['排放源', '设备', '燃料/物料', '活动数据', '排放因子', '排放量 (tCO₂e)', '占比']"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="(r, i) in scope1Rows" :key="i" class="hover:bg-background/40">
            <td class="px-4 py-3"><Tag tone="iron">{{ r.src }}</Tag></td>
            <td class="px-4 py-3">{{ r.d }}</td>
            <td class="px-4 py-3 text-foreground/80">{{ r.f }}</td>
            <td class="px-4 py-3 data-num">{{ r.a }}</td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.ef }}</td>
            <td class="px-4 py-3 data-num text-iron font-semibold">{{ r.e }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="w-16 h-1 rounded-full bg-background overflow-hidden">
                  <div class="h-full bg-iron" :style="{ width: `${r.p * 4}%` }" />
                </div>
                <span class="data-num text-muted-foreground">{{ r.p }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>
</template>
