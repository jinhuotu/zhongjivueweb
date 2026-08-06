<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import TunnelKilnDrawing from './TunnelKilnDrawing.vue'
import {
  BASE_H_PCT,
  BASE_TOP_PCT,
  getBaseSegments,
  KILN_ASPECT,
  ZONE_XS,
} from './tunnel-kiln-layout'
import { num } from '@/lib/production-systems'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, MarkLineComponent])

type V = Record<string, number | string | null>

const props = defineProps<{
  values: V
}>()

const BASE_SEGS = getBaseSegments()

const profile = computed(() => {
  const values = props.values
  const known: { pos: number; t: number }[] = []
  for (let pos = 0; pos <= 80; pos += 4) {
    const key = `P${String(pos).padStart(2, '0')}`
    const raw = values[key]
    if (raw == null || raw === '') continue
    const t = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isFinite(t)) known.push({ pos, t })
  }
  const fallbackCurve = (pos: number) => {
    const r = pos / 80
    if (r < 0.15) return 50 + r * 2800
    if (r < 0.55) return 900 + (r - 0.15) * 1100
    if (r < 0.72) return 1366 - Math.abs(r - 0.62) * 400
    return 1200 - (r - 0.72) * 3800
  }
  const at = (pos: number) => {
    if (!known.length) return fallbackCurve(pos)
    if (pos <= known[0].pos) return known[0].t
    if (pos >= known[known.length - 1].pos) return known[known.length - 1].t
    for (let i = 0; i < known.length - 1; i++) {
      const a = known[i]
      const b = known[i + 1]
      if (pos >= a.pos && pos <= b.pos) {
        const k = (pos - a.pos) / (b.pos - a.pos || 1)
        return a.t + (b.t - a.t) * k
      }
    }
    return fallbackCurve(pos)
  }

  const labelPos = new Set([0, 8, 16, 28, 40, 48, 56, 64, 72, 80])
  const pts: { pos: number; t: number; label?: string }[] = []
  for (let pos = 0; pos <= 80; pos += 2) {
    const t = Math.round(at(pos))
    pts.push({
      pos,
      t,
      label: labelPos.has(pos) ? `${t}°C` : undefined,
    })
  }
  return pts
})

const planTemp = computed(() => {
  const raw = props.values.PLAN_TEMP
  if (raw == null || raw === '') return 1365
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : 1365
})

const dropXs = computed(() =>
  profile.value.filter((p) => p.label && p.pos > 0 && p.pos < 80).map((p) => p.pos),
)

const chartOption = computed(() => ({
  animation: false,
  grid: { left: 36, right: 12, top: 28, bottom: 24 },
  tooltip: {
    trigger: 'axis' as const,
    backgroundColor: '#0b1e38',
    borderColor: '#2a6bb0',
    textStyle: { color: '#e6edf3', fontSize: 11 },
    formatter: (params: unknown) => {
      const arr = Array.isArray(params) ? params : [params]
      const p = arr[0] as { axisValue?: string | number; data?: number }
      return `位置 ${p?.axisValue}<br/>温度 ${p?.data} ℃`
    },
  },
  xAxis: {
    type: 'value' as const,
    min: 0,
    max: 80,
    interval: 10,
    axisLabel: { color: '#7aa7d8', fontSize: 9 },
    axisLine: { lineStyle: { color: 'rgba(80,140,220,0.25)' } },
    splitLine: { show: false },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value' as const,
    min: 0,
    max: 1500,
    interval: 200,
    axisLabel: { color: '#7aa7d8', fontSize: 9 },
    axisLine: { lineStyle: { color: 'rgba(80,140,220,0.25)' } },
    splitLine: { lineStyle: { color: 'rgba(80,140,220,0.1)', type: 'dashed' as const } },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'line' as const,
      data: profile.value.map((p) => [p.pos, p.t]),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#b57bff', width: 1.8, type: 'dashed' as const },
      itemStyle: { color: '#fff', borderColor: '#b57bff', borderWidth: 1.2 },
      label: {
        show: true,
        position: 'top' as const,
        color: '#f2f7ff',
        fontSize: 9,
        fontWeight: 600,
        formatter: (p: { dataIndex: number }) => profile.value[p.dataIndex]?.label || '',
      },
      markLine: {
        silent: true,
        symbol: 'none',
        data: [
          {
            yAxis: planTemp.value,
            lineStyle: { color: 'rgba(244,196,48,0.55)', type: 'dashed' as const, width: 1 },
            label: { show: false },
          },
          ...dropXs.value.map((x) => ({
            xAxis: x,
            lineStyle: { color: 'rgba(255,80,80,0.28)', width: 1 },
            label: { show: false },
          })),
        ],
      },
    },
  ],
}))

