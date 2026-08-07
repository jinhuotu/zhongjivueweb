<script setup lang="ts">
import { ref } from 'vue'
import {
  Sparkles,
  GitCompare,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Zap,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_SCHEDULE_RESULTS } from '@/lib/mock-extended'

const selected = ref<string[]>([APS_SCHEDULE_RESULTS[0]!.id, APS_SCHEDULE_RESULTS[1]!.id])

function toggle(id: string) {
  if (selected.value.includes(id)) {
    selected.value = selected.value.filter((x) => x !== id)
  } else {
    selected.value = [...selected.value, id].slice(-3)
  }
}

const rules = [
  { name: '温度兼容规则', hits: 42, miss: 3 },
  { name: '交期优先规则', hits: 38, miss: 0 },
  { name: '换产最小化规则', hits: 29, miss: 5 },
  { name: '能耗均衡规则', hits: 34, miss: 2 },
]

const history = [
  { time: '09:42', action: 'AI 生成方案 sch-1', type: 'success' as const },
  { time: '09:35', action: '手动调整 TC-03 顺序', type: 'info' as const },
  { time: '09:12', action: '试算: 取消 o4 延期', type: 'rollback' as const },
  { time: '08:55', action: '约束启用: 温度兼容', type: 'info' as const },
]

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">排程优化与智能决策</h1>
      <p class="text-sm text-muted-foreground mt-1">
        AI 多方案对比 · 规则引擎 · 试算回退 · AI 排程推荐
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles class="size-3" />AI 推荐方案
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-molybdenum">3</span>
          <span class="text-xs text-muted-foreground">个</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 class="size-3" />最优评分
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-patina">92</span>
          <span class="text-xs text-muted-foreground">分</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <TrendingUp class="size-3" />规则命中率
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-coolant">87</span>
          <span class="text-xs text-muted-foreground">%</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Zap class="size-3" />能耗节省
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-patina">12.4</span>
          <span class="text-xs text-muted-foreground">%</span>
        </div>
      </Panel>
    </div>

    <Panel title="AI 方案对比" :subtitle="`已选 ${selected.length} 个方案`">
      <template #action>
        <div class="flex items-center gap-2">
          <button :class="btn"><Sparkles class="size-3.5 mr-1" />AI 重新生成</button>
          <button :class="btnPrimary"><GitCompare class="size-3.5 mr-1" />对比</button>
        </div>
      </template>
      <div class="space-y-2">
        <div
          v-for="sch in APS_SCHEDULE_RESULTS"
          :key="sch.id"
          class="panel-surface rounded border p-3 cursor-pointer transition"
          :class="
            selected.includes(sch.id)
              ? 'border-molybdenum/60 ring-1 ring-molybdenum/30'
              : 'border-border-hairline hover:border-border-hairline/80'
          "
          @click="toggle(sch.id)"
        >
          <div class="flex items-center gap-3 flex-wrap">
            <div
              class="size-4 rounded border flex items-center justify-center shrink-0"
              :class="
                selected.includes(sch.id)
                  ? 'bg-molybdenum border-molybdenum'
                  : 'border-border-hairline'
              "
            >
              <CheckCircle2
                v-if="selected.includes(sch.id)"
                class="size-3 text-background"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{{ sch.name }}</span>
                <span
                  v-if="sch.id === 'sch-1'"
                  class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border bg-patina/15 text-patina border-patina/40"
                  >AI 推荐</span
                >
              </div>
              <div class="text-[11px] text-muted-foreground mt-0.5">
                生成于 {{ sch.createdAt }} · 基于 {{ sch.constraintHits }} 条约束
              </div>
            </div>
            <div class="grid grid-cols-4 gap-4 text-center">
              <div v-for="m in [
                { label: '评分', value: sch.score },
                { label: '准交率', value: sch.onTimeRate },
                { label: '延期风险', value: sch.delayRisk },
                { label: '利用率', value: sch.utilization },
              ]" :key="m.label">
                <div class="data-num text-base">{{ m.value }}</div>
                <div class="text-[10px] text-muted-foreground">{{ m.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="规则引擎">
        <div class="space-y-2">
          <div
            v-for="(r, i) in rules"
            :key="i"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <div class="flex-1">
              <div class="text-xs font-medium">{{ r.name }}</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">
                命中 {{ r.hits }} 次 · 未命中 {{ r.miss }} 次
              </div>
            </div>
            <div class="text-right">
              <div class="data-num text-sm">
                {{ Math.round((r.hits / (r.hits + r.miss)) * 100) }}%
              </div>
              <div class="text-[10px] text-muted-foreground">命中率</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="试算回退">
        <div class="space-y-2">
          <div
            v-for="(e, i) in history"
            :key="i"
            class="flex items-start gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <div
              class="size-2 rounded-full mt-1.5"
              :class="
                e.type === 'success'
                  ? 'bg-patina'
                  : e.type === 'rollback'
                    ? 'bg-sulfur'
                    : 'bg-molybdenum'
              "
            />
            <div class="flex-1">
              <div class="text-xs">{{ e.action }}</div>
              <div class="text-[10px] text-muted-foreground mt-0.5">{{ e.time }}</div>
            </div>
            <button v-if="e.type === 'rollback'" :class="btn">
              <RotateCcw class="size-3 mr-1" />回退
            </button>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
