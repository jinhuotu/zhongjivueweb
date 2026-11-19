<script setup lang="ts">
// ============================================================================
// KilnEnergyPanel.vue | 能碳 / 成本 / 单耗概览（深色控制室风格，自包含）
// 数据来源：总览模型已算好的用气量（累计/积分口径，非预测值）。
// 因子、气价、装载量均可在本面板调整，缺省标注“待业务确认”，不把估算当实测。
// ============================================================================
import { computed, reactive, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { formatKilnNumber } from '@/lib/kiln-studio-format'
import { scada, scadaTooltip } from '@/lib/kiln-scada-theme'
import type { OverviewModel } from '@/lib/kiln-overview-model'
import {
  buildEnergySummary, emissionFactorKgPerNm3, DEFAULT_ENERGY_CONFIG,
  type EnergyConfig,
} from '@/lib/kiln-energy-model'

const props = defineProps<{ overview: OverviewModel }>()
ensureEcharts()

// tooltip formatter 实际拿到的最小结构（只取用到的字段），本地定义以避免依赖 echarts 内部类型路径
type TooltipParam = { name?: string; value?: unknown; percent?: number }

// 可编辑配置（缺省值的副本，组件内调整不影响其他页面）
const config = reactive<EnergyConfig>({ ...DEFAULT_ENERGY_CONFIG })
// 数字输入框允许留空：空字符串 -> null（用于气价/装载量/因子覆盖）
const nullableText = ref<Record<string, string>>({})
function toNullableNumber(key: 'gasPriceYuanPerNm3' | 'loadAmount' | 'emissionFactorOverride', text: string) {
  nullableText.value[key] = text
  const value = Number(text)
  config[key] = text.trim() === '' || !Number.isFinite(value) ? null : value
}
function restoreDefaults() {
  Object.assign(config, DEFAULT_ENERGY_CONFIG)
  nullableText.value = {}
}

// 当前体积排放因子与整体能碳汇总
const factor = computed(() => emissionFactorKgPerNm3(config))
const summary = computed(() => buildEnergySummary(props.overview.totalGasVolume, config))

// 各阶段用气量与碳排（阶段口径，便于看哪个阶段最耗气/最排碳）
const stageCarbon = computed(() =>
  props.overview.stages.map(stage => {
    const volume = stage.gasVolume ?? 0
    return { name: stage.name, volume, carbonKg: volume * factor.value }
  }),
)

// KPI 卡：成本/单耗未配置时显示“未配置/待配置”，不显示假数字
const kpis = computed(() => [
  { label: '总用气（积分口径）', value: formatKilnNumber(summary.value.gasVolumeNm3), unit: 'Nm³', accent: scada.gas },
  { label: '热能（按 LHV）', value: formatKilnNumber(summary.value.heatGJ), unit: 'GJ', accent: scada.actual },
  { label: '碳排放量', value: formatKilnNumber(summary.value.carbonKg), unit: 'kgCO₂', accent: scada.prediction },
  {
    label: '用气成本', value: summary.value.costYuan == null ? '未配置' : formatKilnNumber(summary.value.costYuan),
    unit: summary.value.costYuan == null ? '' : '元', accent: scada.amber,
  },
  {
    label: `燃气单耗（每${config.loadUnit}）`,
    value: summary.value.gasIntensity == null ? '待配置' : formatKilnNumber(summary.value.gasIntensity),
    unit: summary.value.gasIntensity == null ? '' : `Nm³/${config.loadUnit}`, accent: scada.violet,
  },
  {
    label: `碳单耗（每${config.loadUnit}）`,
    value: summary.value.carbonIntensity == null ? '待配置' : formatKilnNumber(summary.value.carbonIntensity),
    unit: summary.value.carbonIntensity == null ? '' : `kgCO₂/${config.loadUnit}`, accent: scada.red,
  },
])

// 阶段碳排柱图
const stageBarOption = computed<EChartsOption>(() => ({
  animation: false,
  grid: { left: 56, right: 18, top: 34, bottom: 34 },
  tooltip: {
    ...scadaTooltip(), trigger: 'axis',
    formatter: (params: unknown) => {
      // axis 触发时回调为数组，取首项的类目名
      const list = Array.isArray(params) ? params : [params]
      const name = (list[0] as TooltipParam)?.name ?? ''
      const item = stageCarbon.value.find(s => s.name === name)
      if (!item) return name
      return `${name}<br/>用气 ${formatKilnNumber(item.volume)} Nm³<br/>碳排 ${formatKilnNumber(item.carbonKg)} kgCO₂`
    },
  },
  legend: { top: 4, textStyle: { color: scada.textSoft, fontSize: 11 } },
  xAxis: { type: 'category', data: stageCarbon.value.map(s => s.name), axisLabel: { color: scada.textSoft } },
  yAxis: { type: 'value', name: 'kgCO₂', axisLabel: { color: scada.axis }, splitLine: { lineStyle: { color: scada.grid } } },
  series: [{
    type: 'bar', name: '阶段碳排', barMaxWidth: 48,
    label: { show: true, position: 'top', color: scada.muted, fontSize: 10, formatter: p => formatKilnNumber(Number(p.value), 0) },
    data: stageCarbon.value.map(s => ({ value: s.carbonKg, itemStyle: { color: scada.prediction, borderRadius: [4, 4, 0, 0] } })),
  }],
}))

// 阶段碳排占比环图
const shareOption = computed<EChartsOption>(() => ({
  animation: false,
  tooltip: {
    ...scadaTooltip(), trigger: 'item',
    formatter: (params: unknown) => {
      // item 触发时为单个对象，pie 下带 percent 字段
      const item = (Array.isArray(params) ? params[0] : params) as TooltipParam
      return `${item.name ?? ''}：${formatKilnNumber(Number(item.value ?? 0))} kgCO₂（${item.percent ?? 0}%）`
    },
  },
  legend: { bottom: 4, textStyle: { color: scada.textSoft, fontSize: 11 } },
  series: [{
    type: 'pie', radius: ['46%', '70%'], center: ['50%', '46%'],
    label: { color: scada.textSoft, fontSize: 11, formatter: '{b} {d}%' },
    data: stageCarbon.value.map((s, i) => ({
      name: s.name, value: s.carbonKg,
      itemStyle: { color: [scada.prediction, scada.gas, scada.amber, scada.violet][i % 4] },
    })),
  }],
}))
</script>

<template>
  <section class="energy-root" aria-label="能碳概览">
    <!-- 标题与口径标签 -->
    <div class="energy-head">
      <div>
        <h2>能碳概览</h2>
        <p>基于本窑次已发生用气量估算，活动数据来自累计表/积分，不使用预测值。</p>
      </div>
      <span class="estimate-tag">估算 · 口径待业务确认</span>
    </div>

    <!-- 可配置参数（折叠面板，默认展开便于调参） -->
    <details class="config-panel" open>
      <summary>核算参数配置（因子 / 气价 / 装载量）</summary>
      <div class="config-grid">
        <label>低位发热量 LHV（GJ/Nm³）
          <input v-model.number="config.lhvGJPerNm3" type="number" step="0.0001" min="0" />
        </label>
        <label>单位热值含碳量（tC/GJ）
          <input v-model.number="config.carbonContentTCGJ" type="number" step="0.0001" min="0" />
        </label>
        <label>碳氧化率（0–1）
          <input v-model.number="config.oxidationRate" type="number" step="0.01" min="0" max="1" />
        </label>
        <label>体积因子覆盖（kgCO₂/Nm³，留空=自动）
          <input :value="nullableText.emissionFactorOverride ?? ''" type="number" step="0.01" min="0"
            @input="toNullableNumber('emissionFactorOverride', ($event.target as HTMLInputElement).value)" />
        </label>
        <label>天然气单价（元/Nm³，留空不显示成本）
          <input :value="nullableText.gasPriceYuanPerNm3 ?? ''" type="number" step="0.01" min="0"
            @input="toNullableNumber('gasPriceYuanPerNm3', ($event.target as HTMLInputElement).value)" />
        </label>
        <label>装载量（留空不显示单耗）
          <input :value="nullableText.loadAmount ?? ''" type="number" step="0.1" min="0"
            @input="toNullableNumber('loadAmount', ($event.target as HTMLInputElement).value)" />
        </label>
        <label>装载单位
          <select v-model="config.loadUnit">
            <option value="吨">吨</option>
            <option value="件">件</option>
          </select>
        </label>
        <button type="button" class="restore-btn" @click="restoreDefaults">恢复缺省口径</button>
      </div>
      <p class="factor-line">当前体积排放因子：<strong>{{ formatKilnNumber(factor) }} kgCO₂/Nm³</strong>
        （缺省口径推导：含碳量 15.3×10⁻³ tC/GJ × 碳氧化率 99% × 44/12，按 GB/T 32151.16）</p>
    </details>

    <!-- KPI 卡片 -->
    <div class="kpi-grid">
      <div v-for="kpi in kpis" :key="kpi.label" class="kpi-card">
        <span class="kpi-accent" :style="{ background: kpi.accent }" />
        <p class="kpi-label">{{ kpi.label }}</p>
        <p class="kpi-value"><span :class="{ placeholder: kpi.unit === '' }">{{ kpi.value }}</span><em v-if="kpi.unit">{{ kpi.unit }}</em></p>
      </div>
    </div>

    <!-- 阶段碳排柱图 + 占比环图 -->
    <div class="chart-grid">
      <div class="energy-panel">
        <h3>分阶段碳排</h3>
        <VChart :option="stageBarOption" autoresize class="chart" />
      </div>
      <div class="energy-panel">
        <h3>阶段碳排占比</h3>
        <VChart :option="shareOption" autoresize class="chart" />
      </div>
    </div>

    <p class="disclaimer">以上碳排、成本、单耗均为估算值：排放因子、低位发热量、气价与装载量属外部输入，
      需业务确认后才作为正式口径；界面数字不代表现场实测精度。</p>
  </section>
</template>

<style scoped>
/* 深色自包含，颜色不写入全局变量，与总览看板风格一致 */
.energy-root { display: grid; gap: 14px; padding: 16px; background: #0d141d; border: 1px solid #243040; border-radius: 12px; }
.energy-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.energy-head h2 { font-size: 18px; font-weight: 650; color: #e6edf3; }
.energy-head p { margin-top: 4px; font-size: 12px; color: #7d8b9c; }
.estimate-tag { font-size: 11px; padding: 4px 10px; border-radius: 20px; color: #d9a441; background: #18222f; border: 1px solid #243040; white-space: nowrap; }

/* 配置面板 */
.config-panel { background: #141d29; border: 1px solid #243040; border-radius: 10px; padding: 12px 16px; }
.config-panel > summary { cursor: pointer; font-weight: 600; color: #e6edf3; font-size: 14px; }
.config-panel[open] > :not(summary) { margin-top: 12px; }
.config-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.config-grid label { display: flex; flex-direction: column; gap: 5px; font-size: 11px; color: #7d8b9c; }
.config-grid input, .config-grid select { padding: 7px 9px; background: #0d141d; border: 1px solid #243040; border-radius: 6px; color: #e6edf3; }
.restore-btn { align-self: end; padding: 8px 12px; border: 1px solid #243040; border-radius: 6px; background: #18222f; color: #aeb9c6; cursor: pointer; font-size: 12px; }
.factor-line { font-size: 11px; color: #7d8b9c; }
.factor-line strong { color: #2fae96; }

/* KPI */
.kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.kpi-card { position: relative; padding: 13px; background: #141d29; border: 1px solid #243040; border-radius: 10px; overflow: hidden; }
.kpi-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; }
.kpi-label { font-size: 10px; color: #7d8b9c; }
.kpi-value { margin-top: 7px; display: flex; align-items: baseline; gap: 3px; font-family: 'JetBrains Mono', monospace; }
.kpi-value span { font-size: 20px; font-weight: 650; color: #e6edf3; }
.kpi-value span.placeholder { font-size: 13px; color: #566373; font-weight: 500; }
.kpi-value em { font-size: 10px; color: #7d8b9c; font-style: normal; }

/* 图表 */
.chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.energy-panel { background: #141d29; border: 1px solid #243040; border-radius: 10px; padding: 14px 16px; min-width: 0; }
.energy-panel h3 { font-size: 14px; font-weight: 650; color: #e6edf3; margin-bottom: 6px; }
.chart { height: 300px; width: 100%; }
.disclaimer { font-size: 11px; color: #566373; line-height: 1.6; }

/* 响应式 */
@media (max-width: 1200px) {
  .config-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .config-grid, .kpi-grid, .chart-grid { grid-template-columns: 1fr; }
}
</style>
