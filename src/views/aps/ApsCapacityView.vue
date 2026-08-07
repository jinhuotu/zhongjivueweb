<script setup lang="ts">
import { Calendar, TrendingUp, AlertTriangle, Zap } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_FURNACE_CAPACITY } from '@/lib/mock-extended'

const hours = Array.from({ length: 24 }, (_, i) => i)
const days = ['06-28', '06-29', '06-30', '07-01', '07-02', '07-03', '07-04']

function dayLoad(furnaceId: string, dayIdx: number) {
  return 60 + ((dayIdx + furnaceId.charCodeAt(3)) % 40)
}

function hourLoad(h: number) {
  return 40 + Math.sin(h / 3) * 30 + (h > 8 && h < 20 ? 25 : 0)
}

const bottlenecks = [
  { name: 'TC-03 烧成段', load: 96, wait: 4.2, icon: AlertTriangle },
  { name: 'TC-05 冷却段', load: 92, wait: 2.8, icon: AlertTriangle },
  { name: 'TC-07 预热段', load: 88, wait: 1.5, icon: Zap },
  { name: 'TC-01 装窑', load: 75, wait: 0.5, icon: TrendingUp },
]

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">产能管理与平衡</h1>
      <p class="text-sm text-muted-foreground mt-1">
        产能日历 · 负荷分析 · 瓶颈工序识别 · 弹性分析
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel
        v-for="s in [
          { label: '总产能', value: 1280, unit: '吨/周', color: 'text-molybdenum' },
          { label: '已排产', value: 1024, unit: '吨', color: 'text-patina' },
          { label: '剩余产能', value: 256, unit: '吨', color: 'text-coolant' },
          { label: '瓶颈窑炉', value: 2, unit: '台', color: 'text-iron' },
        ]"
        :key="s.label"
        class-name="!p-3"
      >
        <div class="text-[11px] text-muted-foreground">{{ s.label }}</div>
        <div class="mt-1 flex items-baseline gap-1">
          <span :class="['data-num text-xl font-semibold', s.color]">{{ s.value }}</span>
          <span class="text-xs text-muted-foreground">{{ s.unit }}</span>
        </div>
      </Panel>
    </div>

    <Panel title="产能日历 · 周视图">
      <template #action>
        <button :class="btn"><Calendar class="size-3.5 mr-1" />切换月视图</button>
      </template>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border-hairline">
              <th class="text-left py-2 text-muted-foreground font-normal w-24">窑炉</th>
              <th
                v-for="d in days"
                :key="d"
                class="text-center py-2 text-muted-foreground font-normal"
              >
                {{ d }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="f in APS_FURNACE_CAPACITY"
              :key="f.id"
              class="border-b border-border-hairline/50"
            >
              <td class="py-2 font-mono">{{ f.id }}</td>
              <td v-for="(d, i) in days" :key="d" class="py-2 text-center">
                <div
                  class="inline-block w-10 h-6 rounded text-[10px] leading-6 font-mono"
                  :class="
                    dayLoad(f.id, i) > 90
                      ? 'bg-iron/20 text-iron'
                      : dayLoad(f.id, i) > 75
                        ? 'bg-sulfur/20 text-sulfur'
                        : 'bg-patina/20 text-patina'
                  "
                >
                  {{ dayLoad(f.id, i) }}%
                </div>
                <div v-if="f.bottleneck && i < 3" class="text-[9px] text-iron mt-0.5">瓶颈</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="负荷分析 · 24h 分布" subtitle="TC-03 当日负荷">
        <div class="flex items-end gap-0.5 h-32">
          <div
            v-for="h in hours"
            :key="h"
            class="flex-1 flex flex-col items-center gap-1 h-full justify-end"
          >
            <div
              class="w-full bg-molybdenum/30 rounded-t relative"
              :style="{ height: `${hourLoad(h)}%` }"
            >
              <div
                v-if="hourLoad(h) > 85"
                class="absolute inset-0 bg-iron/40 rounded-t"
              />
            </div>
            <span v-if="h % 4 === 0" class="text-[9px] text-muted-foreground">{{ h }}</span>
          </div>
        </div>
        <div class="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span
            ><span class="inline-block w-2 h-2 bg-molybdenum/30 rounded mr-1" />正常</span
          >
          <span
            ><span class="inline-block w-2 h-2 bg-iron/40 rounded mr-1" />超负荷 &gt;85%</span
          >
        </div>
      </Panel>

      <Panel title="瓶颈工序识别">
        <div class="space-y-2">
          <div
            v-for="(b, i) in bottlenecks"
            :key="i"
            class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
          >
            <component
              :is="b.icon"
              class="size-4"
              :class="b.load > 90 ? 'text-iron' : 'text-sulfur'"
            />
            <div class="flex-1">
              <div class="text-xs font-medium">{{ b.name }}</div>
              <div class="text-[11px] text-muted-foreground">
                等待队列 {{ b.wait }}h · 负荷 {{ b.load }}%
              </div>
            </div>
            <span
              class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
              :class="
                b.load > 90
                  ? 'bg-iron/15 text-iron border-iron/40'
                  : 'bg-sulfur/15 text-sulfur border-sulfur/40'
              "
              >{{ b.load > 90 ? '严重' : '关注' }}</span
            >
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
