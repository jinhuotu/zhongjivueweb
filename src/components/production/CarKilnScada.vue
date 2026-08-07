<script setup lang="ts">
import { computed } from 'vue'
import { num } from '@/lib/production-systems'
import kilnImg from '@/assets/scada/caryao.png'
import type { FurnaceItem, ProcessSample } from '@/lib/furnaces-api'

const props = defineProps<{
  furnace: FurnaceItem
  sample: ProcessSample | null
}>()

const ASPECT = '2976 / 1536'

type Anchor = 'center' | 'left' | 'right'
function pin(anchor: Anchor = 'center') {
  if (anchor === 'left') return 'translate(0, -50%)'
  if (anchor === 'right') return 'translate(-100%, -50%)'
  return 'translate(-50%, -50%)'
}

const snap = computed(() => props.sample || props.furnace.snapshot)

function zoneTemp(i: number) {
  const s = snap.value
  const list = [
    s?.z1Temp,
    s?.z2Temp,
    s?.z3Temp,
    s?.z4Temp,
    s?.z5Temp,
    s?.z6Temp,
    s?.zoneAvgTemp,
    s?.zoneAvgTemp,
  ]
  return list[i] ?? props.furnace.temperature
}

const zones = computed(() => {
  const afr = snap.value?.afrSp ?? props.furnace.afr ?? 1
  const valveBase = Math.max(1, Math.min(20, Math.round((afr / 1.2) * 5) || 5))
  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    temp: zoneTemp(i),
    valve: valveBase + (i % 3),
  }))
})

/**
 * 窑体绿点 x%：45.9 … 87.2（上下各 8）
 * 标注 4 组取 0/2/4/6；Y 贴紧红/橙阀体（顶约 16–30%，底约 70–84%）
 */
const BURNER_XS = [45.9, 51.9, 57.5, 63.5, 69.2, 75.2, 81.0, 87.2] as const
const LABEL_XS = [BURNER_XS[0], BURNER_XS[2], BURNER_XS[4], BURNER_XS[6]] as const

const zonePins = computed(() => {
  const z = zones.value
  // 顶排再上移、底排再下移：在管道外侧且紧贴金/橙阀管
  return [
    { z: z[0], x: LABEL_XS[0], y: 90.5 },
    { z: z[1], x: LABEL_XS[1], y: 90.5 },
    { z: z[2], x: LABEL_XS[2], y: 90.5 },
    { z: z[3], x: LABEL_XS[3], y: 90.5 },
    { z: z[7], x: LABEL_XS[0], y: 10.2 },
    { z: z[6], x: LABEL_XS[1], y: 10.2 },
    { z: z[5], x: LABEL_XS[2], y: 10.2 },
    { z: z[4], x: LABEL_XS[3], y: 10.2 },
  ]
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    running: '窑炉程序运行',
    warning: '预警运行',
    alarm: '告警停机',
    idle: '空闲待机',
  }
  return map[props.furnace.status] || String(props.furnace.status)
})

const gasTotal = computed(() => {
  const g = snap.value?.gasFlowInstant ?? props.furnace.gas ?? 0
  return Math.round(Math.abs(Number(g) || 0) * 120 + 13685)
})

const gasInstant = computed(() => snap.value?.gasFlowInstant ?? props.furnace.gas)
const airFlow = computed(() => snap.value?.airFlowInstant)
const furnaceP = computed(
  () => snap.value?.furnacePMeas ?? props.furnace.furnacePressure,
)
const exhaustTemp = computed(() => {
  const t = snap.value?.zoneAvgTemp ?? props.furnace.temperature
  return t != null ? Math.max(25, Math.round(t * 0.55)) : 40
})
const flueTemp2 = computed(
  () => snap.value?.zoneAvgTemp ?? props.furnace.temperature ?? 58,
)

