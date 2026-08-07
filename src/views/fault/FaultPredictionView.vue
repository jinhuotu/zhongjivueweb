<script setup lang="ts">
import { Target, AlertTriangle, Clock, Activity, Play, Brain } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_PREDICTION } from '@/lib/mock-extended'

const pred = FP_PREDICTION

const kpis = [
  { label: '预测准确率', value: pred.accuracy, unit: '%', color: 'text-patina', icon: Target },
  { label: '7 日风险', value: pred.risks7d, unit: '项', color: 'text-iron', icon: AlertTriangle },
  { label: '平均提前量', value: pred.leadTime, unit: 'h', color: 'text-coolant', icon: Clock },
  { label: '模型稳定性', value: pred.stability, unit: '分', color: 'text-molybdenum', icon: Activity },
]

const maxDeg = Math.max(...pred.degradation)

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">故障预测分析</h1>
        <p class="text-sm text-muted-foreground mt-1">多模型融合 · 劣化趋势 · What-if 情景</p>
      </div>
      <button :class="btnPrimary"><Play class="size-3.5 mr-1" />运行预测</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="融合模型" subtitle="权重与评估指标">
        <div class="space-y-2">
          <div
            v-for="m in pred.models"
            :key="m.id"
            class="panel-surface rounded border border-border-hairline p-3"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <Brain class="size-4 text-molybdenum" />
                <span class="text-xs font-medium">{{ m.name }}</span>
              </div>
              <span class="text-[10px] text-muted-foreground">
                权重 <span class="data-num text-molybdenum">{{ m.weight }}</span>
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <div class="text-muted-foreground">准确率</div>
                <div class="data-num text-patina">{{ m.accuracy }}%</div>
              </div>
              <div>
                <div class="text-muted-foreground">召回率</div>
                <div class="data-num">{{ m.recall }}%</div>
              </div>
              <div>
                <div class="text-muted-foreground">F1</div>
                <div class="data-num text-coolant">{{ m.f1 }}</div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="劣化趋势" subtitle="近 30 期归一化指数">
        <div class="flex items-end gap-1 h-40">
          <div
            v-for="(v, i) in pred.degradation"
            :key="i"
            class="flex-1 bg-gradient-to-t from-iron/60 to-sulfur/50 rounded-t min-h-[2px]"
            :style="{ height: `${(v / maxDeg) * 100}%` }"
          />
        </div>
      </Panel>
    </div>

    <Panel title="What-if 情景">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          v-for="(w, i) in pred.whatIf"
          :key="i"
          class="panel-surface rounded border border-border-hairline p-3"
        >
          <div class="text-xs font-medium mb-2">{{ w.scenario }}</div>
          <div class="space-y-1.5 text-[11px]">
            <div class="flex justify-between">
              <span class="text-muted-foreground">健康度</span>
              <span class="data-num text-patina">{{ w.health }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">故障概率</span>
              <span class="data-num text-iron">{{ w.faultProb }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">剩余寿命</span>
              <span class="data-num">{{ w.life }}h</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  </div>
</template>
