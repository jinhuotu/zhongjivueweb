<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { use } from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { RadarComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { axisCommon, tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { algorithmPrediction } from '@/lib/kiln-studio-state'
import { formatKilnNumber as fmt, formatKilnReading as reading } from '@/lib/kiln-studio-format'
import type { AlgorithmKey, AlgorithmMetadata, Experiment } from '@/lib/kiln-studio-api'

const props = defineProps<{ library: AlgorithmMetadata[]; experiment?: Experiment }>()
ensureEcharts()
use([RadarComponent, RadarChart])

const palette = useChartPalette()
const id = useId()
const tabs = [
  { key: 'radar', name: '综合能力' },
  { key: 'accuracy', name: '预测误差' },
  { key: 'efficiency', name: '精度与效率' },
  { key: 'diagnostics', name: '误差诊断' },
] as const
const tab = ref<(typeof tabs)[number]['key']>('radar')
const colors = ['#267bbd', '#218168', '#ab6135', '#8c58ae', '#b64b78', '#5c7533', '#347784']
const levels = { low: 1, medium: 2, high: 3 } as const
const levelNames = { low: '低', medium: '中', high: '高' } as const
const highIsBetter = { high: 1, medium: 0.6, low: 0.3 } as const
const lowIsBetter = { low: 1, medium: 0.6, high: 0.3 } as const
const byKey = computed(() => new Map(props.library.map(item => [item.key, item])))
const unit = computed(() => props.experiment?.unit ?? '')

function nonnegative(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value >= 0 ? value : null
}

const rows = computed(() => (props.experiment?.algorithms ?? []).flatMap((algorithm, index) => {
  const test = algorithm.test
  if (!algorithm.available || !test || !test.count) return []
  const current = byKey.value.get(algorithm.key)
  const metadata = current && current.version === (algorithm.version ?? '1') ? current : undefined
  const benchmark = algorithm.inferenceBenchmark
  return [{
    key: algorithm.key, name: algorithm.name, color: colors[index % colors.length],
    mae: nonnegative(test.mae), rmse: nonnegative(test.rmse), count: test.count,
    coverage: test.coverage >= 0 && test.coverage <= 1 ? test.coverage : null,
    interpretability: algorithm.interpretability ?? metadata?.interpretability,
    sampleSizeRisk: algorithm.sampleSizeRisk ?? metadata?.sampleSizeRisk,
    intervention: algorithm.interventionCapable ?? metadata?.interventionCapable,
    complexity: algorithm.inferenceComplexity ?? metadata?.inferenceComplexity,
    latency: benchmark?.environment === 'server-cpu' && benchmark.count > 0 ? nonnegative(benchmark.meanMs) : null,
    size: nonnegative(algorithm.external?.byteSize ?? metadata?.external?.byteSize),
  }]
}))
type Row = (typeof rows.value)[number]
const measured = computed(() => rows.value.some(row => row.mae != null && row.latency != null))
const bestMae = computed(() => Math.min(...rows.value.flatMap(row => row.mae ?? [])))
const bestLatency = computed(() => Math.min(...rows.value.flatMap(row => row.latency ?? [])))

function relative(best: number, value: number | null) {
  if (value === null || !Number.isFinite(best)) return null
  return value === 0 ? 1 : best / value
}

const dimensions = computed(() => [
  { key: 'accuracy', name: '预测精度', rule: '组内最小平均误差 ÷ 该算法平均误差。零误差为满分。', value: (row: Row) => relative(bestMae.value, row.mae) },
  { key: 'coverage', name: '覆盖率', rule: '有有效预测的时刻占测试时刻的比例。', value: (row: Row) => row.coverage },
  { key: 'interpretability', name: '可解释性', rule: '算法库标注的高／中／低对应 1／0.6／0.3。', value: (row: Row) => row.interpretability ? highIsBetter[row.interpretability] : null },
  { key: 'sampleSize', name: '小样本稳健性', rule: '算法库标注的小样本风险低／中／高对应 1／0.6／0.3。', value: (row: Row) => row.sampleSizeRisk ? lowIsBetter[row.sampleSizeRisk] : null },
  {
    key: 'efficiency', name: '推理效率',
    rule: measured.value ? '组内最短 CPU 单点平均耗时 ÷ 该算法的单点平均耗时。' : '定性评估。推理复杂度低／中／高对应 1／0.6／0.3。',
    value: (row: Row) => measured.value ? relative(bestLatency.value, row.latency) : row.complexity ? lowIsBetter[row.complexity] : null,
  },
  { key: 'intervention', name: '干预试算', rule: '算法能力标注支持为 1，未支持为 0.3。按任务和机理条件核对可用范围。', value: (row: Row) => row.intervention == null ? null : row.intervention ? 1 : 0.3 },
])
const selectedDimensions = ref(dimensions.value.map(axis => axis.key))
// ECharts 的雷达多边形要求各轴有值。只画本组都有数据的轴，缺失项不补零。
const radarAxes = computed(() => dimensions.value.filter(axis => rows.value.length > 0 &&
  rows.value.every(row => axis.value(row) !== null)))
const activeAxes = computed(() => radarAxes.value.filter(axis => selectedDimensions.value.includes(axis.key)))
const radar = computed<EChartsOption | null>(() => {
  if (activeAxes.value.length < 3) return null
  const p = palette.value
  return {
    animation: false,
    tooltip: {
      ...tooltipBase(p), renderMode: 'richText', confine: true,
      formatter: params => {
        const index = (Array.isArray(params) ? params[0] : params)?.dataIndex ?? -1
        const row = rows.value[index]
        if (!row) return ''
        return [row.name, ...activeAxes.value.map(axis =>
          `${axis.name} ${fmt(axis.value(row), 3)}　${axis.rule}`)].join('\n')
      },
    },
    legend: { type: 'scroll', top: 0, textStyle: { color: p.legend } },
    radar: {
      center: ['50%', '57%'], radius: '62%', splitNumber: 5,
      indicator: activeAxes.value.map(axis => ({ name: axis.name, min: 0, max: 1 })),
      axisName: { color: p.axis }, axisLine: { lineStyle: { color: p.grid } },
      splitLine: { lineStyle: { color: p.grid } }, splitArea: { show: false },
    },
    series: [{
      type: 'radar', symbolSize: 4,
      data: rows.value.map(row => ({
        name: row.name, value: activeAxes.value.map(axis => axis.value(row) ?? NaN),
        itemStyle: { color: row.color }, lineStyle: { color: row.color }, areaStyle: { color: row.color, opacity: 0.09 },
      })),
    }],
  }
})

const accuracy = computed<EChartsOption | null>(() => {
  const visible = rows.value.filter(row => row.mae != null || row.rmse != null)
  if (!visible.length) return null
  const p = palette.value
  return {
    animation: false,
    grid: { left: 54, right: 20, top: 68, bottom: 76 },
    legend: { top: 0, textStyle: { color: p.legend } },
    tooltip: { ...tooltipBase(p), trigger: 'axis', renderMode: 'richText', confine: true, valueFormatter: value => reading(value, unit.value) },
    xAxis: { ...axisCommon(p), type: 'category', data: visible.map(row => row.name), axisLabel: { color: p.axis, width: 120, overflow: 'truncate', rotate: 21 } },
    yAxis: { ...axisCommon(p), type: 'value', name: unit.value, nameTextStyle: { color: p.axis } },
    series: (['mae', 'rmse'] as const).map((key, index) => ({
      type: 'bar', name: index === 0 ? '平均相差（MAE）' : '大偏差更显眼（RMSE）', barMaxWidth: 32,
      data: visible.map(row => row[key]), itemStyle: { color: colors[index] },
      label: { show: true, position: 'top', color: p.axis, formatter: ({ data }) => data == null ? '' : fmt(data, 3) },
    })),
  }
})

const efficiencyRows = computed(() => rows.value.filter(row => row.mae != null &&
  (measured.value ? row.latency != null : !!row.complexity)))
function latencyText(value: number | null) {
  if (value === null) return '暂无数据'
  const text = value > 0 && value < 0.0001 ? value.toExponential(2) : fmt(value, 4)
  return text + ' ms'
}
const efficiency = computed<EChartsOption | null>(() => {
  if (!efficiencyRows.value.length) return null
  const p = palette.value
  const maximumSize = Math.max(1, ...efficiencyRows.value.map(row => row.size ?? 0))
  return {
    animation: false,
    grid: { top: 68, left: 73, right: 24, bottom: 54 },
    legend: { type: 'scroll', top: 0, textStyle: { color: p.legend } },
    tooltip: {
      ...tooltipBase(p), renderMode: 'richText', confine: true,
      formatter: params => {
        const row = efficiencyRows.value[(Array.isArray(params) ? params[0] : params)?.seriesIndex ?? -1]
        if (!row) return ''
        return [row.name, '平均相差 ' + reading(row.mae, unit.value),
          measured.value ? 'CPU 单点平均耗时 ' + latencyText(row.latency) : '定性复杂度 ' + (row.complexity ? levelNames[row.complexity] : ''),
          row.size == null ? '模型大小暂无数据' : '文件大小 ' + fmt(row.size, 0) + ' 字节',
          '有效预测覆盖 ' + (row.coverage == null ? '暂无数据' : fmt(row.coverage * 100, 1) + '%'),
        ].join('\n')
      },
    },
    xAxis: {
      ...axisCommon(p), type: 'value', name: `平均相差（${unit.value}）`, nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: p.axis },
    },
    yAxis: measured.value
      ? { ...axisCommon(p), type: 'value', name: 'CPU 单点平均耗时（ms）', nameTextStyle: { color: p.axis } }
      : {
        ...axisCommon(p), type: 'category', name: '复杂度（定性）', nameTextStyle: { color: p.axis }, data: ['低', '中', '高'],
      },
    series: efficiencyRows.value.map(row => ({
      type: 'scatter', name: row.name,
      data: [[row.mae, measured.value ? row.latency : row.complexity ? levels[row.complexity] - 1 : null]],
      symbol: row.size == null ? 'diamond' : 'circle',
      symbolSize: row.size == null ? 11 : 8 + 23 * Math.sqrt(row.size / maximumSize),
      itemStyle: { color: row.color, opacity: 0.85 },
    })),
  }
})

const diagnosticPoints = computed(() => {
  const test = props.experiment?.points.filter(point =>
    point.split === 'test' && Number.isFinite(point.actual) && point.actual !== -9999) ?? []
  return rows.value.flatMap(row => {
    const pairs = test.flatMap((point): [number, number][] => {
      const prediction = algorithmPrediction(point, row.key)
      return prediction == null ? [] : [[point.actual, prediction]]
    })
    return pairs.length ? [{ ...row, pairs }] : []
  })
})
const diagnosticKey = ref<AlgorithmKey>('')
watch(diagnosticPoints, options => {
  if (!options.some(item => item.key === diagnosticKey.value)) diagnosticKey.value = options[0]?.key ?? ''
}, { immediate: true })
const diagnostic = computed(() => diagnosticPoints.value.find(row => row.key === diagnosticKey.value))

const actualPrediction = computed<EChartsOption | null>(() => {
  const row = diagnostic.value
  if (!row) return null
  const p = palette.value
  const values = row.pairs.flat()
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad = (high - low) * 0.06 || Math.max(0.01, Math.abs(low) * 0.03)
  const range = { min: low - pad, max: high + pad }
  return {
    animation: false,
    grid: { top: 30, right: 22, bottom: 54, left: 62 },
    tooltip: {
      ...tooltipBase(p), renderMode: 'richText', confine: true,
      formatter: params => {
        const pair = (Array.isArray(params) ? params[0] : params)?.value
        return Array.isArray(pair) ? '实测 ' + reading(pair[0], unit.value) + '\n预测 ' + reading(pair[1], unit.value) : ''
      },
    },
    xAxis: { ...axisCommon(p), type: 'value', ...range, name: `实测（${unit.value}）`, nameLocation: 'middle', nameGap: 31, nameTextStyle: { color: p.axis }, axisLabel: { color: p.axis, formatter: value => fmt(value, 2) } },
    yAxis: { ...axisCommon(p), type: 'value', ...range, name: `预测（${unit.value}）`, nameTextStyle: { color: p.axis }, axisLabel: { color: p.axis, formatter: value => fmt(value, 2) } },
    series: [
      { type: 'line', name: '预测等于实测', data: [[range.min, range.min], [range.max, range.max]], silent: true, symbol: 'none', lineStyle: { color: p.axis, type: 'dashed' } },
      { type: 'scatter', name: row.name, data: row.pairs, symbolSize: 6, itemStyle: { color: row.color, opacity: 0.62 } },
    ],
  }
})

const residuals = computed<EChartsOption | null>(() => {
  const row = diagnostic.value
  if (!row) return null
  const p = palette.value
  const differences = row.pairs.map(([actual, predicted]) => predicted - actual)
  const extent = Math.max(...differences.map(Math.abs))
  const bucketCount = extent === 0 ? 1 : Math.min(20, Math.max(4, Math.ceil(Math.sqrt(differences.length) / 2) * 2))
  const step = (2 * extent) / bucketCount
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    center: extent === 0 ? 0 : -extent + (index + 0.5) * step,
    low: -extent + index * step,
    high: -extent + (index + 1) * step,
    count: 0,
  }))
  for (const difference of differences) {
    const index = extent === 0 ? 0 : Math.min(bucketCount - 1, Math.floor((difference + extent) / step))
    buckets[index].count += 1
  }
  const axisValue = (value: number) => value !== 0 && Math.abs(value) < 0.001 ? value.toExponential(1) : fmt(value, 3)
  return {
    animation: false,
    grid: { top: 30, right: 15, bottom: 54, left: 47 },
    tooltip: {
      ...tooltipBase(p), renderMode: 'richText', confine: true,
      formatter: params => {
        const bucket = buckets[(Array.isArray(params) ? params[0] : params)?.dataIndex ?? -1]
        if (!bucket) return ''
        if (extent === 0) return '误差为零 · ' + bucket.count + ' 点'
        return `${axisValue(bucket.low)} 至 ${axisValue(bucket.high)} ${unit.value} · ${bucket.count} 点`
      },
    },
    xAxis: {
      ...axisCommon(p), type: 'category', data: buckets.map((_, index) => String(index)),
      name: `误差（${unit.value}）`, nameLocation: 'middle', nameGap: 32, nameTextStyle: { color: p.axis },
      axisLabel: { color: p.axis, formatter: index => axisValue(buckets[Number(index)].center) },
    },
    yAxis: { ...axisCommon(p), type: 'value', name: '点数', nameTextStyle: { color: p.axis }, minInterval: 1 },
    series: [{
      type: 'bar', name: '点数', data: buckets.map(bucket => bucket.count), barCategoryGap: '2%',
      barMaxWidth: 58, itemStyle: { color: row.color, opacity: 0.76 },
    }],
  }
})
</script>

