<script setup lang="ts">
import type { WorkspacePoint } from '@/lib/kiln-cycles-api'

defineProps<{ current: WorkspacePoint; kilnName: string; modelName: string }>()
defineEmits<{ zone: [name: string] }>()
function value(v: number | null | undefined, digits = 1) {
  return v == null ? '—' : v.toLocaleString('zh-CN', { maximumFractionDigits: digits })
}
</script>

<template>
  <div class="kiln-process">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-7">
      <div>
        <div class="text-xs process-muted">六温区燃气梭式窑 · 数据回放</div>
        <div class="mt-1 text-base font-medium">{{ kilnName }}</div>
      </div>
      <div class="text-xs text-right leading-6">
        <div>{{ modelName }} · {{ current.stage }}</div>
        <div class="process-muted">设定 {{ value(current.tempSp, 0) }} ℃ · 窑压 {{ value(current.furnaceP) }} Pa</div>
      </div>
    </div>
    <div class="flex flex-wrap gap-x-8 gap-y-2 text-xs mb-5">
      <span class="gas-text">燃气总管 {{ value(current.measured) }} Nm³/h</span>
      <span class="air-text">助燃风 {{ value(current.air, 0) }} Nm³/h</span>
      <span>氧含量 {{ value(current.o2, 2) }}%</span>
    </div>
    <div class="process-pipe gas-pipe"><span>燃气</span></div>
    <div class="process-pipe air-pipe"><span>助燃风</span></div>
    <div class="zone-grid">
      <button v-for="zone in current.zones" :key="zone.name" type="button" class="zone" @click="$emit('zone', zone.name)">
        <span class="zone-inlet" />
        <span class="zone-label">{{ zone.name }}</span>
        <span class="zone-temp">{{ value(zone.temp, 0) }} <small>℃</small></span>
        <span class="zone-detail">燃气 {{ value(zone.gas) }}</span>
        <span class="zone-detail">助燃风 {{ value(zone.air, 0) }}</span>
        <span class="zone-detail">阀位 {{ value(zone.valve, 0) }}%</span>
      </button>
    </div>
    <div class="kiln-track"><span>窑车 / 装载区</span></div>
    <div class="mt-5 process-muted text-[11px]">显示当前回放时刻实测工况；点击温区查看数据与关联提醒。单位：燃气 / 助燃风 Nm³/h。</div>
  </div>
</template>

<style scoped>
.kiln-process { background: #101e30; color: #e3edf5; border-radius: 8px; padding: 24px; overflow-x: auto; }
.process-muted { color: #9aaec2; }
.gas-text { color: #e5b66c; }
.air-text { color: #67cad9; }
.process-pipe { height: 3px; margin: 18px 0; position: relative; min-width: 560px; }
.process-pipe span { position: absolute; top: -12px; left: 0; background: #101e30; padding-right: 12px; font-size: 11px; }
.gas-pipe { background: #c7954a; color: #e5b66c; }
.air-pipe { background: #439cae; color: #67cad9; }
.zone-grid { display: grid; grid-template-columns: repeat(6, minmax(82px, 1fr)); gap: 6px; min-width: 560px; padding: 24px 8px 14px; border: 2px solid #60768a; border-radius: 12px 12px 4px 4px; margin-top: 27px; }
.zone { display: flex; position: relative; flex-direction: column; gap: 7px; align-items: center; padding: 14px 4px; border: 1px solid #39536a; border-radius: 4px; background: #192c3e; cursor: pointer; }
.zone:hover, .zone:focus-visible { border-color: #67cad9; outline: 2px solid #67cad9; }
.zone-inlet { position: absolute; width: 3px; height: 55px; background: #439cae; top: -55px; }
.zone-label { font-size: 12px; color: #a6c5d8; }
.zone-temp { font-size: 21px; color: #e5b66c; margin-bottom: 5px; }
.zone-temp small { font-size: 11px; }
.zone-detail { font-size: 11px; color: #c1d0de; }
.kiln-track { border-top: 5px solid #8b9dab; border-bottom: 2px solid #60768a; min-width: 560px; text-align: center; padding: 6px; margin-top: 6px; color: #9aaec2; font-size: 11px; }
</style>
