<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ShieldAlert, ShieldCheck } from 'lucide-vue-next'
import type { TemperatureForecast } from '@/lib/kiln-studio-api'
import { formatKilnNumber } from '@/lib/kiln-studio-format'

// 安全边界守卫：对 What-if 沙盘的结果做“绝对工艺红线”检查（区别于“相对设定偏离”提醒）
// 温度检查未来预测/试算曲线；氧含量、窑压只有历史读数，仅检查起点前工况，不冒充未来预测
const props = defineProps<{ forecast: TemperatureForecast }>()

interface SafetyRules {
  upperC: number; lowerC: number
  o2Min: number; o2Max: number
  pressureMin: number; pressureMax: number
}
interface SafetyItem {
  id: string; label: string; scope: string; status: 'safe' | 'violation'; detail: string
}

// 温度默认阈值按“本窑次实测峰值 +20 / 最低 -20”给宽松演示值，明确不是权威工艺红线
function defaultTemperatureBounds(): Pick<SafetyRules, 'upperC' | 'lowerC'> {
  const actuals = props.forecast.points.map(p => p.actual).filter((v): v is number => v != null)
  return {
    upperC: actuals.length ? Math.round(Math.max(...actuals) + 20) : 1500,
    lowerC: actuals.length ? Math.round(Math.min(...actuals) - 20) : 0,
  }
}
const rules = ref<SafetyRules>({
  ...defaultTemperatureBounds(),
  o2Min: 2, o2Max: 6, pressureMin: -50, pressureMax: 50,
})
// 每次得到新的预测结果，温度阈值回到该窑次的默认演示值；氧/压口径保持
watch(() => props.forecast, () => {
  rules.value = { ...rules.value, ...defaultTemperatureBounds() }
})
function resetRules() {
  rules.value = { ...defaultTemperatureBounds(), o2Min: 2, o2Max: 6, pressureMin: -50, pressureMax: 50 }
}

// 温度曲线检查：分别看原计划机理预测与调整后试算的超温/欠温
function temperatureItem(id: string, label: string, key: 'forecast' | 'scenario'): SafetyItem {
  const origin = props.forecast.originMinute
  const points = props.forecast.points
    .filter(p => p.minute > origin && p[key] != null)
    .map(p => ({ minute: p.minute, value: p[key] as number }))
  if (!points.length) {
    return { id, label, scope: '未来预测', status: 'safe', detail: '该方案在窗口内没有可检查的预测点。' }
  }
  const peak = points.reduce((a, b) => (b.value > a.value ? b : a))
  const valley = points.reduce((a, b) => (b.value < a.value ? b : a))
  const violations: string[] = []
  if (peak.value > rules.value.upperC) {
    violations.push(`超温：峰值 ${formatKilnNumber(peak.value)}℃（上限 ${rules.value.upperC}，约 +${peak.minute - origin} 分钟）`)
  }
  if (valley.value < rules.value.lowerC) {
    violations.push(`欠温：最低 ${formatKilnNumber(valley.value)}℃（下限 ${rules.value.lowerC}，约 +${valley.minute - origin} 分钟）`)
  }
  return violations.length
    ? { id, label, scope: '未来预测', status: 'violation', detail: violations.join('；') }
    : { id, label, scope: '未来预测', status: 'safe',
        detail: `峰值 ${formatKilnNumber(peak.value)}℃、最低 ${formatKilnNumber(valley.value)}℃，均在 ${rules.value.lowerC}–${rules.value.upperC}℃ 内。` }
}

// 区间检查（氧含量、窑压）：只统计起点前已有读数，越界计数与极值
function bandItem(
  id: string, label: string, field: 'oxygen' | 'pressure', min: number, max: number, unit: string,
): SafetyItem {
  const values = props.forecast.points
    .filter(p => p[field] != null)
    .map(p => ({ value: p[field] as number }))
  if (!values.length) {
    return { id, label, scope: '起点前历史工况', status: 'safe', detail: '窗口内没有可检查的读数。' }
  }
  const bad = values.filter(v => v.value < min || v.value > max)
  const extreme = values.reduce((a, b) => (Math.abs(b.value) > Math.abs(a.value) ? b : a))
  return bad.length
    ? { id, label, scope: '起点前历史工况', status: 'violation',
        detail: `${bad.length} 个读数越界（参考区间 ${min}–${max} ${unit}），极值 ${formatKilnNumber(extreme.value)} ${unit}。` }
    : { id, label, scope: '起点前历史工况', status: 'safe',
        detail: `${values.length} 个读数均在参考区间 ${min}–${max} ${unit} 内。` }
}

