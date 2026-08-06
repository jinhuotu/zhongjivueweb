<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Flame, Search, Filter, Clock, Loader2 } from 'lucide-vue-next'
import { Panel, PageHeader, StatusDot, Tag, KpiCard } from '@/components/ui-kit'
import { TrendArea } from '@/components/ui-kit/charts'
import { COLOR } from '@/lib/mock'
import {
  type FurnaceItem,
  type ProcessSample,
  getFurnaceSeries,
  listFurnaces,
} from '@/lib/furnaces-api'
import { ApiError } from '@/lib/api'

function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return '——'
  return n.toFixed(digits)
}

function shortTime(ts: string | null | undefined) {
  if (!ts) return ''
  const part = ts.includes(' ') ? ts.split(' ')[1] : ts
  return part?.slice(0, 5) || ts
}

const router = useRouter()
const items = ref<FurnaceItem[]>([])
const active = ref('')
const points = ref<ProcessSample[]>([])
const loading = ref(true)
const seriesLoading = ref(false)
const error = ref<string | null>(null)
const q = ref('')

async function loadList() {
  loading.value = true
  error.value = null
  try {
    const list = await listFurnaces()
    items.value = list
    if (!active.value) active.value = list[0]?.code || ''
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace('/login?next=/furnaces')
      return
    }
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadList()
})

watch(active, async (code) => {
  if (!code) return
  seriesLoading.value = true
  try {
    const series = await getFurnaceSeries(code, { stepMinutes: 10, limit: 200 })
    points.value = series.points || []
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await router.replace('/login?next=/furnaces')
      return
    }
    points.value = []
  } finally {
    seriesLoading.value = false
  }
})

const filtered = computed(() => {
  const key = q.value.trim().toLowerCase()
  if (!key) return items.value
  return items.value.filter(
    (f) =>
      f.code.toLowerCase().includes(key) ||
      f.name.toLowerCase().includes(key) ||
      (f.kilnNo || '').toLowerCase().includes(key),
  )
})

const cur = computed(
  () => items.value.find((f) => f.code === active.value) || filtered.value[0] || null,
)
const snap = computed(() => cur.value?.snapshot)

const trend = computed(() =>
  points.value.map((p) => ({
    name: shortTime(p.ts),
    温度: p.zoneAvgTemp ?? p.tempSp ?? 0,
    空燃比: p.afrSp ?? 0,
  })),
)

const running = computed(() => items.value.filter((f) => f.status === 'running').length)
const warning = computed(() => items.value.filter((f) => f.status === 'warning').length)
const alarm = computed(() => items.value.filter((f) => f.status === 'alarm').length)

const zoneRows = computed(() => [
  ['一区', snap.value?.z1Temp],
  ['二区', snap.value?.z2Temp],
  ['三区', snap.value?.z3Temp],
  ['四区', snap.value?.z4Temp],
  ['五区', snap.value?.z5Temp],
  ['六区', snap.value?.z6Temp],
] as const)

const processRows = computed(() => [
  ['温度设定', `${fmt(snap.value?.tempSp, 1)} ℃`],
  ['空燃比 λ', fmt(snap.value?.afrSp, 2)],
  ['窑内压力', `${fmt(snap.value?.furnacePMeas, 1)} Pa`],
  ['残氧 O₂', `${fmt(snap.value?.o2Meas, 2)} %`],
  ['燃气瞬时', `${fmt(snap.value?.gasFlowInstant, 1)} m³/h`],
  ['助燃风瞬时', `${fmt(snap.value?.airFlowInstant, 1)} m³/h`],
  ['燃气压力', `${fmt(snap.value?.gasPMeas, 2)} kPa`],
  ['助燃风压力', `${fmt(snap.value?.airPMeas, 2)} kPa`],
])
</script>

