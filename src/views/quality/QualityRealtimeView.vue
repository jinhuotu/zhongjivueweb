<script setup lang="ts">
import { Activity, Flame, Thermometer, Gauge, AlertTriangle } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { QUALITY_REALTIME } from '@/lib/mock-extended'

const positions = Array.from({ length: 24 }, (_, i) => ({
  row: Math.floor(i / 6),
  col: i % 6,
}))

const params = [
  { label: '窑温', value: 1448, unit: '℃', icon: Thermometer, color: 'text-iron' },
  { label: '压力', value: 12.4, unit: 'kPa', icon: Gauge, color: 'text-molybdenum' },
  { label: '空燃比', value: 4.2, unit: '', icon: Flame, color: 'text-coolant' },
  { label: '振动', value: 0.8, unit: 'mm/s', icon: Activity, color: 'text-patina' },
]

function cellTemp(i: number) {
  return 1380 + Math.sin(i / 3) * 80
}

function cellColor(deviation: number) {
  if (deviation > 50) return 'bg-iron/60'
  if (deviation > 25) return 'bg-sulfur/60'
  return 'bg-patina/60'
}

function riskBadge(risk: string) {
  if (risk === '低') return 'bg-patina/15 text-patina border-patina/40'
  if (risk === '中') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-iron/15 text-iron border-iron/40'
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">实时质量监控</h1>
      <p class="text-sm text-muted-foreground mt-1">在窑产品实时跟踪 · 热力图定位异常窑位</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Panel title="窑内热力图 · TC-03" subtitle="24 窑位温度分布">
        <div class="grid grid-cols-6 gap-1.5">
          <div
            v-for="(_, i) in positions"
            :key="i"
            :class="[
              'aspect-square rounded flex flex-col items-center justify-center relative group cursor-pointer hover:ring-2 hover:ring-molybdenum/50 transition',
              cellColor(Math.abs(cellTemp(i) - 1450)),
            ]"
          >
            <span class="text-[10px] font-mono text-background/80">P{{ i + 1 }}</span>
            <span class="data-num text-xs text-background font-bold">{{
              Math.round(cellTemp(i))
            }}</span>
            <AlertTriangle
              v-if="Math.abs(cellTemp(i) - 1450) > 50"
              class="absolute top-0.5 right-0.5 size-3 text-background"
            />
          </div>
        </div>
        <div class="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span
            ><span class="inline-block w-2 h-2 bg-patina/60 rounded mr-1" />正常 (±25℃)</span
          >
          <span
            ><span class="inline-block w-2 h-2 bg-sulfur/60 rounded mr-1" />关注 (25-50℃)</span
          >
          <span
            ><span class="inline-block w-2 h-2 bg-iron/60 rounded mr-1" />异常 (&gt;50℃)</span
          >
        </div>
      </Panel>

      <div class="space-y-4">
        <Panel title="实时参数">
          <div class="space-y-2">
            <div
              v-for="p in params"
              :key="p.label"
              class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2"
            >
              <component :is="p.icon" :class="['size-4', p.color]" />
              <div class="flex-1">
                <div class="text-[11px] text-muted-foreground">{{ p.label }}</div>
                <div class="data-num text-sm">
                  {{ p.value }}
                  <span class="text-[10px] text-muted-foreground">{{ p.unit }}</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="在产订单">
          <div class="space-y-2">
            <div
              v-for="r in QUALITY_REALTIME.slice(0, 3)"
              :key="r.orderId"
              class="panel-surface rounded border border-border-hairline p-2.5"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-mono text-molybdenum">{{ r.orderId }}</span>
                <span
                  :class="[
                    'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                    riskBadge(r.risk),
                  ]"
                >
                  {{ r.risk }}
                </span>
              </div>
              <div class="text-[11px] text-muted-foreground">
                {{ r.currentStage }} · 预测合格率 {{ r.predictedPassRate }}%
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  </div>
</template>
