<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { PageHeader } from '@/components/ui-kit'
import ScadaChrome from './ScadaChrome.vue'
import ScadaSidePanels from './ScadaSidePanels.vue'
import TunnelScada from './TunnelScada.vue'
import BatchingScada from './BatchingScada.vue'
import ShuttleScada from './ShuttleScada.vue'
import {
  PRODUCTION_SYSTEMS,
  type ProductionSystemKey,
} from '@/lib/production-systems'
import { useProductionScada } from '@/composables/useProductionScada'

const props = defineProps<{
  system: ProductionSystemKey
}>()

function formatClock() {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} 星期${week}`
}

const meta = computed(() => PRODUCTION_SYSTEMS[props.system])

const {
  snap,
  alarms,
  commands,
  chart,
  seriesTag,
  loading,
  error,
  toast,
  refresh,
  loadSeries,
  send,
  ack,
} = useProductionScada(meta.value.code, meta.value.seriesTags)

const ctrlTag = ref('')
const ctrlValue = ref('')
const sending = ref(false)
const now = ref(formatClock())

const values = computed(() => snap.value?.values || {})
const tags = computed(() => snap.value?.tags || [])
const writable = computed(() => tags.value.filter((t) => t.writable))

watch(
  writable,
  (list) => {
    if (!ctrlTag.value && list[0]) ctrlTag.value = list[0].tagCode
  },
  { immediate: true },
)

watch(
  () => props.system,
  () => {
    ctrlTag.value = ''
    ctrlValue.value = ''
  },
)

let clockTimer: number | undefined
onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = formatClock()
  }, 1000)
})
onUnmounted(() => {
  if (clockTimer) window.clearInterval(clockTimer)
})

async function onSend() {
  const v = Number(ctrlValue.value)
  if (!ctrlTag.value || Number.isNaN(v)) {
    toast.value = '请填写有效目标值'
    return
  }
  sending.value = true
  try {
    await send(ctrlTag.value, v)
    ctrlValue.value = ''
  } catch (e) {
    toast.value = e instanceof Error ? e.message : '下发失败'
  } finally {
    sending.value = false
  }
}

function onRefresh() {
  void refresh()
  void loadSeries()
}
</script>

<template>
  <div class="space-y-4">
    <PageHeader :title="meta.title" :description="meta.description">
      <template v-if="toast" #actions>
        <span class="text-[12px] text-patina font-mono">{{ toast }}</span>
      </template>
    </PageHeader>

    <div
      v-if="error"
      class="flex items-center gap-2 rounded-lg border border-iron/40 bg-iron/10 px-3 py-2 text-[12px] text-iron"
    >
      <AlertTriangle class="size-4 shrink-0" />
      {{ error }}
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
      <ScadaChrome
        :title="meta.scadaTitle"
        :clock="now"
        :loading="loading"
        @refresh="onRefresh"
      >
        <TunnelScada v-if="system === 'tunnel'" :values="values" />
        <BatchingScada v-else-if="system === 'batching'" :values="values" />
        <ShuttleScada v-else :values="values" />
      </ScadaChrome>

      <ScadaSidePanels
        :series-tags="meta.seriesTags"
        v-model:series-tag="seriesTag"
        :chart="chart"
        :writable="writable"
        v-model:ctrl-tag="ctrlTag"
        v-model:ctrl-value="ctrlValue"
        :sending="sending"
        :alarms="alarms"
        :commands="commands"
        @send="onSend"
        @ack="(id) => void ack(id)"
      />
    </div>
  </div>
</template>
