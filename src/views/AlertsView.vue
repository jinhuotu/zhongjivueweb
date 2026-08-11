<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Bell,
  CircleCheck,
  Clock,
  Filter,
  LoaderCircle,
  Settings,
  TriangleAlert,
} from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import {
  ackAlert,
  closeAlert,
  fetchAlertRules,
  fetchAlerts,
  type AlertItem,
  type AlertRuleItem,
  type AlertSummary,
} from '@/lib/alerts-api'

const sevTone: Record<string, 'iron' | 'sulfur' | 'coolant'> = {
  high: 'iron',
  medium: 'sulfur',
  low: 'coolant',
}

const sevLabel: Record<string, string> = {
  high: '严重',
  medium: '中等',
  low: '轻微',
}

const statusLabel: Record<string, string> = {
  active: '未处置',
  ack: '已确认',
  closed: '已关闭',
}

const loading = ref(true)
const error = ref('')
const alerts = ref<AlertItem[]>([])
const rules = ref<AlertRuleItem[]>([])
const summary = ref<AlertSummary | null>(null)
const actingId = ref<string | null>(null)

const activeCount = computed(
  () => summary.value?.activeCount ?? alerts.value.filter((a) => a.status === 'active').length,
)
const ackCount = computed(
  () => summary.value?.ackCount ?? alerts.value.filter((a) => a.status === 'ack').length,
)

const typeDist = computed(() => summary.value?.typeDist ?? [])
const typeMax = computed(() => Math.max(1, ...typeDist.value.map((c) => c.value || 0)))

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const [list, ruleItems] = await Promise.all([
      fetchAlerts({ limit: 50 }),
      fetchAlertRules(),
    ])
    alerts.value = list.items || []
    summary.value = list.summary
    rules.value = ruleItems
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载告警失败'
  } finally {
    loading.value = false
  }
}

async function onAck(a: AlertItem) {
  if (a.status !== 'active') return
  actingId.value = a.id
  try {
    const item = await ackAlert(a.id)
    const idx = alerts.value.findIndex((x) => x.id === a.id)
    if (idx >= 0) alerts.value[idx] = item
    await reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '处置失败'
  } finally {
    actingId.value = null
  }
}

async function onClose(a: AlertItem) {
  actingId.value = a.id
  try {
    await closeAlert(a.id)
    await reload()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '关闭失败'
  } finally {
    actingId.value = null
  }
}

onMounted(reload)
</script>

