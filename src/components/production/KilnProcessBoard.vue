<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { Activity, Flame, Wind, Gauge, Thermometer, Factory } from 'lucide-vue-next'
import { studioGet, type Dataset } from '@/lib/kiln-studio-api'
import { formatKilnNumber as fmt } from '@/lib/kiln-studio-format'
import KilnLinkedTrend from './KilnLinkedTrend.vue'
import kilnDrawing from '@/assets/scada/caryao.png'

type Frame = { time: number; values: Record<string, number> }
type Trace = [string, string]
type Channel = { label: string; unit: string; traces: Trace[] }
const props = defineProps<{ dataset: Dataset; initialCycle?: string }>()
const emit = defineEmits<{ mechanism: [key: string] }>()
const cycle = ref(''), frames = shallowRef<Frame[]>([]), total = ref(0), cursor = ref(0)
const busy = ref(false), error = ref(''), retry = ref(0)
const branch = ref('thermal'), zone = ref(0), selectedGroup = ref(0), playing = ref(false)
const nodes = [
  { key:'thermal', name:'窑炉温区', icon:Thermometer, mechanism:'thermal' },
  { key:'gas', name:'燃气回路', icon:Flame, mechanism:'energy' },
  { key:'air', name:'助燃风回路', icon:Wind, mechanism:'combustion' },
  { key:'exhaust', name:'窑压与烟气', icon:Gauge, mechanism:'combustion' },
]
const normal = computed(() => props.dataset.config.flowBasis === 'normal' ? 'Nm³' : 'm³')
const flow = computed(() => normal.value + '/h')
const fields = computed(() => new Set(frames.value.flatMap(f => Object.keys(f.values))))
const auxiliaries = [
  ['post7','后燃室七区'], ['post8','后燃室八区'], ['exchanger','换热器'], ['exhaust','排烟风'],
  ['air_inlet','助燃风入口'], ['roof_front','窑顶前'], ['roof_rear','窑顶后'],
] as const
const availableAux = computed(() => auxiliaries.filter(([key]) =>
  ['temp','sp','out'].some(s => fields.value.has(key + '_' + s))))
