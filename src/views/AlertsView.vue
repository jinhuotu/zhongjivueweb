<script setup lang="ts">
import { computed } from 'vue'
import {
  Bell,
  CircleCheck,
  Clock,
  Filter,
  Settings,
  TriangleAlert,
} from 'lucide-vue-next'
import { Panel, PageHeader, KpiCard, Tag } from '@/components/ui-kit'
import { alerts } from '@/lib/mock'

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

const activeCount = computed(() => alerts.filter((a) => a.status === 'active').length)
const ackCount = computed(() => alerts.filter((a) => a.status === 'ack').length)

const typeDist = [
  { name: '能耗超标', value: 18, color: '#FF6B35' },
  { name: '碳排异常', value: 9, color: '#F4C430' },
  { name: '设备故障', value: 8, color: '#4A9EFF' },
  { name: '工艺偏差', value: 5, color: '#5DD3E0' },
  { name: '安全/环保', value: 2, color: '#7FB069' },
]

const rules = [
  {
    n: '单位产品燃气耗超限',
    t: '能耗',
    e: 'avg(单耗,5m) > limit × 1.02',
    th: '>168 m³/t',
    c: '钉钉 + 短信',
    d: '全部车式窑',
    s: true,
  },
  {
    n: '炉膛温度场偏差',
    t: '工艺',
    e: 'ΔT(前后区) > 25℃',
    th: '>25℃',
    c: '电话 + 钉钉',
    d: '全部车式窑',
    s: true,
  },
  {
    n: '空燃比 / 残氧异常',
    t: '工艺',
    e: 'O₂ > 4.5% 且 λ > 1.15',
    th: '>4.5%',
    c: '钉钉',
    d: '正火/调质窑',
    s: true,
  },
  {
    n: '升温速率超工艺曲线',
    t: '工艺',
    e: 'dT/dt > 80℃/h',
    th: '>80℃/h',
    c: '企业微信',
    d: '风电/核电件窑',
    s: true,
  },
  {
    n: '烟气余热回收效率下降',
    t: '能效',
    e: 'η-烟气 < 62%',
    th: '<62%',
    c: '钉钉 + 邮件',
    d: '蓄热式车式窑',
    s: true,
  },
  {
    n: '碳排基线超出',
    t: '碳排',
    e: 'CO₂(h) > baseline × 1.05',
    th: '+5%',
    c: '钉钉 + 邮件',
    d: '全部',
    s: true,
  },
  {
    n: '台车密封气幕压力偏低',
    t: '本体',
    e: 'P-气幕 < 80 Pa',
    th: '<80 Pa',
    c: '企业微信',
    d: '全部车式窑',
    s: false,
  },
]
</script>

<template>
  <PageHeader
    title="告警中心"
    description="基于规则引擎 + AI 异常检测 双通道触发，覆盖能耗 / 碳排 / 设备 / 安全 / 合规 五大类告警。可对接钉钉 / 企业微信 / 短信 / 电话外呼。"
  >
    <template #badges>
      <Tag tone="iron">未处置 {{ activeCount }}</Tag>
      <Tag tone="sulfur">已确认 {{ ackCount }}</Tag>
    </template>
    <template #actions>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
      >
        <Filter class="size-3.5" />筛选
      </button>
      <button
        type="button"
        class="h-8 px-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-border hover:bg-accent"
      >
        <Settings class="size-3.5" />规则配置
      </button>
    </template>
  </PageHeader>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
    <KpiCard
      label="本月触发"
      value="42"
      unit="次"
      tone="iron"
      :trend="{ value: '8%', up: false }"
    >
      <template #icon><Bell class="size-4" /></template>
    </KpiCard>
    <KpiCard label="严重告警" value="6" unit="次" tone="iron">
      <template #icon><TriangleAlert class="size-4" /></template>
    </KpiCard>
    <KpiCard
      label="平均响应"
      value="3.2"
      unit="分钟"
      tone="patina"
      :trend="{ value: '12%', up: false }"
    >
      <template #icon><Clock class="size-4" /></template>
    </KpiCard>
    <KpiCard label="MTTR" value="38" unit="分钟" tone="molybdenum" hint="平均修复时长" />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-5">
    <Panel title="告警类型分布" class-name="lg:col-span-1">
      <div class="space-y-3 text-xs">
        <div v-for="c in typeDist" :key="c.name">
          <div class="flex justify-between mb-1">
            <span>{{ c.name }}</span>
            <span class="data-num text-muted-foreground">{{ c.value }}</span>
          </div>
          <div class="h-1.5 rounded-full bg-background overflow-hidden">
            <div
              class="h-full"
              :style="{ width: `${(c.value / 18) * 100}%`, background: c.color }"
            />
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="告警工单" subtitle="近 30 条" class-name="lg:col-span-3" flush>
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
            <tr v-for="a in alerts" :key="a.id" class="hover:bg-background/40">
              <td class="px-4 py-3 data-num text-muted-foreground">{{ a.id }}</td>
              <td class="px-4 py-3">
                <Tag :tone="sevTone[a.severity]">
                  <TriangleAlert class="size-2.5 mr-0.5 inline" />
                  {{ sevLabel[a.severity] }}
                </Tag>
              </td>
              <td class="px-4 py-3 font-medium">{{ a.target }}</td>
              <td class="px-4 py-3 text-foreground/85 max-w-[280px] truncate">
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
                <button type="button" class="text-iron hover:underline">处置</button>
                <span class="text-border mx-1.5">|</span>
                <button type="button" class="text-muted-foreground hover:text-foreground">
                  详情
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </div>

  <Panel title="告警规则配置" subtitle="支持 IF-THEN / 滑窗 / 多指标联动" flush>
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
          <tr v-for="(r, i) in rules" :key="i" class="hover:bg-background/40">
            <td class="px-4 py-3 font-medium">{{ r.n }}</td>
            <td class="px-4 py-3"><Tag tone="molybdenum">{{ r.t }}</Tag></td>
            <td class="px-4 py-3 data-num text-muted-foreground">{{ r.e }}</td>
            <td class="px-4 py-3 data-num text-iron">{{ r.th }}</td>
            <td class="px-4 py-3 text-foreground/80">{{ r.c }}</td>
            <td class="px-4 py-3 text-foreground/80">{{ r.d }}</td>
            <td class="px-4 py-3">
              <span
                :class="
                  r.s
                    ? 'inline-flex items-center gap-1 text-patina'
                    : 'inline-flex items-center gap-1 text-muted-foreground'
                "
              >
                <span
                  :class="
                    r.s
                      ? 'size-1.5 rounded-full bg-patina'
                      : 'size-1.5 rounded-full bg-muted-foreground'
                  "
                />
                {{ r.s ? '启用' : '停用' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Panel>
</template>
