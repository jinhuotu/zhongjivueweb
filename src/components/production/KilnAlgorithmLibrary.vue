<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Plus, Search, Upload } from 'lucide-vue-next'
import KilnExternalAlgorithmImport from './KilnExternalAlgorithmImport.vue'
import AppDialog from '@/components/ui/AppDialog.vue'
import { studioPost } from '@/lib/kiln-studio-api'
import type { AlgorithmMetadata, ExperimentConfig } from '@/lib/kiln-studio-api'
import { externalAlgorithmIssue } from '@/lib/kiln-studio-state'
import { algorithmTuningLabel, formatKilnReading, KILN_TASK_UNITS } from '@/lib/kiln-studio-format'

const props = defineProps<{
  open: boolean
  items: AlgorithmMetadata[]
  selected: string[]
  disabled: boolean
  taskLabel: string
  hasTaskMechanism: boolean
  defaults: ExperimentConfig
}>()
const emit = defineEmits<{
  close: []
  toggle: [key: string]
  updated: [item: AlgorithmMetadata]
}>()

const query = ref('')
const category = ref('')
const mine = ref(false)
const busy = ref(false)
const error = ref('')
const editor = ref(false)
const showImport = ref(false)
const form = ref({
  name: '', description: '', baseKey: 'ridge' as 'ridge' | 'boosting',
  parentKey: '', ridgeAlpha: 1, boostingRounds: 40, learningRate: .1,
})
const categories = computed(() => [...new Set(props.items.map(item => item.category))])
const visible = computed(() => {
  const value = query.value.trim().toLowerCase()
  return props.items.filter(item => (!mine.value || !!item.baseKey || !!item.external)
    && (!category.value || item.category === category.value)
    && [item.name, item.key, item.baseKey, item.category, item.oneLine, item.external?.fileName, algorithmTuningLabel(item.tuning)]
      .some(field => field?.toLowerCase().includes(value)))
})
const stateLabel = { enabled: '可加入', disabled: '已停用', experimental: '试验中' }

function availability(item: AlgorithmMetadata) {
  if (item.status !== 'enabled') return stateLabel[item.status]
  if (!props.hasTaskMechanism && (item.key === 'physics' || item.key === 'fusion')) return '需要启用当前任务关联的机理'
  return externalAlgorithmIssue(item, props.defaults)
}

function start(item?: AlgorithmMetadata) {
  form.value = {
    name: item ? item.name + ' · 新版本' : '',
    description: item?.oneLine ?? '',
    baseKey: item?.baseKey ?? 'ridge',
    parentKey: item?.key ?? '',
    ridgeAlpha: item?.tuning?.ridgeAlpha ?? props.defaults.ridgeAlpha,
    boostingRounds: item?.tuning?.boostingRounds ?? props.defaults.boostingRounds,
    learningRate: item?.tuning?.learningRate ?? props.defaults.learningRate,
  }
  error.value = ''
  editor.value = true
}

async function save() {
  if (busy.value || props.disabled || !form.value.name.trim()) return
  const value = form.value
  const tuning = value.baseKey === 'ridge'
    ? { ridgeAlpha: value.ridgeAlpha }
    : { boostingRounds: value.boostingRounds, learningRate: value.learningRate }
  busy.value = true
  error.value = ''
  try {
    const item = await studioPost<AlgorithmMetadata>('/algorithm-library/presets', {
      name: value.name.trim(), description: value.description.trim(), baseKey: value.baseKey,
      parentKey: value.parentKey || null, tuning,
    })
    emit('updated', item)
    editor.value = false
    mine.value = true
    query.value = ''
    category.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '算法方案保存失败'
  } finally {
    busy.value = false
  }
}

async function changeAvailability(item: AlgorithmMetadata) {
  if (busy.value || props.disabled) return
  busy.value = true
  error.value = ''
  try {
    const updated = await studioPost<AlgorithmMetadata>(`/algorithm-library/${encodeURIComponent(item.key)}/availability`, { enabled: item.status !== 'enabled' })
    emit('updated', updated)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '算法状态更新失败'
  } finally {
    busy.value = false
  }
}

watch(() => props.open, open => {
  if (open) {
    query.value = ''
    category.value = ''
    mine.value = false
    editor.value = false
    showImport.value = false
    error.value = ''
  }
})
</script>

