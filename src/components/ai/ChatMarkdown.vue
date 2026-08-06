<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/lib/markdown-render'

const props = defineProps<{
  content: string
  streaming?: boolean
}>()

const html = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="chat-md text-[13px] leading-[1.75] text-text-primary">
    <div v-html="html" />
    <span
      v-if="streaming"
      class="inline-block w-1.5 h-3.5 bg-iron ml-0.5 animate-pulse align-middle"
    />
  </div>
</template>

<style scoped>
.chat-md :deep(.md-p) {
  margin: 0.45em 0;
  color: var(--color-text-primary, #e6edf3);
}
.chat-md :deep(.md-p:first-child) {
  margin-top: 0;
}
.chat-md :deep(.md-strong) {
  color: #f0f6fc;
  font-weight: 600;
}
.chat-md :deep(.md-em) {
  font-style: italic;
  color: var(--color-text-secondary, #9aa7b5);
}
.chat-md :deep(.md-code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(74, 158, 255, 0.12);
  color: #9ecbff;
  border: 1px solid rgba(74, 158, 255, 0.22);
}
.chat-md :deep(.md-pre) {
  margin: 0.65em 0;
  padding: 0.75rem 0.9rem;
  border-radius: 8px;
  background: rgba(11, 15, 20, 0.85);
  border: 1px solid var(--color-border-hairline, #2a3441);
  overflow-x: auto;
  font-size: 11.5px;
  line-height: 1.55;
}
.chat-md :deep(.md-pre code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #c9d4e0;
}
.chat-md :deep(.md-h1),
.chat-md :deep(.md-h2),
.chat-md :deep(.md-h3),
.chat-md :deep(.md-h4) {
  color: #f0f6fc;
  font-weight: 600;
  margin: 0.85em 0 0.4em;
  line-height: 1.35;
}
.chat-md :deep(.md-h1) {
  font-size: 1.15em;
}
.chat-md :deep(.md-h2) {
  font-size: 1.08em;
  padding-left: 0.5rem;
  border-left: 2px solid var(--color-iron, #ff6b35);
}
.chat-md :deep(.md-h3),
.chat-md :deep(.md-h4) {
  font-size: 1.02em;
}
.chat-md :deep(.md-ul),
.chat-md :deep(.md-ol) {
  margin: 0.4em 0 0.55em;
  padding-left: 1.25rem;
}
.chat-md :deep(.md-li) {
  margin: 0.2em 0;
  color: var(--color-text-primary, #e6edf3);
}
.chat-md :deep(.md-ul) {
  list-style: disc;
}
.chat-md :deep(.md-ol) {
  list-style: decimal;
}
.chat-md :deep(.md-quote) {
  margin: 0.6em 0;
  padding: 0.55rem 0.75rem;
  border-left: 3px solid rgba(255, 107, 53, 0.65);
  background: rgba(255, 107, 53, 0.06);
  border-radius: 0 6px 6px 0;
  color: var(--color-text-secondary, #9aa7b5);
}
.chat-md :deep(.md-hr) {
  margin: 0.85em 0;
  border: 0;
  border-top: 1px solid var(--color-border-hairline, #2a3441);
}
.chat-md :deep(.md-table-wrap) {
  margin: 0.7em 0;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--color-border-hairline, #2a3441);
  background: rgba(11, 15, 20, 0.45);
}
.chat-md :deep(.md-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 420px;
}
.chat-md :deep(.md-th) {
  text-align: left;
  padding: 0.55rem 0.75rem;
  font-weight: 600;
  color: #cfe6ff;
  background: rgba(74, 158, 255, 0.1);
  border-bottom: 1px solid var(--color-border-hairline, #2a3441);
  white-space: nowrap;
}
.chat-md :deep(.md-td) {
  padding: 0.5rem 0.75rem;
  vertical-align: top;
  color: var(--color-text-primary, #e6edf3);
  border-bottom: 1px solid rgba(42, 52, 65, 0.7);
  line-height: 1.55;
}
.chat-md :deep(.md-tr:last-child .md-td) {
  border-bottom: 0;
}
.chat-md :deep(.md-tr:nth-child(even) .md-td) {
  background: rgba(255, 255, 255, 0.015);
}
</style>
