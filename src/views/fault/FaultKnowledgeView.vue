<script setup lang="ts">
import { Plus, FileWarning, BookOpen, ClipboardList, Users } from 'lucide-vue-next'
import { Panel } from '@/components/ui-kit'
import { FP_KNOWLEDGE } from '@/lib/mock-extended'

const kn = FP_KNOWLEDGE

const kpis = [
  { label: 'FMEA 条目', value: kn.fmeaItems, color: 'text-molybdenum', icon: FileWarning },
  { label: '案例数', value: kn.cases, color: 'text-coolant', icon: BookOpen },
  { label: 'SOP 文档', value: kn.sops, color: 'text-patina', icon: ClipboardList },
  { label: '专家贡献', value: kn.expertContribs, color: 'text-sulfur', icon: Users },
]

function rpnColor(rpn: number) {
  if (rpn >= 110) return 'text-iron'
  if (rpn >= 100) return 'text-sulfur'
  return 'text-patina'
}

const btnPrimary =
  'inline-flex items-center h-7 px-2.5 text-xs rounded bg-iron text-background hover:bg-iron/90 transition-colors'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">故障知识库</h1>
        <p class="text-sm text-muted-foreground mt-1">FMEA · SOP · 专家经验沉淀</p>
      </div>
      <button :class="btnPrimary"><Plus class="size-3.5 mr-1" />新增文档</button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Panel v-for="s in kpis" :key="s.label" class-name="!p-3">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <component :is="s.icon" class="size-3" />{{ s.label }}
        </div>
        <div :class="['data-num text-xl font-semibold mt-1', s.color]">{{ s.value }}</div>
      </Panel>
    </div>

    <Panel title="FMEA 条目">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="f in kn.fmeaList"
          :key="f.id"
          class="panel-surface rounded border border-border-hairline p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium">{{ f.mode }}</span>
            <span :class="['data-num text-sm font-semibold', rpnColor(f.rpn)]">
              RPN {{ f.rpn }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
            <span>S {{ f.severity }}</span>
            <span>O {{ f.occurrence }}</span>
            <span>D {{ f.detection }}</span>
          </div>
          <p class="text-[11px] text-muted-foreground">{{ f.cause }}</p>
        </div>
      </div>
    </Panel>

    <Panel title="SOP 文档">
      <div class="space-y-2">
        <div
          v-for="s in kn.sopList"
          :key="s.id"
          class="flex items-center gap-3 panel-surface rounded border border-border-hairline p-2.5"
        >
          <ClipboardList class="size-4 text-molybdenum shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium truncate">{{ s.title }}</div>
            <div class="text-[11px] text-muted-foreground mt-0.5">
              {{ s.category }} · {{ s.steps }} 步
            </div>
          </div>
          <span
            class="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] bg-patina/15 text-patina border-patina/40 shrink-0"
          >
            已审核
          </span>
        </div>
      </div>
    </Panel>
  </div>
</template>
