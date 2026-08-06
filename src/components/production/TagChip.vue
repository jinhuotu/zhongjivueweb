<script setup lang="ts">
defineProps<{
  label: string
  value: string
  unit?: string
  accent?: boolean
}>()
</script>

<template>
  <div
    :class="[
      'rounded px-1.5 py-0.5 text-[10px] border',
      accent
        ? 'bg-[#5a1a1a]/85 border-[#c45]/50 text-[#ffd0d0]'
        : 'bg-[#061830]/90 border-[#2a6bb0]/45 text-[#cfe6ff]',
    ]"
  >
    <div class="opacity-70">{{ label }}</div>
    <div class="font-mono text-[11px] leading-tight">
      {{ value }}
      <span v-if="unit" class="opacity-70 ml-0.5">{{ unit }}</span>
    </div>
  </div>
</template>