<template>
  <section class="comparison-charts" aria-label="图形化对比">
    <header><h2>图形化对比</h2><p>基于同一实验的测试集。</p></header>
    <div class="comparison-tabs" role="tablist" aria-label="对比图表">
      <button v-for="item in tabs" :id="id + '-' + item.key" :key="item.key" type="button" role="tab"
        :aria-selected="tab === item.key" :aria-controls="id + '-panel'" @click="tab = item.key">{{ item.name }}</button>
    </div>
    <div :id="id + '-panel'" class="comparison-panel" role="tabpanel" :aria-labelledby="id + '-' + tab">
      <template v-if="tab === 'radar'">
        <p v-if="rows.length">越靠外，代表在该项得分越高。悬停查看评分规则。</p>
        <fieldset v-if="rows.length" class="radar-options">
          <legend>显示维度</legend>
          <label v-for="axis in dimensions" :key="axis.key" :title="axis.rule">
            <input v-model="selectedDimensions" type="checkbox" :value="axis.key" :disabled="!radarAxes.includes(axis)" />
            {{ axis.name }}<small v-if="!radarAxes.includes(axis)"> · 暂无共同数据</small>
          </label>
        </fieldset>
        <VChart v-if="radar" :option="radar" :update-options="{ notMerge: true }" class="main-chart" autoresize />
        <p v-else class="chart-empty">{{ rows.length && radarAxes.length >= 3 ? '请至少选择三个维度' : '暂无数据' }}</p>
      </template>
      <template v-else-if="tab === 'accuracy'">
        <p v-if="accuracy">柱子越短，预测越接近实测。覆盖时刻较少时，结合覆盖率一起看。</p>
        <VChart v-if="accuracy" :option="accuracy" class="main-chart" autoresize />
        <p v-else class="chart-empty">暂无数据</p>
      </template>
      <template v-else-if="tab === 'efficiency'">
        <p v-if="efficiency">
          越靠左下，误差及{{ measured ? '实测耗时' : '定性复杂度' }}越低。圆形面积反映已记录的模型大小，菱形表示大小暂无数据。
          <template v-if="measured">没有 CPU 试跑记录的算法在这张图里留空。</template>
        </p>
        <VChart v-if="efficiency" :option="efficiency" class="main-chart" autoresize />
        <p v-else class="chart-empty">暂无数据</p>
      </template>
      <template v-else>
        <label v-if="diagnosticPoints.length" class="diagnostic-picker">诊断算法
          <select v-model="diagnosticKey"><option v-for="item in diagnosticPoints" :key="item.key" :value="item.key">{{ item.name }}</option></select>
        </label>
        <div v-if="diagnostic && actualPrediction && residuals" class="diagnostics-grid">
          <figure><figcaption>实测与预测 · 越靠近虚线越准</figcaption><VChart :option="actualPrediction" class="diagnostic-chart" autoresize /></figure>
          <figure><figcaption>误差分布 · 预测减实测</figcaption><VChart :option="residuals" class="diagnostic-chart" autoresize /></figure>
        </div>
        <p v-if="diagnostic">图中有 {{ diagnostic.pairs.length }} 个可对齐的展示点。误差集中在零附近更理想，偏向一侧表示容易高估或低估。</p>
        <p v-else class="chart-empty">暂无数据</p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.comparison-charts { border:1px solid var(--border); background:var(--card); border-radius:8px; overflow:hidden; }
