<script setup lang="ts">
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'

/** Page expects optimalRange/impact — mock QUALITY_CORRELATIONS lacks those fields */
const correlations = [
  { param: '烧成温度', correlation: 0.88, optimalRange: '1440~1460℃', impact: 0.9 },
  { param: '保温时间', correlation: 0.72, optimalRange: '7.5~8.5h', impact: 0.75 },
  { param: '空燃比', correlation: -0.65, optimalRange: '4.0~4.4', impact: 0.7 },
  { param: '升温速率', correlation: 0.58, optimalRange: '80~120℃/h', impact: 0.55 },
  { param: '冷却速率', correlation: -0.71, optimalRange: '50~80℃/h', impact: 0.65 },
  { param: '装窑密度', correlation: 0.42, optimalRange: '75~85%', impact: 0.4 },
]

const combos = [
  {
    combo: '方案 A',
    params: '温度 1450℃ · 空燃比 4.2 · 保温 8h',
    score: 96.2,
    note: '历史最优',
  },
  {
    combo: '方案 B',
    params: '温度 1445℃ · 空燃比 4.1 · 保温 8.5h',
    score: 95.8,
    note: '能耗较低',
  },
  {
    combo: '方案 C',
    params: '温度 1455℃ · 空燃比 4.3 · 保温 7.5h',
    score: 95.5,
    note: '产能较高',
  },
]

const sensitivities = [
  { param: '温度', sensitivity: 0.82, desc: '温度每变化 10℃，合格率变化 2.1%' },
  { param: '空燃比', sensitivity: 0.65, desc: '空燃比每变化 0.1，合格率变化 0.8%' },
  { param: '保温时长', sensitivity: 0.48, desc: '时长每变化 1h，合格率变化 0.5%' },
  { param: '装窑密度', sensitivity: 0.35, desc: '密度每变化 5%，合格率变化 0.3%' },
]

function barColor(correlation: number) {
  const abs = Math.abs(correlation)
  if (correlation > 0) {
    if (abs > 0.5) return 'bg-patina'
    if (abs > 0.3) return 'bg-patina/60'
    return 'bg-muted'
  }
  if (abs > 0.5) return 'bg-iron'
  if (abs > 0.3) return 'bg-iron/60'
  return 'bg-muted'
}

function trendIcon(correlation: number) {
  if (correlation > 0.3) return TrendingUp
  if (correlation < -0.3) return TrendingDown
  return Minus
}

function iconColor(correlation: number) {
  if (correlation > 0.3) return 'text-patina'
  if (correlation < -0.3) return 'text-iron'
  return 'text-muted-foreground'
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">工艺参数关联分析</h1>
      <p class="text-sm text-muted-foreground mt-1">参数与质量相关性矩阵 · 最优参数区间推荐</p>
    </div>

    <Panel title="参数相关性矩阵" subtitle="与合格率的相关系数">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div
          v-for="c in correlations"
          :key="c.param"
          class="panel-surface rounded border border-border-hairline p-3"
        >
          <div class="flex items-center gap-2 mb-2">
            <component
              :is="trendIcon(c.correlation)"
              :class="['size-3.5', iconColor(c.correlation)]"
            />
            <span class="text-xs font-medium">{{ c.param }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-surface rounded overflow-hidden">
              <div
                :class="['h-full', barColor(c.correlation)]"
                :style="{ width: `${Math.abs(c.correlation) * 100}%` }"
              />
            </div>
            <span class="data-num text-xs"
              >{{ c.correlation > 0 ? '+' : '' }}{{ c.correlation }}</span
            >
          </div>
          <div class="text-[10px] text-muted-foreground mt-1.5">最优区间</div>
          <div class="data-num text-[11px] text-molybdenum mt-0.5">{{ c.optimalRange }}</div>
          <div class="text-[10px] text-muted-foreground mt-1.5">影响度</div>
          <div class="flex items-center gap-1 mt-0.5">
            <div
              v-for="i in 5"
              :key="i"
              :class="[
                'flex-1 h-1 rounded',
                i - 1 < Math.ceil(c.impact * 5) ? 'bg-molybdenum' : 'bg-surface',
              ]"
            />
          </div>
        </div>
      </div>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="最优参数组合推荐" subtitle="基于历史数据学习">
        <div class="space-y-2">
          <div
            v-for="(c, i) in combos"
            :key="i"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <div
              class="size-8 rounded bg-molybdenum/15 flex items-center justify-center"
            >
              <Target class="size-4 text-molybdenum" />
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium">{{ c.combo }}</span>
                <span
                  class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border bg-patina/15 text-patina border-patina/40"
                  >{{ c.note }}</span
                >
              </div>
              <div class="text-[11px] text-muted-foreground mt-0.5">{{ c.params }}</div>
            </div>
            <div class="text-right">
              <div class="data-num text-lg text-patina">{{ c.score }}</div>
              <div class="text-[10px] text-muted-foreground">预测合格率</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="参数敏感性分析">
        <div class="space-y-3">
          <div v-for="(s, i) in sensitivities" :key="i">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium">{{ s.param }}</span>
              <span class="data-num text-xs text-molybdenum">{{ s.sensitivity }}</span>
            </div>
            <div class="h-1.5 bg-surface rounded overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-molybdenum to-coolant"
                :style="{ width: `${s.sensitivity * 100}%` }"
              />
            </div>
            <div class="text-[10px] text-muted-foreground mt-1">{{ s.desc }}</div>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
