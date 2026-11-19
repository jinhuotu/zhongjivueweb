<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Check, Workflow } from 'lucide-vue-next'
import KilnMiniSparkline from './KilnMiniSparkline.vue'
import { algorithmCards, algorithmPrediction, compareValidationScores, hasUsableBacktest } from '@/lib/kiln-studio-state'
import { algorithmTuningLabel, formatKilnNumber as fmt, formatKilnReading } from '@/lib/kiln-studio-format'
import type { AlgorithmKey, AlgorithmMetadata, AlgorithmRecommendationCard, Experiment, ExperimentPoint } from '@/lib/kiln-studio-api'

const props = defineProps<{
  library: AlgorithmMetadata[]
  experiment?: Experiment
  selectionMatchesExperiment: boolean
  split: 'validation' | 'test'
  comparison?: Experiment
  selected?: AlgorithmKey
  pending?: AlgorithmKey
  advice?: AlgorithmRecommendationCard[]
  canSelect: boolean
}>()
const emit = defineEmits<{ select: [key: AlgorithmKey] }>()
const cards = computed(() => algorithmCards(props.library, props.experiment?.algorithms).map(card => {
  const item = card.historical ? (card.result ?? card.definition!) : (card.definition ?? card.result!)
  const advice = props.advice?.find(value => value.key === item.key)
  const status = card.definition?.status
  const unavailable = (props.selectionMatchesExperiment && !card.historical && !!card.result && !hasUsableBacktest(card.result)) ||
    advice?.backtestStatus === 'unavailable'
  const canChoose = props.canSelect && status === 'enabled' && !unavailable
  const label = status === 'disabled' ? '已下架' : status === 'experimental' ? '试验中' :
    unavailable ? '当前不可用' : card.historical ? '历史回测' : card.result ? '已回测' : '待回测'
  return { ...card, item, advice, label, canChoose }
}))
const validationCount = computed(() => props.experiment?.split.find(item => item.name === '验证')?.count ?? 0)
const scores = computed(() => compareValidationScores(props.experiment?.algorithms ?? [], validationCount.value))
const leaders = computed(() => scores.value.filter(row => row.score === scores.value[0]?.score))
const byKey = computed(() => new Map(scores.value.map(row => [row.key, row])))
const percent = (value?: number) => value == null ? '—' : `${fmt(value * 100, 1)}%`
const routes: Record<string, string[]> = {
  baseline: ['当前读数', '保持当前值', '预测值'],
  lstm: ['历史序列', 'LSTM 时序网络', '预测值'],
  ridge: ['工况特征', '岭回归', '预测值'],
  boosting: ['工况特征', '逐轮拟合残差', '预测值'],
  physics: ['工艺参数', '机理求解', '预测值'],
  fusion: ['机理预测', '残差修正', '融合值'],
}
const representativePoints = computed(() => {
  const cycles = new Map<string, ExperimentPoint[]>()
  const models = props.experiment?.algorithms.filter(item => item.available) ?? []
  for (const point of props.experiment?.points ?? []) {
    if (point.split !== 'test') continue
    const cycle = cycles.get(point.cycle)
    if (cycle) cycle.push(point)
    else cycles.set(point.cycle, [point])
  }
  const length = 36
  let best = 0
  let selection: ExperimentPoint[] = []
  // 所有卡片使用同一窑次片段。按有效预测点数量选片段，不按误差挑选。
  for (const points of cycles.values()) {
    points.sort((left, right) => left.ts.localeCompare(right.ts))
    const weights = points.map(point => Number.isFinite(point.actual) && point.actual !== -9999
      ? models.filter(item => algorithmPrediction(point, item.key) !== null).length : 0)
    let count = 0
    for (const [index, weight] of weights.entries()) {
      count += weight - (weights[index - length] ?? 0)
      if (count <= best) continue
      best = count
      const start = Math.max(0, index - length + 1)
      selection = points.slice(start, start + length)
    }
  }
  return selection
})
</script>

