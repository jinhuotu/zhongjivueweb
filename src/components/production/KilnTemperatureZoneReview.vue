<script setup lang="ts">
import { computed, ref } from 'vue'
import KilnPredictionQuality from './KilnPredictionQuality.vue'
import KilnZoneObservations from './KilnZoneObservations.vue'
import { hasMinuteForecast, hasUsableBacktest } from '@/lib/kiln-studio-state'
import type { AlgorithmKey, Dataset, Experiment } from '@/lib/kiln-studio-api'

const props = defineProps<{
  dataset: Dataset; experiment: Experiment; algorithm: AlgorithmKey; experiments: Experiment[]
  busy?: boolean; canOptimize?: boolean; canApply?: boolean; trainLabel?: string
}>()
const emit = defineEmits<{ train: [zone: number]; optimize: [zone: number]; apply: [experiment: Experiment, algorithm: AlgorithmKey] }>()
const mode = ref<'prediction' | 'observed'>('prediction')
const zone = ref(props.experiment.config.zone)
const active = computed(() => {
  if (zone.value === props.experiment.config.zone) {
    return { experiment: props.experiment, algorithm: props.algorithm }
  }
  const candidates = props.experiments.filter(experiment =>
    experiment.datasetId === props.dataset.id && experiment.config.task === 'temperature' &&
    experiment.config.zone === zone.value,
  ).flatMap(experiment => experiment.algorithms.filter(hasUsableBacktest).map(algorithm => ({
    experiment, algorithm: algorithm.key,
    sameHorizon: experiment.config.horizonMinutes === props.experiment.config.horizonMinutes,
    fullTrajectory: hasMinuteForecast(algorithm, 30),
    sameMechanism: experiment.mechanismId === props.experiment.mechanismId,
    sameAlgorithm: algorithm.key === props.algorithm,
  })))
  return candidates.sort((a, b) => Number(b.sameHorizon) - Number(a.sameHorizon) ||
    Number(b.sameMechanism) - Number(a.sameMechanism) || Number(b.fullTrajectory) - Number(a.fullTrajectory) ||
    Number(b.sameAlgorithm) - Number(a.sameAlgorithm))[0]
})
const hasZoneData = computed(() => props.dataset.summary.some(cycle => cycle.fields.some(
  field => field.key === (zone.value ? `z${zone.value}_temp` : 'temp') && field.present > 0,
)))
</script>

<template>
  <section class="zone-review" aria-label="温区预测与实测">
    <div class="zone-toolbar">
      <div class="modes" role="group" aria-label="温度查看方式">
        <button type="button" :aria-pressed="mode === 'prediction'" @click="mode = 'prediction'">温区预测核验</button>
        <button type="button" :aria-pressed="mode === 'observed'" @click="mode = 'observed'">多温区实测对比</button>
      </div>
      <label v-if="mode === 'prediction'">查看温区
        <select v-model.number="zone" :disabled="busy">
          <option :value="0">总体温度</option>
          <option v-for="number in dataset.config.zoneCount" :key="number" :value="number">{{ number }} 区</option>
        </select>
      </label>
      <button v-if="mode === 'prediction' && canApply && active && active.experiment.id !== experiment.id"
        type="button" :disabled="busy" @click="emit('apply', active.experiment, active.algorithm)">用此温区模型查看看板</button>
    </div>
    <KilnZoneObservations v-if="mode === 'observed'" :dataset="dataset" />
    <KilnPredictionQuality v-else-if="active" :key="active.experiment.id + '/' + active.algorithm"
      :experiment="active.experiment" :algorithm="active.algorithm" :optimizing="busy"
      :can-optimize="canOptimize && active.experiment.id === experiment.id" @optimize="emit('optimize', zone)" />
    <template v-else>
      <div class="no-model">
        <p><strong>{{ zone ? zone + ' 区' : '总体温度' }}暂无可核验的预测模型</strong></p>
        <button v-if="hasZoneData" type="button" :disabled="busy" @click="emit('train', zone)">
          {{ busy ? '正在处理模型' : trainLabel ?? '训练该温区的 30 分钟逐点模型' }}
        </button>
        <p v-else>当前数据版本缺少这个目标的温度读数。请在数据确认中检查测点映射。</p>
      </div>
      <KilnZoneObservations v-if="zone && hasZoneData" :key="zone" :dataset="dataset" :zone="zone" />
    </template>
  </section>
</template>

<style scoped>
.zone-review { display:grid; gap:10px; }
.zone-toolbar,.no-model { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px 14px; padding:10px 12px; border:1px solid var(--border); background:var(--card); border-radius:8px; }
.modes,label { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
button,select { padding:6px 10px; border:1px solid var(--border); border-radius:5px; background:var(--background); }
button:enabled { cursor:pointer; }
button:disabled { opacity:.5; }
[aria-pressed="true"] { color:#fff; background:#266e6b; }
p,label { font-size:13px; }
</style>
