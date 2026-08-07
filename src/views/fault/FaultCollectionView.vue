<script setup lang="ts">
import { Radio, Database, Layers, Tag } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_COLLECTION } from '@/lib/mock-extended'

const col = FP_COLLECTION

const kpis = [
  { label: '采集通道', value: col.channels, unit: '路', color: 'text-molybdenum', icon: Radio },
  { label: '测点总数', value: col.points, unit: '个', color: 'text-coolant', icon: Database },
  { label: '特征库', value: col.features, unit: '类', color: 'text-patina', icon: Layers },
  { label: '标注覆盖率', value: col.annotationRate, unit: '%', color: 'text-sulfur', icon: Tag },
]

function statusBadge(status: string) {
  if (status === 'online') return 'bg-patina/15 text-patina border-patina/40'
  return 'bg-iron/15 text-iron border-iron/40'
}

function statusLabel(status: string) {
  return status === 'online' ? '在线' : '离线'
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">数据采集与特征工程</h1>
      <p class="text-sm text-muted-foreground mt-1">多协议接入 · 测点质量 · 特征库管理</p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <component :is="s.icon" class="size-3" />{{ s.label }}
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span :class="['data-num text-xl font-semibold', s.color]">{{ s.value }}</span>
          <span class="text-xs text-muted-foreground">{{ s.unit }}</span>
        </div>
      </Panel>
    </div>

    <Panel title="采集通道">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-medium">通道名称</th>
            <th class="text-left py-2 font-medium">协议</th>
            <th class="text-left py-2 font-medium">状态</th>
            <th class="text-left py-2 font-medium">测点数</th>
            <th class="text-left py-2 font-medium">采样率</th>
            <th class="text-left py-2 font-medium">数据质量</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in col.channelsList"
            :key="c.id"
            class="border-b border-border-hairline/50 hover:bg-surface/50"
          >
            <td class="py-2.5 font-medium">{{ c.name }}</td>
            <td class="py-2.5 text-muted-foreground">{{ c.protocol }}</td>
            <td class="py-2.5">
              <span
                :class="[
                  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]',
                  statusBadge(c.status),
                ]"
              >
                {{ statusLabel(c.status) }}
              </span>
            </td>
            <td class="py-2.5 data-num">{{ c.points }}</td>
            <td class="py-2.5 data-num">{{ c.rate }} Hz</td>
            <td class="py-2.5">
              <span :class="['data-num', c.quality > 0 ? 'text-patina' : 'text-muted-foreground']">
                {{ c.quality }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>

    <Panel title="特征库">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="f in col.featureLibrary"
          :key="f.id"
          class="panel-surface rounded border border-border-hairline p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium">{{ f.name }}</span>
            <span
              class="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] bg-molybdenum/15 text-molybdenum border-molybdenum/40"
            >
              {{ f.type }}
            </span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>样本 <span class="data-num text-foreground">{{ f.count }}</span></span>
            <span>窗口 {{ f.window }}</span>
          </div>
        </div>
      </div>
    </Panel>
  </div>
</template>
