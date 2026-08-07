<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'

const records = [
  {
    id: 'QD-001',
    order: 'GY-2024-0091',
    product: '高铝砖 HA-75',
    param: '温度',
    predicted: 1448,
    actual: 1452,
    deviation: -4,
    status: '正常',
  },
  {
    id: 'QD-002',
    order: 'GY-2024-0091',
    product: '高铝砖 HA-75',
    param: '空燃比',
    predicted: 4.2,
    actual: 4.15,
    deviation: 0.05,
    status: '正常',
  },
  {
    id: 'QD-003',
    order: 'GY-2024-0088',
    product: '刚玉砖 GC-90',
    param: '温度',
    predicted: 1480,
    actual: 1495,
    deviation: -15,
    status: '偏差',
  },
  {
    id: 'QD-004',
    order: 'GY-2024-0085',
    product: '镁碳砖 MT-80',
    param: '保温时长',
    predicted: 10,
    actual: 10.2,
    deviation: -0.2,
    status: '正常',
  },
  {
    id: 'QD-005',
    order: 'GY-2024-0082',
    product: '高铝砖 HA-70',
    param: '振动',
    predicted: 1.2,
    actual: 1.8,
    deviation: -0.6,
    status: '关注',
  },
]

const deviationTrend = Array.from(
  { length: 30 },
  (_, i) => Math.sin(i / 5) * 3 + (i % 7) * 0.3,
)

function deviationColor(d: number) {
  const abs = Math.abs(d)
  if (abs > 10) return 'text-iron'
  if (abs > 5) return 'text-sulfur'
  return 'text-patina'
}

function statusBadge(status: string) {
  if (status === '正常') return 'bg-patina/15 text-patina border-patina/40'
  if (status === '关注') return 'bg-sulfur/15 text-sulfur border-sulfur/40'
  return 'bg-iron/15 text-iron border-iron/40'
}

function trendBarColor(v: number) {
  const abs = Math.abs(v)
  if (abs > 3) return 'bg-iron/60'
  if (abs > 1.5) return 'bg-sulfur/60'
  return 'bg-patina/60'
}

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
const btnGhost =
  'inline-flex items-center !py-1 !px-2 h-auto text-xs rounded hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">质量检测数据管理</h1>
        <p class="text-sm text-muted-foreground mt-1">实测数据录入 · 与预测数据对比校验</p>
      </div>
      <button :class="btnPrimary"><Plus class="size-3.5 mr-1" />录入数据</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel
        v-for="s in [
          { label: '今日录入', value: 128, color: 'text-molybdenum', unit: '' },
          { label: '预测偏差', value: '±2.3%', color: 'text-patina', unit: '' },
          { label: '校验通过', value: 96.2, color: 'text-coolant', unit: '%' },
          { label: '异常记录', value: 5, color: 'text-sulfur', unit: '' },
        ]"
        :key="s.label"
        class-name="!p-3"
      >
        <div class="text-[11px] text-muted-foreground">{{ s.label }}</div>
        <div :class="['data-num text-xl font-semibold mt-1', s.color]">
          {{ s.value }}{{ s.unit }}
        </div>
      </Panel>
    </div>

    <Panel title="检测记录">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-medium">ID</th>
            <th class="text-left py-2 font-medium">订单</th>
            <th class="text-left py-2 font-medium">产品</th>
            <th class="text-left py-2 font-medium">参数</th>
            <th class="text-left py-2 font-medium">预测值</th>
            <th class="text-left py-2 font-medium">实测值</th>
            <th class="text-left py-2 font-medium">偏差</th>
            <th class="text-left py-2 font-medium">状态</th>
            <th class="text-right py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in records"
            :key="r.id"
            class="border-b border-border-hairline/50 hover:bg-surface/50"
          >
            <td class="py-2.5 font-mono text-molybdenum">{{ r.id }}</td>
            <td class="py-2.5 font-mono">{{ r.order }}</td>
            <td class="py-2.5">{{ r.product }}</td>
            <td class="py-2.5">{{ r.param }}</td>
            <td class="py-2.5 data-num">{{ r.predicted }}</td>
            <td class="py-2.5 data-num">{{ r.actual }}</td>
            <td class="py-2.5">
              <span :class="['data-num', deviationColor(r.deviation)]">
                {{ r.deviation > 0 ? '+' : '' }}{{ r.deviation }}
              </span>
            </td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                  statusBadge(r.status),
                ]"
              >
                {{ r.status }}
              </span>
            </td>
            <td class="py-2.5 text-right">
              <button :class="btnGhost">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="预测 vs 实测对比">
        <div class="flex items-end gap-2 h-40">
          <div
            v-for="(r, i) in records.slice(0, 8)"
            :key="i"
            class="flex-1 flex items-end gap-0.5"
          >
            <div
              class="flex-1 bg-molybdenum/60 rounded-t"
              :style="{ height: `${(r.predicted / 1500) * 100}%` }"
            />
            <div
              class="flex-1 bg-coolant/60 rounded-t"
              :style="{ height: `${(r.actual / 1500) * 100}%` }"
            />
          </div>
        </div>
        <div class="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span
            ><span class="inline-block w-2 h-2 bg-molybdenum/60 rounded mr-1" />预测值</span
          >
          <span
            ><span class="inline-block w-2 h-2 bg-coolant/60 rounded mr-1" />实测值</span
          >
        </div>
      </Panel>

      <Panel title="偏差趋势">
        <div class="flex items-end gap-1 h-40">
          <div
            v-for="(v, i) in deviationTrend"
            :key="i"
            :class="['flex-1 rounded-t', trendBarColor(v)]"
            :style="{ height: `${Math.abs(v) * 15}%` }"
          />
        </div>
        <div class="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span
            ><span class="inline-block w-2 h-2 bg-patina/60 rounded mr-1" />正常 (≤1.5)</span
          >
          <span
            ><span class="inline-block w-2 h-2 bg-sulfur/60 rounded mr-1" />关注 (1.5-3)</span
          >
          <span
            ><span class="inline-block w-2 h-2 bg-iron/60 rounded mr-1" />异常 (&gt;3)</span
          >
        </div>
      </Panel>
    </div>
  </div>
</template>
