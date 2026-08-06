<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import {
  Flame,
  Zap,
  CloudCog,
  Leaf,
  Download,
  Filter,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
  Loader2,
  Activity,
  Wrench,
  ShieldAlert,
  Gauge,
} from 'lucide-vue-next'
import Panel from '@/components/ui-kit/Panel.vue'
import PageHeader from '@/components/ui-kit/PageHeader.vue'
import KpiCard from '@/components/ui-kit/KpiCard.vue'
import StatusDot from '@/components/ui-kit/StatusDot.vue'
import Tag from '@/components/ui-kit/Tag.vue'
import {
  TrendArea,
  TrendLine,
  GroupBar,
  DonutChart,
  GaugeRadial,
  ComboBarLine,
} from '@/components/ui-kit/charts'
import { COLOR, carbonScope } from '@/lib/mock'
import { FP_ALERTS, FP_MAINTENANCE, FP_OVERVIEW } from '@/lib/mock-extended'
import { ApiError } from '@/lib/api'
import { getOverview, type OverviewData } from '@/lib/overview-api'
import { YOUQI_ANNUAL } from '@/lib/youqi-annual'

function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return '——'
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const router = useRouter()
const data = ref<OverviewData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const ov = await getOverview('TC-03')
    data.value = ov
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      router.replace('/login?next=/')
      return
    }
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})

const furnaces = computed(() => data.value?.furnaces ?? [])
const running = computed(() => furnaces.value.filter((f) => f.status === 'running').length)
const warnAlarm = computed(
  () => furnaces.value.filter((f) => f.status === 'alarm' || f.status === 'warning').length,
)
const alerts = computed(() => data.value?.alerts ?? [])
const activeAlerts = computed(() => alerts.value.filter((a) => a.status === 'active').length)

const heroElec = computed(() => {
  const tce = data.value?.kpis.dayTce ?? 0
  return (tce * 8141) / 10000
})

const fossilMix = computed(() => {
  const fromApi = (data.value?.energyMix ?? []).filter((x) => x.value > 0)
  if (fromApi.length) return fromApi
  return carbonScope.map((x) => ({ ...x }))
})

const energyMixDonut = computed(() => {
  const filtered = (data.value?.energyMix ?? []).filter((x) => x.value > 0)
  return filtered.length
    ? filtered
    : [{ name: '天然气（实测）', value: 100, color: COLOR.sulfur }]
})

const pendingOrders = computed(
  () => FP_MAINTENANCE.orders.filter((o) => o.status !== '已完成').length,
)

function statusOf(
  s: string,
): 'running' | 'warning' | 'alarm' | 'idle' | 'offline' {
  if (s === 'running' || s === 'warning' || s === 'alarm' || s === 'idle' || s === 'offline') {
    return s
  }
  return 'idle'
}

function alertIconClass(severity: string) {
  if (severity === 'high') return 'size-3.5 text-iron mt-0.5 shrink-0'
  if (severity === 'medium') return 'size-3.5 text-sulfur mt-0.5 shrink-0'
  return 'size-3.5 text-coolant mt-0.5 shrink-0'
}

function orderStatusClass(status: string) {
  if (status === '执行中') return 'text-sulfur'
  if (status === '待执行') return 'text-molybdenum'
  return 'text-muted-foreground'
}

function deviceHealth(code: string) {
  return FP_OVERVIEW.deviceList.find((d) => d.name === code)
}
</script>

