<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta.title as string) || '页面')
</script>

<template>
  <div class="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-border bg-card/70 p-8">
    <h1 class="text-xl font-semibold tracking-wide text-foreground/90">{{ title }}</h1>
    <p class="mt-3 text-sm text-muted-foreground">占位中</p>
  </div>
</template>
