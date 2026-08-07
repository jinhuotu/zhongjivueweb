<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { WorkflowNode } from './types'

withDefaults(
  defineProps<{
    nodes: WorkflowNode[]
    direction?: 'horizontal' | 'vertical'
    className?: string
  }>(),
  { direction: 'horizontal' },
)

const emit = defineEmits<{
  nodeClick: [node: WorkflowNode]
}>()

const statusBtn: Record<WorkflowNode['status'], string> = {
  done: 'border-patina/40 bg-patina/10 text-patina hover:bg-patina/20',
  current:
    'border-molybdenum/60 bg-molybdenum/15 text-molybdenum ring-1 ring-molybdenum/30',
  pending:
    'border-hairline bg-bg-surface/50 text-muted-foreground hover:border-border/80',
  warning: 'border-sulfur/50 bg-sulfur/10 text-sulfur animate-pulse',
  error: 'border-iron/50 bg-iron/10 text-iron animate-pulse',
}

const statusDot: Record<WorkflowNode['status'], string> = {
  done: 'bg-patina',
  current: 'bg-molybdenum',
  pending: 'bg-muted-foreground/40',
  warning: 'bg-sulfur',
  error: 'bg-iron',
}
</script>

<template>
  <div
    :class="
      cn(
        'flex',
        direction === 'horizontal'
          ? 'items-center justify-between gap-2 overflow-x-auto'
          : 'flex-col items-start gap-1',
        className,
      )
    "
  >
    <div
      v-for="(node, i) in nodes"
      :key="node.id"
      class="flex items-center gap-2 shrink-0"
    >
      <button
        type="button"
        :class="
          cn(
            'flex items-center gap-2 px-3 py-2 rounded-md border transition-colors text-left',
            statusBtn[node.status],
          )
        "
        @click="emit('nodeClick', node)"
      >
        <span
          :class="cn('w-2 h-2 rounded-full shrink-0', statusDot[node.status])"
        />
        <span class="text-xs font-medium whitespace-nowrap">{{
          node.label
        }}</span>
      </button>
      <div
        v-if="i < nodes.length - 1"
        :class="
          cn(
            'h-px shrink-0',
            direction === 'horizontal' ? 'w-4 md:w-6 lg:w-8' : 'w-px h-3',
            node.status === 'done' ? 'bg-patina/40' : 'bg-hairline',
          )
        "
      />
    </div>
  </div>
</template>
