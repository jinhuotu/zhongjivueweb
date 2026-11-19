// ============================================================================
// kiln-advice-model.ts | 升温/保温“操作建议”视图模型
// 给定温度预测曲线后，基于集总热平衡逐点推算建议燃气，再按空燃比推算建议助燃风。
// 公式对应后端 kiln_studio_engine.py 的 physics(..., task="energy")，这里做确定性前端派生，
// 不调用新接口、不编造实测值；输出统一标注“机理建议、参数待标定、非实测、不下发”。
// ============================================================================

import type { Parameters } from './kiln-studio-api'

// 输入：一条带相对分钟的温度曲线（调用方决定传原计划 forecast 还是调整后 scenario）
export type AdviceCurvePoint = { minute: number; temperature: number | null }

// 单个时间点的操作建议
export type AdvicePoint = {
  minute: number
  temperature: number | null
  slopeCperH: number | null // 该点升温斜率，单位 ℃/h
  adviceGas: number | null // 建议燃气，Nm³/h
  adviceAir: number | null // 建议助燃风，Nm³/h
}

// 建议汇总：逐点建议 + 窗口内累计建议用气 + 本次采用的空燃比
export type AdviceSummary = {
  points: AdvicePoint[]
  totalGasNm3: number
  afr: number
}

/**
 * 计算某点的曲线斜率（℃/h）。
 * 内部点用中心差分，起点用前向差分、末点用后向差分，保证端点也有值；分钟转小时乘 60。
 */
function slopeAt(curve: AdviceCurvePoint[], index: number): number | null {
  const current = curve[index]!
  if (current.temperature == null) return null
  const previous = curve[index - 1]
  const next = curve[index + 1]
  if (previous && previous.temperature != null && next && next.temperature != null) {
    const dt = next.minute - previous.minute
    return dt > 0 ? ((next.temperature - previous.temperature) / dt) * 60 : null
  }
  if (next && next.temperature != null) {
    const dt = next.minute - current.minute
    return dt > 0 ? ((next.temperature - current.temperature) / dt) * 60 : null
  }
  if (previous && previous.temperature != null) {
    const dt = current.minute - previous.minute
    return dt > 0 ? ((current.temperature - previous.temperature) / dt) * 60 : null
  }
  return null
}

// 梯形积分：燃气单位 Nm³/h，时间间隔为分钟，需 /60 换算成小时；空值段跳过不跨算
function integrateGas(points: AdvicePoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]!
    const current = points[i]!
    if (previous.adviceGas == null || current.adviceGas == null) continue
    const hours = (current.minute - previous.minute) / 60
    total += ((previous.adviceGas + current.adviceGas) / 2) * hours
  }
  return total
}

/**
 * 基于温度曲线和机理参数，构建逐点操作建议。
 * 建议燃气 =（热容×升温斜率 + 3600×散热功率×温差）/（1000×燃烧效率×低位热值）
 *  - 升温项只取正斜率，降温时该项归零，建议燃气自然只剩散热项而下降。
 * 建议助燃风 = 建议燃气 × 空燃比（理论空燃比×过量空气系数）。
 */
export function buildAdvice(curve: AdviceCurvePoint[], parameters: Parameters): AdviceSummary {
  const afr = parameters.theoreticalAfr * parameters.excessAir
  // 分母：每 Nm³ 燃气有效释放的热量（kJ/Nm³），lhvMJ 乘 1000 把 MJ 换成 kJ
  const denominator = 1000 * parameters.efficiency * parameters.lhvMJ
  const points: AdvicePoint[] = curve.map((point, index) => {
    const temperature = point.temperature
    const slope = slopeAt(curve, index)
    if (temperature == null || slope == null) {
      return { minute: point.minute, temperature, slopeCperH: slope, adviceGas: null, adviceAir: null }
    }
    const heating = parameters.capacityKJ * Math.max(slope, 0)
    const loss = 3600 * parameters.lossKW * Math.max(temperature - parameters.ambientC, 0)
    const adviceGas = Math.max(0, (heating + loss) / denominator)
    return {
      minute: point.minute,
      temperature,
      slopeCperH: slope,
      adviceGas,
      adviceAir: adviceGas * afr,
    }
  })
  return { points, totalGasNm3: integrateGas(points), afr }
}
