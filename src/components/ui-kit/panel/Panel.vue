<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  title?: string
  subtitle?: string
  flush?: boolean
  class?: string
}>()
</script>

<template>
  <section :class="cn('rounded-lg panel-surface overflow-hidden flex flex-col', $props.class)">
    <header
      v-if="title || $slots.action"
      class="flex items-center justify-between px-4 lg:px-5 py-3 border-b border-border"
    >
      <div class="min-w-0">
        <h3
          v-if="title"
          class="text-sm font-medium tracking-wide truncate flex items-center gap-2"
        >
          <span class="inline-block w-1 h-3 bg-iron rounded-sm" />
          {{ title }}
        </h3>
        <div v-if="subtitle" class="text-[11px] text-muted-foreground mt-0.5 pl-3">
          {{ subtitle }}
        </div>
      </div>
      <div v-if="$slots.action" class="ml-2 shrink-0">
        <slot name="action" />
      </div>
    </header>
    <div :class="cn('min-w-0', flush ? '' : 'p-4 lg:p-5')">
      <slot />
    </div>
  </section>
</template>
