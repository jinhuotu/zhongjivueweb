<script setup lang="ts">
import { Network, BookOpen, Stethoscope, Target, Sparkles } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_DIAGNOSIS } from '@/lib/mock-extended'

const dx = FP_DIAGNOSIS

const kpis = [
  { label: '知识节点', value: dx.knowledgeNodes, unit: '', color: 'text-molybdenum', icon: Network },
  { label: '案例库', value: dx.cases, unit: '例', color: 'text-coolant', icon: BookOpen },
  { label: '本月诊断', value: dx.diagnoses, unit: '次', color: 'text-patina', icon: Stethoscope },
  { label: '诊断准确率', value: dx.accuracy, unit: '%', color: 'text-sulfur', icon: Target },
]

const ftaMid = [
  { label: '燃烧系统', leaves: ['传感器故障'] },
  { label: '传动系统', leaves: ['执行器卡死'] },
  { label: '控制系统', leaves: ['传感器故障', '执行器卡死'] },
]

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">故障诊断与根因分析</h1>
        <p class="text-sm text-muted-foreground mt-1">案例检索 · FTA 树 · 智能诊断</p>
      </div>
      <button :class="btnPrimary"><Sparkles class="size-3.5 mr-1" />智能诊断</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <component :is="s.icon" class="size-3" />{{ s.label }}
        </div>
        <div class="mt-1 flex items-baseline gap-1">
          <span :class="['data-num text-xl font-semibold', s.color]">{{ s.value }}</span>
          <span v-if="s.unit" class="text-xs text-muted-foreground">{{ s.unit }}</span>
        </div>
      </Panel>
    </div>

    <Panel title="相似案例">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="c in dx.casesList"
          :key="c.id"
          class="panel-surface rounded border border-border-hairline p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium">{{ c.title }}</span>
            <span
              class="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] bg-patina/15 text-patina border-patina/40"
            >
              相似度 {{ c.similarity }}%
            </span>
          </div>
          <div class="space-y-1 text-[11px]">
            <div>
              <span class="text-muted-foreground">症状 </span>{{ c.symptom }}
            </div>
            <div>
              <span class="text-muted-foreground">根因 </span>{{ c.rootCause }}
            </div>
            <div>
              <span class="text-muted-foreground">方案 </span>{{ c.solution }}
            </div>
            <div class="text-muted-foreground">{{ c.date }}</div>
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="故障树分析 (FTA)" subtitle="顶事件：窑炉停机">
      <div class="flex flex-col items-center gap-3 py-2">
        <div
          class="panel-surface rounded border border-iron/40 px-4 py-2 text-xs font-medium text-iron"
        >
          窑炉停机
        </div>
        <div class="w-px h-4 bg-border-hairline" />
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div v-for="m in ftaMid" :key="m.label" class="flex flex-col items-center gap-2">
            <div
              class="panel-surface rounded border border-border-hairline px-3 py-1.5 text-xs font-medium"
            >
              {{ m.label }}
            </div>
            <div class="w-px h-3 bg-border-hairline" />
            <div class="flex flex-wrap justify-center gap-2">
              <span
                v-for="leaf in m.leaves"
                :key="leaf"
                class="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] bg-sulfur/10 text-sulfur border-sulfur/40"
              >
                {{ leaf }}
              </span>
            </div>
          </div>
        </div>
        <p class="text-[10px] text-muted-foreground mt-2">
          叶子事件示例：传感器故障 / 执行器卡死
        </p>
      </div>
    </Panel>
  </div>
</template>
