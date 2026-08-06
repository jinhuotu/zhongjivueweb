<script setup lang="ts">
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{
    label: string
    value: string | number
    unit?: string
    hint?: string
    tone?: 'iron' | 'molybdenum' | 'patina' | 'sulfur' | 'coolant'
  }>(),
  { tone: 'molybdenum' },
)

const toneClass: Record<string, string> = {
  iron: 'text-iron',
  molybdenum: 'text-molybdenum',
  patina: 'text-patina',
  sulfur: 'text-sulfur',
  coolant: 'text-coolant',
}

const toneBg: Record<string, string> = {
  iron: 'bg-iron',
  molybdenum: 'bg-molybdenum',
  patina: 'bg-patina',
  sulfur: 'bg-sulfur',
  coolant: 'bg-coolant',
}
</script>

<template>
  <div class="panel-surface rounded-lg p-4 lg:p-5 relative overflow-hidden">
    <div class="flex items-start justify-between">
      <div class="text-xs text-muted-foreground">{{ label }}</div>
      <div v-if="$slots.icon" :class="cn('opacity-80', toneClass[tone])">
        <slot name="icon" />
      </div>
    </div>
    <div class="mt-3 flex items-baseline gap-1.5">
      <span :class="cn('data-num text-3xl font-semibold', toneClass[tone])">
        {{ value }}
      </span>
      <span v-if="unit" class="text-xs text-muted-foreground data-num">{{ unit }}</span>
    </div>
    <div v-if="hint" class="mt-2 text-[11px] text-muted-foreground">{{ hint }}</div>
    <div
      :class="
        cn(
          'absolute -right-6 -bottom-6 size-24 rounded-full opacity-[0.06]',
          toneBg[tone],
        )
      "
    />
  </div>
</template>
