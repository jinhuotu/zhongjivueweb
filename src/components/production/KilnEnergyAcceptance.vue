<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import { tooltipBase, useChartPalette } from '@/components/ui-kit/charts/theme'
import { formatKilnNumber, formatKilnReading } from '@/lib/kiln-studio-format'
import type { PredictionEvaluation } from '@/lib/kiln-studio-api'

const props = defineProps<{ evaluation: PredictionEvaluation }>()
ensureEcharts()
const palette = useChartPalette()
const granularity = ref<'hourly' | 'daily'>('hourly')
const periods = computed(() => props.evaluation.energy?.[granularity.value])
const activeLimit = computed(() => periods.value?.thresholdPct ?? 12)
const percent = (value: number | null | undefined) => value == null ? '待核对' : formatKilnNumber(value) + '%'
const time = (value: string) => value.replace('T', ' ').slice(0, granularity.value === 'hourly' ? 16 : 10)
const option = computed<EChartsOption>(() => {
  const p = palette.value
  const rows = periods.value?.periods ?? []
  return {
    animation: false,
    legend: { textStyle: { color: p.legend }, top: 0 },
    grid: { left: 68, right: 18, top: 45, bottom: 67 },
    tooltip: { ...tooltipBase(p), trigger: 'axis', valueFormatter: value => formatKilnReading(value, 'Nm³') },
    xAxis: { type: 'category', data: rows.map(row => time(row.start)), axisLabel: { color: p.axis }, name: '北京时间', nameLocation: 'middle', nameGap: 30 },
    yAxis: { type: 'value', name: '燃气用量 / Nm³', axisLabel: { color: p.axis }, splitLine: { lineStyle: { color: p.grid, type: 'dashed' } } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 0, height: 18, showDetail: false }],
    series: [
      { name: '实际用气', type: 'bar', data: rows.map(row => row.actual), itemStyle: { color: '#8996a8' }, barMaxWidth: 30 },
      { name: '预测用气', type: 'bar', data: rows.map(row => row.prediction), itemStyle: { color: '#2379d2' }, barMaxWidth: 30 },
    ],
  }
})
</script>

<template>
  <div v-if="evaluation.energy" class="energy-acceptance">
    <div class="energy-scores">
      <article v-for="[key, label] in ([['hourly', '每小时平均偏差比例'], ['daily', '每天平均偏差比例']] as const)" :key="key">
        <span>{{ label }}</span>
        <strong>{{ percent(evaluation.energy[key].metrics.mape) }}</strong>
        <p>要求 ≤ {{ evaluation.energy[key].thresholdPct }}% · {{ evaluation.energy[key].meetsTarget === null ? '待完整时段核对' : evaluation.energy[key].meetsTarget ? '符合' : '超出' }}</p>
        <small>完整时段 {{ evaluation.energy[key].completeCount }} 个 · 未完整覆盖 {{ evaluation.energy[key].incompleteCount }} 个</small>
      </article>
    </div>
    <details>
      <summary>查看小时与每天用气对比</summary>
      <div class="period-control">
        <label>统计粒度<select v-model="granularity"><option value="hourly">自然小时</option><option value="daily">自然日</option></select></label>
        <p>当前比例要求 ≤ {{ activeLimit }}% · 比例计算 {{ periods?.metrics.mapeCount ?? 0 }} 个完整且用量大于零的时段</p>
      </div>
      <VChart :option="option" autoresize class="energy-chart" />
      <div class="period-table"><table>
        <thead><tr><th scope="col">时段开始</th><th scope="col">实际用气</th><th scope="col">预测用气</th><th scope="col">可核对时长</th><th scope="col">统计状态</th></tr></thead>
        <tbody><tr v-for="row in periods?.periods ?? []" :key="row.start">
          <td>{{ time(row.start) }}</td><td>{{ formatKilnReading(row.actual, 'Nm³') }}</td><td>{{ formatKilnReading(row.prediction, 'Nm³') }}</td>
          <td>{{ formatKilnNumber(row.coveredMinutes) }} 分钟</td><td>{{ row.reason || '完整覆盖' }}</td>
        </tr></tbody>
      </table></div>
    </details>
    <p>流量按真实时间间隔做梯形积分，分段分配到北京时间的整点和自然日。完整时段参与比例统计，缺测、重叠记录及跨窑次断档会影响完整覆盖。</p>
    <p>本次汇总使用各时刻提前 {{ evaluation.horizonMinutes }} 分钟的滚动预测。小时、日表示汇总粒度，提前量沿用保存的模型。</p>
    <p v-if="periods?.metrics.mapeExcludedCount">其中 {{ periods.metrics.mapeExcludedCount }} 个完整时段因实际用气低于 0.001 Nm³，保留用量并退出百分比统计。</p>
  </div>
</template>

<style scoped>
.energy-scores { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:20px; margin:15px 0; }
.energy-scores article { min-width:0; }
.energy-scores span,.energy-scores small,p { color:var(--muted-foreground); }
.energy-scores strong { display:block; margin:4px 0; font-size:25px; }
p { line-height:1.7; margin-top:7px; }
details { margin:14px 0; border-top:1px solid var(--border); padding-top:10px; }
summary { font-weight:600; cursor:pointer; }
.period-control { display:flex; align-items:center; flex-wrap:wrap; gap:15px; margin-top:10px; }
select { border:1px solid var(--border); border-radius:5px; background:var(--background); padding:5px 8px; margin-left:8px; }
.energy-chart { height:330px; width:100%; margin-top:12px; }
.period-table { max-height:260px; overflow:auto; }
table { border-collapse:collapse; width:100%; text-align:left; white-space:nowrap; }
th,td { padding:7px 10px; border-bottom:1px solid var(--border); }
</style>