const auxKey = ref('')
const values = computed(() => frames.value[cursor.value]?.values ?? {})
function group(label: string, unit: string, ...traces: Trace[]): Channel { return { label, unit, traces } }
const groups = computed(() => {
  const rate = flow.value
  if (branch.value === 'aux') {
    const key = auxKey.value, name = auxiliaries.find(([k]) => k === key)?.[1] ?? ''
    return [group(name + '温度', '℃', [key+'_temp','实测'], [key+'_sp','设定']),
      ...(fields.value.has(key+'_out') ? [group(name+'风阀输出','%', [key+'_out','输出'])] : [])]
  }
  if (branch.value === 'gas' || branch.value === 'air') {
    const k = branch.value, label = k === 'gas' ? '燃气' : '助燃风'
    return [
      group(label + '压力', 'kPa', [k + '_p_meas','实测'], [k + '_p_sp','设定']),
      group(label + '瞬时流量', rate, [k,'流量']),
      group(label + '压力调节输出', '%', [k + '_p_out','输出']),
      group(label + '累计表读数', '表底原值', [k + '_total','累计量']),
      group('流量空燃比', 'Nm³/Nm³', ['afr','按流量计算']),
    ]
  }
  if (branch.value === 'exhaust') return [
    group('烟气氧含量', '%', ['o2','实测'], ['o2_sp','设定']),
    group('窑内压力', 'Pa', ['pressure','实测'], ['furnace_p_sp','设定']),
    group('窑压调节输出', '%', ['furnace_p_out','输出']),
  ]
  const prefix = 'z' + zone.value + '_'
  return [
    group(zone.value ? zone.value + ' 区温度' : '炉温', '℃', [zone.value ? prefix + 'temp' : 'temp','温度'], ['temp_sp','设定']),
    ...(zone.value ? [
      group('分区供气与助燃风', rate, [prefix + 'gas','燃气'], [prefix + 'air','助燃风']),
      group('分区风阀开度', '%', [prefix + 'air_valve','阀位']),
    ] : []),
  ]
})
const current = computed(() => groups.value[selectedGroup.value] ?? groups.value[0]!)
const times = computed(() => frames.value.map(f => f.time))
const clock = new Intl.DateTimeFormat('zh-CN', { timeZone:'Asia/Shanghai', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' })
const labels = computed(() => times.value.map(t => clock.format(t)))
const series = computed(() => current.value.traces.map(([key,name]) => ({ name, values:frames.value.map(f => f.values[key] ?? null) })))
const references = computed(() => [
  group('炉温与设定','℃',['temp','炉温'],['temp_sp','设定']),
  group('供气与助燃风',flow.value,['gas','燃气'],['air','助燃风']),
  group('燃气压力','kPa',['gas_p_meas','实测'],['gas_p_sp','设定']),
  group('助燃风压力','kPa',['air_p_meas','实测'],['air_p_sp','设定']),
  group('烟气氧含量','%',['o2','实测'],['o2_sp','设定']),
].filter(g => g.traces.some(([k]) => fields.value.has(k)) && g.traces[0]?.[0] !== current.value.traces[0]?.[0]))
const referenceLabel = ref('')
const reference = computed(() => references.value.find(g => g.label === referenceLabel.value) ?? references.value[0])
const referenceSeries = computed(() => reference.value?.traces.map(([key,name]) => ({
  name, values:frames.value.map(f => f.values[key] ?? null),
})) ?? [])
const gapBefore = ref<boolean[]>([])
const supplemented = ref(false)
function selectNode(key: string, n = 0) {
  branch.value = key; zone.value = n
  const available = groups.value.findIndex(g => g.traces.some(([k]) => fields.value.has(k)))
  selectedGroup.value = Math.max(0, available)
  emit('mechanism', nodes.find(item => item.key === key)?.mechanism ?? 'thermal')
}
let timer: ReturnType<typeof setInterval> | undefined
function pause() { clearInterval(timer); playing.value = false }
// 数据加载或切换窑次后自动播放；到末尾自动回到开头循环，演示时不会停住
function startPlayback() {
  clearInterval(timer)
  if (cursor.value >= frames.value.length - 1) cursor.value = 0
  playing.value = true
  timer = setInterval(() => {
    cursor.value++
    if (cursor.value >= frames.value.length - 1) cursor.value = 0
  }, 400)
}
// 拖动进度条只改变游标位置，不中断正在进行的播放
function seek(i: number) { cursor.value = i }
onBeforeUnmount(pause)
watch([() => props.dataset.id, () => props.initialCycle], () => {
  cycle.value = props.dataset.summary.find(s => s.fileId === props.initialCycle)?.fileId ?? props.dataset.summary[0]?.fileId ?? ''
}, { immediate:true })
watch([() => props.dataset.id, cycle, retry], async ([id, file], _, cleanup) => {
  let stale = false
  cleanup(() => { stale = true })
  pause(); frames.value = []; total.value = 0; cursor.value = 0; error.value = ''
  busy.value = !!file
  if (!file) return
  try {
    const data = await studioGet<{ frames: Frame[]; rowCount:number; gapBefore:boolean[]; sourceSupplement?:boolean }>(`/datasets/${id}/process-observations?cycle_id=${encodeURIComponent(file)}`)
    if (!stale) {
      frames.value = data.frames; total.value = data.rowCount; gapBefore.value = data.gapBefore
      supplemented.value = !!data.sourceSupplement
      if (branch.value === 'aux' && !availableAux.value.some(([k]) => k === auxKey.value)) branch.value = 'thermal'
      const candidate = groups.value.findIndex(g => g.traces.some(([k]) => fields.value.has(k)))
      selectedGroup.value = Math.max(candidate,0)
      startPlayback()
    }
  } catch (err) { if (!stale) error.value = err instanceof Error ? err.message : '读取窑次失败' }
  finally { if (!stale) busy.value = false }
}, { immediate:true })
function heat(n: number) {
  const t = values.value['z' + n + '_temp']
  return t == null ? 0 : Math.max(.04, Math.min(.9, t / 1500))
}
</script>
<template>
  <section class="board">
    <header><div><small><Activity :size="14" />{{ dataset.sourceKind === 'synthetic' ? '合成工况回放' : '历史工况回放' }}</small><h2>烧成工艺联动图</h2></div>
      <label>窑次 <select v-model="cycle"><option v-for="s in dataset.summary" :key="s.fileId" :value="s.fileId">{{ s.file }}</option></select></label></header>
    <p v-if="busy" role="status">正在载入窑次记录…</p>
    <p v-else-if="error" role="alert">{{ error }} <button @click="retry++">重试</button></p>
    <template v-else-if="frames.length">
      <div class="kpis">
        <button v-for="(n,i) in nodes" :key="n.key" :aria-pressed="branch === n.key" @click="selectNode(n.key)">
          <span><component :is="n.icon" :size="15"/>{{ n.name }}</span>
          <strong>{{ fmt(values[['temp','gas','air','o2'][i]!]) }}</strong>
          <small>{{ ['炉温 · ℃','瞬时 · '+flow,'瞬时 · '+flow,'氧含量 · %'][i] }}</small>
        </button>
      </div>
      <div class="plant" :class="{ playing }">
        <div class="plant-head"><b><Factory :size="14"/>{{ dataset.config.kilnCode }}</b><span>{{ dataset.config.zoneCount }} 温区 · <template v-if="dataset.config.burnerCount">{{ dataset.config.burnerCount }} 烧嘴 · </template>工艺示意</span></div>
        <div class="feed gas" :class="{ active:branch === 'gas', flowing:(values.gas ?? 0)>0 }">
          <button @click="selectNode('gas')"><Flame :size="14"/>燃气 <b>{{ fmt(values.gas_p_meas) }}</b> kPa</button><i/><span>供气总管</span>
        </div>
        <div class="feed air" :class="{ active:branch === 'air', flowing:(values.air ?? 0)>0 }">
          <button @click="selectNode('air')"><Wind :size="14"/>助燃风 <b>{{ fmt(values.air_p_meas) }}</b> kPa</button><i/><span>助燃风总管</span>
        </div>
        <div class="drawing">
          <img :src="kilnDrawing" alt="燃气调压、助燃风机与窑体的工艺示意图"/>
          <svg viewBox="0 0 600 310" preserveAspectRatio="none" aria-hidden="true">
            <path v-if="(values.gas ?? 0)>0" class="gas-trace" d="M112 68 H247 V48 H549 M247 68 V262 H549"/>
            <path v-if="(values.air ?? 0)>0" class="air-trace" d="M117 119 H148 Q157 119 157 128 V137 M210 117 H242 V50 H545 M242 117 V263 H545"/>
          </svg>
          <button class="pin gas-pin" :aria-pressed="branch==='gas'" @click="selectNode('gas')">燃气 <b>{{ fmt(values.gas) }}</b> {{ flow }}</button>
          <button class="pin air-pin" :aria-pressed="branch==='air'" @click="selectNode('air')">助燃风 <b>{{ fmt(values.air) }}</b> {{ flow }}</button>
          <button class="pin temp-pin" :aria-pressed="branch==='thermal'" @click="selectNode('thermal')">炉温 <b>{{ fmt(values.temp,1) }}</b> ℃</button>
        </div>
        <div class="shell">
          <div class="chambers"><button v-for="n in dataset.config.zoneCount" :key="n" :style="{ '--heat':heat(n) }" :aria-pressed="branch==='thermal' && zone===n" @click="selectNode('thermal',n)">
            <span>{{ n }} 区</span><strong>{{ fmt(values['z'+n+'_temp'],1) }}</strong><small>℃</small></button></div>
          <div class="hearth"><i/><span>窑车</span><i/></div>
        </div>
        <button class="flue" @click="selectNode('exhaust')"><Gauge :size="13"/>窑压 {{ fmt(values.pressure) }} Pa <span>烟气 O₂ {{ fmt(values.o2) }} %</span></button>
        <div v-if="availableAux.length" class="aux"><button v-for="[k,label] in availableAux" :key="k" :aria-pressed="branch==='aux' && auxKey===k" @click="auxKey=k; selectNode('aux')">
          {{ label }} <b>{{ fmt(values[k+'_temp'],1) }}</b> ℃</button></div>
      </div>
      <div class="timeline">
        <input type="range" aria-label="烧成回放时刻" :value="cursor" min="0" :max="frames.length-1" @input="seek(Number(($event.target as HTMLInputElement).value))"/>
        <time>{{ labels[cursor] }} 北京时间</time></div>
      <div class="channels"><button v-for="(g,i) in groups" :key="g.label" :aria-pressed="selectedGroup===i" @click="selectedGroup=i">{{ g.label }} <b>{{ fmt(values[g.traces[0]![0]]) }}</b></button></div>
      <div class="plots" :class="{paired: reference}">
        <div><h3>{{ current.label }}</h3><KilnLinkedTrend :times="times" :labels="labels" :series="series" :cursor="cursor" :unit="current.unit" :gap-before="gapBefore" @seek="seek"/></div>
        <div v-if="reference"><label>同步对照 <select :value="reference.label" @change="referenceLabel=($event.target as HTMLSelectElement).value"><option v-for="r in references" :key="r.label">{{ r.label }}</option></select></label>
          <KilnLinkedTrend :times="times" :labels="labels" :series="referenceSeries" :cursor="cursor" :unit="reference.unit" :gap-before="gapBefore" @seek="seek"/></div>
      </div>
      <footer><span>{{ current.label }} · {{ frames.length }} / {{ total }} 个归档时刻<span v-if="supplemented"> · 附加测点取自同一原表</span></span><span>— 表示缺测</span></footer>
    </template><p v-else>当前数据版本暂无窑次读数。</p>
  </section>
</template>
<style scoped>
.board { container-type:inline-size; min-width:0; color:#d7e7f4; padding:clamp(12px,2vw,22px); border-radius:12px; background:linear-gradient(150deg,#112a3e,#091926 72%); border:1px solid #36546b; box-shadow:0 5px 20px #11263820; }
header,.plant-head,.timeline,footer,.feed,.flue { display:flex; align-items:center; gap:10px; }
header,.plant-head,footer { justify-content:space-between; flex-wrap:wrap; }
header small,.kpis span,.plant-head b,.feed button,.timeline button { display:flex; align-items:center; gap:6px; }
header small { color:#75d7d5; font-size:11px; }h2 { font-size:21px; font-weight:650; margin-top:4px; letter-spacing:.04em; }
header label,footer,.plant-head span,.feed span { font-size:10px; color:#aac0d1; }select { max-width:min(250px,60cqw); background:#142f42; border:1px solid #42647c; padding:6px; border-radius:5px; color:#e3f2ff; }
.kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:15px 0; }
.kpis button { text-align:left; padding:9px 11px; border:1px solid #355469; border-radius:7px; background:#142e41; }
.kpis button[aria-pressed=true],.channels button[aria-pressed=true] { border-color:#4bd0c7; color:#a9ffee; background:#173d48; }
.kpis span { font-size:11px; color:#b5d5e4; }.kpis strong { font:600 clamp(15px,3cqw,27px) ui-monospace,monospace; display:block; margin:6px 0 0; }.kpis small { font-size:10px; color:#9bb7c6; }
.plant { border:1px solid #315269; border-radius:8px; padding:14px; background-color:#0c202e; background-image:linear-gradient(#37586c28 1px,transparent 1px),linear-gradient(90deg,#37586c28 1px,transparent 1px); background-size:21px 21px; }
.plant-head { margin-bottom:14px; }.plant-head b { font-size:12px; color:#a9c9dc; }.feed { --line:#eca659; gap:0; margin:5px 0; color:var(--line); }.feed.air { --line:#57cfdb; }
.feed button { border:1px solid #42586a; background:#102636; border-radius:5px; padding:5px 7px; font-size:10px; }.feed.active button { border-color:var(--line); }
.feed i { display:block; flex:1; height:6px; margin-right:5px; border:1px solid #587280; border-radius:8px; background:linear-gradient(#9bafbb,#425361); overflow:hidden; }
.feed.flowing i::after { content:''; display:block; height:100%; background:repeating-linear-gradient(100deg,transparent 0 17px,var(--line) 18px 24px,transparent 25px 32px); }
.playing .feed.flowing i::after { animation:flow .8s linear infinite; }@keyframes flow { to { background-position:32px 0; } }
.shell { margin:18px 4% 8px; padding:7px 9px 0; border:3px solid #7995a5; border-radius:13px 13px 6px 6px; background:linear-gradient(#395264,#152d3c); box-shadow:inset 0 2px 0 #c3d6dc66,0 6px 12px #030c174d; }
.chambers { display:grid; grid-template-columns:repeat(auto-fit,minmax(58px,1fr)); gap:3px; }
.chambers button { position:relative; min-height:66px; padding:6px 1px; border:1px solid #506170; border-radius:7px 7px 2px 2px; background:linear-gradient(to top,rgba(242,124,45,var(--heat)),transparent 95%),#152e3b; }
.chambers button::before { content:''; display:block; position:absolute; height:10px; width:6px; border:1px solid #8aa2b1; background:#536978; top:-12px; left:48%; }.chambers button[aria-pressed=true] { outline:2px solid #75e4dc; z-index:1; }
.chambers span,.chambers small { display:block; color:#d4dfe4; font-size:10px; }.chambers strong { font:600 15px ui-monospace,monospace; }
.hearth { height:12px; display:flex; align-items:center; justify-content:space-around; color:#b8c9d3; font-size:8px; }.hearth i {width:8px; height:8px; border-radius:50%; background:#253845; border:2px solid #9fb4c1;}
.flue { margin-left:auto; color:#b5cbd9; font-size:10px; padding:5px 8px; border:1px solid #3f6175; border-radius:4px; background:#112d3e; }.flue span { color:#8bd7c8; }
.timeline { flex-wrap:wrap; margin:14px 0; }.timeline input { flex:1; min-width:65px; accent-color:#49cbbd; }.timeline button,.channels button { padding:5px 9px; border:1px solid #426373; border-radius:5px; background:#183344; font-size:11px; }.timeline time { font:11px ui-monospace,monospace; color:#b2d7df; }
.channels { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }footer { margin-top:8px; }button { cursor:pointer; }.board p { padding:16px 0; }@container(max-width:550px) { .kpis { grid-template-columns:repeat(2,1fr); }.plant { padding:9px; }.chambers { grid-template-columns:repeat(3,minmax(0,1fr)); row-gap:11px; } }
@media(prefers-reduced-motion:reduce) { .playing .feed.flowing i::after { animation:none; } }
.drawing { position:relative; width:min(100%,720px); margin:9px auto 0; aspect-ratio:600/310; isolation:isolate; }
.drawing img,.drawing svg { position:absolute; width:100%; height:100%; inset:0; }.drawing svg { pointer-events:none; }
.drawing path { fill:none; stroke-width:2; stroke-dasharray:5 14; opacity:.8; }.gas-trace { stroke:#ffd483; }.air-trace { stroke:#62eafa; }
.playing .drawing path { animation:transport 1.2s linear infinite; }@keyframes transport { to { stroke-dashoffset:-38; } }
.pin { position:absolute; border:1px solid #558898; padding:4px 7px; border-radius:5px; color:#d3e6f2; background:#0c2338ed; font-size:clamp(9px,1.8cqw,12px); }
.pin[aria-pressed=true] { border-color:#5be4ca; }.pin b { color:#fff; }.gas-pin { top:5%; left:3%; }.air-pin { left:3%; bottom:22%; }.temp-pin { top:46%; left:55%; }
.aux { display:flex; flex-wrap:wrap; gap:5px; border-top:1px dashed #365264; padding-top:8px; margin-top:6px; }.aux button { color:#b2c9da; font-size:10px; border:1px solid #38566c; border-radius:4px; padding:4px 6px; }.aux button[aria-pressed=true] { color:#91efda; border-color:#52afa8; }.aux b,.channels b { font-variant-numeric:tabular-nums; }
.plots { display:grid; gap:9px; }.plots>div { min-width:0; }.plots h3,.plots label { display:flex; align-items:center; height:32px; gap:8px; font-size:12px; }.plots select { padding:2px 5px; }
@container(min-width:720px) { .plots.paired { grid-template-columns:1fr 1fr; } }
@media(prefers-reduced-motion:reduce) { .playing .drawing path { animation:none; } }
</style>