const items = computed<SafetyItem[]>(() => [
  temperatureItem('plan', '原计划 · 机理预测', 'forecast'),
  temperatureItem('scenario', '调整后 · 机理试算', 'scenario'),
  bandItem('o2', '氧含量', 'oxygen', rules.value.o2Min, rules.value.o2Max, '%'),
  bandItem('pressure', '窑压', 'pressure', rules.value.pressureMin, rules.value.pressureMax, 'Pa'),
])
const hasViolation = computed(() => items.value.some(item => item.status === 'violation'))
</script>

<template>
  <section class="safety-guard" :class="{ violation: hasViolation }">
    <header class="guard-head">
      <div class="guard-title">
        <ShieldAlert v-if="hasViolation" :size="18" class="icon-bad" />
        <ShieldCheck v-else :size="18" class="icon-ok" />
        <div>
          <h3>安全边界检查</h3>
          <p>{{ hasViolation ? '存在越界项，请核对调整方案' : '各检查项均在参考边界内' }}</p>
        </div>
      </div>
      <details class="rules-editor">
        <summary>调整安全阈值</summary>
        <div class="rules-grid">
          <label>温度上限 / ℃<input v-model.number="rules.upperC" type="number" /></label>
          <label>温度下限 / ℃<input v-model.number="rules.lowerC" type="number" /></label>
          <label>氧含量下限 / %<input v-model.number="rules.o2Min" type="number" step=".1" /></label>
          <label>氧含量上限 / %<input v-model.number="rules.o2Max" type="number" step=".1" /></label>
          <label>窑压下限 / Pa<input v-model.number="rules.pressureMin" type="number" /></label>
          <label>窑压上限 / Pa<input v-model.number="rules.pressureMax" type="number" /></label>
        </div>
        <button type="button" class="reset" @click="resetRules">恢复默认参考值</button>
        <p class="disclaimer">默认阈值为演示参考（温度按本窑次实测值浮动、氧/压为宽松区间），需现场按设备工艺确认；试算结果不代表现场实测精度。</p>
      </details>
    </header>

    <ul class="guard-list">
      <li v-for="item in items" :key="item.id" :class="item.status">
        <span class="item-head">
          <i />
          <b>{{ item.label }}</b>
          <small>{{ item.scope }}</small>
        </span>
        <p>{{ item.detail }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.safety-guard { margin-top:14px; border:1px solid #304553; border-radius:8px; background:#172631; overflow:hidden; }
.safety-guard.violation { border-color:#a85a4f; }
.guard-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:14px 16px; }
.guard-title { display:flex; gap:10px; align-items:center; }
.guard-title h3 { margin:0; font-size:14px; }
.guard-title p { margin:3px 0 0; font-size:11px; color:#a9bdca; }
.icon-ok { color:#5fc3a3; }
.icon-bad { color:#e08a7c; }
.rules-editor { font-size:11px; color:#c9ebe6; }
.rules-editor summary { cursor:pointer; }
.rules-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:10px; }
.rules-grid label { display:grid; gap:4px; color:#a9bdca; font-size:10px; }
.rules-grid input { width:100%; box-sizing:border-box; padding:6px; border:1px solid #3b5262; border-radius:5px; background:#162632; color:#ecf5f8; color-scheme:dark; }
.reset { margin-top:9px; border:1px solid #3a5965; background:transparent; color:#b8ddd9; border-radius:5px; padding:6px 10px; cursor:pointer; font-size:11px; }
.disclaimer { margin:9px 0 0; font-size:10px; line-height:1.6; color:#8fa6b3; max-width:460px; }
.guard-list { list-style:none; margin:0; padding:0 16px 14px; display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:9px; }
.guard-list li { border:1px solid #304553; border-radius:6px; padding:10px 11px; background:#14212b; }
.guard-list li.safe { border-left:3px solid #4f9c7d; }
.guard-list li.violation { border-left:3px solid #c2604f; background:#2a201d; }
.item-head { display:flex; align-items:center; gap:7px; }
.item-head i { width:7px; height:7px; border-radius:50%; }
.safe .item-head i { background:#5fc3a3; }
.violation .item-head i { background:#e08a7c; }
.item-head b { font-size:12px; }
.item-head small { margin-left:auto; font-size:9px; color:#8fa6b3; }
.guard-list p { margin:7px 0 0; font-size:11px; line-height:1.65; color:#c3d2dc; }
.violation p { color:#f0bdb2; }
</style>
