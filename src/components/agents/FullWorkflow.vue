<script setup lang="ts">
import { computed } from 'vue'
import {
  Bot,
  Cpu,
  GitBranch,
  GitMerge,
  RotateCcw,
  Zap,
} from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import type { FullWorkflowEdge, FullWorkflowNode } from './types'

const props = defineProps<{
  nodes: FullWorkflowNode[]
  edges: FullWorkflowEdge[]
  selectedNode?: string
}>()

const emit = defineEmits<{
  nodeClick: [id: string]
}>()

const nodeMap = computed(() =>
  Object.fromEntries(props.nodes.map((n) => [n.id, n])),
)

const maxY = computed(() => Math.max(...props.nodes.map((n) => n.y)) + 120)
const viewBox = computed(() => `0 0 960 ${maxY.value}`)

function nodeColor(n: FullWorkflowNode) {
  const base =
    n.type === 'ai'
      ? 'border-molybdenum/60 bg-molybdenum/5'
      : n.type === 'branch'
        ? 'border-sulfur/60 bg-sulfur/5'
        : n.type === 'merge'
          ? 'border-patina/60 bg-patina/5'
          : n.type === 'loop'
            ? 'border-iron/60 bg-iron/5'
            : 'border-hairline bg-bg-surface'
  const statusGlow =
    n.status === 'running'
      ? 'ring-2 ring-iron/40 shadow-[0_0_12px_rgba(255,107,53,0.15)]'
      : n.status === 'error'
        ? 'ring-2 ring-red-500/50'
        : ''
  return `${base} ${statusGlow}`
}

function typeLabel(type: FullWorkflowNode['type']) {
  if (type === 'ai') return 'AI 节点'
  if (type === 'static') return '静态节点'
  if (type === 'branch') return '分支节点'
  if (type === 'merge') return '合并节点'
  if (type === 'loop') return '循环节点'
  return ''
}

function edgePath(edge: FullWorkflowEdge) {
  const from = nodeMap.value[edge.from]
  const to = nodeMap.value[edge.to]
  if (!from || !to) return ''
  const w = from.width || 160
  const x1 = from.x + w / 2
  const y1 = from.y + 56
  const x2 = to.x + (to.width || 160) / 2
  const y2 = to.y
  const dy = Math.max(40, (y2 - y1) / 2)
  return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`
}
</script>

<template>
  <div
    class="relative w-full overflow-x-auto rounded-lg border border-hairline bg-bg-base/50"
  >
    <svg
      :viewBox="viewBox"
      class="min-w-[960px] w-full"
      :style="{ height: `${maxY}px`, maxHeight: '620px' }"
      preserveAspectRatio="xMidYMin meet"
    >
      <defs>
        <pattern
          id="opsGrid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(139,155,184,0.08)"
            stroke-width="1"
          />
        </pattern>
        <linearGradient id="dynStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#4A9EFF" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#4A9EFF" stop-opacity="0.3" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#opsGrid)" />

      <g transform="translate(16, 12)">
        <line
          x1="0"
          y1="6"
          x2="24"
          y2="6"
          stroke="#5A6E94"
          stroke-width="1.5"
        />
        <text x="30" y="10" font-size="11" fill="#8B9BB8">静态业务流</text>
        <line
          x1="120"
          y1="6"
          x2="144"
          y2="6"
          stroke="#4A9EFF"
          stroke-width="2"
          stroke-dasharray="4 3"
        />
        <text x="150" y="10" font-size="11" fill="#8B9BB8">AI 动态流</text>
      </g>

      <path
        v-for="edge in edges"
        :key="edge.id"
        :d="edgePath(edge)"
        fill="none"
        :stroke="
          edge.type === 'dynamic' ? 'url(#dynStroke)' : 'var(--hairline)'
        "
        :stroke-width="edge.type === 'dynamic' ? 2 : 1.5"
        :stroke-dasharray="edge.type === 'dynamic' ? '6 4' : '0'"
      />

      <foreignObject
        v-for="n in nodes"
        :key="n.id"
        :x="n.x"
        :y="n.y"
        :width="n.width || 160"
        height="56"
        class="cursor-pointer"
        @click="emit('nodeClick', n.id)"
      >
        <div
          :class="
            cn(
              'w-full h-full rounded-md border px-3 flex items-center gap-2 transition-all hover:brightness-125',
              nodeColor(n),
              selectedNode === n.id && 'ring-2 ring-iron',
            )
          "
        >
          <Bot v-if="n.type === 'ai'" class="size-4 text-molybdenum shrink-0" />
          <GitBranch
            v-else-if="n.type === 'branch'"
            class="size-4 text-sulfur shrink-0"
          />
          <GitMerge
            v-else-if="n.type === 'merge'"
            class="size-4 text-patina shrink-0"
          />
          <RotateCcw
            v-else-if="n.type === 'loop'"
            class="size-4 text-iron shrink-0"
          />
          <Cpu v-else class="size-4 text-muted-foreground shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium truncate">{{ n.title }}</div>
            <div class="text-[10px] text-muted-foreground">
              {{ typeLabel(n.type) }}
            </div>
          </div>
          <Zap
            v-if="n.status === 'running'"
            class="size-3 text-iron animate-pulse shrink-0"
          />
        </div>
      </foreignObject>
    </svg>
  </div>
</template>
