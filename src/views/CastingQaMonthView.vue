<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ClipboardList, FileSpreadsheet, Loader2 } from 'lucide-vue-next'
import { PageHeader, Panel } from '@/components/ui-kit'
import { ApiError } from '@/lib/api'
import {
  parseWechatDaily,
  type WechatDailyParseResult,
} from '@/lib/casting-api'
import { downloadQaMonthExcel, scrubQaDay } from '@/lib/wechat-daily-excel'

const year = ref(2026)
const month = ref(8)
const pasteText = ref('')
const useLlm = ref(true)
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const lastParse = ref<WechatDailyParseResult | null>(null)
const days = ref<Array<WechatDailyParseResult | null>>(emptyDays())

const METRIC_ROWS: Array<{
  key: string
  label: string
  detail?: boolean
  value: (c: WechatDailyParseResult | null) => string
}> = [
  { key: 'taiShu', label: '台数', value: (c) => fmtNum(c?.taiShu) },
  { key: 'heGe', label: '合格率', value: (c) => fmtPct(c?.heGeRate) },
  { key: 'first', label: '一检', value: (c) => fmtPct(c?.firstRate) },
  { key: 'second', label: '二检汇总', value: (c) => fmtPct(c?.secondRate) },
  { key: 'recycle', label: '回收率', value: (c) => (c ? fmtPct(c.recycleRate ?? 100) : '') },
  { key: 'target', label: '指标', value: (c) => (c ? fmtPct(c.targetRate ?? 100) : '') },
  { key: 'fd', label: '一检偏差', value: (c) => fmtPct(c?.firstDeviation) },
  { key: 'sd', label: '二检偏差', value: (c) => fmtPct(c?.secondDeviation) },
  {
    key: 'fdl',
    label: '一检明细',
    detail: true,
    value: (c) => c?.firstDetails || '',
  },
  {
    key: 'sdl',
    label: '二检明细',
    detail: true,
    value: (c) => c?.secondDetails || '',
  },
]

function emptyDays(): Array<WechatDailyParseResult | null> {
  return Array.from({ length: 31 }, () => null)
}

function storageKey(y: number, m: number): string {
  return `zhongji-qa-month-v1-${y}-${m}`
}

function loadMonth(): void {
  try {
    const raw = localStorage.getItem(storageKey(year.value, month.value))
    if (!raw) {
      days.value = emptyDays()
      return
    }
    const parsed = JSON.parse(raw) as Array<WechatDailyParseResult | null>
    const next = emptyDays()
    parsed.slice(0, 31).forEach((item, i) => {
      next[i] = scrubQaDay(item || null)
    })
    days.value = next
    saveMonth()
  } catch {
    days.value = emptyDays()
  }
}

function saveMonth(): void {
  localStorage.setItem(storageKey(year.value, month.value), JSON.stringify(days.value))
}

function fmtNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return ''
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return ''
  return `${v.toFixed(1)}%`
}

const filledCount = computed(() => days.value.filter(Boolean).length)

onMounted(loadMonth)
watch([year, month], loadMonth)

async function runParse() {
  const text = pasteText.value.trim()
  if (!text) {
    error.value = '请粘贴微信群日报文字'
    return
  }
  loading.value = true
  error.value = ''
  lastParse.value = null
  try {
    const parsed = await parseWechatDaily({
      text,
      year: year.value,
      month: month.value,
      useLlm: useLlm.value,
    })
    lastParse.value = scrubQaDay(parsed)
    if (parsed.kind === 'weekly') {
      error.value = parsed.warnings?.join('；') || '识别为周报，未写入日列'
      return
    }
    if (!parsed.day) {
      error.value = '未能识别日期。请确认正文含「8月14日」或在上方选择月份后写明日期'
      return
    }
    const idx = parsed.day - 1
    const next = [...days.value]
    next[idx] = scrubQaDay(parsed)
    days.value = next
    saveMonth()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : '解析失败'
  } finally {
    loading.value = false
  }
}

function clearDay(day: number) {
  const next = [...days.value]
  next[day - 1] = null
  days.value = next
  saveMonth()
}

function clearMonth() {
  days.value = emptyDays()
  saveMonth()
  lastParse.value = null
}