<template>
  <section class="algorithm-results" aria-label="算法结果与选用">
    <header class="result-heading">
      <h2>选择用于建模的算法</h2>
    </header>
    <div class="algorithm-grid">
      <article v-for="{ item, result, historical, advice: cardAdvice, label, canChoose } in cards" :key="item.key"
        :class="{ chosen: selected === item.key || pending === item.key, selectable: canChoose }"
        @click="canChoose && emit('select', item.key)">
        <div class="card-heading">
          <h3>{{ item.name }}</h3><span class="badge">{{ label }}</span>
        </div>
        <div @click.stop>
          <KilnMiniSparkline :points="representativePoints" :algorithm="item.key" :unit="experiment?.unit" />
        </div>
        <div class="highlights">
          <span v-if="item.category" class="badge">{{ item.category }}</span>
          <span v-if="item.tuning" class="badge">{{ algorithmTuningLabel(item.tuning) }}</span>
          <span v-if="item.sampleSizeRisk === 'high'" class="badge risk">小样本过拟合风险</span>
        </div>
        <p>{{ item.oneLine ?? item.explanation }}</p>
        <details @click.stop><summary>适用场景与局限</summary><dl class="card-details">
          <div v-if="item.strengths?.length"><dt>优点</dt><dd>{{ item.strengths.join('；') }}</dd></div>
          <div v-if="item.benefits?.length"><dt>使用好处</dt><dd>{{ item.benefits.join('；') }}</dd></div>
          <div v-if="item.fitScenarios?.length"><dt>适用场景</dt><dd>{{ item.fitScenarios.join('；') }}</dd></div>
        </dl>
        <p v-if="item.limitations?.length" class="warning">{{ item.limitations.join('；') }}</p></details>
        <p v-if="result?.note" class="warning">{{ result.note }}</p>
        <p v-else-if="result && !hasUsableBacktest(result)" class="warning">本次实验没有可选用的有效测试结果。</p>
        <p v-if="label === '待回测'" class="muted">暂无回测成绩。</p>
        <details v-if="result?.[split]" @click.stop>
          <summary>{{ split === 'validation' ? '验证集' : '测试集' }}指标</summary>
          <div class="metrics">
            <span title="同一时刻同时有实测和预测，才能算入误差">有效样本 <strong>{{ result[split]?.count }} 个</strong></span>
            <span title="每次预测与实测相差的数值取绝对值后求平均">平均相差 <strong>{{ formatKilnReading(result[split]?.mae, experiment?.unit) }}</strong></span>
            <span title="反映整体偏差，对个别大偏差更敏感，越小越好">{{ experiment?.config.task === 'temperature' ? '综合温差' : '综合偏差' }} <strong>{{ formatKilnReading(result[split]?.rmse, experiment?.unit) }}</strong></span>
            <span v-if="result[split]?.mape != null" title="每个预测点的偏差占实测值的比例，再取平均">平均偏差比例 <strong>{{ fmt(result[split]?.mape) }}%</strong></span>
            <span title="能给出有效预测的时刻占全部对比时刻的比例">覆盖率 <strong>{{ percent(result[split]?.coverage) }}</strong></span>
          </div>
          <div v-if="byKey.has(item.key)" class="highlights">
            <span v-if="byKey.get(item.key)?.lowestMae" class="badge good">验证记录平均相差最小</span>
            <span v-if="byKey.get(item.key)?.lowestRmse" class="badge good">验证记录综合偏差最小</span>
          </div>
          <p v-if="experiment?.config.task === 'energy' && result[split]?.windowPredictedNm3 != null" class="muted">这段时间的耗气量 · 预测 {{ fmt(result[split]?.windowPredictedNm3) }} / 实测 {{ fmt(result[split]?.windowActualNm3) }} Nm³ · 累计误差 {{ fmt(result[split]?.totalErrorPct) }}% · 覆盖 {{ fmt(result[split]?.coveredHours) }} 小时</p>
          <p v-if="comparison" class="muted">对照机理 {{ comparison.mechanismVersion }} · 同算法平均误差 {{ formatKilnReading(comparison.algorithms.find(a => a.key === item.key)?.[split]?.mae, comparison.unit) }}</p>
        </details>
        <div class="card-actions">
          <button type="button" :disabled="!canChoose" :aria-pressed="selected === item.key || pending === item.key" @click.stop="emit('select', item.key)">
            <Check v-if="selected === item.key || pending === item.key" :size="12" />
            {{ selected === item.key ? '已选用' : pending === item.key ? '已待选' : result && !historical ? '选用算法' : '选择此算法' }}
          </button>
          <details @click.stop><summary>数据要求与算法原理</summary>
            <div class="method" aria-label="模型计算路径"><Workflow :size="15" />
              <template v-for="(node,i) in routes[item.baseKey ?? item.key] ?? ['输入特征','模型推理','预测值']" :key="i">
                <ArrowRight v-if="i" :size="12" /><span>{{ node }}</span>
              </template>
            </div>
            <p v-if="item.dataRequirements?.length">{{ item.dataRequirements.join('；') }}</p>
            <p class="formula">{{ item.formula }}</p><p>{{ item.explanation }}</p><p class="muted">{{ item.mechanismRole }}</p>
          </details>
        </div>
        <details v-if="cardAdvice?.evidenceRefs.length" @click.stop>
          <summary>查看依据</summary>
          <p>{{ cardAdvice.whyNow }}</p>
          <article v-for="ref in cardAdvice.evidenceRefs" :key="ref.id" class="evidence">
            <strong>{{ ref.label }}</strong><small v-if="ref.location"> · {{ ref.location }}</small>
            <p>{{ ref.detail }}</p>
          </article>
        </details>
      </article>
    </div>
    <p v-if="!cards.length" class="muted empty">当前没有可展示的算法。</p>
    <details v-if="experiment" class="overview">
      <summary>查看验证集对比与指标说明</summary>
      <dl class="definitions">
        <div><dt>MAE · 平均绝对误差</dt><dd>每个预测点与实测的差距取绝对值后求平均。越低，预测平均越接近实测。</dd></div>
        <div><dt>RMSE · 均方根误差</dt><dd>误差先平方、求平均，再开平方。越低越好，大偏差会比小偏差受到更重的惩罚。</dd></div>
        <div><dt>覆盖率 · 有效预测比例</dt><dd>能给出有效预测的点数占比。覆盖率 100% 表示覆盖了全部评估点。</dd></div>
      </dl>
      <div class="ranking">
        <div class="rank-heading">
          <h3>验证集对比分</h3>
          <p v-if="leaders.length"><strong>{{ leaders.length > 1 ? '并列领先' : '本次领先' }}</strong> {{ leaders.map(row => row.name).join('、') }}</p>
        </div>
        <ul v-if="scores.length" class="score-list">
          <li v-for="row in scores" :key="row.key">
            <span>{{ row.name }}</span>
            <meter :value="row.score" min="0" max="100" :aria-label="row.name + '验证集对比分'"></meter>
            <strong>{{ row.score.toFixed(1) }}</strong>
          </li>
        </ul>
        <p v-else class="muted">需要至少两种算法完整覆盖同一验证集，才能计算可比分数。</p>
        <details>
          <summary>评分规则</summary>
          <p>满分 100。MAE 占 60 分，RMSE 占 40 分，每项按「本组最低误差 ÷ 该算法误差」乘权重得分。误差为零的算法获该项满分。该分数用于验证集内部对照。</p>
        </details>
      </div>
    </details>
  </section>
