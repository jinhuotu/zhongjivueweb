<script setup lang="ts">
import { Zap, Flame, Droplet, Download, Calendar } from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import { TrendArea, GroupBar, DonutChart } from '@/components/ui-kit/charts'
import { energyMonth, energyMix, COLOR } from '@/lib/mock'

const consumerRanking = [
  { name: '4# 烧成车式窑', value: 482.6, share: 22.4, color: COLOR.iron },
  { name: '1# 退司车式窑', value: 408.2, share: 18.9, color: COLOR.sulfur },
  { name: '2# 正火车式窑', value: 362.8, share: 16.8, color: COLOR.molybdenum },
  { name: '3# 调质车式窑', value: 304.5, share: 14.1, color: COLOR.coolant },
  { name: '8# 核电消应车式窑', value: 218.4, share: 10.1, color: COLOR.patina },
  { name: '7# 风电主轴回火车式窑', value: 168.2, share: 7.8, color: '#E06B8A' },
  { name: '其他（5/6#）', value: 213.4, share: 9.9, color: '#5A6677' },
]

const processCompare = [
  { name: '退火', 本月: 152, 上月: 168, 标杆: 140 },
  { name: '正火', 本月: 178, 上月: 184, 标杆: 168 },
  { name: '调质', 本月: 196, 上月: 208, 标杆: 185 },
  { name: '回火', 本月: 88, 上月: 94, 标杆: 82 },
  { name: '去应力', 本月: 64, 上月: 71, 标杆: 60 },
  { name: '耐材烧成', 本月: 246, 上月: 252, 标杆: 230 },
]

const diagnostics = [
  {
    t: '11-08 12:18',
    d: '4# 烧成车式窑',
    m: '烟气余热回收效率',
    b: '67.8 %',
    a: '62.0 %',
    dev: '-5.8pp',
    lvl: 'medium' as const,
    s: '换热器吹灰 + 检查旁通阀密封',
  },
  {
    t: '11-08 09:42',
    d: '2# 正火车式窑',
    m: '单位产品燃气耗',
    b: '168 m³/t',
    a: '178 m³/t',
    dev: '+6.0%',
    lvl: 'high' as const,
    s: '空燃比 PID 重整 + 残氧 O₂ 校准',
  },
  {
    t: '11-07 16:22',
    d: '3# 调质车式窑',
    m: '蓄热式空气预热温度',
    b: '880 ℃',
    a: '812 ℃',
    dev: '-7.7%',
    lvl: 'medium' as const,
    s: '清理蓄热体堵塞 / 切换周期优化',
  },
  {
    t: '11-07 10:08',
    d: '1# 退火车式窑',
    m: '炉膛前后区温差',
    b: '≤15 ℃',
    a: '28 ℃',
    dev: '+86%',
    lvl: 'high' as const,
    s: '前区烧嘴流量重新匹配',
  },
  {
    t: '11-06 22:30',
    d: '7# 风电主轴回火车式窑',
    m: '升温速率',
    b: '80 ℃/h',
    a: '92 ℃/h',
    dev: '+15%',
    lvl: 'low' as const,
    s: '降低升温段烧嘴负荷至 65%',
  },
]

function lvlTone(lvl: 'high' | 'medium' | 'low') {
  if (lvl === 'high') return 'iron' as const
  if (lvl === 'medium') return 'sulfur' as const
  return 'coolant' as const
}

function lvlLabel(lvl: 'high' | 'medium' | 'low') {
  if (lvl === 'high') return '严重'
  if (lvl === 'medium') return '中等'
  return '轻微'
}
</script>