<template>
  <PageHeader
    title="车式窑监控"
    description="台账与历史工况联调：当前已接入 3# 窑（TC-03）2024 年 Excel 分钟数据；趋势为真实采样抽稀展示。"
  >
    <template #badges>
      <Tag tone="patina">在线 {{ running }}</Tag>
      <Tag tone="sulfur">预警 {{ warning }}</Tag>
      <Tag tone="iron">告警 {{ alarm }}</Tag>
      <Tag v-if="cur?.dataRange?.sampleCount != null" tone="molybdenum">
        样本 {{ cur.dataRange.sampleCount.toLocaleString() }}
      </Tag>
    </template>
    <template #actions>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
        @click="loadList"
      >
        <Filter class="size-3.5" />刷新
      </button>
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
    加载窑台账…
  </div>

  <div
    v-else-if="!cur"
    class="text-sm text-muted-foreground py-16 text-center"
  >
    暂无窑数据。请先执行导入脚本并确认 furnaces 表有记录。
  </div>

  <div v-else class="grid grid-cols-12 gap-5">
    <div class="col-span-12 lg:col-span-4 xl:col-span-3">
      <Panel title="车式窑清单" flush>
        <div class="p-3 border-b border-border">
          <div class="relative">
            <Search
              class="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              v-model="q"
              class="w-full h-8 pl-7 pr-3 bg-background border border-border rounded text-xs"
              placeholder="搜索编号 / 名称"
            />
          </div>
        </div>
        <ul class="max-h-[640px] overflow-y-auto">
          <li
            v-for="f in filtered"
            :key="f.code"
            :class="
              f.code === active
                ? 'px-4 py-3 cursor-pointer border-l-2 border-iron bg-iron/5'
                : 'px-4 py-3 cursor-pointer border-l-2 border-transparent hover:bg-background/40'
            "
            @click="active = f.code"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[10px] text-muted-foreground data-num">{{ f.code }}</div>
                <div class="text-sm font-medium mt-0.5">{{ f.name }}</div>
              </div>
              <StatusDot :status="(f.status as 'running' | 'warning' | 'alarm' | 'idle')" />
            </div>
            <div class="mt-1.5 text-[10px] text-muted-foreground">
              {{ (f.type || '燃气车式窑') + ' · ' + (f.workshop || '——') }}
            </div>
          </li>
        </ul>
      </Panel>
    </div>

    <div class="col-span-12 lg:col-span-8 xl:col-span-9 space-y-5">
      <Panel :title="`${cur.name} 设备档案`" flush>
        <div class="p-5">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <div class="text-[11px] text-muted-foreground mb-1">设备编号</div>
              <div class="data-num text-base font-semibold">{{ cur.code }}</div>
            </div>
            <div>
              <div class="text-[11px] text-muted-foreground mb-1">设备类型</div>
              <div class="text-sm">{{ cur.type || '——' }}</div>
            </div>
            <div>
              <div class="text-[11px] text-muted-foreground mb-1">窑号</div>
              <div class="data-num text-sm">{{ cur.kilnNo || '——' }}</div>
            </div>
            <div>
              <div class="text-[11px] text-muted-foreground mb-1">历史样本</div>
              <div class="data-num text-sm">
                {{ (cur.dataRange?.sampleCount ?? 0).toLocaleString() }} 点
              </div>
            </div>
            <div>
              <div class="text-[11px] text-muted-foreground mb-1">所属车间</div>
              <div class="text-sm flex items-center gap-1.5">
                <Flame class="size-3.5 text-muted-foreground" />
                {{ cur.workshop || '——' }}
              </div>
            </div>
            <div>
              <div class="text-[11px] text-muted-foreground mb-1">数据区间</div>
              <div class="text-[11px] data-num text-muted-foreground leading-relaxed">
                {{ cur.dataRange?.startTs || '——' }}
                <br />
                ~ {{ cur.dataRange?.endTs || '——' }}
              </div>
            </div>
            <div>
              <div class="text-[11px] text-muted-foreground mb-1">运行状态</div>
              <StatusDot :status="(cur.status as 'running' | 'warning' | 'alarm' | 'idle')" />
            </div>
            <div>
              <div class="text-[11px] text-muted-foreground mb-1">最新工况时刻</div>
              <div class="text-sm flex items-center gap-1.5 text-coolant">
                <Clock class="size-3.5" />
                {{ cur.latestTs || '——' }}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="区均温度" :value="fmt(cur.temperature, 1)" unit="℃" tone="iron" />
        <KpiCard label="天然气瞬时" :value="fmt(cur.gas, 1)" unit="m³/h" tone="molybdenum" />
        <KpiCard label="空燃比设定" :value="fmt(cur.afr, 2)" unit="" tone="patina" />
        <KpiCard label="CO₂/h（估）" :value="fmt(cur.co2Hourly, 3)" unit="t" tone="sulfur" />
      </div>

      <Panel
        title="历史工况趋势"
        :subtitle="
          seriesLoading
            ? '加载中…'
            : `温度（区均）/ 空燃比 · 近端数据 step=10min · ${points.length} 点`
        "
      >
        <TrendArea
          v-if="trend.length > 0"
          :data="trend"
          :keys="[
            { key: '温度', color: COLOR.iron },
            { key: '空燃比', color: COLOR.patina },
          ]"
          :height="260"
        />
        <div v-else class="text-xs text-muted-foreground py-10 text-center">
          暂无趋势数据
        </div>
      </Panel>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="分区温度（最新样本）">
          <div class="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
            <div
              v-for="[k, v] in zoneRows"
              :key="String(k)"
              class="flex items-center justify-between border-b border-dashed border-border pb-1.5"
            >
              <span class="text-muted-foreground">{{ k }}</span>
              <span class="data-num">{{ fmt(v as number | null, 1) }} ℃</span>
            </div>
          </div>
        </Panel>

        <Panel title="工艺关键参数（最新样本）">
          <div class="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
            <div
              v-for="([k, v], i) in processRows"
              :key="i"
              class="flex items-center justify-between border-b border-dashed border-border pb-1.5"
            >
              <span class="text-muted-foreground">{{ k }}</span>
              <span class="data-num">{{ v }}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  </div>
</template>