const zones = computed(() => {
  const v = props.values
  return [
    { key: 'Z6', label: '六区', x: ZONE_XS[0], temp: v.Z6_TEMP, gas: v.Z6_GAS, air: v.Z6_AIR },
    { key: 'Z5', label: '五区', x: ZONE_XS[1], temp: v.Z5_TEMP, gas: v.Z5_GAS, air: v.Z5_AIR },
    { key: 'Z4', label: '四区', x: ZONE_XS[2], temp: v.Z4_TEMP, gas: v.Z4_GAS, air: v.Z4_AIR },
    { key: 'Z3', label: '三区', x: ZONE_XS[3], temp: v.Z3_TEMP, gas: v.Z3_GAS, air: v.Z3_AIR },
    { key: 'Z2', label: '二区', x: ZONE_XS[4], temp: v.Z2_TEMP, gas: v.Z2_GAS, air: v.Z2_AIR },
  ]
})

function pinTransform(anchor: 'center' | 'left' | 'right' = 'center') {
  if (anchor === 'left') return 'translate(0, -50%)'
  if (anchor === 'right') return 'translate(-100%, -50%)'
  return 'translate(-50%, -50%)'
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-[#1e5aa8]/40 bg-[#05162c]/90">
    <div class="border-b border-[#1e5aa8]/30 px-2 pt-2 pb-1">
      <div class="px-1 text-[10px] text-[#7aa7d8]">温度 (℃)</div>
      <div class="h-[150px] md:h-[168px]">
        <VChart :option="chartOption" class="h-full w-full" autoresize />
      </div>
    </div>

    <div class="relative px-2 pb-2 pt-1 space-y-2">
      <aside
        class="w-full rounded border border-[#2a6bb0]/45 bg-[#061830]/92 px-3 py-2 text-[10px] text-[#d8ecff] md:text-[11px]"
      >
        <div
          class="mb-1.5 flex items-center justify-between gap-2 border-b border-[#2a6bb0]/35 pb-1"
        >
          <span class="text-[11px] font-semibold text-cyan-200/95">当前工况</span>
          <span class="font-mono text-[10px] text-[#7aa7d8]">
            烧成带 C4 · 车 {{ num(values.CAR_NO, 0) }}
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-x-3 gap-y-1.5">
          <div class="min-w-0 leading-snug">
            <div class="text-[10px] text-[#7aa7d8]">当前位置</div>
            <div class="truncate font-mono text-[11px] text-[#d8ecff]">
              烧成带 C4 {{ num(values.CAR_POS, 0) }}车位
            </div>
          </div>
          <div class="min-w-0 leading-snug">
            <div class="text-[10px] text-[#7aa7d8]">窑车编号</div>
            <div class="truncate font-mono text-[11px] text-[#d8ecff]">
              {{ num(values.CAR_NO, 0) }}
            </div>
          </div>
          <div class="min-w-0 leading-snug">
            <div class="text-[10px] text-[#7aa7d8]">计划温度</div>
            <div class="truncate font-mono text-[11px] text-[#d8ecff]">
              {{ num(values.PLAN_TEMP, 0) }}
            </div>
          </div>
          <div class="min-w-0 leading-snug">
            <div class="text-[10px] text-[#7aa7d8]">材质</div>
            <div class="truncate font-mono text-[11px] text-[#d8ecff]">
              高耐磨砖 / 硅莫红砖
            </div>
          </div>
          <div class="min-w-0 leading-snug">
            <div class="text-[10px] text-[#7aa7d8]">数量</div>
            <div class="truncate font-mono text-[11px] text-[#d8ecff]">
              {{ num(values.QTY, 0) }}
            </div>
          </div>
          <div class="min-w-0 leading-snug">
            <div class="text-[10px] text-[#7aa7d8]">项目名称</div>
            <div class="truncate font-mono text-[11px] text-[#d8ecff]">
              冀东水泥铜川有限公司
            </div>
          </div>
        </div>
      </aside>

      <div class="relative w-full">
        <div class="relative mb-0.5 h-5 w-full">
          <div
            v-for="z in zones"
            :key="`ztop-${z.key}`"
            class="pointer-events-none absolute top-0 z-20"
            :style="{ left: `${z.x}%`, transform: 'translateX(-50%)' }"
          >
            <div
              class="pointer-events-none whitespace-nowrap text-center text-[11px] font-bold leading-none md:text-[12px]"
              style="
                color: #ff4a4a;
                text-shadow:
                  0 0 1px #0a4a9a, 1px 0 0 #1a6fd4, -1px 0 0 #1a6fd4,
                  0 1px 0 #1a6fd4, 0 -1px 0 #1a6fd4;
              "
            >
              {{ z.label }}
              <span class="font-mono font-semibold text-white">{{ num(z.temp, 0) }} ℃</span>
            </div>
          </div>
        </div>

        <div class="relative w-full" :style="{ aspectRatio: KILN_ASPECT }">
          <TunnelKilnDrawing class="absolute inset-0 w-full" />

          <div
            class="absolute z-20"
            :style="{ left: '1.4%', top: '55%', transform: pinTransform() }"
          >
            <div
              class="pointer-events-none text-[10px] font-semibold tracking-[0.35em] text-[#cfe6ff]/88"
              style="writing-mode: vertical-rl; text-orientation: mixed"
            >
              冷却带
            </div>
          </div>
          <div
            class="absolute z-20"
            :style="{ left: '98.6%', top: '55%', transform: pinTransform() }"
          >
            <div
              class="pointer-events-none text-[10px] font-semibold tracking-[0.35em] text-[#cfe6ff]/88"
              style="writing-mode: vertical-rl; text-orientation: mixed"
            >
              预热带
            </div>
          </div>

          <div
            class="absolute z-20"
            :style="{ left: '12%', top: '22%', transform: pinTransform() }"
          >
            <div
              class="pointer-events-none whitespace-nowrap rounded-[2px] border border-black bg-black/90 px-1.5 py-[2px] font-mono text-[10px] leading-none text-white"
            >
              R2: {{ num(values.R2, 0) }}
            </div>
          </div>
          <div
            class="absolute z-20"
            :style="{ left: '20%', top: '22%', transform: pinTransform() }"
          >
            <div
              class="pointer-events-none whitespace-nowrap rounded-[2px] border border-black bg-black/90 px-1.5 py-[2px] font-mono text-[10px] leading-none text-white"
            >
              Kp2: {{ num(values.KP2, 2) }}
            </div>
          </div>
          <div
            class="absolute z-20"
            :style="{ left: '88%', top: '16%', transform: pinTransform() }"
          >
            <div
              class="pointer-events-none whitespace-nowrap rounded-[2px] border border-black bg-black/90 px-1.5 py-[2px] font-mono text-[10px] leading-none text-white"
            >
              Kp1: {{ num(values.KP1, 2) }}
            </div>
          </div>

          <div
            class="pointer-events-none absolute inset-x-0 z-20"
            :style="{ top: `${BASE_TOP_PCT}%`, height: `${BASE_H_PCT}%` }"
          >
            <div
              class="absolute top-1/2 flex -translate-y-1/2 flex-col items-center justify-center px-1 text-center"
              :style="{
                left: `${BASE_SEGS[0].leftPct}%`,
                width: `${BASE_SEGS[0].widthPct}%`,
              }"
            >
              <div class="text-[10px] leading-tight text-[#9ec4ea] md:text-[11px]">
                助燃风温度
              </div>
              <div
                class="font-mono text-[13px] font-semibold leading-tight text-[#ffe08a] md:text-[15px]"
              >
                {{ num(values.AIR_TEMP, 0) }}
                <span class="ml-0.5 text-[11px] font-normal text-[#cfe6ff]/80">°C</span>
              </div>
            </div>

            <div
              v-for="z in zones"
              :key="`base-${z.key}`"
              class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-mono text-[10px] leading-[1.35] md:text-[11px]"
              :style="{ left: `${z.x}%` }"
            >
              <div>
                <span class="text-[#8eb6e8]">GAS:</span>
                <span class="text-[#ffe08a]">{{ num(z.gas, 2) }}</span>
                <span class="text-[#7aa7d8]">m³/h</span>
              </div>
              <div>
                <span class="text-[#8eb6e8]">AIR:</span>
                <span class="text-[#6dff6d]">{{ num(z.air, 1) }}</span>
                <span class="text-[#7aa7d8]">m³/h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
