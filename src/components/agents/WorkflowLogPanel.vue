<script setup lang="ts">
import { ref } from 'vue'
import {
  ChevronDown,
  ChevronRight,
  Workflow,
  Cpu,
  Sparkles,
} from 'lucide-vue-next'
import { Tag } from '@/components/ui-kit'
import type { WorkflowStep } from './types'

const props = withDefaults(
  defineProps<{
    title?: string
    steps: WorkflowStep[]
    defaultOpen?: boolean
  }>(),
  {
    title: '流程日志',
    defaultOpen: false,
  },
)

const open = ref(props.defaultOpen)
</script>

<template>
  <div class="border border-hairline rounded-lg overflow-hidden">
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-surface/50 transition-colors"
      @click="open = !open"
    >
      <div class="flex items-center gap-2">
        <Workflow class="size-4 text-muted-foreground" />
        <span class="text-xs font-medium">{{ title }}</span>
        <Tag class-name="text-[10px] h-4 px-1.5">{{ steps.length }} 步</Tag>
      </div>
      <ChevronDown v-if="open" class="size-4 text-muted-foreground" />
      <ChevronRight v-else class="size-4 text-muted-foreground" />
    </button>
    <div
      v-if="open"
      class="border-t border-hairline px-2 py-2 max-h-64 overflow-y-auto bg-bg-surface/30"
    >
      <template v-for="step in steps" :key="step.id">
        <div class="space-y-1">
          <div
            class="flex items-start gap-2 py-1.5 pl-2 hover:bg-bg-surface/50 rounded"
          >
            <span class="mt-0.5">
              <Sparkles
                v-if="step.type === 'ai'"
                class="size-3 text-molybdenum"
              />
              <ChevronRight
                v-else-if="step.type === 'branch'"
                class="size-3 text-patina"
              />
              <Cpu
                v-else-if="step.type === 'loop'"
                class="size-3 text-sulfur"
              />
              <Workflow v-else class="size-3 text-muted-foreground" />
            </span>
            <div class="min-w-0">
              <div class="text-xs font-medium">{{ step.title }}</div>
              <div
                v-if="step.desc"
                class="text-[11px] text-muted-foreground"
              >
                {{ step.desc }}
              </div>
            </div>
          </div>
          <div
            v-if="step.children?.length"
            class="ml-4 pl-2 border-l border-hairline space-y-0.5"
          >
            <div
              v-for="child in step.children"
              :key="child.id"
              class="flex items-start gap-2 py-1.5 pl-2 hover:bg-bg-surface/50 rounded"
            >
              <span class="mt-0.5">
                <Sparkles
                  v-if="child.type === 'ai'"
                  class="size-3 text-molybdenum"
                />
                <ChevronRight
                  v-else-if="child.type === 'branch'"
                  class="size-3 text-patina"
                />
                <Cpu
                  v-else-if="child.type === 'loop'"
                  class="size-3 text-sulfur"
                />
                <Workflow v-else class="size-3 text-muted-foreground" />
              </span>
              <div class="min-w-0">
                <div class="text-xs font-medium">{{ child.title }}</div>
                <div
                  v-if="child.desc"
                  class="text-[11px] text-muted-foreground"
                >
                  {{ child.desc }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
