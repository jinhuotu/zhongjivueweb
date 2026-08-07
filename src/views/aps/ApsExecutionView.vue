<script setup lang="ts">
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Eye,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_EXECUTIONS, type ApsExecution } from '@/lib/mock-extended'

const statusColor: Record<ApsExecution['status'], string> = {
  正常: 'bg-molybdenum/15 text-molybdenum border-molybdenum/40',
  延误: 'bg-iron/15 text-iron border-iron/40',
  提前: 'bg-patina/15 text-patina border-patina/40',
  暂停: 'bg-sulfur/15 text-sulfur border-sulfur/40',
}

function progressBarClass(status: ApsExecution['status']) {
  if (status === '延误') return 'bg-iron'
  if (status === '提前') return 'bg-patina'
  if (status === '暂停') return 'bg-sulfur'
  return 'bg-molybdenum'
}

const anomalies = [
  {
    order: 'o1',
    type: '温度偏差',
    msg: 'TC-03 实际温度 1420℃ 偏离目标 1450℃',
    action: '调整燃气',
    severity: 'high' as const,
  },
  {
    order: 'o4',
    type: '进度滞后',
    msg: 'MT-80 订单落后计划 2.5h',
    action: '申请加班',
    severity: 'medium' as const,
  },
  {
    order: 'o6',
    type: '设备异常',
    msg: 'TC-07 热电偶信号抖动',
    action: '切换备用',
    severity: 'high' as const,
  },
]

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">排程执行与进度跟踪</h1>
      <p class="text-sm text-muted-foreground mt-1">计划 vs 实际对比 · 异常处置 · 进度预警</p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Play class="size-3" />执行中订单
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-molybdenum">4</span>
          <span class="text-xs text-muted-foreground">单</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 class="size-3" />按期完成
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-patina">18</span>
          <span class="text-xs text-muted-foreground">单</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <AlertTriangle class="size-3" />进度异常
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-iron">2</span>
          <span class="text-xs text-muted-foreground">单</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Pause class="size-3" />暂停
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-sulfur">1</span>
          <span class="text-xs text-muted-foreground">单</span>
        </div>
      </Panel>
    </div>

    <Panel title="订单执行明细">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-normal">订单</th>
            <th class="text-left py-2 font-normal">窑炉</th>
            <th class="text-left py-2 font-normal">计划时间</th>
            <th class="text-left py-2 font-normal">实际进度</th>
            <th class="text-right py-2 font-normal">完成率</th>
            <th class="text-left py-2 font-normal">状态</th>
            <th class="text-right py-2 font-normal">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in APS_EXECUTIONS"
            :key="e.id"
            class="border-b border-border-hairline/50 hover:bg-surface/40"
          >
            <td class="py-2 font-mono text-molybdenum">{{ e.orderId }}</td>
            <td class="py-2 font-mono">{{ e.furnace }}</td>
            <td class="py-2 text-muted-foreground">{{ e.planStart }} ~ {{ e.planEnd }}</td>
            <td class="py-2">
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-surface rounded overflow-hidden">
                  <div
                    class="h-full"
                    :class="progressBarClass(e.status)"
                    :style="{ width: `${e.progress}%` }"
                  />
                </div>
                <span class="data-num">{{ e.progress }}%</span>
              </div>
            </td>
            <td class="py-2 text-right data-num">{{ e.progress }}%</td>
            <td class="py-2">
              <span
                class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
                :class="statusColor[e.status]"
                >{{ e.status }}</span
              >
            </td>
            <td class="py-2 text-right">
              <button class="h-7 px-2 inline-flex items-center hover:bg-surface/60 rounded">
                <Eye class="size-3.5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="计划 vs 实际对比">
        <div class="space-y-3">
          <div
            v-for="e in APS_EXECUTIONS.slice(0, 4)"
            :key="e.orderId"
            class="panel-surface rounded border border-border-hairline p-2.5"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-mono text-molybdenum">{{ e.orderId }}</span>
              <span class="text-[10px] text-muted-foreground">{{ e.furnace }}</span>
            </div>
            <div class="relative h-3 bg-surface rounded">
              <div
                class="absolute inset-y-0 left-0 bg-molybdenum/40 rounded"
                :style="{ width: `${e.progress}%` }"
              />
              <div
                class="absolute inset-y-0 left-0 border-r-2 border-molybdenum"
                :style="{ width: `${e.progress}%` }"
              />
            </div>
            <div
              class="flex items-center justify-between mt-1 text-[10px] text-muted-foreground"
            >
              <span>计划 {{ e.progress }}%</span>
              <span>实际 {{ e.progress }}%</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="异常处置">
        <div class="space-y-2">
          <div
            v-for="(a, i) in anomalies"
            :key="i"
            class="flex items-start gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <AlertTriangle
              class="size-4 mt-0.5"
              :class="a.severity === 'high' ? 'text-iron' : 'text-sulfur'"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono text-molybdenum">{{ a.order }}</span>
                <span
                  class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border border-border-hairline"
                  >{{ a.type }}</span
                >
              </div>
              <div class="text-[11px] text-muted-foreground mt-1">{{ a.msg }}</div>
            </div>
            <button :class="btn">{{ a.action }}</button>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
