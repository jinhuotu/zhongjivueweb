<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowDown, ArrowLeft, ArrowUp, FlaskConical, Upload, X } from 'lucide-vue-next'
import { importExternalAlgorithm, studioGet } from '@/lib/kiln-studio-api'
import type { AlgorithmMetadata, ExternalAlgorithmContract, ExperimentConfig, Task } from '@/lib/kiln-studio-api'
import { externalAlgorithmIssue } from '@/lib/kiln-studio-state'
import { formatKilnNumber, formatKilnReading, KILN_PARAMETER_DIGITS, KILN_TASK_UNITS as units } from '@/lib/kiln-studio-format'

const props = defineProps<{ current: ExperimentConfig; disabled: boolean; selected: string[] }>()
const emit = defineEmits<{ back: []; imported: [item: AlgorithmMetadata]; add: [key: string] }>()
const labels: Record<Task, string> = { temperature: '温度预测', energy: '燃气流量预测', afr: '空燃比预测' }
const contract = ref<ExternalAlgorithmContract>()
const contractLoading = ref(false)
const busy = ref(false)
const error = ref('')
const file = ref<File>()
const imported = ref<AlgorithmMetadata>()
const feature = ref('')
const features = ref<number[]>([])
const probe = ref('')
const form = ref({
  name: '', description: '', trainedUntil: '', task: props.current.task, zone: props.current.zone,
  horizonMinutes: props.current.horizonMinutes, historyMinutes: props.current.historyMinutes,
})
const remainingFeatures = computed(() => contract.value?.features
  .map((label, index) => ({ label, index }))
  .filter(({ index }) => !features.value.includes(index)) ?? [])
const external = computed(() => imported.value?.external)
const issue = computed(() => imported.value ? externalAlgorithmIssue(imported.value, props.current) : '')

async function loadContract() {
  contractLoading.value = true
  error.value = ''
  try {
    contract.value = await studioGet<ExternalAlgorithmContract>('/algorithm-library/external-contract')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '无法读取模型输入要求'
  } finally {
    contractLoading.value = false
  }
}
onMounted(loadContract)

function chooseFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0]
  if (file.value && !form.value.name) form.value.name = file.value.name.replace(/\.onnx$/i, '').slice(0, 120)
}

function addFeature() {
  if (feature.value === '') return
  features.value.push(Number(feature.value))
  feature.value = ''
}

function moveFeature(index: number, direction: number) {
  const next = index + direction
  if (next < 0 || next >= features.value.length) return
  const [selected] = features.value.splice(index, 1)
  features.value.splice(next, 0, selected!)
}

function parseProbe(value: string) {
  const text = value.trim()
  if (text.startsWith('[')) {
    const decoded: unknown = JSON.parse(text)
    if (!Array.isArray(decoded) || !decoded.every(item => typeof item === 'number' && Number.isFinite(item))) {
      throw new Error('试跑数据须为数字数组')
    }
    return decoded as number[]
  }
  return text ? text.split(/[,，\s]+/).map(Number) : []
}

