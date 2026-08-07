<script setup lang="ts">
import { Plus, BookOpen, Users, CheckCircle2 } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'

const standards = [
  {
    id: 'QS-001',
    name: '高铝砖 HA-75',
    grade: '一级',
    passRate: 95,
    customer: '通用标准',
    status: '生效',
    updated: '2024-06-15',
  },
  {
    id: 'QS-002',
    name: '刚玉砖 GC-90',
    grade: '特级',
    passRate: 97,
    customer: '宝武钢铁',
    status: '生效',
    updated: '2024-06-10',
  },
  {
    id: 'QS-003',
    name: '镁碳砖 MT-80',
    grade: '一级',
    passRate: 96,
    customer: '通用标准',
    status: '生效',
    updated: '2024-05-28',
  },
  {
    id: 'QS-004',
    name: '高铝砖 HA-70',
    grade: '二级',
    passRate: 92,
    customer: '沙钢集团',
    status: '生效',
    updated: '2024-05-20',
  },
  {
    id: 'QS-005',
    name: '硅砖 G-95',
    grade: '一级',
    passRate: 94,
    customer: '通用标准',
    status: '草稿',
    updated: '2024-06-25',
  },
]

const rules = [
  { rule: '合格率 ≥ 95%', desc: '一级品判定标准', products: 'HA-75, MT-80', severity: '高' },
  { rule: '合格率 ≥ 97%', desc: '特级品判定标准', products: 'GC-90', severity: '高' },
  { rule: '合格率 ≥ 92%', desc: '二级品判定标准', products: 'HA-70', severity: '中' },
  { rule: '温度偏差 ≤ ±25℃', desc: '工艺稳定性要求', products: '全部', severity: '中' },
  { rule: '空燃比 3.8~4.6', desc: '燃烧控制要求', products: '全部', severity: '中' },
  { rule: '振动 ≤ 2.5 mm/s', desc: '设备稳定性要求', products: '全部', severity: '低' },
]

const kpis = [
  { label: '标准总数', value: 18, color: 'text-molybdenum', icon: BookOpen },
  { label: '生效中', value: 15, color: 'text-patina', icon: CheckCircle2 },
  { label: '客户定制', value: 6, color: 'text-coolant', icon: Users },
  { label: '本月更新', value: 3, color: 'text-sulfur', icon: BookOpen },
]

function gradeBadge(grade: string) {
  if (grade === '特级') return 'bg-patina/15 text-patina border-patina/40'
  if (grade === '一级') return 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
  return 'bg-sulfur/15 text-sulfur border-sulfur/40'
}

function severityBadge(severity: string) {
  if (severity === '高') return 'bg-iron/15 text-iron border-iron/40'
  if (severity === '中') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
}

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
const btnGhost =
  'inline-flex items-center !py-1 !px-2 h-auto text-xs rounded hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">质量标准管理</h1>
        <p class="text-sm text-muted-foreground mt-1">产品标准 · 判定规则 · 客户差异化标准</p>
      </div>
      <button :class="btnPrimary"><Plus class="size-3.5 mr-1" />新增标准</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <component :is="s.icon" class="size-3" />{{ s.label }}
        </div>
        <div :class="['data-num text-xl font-semibold mt-1', s.color]">{{ s.value }}</div>
      </Panel>
    </div>

    <Panel title="质量标准列表">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-medium">ID</th>
            <th class="text-left py-2 font-medium">产品名称</th>
            <th class="text-left py-2 font-medium">等级</th>
            <th class="text-left py-2 font-medium">合格线</th>
            <th class="text-left py-2 font-medium">适用客户</th>
            <th class="text-left py-2 font-medium">状态</th>
            <th class="text-left py-2 font-medium">更新时间</th>
            <th class="text-right py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in standards"
            :key="s.id"
            class="border-b border-border-hairline/50 hover:bg-surface/50"
          >
            <td class="py-2.5 font-mono text-molybdenum">{{ s.id }}</td>
            <td class="py-2.5 font-medium">{{ s.name }}</td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                  gradeBadge(s.grade),
                ]"
              >
                {{ s.grade }}
              </span>
            </td>
            <td class="py-2.5 data-num">{{ s.passRate }}%</td>
            <td class="py-2.5 text-muted-foreground">{{ s.customer }}</td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                  s.status === '生效'
                    ? 'bg-patina/15 text-patina border-patina/40'
                    : 'bg-sulfur/15 text-sulfur border-sulfur/40',
                ]"
              >
                {{ s.status }}
              </span>
            </td>
            <td class="py-2.5 text-muted-foreground">{{ s.updated }}</td>
            <td class="py-2.5 text-right">
              <button :class="btnGhost">编辑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>

    <Panel title="判定规则">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="(r, i) in rules"
          :key="i"
          class="panel-surface rounded border border-border-hairline p-2.5"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium">{{ r.rule }}</span>
            <span
              :class="[
                'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                severityBadge(r.severity),
              ]"
            >
              {{ r.severity }}
            </span>
          </div>
          <div class="text-[10px] text-muted-foreground">{{ r.desc }}</div>
          <div class="text-[10px] text-muted-foreground mt-0.5">适用：{{ r.products }}</div>
        </div>
      </div>
    </Panel>
  </div>
</template>
