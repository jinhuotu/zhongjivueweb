<script setup lang="ts">
import {
  AlertTriangle,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_EMERGENCY } from '@/lib/mock-extended'

const em = APS_EMERGENCY

function impactTone(value: string) {
  const n = Math.abs(parseFloat(value))
  if (Number.isNaN(n)) return 'text-muted-foreground'
  if (n >= 10) return 'text-iron'
  if (n >= 5) return 'text-sulfur'
  return 'text-patina'
}

function planRisk(delay: string) {
  const n = parseFloat(delay)
  if (Number.isNaN(n) || n <= 0.5) return { label: '低', cls: 'bg-patina/15 text-patina border-patina/40' }
  if (n <= 1.5) return { label: '中', cls: 'bg-sulfur/15 text-sulfur border-sulfur/40' }
  return { label: '高', cls: 'bg-iron/15 text-iron border-iron/40' }
}

const approval = [
  { step: '发起申请', user: '张调度', time: '10:22', status: 'done' as const },
  { step: '影响评估', user: 'AI 系统', time: '10:25', status: 'done' as const },
  { step: '主管审批', user: '李主管', time: '待处理', status: 'current' as const },
  { step: '执行排程', user: 'APS 系统', time: '-', status: 'pending' as const },
]

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">插单与紧急排程</h1>
      <p class="text-sm text-muted-foreground mt-1">
        应急响应 · 影响评估矩阵 · 多方案推荐 · 审批流程
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <AlertTriangle class="size-3" />待响应插单
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-iron">{{ em.pending.length }}</span>
          <span class="text-xs text-muted-foreground">单</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock class="size-3" />评估中
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-sulfur">{{
            em.inProgress.length
          }}</span>
          <span class="text-xs text-muted-foreground">单</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 class="size-3" />本月已处理
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-patina">12</span>
          <span class="text-xs text-muted-foreground">单</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Zap class="size-3" />平均响应
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-molybdenum">28</span>
          <span class="text-xs text-muted-foreground">min</span>
        </div>
      </Panel>
    </div>

    <Panel title="待响应插单">
      <template #action>
        <button :class="btnPrimary">
          <AlertTriangle class="size-3.5 mr-1" />发起插单
        </button>
      </template>
      <div class="space-y-2">
        <div
          v-for="e in em.pending"
          :key="e.id"
          class="panel-surface rounded border border-border-hairline p-3"
        >
          <div class="flex items-start gap-3 flex-wrap">
            <div class="size-10 rounded bg-iron/15 flex items-center justify-center shrink-0">
              <AlertTriangle class="size-5 text-iron" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium font-mono text-molybdenum">{{ e.order }}</span>
                <span class="text-xs text-muted-foreground">{{ e.product }}</span>
              </div>
              <div class="text-[11px] text-muted-foreground mt-1">
                需求 {{ e.quantity }} · 交期 {{ e.deadline }}
              </div>
              <div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div
                  v-for="im in e.impact"
                  :key="im.type"
                  class="panel-surface rounded border border-border-hairline p-1.5"
                >
                  <div class="text-[10px] text-muted-foreground">{{ im.type }}</div>
                  <div class="data-num text-xs mt-0.5" :class="impactTone(im.value)">
                    {{ im.value }}
                  </div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <button :class="btn">
                <TrendingUp class="size-3 mr-1" />影响评估
              </button>
              <button :class="btnPrimary">
                <Zap class="size-3 mr-1" />紧急排程
              </button>
            </div>
          </div>
        </div>
      </div>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="多方案推荐">
        <div class="space-y-2">
          <div
            v-for="(p, i) in em.plans"
            :key="p.id"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <div
              class="size-7 rounded flex items-center justify-center"
              :class="i === 0 ? 'bg-patina/15' : 'bg-surface'"
            >
              <span class="text-xs font-bold text-molybdenum">{{
                String.fromCharCode(65 + i)
              }}</span>
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium">{{ p.name }}</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">
                延期 {{ p.delay }} · 成本 ¥{{ p.cost.toLocaleString() }} · 评分 {{ p.score }}
              </div>
            </div>
            <span
              class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
              :class="planRisk(p.delay).cls"
              >{{ planRisk(p.delay).label }}</span
            >
            <button :class="btn">选择</button>
          </div>
        </div>
      </Panel>

      <Panel title="审批流程">
        <div class="space-y-2">
          <div v-for="(s, i) in approval" :key="i" class="flex items-center gap-3">
            <div
              class="size-6 rounded-full flex items-center justify-center shrink-0"
              :class="
                s.status === 'done'
                  ? 'bg-patina'
                  : s.status === 'current'
                    ? 'bg-molybdenum animate-pulse'
                    : 'bg-surface border border-border-hairline'
              "
            >
              <CheckCircle2
                v-if="s.status === 'done'"
                class="size-3.5 text-background"
              />
              <Clock
                v-else-if="s.status === 'current'"
                class="size-3.5 text-background"
              />
              <XCircle v-else class="size-3.5 text-muted-foreground" />
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium">{{ s.step }}</div>
              <div class="text-[11px] text-muted-foreground">{{ s.user }} · {{ s.time }}</div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
