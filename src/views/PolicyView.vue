<script setup lang="ts">
import {
  ShieldCheck,
  FileCheck,
  CircleAlert,
  BookMarked,
  ChevronRight,
} from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import { policies } from '@/lib/mock'

const benchmarks = [
  { name: '退火工序 单位产品燃气耗', tag: 1, limit: 168, std: 152, lead: 140, mine: 152, unit: 'm³/t' },
  { name: '正火工序 单位产品燃气耗', tag: 2, limit: 195, std: 178, lead: 168, mine: 178, unit: 'm³/t' },
  { name: '调质工序 单位产品燃气耗', tag: 3, limit: 215, std: 196, lead: 185, mine: 196, unit: 'm³/t' },
  { name: '炉子热效率（GB 21369）', tag: 4, limit: 60, std: 70, lead: 80, mine: 76, unit: '%' },
]

const risks = [
  {
    name: '2024 年度排放数据报告',
    deadline: '2025-03-31',
    days: 143,
    level: 'high' as const,
    action: '准备 MRV 第三方核查报告（8 台车式窑）',
  },
  {
    name: 'GB 21369 新版强制实施',
    deadline: '2025-06-01',
    days: 205,
    level: 'medium' as const,
    action: '2# 正火窑单耗需再降 10 m³/t',
  },
  {
    name: 'CCER 余热回收项目方法学备案',
    deadline: '2025-01-15',
    days: 68,
    level: 'medium' as const,
    action: '提交 4# 烧成窑 ORC 项目立项材料',
  },
  {
    name: 'CBAM 申报试运行（出口锻件）',
    deadline: '2026-01-01',
    days: 419,
    level: 'low' as const,
    action: '建立产品碳足迹追溯数据库',
  },
]

function levelTone(level: string) {
  if (level.includes('强制')) return 'iron' as const
  if (level.includes('国务院')) return 'sulfur' as const
  return 'molybdenum' as const
}

function progressBarCls(progress: number) {
  if (progress === 100) return 'h-full bg-patina'
  if (progress > 70) return 'h-full bg-molybdenum'
  return 'h-full bg-sulfur'
}

function progressTextCls(progress: number) {
  if (progress === 100) return 'data-num text-patina'
  if (progress > 70) return 'data-num text-molybdenum'
  return 'data-num text-sulfur'
}

function riskIconCls(level: 'high' | 'medium' | 'low') {
  if (level === 'high') return 'size-4 text-iron mt-0.5'
  if (level === 'medium') return 'size-4 text-sulfur mt-0.5'
  return 'size-4 text-coolant mt-0.5'
}

function daysCls(days: number) {
  if (days < 90) return 'text-iron'
  if (days < 180) return 'text-sulfur'
  return 'text-foreground'
}

const doneCount = policies.filter((p) => p.status === 'done').length
const inProgressCount = policies.filter((p) => p.status === 'inprogress').length
</script>

<template>
  <PageHeader
    title="政策合规"
    description="跟踪国家级 / 部委级 / 行业级双碳政策、能耗限额国标、碳市场规则文件，自动比对企业当前达成水平，确保合规底线。"
  >
    <template #badges>
      <Tag tone="iron">双碳 1+N</Tag>
      <Tag tone="molybdenum">CBAM 接轨准备</Tag>
    </template>
  </PageHeader>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard label="跟踪政策" :value="policies.length" unit="项" tone="molybdenum">
      <template #icon><BookMarked class="size-4" /></template>
    </KpiCard>
    <KpiCard label="已合规" :value="doneCount" unit="项" tone="patina">
      <template #icon><FileCheck class="size-4" /></template>
    </KpiCard>
    <KpiCard label="进行中" :value="inProgressCount" unit="项" tone="sulfur">
      <template #icon><ShieldCheck class="size-4" /></template>
    </KpiCard>
    <KpiCard label="风险提示" value="2" unit="项" tone="iron" hint="60 天内到期">
      <template #icon><CircleAlert class="size-4" /></template>
    </KpiCard>
  </div>

  <Panel title="重点政策清单" subtitle="按生效时间倒序" flush>
    <ul class="divide-y divide-border">
      <li
        v-for="p in policies"
        :key="p.code"
        class="px-5 py-4 hover:bg-background/40 transition cursor-pointer group"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <Tag :tone="levelTone(p.level)">{{ p.level }}</Tag>
              <span class="data-num text-[11px] text-muted-foreground">{{ p.code }}</span>
              <span class="text-[11px] text-muted-foreground">· 发布：{{ p.issuer }}</span>
            </div>
            <div class="text-sm font-medium leading-snug group-hover:text-iron transition">
              {{ p.name }}
            </div>
            <div class="mt-2.5 flex items-center gap-6 text-[11px] flex-wrap">
              <span class="text-muted-foreground">
                生效：<span class="data-num text-foreground/85">{{ p.effective }}</span>
              </span>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground">达成进度</span>
                <div class="w-32 h-1.5 rounded-full bg-background overflow-hidden">
                  <div :class="progressBarCls(p.progress)" :style="{ width: `${p.progress}%` }" />
                </div>
                <span :class="progressTextCls(p.progress)">{{ p.progress }}%</span>
              </div>
            </div>
          </div>
          <ChevronRight class="size-4 text-muted-foreground group-hover:text-iron transition mt-1" />
        </div>
      </li>
    </ul>
  </Panel>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
    <Panel title="GB 21369 + GB/T 17358 车式窑能效对标">
      <div class="space-y-4 text-xs">
        <div v-for="r in benchmarks" :key="r.name">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-foreground/90">{{ r.tag }}. {{ r.name }}</span>
            <span class="data-num text-muted-foreground">
              本厂 <span class="text-foreground">{{ r.mine }}</span> {{ r.unit }}
            </span>
          </div>
          <div class="relative h-2 rounded-full bg-background overflow-hidden">
            <div class="absolute inset-y-0 left-0 bg-iron/40" style="width: 40%" />
            <div class="absolute inset-y-0 left-[40%] bg-sulfur/40" style="width: 30%" />
            <div class="absolute inset-y-0 left-[70%] bg-patina/40" style="width: 30%" />
            <div class="absolute top-0 bottom-0 w-0.5 bg-iron" style="left: 55%" />
          </div>
          <div class="flex justify-between text-[10px] text-muted-foreground mt-1 data-num">
            <span>限定值 {{ r.limit }}</span>
            <span>基准 {{ r.std }}</span>
            <span>标杆 {{ r.lead }}</span>
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="即将到期 / 风险项">
      <ul class="space-y-3">
        <li v-for="(r, i) in risks" :key="i" class="rounded-md panel-elevated p-3">
          <div class="flex items-start gap-2">
            <CircleAlert :class="riskIconCls(r.level)" />
            <div class="flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium">{{ r.name }}</span>
                <span class="data-num text-[11px] text-muted-foreground shrink-0">
                  剩余 <span :class="daysCls(r.days)">{{ r.days }}</span> 天
                </span>
              </div>
              <div class="text-[11px] text-muted-foreground mt-1">
                截止 <span class="data-num">{{ r.deadline }}</span> · {{ r.action }}
              </div>
            </div>
          </div>
        </li>
      </ul>
    </Panel>
  </div>
</template>