<template>
  <div>
    <PageHeader title="能碳总览">
      <template #badges>
        <Tag tone="patina">历史聚合</Tag>
        <Tag v-if="data?.referenceDate" tone="molybdenum">{{ data.referenceDate }}</Tag>
        <Tag v-if="data?.kilnCode" tone="coolant">{{ data.kilnCode }}</Tag>
        <Tag tone="sulfur">运维联动</Tag>
      </template>
      <template #actions>
        <button
          type="button"
          class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border bg-background/60 hover:bg-accent transition"
          @click="load()"
        >
          <Filter class="size-3.5" />
          刷新
        </button>
        <button
          type="button"
          class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md bg-iron text-background hover:bg-iron/90 transition opacity-60 cursor-not-allowed"
          title="后续接入"
          disabled
        >
          <Download class="size-3.5" />
          导出报告
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
      v-if="data?.meta?.message"
      class="mb-4 text-sm text-muted-foreground border border-border bg-background/40 rounded-md px-3 py-2"
    >
      {{ data.meta.message }}
    </div>

    <div
      v-if="loading || !data"
      class="flex items-center gap-2 text-sm text-muted-foreground py-20 justify-center"
    >
      <Loader2 class="size-4 animate-spin" />
      加载能碳总览…
    </div>

    <template v-else>
      <!-- 顶部 KPI 与说明文案按需求暂隐 -->
      <div class="hidden grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          label="日综合能耗（吨标煤）"
          :value="fmt(data.kpis?.dayTce, 2)"
          unit="tce"
          :trend="data.kpis?.dayTceTrend ?? undefined"
          hint="vs 前一日 · 天然气折算"
          tone="iron"
        >
          <template #icon><Zap class="size-4" /></template>
        </KpiCard>
        <KpiCard
          label="日碳排放量"
          :value="fmt(data.kpis?.dayCo2, 2)"
          unit="tCO₂"
          :trend="data.kpis?.dayCo2Trend ?? undefined"
          hint="天然气 × 排放因子"
          tone="patina"
        >
          <template #icon><Leaf class="size-4" /></template>
        </KpiCard>
        <KpiCard
          label="日均燃气瞬时"
          :value="fmt(data.kpis?.avgGasFlow, 1)"
          :unit="data.kpis?.avgGasFlowUnit || 'm³/h'"
          :hint="data.kpis?.avgGasFlowHint || '无产量测点'"
          tone="sulfur"
        >
          <template #icon><Flame class="size-4" /></template>
        </KpiCard>
        <KpiCard
          label="设备健康指数"
          :value="String(FP_OVERVIEW.healthScore)"
          unit="分"
          :hint="`风险设备 ${FP_OVERVIEW.riskCount} 台 · OEE ${FP_OVERVIEW.oee}%`"
          tone="coolant"
        >
          <template #icon><Activity class="size-4" /></template>
        </KpiCard>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <Panel title="化石燃料排放构成" subtitle="范围分解 · 对齐优祺核算视图">
          <DonutChart :data="fossilMix" :height="240" />
        </Panel>

        <Panel title="实时能源数据监控" subtitle="综合能耗折算用电量级 · ENERGY">
          <div
            class="relative rounded-md border border-border/80 bg-[#050a14] px-4 py-8 text-center shadow-[inset_0_0_40px_rgba(20,80,40,0.25)]"
          >
            <div
              class="data-num text-[2.4rem] leading-none font-semibold tracking-wider text-[#6dff6d] drop-shadow-[0_0_12px_rgba(109,255,109,0.35)] md:text-[2.8rem]"
            >
              {{ fmt(heroElec, 4) }}
            </div>
            <div class="mt-3 text-xs text-muted-foreground">用电量万 kWh（折算）</div>
            <div class="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
              <span class="inline-flex items-center gap-1.5">
                <span class="size-1.5 rounded-full bg-patina animate-pulse" />
                LIVE
              </span>
              <span class="font-mono tracking-[0.2em] text-patina/80">ENERGY</span>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div class="rounded border border-border/60 bg-background/30 px-2 py-1.5">
              <div class="text-muted-foreground">日 tce</div>
              <div class="data-num text-iron">{{ fmt(data.kpis?.dayTce, 2) }}</div>
            </div>
            <div class="rounded border border-border/60 bg-background/30 px-2 py-1.5">
              <div class="text-muted-foreground">日 tCO₂</div>
              <div class="data-num text-patina">{{ fmt(data.kpis?.dayCo2, 2) }}</div>
            </div>
          </div>
        </Panel>

        <Panel title="用电量年度占比" subtitle="2025 全年 vs 2026 YTD">
          <DonutChart :data="YOUQI_ANNUAL.elecShare" :height="240" />
        </Panel>

        <Panel title="能源结构占比" subtitle="历史 Excel 实测结构" class="hidden">
          <DonutChart :data="energyMixDonut" :height="240" />
        </Panel>
      </div>

      <div class="hidden grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <Panel
          class="xl:col-span-2"
          title="24 小时综合能耗走势"
          :subtitle="`单位：tce/h · 参考日 ${data.referenceDate} · 仅天然气实测`"
        >
          <TrendArea
            :data="data.energyTrend24h"
            :keys="[
              { key: '天然气', color: COLOR.sulfur },
              { key: '辅助电力', color: COLOR.molybdenum },
              { key: '蒸汽', color: COLOR.iron },
            ]"
            :height="250"
          />
        </Panel>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <Panel
          class="xl:col-span-2"
          title="碳排放与工业增加值分析"
          subtitle="柱：增加值 · 线：碳排放"
        >
          <ComboBarLine
            :data="YOUQI_ANNUAL.carbonVsValue"
            :bar="{ key: '工业增加值', color: COLOR.molybdenum, label: '工业增加值' }"
            :line="{ key: '碳排放', color: COLOR.iron, label: '碳排放 tCO₂' }"
            :height="250"
          />
        </Panel>

        <Panel title="可再生能源电力占比趋势" subtitle="百分比(%) · 年累计待接入时为演示">
          <TrendLine
            :data="YOUQI_ANNUAL.renewableTrend"
            :keys="[{ key: '占比', color: COLOR.coolant, label: '绿电占比' }]"
            :height="250"
            y-unit="%"
          />
        </Panel>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <Panel class="xl:col-span-2" title="总排放量年度对比" subtitle="单位：tCO₂">
          <GroupBar
            :data="YOUQI_ANNUAL.emissionCompare"
            :keys="[{ key: '排放量', color: COLOR.molybdenum, label: '排放量' }]"
            y-unit=" t"
            :height="240"
          />
        </Panel>

        <Panel
          class="hidden xl:col-span-2"
          title="碳排放 vs 配额基线"
          subtitle="实际排放由燃气瞬时折算；配额基线为演示常数"
        >
          <GroupBar
            :data="data.carbonTrend24h"
            :keys="[
              { key: '实际排放', color: COLOR.iron, label: '实际排放' },
              { key: '配额基线', color: COLOR.molybdenum, label: '配额基线' },
              { key: '去年同期', color: COLOR.coolant, label: '去年同期(估)' },
            ]"
            y-unit=" t"
            :height="240"
          />
        </Panel>

        <div class="grid grid-cols-2 gap-3">
          <Panel title="碳强度">
            <GaugeRadial
              :value="data.gauges?.carbonIntensity ?? 0"
              label="相对配额"
              :color="COLOR.patina"
              :height="150"
            />
          </Panel>
          <Panel title="能效水平">
            <GaugeRadial
              :value="data.gauges?.energyEfficiency ?? 0"
              :label="(data.policyCards?.efficiencyGrade || '—') + ' 级估'"
              :color="COLOR.molybdenum"
              :height="150"
            />
          </Panel>
          <Panel title="绿电消纳" class="col-span-2">
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <GaugeRadial
                  :value="0"
                  label="无测点"
                  :color="COLOR.coolant"
                  :max="30"
                  :height="130"
                />
              </div>
              <div class="text-[11px] text-muted-foreground max-w-[9rem]">
                历史未含绿电测点；可再生趋势见上方年曲线。
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div class="mb-2 flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-sm font-medium tracking-wide flex items-center gap-2">
          <span class="inline-block w-1 h-3 bg-iron rounded-sm" />
          设备运维联动
        </h2>
        <div class="flex items-center gap-3 text-[11px]">
          <RouterLink to="/fault/overview" class="text-molybdenum hover:underline">
            健康总览 →
          </RouterLink>
          <RouterLink to="/fault/maintenance" class="text-molybdenum hover:underline">
            维护计划 →
          </RouterLink>
          <RouterLink to="/devices" class="text-molybdenum hover:underline">
            设备资产 →
          </RouterLink>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          label="产线 OEE"
          :value="String(FP_OVERVIEW.oee)"
          unit="%"
          hint="故障预测模块估算"
          tone="molybdenum"
        >
          <template #icon><Gauge class="size-4" /></template>
        </KpiCard>
        <KpiCard
          label="今日运维告警"
          :value="String(FP_ALERTS.pending)"
          unit="待处置"
          :hint="`严重 ${FP_ALERTS.summary.critical} · 已闭环 ${FP_ALERTS.resolved}`"
          tone="iron"
        >
          <template #icon><ShieldAlert class="size-4" /></template>
        </KpiCard>
        <KpiCard
          label="预测性工单"
          :value="String(pendingOrders)"
          unit="在办"
          :hint="`MTBF ${FP_OVERVIEW.mtbf}h · MTTR ${FP_OVERVIEW.mttr}h`"
          tone="sulfur"
        >
          <template #icon><Wrench class="size-4" /></template>
        </KpiCard>
        <KpiCard
          label="窑炉运行"
          :value="`${running}/${furnaces.length || '—'}`"
          unit="台"
          :hint="`预警/告警 ${warnAlarm}`"
          tone="patina"
        >
          <template #icon><Flame class="size-4" /></template>
        </KpiCard>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <Panel
          class="xl:col-span-2"
          title="车式窑运行总览"
          :subtitle="`${furnaces.length} 台台账 · 运行中 ${running} · 预警/告警 ${warnAlarm}`"
          flush
        >
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            <RouterLink
              v-for="f in furnaces"
              :key="f.code"
              to="/furnaces"
              class="rounded-md border border-border bg-background/30 p-3 hover:border-iron/40 transition block"
            >
              <div class="flex items-start justify-between mb-2">
                <div>
                  <div class="text-[11px] text-muted-foreground font-mono">{{ f.code }}</div>
                  <div class="text-sm font-medium mt-0.5">{{ f.name }}</div>
                </div>
                <StatusDot :status="statusOf(f.status)" />
              </div>
              <div class="grid grid-cols-2 gap-y-1 text-[11px]">
                <div class="text-muted-foreground">区均温度</div>
                <div class="data-num text-right text-iron">{{ fmt(f.temperature, 1) }}℃</div>
                <div class="text-muted-foreground">天然气</div>
                <div class="data-num text-right text-sulfur">{{ fmt(f.gas, 1) }} m³/h</div>
                <div class="text-muted-foreground">健康分</div>
                <div class="data-num text-right text-coolant">
                  <template v-if="deviceHealth(f.code)">
                    {{ deviceHealth(f.code)!.health }}
                    <span class="text-muted-foreground ml-1 text-[10px]">
                      {{ deviceHealth(f.code)!.risk }}
                    </span>
                  </template>
                  <template v-else>——</template>
                </div>
              </div>
            </RouterLink>
            <div
              v-if="furnaces.length === 0"
              class="col-span-full text-xs text-muted-foreground py-6 text-center"
            >
              暂无窑台账，请先导入历史工况
            </div>
          </div>
        </Panel>

        <div class="flex flex-col gap-5">
          <Panel title="预测风险" subtitle="故障预测高/中风险" flush>
            <template #action>
              <RouterLink to="/fault/overview" class="text-[11px] text-iron hover:underline">
                详情 →
              </RouterLink>
            </template>
            <ul class="divide-y divide-border">
              <li
                v-for="r in FP_OVERVIEW.riskList"
                :key="r.id"
                class="px-4 py-2.5 text-xs flex items-center justify-between gap-2"
              >
                <div class="min-w-0">
                  <span class="font-mono text-muted-foreground">{{ r.equipment }}</span>
                  <span class="mx-1.5 text-muted-foreground">·</span>
                  <span>{{ r.fault }}</span>
                </div>
                <span
                  :class="
                    r.level === '高'
                      ? 'text-iron data-num shrink-0'
                      : 'text-sulfur data-num shrink-0'
                  "
                >
                  {{ r.probability }}%
                </span>
              </li>
            </ul>
          </Panel>

          <Panel title="工况规则告警" :subtitle="`未处置 ${activeAlerts} 条`" flush>
            <template #action>
              <RouterLink to="/alerts" class="text-[11px] text-iron hover:underline">
                全部 →
              </RouterLink>
            </template>
            <ul class="divide-y divide-border max-h-[220px] overflow-auto">
              <li
                v-if="alerts.length === 0"
                class="px-4 py-6 text-xs text-muted-foreground text-center"
              >
                参考日未触发规则告警
              </li>
              <li
                v-for="a in alerts.slice(0, 4)"
                :key="a.id"
                class="px-4 py-2.5 hover:bg-background/40 transition"
              >
                <div class="flex items-start gap-2">
                  <TriangleAlert :class="alertIconClass(a.severity)" />
                  <div class="min-w-0 flex-1">
                    <div class="text-xs leading-snug line-clamp-2">{{ a.title }}</div>
                    <div class="mt-1 text-[10px] text-muted-foreground data-num">
                      {{ a.target }}{{ a.ts ? ` · ${a.ts}` : '' }}
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      <Panel
        title="近期预测性维护计划"
        subtitle="来自设备运维模块 · 点击进入工单"
        class="mb-5"
        flush
      >
        <template #action>
          <RouterLink to="/fault/maintenance" class="text-[11px] text-iron hover:underline">
            维护计划 →
          </RouterLink>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border text-muted-foreground">
                <th class="text-left font-medium px-4 py-2.5">设备</th>
                <th class="text-left font-medium px-2 py-2.5">类型</th>
                <th class="text-left font-medium px-2 py-2.5">内容</th>
                <th class="text-left font-medium px-2 py-2.5">计划日</th>
                <th class="text-left font-medium px-2 py-2.5">状态</th>
                <th class="text-right font-medium px-4 py-2.5">预算</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="o in FP_MAINTENANCE.orders.slice(0, 5)"
                :key="o.id"
                class="border-b border-border/60 hover:bg-background/30"
              >
                <td class="px-4 py-2.5 font-mono text-coolant">{{ o.equipment }}</td>
                <td class="px-2 py-2.5">{{ o.type }}</td>
                <td class="px-2 py-2.5">{{ o.content }}</td>
                <td class="px-2 py-2.5 data-num">{{ o.scheduled }}</td>
                <td class="px-2 py-2.5">
                  <span :class="orderStatusClass(o.status)">{{ o.status }}</span>
                </td>
                <td class="px-4 py-2.5 text-right data-num">
                  ¥{{ o.cost.toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="panel-surface rounded-lg p-4 flex items-center gap-4">
          <div
            class="size-10 rounded-md bg-patina/10 border border-patina/30 flex items-center justify-center"
          >
            <TrendingDown class="size-5 text-patina" />
          </div>
          <div>
            <div class="text-xs text-muted-foreground">年度减碳进度</div>
            <div class="data-num text-lg font-semibold text-muted-foreground">
              —— <span class="text-xs ml-1">待年累计接入</span>
            </div>
          </div>
        </div>
        <div class="panel-surface rounded-lg p-4 flex items-center gap-4">
          <div
            class="size-10 rounded-md bg-molybdenum/10 border border-molybdenum/30 flex items-center justify-center"
          >
            <TrendingUp class="size-5 text-molybdenum" />
          </div>
          <div>
            <div class="text-xs text-muted-foreground">能效评级（估）</div>
            <div class="data-num text-lg font-semibold text-molybdenum">
              {{ data.policyCards?.efficiencyGrade || '—' }} 级
              <span class="text-xs text-muted-foreground ml-1">按设定温偏差</span>
            </div>
          </div>
        </div>
        <div class="panel-surface rounded-lg p-4 flex items-center gap-4">
          <div
            class="size-10 rounded-md bg-iron/10 border border-iron/30 flex items-center justify-center"
          >
            <CloudCog class="size-5 text-iron" />
          </div>
          <div>
            <div class="text-xs text-muted-foreground">参考日样本</div>
            <div class="data-num text-lg font-semibold text-iron">
              {{ (data.kpis?.sampleCount ?? 0).toLocaleString() }}
              <span class="text-xs text-muted-foreground ml-1">分钟点</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
