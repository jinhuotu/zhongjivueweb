<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Activity, Radio, Gauge, Thermometer, Loader2 } from 'lucide-vue-next'
import Panel from '@/components/ui-kit/Panel.vue'
import PageHeader from '@/components/ui-kit/PageHeader.vue'
import StatusDot from '@/components/ui-kit/StatusDot.vue'
import Tag from '@/components/ui-kit/Tag.vue'
import KpiCard from '@/components/ui-kit/KpiCard.vue'
import { TrendLine, GaugeRadial } from '@/components/ui-kit/charts'
import { COLOR } from '@/lib/mock'
import {
  type FurnaceItem,
  type ProcessSample,
  getFurnaceSeries,
  getFurnaceSnapshot,
  listFurnaces,
} from '@/lib/furnaces-api'
import { ApiError } from '@/lib/api'

const PLAY_INTERVAL_MS = 1500
const WINDOW = 40
const DEFAULT_KILN = 'TC-03'

const TABLE_HEADERS = [
  '编号',
  '名称',
  '状态',
  '区均温度',
  '天然气流量',
  '空燃比 λ',
  '窑压',
  '残氧 O₂',
  'CO₂/h',
  '最新/回放时刻',
]

function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return '——'
  return n.toFixed(digits)
}

function shortTime(ts: string | null | undefined) {
  if (!ts) return ''
  const part = ts.includes(' ') ? ts.split(' ')[1] : ts
  return part?.slice(0, 8) || ts
}

