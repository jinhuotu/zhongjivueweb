<script setup lang="ts">
import { computed, ref } from 'vue'
import { FileSpreadsheet, Loader2, ScanLine } from 'lucide-vue-next'
import { DonutChart, GroupBar, KpiCard, PageHeader, Panel } from '@/components/ui-kit'
import { ApiError } from '@/lib/api'
import {
  queryCastingPeelReport,
  type PeelMetrics,
  type PeelReportResult,
  type PeelTableRow,
} from '@/lib/casting-api'
import { downloadPeelReportExcel, peelReportNotes } from '@/lib/peel-excel'

const contractCode = ref('25091')
const dateFrom = ref('')
const dateTo = ref('')
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const result = ref<PeelReportResult | null>(null)

const PIE_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed']
const BAR_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706']

function fmtRate(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return '—'
  return `${rate.toFixed(1)}%`
}

function fmtMetrics(m?: PeelMetrics | null): string {
  if (!m) return '—'
  return `${m.brickCnt} / ${m.peelCnt} / ${fmtRate(m.peelRate)}`
}

function dateCells(m?: PeelMetrics | null) {
  const peel = m?.peelCnt ?? 0
  return [
    { text: String(m?.brickCnt ?? 0), hot: false, split: true },
    { text: String(peel), hot: peel > 0, split: false },
    { text: fmtRate(m?.peelRate), hot: peel > 0, split: false },
  ]
}

function rowClass(row: PeelTableRow): string {
  if (row.kind === 'grandTotal') return 'is-grand'
  if (row.kind === 'furnaceTotal') return 'is-furnace'
  if (row.kind === 'shiftTotal') return 'is-shift-total'
  return ''
}

const furnaceDonut = computed(() =>
  (result.value?.furnacePie || []).map((s, i) => ({
    name: `${s.name} ${fmtRate(s.peelRate)}`,
    value: s.peelCnt,
    color: PIE_COLORS[i % PIE_COLORS.length],
  })),
)

const shiftDonut = computed(() =>
  (result.value?.shiftPie || []).map((s, i) => ({
    name: `${s.name} ${fmtRate(s.peelRate)}`,
    value: s.peelCnt,
    color: PIE_COLORS[i % PIE_COLORS.length],
  })),
)

const positionDonut = computed(() =>
  (result.value?.positionPie || []).map((s, i) => ({
    name: `${s.name} ${s.share.toFixed(2)}%`,
    value: s.peelCnt,
    color: PIE_COLORS[i % PIE_COLORS.length],
  })),
)

const barKeys = computed(() => {
  const shifts = result.value?.shifts || []
  return [
    { key: '平均', label: '平均', color: BAR_COLORS[0] },
    ...shifts.map((name, i) => ({
      key: name,
      label: name,
      color: BAR_COLORS[(i + 1) % BAR_COLORS.length],
    })),
  ]
})

const reportNotes = computed(() => (result.value?.found ? peelReportNotes(result.value) : []))

async function runQuery() {
  const code = contractCode.value.trim()
  if (!code) {
    error.value = '请填写合同号'
    return
  }
  loading.value = true
  error.value = ''
  try {
    result.value = await queryCastingPeelReport({
      contractCode: code,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
    })
    if (!result.value.found) {
      error.value = result.value.message
    }
  } catch (e) {
    result.value = null
    error.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : '查询失败'
  } finally {
    loading.value = false
  }
}