<template>
  <PageHeader
    title="告警中心"
    description="聚合生产侧报警与规则配置，覆盖能耗 / 碳排 / 设备 / 工艺等类型。支持确认与关闭。"
  >
    <template #badges>
      <Tag tone="iron">未处置 {{ activeCount }}</Tag>
      <Tag tone="sulfur">已确认 {{ ackCount }}</Tag>
    </template>
    <template #actions>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
        :disabled="loading"
        @click="reload"
      >
        <Filter class="size-3.5" />刷新
      </button>
      <a
        href="#alert-rules"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
      >
        <Settings class="size-3.5" />规则配置
      </a>
    </template>
  </PageHeader>

  <p v-if="error" class="mb-4 text-xs text-iron">{{ error }}</p>
  <div v-if="loading" class="mb-4 text-xs text-muted-foreground inline-flex items-center gap-1.5">
    <LoaderCircle class="size-3.5 animate-spin" />加载中…
  </div>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard
      label="本月触发"
      :value="String(summary?.monthlyTriggered ?? 0)"
      unit="次"
      tone="iron"
    >
      <template #icon><Bell class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="严重告警"
      :value="String(summary?.highCount ?? 0)"
      unit="次"
      tone="iron"
    >
      <template #icon><TriangleAlert class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="平均响应"
      :value="String(summary?.avgResponseMinutes ?? 0)"
      unit="分钟"
      tone="patina"
    >
      <template #icon><Clock class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="MTTR"
      :value="String(summary?.mttrMinutes ?? 0)"
      unit="分钟"
      tone="molybdenum"
      hint="平均修复时长"
    />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-5">
    <Panel title="告警类型分布" class-name="lg:col-span-1">
      <div v-if="!typeDist.length" class="text-xs text-muted-foreground">暂无数据</div>
      <div v-else class="space-y-3 text-xs">
        <div v-for="c in typeDist" :key="c.name">
          <div class="flex justify-between mb-1">
            <span>{{ c.name }}</span>
            <span class="data-num text-muted-foreground">{{ c.value }}</span>
          </div>
          <div class="h-1.5 rounded-full bg-background overflow-hidden">
            <div
              class="h-full"
              :style="{
                width: `${(c.value / typeMax) * 100}%`,
                background: c.color || '#4A9EFF',
              }"
            />
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="告警工单" subtitle="近 50 条（来自生产报警）" class-name="lg:col-span-3" flush>
      <div class="overflow-x-auto">
        <table class="w-full text-xs min-w-[900px]">
          <thead class="text-muted-foreground bg-background/40">
            <tr class="border-b border-border">
              <th
                v-for="h in [
                  '告警 ID',
                  '严重度',
                  '关联设备',
                  '描述',
                  '触发规则',
                  '触发时间',
                  '处置人',
                  '状态',
                  '操作',
                ]"
                :key="h"
                class="text-left font-medium px-4 py-2.5"
              >
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-if="!alerts.length">
              <td colspan="9" class="px-4 py-8 text-center text-muted-foreground">
                暂无报警。请先执行
                <code class="mx-1">poetry run python scripts/seed_production_scada.py</code>
                或在生产侧产生报警。
              </td>
            </tr>
            <tr v-for="a in alerts" :key="a.id" class="hover:bg-background/40">
              <td class="px-4 py-3 data-num text-muted-foreground">{{ a.id }}</td>
              <td class="px-4 py-3">
                <Tag :tone="sevTone[a.severity]">
                  <TriangleAlert class="size-2.5 mr-0.5 inline" />
                  {{ sevLabel[a.severity] }}
                </Tag>
              </td>
              <td class="px-4 py-3 font-medium">{{ a.target }}</td>
              <td class="px-4 py-3 text-foreground/85 max-w-[280px] truncate" :title="a.title">
                {{ a.title }}
              </td>
              <td class="px-4 py-3 data-num text-muted-foreground">{{ a.rule }}</td>
              <td class="px-4 py-3 data-num text-muted-foreground">{{ a.occurred }}</td>
              <td class="px-4 py-3">{{ a.owner }}</td>
              <td class="px-4 py-3">
                <span
                  v-if="a.status === 'active'"
                  class="inline-flex items-center gap-1 text-iron"
                >
                  <TriangleAlert class="size-3" />{{ statusLabel[a.status] }}
                </span>
                <span
                  v-else-if="a.status === 'ack'"
                  class="inline-flex items-center gap-1 text-sulfur"
                >
                  <Clock class="size-3" />{{ statusLabel[a.status] }}
                </span>
                <span v-else class="inline-flex items-center gap-1 text-patina">
                  <CircleCheck class="size-3" />{{ statusLabel[a.status] }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button
                  type="button"
                  class="text-iron hover:underline disabled:opacity-40"
                  :disabled="a.status !== 'active' || actingId === a.id"
                  @click="onAck(a)"
                >
                  处置
                </button>
                <span class="text-border mx-1.5">|</span>
                <button
                  type="button"
                  class="text-muted-foreground hover:text-foreground disabled:opacity-40"
                  :disabled="a.status === 'closed' || actingId === a.id"
                  :title="a.message || a.title"
                  @click="onClose(a)"
                >
                  关闭
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </div>

  <Panel id="alert-rules" title="告警规则配置" subtitle="平台规则台账（可扩展对接通知渠道）" flush>
    <div class="overflow-x-auto">
      <table class="w-full text-xs min-w-[800px]">
        <thead class="text-muted-foreground bg-background/40">
          <tr class="border-b border-border">
            <th
              v-for="h in [
                '规则名称',
                '类型',
                '表达式',
                '阈值',
                '通知渠道',
                '生效设备',
                '状态',
              ]"
              :key="h"
              class="text-left font-medium px-4 py-2.5"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="r in rules" :key="r.id" class="hover:bg-background/40">
            <td class="px-4 py-3 font-medium">{{ r.name }}</td>
            <td class="px-4 py-3"><Tag tone="molybdenum">{{ r.type }}</Tag></td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.expression }}</td>
            <td class="px-4 py-3 data-num text-iron">{{ r.threshold }}</td>
            <td class="px-4 py-3 text-foreground/80">{{ r.channels }}</td>
            <td class="px-4 py-3 text-foreground/80">{{ r.devices }}</td>
            <td class="px-4 py-3">
              <span
                :class="
                  r.enabled
                    ? 'inline-flex items-center gap-1 text-patina'
                    : 'inline-flex items-center gap-1 text-muted-foreground'
                "
              >
                <span
                  :class="
                    r.enabled
                      ? 'size-1.5 rounded-full bg-patina'
                      : 'size-1.5 rounded-full bg-muted-foreground'
                  "
                />
                {{ r.enabled ? '启用' : '停用' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>
</template>