<template>
  <AppDialog :open="open" wide title="算法库" :description="taskLabel + ' · 已加入 ' + selected.length + ' 个对比项'" @close="emit('close')">
    <p v-if="error" class="catalog-error" role="alert">{{ error }}</p>
    <KilnExternalAlgorithmImport v-if="showImport" :current="defaults" :disabled="disabled" :selected="selected"
      @back="showImport = false" @imported="emit('updated', $event)" @add="emit('toggle', $event)" />
    <form v-else-if="editor" class="algorithm-form" @submit.prevent="save">
      <h3>{{ form.parentKey ? '编辑算法方案' : '新建参数方案' }}</h3>
      <label>方案名称<input v-model.trim="form.name" required maxlength="120" /></label>
      <label>基础算法
        <select v-model="form.baseKey" :disabled="!!form.parentKey">
          <option value="ridge">时序岭回归</option>
          <option value="boosting">梯度提升回归树</option>
        </select>
      </label>
      <label v-if="form.baseKey === 'ridge'">岭回归 α<input v-model.number="form.ridgeAlpha" required type="number" min="0.001" max="10000" step="any" /></label>
      <div v-else class="form-columns">
        <label>提升树轮数<input v-model.number="form.boostingRounds" required type="number" min="5" max="120" step="1" /></label>
        <label>学习率<input v-model.number="form.learningRate" required type="number" min="0.01" max="0.5" step="any" /></label>
      </div>
      <label>说明<textarea v-model.trim="form.description" rows="3" maxlength="1500" /></label>
      <div class="catalog-actions">
        <button type="submit" class="catalog-button primary" :disabled="busy || disabled">{{ busy ? '保存中…' : form.parentKey ? '保存新版本' : '保存方案' }}</button>
        <button type="button" class="catalog-button" :disabled="busy" @click="editor = false; error = ''">取消</button>
      </div>
    </form>
    <template v-else>
      <div class="catalog-toolbar">
        <label class="catalog-search"><Search :size="15" /><input v-model="query" type="search" aria-label="搜索算法" placeholder="搜索名称、分类或参数" /></label>
        <select v-model="category" aria-label="算法分类"><option value="">全部分类</option><option v-for="item in categories" :key="item">{{ item }}</option></select>
        <button type="button" class="catalog-button" :disabled="disabled || busy" @click="start()"><Plus :size="14" />新建参数方案</button>
        <button type="button" class="catalog-button primary" :disabled="disabled || busy" @click="showImport = true; error = ''"><Upload :size="14" />导入外部模型</button>
      </div>
      <label class="mine-toggle"><input v-model="mine" type="checkbox" />只看我的方案</label>
      <div class="algorithm-list">
        <article v-for="item in visible" :key="item.key" class="catalog-item">
          <div class="catalog-item-head">
            <div>
              <h3>{{ item.name }}</h3>
              <p>{{ item.category }} · {{ item.external ? '版本 ' + item.version : item.baseKey ? '方案 ' + item.version : '内置 ' + item.version }}<span v-if="item.tuning"> · {{ algorithmTuningLabel(item.tuning) }}</span></p>
            </div>
            <button type="button" class="catalog-button" :aria-pressed="selected.includes(item.key)"
              :disabled="disabled || busy || (!selected.includes(item.key) && (!!availability(item) || selected.length >= 32))"
              @click="emit('toggle', item.key)">
              <Check v-if="selected.includes(item.key)" :size="14" />{{ selected.includes(item.key) ? '移出对比' : '加入对比' }}
            </button>
          </div>
          <p>{{ item.oneLine }}</p>
          <p v-if="item.external">{{ item.external.fileName }} · {{ item.external.horizonMinutes }} 分钟 · 已试跑 {{ formatKilnReading(item.external.probeOutput, KILN_TASK_UNITS[item.external.task]) }}</p>
          <p v-if="availability(item)" class="catalog-issue">{{ availability(item) }}</p>
          <div class="catalog-item-footer">
            <details v-if="item.dataRequirements.length">
              <summary>数据要求</summary>
              <p>{{ item.dataRequirements.join('；') }}</p>
            </details>
            <div v-if="item.baseKey || item.external" class="catalog-actions">
              <button v-if="item.baseKey" type="button" class="text-action" :disabled="disabled || busy" @click="start(item)">编辑方案</button>
              <button type="button" class="text-action" :disabled="disabled || busy" @click="changeAvailability(item)">{{ item.status === 'enabled' ? '停用' : '重新启用' }}</button>
            </div>
          </div>
        </article>
        <p v-if="!visible.length" class="catalog-empty">{{ mine && !query && !category ? '还没有方案，可新建一个算法方案。' : '没有找到匹配的算法。' }}</p>
      </div>
    </template>
    <template #footer><button type="button" class="catalog-button" :disabled="busy" @click="emit('close')">完成</button></template>
  </AppDialog>
</template>

<style scoped>
.catalog-toolbar,.catalog-actions,.catalog-item-head,.catalog-item-footer { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.catalog-toolbar select,.algorithm-form select,.algorithm-form input,.algorithm-form textarea,.catalog-search { border:1px solid var(--border); background:var(--background); color:var(--foreground); border-radius:6px; padding:8px 10px; }
.catalog-search { display:flex; align-items:center; gap:7px; flex:1 1 180px; min-width:0; }
.catalog-search:focus-within { outline:2px solid var(--ring); }
.catalog-search input { width:100%; min-width:0; outline:0; }
.catalog-button { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; border:1px solid var(--border); border-radius:6px; background:var(--card); padding:7px 10px; font-size:12px; cursor:pointer; }
.catalog-button.primary { background:#286e69; border-color:#286e69; color:white; }
.catalog-button[aria-pressed="true"] { border-color:#528e84; color:var(--foreground); }
.catalog-button:disabled,.text-action:disabled { opacity:.5; cursor:default; }
.mine-toggle { display:flex; align-items:center; gap:6px; margin:12px 0; font-size:12px; }
.algorithm-list,.algorithm-form { overflow:auto; max-height: min(54dvh, 440px); }
.algorithm-list { border-top:1px solid var(--border); }
.catalog-item { padding:12px 1px; border-bottom:1px solid var(--border); }
.catalog-item-head,.catalog-item-footer { justify-content:space-between; }
.catalog-item h3,.algorithm-form h3 { font-weight:650; overflow-wrap:anywhere; }
.catalog-item p,.catalog-item summary,.catalog-empty { margin-top:4px; font-size:12px; line-height:1.6; color:var(--muted-foreground); overflow-wrap:anywhere; }
.catalog-item summary,.text-action { cursor:pointer; }
.text-action { font-size:12px; text-decoration:underline; }
.catalog-item .catalog-issue,.catalog-error { color:var(--destructive); }
.catalog-error { margin-bottom:10px; font-size:12px; }
.algorithm-form,.algorithm-form label { display:grid; gap:7px; }
.algorithm-form { padding:2px 4px 4px; gap:12px; }
.algorithm-form label { font-size:12px; }
.form-columns { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.form-columns input { width:100%; min-width:0; }
</style>
