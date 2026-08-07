<script setup lang="ts">
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Target,
  Flame,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { QUALITY_OVERVIEW, QUALITY_REALTIME } from '@/lib/mock-extended'

const ov = QUALITY_OVERVIEW

const kpis = [
  { label: '综合合格率', value: ov.passRate, unit: '%', color: 'text-patina', icon: CheckCircle2 },
  { label: '今日预警', value: ov.alerts, unit: '条', color: 'text-sulfur', icon: AlertTriangle },
  { label: '在产订单', value: ov.orders, unit: '单', color: 'text-molybdenum', icon: Target },
  { label: '预测准确率', value: ov.predAccuracy, unit: '%', color: 'text-coolant', icon: TrendingUp },
  { label: '质量评分', value: ov.qualityScore, unit: '分', color: 'text-patina', icon: Activity },
  { label: '平均温度偏差', value: ov.tempDeviation, unit: '℃', color: 'text-iron', icon: Flame },
]

function riskBadge(risk: string) {
  if (risk === '低') return 'bg-patina/15 text-patina border-patina/40'
  if (risk === '中') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-iron/15 text-iron border-iron/40'
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">质量数据总览</h1>
      <p class="text-sm text-muted-foreground mt-1">看板入口 · 合格率 · 预警摘要 · 趋势一图看全</p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <component :is="s.icon" class="size-3" />{{ s.label }}
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span :class="['data-num text-xl font-semibold', s.color]">{{ s.value }}</span>
          <span class="text-xs text-muted-foreground">{{ s.unit }}</span>
        </div>
      </Panel>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
      <Panel title="合格率趋势 · 近 30 天">
        <div class="flex items-end gap-1 h-40">
          <div
            v-for="(t, i) in ov.trend"
            :key="i"
            class="flex-1 flex flex-col items-center gap-1"
          >
            <div
              class="w-full bg-patina/40 rounded-t relative"
              :style="{ height: `${t.passRate}%` }"
            >
              <div
                class="absolute inset-x-0 border-t border-dashed border-patina"
                style="bottom: 95%"
              />
            </div>
            <span v-if="i % 5 === 0" class="text-[9px] text-muted-foreground">{{
              t.date.slice(5)
            }}</span>
          </div>
        </div>
        <div class="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span
            ><span class="inline-block w-2 h-2 bg-patina/40 rounded mr-1" />合格率</span
          >
          <span
            ><span class="inline-block w-2 h-0.5 bg-patina mr-1" />目标 95%</span
          >
        </div>
      </Panel>

      <Panel title="预警摘要">
        <div class="space-y-2">
          <div
            v-for="(a, i) in ov.alertSummary"
            :key="i"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <AlertTriangle
              :class="['size-4', a.level === 'high' ? 'text-iron' : 'text-sulfur']"
            />
            <div class="flex-1">
              <div class="text-xs">{{ a.type }}</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">
                {{ a.count }} 条 · {{ a.furnace }}
              </div>
            </div>
            <span
              :class="[
                'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                a.level === 'high'
                  ? 'bg-iron/15 text-iron border-iron/40'
                  : 'bg-sulfur/15 text-sulfur border-sulfur/40',
              ]"
            >
              {{ a.level === 'high' ? '严重' : '关注' }}
            </span>
          </div>
        </div>
      </Panel>
    </div>

    <Panel title="在产订单质量分布">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          v-for="r in QUALITY_REALTIME"
          :key="r.orderId"
          class="panel-surface rounded border border-border-hairline p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono text-molybdenum">{{ r.orderId }}</span>
            <span
              :class="[
                'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                riskBadge(r.risk),
              ]"
            >
              {{ r.risk }}风险
            </span>
          </div>
          <div class="space-y-1.5">
            <div>
              <div class="text-[10px] text-muted-foreground">预测合格率</div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1.5 bg-surface rounded overflow-hidden">
                  <div
                    class="h-full bg-patina"
                    :style="{ width: `${r.predictedPassRate}%` }"
                  />
                </div>
                <span class="data-num text-xs">{{ r.predictedPassRate }}%</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-[10px]">
              <span class="text-muted-foreground">当前工序</span>
              <span>{{ r.currentStage }}</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  </div>
</template>
