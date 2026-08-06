import { onUnmounted, ref, watch } from 'vue'
import {
  ackProdAlarm,
  fetchProdSeries,
  fetchProdSnapshot,
  issueProdCommand,
  listProdAlarms,
  listProdCommands,
  type ProdAlarm,
  type ProdCommand,
  type ProdSnapshot,
  type ProdSystemCode,
} from '@/lib/production-api'

export function useProductionScada(systemCode: ProdSystemCode, seriesTags: string[]) {
  const snap = ref<ProdSnapshot | null>(null)
  const alarms = ref<ProdAlarm[]>([])
  const commands = ref<ProdCommand[]>([])
  const chart = ref<Array<Record<string, number | string>>>([])
  const seriesTag = ref(seriesTags[0] || '')
  const loading = ref(true)
  const error = ref<string | null>(null)
  const toast = ref<string | null>(null)
  let toastTimer: number | undefined

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const [s, a, c] = await Promise.all([
        fetchProdSnapshot(systemCode),
        listProdAlarms(systemCode),
        listProdCommands(systemCode),
      ])
      snap.value = s
      alarms.value = a
      commands.value = c
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  async function loadSeries() {
    if (!seriesTag.value) return
    try {
      const data = await fetchProdSeries(systemCode, [seriesTag.value], 24)
      chart.value = (data.series[seriesTag.value] || [])
        .map((p) => {
          const v = typeof p.value === 'number' ? p.value : Number(p.value)
          return {
            name: (p.ts || '').slice(11, 16),
            v: Number.isNaN(v) ? 0 : v,
          }
        })
        .filter((p) => p.name)
    } catch {
      chart.value = []
    }
  }

  async function send(tagCode: string, targetValue: number) {
    const item = await issueProdCommand(systemCode, {
      tagCode,
      targetValue,
      executor: 'simulate',
    })
    toast.value = item.resultMsg || '已模拟下发'
    if (toastTimer) window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toast.value = null
    }, 3200)
    await refresh()
    await loadSeries()
    return item
  }

  async function ack(id: string) {
    await ackProdAlarm(id)
    alarms.value = alarms.value.map((a) => (a.id === id ? { ...a, status: 'acked' } : a))
  }

  void refresh()
  void loadSeries()

  watch(seriesTag, () => {
    void loadSeries()
  })

  onUnmounted(() => {
    if (toastTimer) window.clearTimeout(toastTimer)
  })

  return {
    snap,
    values: () => snap.value?.values || {},
    tags: () => snap.value?.tags || [],
    alarms,
    commands,
    chart,
    seriesTag,
    seriesTags,
    loading,
    error,
    toast,
    refresh,
    loadSeries,
    send,
    ack,
  }
}