const airPct = computed(() => {
  const v = Number(airFlow.value)
  if (!Number.isFinite(v) || v <= 0) return 73
  return Math.min(99, Math.max(5, Math.round((v / 90000) * 100)))
})

const pressPct = computed(() => {
  const v = Math.abs(Number(furnaceP.value) || 0)
  return Math.min(99, Math.max(5, Math.round(95 - v)))
})
</script>

<template>
  <div class="ck-root relative w-full overflow-hidden rounded-lg border border-border bg-bg-surface">
    <div class="relative w-full bg-[#f3f6fb]" :style="{ aspectRatio: ASPECT }">
      <!-- 左侧留白，避免烟气治理管口被卡片圆角裁切 -->
      <div class="absolute inset-y-0 right-0 left-3 sm:left-4">
        <img
          :src="kilnImg"
          alt="车式窑工艺流程图"
          draggable="false"
          class="absolute inset-0 h-full w-full select-none object-fill"
        />

        <!-- 燃气：累计在管上方；瞬时移到金管右侧下方空白（红框位置） -->
        <div class="absolute z-20" :style="{ left: '24%', top: '5.5%', transform: pin() }">
          <div class="ck-stack">
            <div class="ck-caption">燃气累计量</div>
            <div class="ck-box ck-box-gas">{{ gasTotal }}</div>
          </div>
        </div>
        <div class="absolute z-20" :style="{ left: '36%', top: '28%', transform: pin() }">
          <div class="ck-stack">
            <div class="ck-caption">燃气瞬时量</div>
            <div class="ck-box ck-box-gas">{{ num(gasInstant, 0) }}</div>
          </div>
        </div>
        <div class="absolute z-20" :style="{ left: '34%', top: '10.5%', transform: pin() }">
          <div class="ck-pct-bar">
            <div class="ck-pct-fill" style="width: 6%" />
            <span>6%</span>
          </div>
        </div>

        <div class="absolute z-20" :style="{ left: '21%', top: '40%', transform: pin() }">
          <div class="ck-stack">
            <div class="ck-caption">空总流量</div>
            <div class="ck-box ck-box-air">{{ num(airFlow, 0) }}</div>
            <div class="ck-pct-bar ck-pct-bar-wide">
              <div class="ck-pct-fill" :style="{ width: `${airPct}%` }" />
              <span>{{ airPct }}%</span>
            </div>
          </div>
        </div>

        <div class="absolute z-20" :style="{ left: '15%', top: '69%', transform: pin() }">
          <div class="ck-stack">
            <div class="ck-caption">排烟温度</div>
            <div class="ck-box ck-box-exh">{{ exhaustTemp }}</div>
            <div class="ck-pct-bar ck-pct-bar-muted">
              <div class="ck-pct-fill" style="width: 0%" />
              <span>0%</span>
            </div>
          </div>
        </div>
        <div class="absolute z-20" :style="{ left: '33%', top: '57%', transform: pin() }">
          <div class="ck-stack">
            <div class="ck-caption">窑内压力</div>
            <div class="ck-box ck-box-air">{{ num(furnaceP, 0) }}</div>
            <div class="ck-pct-bar ck-pct-bar-wide">
              <div class="ck-pct-fill" :style="{ width: `${pressPct}%` }" />
              <span>{{ pressPct }}%</span>
            </div>
          </div>
        </div>

        <div
          class="absolute z-20"
          :style="{ left: '3.5%', top: '40%', transform: pin() }"
        >
          <div class="ck-flue-tag">烟气治理</div>
        </div>

        <div
          class="absolute z-20"
          :style="{ left: `${LABEL_XS[0] - 3.2}%`, top: '90.5%', transform: pin('right') }"
        >
          <div class="ck-valve-legend">燃气阀位</div>
        </div>

        <div
          v-for="item in zonePins"
          :key="`${item.z.id}-${item.y}`"
          class="absolute z-20"
          :style="{ left: `${item.x}%`, top: `${item.y}%`, transform: pin() }"
        >
          <div class="ck-zone">
            <div class="ck-zone-id">{{ item.z.id }}#</div>
            <div class="ck-zone-temp">{{ num(item.z.temp, 0) }}</div>
            <div class="ck-zone-valve">{{ num(item.z.valve, 0) }}%</div>
          </div>
        </div>

        <div class="absolute z-20" :style="{ left: '94%', top: '49%', transform: pin() }">
          <div class="ck-tip">烟道温度2: {{ num(flueTemp2, 0) }}</div>
        </div>

        <div class="absolute z-20" :style="{ left: '16%', top: '94%', transform: pin() }">
          <div class="ck-status-wrap">
            <div class="ck-kiln-no">窑炉编号: {{ furnace.kilnNo || '1' }}</div>
            <div class="ck-status">当前状态: {{ statusLabel }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ck-root {
  box-shadow: 0 1px 3px color-mix(in srgb, var(--foreground) 6%, transparent);
}

.ck-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.ck-caption {
  color: #1a2438;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-shadow: 0 0 4px #fff, 0 0 8px #fff;
}

.ck-box {
  min-width: 68px;
  padding: 2px 8px;
  border-radius: 3px;
  font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
  color: #fff;
  border: 1px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

.ck-box-gas {
  background: linear-gradient(180deg, #f0a828 0%, #e08a10 100%);
  border-color: #f5c25a;
}

.ck-box-air {
  background: linear-gradient(180deg, #4a9ae0 0%, #2f78c4 100%);
  border-color: #7ab8f0;
}

.ck-box-exh {
  background: linear-gradient(180deg, #45c478 0%, #2fa85c 100%);
  border-color: #7ad9a0;
}

.ck-pct-bar {
  position: relative;
  width: 46px;
  height: 13px;
  border-radius: 2px;
  background: #e5eaf2;
  border: 1px solid #c5d0e0;
  overflow: hidden;
}

.ck-pct-bar-wide {
  width: 70px;
}

.ck-pct-bar-muted {
  background: #eef1f6;
}

.ck-pct-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(180deg, #f2d24a 0%, #e0b820 100%);
}

.ck-pct-bar > span {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #1a2438;
  font-family: ui-monospace, Consolas, monospace;
}

.ck-flue-label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  color: #1a2438;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-shadow: 0 0 4px #fff, 0 0 8px #fff;
}

.ck-flue-tag {
  padding: 2px 8px;
  border-radius: 3px;
  border: 1px solid #c5d0e0;
  background: rgba(255, 255, 255, 0.92);
  color: #1a2438;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(26, 36, 56, 0.1);
}

.ck-valve-legend {
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  text-shadow: 0 0 4px #fff;
}

.ck-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 42px;
}

.ck-zone-id {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 0 4px #fff;
}

.ck-zone-temp {
  width: 100%;
  min-width: 42px;
  padding: 1px 5px;
  background: linear-gradient(180deg, #f0a828 0%, #e08a10 100%);
  border: 1px solid #f5c25a;
  border-radius: 2px;
  color: #fff;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  line-height: 1.3;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.ck-zone-valve {
  width: 100%;
  min-width: 42px;
  padding: 1px 4px;
  background: #eef2f7;
  border: 1px solid #c5d0e0;
  border-radius: 2px;
  color: #334155;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  line-height: 1.3;
}

.ck-tip {
  padding: 4px 8px;
  border-radius: 4px;
  background: #fff;
  border: 1px solid #d0dae8;
  color: #1a2438;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(26, 36, 56, 0.1);
}

.ck-status-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.ck-kiln-no {
  color: #1a2438;
  font-size: 12px;
  font-weight: 600;
}

.ck-status {
  padding: 5px 16px;
  border-radius: 4px;
  border: 1.5px solid #3b82f6;
  background: linear-gradient(180deg, #ecfdf3 0%, #d1fae5 100%);
  color: #047857;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.15);
}
</style>
