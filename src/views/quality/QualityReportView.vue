<script setup lang="ts">
import { FileText, Download, Calendar, Eye } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'

const reports = [
  {
    id: 'QR-2024-015',
    name: '质量日报 2024-06-28',
    type: '日报',
    period: '2024-06-28',
    status: '已生成',
    size: '2.4 MB',
    pages: 12 as number | string,
  },
  {
    id: 'QR-2024-014',
    name: '质量日报 2024-06-27',
    type: '日报',
    period: '2024-06-27',
    status: '已生成',
    size: '2.3 MB',
    pages: 12 as number | string,
  },
  {
    id: 'QR-2024-W26',
    name: '质量周报 第 26 周',
    type: '周报',
    period: '2024-06-24 ~ 06-30',
    status: '已生成',
    size: '8.1 MB',
    pages: 38 as number | string,
  },
  {
    id: 'QR-2024-06',
    name: '质量月报 2024 年 6 月',
    type: '月报',
    period: '2024-06-01 ~ 06-30',
    status: '生成中',
    size: '-',
    pages: '-' as number | string,
  },
  {
    id: 'QR-2024-S01',
    name: 'TC-03 质量专项分析',
    type: '专项',
    period: '2024-06-15 ~ 06-28',
    status: '已生成',
    size: '5.2 MB',
    pages: 24 as number | string,
  },
]

const templates = [
  { name: '质量日报模板', desc: '每日合格率、预警、趋势', freq: '每日 08:00' },
  { name: '质量周报模板', desc: '周度汇总、对标分析', freq: '每周一 09:00' },
  { name: '质量月报模板', desc: '月度 KPI、改善建议', freq: '每月 1 日' },
  { name: '专项分析模板', desc: '设备 / 产品 / 工艺专项', freq: '按需' },
]

function typeBadge(type: string) {
  if (type === '日报') return 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
  if (type === '周报') return 'bg-coolant/15 text-coolant border-coolant/40'
  if (type === '月报') return 'bg-patina/15 text-patina border-patina/40'
  return 'bg-sulfur/15 text-sulfur border-sulfur/40'
}

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
const btnGhost =
  'inline-flex items-center !py-1 !px-2 h-auto rounded hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">质量报告中心</h1>
        <p class="text-sm text-muted-foreground mt-1">
          日 / 周 / 月报自动生成 · 专项报告按需出
        </p>
      </div>
      <button :class="btnPrimary"><FileText class="size-3.5 mr-1" />生成报告</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel
        v-for="s in [
          { label: '本月报告', value: 18, color: 'text-molybdenum' },
          { label: '自动生成', value: 15, color: 'text-patina' },
          { label: '专项报告', value: 3, color: 'text-coolant' },
          { label: '平均页数', value: '22页', color: 'text-sulfur' },
        ]"
        :key="s.label"
        class-name="!p-3"
      >
        <div class="text-[11px] text-muted-foreground">{{ s.label }}</div>
        <div :class="['data-num text-xl font-semibold mt-1', s.color]">{{ s.value }}</div>
      </Panel>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Panel title="报告列表">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border-hairline text-muted-foreground">
              <th class="text-left py-2 font-medium">ID</th>
              <th class="text-left py-2 font-medium">报告名称</th>
              <th class="text-left py-2 font-medium">类型</th>
              <th class="text-left py-2 font-medium">周期</th>
              <th class="text-left py-2 font-medium">状态</th>
              <th class="text-left py-2 font-medium">大小</th>
              <th class="text-left py-2 font-medium">页数</th>
              <th class="text-right py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in reports"
              :key="r.id"
              class="border-b border-border-hairline/50 hover:bg-surface/50"
            >
              <td class="py-2.5 font-mono text-molybdenum">{{ r.id }}</td>
              <td class="py-2.5">{{ r.name }}</td>
              <td class="py-2.5">
                <span
                  :class="[
                    'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                    typeBadge(r.type),
                  ]"
                >
                  {{ r.type }}
                </span>
              </td>
              <td class="py-2.5 text-muted-foreground">{{ r.period }}</td>
              <td class="py-2.5">
                <span
                  :class="[
                    'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                    r.status === '已生成'
                      ? 'bg-patina/15 text-patina border-patina/40'
                      : 'bg-sulfur/15 text-sulfur border-sulfur/40',
                  ]"
                >
                  {{ r.status }}
                </span>
              </td>
              <td class="py-2.5 text-muted-foreground">{{ r.size }}</td>
              <td class="py-2.5 text-muted-foreground">{{ r.pages }}</td>
              <td class="py-2.5 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button :class="btnGhost"><Eye class="size-3" /></button>
                  <button :class="btnGhost"><Download class="size-3" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel title="报告模板">
        <div class="space-y-2">
          <div
            v-for="(t, i) in templates"
            :key="i"
            class="panel-surface rounded border border-border-hairline p-2.5"
          >
            <div class="flex items-center gap-2 mb-1">
              <FileText class="size-3.5 text-molybdenum" />
              <span class="text-xs font-medium">{{ t.name }}</span>
            </div>
            <div class="text-[10px] text-muted-foreground">{{ t.desc }}</div>
            <div class="flex items-center gap-1.5 mt-1.5 text-[10px]">
              <Calendar class="size-3 text-muted-foreground" />
              <span class="text-muted-foreground">{{ t.freq }}</span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
