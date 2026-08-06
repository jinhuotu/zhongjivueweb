<script setup lang="ts">
import { computed } from 'vue'
import { num } from '@/lib/production-systems'
import siloImg from '@/assets/scada/silo.png'
import cartImg from '@/assets/scada/cart.png'
import dischargeImg from '@/assets/scada/discharge.png'

const props = defineProps<{
  values: Record<string, number | string | null>
}>()

const blendImg =
  'object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)] [image-rendering:auto]'

const silos = computed(() =>
  Array.from({ length: 24 }, (_, i) => {
    const n = i + 1
    const tgt = props.values[`SILO${String(n).padStart(2, '0')}_TGT`]
    const act = props.values[`SILO${String(n).padStart(2, '0')}_ACT`]
    return {
      n,
      tgt,
      act,
      active: Number(tgt) > 0 || Number(act) > 0,
    }
  }),
)

const top = computed(() => silos.value.filter((s) => s.n % 2 === 1))
const bottom = computed(() => silos.value.filter((s) => s.n % 2 === 0))
</script>

<template>
  <div
    class="relative min-h-[560px] select-none rounded-md bg-[radial-gradient(ellipse_at_center,rgba(20,50,90,0.35),transparent_70%)]"
  >
    <div class="grid grid-cols-12 gap-x-1 px-1">
      <div
        v-for="s in top"
        :key="s.n"
        class="flex flex-col items-center"
      >
        <img
          :src="siloImg"
          alt=""
          draggable="false"
          :class="`${blendImg} h-[52px] md:h-[60px] w-auto`"
        />
        <div
          :class="[
            'mt-0.5 w-full max-w-[68px] rounded-[2px] border px-0.5 py-[2px] text-center leading-[1.15]',
            s.active
              ? 'border-[#a03838] bg-[#6a1212] text-[#ffd0d0]'
              : 'border-[#3a4a5a] bg-[#0c141e]/95 text-[#c4d0dc]',
          ]"
        >
          <div class="text-[9px]">{{ s.n }}#</div>
          <div class="text-[8px] opacity-80">目标值 {{ num(s.tgt, 0) }}Kg</div>
          <div class="font-mono text-[9px]">实际值 {{ num(s.act, 1) }}Kg</div>
        </div>
      </div>
    </div>

    <div class="mt-1 flex items-end gap-1 px-1">
      <div class="grid flex-1 grid-cols-12 gap-x-1">
        <div
          v-for="s in bottom"
          :key="s.n"
          class="flex flex-col items-center"
        >
          <img
            :src="siloImg"
            alt=""
            draggable="false"
            :class="`${blendImg} h-[52px] md:h-[60px] w-auto`"
          />
          <div
            :class="[
              'mt-0.5 w-full max-w-[68px] rounded-[2px] border px-0.5 py-[2px] text-center leading-[1.15]',
              s.active
                ? 'border-[#a03838] bg-[#6a1212] text-[#ffd0d0]'
                : 'border-[#3a4a5a] bg-[#0c141e]/95 text-[#c4d0dc]',
            ]"
          >
            <div class="text-[9px]">{{ s.n }}#</div>
            <div class="text-[8px] opacity-80">目标值 {{ num(s.tgt, 0) }}Kg</div>
            <div class="font-mono text-[9px]">实际值 {{ num(s.act, 1) }}Kg</div>
          </div>
        </div>
      </div>
      <div class="flex flex-col items-center">
        <img
          :src="siloImg"
          alt=""
          draggable="false"
          :class="`${blendImg} h-[64px] md:h-[72px] w-auto`"
        />
        <div
          :class="[
            'mt-0.5 w-full max-w-[68px] rounded-[2px] border px-0.5 py-[2px] text-center leading-[1.15]',
            Number(values.ADD_TGT) > 0 || Number(values.ADD_ACT) > 0
              ? 'border-[#a03838] bg-[#6a1212] text-[#ffd0d0]'
              : 'border-[#3a4a5a] bg-[#0c141e]/95 text-[#c4d0dc]',
          ]"
        >
          <div class="text-[9px]">外加料</div>
          <div class="text-[8px] opacity-80">目标值 {{ num(values.ADD_TGT, 0) }}Kg</div>
          <div class="font-mono text-[9px]">实际值 {{ num(values.ADD_ACT, 1) }}Kg</div>
        </div>
      </div>
    </div>

    <div class="relative mt-4 px-4 md:px-10">
      <div class="scada-cart-lane relative z-10 grid grid-cols-2 gap-6 md:gap-16">
        <div
          v-for="(cart, idx) in [
            { a: values.CART1_A, b: values.CART1_B },
            { a: values.CART2_A, b: values.CART2_B },
          ]"
          :key="idx"
          class="relative mx-auto w-full max-w-[380px]"
        >
          <img
            :src="cartImg"
            alt="秤车"
            draggable="false"
            :class="`h-auto w-full ${blendImg} drop-shadow-[0_10px_20px_rgba(0,0,0,0.55)]`"
          />
          <div
            :class="[
              'absolute left-[34%] top-[38%] -translate-x-1/2 min-w-[72px] rounded border border-black/80 bg-black/90 px-1.5 py-0.5 text-center font-mono text-[12px] shadow-lg md:text-[14px]',
              Number(cart.a) > 0 ? 'text-[#6dff6d]' : 'text-[#3d6a3d]',
            ]"
          >
            {{ num(cart.a, 1) }}Kg
          </div>
          <div
            :class="[
              'absolute left-[66%] top-[38%] -translate-x-1/2 min-w-[72px] rounded border border-black/80 bg-black/90 px-1.5 py-0.5 text-center font-mono text-[12px] shadow-lg md:text-[14px]',
              Number(cart.b) > 0 ? 'text-[#6dff6d]' : 'text-[#3d6a3d]',
            ]"
          >
            {{ num(cart.b, 1) }}Kg
          </div>
        </div>
      </div>

      <div class="scada-rail pointer-events-none relative z-[5] -mt-[10px] md:-mt-[12px] px-0">
        <div
          class="mx-1 h-[12px] md:h-[14px] rounded-sm border border-[#2a3340]/80"
          style="
            background: linear-gradient(180deg, #b8c4d0 0%, #7a8898 38%, #4a5564 72%, #2e3640 100%);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35);
          "
        />
        <div class="mx-1 -mt-[3px] flex justify-between px-0.5">
          <span
            v-for="i in 36"
            :key="i"
            class="h-2 w-2.5 shrink-0 rounded-[1px] bg-[#6a7888]"
            style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35)"
          />
        </div>
      </div>
    </div>

    <div class="mt-2 grid grid-cols-4 gap-3 px-6 md:px-16">
      <div
        v-for="i in 4"
        :key="i"
        class="relative flex flex-col items-center"
      >
        <img
          :src="dischargeImg"
          :alt="`${i}#卸料`"
          draggable="false"
          :class="`${blendImg} h-[110px] w-auto md:h-[130px]`"
        />
        <span
          class="absolute left-1/2 top-0 -translate-x-1/2 text-[13px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
        >
          {{ i }}
        </span>
        <div
          :class="[
            '-mt-1 min-w-[84px] rounded border bg-black/90 px-2 py-0.5 text-center font-mono text-[13px]',
            Number(values[`DISCHARGE${i}`]) > 0
              ? 'border-[#5ec8ff]/40 text-[#6dff6d]'
              : 'border-[#333] text-[#3d6a3d]',
          ]"
        >
          {{ num(values[`DISCHARGE${i}`], 1) }}Kg
        </div>
      </div>
    </div>

    <div
      class="mt-3 ml-2 inline-block rounded border border-[#6a7888]/50 bg-[#1a2430]/90 px-3 py-1.5 font-mono text-[11px] text-[#e8f0f8]"
    >
      <div>
        锅次编号：
        <span class="text-white">{{ String(values.BATCH_NO ?? '—') }}</span>
      </div>
      <div>
        配方编号：
        <span class="text-white">{{ String(values.RECIPE_NO ?? '—') }}</span>
      </div>
    </div>
  </div>
</template>
