<script setup lang="ts">
import { computed } from 'vue'
import { Package, CheckCircle2, AlertTriangle, Truck, RefreshCw } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_MATERIALS } from '@/lib/mock-extended'

const list = computed(() =>
  APS_MATERIALS.map((m) => ({
    ...m,
    completeRate: Math.min(100, Math.round((m.stock / m.required) * 100)),
    inStock: m.stock,
    inTransit: m.status === '在途' ? Math.round(m.required * 0.6) : 0,
  })),
)

const complete = computed(() => list.value.filter((m) => m.completeRate >= 95).length)
const risk = computed(() => list.value.filter((m) => m.completeRate < 80).length)

const purchases = [
  { mat: 'M-008 高岭土', qty: 12, eta: '07-01', reason: 'o6 订单 07-03 开工', urgent: true },
  { mat: 'M-012 硅微粉', qty: 8, eta: '07-02', reason: '库存低于安全线', urgent: false },
  { mat: 'M-015 刚玉砂', qty: 20, eta: '06-30', reason: '供应商交期紧张', urgent: true },
]

function statusBadge(rate: number) {
  if (rate >= 95) return { cls: 'bg-patina/15 text-patina border-patina/40', label: '已齐套' }
  if (rate >= 80) return { cls: 'bg-sulfur/15 text-sulfur border-sulfur/40', label: '风险' }
  return { cls: 'bg-iron/15 text-iron border-iron/40', label: '短缺' }
}

function barColor(rate: number) {
  if (rate >= 95) return 'bg-patina'
  if (rate >= 80) return 'bg-sulfur'
  return 'bg-iron'
}

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">物料齐套与供应排程</h1>
      <p class="text-sm text-muted-foreground mt-1">
        物料保障 · 齐套检查 · 采购建议 · 工装调度
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Package class="size-3" />物料总数
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-molybdenum">18</span>
          <span class="text-xs text-muted-foreground">种</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 class="size-3" />已齐套
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-patina">{{ complete }}</span>
          <span class="text-xs text-muted-foreground">种</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <AlertTriangle class="size-3" />齐套风险
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-iron">{{ risk }}</span>
          <span class="text-xs text-muted-foreground">种</span>
        </div>
      </Panel>
      <Panel class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Truck class="size-3" />采购建议
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="data-num text-xl font-semibold text-sulfur">4</span>
          <span class="text-xs text-muted-foreground">条</span>
        </div>
      </Panel>
    </div>

    <Panel title="物料齐套明细">
      <template #action>
        <button :class="btn"><RefreshCw class="size-3.5 mr-1" />刷新</button>
      </template>
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-hairline text-muted-foreground">
            <th class="text-left py-2 font-normal">物料编码</th>
            <th class="text-left py-2 font-normal">名称</th>
            <th class="text-right py-2 font-normal">需求</th>
            <th class="text-right py-2 font-normal">库存</th>
            <th class="text-right py-2 font-normal">在途</th>
            <th class="text-right py-2 font-normal">齐套率</th>
            <th class="text-left py-2 font-normal">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in list"
            :key="m.id"
            class="border-b border-border-hairline/50 hover:bg-surface/40"
          >
            <td class="py-2 font-mono text-molybdenum">{{ m.code }}</td>
            <td class="py-2">{{ m.name }}</td>
            <td class="py-2 text-right data-num">{{ m.required }}</td>
            <td class="py-2 text-right data-num">{{ m.inStock }}</td>
            <td class="py-2 text-right data-num">{{ m.inTransit }}</td>
            <td class="py-2 text-right">
              <div class="inline-flex items-center gap-2">
                <div class="w-16 h-1.5 bg-surface rounded overflow-hidden">
                  <div
                    class="h-full"
                    :class="barColor(m.completeRate)"
                    :style="{ width: `${m.completeRate}%` }"
                  />
                </div>
                <span class="data-num w-10 text-right">{{ m.completeRate }}%</span>
              </div>
            </td>
            <td class="py-2">
              <span
                class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
                :class="statusBadge(m.completeRate).cls"
                >{{ statusBadge(m.completeRate).label }}</span
              >
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>

    <Panel title="采购建议">
      <div class="space-y-2">
        <div
          v-for="(p, i) in purchases"
          :key="i"
          class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
        >
          <Package class="size-4 text-molybdenum" />
          <div class="flex-1">
            <div class="text-xs font-medium">{{ p.mat }}</div>
            <div class="text-[11px] text-muted-foreground">{{ p.reason }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs data-num">{{ p.qty }} 吨</div>
            <div class="text-[10px] text-muted-foreground">ETA {{ p.eta }}</div>
          </div>
          <button :class="p.urgent ? btnPrimary : btn">
            {{ p.urgent ? '紧急下单' : '下单' }}
          </button>
        </div>
      </div>
    </Panel>
  </div>
</template>