</template>

<style scoped>
.algorithm-results { background:var(--card); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
.result-heading,.card-heading,.rank-heading,.metrics,.highlights { display:flex; align-items:center; gap:8px 14px; flex-wrap:wrap; }
.result-heading,.card-heading,.rank-heading { justify-content:space-between; }
.result-heading { padding:14px 17px; border-bottom:1px solid var(--border); }
h2 { font-size:14px; font-weight:600; }
h3 { font-size:13px; font-weight:650; }
.overview { display:grid; gap:12px; padding:14px 17px; }
.definitions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.definitions>div,.ranking { border:1px solid var(--border); background:var(--background); border-radius:6px; padding:10px; }
dt { font-size:11px; font-weight:650; }
dd,p { font-size:11px; line-height:1.65; margin-top:4px; }
dd,.muted,details { color:var(--muted-foreground); }
.rank-heading p { margin:0; }
.rank-heading strong,.good { color:var(--foreground); background:#40968720; border-radius:4px; padding:2px 5px; }
.score-list { display:grid; gap:5px; margin:8px 0; }
.score-list li { display:grid; grid-template-columns:minmax(104px,10em) minmax(24px,1fr) 43px; align-items:center; gap:8px; font-size:11px; }
.score-list strong { text-align:right; font-variant-numeric:tabular-nums; }
meter { width:100%; height:11px; }
meter::-webkit-meter-bar { background:var(--muted); border:0; }
meter::-webkit-meter-optimum-value { background:#4a9988; }
.badge { font-size:10px; background:var(--muted); border:1px solid var(--border); border-radius:4px; padding:2px 6px; color:var(--muted-foreground); }
.badge.good { background:#40968720; color:var(--foreground); }
.badge.risk { background:#c495541c; color:var(--foreground); }
.algorithm-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,245px),1fr)); }
.method { display:flex; align-items:center; gap:5px; margin:12px 0 8px; padding:10px 7px; border-radius:6px; color:#a8dfe7; background:linear-gradient(110deg,#17354b,#112939); }
.method span { font-size:10px; color:#e0f6fa; }.method svg { flex-shrink:0; }
.algorithm-grid :deep(.sparkline) { margin:8px 0; }
.algorithm-grid>article { min-width:0; border-bottom:1px solid var(--border); border-right:1px solid var(--border); padding:14px 17px; }
.algorithm-grid>article:nth-child(2n) { border-right:0; }
.selectable { cursor:pointer; }
.selectable:hover { background:#3a897d0e; }
.chosen { background:#3a897d14; }
.card-details { margin:8px 0; }
.card-details>div { display:flex; gap:8px; align-items:baseline; }
.card-details dt { flex:0 0 auto; }
.card-actions { display:flex; flex-wrap:wrap; align-items:baseline; gap:6px 12px; margin-top:10px; }
.evidence { margin-top:6px; overflow-wrap:anywhere; }
.empty { padding:12px 17px; }
button { display:inline-flex; align-items:center; gap:5px; border:1px solid var(--border); border-radius:6px; padding:5px 9px; font-size:11px; }
button:enabled:hover { background:var(--muted); cursor:pointer; }
button:disabled { opacity:.55; cursor:not-allowed; }
.metrics,.highlights { margin-top:8px; font-size:10px; }
.metrics strong { font-size:14px; margin-left:2px; font-variant-numeric:tabular-nums; }
details { margin-top:7px; font-size:11px; }
summary { cursor:pointer; }
.formula { background:var(--muted); border-radius:4px; padding:5px 8px; overflow-wrap:anywhere; font-family:Consolas,monospace; }
.warning { color:var(--foreground); border-left:2px solid #c49554; padding-left:7px; }
@media(max-width:930px) {
  .definitions,.algorithm-grid { grid-template-columns:1fr; }
  .algorithm-grid>article { border-right:0; }
}
</style>
