<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  drawKiln,
  KILN_ASPECT,
  KILN_H,
  KILN_W,
} from './tunnel-kiln-layout'

defineProps<{
  class?: string
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapRef = ref<HTMLDivElement | null>(null)
let ro: ResizeObserver | null = null

function paint() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cssW = Math.max(1, wrap.clientWidth)
  const cssH = cssW / (KILN_W / KILN_H)
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  canvas.width = Math.max(1, Math.round(cssW * dpr))
  canvas.height = Math.max(1, Math.round(cssH * dpr))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const sx = (cssW * dpr) / KILN_W
  const sy = (cssH * dpr) / KILN_H
  ctx.setTransform(sx, 0, 0, sy, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  drawKiln(ctx)
}

onMounted(() => {
  paint()
  const wrap = wrapRef.value
  if (!wrap) return
  ro = new ResizeObserver(() => paint())
  ro.observe(wrap)
})

onUnmounted(() => {
  ro?.disconnect()
  ro = null
})
</script>

<template>
  <div ref="wrapRef" :class="$props.class" :style="{ aspectRatio: KILN_ASPECT }">
    <canvas
      ref="canvasRef"
      class="block h-full w-full"
      aria-label="隧道窑窑体示意"
    />
  </div>
</template>
