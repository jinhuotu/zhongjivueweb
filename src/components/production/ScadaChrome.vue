<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'

defineProps<{
  title: string
  clock: string
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <div
    class="scada-root relative overflow-hidden rounded-xl border border-[#1a4a8a]/60 bg-[#041428] shadow-[inset_0_0_60px_rgba(20,80,160,0.25)]"
  >
    <div
      class="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,rgba(40,120,220,0.18),transparent_55%)]"
    />
    <header
      class="relative z-10 flex items-center justify-center gap-2 px-3 py-2 border-b border-[#1e5aa8]/40"
    >
      <div
        class="px-6 py-1.5 text-[15px] font-semibold tracking-widest text-[#d8ecff] bg-gradient-to-b from-[#0d3a72] to-[#071f40] border border-[#3d7fd4]/70 shadow-[0_0_18px_rgba(60,140,255,0.25)] [clip-path:polygon(8%_0,92%_0,100%_50%,92%_100%,8%_100%,0_50%)]"
      >
        {{ title }}
      </div>
      <button
        type="button"
        class="absolute right-3 size-7 rounded border border-[#25508a]/60 text-[#8eb6e8] hover:bg-[#123560] inline-flex items-center justify-center"
        title="刷新"
        @click="emit('refresh')"
      >
        <RefreshCw :class="['size-3.5', loading ? 'animate-spin' : '']" />
      </button>
    </header>
    <div class="relative z-10 min-h-[520px] p-3">
      <slot />
    </div>
    <footer
      class="relative z-10 flex justify-end px-4 py-1.5 border-t border-[#1e5aa8]/30 text-[11px] font-mono text-[#7aa7d8]"
    >
      {{ clock }}
    </footer>
  </div>
</template>
