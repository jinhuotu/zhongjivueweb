<script setup lang="ts">
import { Cpu, Wrench, Plus, Search, ShieldCheck } from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, StatusDot, Tag } from '@/components/ui-kit'
import { devices } from '@/lib/mock'

function typeTone(type: string) {
  if (type === '绿电' || type === '储能') return 'patina' as const
  if (type === '环保') return 'coolant' as const
  return 'molybdenum' as const
}

function healthBarClass(health: number) {
  if (health >= 90) return 'h-full bg-patina'
  if (health >= 80) return 'h-full bg-molybdenum'
  if (health >= 70) return 'h-full bg-sulfur'
  return 'h-full bg-iron'
}
</script>

<template>
  <PageHeader
    title="设备资产"
    description="全厂能碳相关设备台账，含主设备 / 余热回收 / 环保治理 / 绿电储能。设备健康度由 OEE × 振动 × 温度 × 历史故障率综合计算。"
  >
    <template #actions>
      <button
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
      >
        <Search class="size-3.5" />检索
      </button>
      <button
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md bg-iron text-background hover:bg-iron/90"
      >
        <Plus class="size-3.5" />新增设备
      </button>
    </template>
  </PageHeader>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard :label="'设备总数'" :value="devices.length" unit="台" tone="molybdenum">
      <template #icon><Cpu class="size-4" /></template>
    </KpiCard>
    <KpiCard label="健康度均值" value="87.6" unit="分" tone="patina">
      <template #icon><ShieldCheck class="size-4" /></template>
    </KpiCard>
    <KpiCard label="待检修" value="3" unit="台" tone="sulfur" hint="本周到期">
      <template #icon><Wrench class="size-4" /></template>
    </KpiCard>
    <KpiCard label="设备资产净值" value="6.84" unit="亿元" tone="coolant" hint="2024 期末" />
  </div>

  <Panel title="资产清单" subtitle="按健康度排序" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[900px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in [
                '资产编号',
                '名称',
                '类型',
                '供应商',
                '投运时间',
                '状态',
                '健康度',
                '上次维保',
                '操作',
              ]"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="d in devices"
            :key="d.id"
            class="hover:bg-background/40 transition"
          >
            <td class="px-4 py-3 data-num text-muted-foreground">{{ d.id }}</td>
            <td class="px-4 py-3 font-medium">{{ d.name }}</td>
            <td class="px-4 py-3">
              <Tag :tone="typeTone(d.type)">{{ d.type }}</Tag>
            </td>
            <td class="px-4 py-3 text-foreground/80">{{ d.vendor }}</td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ d.install }}</td>
            <td class="px-4 py-3"><StatusDot :status="d.state" /></td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 rounded-full bg-background overflow-hidden">
                  <div :class="healthBarClass(d.health)" :style="{ width: `${d.health}%` }" />
                </div>
                <span class="data-num text-foreground/90">{{ d.health }}</span>
              </div>
            </td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ d.lastMaint }}</td>
            <td class="px-4 py-3">
              <button class="text-iron hover:underline">详情</button>
              <span class="text-border mx-1.5">|</span>
              <button class="text-muted-foreground hover:text-foreground">维保</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>
</template>
