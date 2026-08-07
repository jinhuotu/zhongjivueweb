<script setup lang="ts">
import {
  HeartPulse,
  AlertTriangle,
  Gauge,
  Bell,
  Target,
  Clock,
} from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_OVERVIEW } from '@/lib/mock-extended'

const ov = FP_OVERVIEW

const kpis = [
  { label: '综合健康分', value: ov.healthScore, unit: '分', color: 'text-patina', icon: HeartPulse },
  { label: '风险设备', value: ov.riskDevices, unit: '台', color: 'text-iron', icon: AlertTriangle },
  { label: '综合 OEE', value: ov.oee, unit: '%', color: 'text-molybdenum', icon: Gauge },
  { label: '今日预警', value: ov.alerts, unit: '条', color: 'text-sulfur', icon: Bell },
  { label: '预测准确率', value: ov.predAccuracy, unit: '%', color: 'text-coolant', icon: Target },
  { label: 'MTBF', value: ov.mtbf, unit: 'h', color: 'text-patina', icon: Clock },
]

function riskBadge(risk: string) {
  if (risk === '低') return 'bg-patina/15 text-patina border-patina/40'
  if (risk === '中') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-iron/15 text-iron border-iron/40'
}

function healthBarColor(health: number) {
  if (health >= 80) return 'bg-patina'
  if (health >= 60) return 'bg-sulfur'
  return 'bg-iron'
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">设备健康总览</h1>
      <p class="text-sm text-muted-foreground mt-1">健康评分 · 风险设备 · OEE / MTBF 一图看全</p>
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
      <Panel title="设备健康度分布">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            v-for="d in ov.devices"
            :key="d.id"
            class="panel-surface rounded border border-border-hairline p-3"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono text-molybdenum">{{ d.name }}</span>
              <span
                :class="[
                  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
                  riskBadge(d.risk),
                ]"
              >
                {{ d.risk }}风险
              </span>
            </div>
            <div class="space-y-1.5">
              <div>
                <div class="text-[10px] text-muted-foreground">健康度</div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 bg-surface rounded overflow-hidden">
                    <div
                      :class="['h-full', healthBarColor(d.health)]"
                      :style="{ width: `${d.health}%` }"
                    />
                  </div>
                  <span class="data-num text-xs">{{ d.health }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between text-[10px]">
                <span class="text-muted-foreground">OEE</span>
                <span class="data-num">{{ d.oee }}%</span>
              </div>
              <div class="flex items-center justify-between text-[10px]">
                <span class="text-muted-foreground">MTBF</span>
                <span class="data-num">{{ d.mtbf }}h</span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="风险概览">
        <div class="space-y-2">
          <div
            v-for="(a, i) in ov.riskSummary"
            :key="i"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <AlertTriangle
              :class="['size-4', a.level === 'high' ? 'text-iron' : 'text-sulfur']"
            />
            <div class="flex-1">
              <div class="text-xs">{{ a.type }}</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">{{ a.count }} 台</div>
            </div>
            <span
              :class="[
                'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
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
  </div>
</template>
