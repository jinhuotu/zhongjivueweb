<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { studioGet, type StudioFile } from '@/lib/kiln-studio-api'
import KilnLinkedTrend from './KilnLinkedTrend.vue'
type Sheet = { name: string; columns: string[]; count: number; rowNumbers: number[]; rows: (number|string|null)[][] }
const props = defineProps<{ projectId: string; file: StudioFile }>()
const sheets = shallowRef<Sheet[]>([])
const active = ref(0), column = ref(0), cursor = ref(0), retry = ref(0)
const loading = ref(false), error = ref('')
const sheet = computed(() => sheets.value[active.value])
function number(value: unknown) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null
  const n = Number(value)
  return Number.isFinite(n) && n !== -9999 ? n : null
}
const numeric = computed(() => sheet.value?.columns.flatMap((name, i) =>
  sheet.value!.rows.some(row => number(row[i]) != null) ? [{ name: name || '列 ' + (i + 1), i }] : []) ?? [])
const timeIndex = (s?: Sheet) => s?.columns.findIndex(name => /时间|timestamp|datetime/i.test(name)) ?? -1
watch(sheet, (next, prev) => {
  const timestamp = prev?.rows[cursor.value]?.[timeIndex(prev)]
  column.value = numeric.value[0]?.i ?? 0
  const index = timestamp == null ? -1 : next?.rows.findIndex(row => row[timeIndex(next)] === timestamp)
  cursor.value = Math.max(0, index ?? 0)
}, { flush:'sync' })
watch([() => props.projectId, () => props.file.id, retry], async (_, __, cleanup) => {
  let stale = false
  cleanup(() => { stale = true })
  error.value = ''; loading.value = true; sheets.value = []; active.value = 0
  try {
    const result = await studioGet<Sheet[]>(`/projects/${props.projectId}/files/${props.file.id}/preview`)
    if (!stale) sheets.value = result
  } catch (err) {
    if (!stale) error.value = err instanceof Error ? err.message : '读取工作表失败'
  } finally { if (!stale) loading.value = false }
}, { immediate: true })
const series = computed(() => sheet.value && numeric.value.length ? [{
  name: sheet.value.columns[column.value] || '原始读数', values: sheet.value.rows.map(row => number(row[column.value])),
}] : [])
const labels = computed(() => sheet.value?.rowNumbers.map((n,i) => String(sheet.value?.rows[i]?.[timeIndex(sheet.value)] ?? ('第 ' + n + ' 行'))) ?? [])
</script>
<template>
  <section class="source-signals">
    <p v-if="loading">正在读取工作表…</p>
    <p v-else-if="error" role="alert">{{ error }} <button @click="retry++">重试</button></p>
    <template v-else-if="sheet">
      <nav aria-label="原始工作表"><button v-for="(s,i) in sheets" :key="i" :aria-pressed="active === i" @click="active = i">{{ s.name }}</button></nav>
      <div class="tools"><strong>原始测点趋势</strong><select v-if="numeric.length" v-model.number="column" aria-label="选择原始测点"><option v-for="c in numeric" :key="c.i" :value="c.i">{{ c.name }}</option></select></div>
      <KilnLinkedTrend v-if="series.length" :times="sheet.rowNumbers" :labels="labels" :series="series" :cursor="cursor" @seek="cursor = $event" />
      <label v-if="sheet.rows.length" class="scrub">{{ labels[cursor] }} · 第 {{ sheet.rowNumbers[cursor] }} 行<input v-model.number="cursor" aria-label="原表记录位置" type="range" min="0" :max="sheet.rows.length - 1" /><span>抽览 {{ sheet.rows.length }} / {{ sheet.count }} 条</span></label>
      <div class="readings"><div v-for="(c,i) in sheet.columns" :key="i" :class="{active:i === column}"><button :disabled="!numeric.some(n => n.i === i)" @click="column = i">{{ c || '列 ' + (i + 1) }}</button><b>{{ sheet.rows[cursor]?.[i] ?? '—' }}</b></div></div>
    </template>
  </section>
</template>
<style scoped>
.source-signals { min-width:0; font-size:12px; }nav,.tools,.scrub { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:12px 0; }
nav button,select { padding:6px 12px; border:1px solid var(--border); border-radius:6px; background:var(--card); }
nav button[aria-pressed=true] { background:#12567b; color:white; }.tools { justify-content:space-between; }select { max-width:100%; }
.scrub input { flex:1; min-width:80px; accent-color:#167fa7; }.scrub span { color:var(--muted-foreground); }
.readings { display:grid; grid-template-columns:repeat(auto-fit,minmax(145px,1fr)); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
.readings div { background:var(--card); padding:9px; }.readings .active { background:color-mix(in srgb,#2996b8 12%,var(--card)); }
.readings button { display:block; font-size:11px; text-align:left; }.readings b { display:block; margin-top:5px; font-variant-numeric:tabular-nums; }
</style>

