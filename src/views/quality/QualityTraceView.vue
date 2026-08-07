<script setup lang="ts">
import { GitBranch, Search, ArrowRight } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'

const traces = [
  {
    orderId: 'GY-2024-0091',
    product: '高铝砖 HA-75',
    result: '合格',
    rootCause: '温度曲线正常',
    steps: [
      '原料批次 B2024-0087',
      '配料 98.2%',
      '成型 12.4 MPa',
      '干燥 110℃/4h',
      '烧成 1450℃/8h',
      '检测 96.2%',
    ],
  },
  {
    orderId: 'GY-2024-0088',
    product: '刚玉砖 GC-90',
    result: '不合格',
    rootCause: '原料含杂质偏高',
    steps: [
      '原料批次 B2024-0085',
      '配料 97.1%',
      '成型 12.0 MPa',
      '干燥 115℃/4h',
      '烧成 1480℃/9h',
      '检测 88.5%',
    ],
  },
  {
    orderId: 'GY-2024-0085',
    product: '镁碳砖 MT-80',
    result: '合格',
    rootCause: '工艺参数稳定',
    steps: [
      '原料批次 B2024-0082',
      '配料 99.0%',
      '成型 13.2 MPa',
      '干燥 105℃/5h',
      '烧成 1520℃/10h',
      '检测 97.8%',
    ],
  },
]

const stages = ['原料', '配料', '成型', '干燥', '烧成', '检测']

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
const btnPrimary =
  'inline-flex items-center justify-center w-full h-8 px-3 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">质量追溯分析</h1>
        <p class="text-sm text-muted-foreground mt-1">
          从成品反向追溯到全流程 · 辅助根因定位
        </p>
      </div>
      <button :class="btn"><Search class="size-3.5 mr-1" />追溯查询</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <Panel title="追溯入口">
        <div class="space-y-3">
          <div>
            <label class="text-[11px] text-muted-foreground">订单号 / 批次号</label>
            <input
              type="text"
              value="GY-2024-0091"
              class="w-full mt-1 bg-surface border border-border-hairline rounded px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label class="text-[11px] text-muted-foreground">产品型号</label>
            <select
              class="w-full mt-1 bg-surface border border-border-hairline rounded px-2 py-1.5 text-xs"
            >
              <option>高铝砖 HA-75</option>
              <option>刚玉砖 GC-90</option>
              <option>镁碳砖 MT-80</option>
            </select>
          </div>
          <div>
            <label class="text-[11px] text-muted-foreground">追溯深度</label>
            <div class="flex items-center gap-2 mt-1">
              <span
                v-for="(s, i) in stages"
                :key="i"
                class="flex-1 text-center py-1 text-[10px] rounded bg-molybdenum/20 text-molybdenum"
                >{{ s }}</span
              >
            </div>
          </div>
          <button :class="btnPrimary">
            <GitBranch class="size-3.5 mr-1" />开始追溯
          </button>
        </div>
      </Panel>

      <div class="space-y-4">
        <Panel
          v-for="(t, i) in traces"
          :key="i"
          :title="t.orderId"
          :subtitle="t.product"
        >
          <div class="flex items-center gap-2 mb-3">
            <span
              :class="[
                'inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border',
                t.result === '合格'
                  ? 'bg-patina/15 text-patina border-patina/40'
                  : 'bg-iron/15 text-iron border-iron/40',
              ]"
            >
              {{ t.result }}
            </span>
            <span class="text-xs text-muted-foreground">根因：</span>
            <span class="text-xs">{{ t.rootCause }}</span>
          </div>
          <div class="flex items-center gap-1.5 overflow-x-auto">
            <template v-for="(s, j) in t.steps" :key="j">
              <div class="flex items-center gap-1.5 shrink-0">
                <div
                  class="panel-surface rounded border border-border-hairline px-2.5 py-1.5 text-[11px]"
                >
                  <div class="text-muted-foreground text-[9px]">Step {{ j + 1 }}</div>
                  <div>{{ s }}</div>
                </div>
                <ArrowRight
                  v-if="j < t.steps.length - 1"
                  class="size-3 text-muted-foreground"
                />
              </div>
            </template>
          </div>
        </Panel>
      </div>
    </div>
  </div>
</template>
