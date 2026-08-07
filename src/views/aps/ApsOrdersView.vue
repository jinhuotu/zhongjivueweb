<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Search, Plus, Split, Merge, Clock, Filter, Download } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { APS_ORDERS, type ApsOrder } from '@/lib/mock-extended'

const priorityColor: Record<ApsOrder['priority'], string> = {
  'P0-紧急': 'bg-iron/15 text-iron border-iron/40',
  'P1-高': 'bg-sulfur/15 text-sulfur border-sulfur/40',
  'P2-中': 'bg-molybdenum/15 text-molybdenum border-molybdenum/40',
  'P3-低': 'bg-text-muted/15 text-text-secondary border-border-hairline',
}

const statusColor: Record<ApsOrder['status'], string> = {
  待排: 'bg-text-muted/15 text-text-secondary border-border-hairline',
  已排: 'bg-molybdenum/15 text-molybdenum border-molybdenum/40',
  生产中: 'bg-patina/15 text-patina border-patina/40',
  已完成: 'bg-coolant/15 text-coolant border-coolant/40',
  延期: 'bg-iron/15 text-iron border-iron/40',
}

const keyword = ref('')
const priorityFilter = ref('all')
const statusFilter = ref('all')
const selected = ref<Set<string>>(new Set())

const filtered = computed(() =>
  APS_ORDERS.filter((o) => {
    if (
      keyword.value &&
      !`${o.code} ${o.customer} ${o.product}`.toLowerCase().includes(keyword.value.toLowerCase())
    )
      return false
    if (priorityFilter.value !== 'all' && o.priority !== priorityFilter.value) return false
    if (statusFilter.value !== 'all' && o.status !== statusFilter.value) return false
    return true
  }),
)

const stats = {
  total: APS_ORDERS.length,
  pending: APS_ORDERS.filter((o) => o.status === '待排').length,
  running: APS_ORDERS.filter((o) => o.status === '生产中').length,
  delayed: APS_ORDERS.filter((o) => o.status === '延期').length,
}

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function isSelected(id: string) {
  return selected.value.has(id)
}

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">生产订单管理</h1>
      <p class="text-sm text-muted-foreground mt-1">
        需求输入 · 订单转化 · 优先级管理 · 拆单合单 · 交期承诺 ATP/CTP
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Panel
        v-for="s in [
          { label: '订单总数', value: stats.total, unit: '单', color: 'text-molybdenum' },
          { label: '待排产', value: stats.pending, unit: '单', color: 'text-sulfur' },
          { label: '生产中', value: stats.running, unit: '单', color: 'text-patina' },
          { label: '已延期', value: stats.delayed, unit: '单', color: 'text-iron' },
        ]"
        :key="s.label"
        class-name="!p-4"
      >
        <div class="text-xs text-muted-foreground">{{ s.label }}</div>
        <div class="mt-1.5 flex items-baseline gap-1">
          <span :class="['data-num text-2xl font-semibold', s.color]">{{ s.value }}</span>
          <span class="text-xs text-muted-foreground">{{ s.unit }}</span>
        </div>
      </Panel>
    </div>

    <Panel :title="'订单清单'" :subtitle="`共 ${filtered.length} 条 · 已选 ${selected.size} 条`">
      <template #action>
        <div class="flex items-center gap-2 flex-wrap justify-end">
          <button :class="btn"><Plus class="size-3.5 mr-1" />新建订单</button>
          <button :class="btn"><Split class="size-3.5 mr-1" />拆单</button>
          <button :class="btn"><Merge class="size-3.5 mr-1" />合单</button>
          <button :class="btn"><Clock class="size-3.5 mr-1" />ATP 承诺</button>
          <button :class="btn"><Download class="size-3.5 mr-1" />导出</button>
        </div>
      </template>

      <div class="flex items-center gap-2 mb-4 flex-wrap">
        <div class="relative flex-1 max-w-sm min-w-[200px]">
          <Search
            class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
          />
          <input
            v-model="keyword"
            placeholder="搜索订单号 / 客户 / 产品..."
            class="w-full h-8 pl-8 pr-3 text-sm rounded border border-border-hairline bg-surface text-foreground outline-none focus:border-molybdenum/50"
          />
        </div>
        <div class="relative">
          <Filter class="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <select
            v-model="priorityFilter"
            class="h-8 pl-7 pr-3 text-sm rounded border border-border-hairline bg-surface text-foreground"
          >
            <option value="all">全部优先级</option>
            <option value="P0-紧急">P0 紧急</option>
            <option value="P1-高">P1 高</option>
            <option value="P2-中">P2 中</option>
            <option value="P3-低">P3 低</option>
          </select>
        </div>
        <select
          v-model="statusFilter"
          class="h-8 px-3 text-sm rounded border border-border-hairline bg-surface text-foreground"
        >
          <option value="all">全部状态</option>
          <option value="待排">待排</option>
          <option value="已排">已排</option>
          <option value="生产中">生产中</option>
          <option value="延期">延期</option>
          <option value="已完成">已完成</option>
        </select>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-muted-foreground border-b border-border-hairline">
              <th class="py-2 w-8" />
              <th class="py-2 font-medium">订单号</th>
              <th class="py-2 font-medium">客户</th>
              <th class="py-2 font-medium">产品 / 规格</th>
              <th class="py-2 font-medium text-right">数量</th>
              <th class="py-2 font-medium">优先级</th>
              <th class="py-2 font-medium">交期</th>
              <th class="py-2 font-medium">承诺交期</th>
              <th class="py-2 font-medium">窑炉</th>
              <th class="py-2 font-medium">状态</th>
              <th class="py-2 font-medium text-right">延期</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="o in filtered"
              :key="o.id"
              class="border-b border-border-hairline/50 hover:bg-surface/40 transition-colors"
            >
              <td class="py-2.5">
                <button
                  type="button"
                  class="size-4 rounded border flex items-center justify-center"
                  :class="
                    isSelected(o.id) ? 'bg-iron border-iron' : 'border-border-hairline'
                  "
                  @click="toggle(o.id)"
                >
                  <Check v-if="isSelected(o.id)" class="size-3 text-background" />
                </button>
              </td>
              <td class="py-2.5 font-mono text-xs text-molybdenum">{{ o.code }}</td>
              <td class="py-2.5">{{ o.customer }}</td>
              <td class="py-2.5">
                <div>{{ o.product }}</div>
                <div class="text-xs text-muted-foreground">{{ o.spec }}</div>
              </td>
              <td class="py-2.5 text-right data-num">
                {{ o.qty.toLocaleString()
                }}<span class="text-xs text-muted-foreground ml-0.5">{{ o.unit }}</span>
              </td>
              <td class="py-2.5">
                <span
                  class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
                  :class="priorityColor[o.priority]"
                  >{{ o.priority }}</span
                >
              </td>
              <td class="py-2.5 font-mono text-xs">{{ o.dueDate }}</td>
              <td class="py-2.5 font-mono text-xs text-patina">{{ o.promisedDate }}</td>
              <td class="py-2.5 font-mono text-xs">{{ o.furnace }}</td>
              <td class="py-2.5">
                <span
                  class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border"
                  :class="statusColor[o.status]"
                  >{{ o.status }}</span
                >
              </td>
              <td class="py-2.5 text-right">
                <span v-if="o.delayDays > 0" class="text-iron data-num">+{{ o.delayDays }}d</span>
                <span v-else class="text-muted-foreground">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </div>
</template>
