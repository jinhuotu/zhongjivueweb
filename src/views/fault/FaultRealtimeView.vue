<script setup lang="ts">
import { Thermometer, Activity, Gauge, HeartPulse } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_REALTIME } from '@/lib/mock-extended'

const rt = FP_REALTIME

function statusBadge(status: string) {
  if (status === '运行') return 'bg-patina/15 text-patina border-patina/40'
  if (status === '告警') return 'bg-iron/15 text-iron border-iron/40'
  return 'bg-muted text-muted-foreground border-border-hairline'
}

function healthColor(health: number) {
  if (health >= 80) return 'text-patina'
  if (health >= 60) return 'text-sulfur'
  return 'text-iron'
}

function thermalBg(v: number) {
  const hue = Math.round((1 - v) * 240)
  return `hsl(${hue}, 70%, 45%)`
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">实时状态监控</h1>
      <p class="text-sm text-muted-foreground mt-1">温振压健康 · 频谱与热成像联动</p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="d in rt.devices"
        :key="d.id"
        class="panel-surface rounded border border-border-hairline p-3"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-mono text-molybdenum">{{ d.id }}</span>
          <span
            :class="[
              'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
              statusBadge(d.status),
            ]"
          >
            {{ d.status }}
          </span>
        </div>
        <div class="space-y-1.5 text-[11px]">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-muted-foreground">
              <Thermometer class="size-3 text-iron" />温度
            </span>
            <span class="data-num">{{ d.temp }}℃</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-muted-foreground">
              <Activity class="size-3 text-sulfur" />振动
            </span>
            <span class="data-num">{{ d.vibration }} mm/s</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-muted-foreground">
              <Gauge class="size-3 text-molybdenum" />压力
            </span>
            <span class="data-num">{{ d.pressure }} MPa</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-muted-foreground">
              <HeartPulse class="size-3 text-patina" />健康
            </span>
            <span :class="['data-num font-semibold', healthColor(d.health)]">{{ d.health }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="振动频谱" subtitle="频域幅值分布">
        <div class="flex items-end gap-0.5 h-40">
          <div
            v-for="(v, i) in rt.vibrationSpectrum"
            :key="i"
            class="flex-1 bg-gradient-to-t from-sulfur/70 to-coolant/50 rounded-t min-h-[2px]"
            :style="{ height: `${v * 20}%` }"
          />
        </div>
      </Panel>

      <Panel title="热成像" subtitle="8×8 温度场归一化">
        <div class="grid grid-cols-8 gap-1">
          <div
            v-for="(v, i) in rt.thermal"
            :key="i"
            class="aspect-square rounded-sm"
            :style="{ background: thermalBg(v) }"
            :title="v.toFixed(2)"
          />
        </div>
      </Panel>
    </div>
  </div>
</template>
