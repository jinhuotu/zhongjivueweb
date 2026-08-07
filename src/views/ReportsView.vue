<script setup lang="ts">
import {
  CircleCheck,
  Clock,
  Download,
  Eye,
  FileChartColumn,
  FileText,
  Plus,
} from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import { reportsHistory } from '@/lib/mock'

const templates = [
  { name: '能碳日报', desc: '每日 08:00 自动生成，含能耗 / 碳排 / 告警', icon: '日' },
  { name: '能碳周报', desc: '每周一 08:00 自动生成，本周 vs 上周', icon: '周' },
  { name: '能碳月报', desc: '每月 1 日 16:00，含工序能耗对标', icon: '月' },
  { name: '能碳年报', desc: '每年 1 月，含双碳目标完成度', icon: '年' },
  { name: '碳核查报告', desc: 'GB/T 32151 第三方核查就绪版', icon: '核' },
  { name: '能效专项', desc: 'GB 21256 对标分析', icon: '效' },
]

function typeTone(type: string): 'iron' | 'molybdenum' | 'patina' {
  if (type === '专项') return 'iron'
  if (type === '月报') return 'molybdenum'
  return 'patina'
}
</script>

<template>
  <PageHeader
    title="统计报表"
    description="按部委监管报送模板、企业 ESG 披露格式、内部经营会议要求，一键生成可审计的能碳分析报告。所有报表均含数据追溯链路。"
  >
    <template #actions>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
      >
        <Plus class="size-3.5" />新建模板
      </button>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md bg-iron text-background hover:bg-iron/90"
      >
        <FileChartColumn class="size-3.5" />立即生成
      </button>
    </template>
  </PageHeader>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard label="累计报表" value="284" unit="份" tone="molybdenum">
      <template #icon><FileText class="size-4" /></template>
    </KpiCard>
    <KpiCard label="本月已生成" value="18" unit="份" tone="patina" />
    <KpiCard label="待审核" value="3" unit="份" tone="sulfur" />
    <KpiCard label="自动化覆盖" value="92" unit="%" tone="coolant" hint="无需人工" />
  </div>

  <Panel title="报表模板" subtitle="支持周期性自动生成 + 临时拉取" class-name="mb-5">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div
        v-for="t in templates"
        :key="t.name"
        class="rounded-md panel-elevated p-4 hover:border-iron/40 transition cursor-pointer text-center"
      >
        <div
          class="size-9 rounded-md bg-iron/15 border border-iron/30 mx-auto flex items-center justify-center text-iron font-semibold text-sm data-num"
        >
          {{ t.icon }}
        </div>
        <div class="text-sm font-medium mt-2.5">{{ t.name }}</div>
        <div class="text-[10px] text-muted-foreground mt-1 leading-relaxed">{{ t.desc }}</div>
      </div>
    </div>
  </Panel>

  <Panel title="历史报表" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[900px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in [
                '编号',
                '名称',
                '类型',
                '统计周期',
                '大小',
                '创建人',
                '生成时间',
                '状态',
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
          <tr v-for="r in reportsHistory" :key="r.id" class="hover:bg-background/40">
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.id }}</td>
            <td class="px-4 py-3 font-medium">{{ r.title }}</td>
            <td class="px-4 py-3">
              <Tag :tone="typeTone(r.type)">{{ r.type }}</Tag>
            </td>
            <td class="px-4 py-3 data-num text-foreground/80">{{ r.period }}</td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.size }}</td>
            <td class="px-4 py-3 text-foreground/80">{{ r.createdBy }}</td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.createdAt }}</td>
            <td class="px-4 py-3">
              <span
                v-if="r.status === 'ready'"
                class="inline-flex items-center gap-1 text-patina"
              >
                <CircleCheck class="size-3" />可下载
              </span>
              <span v-else class="inline-flex items-center gap-1 text-sulfur">
                <Clock class="size-3 animate-spin" />生成中
              </span>
            </td>
            <td class="px-4 py-3">
              <button
                type="button"
                :class="
                  r.status === 'ready'
                    ? 'text-iron hover:underline'
                    : 'text-muted-foreground cursor-not-allowed'
                "
                :disabled="r.status !== 'ready'"
              >
                <Eye class="size-3.5 inline mr-1" />预览
              </button>
              <span class="text-border mx-1.5">|</span>
              <button
                type="button"
                :class="
                  r.status === 'ready'
                    ? 'text-iron hover:underline'
                    : 'text-muted-foreground cursor-not-allowed'
                "
                :disabled="r.status !== 'ready'"
              >
                <Download class="size-3.5 inline mr-1" />下载
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>
</template>
