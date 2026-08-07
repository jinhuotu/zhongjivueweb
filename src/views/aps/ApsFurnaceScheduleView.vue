<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, RotateCcw, AlertTriangle, Download } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import {
  APS_CONSTRAINTS,
  APS_SCHEDULE_RESULTS,
  type ApsConstraint,
} from '@/lib/mock-extended'

const constraints = ref<ApsConstraint[]>(APS_CONSTRAINTS.map((c) => ({ ...c })))
const activeSch = ref(APS_SCHEDULE_RESULTS[0]!.id)
const compareSch = ref<string | null>(null)

const groups = ['资源能力', '生产条件', '排序策略'] as const
const furnaces = ['TC-01', 'TC-02', 'TC-03', 'TC-05', 'TC-06', 'TC-07']

const enabledCount = computed(() => constraints.value.filter((c) => c.enabled).length)
const sch = computed(() => APS_SCHEDULE_RESULTS.find((s) => s.id === activeSch.value)!)
const compare = computed(() =>
  compareSch.value ? APS_SCHEDULE_RESULTS.find((s) => s.id === compareSch.value) : null,
)

function toggle(id: string) {
  constraints.value = constraints.value.map((c) =>
    c.id === id ? { ...c, enabled: !c.enabled } : c,
  )
}

function toggleCompare() {
  if (compareSch.value) {
    compareSch.value = null
    return
  }
  compareSch.value = APS_SCHEDULE_RESULTS.find((s) => s.id !== activeSch.value)?.id ?? null
}

/** Deterministic bar position from schedule times (avoids Math.random) */
function barPos(start: string, end: string, offset = 0) {
  const base = new Date(2026, 5, 28).getTime()
  const span = 14 * 86400000
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const left = Math.max(0, Math.min(70, ((s - base) / span) * 100 + offset))
  const width = Math.max(12, Math.min(45, ((e - s) / span) * 100))
  return { left: `${left}%`, width: `${width}%` }
}

const conflicts = [
  {
    type: '温度冲突',
    level: 'warning',
    msg: 'TC-03 在 07-02 同时排产 HA-75 (1450℃) 与 MT-80 (1615℃)，温差 165℃ > 阈值 30℃',
    action: '调整顺序',
  },
  {
    type: '模具冲突',
    level: 'warning',
    msg: '模具 M-230 在 07-04 被 o1 与 o6 同时占用',
    action: '顺延 o6',
  },
  {
    type: '换产优化',
    level: 'info',
    msg: 'TC-01 在 07-02 → 07-05 换产 HA-75 → GY-90 需 4h 清窑，建议合并同材质订单',
    action: '合并',
  },
]

const metrics = computed(() => [
  { label: '推荐评分', value: sch.value.score, color: 'from-molybdenum to-patina' },
  { label: '预计准交率', value: sch.value.onTimeRate, color: 'from-patina to-coolant' },
  { label: '延期风险', value: sch.value.delayRisk, color: 'from-sulfur to-iron' },
  { label: '产能利用率', value: sch.value.utilization, color: 'from-molybdenum to-coolant' },
])

const btn =
  'inline-flex items-center h-7 px-2.5 text-xs rounded border border-border-hairline bg-transparent hover:bg-surface/60 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold">窑炉排程 · 核心</h1>
      <p class="text-sm text-muted-foreground mt-1">
        精细化排程 · 甘特图拖拽 · 温度兼容性约束 · 冲突检测 · 换产管理
      </p>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
      <div class="space-y-4">
        <Panel title="约束条件" :subtitle="`已启用 ${enabledCount}/${constraints.length}`">
          <template #action>
            <button class="p-1.5 rounded hover:bg-surface/60" type="button">
              <RotateCcw class="size-3.5" />
            </button>
          </template>
          <div v-for="g in groups" :key="g" class="mb-3">
            <div class="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              {{ g }}
            </div>
            <div class="space-y-1">
              <button
                v-for="c in constraints.filter((x) => x.group === g)"
                :key="c.id"
                type="button"
                class="w-full flex items-start gap-2 p-2 rounded hover:bg-surface/60 transition text-left"
                @click="toggle(c.id)"
              >
                <div
                  class="size-4 mt-0.5 rounded border flex items-center justify-center shrink-0"
                  :class="c.enabled ? 'bg-iron border-iron' : 'border-border-hairline'"
                >
                  <Check v-if="c.enabled" class="size-3 text-background" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium">{{ c.name }}</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {{ c.desc }}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="综合评估">
          <div class="space-y-2.5">
            <div v-for="m in metrics" :key="m.label">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-muted-foreground">{{ m.label }}</span>
                <span class="data-num">{{ m.value }}</span>
              </div>
              <div class="h-1.5 bg-surface rounded overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r"
                  :class="m.color"
                  :style="{ width: `${m.value}%` }"
                />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div class="space-y-4">
        <Panel title="甘特图" :subtitle="sch.name">
          <template #action>
            <div class="flex items-center gap-2 flex-wrap justify-end">
              <select
                v-model="activeSch"
                class="h-7 px-2 text-xs rounded bg-surface border border-border-hairline text-foreground"
              >
                <option v-for="s in APS_SCHEDULE_RESULTS" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
              <button :class="btn" type="button" @click="toggleCompare">
                {{ compareSch ? '取消对比' : '对比方案' }}
              </button>
              <button :class="btn" type="button">
                <Download class="size-3.5 mr-1" />导出
              </button>
            </div>
          </template>
          <div class="space-y-2">
            <div v-for="f in furnaces" :key="f" class="flex items-center gap-2">
              <span class="text-xs font-mono w-14 shrink-0">{{ f }}</span>
              <div class="flex-1 h-10 bg-surface rounded border border-border-hairline relative">
                <div
                  v-for="o in sch.orders.filter((x) => x.furnace === f)"
                  :key="o.orderId"
                  class="absolute top-1 bottom-1 rounded text-[10px] text-background px-1.5 flex items-center truncate font-medium cursor-move hover:ring-2 hover:ring-iron/50"
                  :style="{ ...barPos(o.start, o.end), backgroundColor: o.color }"
                >
                  {{ o.orderId }}
                </div>
                <div
                  v-for="o in compare?.orders.filter((x) => x.furnace === f) ?? []"
                  :key="`${o.orderId}-cmp`"
                  class="absolute bottom-0.5 h-2 rounded opacity-60"
                  :style="{ ...barPos(o.start, o.end, 4), backgroundColor: o.color }"
                />
              </div>
            </div>
          </div>
          <div
            v-if="compare"
            class="mt-3 flex items-center gap-4 text-xs text-muted-foreground"
          >
            <span>━ 当前方案: {{ sch.name }}</span>
            <span class="opacity-60">━ 对比方案: {{ compare.name }}</span>
          </div>
        </Panel>

        <Panel title="冲突检测与换产">
          <div class="space-y-2">
            <div
              v-for="(c, i) in conflicts"
              :key="i"
              class="flex items-start gap-3 panel-surface rounded border border-border-hairline p-2.5"
            >
              <AlertTriangle
                class="size-4 mt-0.5 shrink-0"
                :class="c.level === 'warning' ? 'text-sulfur' : 'text-molybdenum'"
              />
              <div class="flex-1">
                <span
                  class="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded border border-border-hairline"
                  >{{ c.type }}</span
                >
                <div class="text-xs mt-1">{{ c.msg }}</div>
              </div>
              <button :class="btn">{{ c.action }}</button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  </div>
</template>
