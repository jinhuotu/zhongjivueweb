<script setup lang="ts">
import { computed, ref } from 'vue'
import { Loader2, Plus, Upload, X } from 'lucide-vue-next'
import { uploadTemperatureRecord } from '@/lib/kiln-studio-api'
import type { Mapping, TemperatureRecordPreview, UploadedTemperatureRecord } from '@/lib/kiln-studio-api'

const props = defineProps<{ bundleId: string }>()
const emit = defineEmits<{ imported: [record: UploadedTemperatureRecord] }>()
const picker = ref<HTMLInputElement>()
const dialog = ref<HTMLDialogElement>()
const file = ref<File>()
const preview = ref<TemperatureRecordPreview>()
const mappings = ref<Mapping[]>([])
const standard = ref(false)
const acknowledged = ref(false)
const pending = ref(false)
const error = ref('')
const edited = computed(() => !!preview.value && (
  standard.value !== preview.value.useStandard || (!standard.value &&
    JSON.stringify(mappings.value) !== JSON.stringify(preview.value.mappings))
))
const validMapping = computed(() => standard.value || (
  mappings.value.some(item => item.field === 'ts') && mappings.value.length >= 2 &&
  mappings.value.every(item => item.column && item.field && item.scale > 0 && item.scale <= 1e6 &&
    Number.isFinite(item.offset) && Math.abs(item.offset) <= 10_000) &&
  new Set(mappings.value.map(item => item.column)).size === mappings.value.length &&
  new Set(mappings.value.map(item => item.field)).size === mappings.value.length
))
const dateText = (value: string | null) => value ? value.replace('T', ' ').slice(0, 16) : '—'

async function choose(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]
  input.value = ''
  if (!selected) return
  file.value = selected
  preview.value = undefined
  acknowledged.value = false
  error.value = ''
  if (!dialog.value?.open) dialog.value?.showModal()
  if (selected.size > 80_000_000) {
    error.value = '烧成记录超过 80 MB，请按窑次拆分。'
    return
  }
  pending.value = true
  try {
    const value = await uploadTemperatureRecord(props.bundleId, selected)
    preview.value = value
    mappings.value = value.mappings.map(item => ({ ...item }))
    standard.value = value.useStandard
  } catch (err) {
    error.value = err instanceof Error ? err.message : '预览烧成记录失败'
  } finally { pending.value = false }
}

async function confirm() {
  if (!file.value || !preview.value || !acknowledged.value || !validMapping.value || pending.value) return
  pending.value = true
  error.value = ''
  try {
    const record = await uploadTemperatureRecord(props.bundleId, file.value, {
      fileHash: preview.value.fileHash,
      useStandard: standard.value,
      mappings: standard.value ? [] : mappings.value,
      acknowledgeInputs: acknowledged.value,
    })
    emit('imported', record)
    dialog.value?.close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存烧成记录失败'
  } finally { pending.value = false }
}
</script>

