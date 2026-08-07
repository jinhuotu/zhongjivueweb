<script setup lang="ts">
import { AlertTriangle, Sparkles } from 'lucide-vue-next'
import AppDialog from '@/components/ui/AppDialog.vue'
import type { WorkflowStep } from './types'

defineProps<{
  open: boolean
  title: string
  description: string
  steps: WorkflowStep[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <AppDialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #title>
      <span class="inline-flex items-center gap-2">
        <AlertTriangle class="size-5 text-sulfur" />
        {{ title }}
      </span>
    </template>
    <p class="text-sm text-muted-foreground -mt-1 mb-3">{{ description }}</p>
    <div class="bg-bg-surface/50 rounded-lg p-3 max-h-64 overflow-y-auto">
      <div
        class="text-xs font-medium mb-2 text-molybdenum flex items-center gap-1.5"
      >
        <Sparkles class="size-3" />
        智能体自动处理流程
      </div>
      <div class="space-y-1">
        <div
          v-for="(s, i) in steps"
          :key="s.id"
          class="flex items-start gap-2 text-xs"
        >
          <span class="text-muted-foreground mt-0.5">{{ i + 1 }}.</span>
          <div>
            <span class="font-medium">{{ s.title }}</span>
            <div
              v-if="s.desc"
              class="text-[11px] text-muted-foreground"
            >
              {{ s.desc }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppDialog>
</template>