function toLocalSql(ms: number) {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function statusOf(
  s: string,
): 'running' | 'warning' | 'alarm' | 'idle' | 'offline' {
  if (s === 'running' || s === 'warning' || s === 'alarm' || s === 'idle' || s === 'offline') {
    return s
  }
  return 'idle'
}

const router = useRouter()
const furnaces = ref<FurnaceItem[]>([])
const code = ref(DEFAULT_KILN)
const windowPoints = ref<ProcessSample[]>([])
const live = ref<ProcessSample | null>(null)
const offset = ref(0)
const maxOffset = ref(0)
const tick = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

let playTimer: ReturnType<typeof setInterval> | null = null
let fetchGen = 0

const active = computed(
  () => furnaces.value.find((f) => f.code === code.value) || furnaces.value[0] || null,
)

const chartData = computed(() =>
  windowPoints.value.map((p) => ({
    name: shortTime(p.ts),
    炉膛温度: p.zoneAvgTemp ?? p.tempSp ?? 0,
    空燃比: p.afrSp ?? 0,
  })),
)

const liveTemp = computed(() => live.value?.zoneAvgTemp ?? live.value?.tempSp ?? 0)
const liveAfr = computed(() => live.value?.afrSp ?? 0)
const liveO2 = computed(() => live.value?.o2Meas ?? 0)
const liveGas = computed(() => live.value?.gasFlowInstant ?? 0)
const liveCo2 = computed(() => live.value?.co2Hourly ?? 0)
const burnerLoad = computed(() =>
  Math.max(0, Math.min(100, Math.round((liveGas.value / 2500) * 100))),
)
const tempProgress = computed(() =>
  Math.max(0, Math.min(100, Math.round((liveTemp.value / 1400) * 100))),
)
const o2Gauge = computed(() => Number(fmt(liveO2.value, 2)) || 0)
const afrGauge = computed(() => Number(fmt(liveAfr.value, 2)) || 0)

async function bootstrap() {
  loading.value = true
  error.value = null
  try {
    const list = await listFurnaces()
    furnaces.value = list
    const pick =
      list.find((f) => f.code === DEFAULT_KILN)?.code || list[0]?.code || DEFAULT_KILN
    code.value = pick
    const item = list.find((f) => f.code === pick)
    const start = item?.dataRange?.startTs
    const end = item?.dataRange?.endTs
    if (start && end) {
      const startMs = Date.parse(start.replace(/-/g, '/'))
      const endMs = Date.parse(end.replace(/-/g, '/'))
      maxOffset.value = Math.max(0, Math.floor((endMs - startMs) / 60000))
      offset.value = 0
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      router.replace('/login?next=/realtime')
      return
    }
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function stopPlay() {
  if (playTimer != null) {
    clearInterval(playTimer)
    playTimer = null
  }
}

function startPlay() {
  stopPlay()
  if (loading.value || maxOffset.value <= 0) return
  playTimer = setInterval(() => {
    offset.value = offset.value >= maxOffset.value ? 0 : offset.value + 1
  }, PLAY_INTERVAL_MS)
}

async function fetchWindow() {
  if (!code.value || loading.value) return
  const gen = ++fetchGen
  try {
    const snap = await getFurnaceSnapshot(code.value, { offsetMinutes: offset.value })
    if (gen !== fetchGen) return
    live.value = snap.sample
    tick.value += 1
    if (!snap.sample?.ts) return
    const endMs = Date.parse(snap.sample.ts.replace(/-/g, '/'))
    const fromStr = toLocalSql(endMs - (WINDOW - 1) * 60_000)
    const series = await getFurnaceSeries(code.value, {
      from: fromStr,
      to: snap.sample.ts,
      stepMinutes: 1,
      limit: WINDOW,
    })
    if (gen !== fetchGen) return
    windowPoints.value = series.points || []
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      router.replace('/login?next=/realtime')
    }
  }
}

function selectFurnace(f: FurnaceItem) {
  code.value = f.code
  offset.value = 0
  const start = f.dataRange?.startTs
  const end = f.dataRange?.endTs
  if (start && end) {
    const startMs = Date.parse(start.replace(/-/g, '/'))
    const endMs = Date.parse(end.replace(/-/g, '/'))
    maxOffset.value = Math.max(0, Math.floor((endMs - startMs) / 60000))
  } else {
    maxOffset.value = 0
  }
}

onMounted(() => {
  void bootstrap()
})

onUnmounted(() => {
  stopPlay()
  fetchGen += 1
})

watch([loading, maxOffset, code], () => {
  startPlay()
})

watch([offset, code, loading], () => {
  void fetchWindow()
})
</script>

<template>
  <div>
    <PageHeader
      title="实时态势"
      description="硬件未接通时，按 2024 历史分钟数据回放：1.5 秒推进一步（约 1 分钟工况），标注演示数据源。"
    >
      <template #badges>
        <Tag tone="iron">
          <Radio class="size-3 mr-0.5 inline" />
          PLAYBACK · {{ tick }}
        </Tag>
        <Tag tone="molybdenum">{{ code }}</Tag>
        <Tag v-if="live?.ts" tone="coolant">{{ live.ts }}</Tag>
      </template>
    </PageHeader>

    <div
      v-if="error"
      class="mb-4 text-sm text-iron border border-iron/30 bg-iron/5 rounded-md px-3 py-2"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="flex items-center gap-2 text-sm text-muted-foreground py-16 justify-center"
    >
      <Loader2 class="size-4 animate-spin" />
      加载历史回放…
    </div>

    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          :label="`${active?.name || code} 区均温度`"
          :value="fmt(liveTemp, 1)"
          unit="℃"
          tone="iron"
          hint="历史回放 1.5s"
        >
          <template #icon><Thermometer class="size-4" /></template>
        </KpiCard>
        <KpiCard
          label="空燃比设定 λ"
          :value="fmt(liveAfr, 2)"
          unit=""
          tone="patina"
          hint="Excel 设定值"
        >
          <template #icon><Gauge class="size-4" /></template>
        </KpiCard>
        <KpiCard
          label="瞬时碳排（估）"
          :value="fmt(liveCo2, 3)"
          unit="t/h"
          tone="molybdenum"
          hint="燃气瞬时 × 因子"
        >
          <template #icon><Activity class="size-4" /></template>
        </KpiCard>
        <KpiCard
          label="天然气瞬时"
          :value="fmt(liveGas, 1)"
          unit="m³/h"
          tone="coolant"
          :hint="`offset ${offset}/${maxOffset} min`"
        >
          <template #icon><Radio class="size-4" /></template>
        </KpiCard>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <Panel
          class="xl:col-span-2"
          :title="`${active?.name || code} · 回放工艺曲线`"
          subtitle="区均温度（℃） + 空燃比设定"
        >
          <TrendLine
            :data="chartData"
            :keys="[
              { key: '炉膛温度', color: COLOR.iron },
              { key: '空燃比', color: COLOR.patina, dashed: true },
            ]"
            :height="280"
          />
        </Panel>

        <Panel title="工艺仪表盘" flush>
          <div class="grid grid-cols-2 gap-2 p-4">
            <div class="text-center">
              <GaugeRadial
                :value="burnerLoad"
                unit="%"
                label="燃气负荷估"
                :color="COLOR.iron"
                :height="130"
              />
            </div>
            <div class="text-center">
              <GaugeRadial
                :value="o2Gauge"
                :max="6"
                unit="%"
                label="残氧 O₂"
                :color="COLOR.molybdenum"
                :height="130"
              />
            </div>
            <div class="text-center">
              <GaugeRadial
                :value="afrGauge"
                :max="10"
                unit=""
                label="空燃比 λ"
                :color="COLOR.sulfur"
                :height="130"
              />
            </div>
            <div class="text-center">
              <GaugeRadial
                :value="tempProgress"
                unit="%"
                label="温度进度估"
                :color="COLOR.patina"
                :height="130"
              />
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="车式窑测点矩阵"
        subtitle="点击切换回放窑号 · 当前仅 TC-03 有历史样本"
        flush
      >
        <div class="overflow-x-auto">
          <table class="w-full text-xs min-w-[1000px]">
            <thead class="text-muted-foreground bg-background/40">
              <tr class="border-b border-border">
                <th
                  v-for="h in TABLE_HEADERS"
                  :key="h"
                  class="text-left font-medium px-4 py-2.5"
                >
                  {{ h }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="f in furnaces"
                :key="f.code"
                class="hover:bg-background/40 transition cursor-pointer"
                @click="selectFurnace(f)"
              >
                <td class="px-4 py-2.5 data-num text-muted-foreground">{{ f.code }}</td>
                <td class="px-4 py-2.5">{{ f.name }}</td>
                <td class="px-4 py-2.5">
                  <StatusDot :status="statusOf(f.status)" />
                </td>
                <td class="px-4 py-2.5 data-num text-iron">
                  {{ fmt((f.code === code ? live : f.snapshot)?.zoneAvgTemp ?? f.temperature, 1) }}℃
                </td>
                <td class="px-4 py-2.5 data-num text-molybdenum">
                  {{ fmt((f.code === code ? live : f.snapshot)?.gasFlowInstant ?? f.gas, 1) }} m³/h
                </td>
                <td class="px-4 py-2.5 data-num">
                  {{ fmt((f.code === code ? live : f.snapshot)?.afrSp ?? f.afr, 2) }}
                </td>
                <td class="px-4 py-2.5 data-num">
                  {{ fmt((f.code === code ? live : f.snapshot)?.furnacePMeas ?? f.furnacePressure, 1) }} Pa
                </td>
                <td class="px-4 py-2.5 data-num">
                  {{ fmt((f.code === code ? live : f.snapshot)?.o2Meas ?? f.o2, 2) }}%
                </td>
                <td class="px-4 py-2.5 data-num text-patina">
                  {{ fmt((f.code === code ? live : f.snapshot)?.co2Hourly ?? f.co2Hourly, 3) }} t
                </td>
                <td class="px-4 py-2.5 data-num text-muted-foreground">
                  {{ f.code === code ? live?.ts || '——' : f.latestTs || '——' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </template>
  </div>
</template>
