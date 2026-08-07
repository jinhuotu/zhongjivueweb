<script setup lang="ts">
import { computed } from 'vue'
import { Check, History, Loader2, Send, Siren } from 'lucide-vue-next'
import { TrendLine } from '@/components/ui-kit/charts'
import { COLOR } from '@/lib/mock'
import type { ProdAlarm, ProdCommand, ProdTagValue } from '@/lib/production-api'

const props = defineProps<{
  seriesTags: string[]
  seriesTag: string
  chart: Array<Record<string, number | string>>
  writable: ProdTagValue[]
  ctrlTag: string
  ctrlValue: string
  sending: boolean
  alarms: ProdAlarm[]
  commands: ProdCommand[]
}>()

const emit = defineEmits<{
  'update:seriesTag': [v: string]
  'update:ctrlTag': [v: string]
  'update:ctrlValue': [v: string]
  send: []
  ack: [id: string]
}>()

const activeAlarmCount = computed(
  () => props.alarms.filter((a) => a.status === 'active').length,
)

const panel =
  'rounded-lg border border-border bg-card p-3 text-text-primary shadow-sm'
const input =
  'rounded border border-border bg-bg-surface text-text-primary text-[11px] placeholder:text-text-muted'

const chartKeys = computed(() => [
  { key: 'v', color: COLOR.molybdenum, label: props.seriesTag },
])
</script>

<template>
  <div class="space-y-3">
    <section :class="panel">
      <div class="mb-2 flex items-center justify-between">
        <div class="text-[12px] font-medium text-molybdenum">历史数据回溯</div>
        <select
          :value="seriesTag"
          :class="`h-7 px-2 ${input}`"
          @change="emit('update:seriesTag', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="t in seriesTags" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div class="h-[180px]">
        <TrendLine
          v-if="chart.length"
          :data="chart"
          :keys="chartKeys"
          :height="180"
        />
        <div
          v-else
          class="flex h-full items-center justify-center text-[11px] text-text-muted"
        >
          暂无曲线
        </div>
      </div>
    </section>

    <section :class="`${panel} space-y-2`">
      <div class="text-[12px] font-medium text-molybdenum">操作按钮 / 模拟下发</div>
      <select
        :value="ctrlTag"
        :class="`h-8 w-full px-2 ${input}`"
        @change="emit('update:ctrlTag', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="writable.length === 0" value="">无可写测点</option>
        <option
          v-for="t in writable"
          :key="t.tagCode"
          :value="t.tagCode"
        >
          {{ t.tagCode }} · {{ t.name }}
        </option>
      </select>
      <input
        :value="ctrlValue"
        placeholder="目标值"
        :class="`h-8 w-full px-2 font-mono ${input}`"
        @input="emit('update:ctrlValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        :disabled="sending || !ctrlTag"
        class="kb-btn-primary h-8 w-full disabled:opacity-50"
        @click="emit('send')"
      >
        <Loader2 v-if="sending" class="size-3.5 animate-spin" />
        <Send v-else class="size-3.5" />
        模拟下发
      </button>
      <p class="text-[10px] text-text-muted">executor=simulate；接入 PLC 后可切换真通道</p>
    </section>

    <section :class="panel">
      <div class="mb-2 text-[12px] font-medium text-molybdenum">
        报警异常 · 活跃 {{ activeAlarmCount }}
      </div>
      <div class="max-h-[200px] space-y-1.5 overflow-y-auto">
        <div
          v-if="alarms.length === 0"
          class="py-4 text-center text-[11px] text-text-muted"
        >
          暂无报警
        </div>
        <div
          v-for="a in alarms"
          :key="a.id"
          :class="[
            'rounded border p-2',
            a.status === 'active'
              ? 'animate-pulse border-red-500/50 bg-red-500/10'
              : 'border-border bg-bg-base/60',
          ]"
        >
          <div class="flex gap-2">
            <Siren
              :class="[
                'mt-0.5 size-3.5',
                a.level === 'alarm' ? 'text-red-500' : 'text-amber-500',
              ]"
            />
            <div class="min-w-0 flex-1">
              <div class="text-[11px] text-text-primary">{{ a.title }}</div>
              <div class="text-[10px] text-text-muted">{{ a.raisedAt }}</div>
            </div>
            <button
              v-if="a.status === 'active'"
              type="button"
              class="size-6 rounded border border-border text-molybdenum hover:bg-accent"
              title="确认"
              @click="emit('ack', a.id)"
            >
              <Check class="mx-auto size-3" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <section :class="panel">
      <div class="mb-2 text-[12px] font-medium text-molybdenum">下发记录</div>
      <div class="max-h-[140px] space-y-1 overflow-y-auto">
        <div
          v-if="commands.length === 0"
          class="py-3 text-center text-[11px] text-text-muted"
        >
          暂无记录
        </div>
        <div
          v-for="c in commands"
          :key="c.id"
          class="flex items-center gap-1.5 rounded border border-border px-1.5 py-1 font-mono text-[10px]"
        >
          <History class="size-3 text-text-muted" />
          <span class="flex-1 truncate">{{ c.tagCode }}={{ c.targetValue }}</span>
          <span :class="c.status === 'simulated' ? 'text-patina' : 'text-red-500'">
            {{ c.status }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>