async function exportExcel() {
  if (!result.value?.found) {
    error.value = '请先生成报表后再导出'
    return
  }
  exporting.value = true
  error.value = ''
  try {
    await downloadPeelReportExcel(result.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '导出 Excel 失败'
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="h-full overflow-auto p-4 md:p-6">
    <PageHeader
      title="PT 砖材脱棱角统计"
      description="只计一检 213 自然脱棱角（不含 212 缺棱角）；出砖为合同 PT 物料的全部浇铸记录"
    />

    <Panel title="查询条件" subtitle="合同号对应销售合同 SaleContractCode，日期按浇铸日" class-name="mb-4">
      <div class="p-4 lg:px-5 grid gap-3 sm:grid-cols-4 items-end">
        <label class="block space-y-1.5">
          <span class="text-[11px] font-medium text-muted-foreground">合同号</span>
          <input
            v-model="contractCode"
            class="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            :disabled="loading"
            @keydown.enter="runQuery"
          />
        </label>
        <label class="block space-y-1.5">
          <span class="text-[11px] font-medium text-muted-foreground">浇铸日起</span>
          <input
            v-model="dateFrom"
            type="date"
            class="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            :disabled="loading"
          />
        </label>
        <label class="block space-y-1.5">
          <span class="text-[11px] font-medium text-muted-foreground">浇铸日止</span>
          <input
            v-model="dateTo"
            type="date"
            class="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
            :disabled="loading"
          />
        </label>
        <div class="flex gap-2">
          <button
            type="button"
            class="h-10 px-4 rounded-md bg-iron text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 flex-1"
            :disabled="loading || exporting"
            @click="runQuery"
          >
            <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
            <ScanLine v-else class="h-4 w-4" />
            {{ loading ? '查询中…' : '生成报表' }}
          </button>
          <button
            type="button"
            class="h-10 px-4 rounded-md border border-border bg-background text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
            :disabled="loading || exporting || !result?.found"
            @click="exportExcel"
          >
            <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
            <FileSpreadsheet v-else class="h-4 w-4" />
            {{ exporting ? '导出中…' : '导出 Excel' }}
          </button>
        </div>
      </div>
      <p v-if="error" class="px-4 lg:px-5 pb-4 text-sm text-destructive">{{ error }}</p>
    </Panel>

    <template v-if="result?.found">
      <div class="grid gap-3 sm:grid-cols-4 mb-4">
        <KpiCard label="PT 规格数" :value="result.specCnt" tone="iron">
          <template #icon><ScanLine class="h-4 w-4" /></template>
        </KpiCard>
        <KpiCard label="出砖数" :value="result.summary.brickCnt" tone="molybdenum" />
        <KpiCard label="脱棱角数" :value="result.summary.peelCnt" tone="sulfur" />
        <KpiCard label="脱棱角占比" :value="fmtRate(result.summary.peelRate)" tone="patina" />
      </div>

      <p
        v-if="result.warnings?.length"
        class="mb-4 text-xs text-amber-700 dark:text-amber-400"
      >
        {{ result.warnings.join('；') }}
      </p>

      <Panel
        :title="`${result.contractCode}合同 PT 砖材脱棱角情况统计`"
        :subtitle="`浇铸 ${result.dateFrom || '—'} ～ ${result.dateTo || '—'} · 每个日期下三列对齐：出砖 / 脱角 / 占比`"
        class-name="mb-4"
      >
        <div class="peel-scroll overflow-auto max-h-[560px]">
          <table class="peel-table">
            <colgroup>
              <col style="width: 76px" />
              <col style="width: 64px" />
              <col style="width: 76px" />
              <col style="width: 76px" />
              <col style="width: 76px" />
              <template v-for="d in result.dates" :key="`col-${d}`">
                <col style="width: 56px" />
                <col style="width: 48px" />
                <col style="width: 60px" />
              </template>
            </colgroup>
            <thead>
              <tr>
                <th class="pin pin-1" rowspan="2">电炉</th>
                <th class="pin pin-2" rowspan="2">班别</th>
                <th class="pin pin-3 num" rowspan="2">合计<br />出砖</th>
                <th class="pin pin-4 num" rowspan="2">合计<br />脱角</th>
                <th class="pin pin-5 num split-after" rowspan="2">合计<br />占比</th>
                <th
                  v-for="d in result.dates"
                  :key="d"
                  class="date-head"
                  colspan="3"
                >
                  {{ d.slice(5) }}
                </th>
              </tr>
              <tr>
                <template v-for="d in result.dates" :key="`${d}-sub`">
                  <th class="sub num date-split">出砖</th>
                  <th class="sub num">脱角</th>
                  <th class="sub num">占比</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in result.rows"
                :key="`${row.furnaceName}-${row.shiftName}-${idx}`"
                :class="rowClass(row)"
              >
                <td class="pin pin-1">{{ row.furnaceName || (row.kind === 'shiftTotal' ? '班别合计' : '') }}</td>
                <td class="pin pin-2">{{ row.shiftName || '—' }}</td>
                <td class="pin pin-3 num">{{ row.total.brickCnt }}</td>
                <td class="pin pin-4 num">{{ row.total.peelCnt }}</td>
                <td class="pin pin-5 num split-after">{{ fmtRate(row.total.peelRate) }}</td>
                <template v-for="d in result.dates" :key="`${idx}-${d}`">
                  <td
                    v-for="(cell, ci) in dateCells(row.byDate[d])"
                    :key="ci"
                    class="num"
                    :class="{ hot: cell.hot, 'date-split': cell.split }"
                  >
                    {{ cell.text }}
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel v-if="reportNotes.length" title="说明" class-name="mb-4">
        <div class="px-4 lg:px-5 py-3 text-sm leading-relaxed space-y-1">
          <p v-for="(line, i) in reportNotes" :key="i" :class="i === 0 ? 'font-medium' : ''">
            {{ line }}
          </p>
        </div>
      </Panel>

      <div class="grid gap-4 lg:grid-cols-2 mb-4">
        <Panel title="电炉占比" subtitle="扇区按脱棱角件数，标签为脱棱角率">
          <DonutChart v-if="furnaceDonut.length" :data="furnaceDonut" :height="240" />
          <p v-else class="p-4 text-sm text-muted-foreground">暂无数据</p>
        </Panel>
        <Panel title="班别占比" subtitle="扇区按脱棱角件数，标签为脱棱角率">
          <DonutChart v-if="shiftDonut.length" :data="shiftDonut" :height="240" />
          <p v-else class="p-4 text-sm text-muted-foreground">暂无数据</p>
        </Panel>
        <Panel title="分日脱棱角率" subtitle="平均 / 各班别" class-name="lg:col-span-2">
          <GroupBar
            v-if="result.dailyBars.length"
            :data="result.dailyBars"
            :keys="barKeys"
            :height="260"
            y-unit="%"
          />
          <p v-else class="p-4 text-sm text-muted-foreground">暂无数据</p>
        </Panel>
        <Panel title="脱角部位" subtitle="由一检原因描述归类：铸口→待口 / 底部 / 面">
          <DonutChart v-if="positionDonut.length" :data="positionDonut" :height="240" />
          <p v-else class="p-4 text-sm text-muted-foreground">暂无数据</p>
        </Panel>
      </div>

      <p class="text-[11px] text-muted-foreground pb-4">
        口径：213 脱棱角；212 不计；出砖=合同物料全部浇铸记录。合计参考 {{ fmtMetrics(result.summary) }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.peel-scroll {
  border-top: 1px solid var(--border);
}
.peel-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}
.peel-table th,
.peel-table td {
  box-sizing: border-box;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  vertical-align: middle;
  background: var(--card);
}
.peel-table thead th {
  position: sticky;
  z-index: 20;
  font-weight: 600;
  color: var(--card-foreground);
  background: var(--card);
  box-shadow: 0 1px 0 var(--border);
}
.peel-table thead tr:first-child th {
  top: 0;
  height: 48px;
}
.peel-table thead tr:nth-child(2) th {
  top: 48px;
}
.peel-table .num {
  text-align: right;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.peel-table .sub {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted-foreground);
  padding-top: 4px;
  padding-bottom: 4px;
}
.peel-table .date-head {
  text-align: center;
  border-left: 1px solid var(--border);
  letter-spacing: 0.02em;
}
.peel-table .date-split,
.peel-table .split-after {
  border-left: 1px solid var(--border);
}
.peel-table .pin {
  position: sticky;
  z-index: 12;
}
.peel-table thead .pin {
  z-index: 30;
}
.peel-table .pin-1 { left: 0; min-width: 76px; }
.peel-table .pin-2 { left: 76px; min-width: 64px; }
.peel-table .pin-3 { left: 140px; min-width: 76px; }
.peel-table .pin-4 { left: 216px; min-width: 76px; }
.peel-table .pin-5 { left: 292px; min-width: 76px; }
.peel-table .pin-5 {
  box-shadow: 4px 0 8px -4px rgb(0 0 0 / 18%);
}
.peel-table tbody tr:nth-child(even) td {
  background: color-mix(in srgb, var(--muted) 70%, var(--card));
}
.peel-table tbody tr.is-furnace td {
  background: color-mix(in srgb, var(--muted) 88%, var(--card));
  font-weight: 600;
}
.peel-table tbody tr.is-grand td {
  background: color-mix(in srgb, var(--muted) 100%, #93c5fd 12%);
  font-weight: 700;
}
.peel-table tbody tr.is-shift-total td {
  background: color-mix(in srgb, var(--muted) 40%, var(--card));
  font-weight: 600;
}
.peel-table td.hot {
  color: #dc2626;
  font-weight: 600;
}
</style>
