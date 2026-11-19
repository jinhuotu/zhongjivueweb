<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatKilnNumber as fmt } from '@/lib/kiln-studio-format'

const props = defineProps<{
  times: number[]
  labels: string[]
  series: { name: string; values: (number | null)[] }[]
  cursor: number
  unit?: string
  gapBefore?: boolean[]
}>()
const emit = defineEmits<{ seek: [index: number] }>()
const colors = ['#45dfc1', '#ffc477', '#6ebaff', '#eab0fd']
const plot = ref<SVGSVGElement>()
const width = ref(710)
watch(plot, (element, _, cleanup) => {
  if (!element) return
  const resize = new ResizeObserver(entries => { width.value = Math.max(180, entries[0]!.contentRect.width) })
  resize.observe(element)
  cleanup(() => resize.disconnect())
}, {flush:'post'})
const bounds = computed(() => {
  const values = props.series.flatMap(s => s.values.filter((n): n is number => n != null && Number.isFinite(n)))
  const min = Math.min(...values), max = Math.max(...values)
  const pad = (max - min || Math.abs(max) || 1) * .12
  return values.length ? { low: min - pad, high: max + pad } : null
})
const x = (index: number) => 58 + (width.value - 70) * ((props.times[index] ?? 0) - (props.times[0] ?? 0)) / ((props.times.at(-1) ?? 0) - (props.times[0] ?? 0) || 1)
function y(value: number) {
  const b = bounds.value!
  return 129 - (value - b.low) * 107 / (b.high - b.low)
}
const paths = computed(() => props.series.map(s => {
  let previous = false
  return s.values.map((value, i) => {
    if (value == null || !Number.isFinite(value)) { previous = false; return '' }
    const command = previous && !props.gapBefore?.[i] ? 'L' : 'M'
    previous = true
    return command + x(i).toFixed(1) + ' ' + y(value).toFixed(1)
  }).join(' ')
}))
function seek(event: PointerEvent) {
  const svg = plot.value
  if (!svg || !props.times.length) return
  if (event.type === 'pointerdown') svg.setPointerCapture(event.pointerId)
  else if (!svg.hasPointerCapture(event.pointerId)) return
  const rect = svg.getBoundingClientRect()
  const target = (event.clientX - rect.left) * width.value / rect.width
  let closest = 0
  for (let i = 1; i < props.times.length; i++) {
    if (Math.abs(x(i) - target) < Math.abs(x(closest) - target)) closest = i
  }
  emit('seek', closest)
}
</script>

<template>
  <div class="trend">
    <div class="legend"><span v-for="(s, i) in series" :key="s.name"><i :style="{ background: colors[i % colors.length] }" />{{ s.name }} <b>{{ fmt(s.values[cursor]) }}</b></span><small>{{ unit }}</small></div>
    <svg v-if="bounds" ref="plot" :viewBox="'0 0 ' + width + ' 158'" preserveAspectRatio="none" role="img" :aria-label="series.map(s => s.name).join('、') + '趋势'" @pointerdown="seek" @pointermove="seek">
      <g v-for="tick in [0,.5,1]" :key="tick"><line x1="58" :x2="width-12" :y1="129 - tick * 107" :y2="129 - tick * 107" class="grid" /><text x="52" :y="132 - tick * 107" text-anchor="end">{{ fmt(bounds.low + tick * (bounds.high - bounds.low), 2) }}</text></g>
      <path v-for="(d,i) in paths" :key="i" :d="d" fill="none" :stroke="colors[i % colors.length]" stroke-width="2" vector-effect="non-scaling-stroke" :stroke-dasharray="i % 2 ? '5 3' : undefined" />
      <line :x1="x(cursor)" :x2="x(cursor)" y1="14" y2="130" stroke="#b9d7e6" stroke-dasharray="3 3"/>
      <template v-for="(s,i) in series" :key="s.name"><circle v-if="s.values[cursor] != null" :cx="x(cursor)" :cy="y(s.values[cursor]!)" r="4" :fill="colors[i % colors.length]" /></template>
      <text x="58" y="150">{{ labels[0] }}</text><text :x="width-12" y="150" text-anchor="end">{{ labels.at(-1) }}</text>
    </svg>
    <div v-else class="empty">此测点在所选记录中缺测</div>
  </div>
</template>
<style scoped>
.trend { min-width:0; color:#cae0ed; background:#102534; border:1px solid #304e61; border-radius:9px; padding:12px; }
.legend { display:flex; gap:5px 16px; flex-wrap:wrap; align-items:center; font-size:11px; }
.legend span { display:inline-flex; gap:5px; align-items:center; }
.legend b { color:white; font:600 13px ui-monospace,monospace; }
.legend i { width:10px; height:3px; border-radius:3px; }.legend small { margin-left:auto; color:#9fbac9; }
svg { width:100%; height:155px; touch-action:pan-y; cursor:crosshair; }
svg text { font:11px system-ui,sans-serif; fill:#9db9c9; }.grid { stroke:#345062; stroke-dasharray:3 5; }
.empty { padding:35px 10px; font-size:12px; text-align:center; color:#aec5cf; }
</style>