async function exportExcel() {
  if (!filledCount.value) {
    error.value = '请先解析至少一天再导出'
    return
  }
  exporting.value = true
  error.value = ''
  try {
    await downloadQaMonthExcel(year.value, month.value, days.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导出失败'
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="h-full overflow-auto p-4 md:p-6">
    <PageHeader
      title="合格率月报"
      description="粘贴微信群「某日验收情况」文字，抽出当天一列；可连续粘贴多天后导出图一样式 Excel"
    />

    <Panel title="粘贴群聊日报" subtitle="只要文字，不要周报；截图不用贴。规则抽不全时会调用对话模型" class-name="mb-4">
      <div class="p-4 lg:px-5 grid gap-3 md:grid-cols-[160px_160px_1fr] items-end">
        <label class="block space-y-1.5">
          <span class="text-[11px] font-medium text-muted-foreground">年</span>
          <input
            v-model.number="year"
            type="number"
            class="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            :disabled="loading"
          />
        </label>
        <label class="block space-y-1.5">
          <span class="text-[11px] font-medium text-muted-foreground">月</span>
          <input
            v-model.number="month"
            type="number"
            min="1"
            max="12"
            class="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            :disabled="loading"
          />
        </label>
        <label class="flex items-center gap-2 h-10 text-sm text-muted-foreground">
          <input v-model="useLlm" type="checkbox" class="size-4" :disabled="loading" />
          规则抽不全时用模型补全
        </label>
      </div>
      <div class="px-4 lg:px-5 pb-3">
        <textarea
          v-model="pasteText"
          rows="10"
          class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm leading-relaxed"
          placeholder="粘贴例如：8月14日验收情况 … 熔铸出AZS砖：25.4吨成23.0，成品率90.8% … 加工环节：…"
          :disabled="loading"
        />
      </div>
      <div class="px-4 lg:px-5 pb-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="h-10 px-4 rounded-md bg-iron text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
          :disabled="loading || exporting"
          @click="runParse"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <ClipboardList v-else class="h-4 w-4" />
          {{ loading ? '解析中…' : '解析并填入当日' }}
        </button>
        <button
          type="button"
          class="h-10 px-4 rounded-md border border-border bg-background text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
          :disabled="loading || exporting || !filledCount"
          @click="exportExcel"
        >
          <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
          <FileSpreadsheet v-else class="h-4 w-4" />
          {{ exporting ? '导出中…' : '导出月表 Excel' }}
        </button>
        <button
          type="button"
          class="h-10 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground"
          :disabled="loading || !filledCount"
          @click="clearMonth"
        >
          清空本月
        </button>
        <span class="self-center text-xs text-muted-foreground">已填 {{ filledCount }} 天</span>
      </div>
      <p v-if="error" class="px-4 lg:px-5 pb-4 text-sm text-destructive">{{ error }}</p>
    </Panel>

    <Panel v-if="lastParse" title="本次解析" :subtitle="lastParse.reportDate || '未识别日期'" class-name="mb-4">
      <div class="p-4 lg:px-5 grid gap-3 sm:grid-cols-4 text-sm">
        <div>台数 {{ fmtNum(lastParse.taiShu) }}</div>
        <div>合格率 {{ fmtPct(lastParse.heGeRate) }}</div>
        <div>一检 {{ fmtPct(lastParse.firstRate) }}</div>
        <div>二检 {{ fmtPct(lastParse.secondRate) }}</div>
      </div>
      <div class="px-4 lg:px-5 pb-4 grid gap-3 md:grid-cols-2 text-xs whitespace-pre-wrap leading-relaxed text-muted-foreground">
        <div>
          <div class="font-medium text-foreground mb-1">一检明细</div>
          {{ lastParse.firstDetails || '—' }}
        </div>
        <div>
          <div class="font-medium text-foreground mb-1">二检明细</div>
          {{ lastParse.secondDetails || '—' }}
        </div>
      </div>
      <p v-if="lastParse.warnings?.length" class="px-4 lg:px-5 pb-4 text-xs text-amber-700 dark:text-amber-400">
        {{ lastParse.warnings.join('；') }}
      </p>
    </Panel>

    <Panel :title="`${year}年${month}月合格率情况`" subtitle="列=日；与样表同一套行。点日期可清除该天" class-name="mb-4">
      <div class="overflow-auto max-h-[640px] border-t border-border">
        <table class="qa-table">
          <thead>
            <tr>
              <th class="pin">指标</th>
              <th v-for="d in 31" :key="d" class="day">
                <button
                  type="button"
                  class="underline-offset-2 hover:underline disabled:no-underline"
                  :disabled="!days[d - 1]"
                  @click="clearDay(d)"
                >
                  {{ d }}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in METRIC_ROWS" :key="row.key" :class="{ detail: row.detail }">
              <th class="pin">{{ row.label }}</th>
              <td v-for="d in 31" :key="`${row.key}-${d}`" :class="{ filled: Boolean(days[d - 1]) }">
                {{ row.value(days[d - 1]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </div>
</template>

<style scoped>
.qa-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
  min-width: 100%;
  width: max-content;
}
.qa-table th,
.qa-table td {
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
  padding: 6px 8px;
  white-space: nowrap;
  text-align: center;
  background: var(--card);
  vertical-align: top;
}
.qa-table thead th {
  position: sticky;
  top: 0;
  z-index: 20;
  font-weight: 600;
  background: var(--card);
}
.qa-table .pin {
  position: sticky;
  left: 0;
  z-index: 12;
  text-align: left;
  min-width: 88px;
  background: var(--card);
}
.qa-table thead .pin {
  z-index: 30;
}
.qa-table .day {
  min-width: 72px;
}
.qa-table tbody tr.detail td {
  white-space: pre-wrap;
  text-align: left;
  font-size: 10px;
  max-width: 160px;
  line-height: 1.35;
}
.qa-table td.filled {
  background: color-mix(in srgb, var(--muted) 55%, var(--card));
}
</style>
