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
    class="scada-root relative overflow-hidden rounded-xl border border-border bg-card shadow-sm"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--accent-molybdenum)_12%,transparent),transparent_55%)]"
    />
    <header
      class="relative z-10 flex items-center justify-center gap-2 border-b border-border px-3 py-2"
    >
      <div
        class="border border-molybdenum/40 bg-gradient-to-b from-molybdenum/15 to-bg-elevated px-6 py-1.5 text-[15px] font-semibold tracking-widest text-text-primary shadow-sm [clip-path:polygon(8%_0,92%_0,100%_50%,92%_100%,8%_100%,0_50%)]"
      >
        {{ title }}
      </div>
      <button
        type="button"
        class="absolute right-3 inline-flex size-7 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-accent hover:text-foreground"
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
      class="relative z-10 flex justify-end border-t border-border px-4 py-1.5 font-mono text-[11px] text-text-muted"
    >
      {{ clock }}
    </footer>
  </div>
</template>