header { padding:16px 16px 10px; }
h2 { font-size:16px; font-weight:650; }
p,small { color:var(--muted-foreground); font-size:12px; }
header p { margin-top:4px; }
.comparison-tabs { display:flex; gap:6px; flex-wrap:wrap; padding:0 12px; border-bottom:1px solid var(--border); }
.comparison-tabs button { padding:8px; border-bottom:2px solid transparent; color:var(--muted-foreground); font-size:12px; cursor:pointer; }
.comparison-tabs button[aria-selected=true] { color:var(--foreground); border-bottom-color:#4286cc; font-weight:650; }
.comparison-panel { padding:12px 16px 16px; }
.radar-options { display:flex; flex-wrap:wrap; gap:6px 13px; margin:8px 0; color:var(--foreground); font-size:12px; }
.radar-options legend { margin-bottom:3px; color:var(--muted-foreground); }
.radar-options input { vertical-align:middle; }
.main-chart { height:340px; }
.diagnostics-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:12px 0; }
.diagnostics-grid figure { min-width:0; }
figcaption { font-size:12px; font-weight:600; }
.diagnostic-chart { height:245px; }
.diagnostic-picker { font-size:12px; }
select { padding:4px 7px; border:1px solid var(--border); border-radius:4px; background:var(--card); }
.chart-empty { padding:28px 0; text-align:center; }
@media(max-width:700px) { .diagnostics-grid { grid-template-columns:1fr; } }
</style>