async function submit() {
  if (busy.value || props.disabled || !file.value || !contract.value) return
  error.value = ''
  busy.value = true
  try {
    if (!file.value.name.toLowerCase().endsWith('.onnx')) throw new Error('请选择 .onnx 文件')
    if (!file.value.size || file.value.size > contract.value.maxBytes) throw new Error('请选择不超过 8 MB 的 ONNX 文件')
    const values = parseProbe(probe.value)
    if (!features.value.length || values.length !== features.value.length || !values.every(Number.isFinite)) {
      throw new Error('按特征顺序填写试跑输入，每个特征对应一个数值')
    }
    const item = await importExternalAlgorithm(file.value, {
      ...form.value, trainedUntil: form.value.trainedUntil + '+08:00',
      zone: form.value.task === 'temperature' ? form.value.zone : 0,
      featureIndices: [...features.value], probe: values,
    })
    imported.value = item
    emit('imported', item)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '导入或试跑失败'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="external-import">
    <button type="button" class="action secondary" :disabled="busy" @click="emit('back')"><ArrowLeft :size="14" />返回算法库</button>
    <div v-if="external && imported" class="import-result">
      <h3>已导入，试跑成功</h3>
      <p class="muted">{{ imported.name }} · {{ external.fileName }} · {{ formatKilnNumber(external.byteSize / 1024) }} KB</p>
      <dl>
        <dt>模型输入</dt><dd>{{ external.inputName }} · {{ external.inputType }} · {{ external.featureIndices.map(index => contract?.features[index]).join(' → ') }}</dd>
        <dt>试跑数据</dt><dd>{{ external.probe.map(value => formatKilnNumber(value, KILN_PARAMETER_DIGITS)).join('，') }}</dd>
        <dt>实际输出</dt><dd class="number">{{ formatKilnReading(external.probeOutput, units[external.task]) }}</dd>
        <dt>文件指纹</dt><dd class="fingerprint">{{ external.sha256 }}</dd>
      </dl>
      <p v-if="issue" class="muted">{{ issue }}，按对应的实验设置即可加入对比。</p>
      <button type="button" class="action primary" :disabled="disabled || !!issue || selected.includes(imported.key) || selected.length >= 32" @click="emit('add', imported.key)">
        {{ selected.includes(imported.key) ? '已加入当前对比' : '加入当前对比' }}
      </button>
    </div>
    <template v-else>
      <div><h3>导入外部 ONNX 模型</h3><p class="muted">上传已训练的单文件表格回归模型。平台按下方映射试跑，成功后保存到算法库。</p></div>
      <p v-if="error" class="problem" role="alert">{{ error }}</p>
      <p v-if="contractLoading" class="muted" role="status">正在读取支持的输入特征…</p>
      <button v-else-if="!contract" type="button" class="action secondary" @click="loadContract">重试</button>
      <form v-else class="import-form" @submit.prevent="submit">
        <label class="upload-field"><span><Upload :size="16" />模型文件（.onnx，最多 {{ contract.maxBytes / (1024 * 1024) }} MB）</span>
          <input type="file" accept=".onnx" required @change="chooseFile" />
        </label>
        <div class="fields">
          <label>模型名称<input v-model.trim="form.name" required maxlength="120" /></label>
          <label>预测任务
            <select v-model="form.task"><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select>
          </label>
          <label v-if="form.task === 'temperature'">预测温区（0 为均温）<input v-model.number="form.zone" required type="number" min="0" max="16" step="1" /></label>
          <label>预测时长 / 分钟<input v-model.number="form.horizonMinutes" required type="number" min="5" max="120" step="1" /></label>
          <label>历史窗口 / 分钟<input v-model.number="form.historyMinutes" required type="number" min="5" max="240" step="1" /></label>
          <label>训练数据截止时间（北京时间）<input v-model="form.trainedUntil" type="datetime-local" required /></label>
        </div>
        <fieldset>
          <legend>输入特征顺序</legend>
          <p class="muted">按模型训练时的顺序添加。输入为数值张量 [批次, {{ features.length || '特征数' }}]，预处理需随模型导出。</p>
          <label>添加特征<select v-model="feature" @change="addFeature">
            <option disabled value="">选择特征</option><option v-for="item in remainingFeatures" :key="item.index" :value="String(item.index)">{{ item.label }}</option>
          </select></label>
          <ol class="feature-list">
            <li v-for="(index, order) in features" :key="index">
              <span>{{ order + 1 }}. {{ contract.features[index] }}</span>
              <button type="button" :disabled="order === 0" :aria-label="'上移' + contract.features[index]" @click="moveFeature(order, -1)"><ArrowUp :size="14" /></button>
              <button type="button" :disabled="order === features.length - 1" :aria-label="'下移' + contract.features[index]" @click="moveFeature(order, 1)"><ArrowDown :size="14" /></button>
              <button type="button" :aria-label="'移除' + contract.features[index]" @click="features.splice(order, 1)"><X :size="14" /></button>
            </li>
          </ol>
        </fieldset>
        <label>试跑输入值<input v-model="probe" required placeholder="按上方顺序输入数值，用逗号分隔" /></label>
        <p class="muted">输出每行一个 {{ labels[form.task] }}值，单位 {{ units[form.task] }}。缺少必需特征的记录会计入覆盖率。</p>
        <label>说明（选填）<textarea v-model.trim="form.description" rows="2" maxlength="1500" /></label>
        <button type="submit" class="action primary" :disabled="busy || disabled || !file || !features.length"><FlaskConical :size="15" />{{ busy ? '正在运行模型…' : '导入并试跑' }}</button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.external-import,.import-form { display:grid; gap:12px; }
.external-import { max-height: min(68dvh, 570px); overflow:auto; padding:2px 4px 5px; font-size:13px; }
.external-import h3 { margin-bottom:4px; font-size:16px; font-weight:650; }
.fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
.import-form label { display:grid; gap:4px; min-width:0; }
.import-form input,.import-form select,.import-form textarea { border:1px solid var(--border); background:var(--background); color:var(--foreground); border-radius:5px; padding:7px 8px; min-width:0; }
.upload-field { padding:10px; border:1px dashed var(--border); border-radius:6px; }
.upload-field span { display:flex; gap:6px; align-items:center; }
.import-form fieldset { display:grid; gap:6px; border-top:1px solid var(--border); padding-top:7px; }
.feature-list li { display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--border); padding:4px; }
.feature-list li span { flex:1; }
.feature-list button { padding:4px; cursor:pointer; }
.action { justify-self:start; display:inline-flex; align-items:center; gap:6px; border:1px solid var(--border); border-radius:6px; padding:7px 10px; cursor:pointer; }
.action.primary { background:#286e69; border-color:#286e69; color:white; }
button:disabled { opacity:.55; cursor:default; }
.muted { color:var(--muted-foreground); font-size:12px; line-height:1.6; }
.problem { color:var(--destructive); }
.import-result { padding:10px 0; }
.import-result dl { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:8px 14px; margin:16px 0; }
.import-result dt { color:var(--muted-foreground); }
.import-result dd { overflow-wrap:anywhere; }
.import-result .fingerprint { font-family:monospace; font-size:11px; }
.import-result .number { font-weight:650; }
.import-result .action { margin-top:12px; }
@media(max-width:580px) { .fields { grid-template-columns:1fr; } }
</style>