<template>
  <button class="upload" type="button" @click="picker?.click()"><Upload :size="14" />上传记录</button>
  <input ref="picker" hidden type="file" accept=".csv,.xls,.xlsx" aria-label="选择烧成记录表格" @change="choose" />
  <Teleport to="body">
    <dialog ref="dialog" class="kiln-record-dialog" aria-label="上传烧成记录" @cancel="pending && $event.preventDefault()">
      <header>
        <div><h3>上传烧成记录</h3><p>{{ file?.name }}</p></div>
        <button type="button" class="icon" aria-label="关闭" :disabled="pending" @click="dialog?.close()"><X :size="18" /></button>
      </header>
      <p v-if="pending" class="progress" role="status"><Loader2 :size="16" class="animate-spin" />{{ preview ? '正在核验并保存…' : '正在解析表格…' }}</p>
      <fieldset v-if="preview" :disabled="pending">
        <div v-if="preview.stats && !edited" class="stats">
          <p>{{ dateText(preview.stats.from) }} 至 {{ dateText(preview.stats.to) }}</p>
          <p>{{ preview.stats.count.toLocaleString() }} 个有效采样点 · {{ preview.stats.measuredCount.toLocaleString() }} 个实测点 · {{ preview.stats.setpointCount.toLocaleString() }} 个设定点</p>
          <p v-if="preview.stats.skippedTimeRows || preview.stats.duplicateTimes">已跳过 {{ preview.stats.skippedTimeRows }} 行无效时间，合并 {{ preview.stats.duplicateTimes }} 行重复时间。</p>
        </div>
        <p v-else class="stats">{{ preview.rowCount.toLocaleString() }} 行原始数据 · 保存前将按当前映射核验时间与预测输入。</p>
        <p v-for="issue in edited ? [] : preview.issues" :key="issue" class="warning">{{ issue }}</p>
        <label v-if="preview.useStandard" class="check"><input v-model="standard" type="checkbox" />使用标准温度 / 压力表合并结果</label>
        <template v-if="!standard">
          <h4>字段映射</h4>
          <p>将时间、实测温度和设定温度映射到模型字段。自定义字段需来自同一张工作表。</p>
          <div v-for="(item, index) in mappings" :key="index" class="mapping">
            <label>原始列<select v-model="item.column">
              <option value="" disabled>选择原始列</option>
              <option v-for="column in preview.columns" :key="column.id" :value="column.id">{{ column.label }}{{ column.sample ? ' · ' + column.sample : '' }}</option>
            </select></label>
            <label>模型字段<select v-model="item.field">
              <option value="" disabled>选择字段</option>
              <option v-for="field in preview.fields" :key="field.key" :value="field.key">{{ field.label }}</option>
            </select></label>
            <label>倍率<input v-model.number="item.scale" type="number" step="any" :disabled="item.field === 'ts'" /></label>
            <label>偏移<input v-model.number="item.offset" type="number" step="any" :disabled="item.field === 'ts'" /></label>
            <button type="button" class="icon" :aria-label="'移除第 ' + (index + 1) + ' 条映射'" @click="mappings.splice(index, 1)"><X :size="16" /></button>
          </div>
          <button type="button" class="add" :disabled="mappings.length >= Math.min(preview.fields.length, preview.columns.length)" @click="mappings.push({ column: '', field: '', scale: 1, offset: 0 })"><Plus :size="14" />添加映射</button>
          <p v-if="!validMapping" class="warning">请选择时间和至少一个数值字段，列和字段各用一次。倍率需大于 0 且不超过 100 万，偏移范围为 ±10,000。</p>
        </template>
        <label class="check acknowledge"><input v-model="acknowledged" type="checkbox" />我已确认记录来自 {{ preview.kilnCode }}，温度按 ℃、流量按模型的标况口径。</label>
      </fieldset>
      <p v-if="error" class="warning" role="alert">{{ error }}</p>
      <footer>
        <button type="button" :disabled="pending" @click="picker?.click()">重新选文件</button>
        <button type="button" class="primary" :disabled="pending || !preview || !acknowledged || !validMapping || (!edited && !!preview.issues.length)" @click="confirm">保存并选用</button>
      </footer>
    </dialog>
  </Teleport>
</template>

<style scoped>
.upload, button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; border-radius: 6px; padding: .45rem .7rem; }
.upload { color: #9ee2dd; border: 1px solid #3a6871; background: #172e38; white-space: nowrap; font-size: .78rem; }
.kiln-record-dialog { position: fixed; inset: 0; margin: auto; width: min(720px, calc(100vw - 2rem)); max-height: 88vh; overflow: auto; color: #e4eff4; background: #13212b; border: 1px solid #3a5665; border-radius: 12px; padding: 1.2rem; font-size: .87rem; }
.kiln-record-dialog::backdrop { background: #060e16b8; }
header, footer, .progress, .check { display: flex; align-items: center; gap: .65rem; }
header { justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #344c5a; padding-bottom: .8rem; }
h3, h4 { margin: 0; color: #eff9ff; font-size: 1rem; }
p { margin: .4rem 0; color: #aac0cc; overflow-wrap: anywhere; }
fieldset { border: 0; padding: 0; min-width: 0; }
.stats { background: #1c303e; padding: .5rem .75rem; border-radius: 6px; margin: .8rem 0; }
.mapping { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.1fr) 4.25rem 4.25rem auto; align-items: end; gap: .45rem; margin: .55rem 0; }
.mapping label { display: grid; gap: .25rem; min-width: 0; color: #aac0cc; }
select, input[type="number"] { width: 100%; min-width: 0; padding: .42rem; border-radius: 5px; border: 1px solid #415d6b; background: #0f1c25; color: #e4eff4; }
button { border: 1px solid #415d6b; background: #1b2e3a; }
button:disabled { opacity: .5; }
button.icon { padding: .45rem; }
button.primary { background: #24675f; border-color: #45877f; }
.acknowledge { margin-top: .85rem; }
footer { justify-content: flex-end; margin-top: 1rem; }
.warning { color: #ffbf96; }
@media (max-width: 570px) {
  .mapping { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; }
  .mapping .icon { grid-column: 3; }
}
</style>
