<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ProductionScadaPage from '@/components/production/ProductionScadaPage.vue'
import {
  isProductionSystem,
  type ProductionSystemKey,
} from '@/lib/production-systems'

const props = defineProps<{
  system?: ProductionSystemKey
}>()

const route = useRoute()

const system = computed<ProductionSystemKey | null>(() => {
  if (props.system && isProductionSystem(props.system)) return props.system
  const param = route.params.system
  const raw = Array.isArray(param) ? param[0] : param
  if (typeof raw === 'string' && isProductionSystem(raw)) return raw
  return null
})
</script>

<template>
  <ProductionScadaPage
    v-if="system"
    :key="system"
    :system="system"
  />
  <div
    v-else
    class="rounded-lg border border-iron/30 bg-iron/5 px-4 py-8 text-center text-sm text-iron"
  >
    未知生产系统：请使用 tunnel / batching / shuttle
  </div>
</template>
