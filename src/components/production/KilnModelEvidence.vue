<script setup lang="ts">
import { computed } from 'vue'
import type { Bundle, Dataset, Experiment, Mechanism } from '@/lib/kiln-studio-api'
import { formatKilnNumber, formatKilnReading, kilnReadingDigits } from '@/lib/kiln-studio-format'

const props = defineProps<{
  model: Bundle['manifest'][number]
  dataset: Dataset
  experiment?: Experiment
  mechanism?: Mechanism
}>()

const chosen = computed(() => props.experiment?.algorithms.find(item => item.key === props.model.algorithm))
const test = computed(() => props.experiment?.split.find(item => item.name === '测试'))
const comparisons = computed(() => {
  const experiment = props.experiment
  if (!experiment || !test.value || props.model.test.mae == null) return []
  const sample = experiment.points.filter(point => point.split === 'test')
  return experiment.algorithms.flatMap(candidate => {
    if (candidate.key === props.model.algorithm || !candidate.available || candidate.test?.mae == null) return []
    if (candidate.test.count === test.value?.count && props.model.test.count === test.value.count) {
      return [{ key: candidate.key, name: candidate.name, count: candidate.test.count, selected: props.model.test.mae!,
        candidate: candidate.test.mae, sampled: false }]
    }
    let count = 0
    let selectedError = 0
    let candidateError = 0
    for (const point of sample) {
      const selected = point[props.model.algorithm]
      const other = point[candidate.key]
      if (typeof selected !== 'number' || typeof other !== 'number') continue
      selectedError += Math.abs(selected - point.actual)
      candidateError += Math.abs(other - point.actual)
      count++
    }
    return count ? [{ key: candidate.key, name: candidate.name, count, selected: selectedError / count,
      candidate: candidateError / count, sampled: true }] : []
  })
})

const reading = (value: number | null) => formatKilnReading(value, props.model.unit)
const comparisonSummary = computed(() => {
  const reference = comparisons.value.find(item => item.key === 'baseline') ?? comparisons.value[0]
  if (!reference) return ''
  const delta = reference.selected - reference.candidate
  const scope = reference.sampled ? '在共同可用的测试抽样点上' : '在同一测试集上'
  if (formatKilnNumber(Math.abs(delta), kilnReadingDigits(props.model.unit)) === '0') {
    return `${scope}，已选算法与「${reference.name}」的平均相差接近。`
  }
  return `${scope}，已选算法的平均相差比「${reference.name}」${delta < 0 ? '小' : '大'} ${reading(Math.abs(delta))}。`
})
const dateText = (value: string) => value.replace('T', ' ').slice(0, 16)
const inputLabels: Record<string, string> = {
  current: '起点目标值', temp: '窑温', gas: '燃气流量', air: '助燃风流量',
  o2: '含氧量', pressure: '窑压', sp0: '起点温度设定', sp1: '目标时刻温度设定',
}
</script>

<template>
  <section class="evidence">
    <h3>算法选型与建模依据</h3>
    <div class="evidence-summary">
      <div><span>已选算法</span><strong>{{ model.algorithmName }}</strong></div>
    <div><span>历史核对平均相差</span><strong>{{ reading(model.test.mae) }}</strong></div>
      <div><span>有效预测</span><strong>{{ formatKilnNumber(model.test.count, 0) }} 点<template v-if="test"> / {{ formatKilnNumber(test.count, 0) }} 点</template></strong></div>
    </div>
    <p v-if="chosen?.strengths?.length"><b>优点</b> {{ chosen.strengths[0] }}</p>
    <p v-if="chosen?.limitations?.length"><b>局限</b> {{ chosen.limitations[0] }}</p>
    <p v-if="chosen?.fitScenarios?.length"><b>适用工况</b> {{ chosen.fitScenarios[0] }}</p>
    <p v-if="comparisonSummary">{{ comparisonSummary }}</p>
    <div v-if="comparisons.length" class="evidence-table">
      <table>
        <caption>本实验测试记录 · 同一批预测点与实测平均相差多少</caption>
        <thead><tr><th scope="col">备选算法</th><th scope="col">样本</th><th scope="col">已选误差</th><th scope="col">备选误差</th><th scope="col">已选相比</th></tr></thead>
        <tbody><tr v-for="row in comparisons" :key="row.key">
          <th scope="row">{{ row.name }}</th><td>{{ formatKilnNumber(row.count, 0) }} 点{{ row.sampled ? '（共同抽样）' : '' }}</td>
          <td>{{ reading(row.selected) }}</td><td>{{ reading(row.candidate) }}</td>
          <td>{{ reading(row.selected - row.candidate) }}（已选 − 备选）</td>
        </tr></tbody>
      </table>
    </div>
    <p v-else>当前实验暂无共同测试点的备选算法，选型优劣待对比。</p>
    <details>
      <summary>查看数据、机理与参数来源</summary>
      <p>数据版本 {{ dataset.title }} · {{ dataset.dataHash.slice(0, 12) }}</p>
      <p>机理版本 {{ mechanism?.title ?? '' }} {{ model.mechanismVersion }} · {{ model.mechanismRole }}</p>
      <p>回测时距 {{ model.config.horizonMinutes }} 分钟 · 历史窗口 {{ model.config.historyMinutes }} 分钟</p>
      <p v-if="test">测试片段 {{ dateText(test.from) }} 至 {{ dateText(test.to) }}</p>
      <p v-if="experiment?.splitMethod">{{ experiment.splitMethod }}</p>
      <p v-if="chosen?.dataRequirements?.length">输入要求 {{ chosen.dataRequirements.join('、') }}</p>
      <p v-else-if="experiment?.featureNames.some(name => inputLabels[name])">部分输入 {{ experiment.featureNames.flatMap(name => inputLabels[name] ?? []).join('、') }}</p>
      <p v-if="experiment?.calibration.length">{{ experiment.calibration.join('；') }}</p>
    </details>
  </section>
</template>

<style scoped>
.evidence { color:var(--foreground); background:var(--card); border:1px solid var(--border); border-radius:10px; padding:20px; font-size:13px; }
h3 { font-size:16px; margin-bottom:14px; }
.evidence-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(144px,1fr)); gap:15px; margin-bottom:14px; }
.evidence-summary div { background:var(--muted); border-radius:6px; padding:12px; }
.evidence-summary span { display:block; color:var(--muted-foreground); margin-bottom:5px; }
.evidence-summary strong { font-size:16px; }
p { margin:6px 0; line-height:1.6; color:var(--muted-foreground); }
b { color:var(--foreground); margin-right:6px; }
.evidence-table { overflow:auto; margin:14px 0; }
table { width:100%; border-collapse:collapse; text-align:left; white-space:nowrap; }
caption { text-align:left; color:var(--muted-foreground); margin-bottom:6px; }
th,td { padding:8px; border-bottom:1px solid var(--border); }
summary { cursor:pointer; font-weight:600; }
details { margin-top:14px; }
</style>
