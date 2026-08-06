<script setup lang="ts">
import { num } from '@/lib/production-systems'
import pipeImg from '@/assets/scada/pipe.png'

type V = Record<string, number | string | null>
type Anchor = 'center' | 'left' | 'right' | 'top' | 'bottom'

defineProps<{
  values: V
}>()

const PIPE_ASPECT = '2261 / 1471'

function pinTransform(anchor: Anchor = 'center') {
  if (anchor === 'left') return 'translate(0, -50%)'
  if (anchor === 'right') return 'translate(-100%, -50%)'
  if (anchor === 'top') return 'translate(-50%, 0)'
  if (anchor === 'bottom') return 'translate(-50%, -100%)'
  return 'translate(-50%, -50%)'
}

const emissionRows = [
  ['SO2', 'SO2'],
  ['NOX', 'NOX'],
  ['颗粒物', 'DUST'],
  ['NH3', 'NH3'],
] as const
</script>

<template>
  <div class="relative w-full overflow-hidden rounded-lg border border-[#1a4a8a]/55 bg-[#041428]">
    <div class="relative w-full" :style="{ aspectRatio: PIPE_ASPECT }">
      <img
        :src="pipeImg"
        alt="梭式窑烟气治理工艺流程"
        draggable="false"
        class="absolute inset-0 h-full w-full object-fill select-none"
      />

      <!-- 左侧窑炉排烟来源 -->
      <div
        class="absolute"
        :style="{ left: '1.5%', top: '16%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#5eb0ff]/45 bg-[#072447]/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#b8dcff] shadow-[0_0_8px_rgba(60,140,230,0.35)] md:text-[11px]"
        >
          2#梭式窑排烟
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '1.5%', top: '44%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#5eb0ff]/45 bg-[#072447]/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#b8dcff] shadow-[0_0_8px_rgba(60,140,230,0.35)] md:text-[11px]"
        >
          1#梭式窑排烟
        </div>
      </div>

      <!-- 换热器 -->
      <div
        class="absolute"
        :style="{ left: '11%', top: '16%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[11px] md:text-[12px]"
        >
          换热器B
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '11%', top: '24%', transform: pinTransform(), zIndex: 20 }"
      >
        <div class="flex flex-col items-center gap-0.5 text-center">
          <span
            class="whitespace-nowrap font-mono text-[9px] font-semibold text-[#fff8e0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] md:text-[10px]"
          >
            {{ num(values.HX_B_TIN, 0) }} ℃
          </span>
          <span
            class="whitespace-nowrap font-mono text-[9px] font-semibold text-[#fff8e0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] md:text-[10px]"
          >
            {{ num(values.HX_B_PIN ?? values.HX_A_PIN, 0) }} Pa
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '11%', top: '44%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[11px] md:text-[12px]"
        >
          换热器A
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '11%', top: '52%', transform: pinTransform(), zIndex: 20 }"
      >
        <div class="flex flex-col items-center gap-0.5 text-center">
          <span
            class="whitespace-nowrap font-mono text-[9px] font-semibold text-[#fff8e0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] md:text-[10px]"
          >
            {{ num(values.HX_A_TIN, 0) }} ℃
          </span>
          <span
            class="whitespace-nowrap font-mono text-[9px] font-semibold text-[#fff8e0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] md:text-[10px]"
          >
            {{ num(values.HX_A_PIN, 0) }} Pa
          </span>
        </div>
      </div>

      <!-- 风机 / 冷风阀 B -->
      <div
        class="absolute"
        :style="{ left: '20.5%', top: '13%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#4a9fe8]/50 bg-[#0a2a52]/85 px-1 py-0.5 text-[10px] font-semibold tracking-wide text-[#e8f4ff] shadow-[0_0_6px_rgba(40,120,220,0.3)] md:px-1.5 md:text-[11px]"
        >
          换热风机B
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '20.5%', top: '18%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#c45]/55 bg-[#4a1515]/92 text-[#ffd0d0] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.FAN_HX_B_HZ, 1) }}
            <span class="ml-0.5 opacity-80">Hz</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '20.5%', top: '23%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#c45]/55 bg-[#4a1515]/92 text-[#ffd0d0] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">冷风阀B </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.COLD_B, 1) }}
            <span class="ml-0.5 opacity-80">%</span>
          </span>
        </div>
      </div>

      <!-- 风机 / 冷风阀 A -->
      <div
        class="absolute"
        :style="{ left: '20.5%', top: '41%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#4a9fe8]/50 bg-[#0a2a52]/85 px-1 py-0.5 text-[10px] font-semibold tracking-wide text-[#e8f4ff] shadow-[0_0_6px_rgba(40,120,220,0.3)] md:px-1.5 md:text-[11px]"
        >
          换热风机A
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '20.5%', top: '46%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#c45]/55 bg-[#4a1515]/92 text-[#ffd0d0] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.FAN_HX_A_HZ, 1) }}
            <span class="ml-0.5 opacity-80">Hz</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '20.5%', top: '51%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.FAN_HX_A_A, 1) }}
            <span class="ml-0.5 opacity-80">A</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '20.5%', top: '56%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#c45]/55 bg-[#4a1515]/92 text-[#ffd0d0] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">冷风阀A </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.COLD_A, 1) }}
            <span class="ml-0.5 opacity-80">%</span>
          </span>
        </div>
      </div>

      <!-- 烘干区 -->
      <div
        class="absolute"
        :style="{ left: '36%', top: '8%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[10px] md:text-[11px]"
        >
          烘干风机
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '48%', top: '12%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#c45]/55 bg-[#4a1515]/92 text-[#ffd0d0] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">烘干风机 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.FAN_DRY_HZ, 1) }}
            <span class="ml-0.5 opacity-80">Hz</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '57%', top: '12%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">除尘压差 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.DRY_DP, 0) }}
            <span class="ml-0.5 opacity-80">Pa</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '34%', top: '72%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[10px] md:text-[11px]"
        >
          烘干除尘器
        </div>
      </div>

      <!-- 脱硝剂区 -->
      <div
        class="absolute"
        :style="{ left: '40%', top: '24%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[10px] md:text-[11px]"
        >
          脱硝剂储罐
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '44%', top: '32%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">罐体液位 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.DENIT_TANK, 3) }}
            <span class="ml-0.5 opacity-80">m³</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '47%', top: '40%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">计量泵A </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.PUMP_A_HZ, 1) }}
            <span class="ml-0.5 opacity-80">Hz</span>
          </span>
        </div>
      </div>

      <!-- 脱硫塔 -->
      <div
        class="absolute"
        :style="{ left: '58%', top: '48%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[13px] md:text-[15px]"
        >
          脱硫塔
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '49.5%', top: '34%', transform: pinTransform('right'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">塔温 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.DES_TOWER_T, 0) }}
            <span class="ml-0.5 opacity-80">℃</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '49.5%', top: '58%', transform: pinTransform('right'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">塔压 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.DES_TOWER_P, 1) }}
            <span class="ml-0.5 opacity-80">Pa</span>
          </span>
        </div>
      </div>

      <!-- SCR / 除尘 -->
      <div
        class="absolute"
        :style="{ left: '74%', top: '26%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[13px] md:text-[15px]"
        >
          SCR脱硝
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '74%', top: '15%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">SCR温 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.SCR_T, 0) }}
            <span class="ml-0.5 opacity-80">℃</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '84%', top: '36%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">SCR压 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.SCR_P, 1) }}
            <span class="ml-0.5 opacity-80">Pa</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '74%', top: '62%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[13px] md:text-[15px]"
        >
          除尘器
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '66%', top: '72%', transform: pinTransform('right'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">除尘温 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.DUST_T, 0) }}
            <span class="ml-0.5 opacity-80">℃</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '84%', top: '72%', transform: pinTransform('left'), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">除尘压 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.DUST_P, 1) }}
            <span class="ml-0.5 opacity-80">Pa</span>
          </span>
        </div>
      </div>

      <!-- 脱硫剂 / 烟囱 / 引风机 -->
      <div
        class="absolute"
        :style="{ left: '30%', top: '86%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[10px] md:text-[11px]"
        >
          脱硫剂A
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '39%', top: '86%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[10px] md:text-[11px]"
        >
          脱硫剂B
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '93%', top: '20%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[10px] md:text-[11px]"
        >
          烟囱
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '88%', top: '84%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] text-[10px] md:text-[11px]"
        >
          引风机
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '88%', top: '76%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#c45]/55 bg-[#4a1515]/92 text-[#ffd0d0] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.IDF_HZ, 1) }}
            <span class="ml-0.5 opacity-80">Hz</span>
          </span>
        </div>
      </div>

      <!-- 底部工况 -->
      <div
        class="absolute"
        :style="{ left: '50%', top: '94%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">烧成温度 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.FIRE_TEMP, 0) }}
            <span class="ml-0.5 opacity-80">℃</span>
          </span>
        </div>
      </div>
      <div
        class="absolute"
        :style="{ left: '64%', top: '94%', transform: pinTransform(), zIndex: 20 }"
      >
        <div
          class="pointer-events-none whitespace-nowrap rounded border border-[#2a6bb0]/55 bg-[#061830]/92 text-[#d8ecff] px-1 py-[1px] text-[9px] md:text-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        >
          <span class="opacity-75">压缩空气 </span>
          <span class="font-mono text-[10px] text-[#ffe08a] md:text-[11px]">
            {{ num(values.AIR_PRESS, 2) }}
            <span class="ml-0.5 opacity-80">MPa</span>
          </span>
        </div>
      </div>

      <!-- 流向箭头 -->
      <div
        v-for="(a, i) in [
          { x: 36, y: 14, r: 0 },
          { x: 52, y: 14, r: 0 },
          { x: 62, y: 28, r: 90 },
          { x: 68, y: 14, r: 0 },
          { x: 80, y: 28, r: 90 },
          { x: 90, y: 48, r: 90 },
          { x: 70, y: 76, r: 180 },
        ]"
        :key="i"
        class="pointer-events-none absolute z-[15]"
        :style="{
          left: `${a.x}%`,
          top: `${a.y}%`,
          transform: `translate(-50%, -50%) rotate(${a.r}deg)`,
        }"
      >
        <span
          class="block h-0 w-0 border-y-[3px] border-y-transparent border-l-[7px] border-l-[#3dff7a] drop-shadow-[0_0_3px_rgba(61,255,122,0.9)]"
        />
      </div>

      <!-- 烟气排放监测 -->
      <div
        class="absolute top-[2%] right-[1.5%] z-30 w-[min(42%,320px)] rounded border border-[#3a8fd0]/60 bg-[#061a36]/88 p-2 shadow-[0_0_20px_rgba(40,120,220,0.35)] backdrop-blur-[2px] md:w-[min(36%,300px)] md:p-2.5"
      >
        <div class="mb-1.5 text-[11px] font-semibold tracking-wide text-cyan-200 md:text-[12px]">
          烟气排放监测
        </div>
        <table class="w-full text-[9px] md:text-[10px]">
          <thead>
            <tr class="border-b border-[#2a6bb0]/40 text-[#7aa7d8]">
              <th class="py-0.5 text-left font-normal">名称</th>
              <th class="py-0.5 text-right font-normal">实测</th>
              <th class="py-0.5 text-right font-normal">折算*</th>
              <th class="py-0.5 text-right font-normal">小时均*</th>
            </tr>
          </thead>
          <tbody class="font-mono text-[#d8ecff]">
            <tr
              v-for="[name, key] in emissionRows"
              :key="name"
              class="border-b border-[#1e4a7a]/25"
            >
              <td class="py-0.5">{{ name }}</td>
              <td class="py-0.5 text-right text-[#ffe08a]">{{ num(values[key], 2) }}</td>
              <td class="py-0.5 text-right opacity-55">{{ num(values[key], 2) }}</td>
              <td class="py-0.5 text-right opacity-55">{{ num(values[key], 2) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-[#d8ecff] md:text-[10px]">
          <div
            v-for="row in [
              { k: 'O2', v: `${num(values.O2, 2)} %` },
              { k: '烟气温度', v: `${num(values.FG_TEMP, 0)} ℃` },
              { k: '烟气压力', v: `${num(values.FG_PRESS ?? values.DES_TOWER_P, 1)} Pa` },
              { k: '烟气流速', v: `${num(values.FG_VEL, 2)} m/s` },
              { k: '烟气湿度', v: `${num(values.FG_HUM, 2)} %` },
              { k: '烟气流量', v: `${num(values.FG_FLOW, 2)} m³/h` },
            ]"
            :key="row.k"
            class="flex justify-between gap-1 border-b border-[#1e4a7a]/20 pb-0.5"
          >
            <span class="text-[#7aa7d8]">{{ row.k }}</span>
            <span class="font-mono">{{ row.v }}</span>
          </div>
        </div>
        <p class="mt-1 text-[8px] text-[#7aa7d8]/75">* 折算/小时均一期近似实测</p>
      </div>
    </div>
  </div>
</template>
