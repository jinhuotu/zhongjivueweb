<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNode } from './types'

const props = withDefaults(
  defineProps<{
    nodes: WorkflowNode[]
    currentIndex?: number
    selectedId?: string
  }>(),
  { currentIndex: 0 },
)

const emit = defineEmits<{
  nodeClick: [id: string]
}>()

const activeIndex = computed(() => {
  if (props.selectedId) {
    const idx = props.nodes.findIndex((n) => n.id === props.selectedId)
    if (idx >= 0) return idx
  }
  const current = props.nodes.findIndex((n) => n.status === 'current')
  if (current >= 0) return current
  return props.currentIndex
})

function nodePos(i: number, total: number) {
  const angle = (i / total) * 2 * Math.PI - Math.PI / 2
  return {
    x: 160 + 120 * Math.cos(angle),
    y: 160 + 120 * Math.sin(angle),
  }
}

function fill(i: number) {
  if (i > activeIndex.value) return 'var(--bg-surface)'
  if (i === activeIndex.value)
    return 'color-mix(in srgb, var(--accent-molybdenum) 20%, transparent)'
  return 'color-mix(in srgb, var(--accent-patina) 15%, transparent)'
}

function stroke(i: number) {
  if (i > activeIndex.value) return 'var(--border)'
  if (i === activeIndex.value) return 'var(--accent-molybdenum)'
  return 'color-mix(in srgb, var(--accent-patina) 50%, transparent)'
}

function textFill(i: number) {
  if (i > activeIndex.value) return 'var(--muted-foreground)'
  if (i === activeIndex.value) return 'var(--accent-molybdenum)'
  return 'var(--accent-patina)'
}
</script>

<template>
  <div class="relative w-80 h-80 mx-auto">
    <svg viewBox="0 0 320 320" class="w-full h-full">
      <circle
        cx="160"
        cy="160"
        r="120"
        fill="none"
        stroke="var(--border)"
        stroke-width="2"
        stroke-dasharray="4 4"
      />
      <g
        v-for="(node, i) in nodes"
        :key="node.id"
        class="cursor-pointer"
        @click="emit('nodeClick', node.id)"
      >
        <circle
          :cx="nodePos(i, nodes.length).x"
          :cy="nodePos(i, nodes.length).y"
          r="22"
          :fill="fill(i)"
          :stroke="stroke(i)"
          :stroke-width="i === activeIndex ? 2 : 1.5"
        />
        <text
          :x="nodePos(i, nodes.length).x"
          :y="nodePos(i, nodes.length).y"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="10"
          :fill="textFill(i)"
          font-weight="500"
        >
          {{ i + 1 }}
        </text>
        <text
          :x="nodePos(i, nodes.length).x"
          :y="
            nodePos(i, nodes.length).y +
            (nodePos(i, nodes.length).y > 160 ? 36 : -32)
          "
          text-anchor="middle"
          font-size="11"
          fill="var(--foreground)"
          font-weight="500"
        >
          {{ node.label }}
        </text>
      </g>
      <text
        x="160"
        y="155"
        text-anchor="middle"
        font-size="14"
        fill="var(--foreground)"
        font-weight="600"
      >
        质量闭环
      </text>
      <text
        x="160"
        y="175"
        text-anchor="middle"
        font-size="11"
        fill="var(--muted-foreground)"
      >
        第 {{ activeIndex + 1 }} 阶段
      </text>
    </svg>
  </div>
</template>