<template>
  <PageHeader
    title="能耗分析"
    description="按车式窑 / 燃料类型 / 热处理工序 / 时间四维度透视能耗结构，对标 GB 21369-2008《工业热处理炉节能监测》与 GB/T 17358-2009 单耗限额，识别异常能耗与节能空间。"
  >
    <template #badges>
      <Tag tone="molybdenum">数据范围 · 2024-11</Tag>
    </template>
    <template #actions>
      <button
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
      >
        <Calendar class="size-3.5" />选择周期
      </button>
      <button
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md bg-iron text-background hover:bg-iron/90"
      >
        <Download class="size-3.5" />导出 CSV
      </button>
    </template>
  </PageHeader>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard
      label="月综合能耗"
      value="21 580"
      unit="tce"
      tone="iron"
      :trend="{ value: '6.4%', up: false }"
      hint="vs 上月"
    >
      <template #icon><Zap class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="单位产品燃气耗"
      value="162.4"
      unit="m³/t"
      tone="sulfur"
      :trend="{ value: '2.8%', up: false }"
      hint="GB 21369 限定 ≤168"
    >
      <template #icon><Flame class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="天然气占比"
      value="78.4"
      unit="%"
      tone="molybdenum"
      :trend="{ value: '1.2%', up: false }"
    >
      <template #icon><Flame class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="冷却水耗"
      value="0.82"
      unit="m³/t"
      tone="coolant"
      :trend="{ value: '3.1%', up: false }"
    >
      <template #icon><Droplet class="size-4" /></template>
    </KpiCard>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
    <Panel class-name="xl:col-span-2" title="本月日度能耗结构" subtitle="单位：tce/d">
      <TrendArea
        :data="energyMonth"
        :keys="[
          { key: '天然气', color: COLOR.sulfur },
          { key: '辅助电力', color: COLOR.molybdenum },
          { key: '蒸汽', color: COLOR.iron },
        ]"
        :height="300"
      />
    </Panel>
    <Panel title="能源结构" subtitle="本月折标煤占比">
      <DonutChart :data="energyMix" :height="300" />
    </Panel>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
    <Panel title="热处理工序单耗对比" subtitle="按 GB 21369 折算单位产品燃气耗（m³/t）">
      <GroupBar
        :data="processCompare"
        :keys="[
          { key: '本月', color: COLOR.iron },
          { key: '上月', color: COLOR.molybdenum },
          { key: '标杆', color: COLOR.patina },
        ]"
        y-unit=" m³/t"
        :height="280"
      />
    </Panel>

    <Panel title="设备能耗排行" subtitle="单位：tce" flush>
      <div class="p-4 space-y-3">
        <div v-for="(c, i) in consumerRanking" :key="c.name">
          <div class="flex items-center justify-between text-xs mb-1">
            <div class="flex items-center gap-2">
              <span class="data-num text-muted-foreground w-4">{{ i + 1 }}</span>
              <span>{{ c.name }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="data-num text-foreground/80">{{ c.value.toFixed(1) }}</span>
              <span class="data-num text-muted-foreground w-12 text-right">{{ c.share }}%</span>
            </div>
          </div>
          <div class="h-1.5 rounded-full bg-background overflow-hidden">
            <div class="h-full" :style="{ width: `${c.share * 4}%`, background: c.color }" />
          </div>
        </div>
      </div>
    </Panel>
  </div>

  <Panel title="能耗异常诊断" subtitle="基于 EnPI 能源绩效指标偏差分析（车式窑）" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[900px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in [
                '发现时间',
                '车式窑 / 工序',
                '指标',
                '基线',
                '实际',
                '偏差',
                '等级',
                '建议措施',
              ]"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="(r, i) in diagnostics" :key="i" class="hover:bg-background/40">
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.t }}</td>
            <td class="px-4 py-3">{{ r.d }}</td>
            <td class="px-4 py-3 text-foreground/85">{{ r.m }}</td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.b }}</td>
            <td class="px-4 py-3 data-num">{{ r.a }}</td>
            <td class="px-4 py-3 data-num text-iron">{{ r.dev }}</td>
            <td class="px-4 py-3">
              <Tag :tone="lvlTone(r.lvl)">{{ lvlLabel(r.lvl) }}</Tag>
            </td>
            <td class="px-4 py-3 text-muted-foreground">{{ r.s }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>
</template>
