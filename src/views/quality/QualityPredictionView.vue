<script setup lang="ts">
import { computed, ref } from 'vue'
import { Brain, Play, GitCompare, Sparkles } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'

/** Page expects model/status/accuracy/deviation — mock QUALITY_PREDICTIONS has a different shape */
const predictions = [
  {
    model: 'LSTM-TC-03',
    status: 'active',
    predictedPassRate: 96.8,
    accuracy: 94.5,
    deviation: 2.3,
  },
  {
    model: 'XGBoost-QC',
    status: 'compare',
    predictedPassRate: 95.2,
    accuracy: 92.1,
    deviation: 3.1,
  },
  {
    model: 'Transformer-Q',
    status: 'compare',
    predictedPassRate: 97.1,
    accuracy: 95.8,
    deviation: 1.8,
  },
  {
    model: 'CNN-Defect',
    status: 'compare',
    predictedPassRate: 94.6,
    accuracy: 91.4,
    deviation: 4.2,
  },
]

const selectedModel = ref('LSTM-TC-03')
const whatIf = ref({ temp: 1450, ratio: 4.2, duration: 8 })

const predictedPass = computed(
  () =>
    (
      95 +
      (whatIf.value.temp - 1450) * 0.02 +
      (whatIf.value.ratio - 4.2) * 1.5
    ).toFixed(1),
)

const energyImpact = computed(() => {
  const v = (whatIf.value.duration - 8) * 2.5
  return `${whatIf.value.duration > 8 ? '+' : ''}${v.toFixed(1)}`
})

const factors = [
  { param: '温度偏差', impact: -8.5, unit: '%', desc: '实际温度低于目标 32℃' },
  { param: '空燃比波动', impact: -3.2, unit: '%', desc: '波动幅度超出 ±0.15 阈值' },
  { param: '保温时长', impact: +2.1, unit: '%', desc: '延长 0.5h 提升合格率' },
  { param: '原料批次', impact: -1.8, unit: '%', desc: '批次 #B2024-0087 含杂质偏高' },
  { param: '装窑密度', impact: +1.5, unit: '%', desc: '当前密度 82% 处于最优区间' },
  { param: '环境湿度', impact: -0.8, unit: '%', desc: '湿度 78% 略高于标准' },
]

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
const btnPrimary =
  'inline-flex items-center justify-center w-full h-8 px-3 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
const btnGhost =
  'inline-flex items-center !py-1 !px-2 h-auto text-[10px] rounded hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">质量预测分析</h1>
      <p class="text-sm text-muted-foreground mt-1">多模型对比 · What-if 模拟 · 偏差回溯</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Panel title="预测结果对比" subtitle="当前订单 GY-2024-0091 · TC-03">
        <div class="space-y-3">
          <div
            v-for="p in predictions"
            :key="p.model"
            class="panel-surface rounded border border-border-hairline p-3"
          >
            <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <Brain class="size-4 text-molybdenum" />
                <span class="text-xs font-medium">{{ p.model }}</span>
                <span
                  :class="[
                    'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                    p.status === 'active'
                      ? 'bg-patina/15 text-patina border-patina/40'
                      : 'bg-muted text-muted-foreground border-border-hairline',
                  ]"
                >
                  {{ p.status === 'active' ? '当前使用' : '对比' }}
                </span>
              </div>
              <div class="flex items-center gap-4 text-xs">
                <span
                  >预测合格率
                  <span class="data-num text-patina">{{ p.predictedPassRate }}%</span></span
                >
                <span>准确率 <span class="data-num">{{ p.accuracy }}%</span></span>
                <span
                  >偏差 <span class="data-num text-sulfur">±{{ p.deviation }}℃</span></span
                >
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-surface rounded overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-patina to-coolant"
                  :style="{ width: `${p.predictedPassRate}%` }"
                />
              </div>
              <button :class="btnGhost" @click="selectedModel = p.model">
                <Play class="size-3 mr-1" />应用
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="What-if 模拟" subtitle="调整参数查看影响">
        <div class="space-y-3">
          <div>
            <label class="text-[11px] text-muted-foreground">目标温度 (℃)</label>
            <input
              v-model.number="whatIf.temp"
              type="range"
              min="1350"
              max="1550"
              class="w-full mt-1"
            />
            <div
              class="flex items-center justify-between text-[10px] text-muted-foreground mt-1"
            >
              <span>1350</span>
              <span class="data-num text-xs text-molybdenum">{{ whatIf.temp }}</span>
              <span>1550</span>
            </div>
          </div>
          <div>
            <label class="text-[11px] text-muted-foreground">空燃比</label>
            <input
              type="range"
              min="35"
              max="50"
              :value="whatIf.ratio * 10"
              class="w-full mt-1"
              @input="
                whatIf.ratio = +(
                  ($event.target as HTMLInputElement).value
                ) / 10
              "
            />
            <div
              class="flex items-center justify-between text-[10px] text-muted-foreground mt-1"
            >
              <span>3.5</span>
              <span class="data-num text-xs text-molybdenum">{{ whatIf.ratio }}</span>
              <span>5.0</span>
            </div>
          </div>
          <div>
            <label class="text-[11px] text-muted-foreground">保温时长 (h)</label>
            <input
              v-model.number="whatIf.duration"
              type="range"
              min="4"
              max="12"
              class="w-full mt-1"
            />
            <div
              class="flex items-center justify-between text-[10px] text-muted-foreground mt-1"
            >
              <span>4h</span>
              <span class="data-num text-xs text-molybdenum">{{ whatIf.duration }}h</span>
              <span>12h</span>
            </div>
          </div>
          <div class="panel-surface rounded border border-border-hairline p-2.5">
            <div class="text-[11px] text-muted-foreground mb-1">预测结果</div>
            <div class="flex items-center justify-between">
              <span class="text-xs">预测合格率</span>
              <span class="data-num text-lg text-patina">{{ predictedPass }}%</span>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-xs">能耗影响</span>
              <span class="data-num text-sm text-sulfur">{{ energyImpact }}%</span>
            </div>
          </div>
          <button :class="btnPrimary">
            <Sparkles class="size-3.5 mr-1" />应用参数
          </button>
        </div>
      </Panel>
    </div>

    <Panel title="偏差回溯分析">
      <template #action>
        <button :class="btn"><GitCompare class="size-3.5 mr-1" />查看历史</button>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="(f, i) in factors"
          :key="i"
          class="panel-surface rounded border border-border-hairline p-2.5"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium">{{ f.param }}</span>
            <span
              :class="[
                'data-num text-sm',
                f.impact > 0 ? 'text-patina' : 'text-iron',
              ]"
            >
              {{ f.impact > 0 ? '+' : '' }}{{ f.impact }}{{ f.unit }}
            </span>
          </div>
          <div class="text-[10px] text-muted-foreground">{{ f.desc }}</div>
          <div class="h-1 bg-surface rounded mt-2 overflow-hidden">
            <div
              :class="['h-full', f.impact > 0 ? 'bg-patina' : 'bg-iron']"
              :style="{ width: `${Math.abs(f.impact) * 10}%` }"
            />
          </div>
        </div>
      </div>
    </Panel>
  </div>
</template>
