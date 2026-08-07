<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Check,
  History,
  Loader2,
  Search,
  Send,
  Siren,
} from 'lucide-vue-next'
import { PageHeader, StatusDot, Tag } from '@/components/ui-kit'
import { TrendLine } from '@/components/ui-kit/charts'
import { COLOR } from '@/lib/mock'
import ScadaChrome from '@/components/production/ScadaChrome.vue'
import CarKilnScada from '@/components/production/CarKilnScada.vue'
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

function formatClock() {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} 星期${week}`
}

const SERIES_OPTIONS = [
  { key: '温度', field: 'zoneAvgTemp' as const },
  { key: '空燃比', field: 'afrSp' as const },
  { key: '燃气瞬时', field: 'gasFlowInstant' as const },
  { key: '助燃风瞬时', field: 'airFlowInstant' as const },
  { key: '窑内压力', field: 'furnacePMeas' as const },
  { key: '残氧', field: 'o2Meas' as const },
]

const CTRL_OPTIONS = [
  { code: 'TEMP_SP', name: '温度设定' },
  { code: 'AFR_SP', name: '空燃比设定' },
  { code: 'FURNACE_P', name: '窑压设定' },
  { code: 'O2_SP', name: '残氧设定' },
]

const router = useRouter()
const items = ref<FurnaceItem[]>([])
const active = ref('')
const points = ref<ProcessSample[]>([])
const loading = ref(true)
const seriesLoading = ref(false)
const error = ref<string | null>(null)
const q = ref('')
const seriesTag = ref('温度')
const ctrlTag = ref('TEMP_SP')
const ctrlValue = ref('')
const sending = ref(false)
const toast = ref('')
const now = ref(formatClock())
const commands = ref<
  Array<{ id: string; tagCode: string; targetValue: string; status: string }>
>([])
const acked = ref<Set<string>>(new Set())

let clockTimer: number | undefined

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

async function loadSeries() {
  if (!active.value) return
  seriesLoading.value = true
  try {
    const series = await getFurnaceSeries(active.value, {
      stepMinutes: 10,
      limit: 200,
    })
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
}

onMounted(() => {
  void loadList()
  clockTimer = window.setInterval(() => {
    now.value = formatClock()
  }, 1000)
})

onUnmounted(() => {
  if (clockTimer) window.clearInterval(clockTimer)
})

watch(active, () => {
  void loadSeries()
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

const running = computed(() => items.value.filter((f) => f.status === 'running').length)
const warning = computed(() => items.value.filter((f) => f.status === 'warning').length)
const alarm = computed(() => items.value.filter((f) => f.status === 'alarm').length)

const chart = computed(() => {
  const opt = SERIES_OPTIONS.find((o) => o.key === seriesTag.value) || SERIES_OPTIONS[0]
  return points.value.map((p) => ({
    name: shortTime(p.ts),
    v: (p[opt.field] as number | null) ?? 0,
  }))
})

const chartKeys = computed(() => [
  { key: 'v', color: COLOR.molybdenum, label: seriesTag.value },
])

const alarms = computed(() => {
  const list: Array<{
    id: string
    title: string
    raisedAt: string
    level: 'alarm' | 'warning'
    status: 'active' | 'acked'
  }> = []
  for (const f of items.value) {
    if (f.status !== 'alarm' && f.status !== 'warning') continue
    const id = `furn-${f.code}`
    list.push({
      id,
      title:
        f.status === 'alarm'
          ? `${f.name} 告警：请检查燃烧/压力回路`
          : `${f.name} 预警：工况偏离设定`,
      raisedAt: f.latestTs || '——',
      level: f.status === 'alarm' ? 'alarm' : 'warning',
      status: acked.value.has(id) ? 'acked' : 'active',
    })
  }
  return list
})

const activeAlarmCount = computed(
  () => alarms.value.filter((a) => a.status === 'active').length,
)

const panel =
  'rounded-lg border border-border bg-card p-3 text-text-primary shadow-sm'
const input =
  'rounded border border-border bg-bg-surface text-text-primary text-[11px] placeholder:text-text-muted'

function onRefresh() {
  void loadList()
  void loadSeries()
}

function ackAlarm(id: string) {
  const next = new Set(acked.value)
  next.add(id)
  acked.value = next
}

async function onSend() {
  const v = Number(ctrlValue.value)
  if (!ctrlTag.value || Number.isNaN(v)) {
    toast.value = '请填写有效目标值'
    window.setTimeout(() => {
      toast.value = ''
    }, 2500)
    return
  }
  sending.value = true
  try {
    await new Promise((r) => window.setTimeout(r, 400))
    commands.value = [
      {
        id: `${Date.now()}`,
        tagCode: ctrlTag.value,
        targetValue: String(v),
        status: 'simulated',
      },
      ...commands.value,
    ].slice(0, 20)
    toast.value = `已模拟下发 ${ctrlTag.value}=${v}`
    ctrlValue.value = ''
    window.setTimeout(() => {
      toast.value = ''
    }, 2500)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <PageHeader
      title="车式窑监控"
      description="车式窑工艺 SCADA：燃气/助燃风/排烟管线 + 分区燃烧器测点，右侧为历史回溯、模拟下发与报警。"
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
        <span v-if="toast" class="font-mono text-[12px] text-patina">{{ toast }}</span>
      </template>
    </PageHeader>

    <div
      v-if="error"
      class="rounded-md border border-iron/30 bg-iron/5 px-3 py-2 text-sm text-iron"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"
    >
      <Loader2 class="size-4 animate-spin" />
      加载窑台账…
    </div>

    <div
      v-else-if="!cur"
      class="py-16 text-center text-sm text-muted-foreground"
    >
      暂无窑数据。请先执行导入脚本并确认 furnaces 表有记录。
    </div>

    <div
      v-else
      class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <ScadaChrome
        :title="`${cur.name} · 车式窑控制系统`"
        :clock="now"
        :loading="loading || seriesLoading"
        @refresh="onRefresh"
      >
        <CarKilnScada :furnace="cur" :sample="cur.snapshot" />
      </ScadaChrome>

      <div class="space-y-3">
        <section :class="panel">
          <div class="mb-2 text-[12px] font-medium text-molybdenum">窑炉选择</div>
          <div class="relative mb-2">
            <Search
              class="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              v-model="q"
              :class="`h-7 w-full pl-7 pr-2 ${input}`"
              placeholder="搜索编号 / 名称"
            />
          </div>
          <div class="max-h-[140px] space-y-1 overflow-y-auto">
            <button
              v-for="f in filtered"
              :key="f.code"
              type="button"
              :class="[
                'flex w-full items-center justify-between rounded border px-2 py-1.5 text-left transition',
                f.code === active
                  ? 'border-iron/40 bg-iron/10'
                  : 'border-transparent hover:bg-bg-base',
              ]"
              @click="active = f.code"
            >
              <div class="min-w-0">
                <div class="truncate text-[12px] font-medium">{{ f.name }}</div>
                <div class="data-num text-[10px] text-text-muted">{{ f.code }}</div>
              </div>
              <StatusDot :status="(f.status as 'running' | 'warning' | 'alarm' | 'idle')" />
            </button>
          </div>
        </section>

        <section :class="panel">
          <div class="mb-2 flex items-center justify-between">
            <div class="text-[12px] font-medium text-molybdenum">历史数据回溯</div>
            <select v-model="seriesTag" :class="`h-7 px-2 ${input}`">
              <option v-for="t in SERIES_OPTIONS" :key="t.key" :value="t.key">
                {{ t.key }}
              </option>
            </select>
          </div>
          <div class="h-[160px]">
            <TrendLine
              v-if="chart.length"
              :data="chart"
              :keys="chartKeys"
              :height="160"
            />
            <div
              v-else
              class="flex h-full items-center justify-center text-[11px] text-text-muted"
            >
              {{ seriesLoading ? '加载中…' : '暂无曲线' }}
            </div>
          </div>
        </section>

        <section :class="`${panel} space-y-2`">
          <div class="text-[12px] font-medium text-molybdenum">操作按钮 / 模拟下发</div>
          <select v-model="ctrlTag" :class="`h-8 w-full px-2 ${input}`">
            <option v-for="t in CTRL_OPTIONS" :key="t.code" :value="t.code">
              {{ t.code }} · {{ t.name }}
            </option>
          </select>
          <input
            v-model="ctrlValue"
            placeholder="目标值"
            :class="`h-8 w-full px-2 font-mono ${input}`"
          />
          <button
            type="button"
            class="kb-btn-primary h-8 w-full disabled:opacity-50"
            :disabled="sending || !ctrlTag"
            @click="onSend"
          >
            <Loader2 v-if="sending" class="size-3.5 animate-spin" />
            <Send v-else class="size-3.5" />
            模拟下发
          </button>
          <p class="text-[10px] text-text-muted">
            executor=simulate；当前区均 {{ fmt(cur.temperature, 1) }} ℃ · λ
            {{ fmt(cur.afr, 2) }}
          </p>
        </section>

        <section :class="panel">
          <div class="mb-2 text-[12px] font-medium text-molybdenum">
            报警异常 · 活跃 {{ activeAlarmCount }}
          </div>
          <div class="max-h-[160px] space-y-1.5 overflow-y-auto">
            <div
              v-if="alarms.length === 0"
              class="py-4 text-center text-[11px] text-text-muted"
            >
              暂无报警
            </div>
            <div
              v-for="a in alarms"
              :key="a.id"
              :class="[
                'rounded border p-2',
                a.status === 'active'
                  ? 'animate-pulse border-red-500/50 bg-red-500/10'
                  : 'border-border bg-bg-base/60',
              ]"
            >
              <div class="flex gap-2">
                <Siren
                  :class="[
                    'mt-0.5 size-3.5',
                    a.level === 'alarm' ? 'text-red-500' : 'text-amber-500',
                  ]"
                />
                <div class="min-w-0 flex-1">
                  <div class="text-[11px] text-text-primary">{{ a.title }}</div>
                  <div class="text-[10px] text-text-muted">{{ a.raisedAt }}</div>
                </div>
                <button
                  v-if="a.status === 'active'"
                  type="button"
                  class="size-6 rounded border border-border text-molybdenum hover:bg-accent"
                  title="确认"
                  @click="ackAlarm(a.id)"
                >
                  <Check class="mx-auto size-3" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section :class="panel">
          <div class="mb-2 text-[12px] font-medium text-molybdenum">下发记录</div>
          <div class="max-h-[120px] space-y-1 overflow-y-auto">
            <div
              v-if="commands.length === 0"
              class="py-3 text-center text-[11px] text-text-muted"
            >
              暂无记录
            </div>
            <div
              v-for="c in commands"
              :key="c.id"
              class="flex items-center gap-1.5 rounded border border-border px-1.5 py-1 font-mono text-[10px]"
            >
              <History class="size-3 text-text-muted" />
              <span class="flex-1 truncate">{{ c.tagCode }}={{ c.targetValue }}</span>
              <span class="text-patina">{{ c.status }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
