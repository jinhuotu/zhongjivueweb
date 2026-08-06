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
  'rounded-lg border border-[#2a6bb0]/45 bg-[#071a33]/85 p-3 text-[#cfe6ff] shadow-[0_0_16px_rgba(30,90,180,0.12)]'
const input =
  'rounded border border-[#2a6bb0]/50 bg-[#041428] text-[#cfe6ff] text-[11px]'

const chartKeys = computed(() => [
  { key: 'v', color: COLOR.molybdenum, label: props.seriesTag },
])
</script>

<template>
  <div class="space-y-3">
    <section :class="panel">
      <div class="flex items-center justify-between mb-2">
        <div class="text-[12px] font-medium text-cyan-200">历史数据回溯</div>
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
          class="h-full flex items-center justify-center text-[11px] text-[#7aa7d8]"
        >
          暂无曲线
        </div>
      </div>
    </section>

    <section :class="`${panel} space-y-2`">
      <div class="text-[12px] font-medium text-cyan-200">操作按钮 / 模拟下发</div>
      <select
        :value="ctrlTag"
        :class="`w-full h-8 px-2 ${input}`"
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
        :class="`w-full h-8 px-2 font-mono ${input}`"
        @input="emit('update:ctrlValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        :disabled="sending || !ctrlTag"
        class="w-full h-8 inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1e6ad4] text-white text-[12px] font-medium disabled:opacity-50 hover:bg-[#2a7ae8]"
        @click="emit('send')"
      >
        <Loader2 v-if="sending" class="size-3.5 animate-spin" />
        <Send v-else class="size-3.5" />
        模拟下发
      </button>
      <p class="text-[10px] text-[#7aa7d8]">executor=simulate；接入 PLC 后可切换真通道</p>
    </section>

    <section :class="panel">
      <div class="text-[12px] font-medium text-cyan-200 mb-2">
        报警异常 · 活跃 {{ activeAlarmCount }}
      </div>
      <div class="space-y-1.5 max-h-[200px] overflow-y-auto">
        <div
          v-if="alarms.length === 0"
          class="py-4 text-center text-[11px] text-[#7aa7d8]"
        >
          暂无报警
        </div>
        <div
          v-for="a in alarms"
          :key="a.id"
          :class="[
            'rounded border p-2',
            a.status === 'active'
              ? 'border-red-500/50 bg-red-950/40 animate-pulse'
              : 'border-[#2a6bb0]/35 bg-[#041428]/60',
          ]"
        >
          <div class="flex gap-2">
            <Siren
              :class="[
                'size-3.5 mt-0.5',
                a.level === 'alarm' ? 'text-red-400' : 'text-amber-300',
              ]"
            />
            <div class="flex-1 min-w-0">
              <div class="text-[11px] text-[#e8f4ff]">{{ a.title }}</div>
              <div class="text-[10px] text-[#7aa7d8]">{{ a.raisedAt }}</div>
            </div>
            <button
              v-if="a.status === 'active'"
              type="button"
              class="size-6 rounded border border-[#2a6bb0]/50 text-cyan-300"
              title="确认"
              @click="emit('ack', a.id)"
            >
              <Check class="size-3 mx-auto" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <section :class="panel">
      <div class="text-[12px] font-medium text-cyan-200 mb-2">下发记录</div>
      <div class="space-y-1 max-h-[140px] overflow-y-auto">
        <div
          v-if="commands.length === 0"
          class="py-3 text-center text-[11px] text-[#7aa7d8]"
        >
          暂无记录
        </div>
        <div
          v-for="c in commands"
          :key="c.id"
          class="flex items-center gap-1.5 text-[10px] font-mono px-1.5 py-1 rounded border border-[#2a6bb0]/35"
        >
          <History class="size-3 text-[#7aa7d8]" />
          <span class="flex-1 truncate">{{ c.tagCode }}={{ c.targetValue }}</span>
          <span :class="c.status === 'simulated' ? 'text-emerald-400' : 'text-red-400'">
            {{ c.status }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>
