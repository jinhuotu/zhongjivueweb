<script setup lang="ts">
import { Bell, Plus, Filter, Clock, CheckCircle2, AlertTriangle } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'

const alerts = [
  {
    id: 'QA-001',
    type: '温度超限',
    level: 'high',
    furnace: 'TC-03',
    order: 'GY-2024-0091',
    time: '10:42:15',
    status: '处理中',
    handler: '王工',
  },
  {
    id: 'QA-002',
    type: '空燃比异常',
    level: 'mid',
    furnace: 'TC-01',
    order: 'GY-2024-0088',
    time: '10:35:08',
    status: '待确认',
    handler: '李工',
  },
  {
    id: 'QA-003',
    type: '保温时长偏差',
    level: 'low',
    furnace: 'TC-02',
    order: 'GY-2024-0085',
    time: '10:28:52',
    status: '已关闭',
    handler: '张工',
  },
  {
    id: 'QA-004',
    type: '振动超标',
    level: 'mid',
    furnace: 'TC-04',
    order: 'GY-2024-0082',
    time: '10:15:33',
    status: '处理中',
    handler: '王工',
  },
  {
    id: 'QA-005',
    type: '压力波动',
    level: 'low',
    furnace: 'TC-05',
    order: 'GY-2024-0079',
    time: '09:58:21',
    status: '已关闭',
    handler: '李工',
  },
]

const rules = [
  { name: '温度超限', trigger: '实际温度 > 目标 ±50℃', action: '钉钉 + 短信', enabled: true },
  { name: '空燃比异常', trigger: '空燃比 < 3.8 或 > 4.6', action: '钉钉通知', enabled: true },
  {
    name: '保温时长偏差',
    trigger: '实际时长 < 目标 80%',
    action: '邮件通知',
    enabled: true,
  },
  { name: '振动超标', trigger: '振动 > 2.5 mm/s', action: '钉钉 + 短信', enabled: true },
  { name: '压力波动', trigger: '压力波动 > 15%', action: '钉钉通知', enabled: false },
  {
    name: '合格率下降',
    trigger: '预测合格率 < 92%',
    action: '邮件 + 短信',
    enabled: true,
  },
]

const kpis = [
  { label: '今日预警', value: 5, color: 'text-sulfur', icon: Bell },
  { label: '处理中', value: 2, color: 'text-molybdenum', icon: Clock },
  { label: '已关闭', value: 3, color: 'text-patina', icon: CheckCircle2 },
  { label: '平均处置', value: '28min', color: 'text-coolant', icon: AlertTriangle },
]

function levelBadge(level: string) {
  if (level === 'high') return 'bg-iron/15 text-iron border-iron/40'
  if (level === 'mid') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
}

function levelLabel(level: string) {
  if (level === 'high') return '严重'
  if (level === 'mid') return '关注'
  return '提示'
}

function statusBadge(status: string) {
  if (status === '处理中') return 'bg-molybdenum/15 text-molybdenum border-molybdenum/40'
  if (status === '待确认') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-patina/15 text-patina border-patina/40'
}

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
const btnGhost =
  'inline-flex items-center !py-1 !px-2 h-auto text-xs rounded hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">质量预警管理</h1>
        <p class="text-sm text-muted-foreground mt-1">预警规则配置 · 通知分发 · 闭环跟踪</p>
      </div>
      <div class="flex items-center gap-2">
        <button :class="btn"><Filter class="size-3.5 mr-1" />筛选</button>
        <button :class="btnPrimary"><Plus class="size-3.5 mr-1" />新增规则</button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <component :is="s.icon" class="size-3" />{{ s.label }}
        </div>
        <div :class="['data-num text-xl font-semibold mt-1', s.color]">{{ s.value }}</div>
      </Panel>
    </div>

    <Panel title="预警规则">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="(r, i) in rules"
          :key="i"
          class="panel-surface rounded border border-border-hairline p-2.5"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-medium">{{ r.name }}</span>
            <span
              :class="[
                'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                r.enabled
                  ? 'bg-patina/15 text-patina border-patina/40'
                  : 'bg-muted text-muted-foreground border-border-hairline',
              ]"
            >
              {{ r.enabled ? '启用' : '禁用' }}
            </span>
          </div>
          <div class="text-[10px] text-muted-foreground">触发：{{ r.trigger }}</div>
          <div class="text-[10px] text-muted-foreground mt-0.5">动作：{{ r.action }}</div>
        </div>
      </div>
    </Panel>

    <Panel title="预警记录">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-medium">ID</th>
            <th class="text-left py-2 font-medium">类型</th>
            <th class="text-left py-2 font-medium">等级</th>
            <th class="text-left py-2 font-medium">设备</th>
            <th class="text-left py-2 font-medium">订单</th>
            <th class="text-left py-2 font-medium">时间</th>
            <th class="text-left py-2 font-medium">状态</th>
            <th class="text-left py-2 font-medium">处理人</th>
            <th class="text-right py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="a in alerts"
            :key="a.id"
            class="border-b border-border-hairline/50 hover:bg-surface/50"
          >
            <td class="py-2.5 font-mono text-molybdenum">{{ a.id }}</td>
            <td class="py-2.5">{{ a.type }}</td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                  levelBadge(a.level),
                ]"
              >
                {{ levelLabel(a.level) }}
              </span>
            </td>
            <td class="py-2.5 font-mono">{{ a.furnace }}</td>
            <td class="py-2.5 font-mono">{{ a.order }}</td>
            <td class="py-2.5 text-muted-foreground">{{ a.time }}</td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                  statusBadge(a.status),
                ]"
              >
                {{ a.status }}
              </span>
            </td>
            <td class="py-2.5">{{ a.handler }}</td>
            <td class="py-2.5 text-right">
              <button :class="btnGhost">查看</button>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  </div>
</template>
