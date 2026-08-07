<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * 轻量级 3 列桑基图（SVG）
 * - 列内节点按 value 加权排列
 * - 连边以贝塞尔曲线绘制，宽度 = value
 * - hover 高亮 / 显示 tooltip
 */

export interface SankeyNode {
  id: string
  name: string
  value: number
  color: string
}
export interface SankeyColumn {
  title: string
  nodes: SankeyNode[]
}
export interface SankeyLink {
  source: string
  target: string
  value: number
}

interface NodePosInfo extends SankeyNode {
  x: number
  y: number
  h: number
  col: number
  used: { in: number; out: number }
}

interface PathInfo {
  id: string
  d: string
  w: number
  color: string
  srcId: string
  tgtId: string
  value: number
}

const props = withDefaults(
  defineProps<{
    columns: SankeyColumn[]
    links: SankeyLink[]
    width?: number
    height?: number
    nodeWidth?: number
    nodeGap?: number
    unit?: string
  }>(),
  {
    width: 1080,
    height: 540,
    nodeWidth: 18,
    nodeGap: 10,
    unit: 'GJ/h',
  },
)

const hoverId = ref<string | null>(null)

const layout = computed(() => {
  const { columns, links, width, height, nodeWidth, nodeGap } = props
  const padTop = 36
  const padBottom = 18
  const innerH = height - padTop - padBottom
  const colCount = columns.length
  const colSpacing = (width - nodeWidth) / (colCount - 1)

  const colTotals = columns.map((c) => c.nodes.reduce((s, n) => s + n.value, 0))
  const maxTotal = Math.max(...colTotals)
  const scale = (innerH - nodeGap * 6) / maxTotal

  const nodePos: Record<string, NodePosInfo> = {}
  columns.forEach((col, ci) => {
    const colTotal = colTotals[ci]
    const colH = colTotal * scale + nodeGap * (col.nodes.length - 1)
    let y = padTop + (innerH - colH) / 2
    col.nodes.forEach((n) => {
      const h = n.value * scale
      nodePos[n.id] = {
        ...n,
        x: ci * colSpacing,
        y,
        h,
        col: ci,
        used: { in: 0, out: 0 },
      }
      y += h + nodeGap
    })
  })

  const sortedLinks = [...links].sort((a, b) => {
    const aSrc = nodePos[a.source]
    const bSrc = nodePos[b.source]
    if (!aSrc || !bSrc) return 0
    return aSrc.y - bSrc.y
  })

  const pathList = sortedLinks
    .map((l, i) => {
      const s = nodePos[l.source]
      const t = nodePos[l.target]
      if (!s || !t) return null
      const w = l.value * scale
      const sy = s.y + s.used.out + w / 2
      const ty = t.y + t.used.in + w / 2
      s.used.out += w
      t.used.in += w
      const sx = s.x + nodeWidth
      const tx = t.x
      const cx = (sx + tx) / 2
      const d = `M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ty}, ${tx} ${ty}`
      return {
        id: `${l.source}->${l.target}-${i}`,
        d,
        w,
        color: s.color,
        srcId: l.source,
        tgtId: l.target,
        value: l.value,
      }
    })
    .filter((p): p is PathInfo => p !== null)

  return { nodePositions: nodePos, paths: pathList }
})

function isHi(s: string, t: string) {
  return !hoverId.value || hoverId.value === s || hoverId.value === t
}

function colSpacing() {
  return (props.width - props.nodeWidth) / (props.columns.length - 1)
}

function colTextAnchor(ci: number) {
  if (ci === 0) return 'start'
  if (ci === props.columns.length - 1) return 'end'
  return 'middle'
}
</script>

<template>
  <div class="relative overflow-x-auto">
    <svg :width="width" :height="height" class="block">
      <!-- 列标题 -->
      <text
        v-for="(c, ci) in columns"
        :key="c.title"
        :x="ci * colSpacing() + nodeWidth / 2"
        y="20"
        :text-anchor="colTextAnchor(ci)"
        class="fill-text-secondary text-[12px] tracking-wider"
      >
        {{ c.title }}
      </text>

      <!-- 连边 -->
      <g>
        <path
          v-for="p in layout.paths"
          :key="p.id"
          :d="p.d"
          :stroke="p.color"
          :stroke-width="Math.max(p.w, 1)"
          :stroke-opacity="isHi(p.srcId, p.tgtId) ? 0.34 : 0.06"
          fill="none"
          style="transition: stroke-opacity 0.2s"
        >
          <title>
            {{
              `${layout.nodePositions[p.srcId]?.name} → ${layout.nodePositions[p.tgtId]?.name}: ${p.value} ${unit}`
            }}
          </title>
        </path>
      </g>

      <!-- 节点 -->
      <g>
        <g
          v-for="n in Object.values(layout.nodePositions)"
          :key="n.id"
          class="cursor-pointer"
          @mouseenter="hoverId = n.id"
          @mouseleave="hoverId = null"
        >
          <rect
            :x="n.x"
            :y="n.y"
            :width="nodeWidth"
            :height="Math.max(n.h, 2)"
            :fill="n.color"
            :fill-opacity="hoverId === n.id ? 1 : 0.82"
            rx="2"
          />
          <text
            :x="n.col === columns.length - 1 ? n.x - 6 : n.x + nodeWidth + 6"
            :y="n.y + n.h / 2"
            dy="4"
            :text-anchor="n.col === columns.length - 1 ? 'end' : 'start'"
            class="fill-text-primary text-[11px] font-medium pointer-events-none"
          >
            {{ n.name }}
            <tspan class="fill-text-muted ml-2" dx="6"> {{ n.value }} {{ unit }} </tspan>
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>
