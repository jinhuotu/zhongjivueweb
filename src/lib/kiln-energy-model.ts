// ============================================================================
// kiln-energy-model.ts | 能碳 / 成本 / 单耗“视图模型”
// 把总览模型算出的用气量（Nm³）换算成热能、碳排、成本、单耗。
// 口径依据：GB/T 32151.16 与生态环境部《企业温室气体排放核算方法与报告指南》。
// 设计原则：只做纯计算、不依赖 Vue；所有外部参数可配置，缺省值标注“待业务确认”，
// 不把估算包装成实测。与 kiln-overview-model.ts 分开，保持单一职责、避免单文件膨胀。
// ============================================================================

// 能碳配置：全部为外部输入，业务确认后才作为正式口径
export type EnergyConfig = {
  // 天然气低位发热量，单位 GJ/Nm³（参考值 389.3 GJ/万Nm³ = 0.03893 GJ/Nm³）
  lhvGJPerNm3: number
  // 单位热值含碳量，单位 tC/GJ（缺省 15.3×10⁻³）
  carbonContentTCGJ: number
  // 碳氧化率（缺省 99%）
  oxidationRate: number
  // 体积排放因子 kgCO2/Nm³；null 表示按上面三项自动推导，填了则直接采用
  emissionFactorOverride: number | null
  // 天然气单价，单位 元/Nm³；null 时不显示成本
  gasPriceYuanPerNm3: number | null
  // 装载量（吨或件）；null 时不显示单耗
  loadAmount: number | null
  loadUnit: '吨' | '件'
}

// 缺省配置：只给有出处的口径参数，气价/装载量留空（未配置不显示对应数字）
export const DEFAULT_ENERGY_CONFIG: EnergyConfig = {
  lhvGJPerNm3: 0.03893,
  carbonContentTCGJ: 0.0153,
  oxidationRate: 0.99,
  emissionFactorOverride: null,
  gasPriceYuanPerNm3: null,
  loadAmount: null,
  loadUnit: '吨',
}

/**
 * 计算体积排放因子，单位 kgCO2/Nm³。
 * 热值因子：EF(kg/GJ) = 含碳量(t/GJ) × 碳氧化率 × 44/12 × 1000
 * 体积因子：EF(kg/Nm³) = EF(kg/GJ) × LHV(GJ/Nm³)
 * 缺省参数推导结果约 55.54 kg/GJ、2.162 kg/Nm³。
 */
export function emissionFactorKgPerNm3(config: EnergyConfig): number {
  if (config.emissionFactorOverride != null) return config.emissionFactorOverride
  const factorKgPerGJ = config.carbonContentTCGJ * config.oxidationRate * (44 / 12) * 1000
  return factorKgPerGJ * config.lhvGJPerNm3
}

// 能碳汇总结果（成本/单耗在未配置时为 null，前端据此隐藏）
export type EnergySummary = {
  gasVolumeNm3: number
  heatGJ: number // 热能 = 用气量 × LHV
  carbonKg: number // 碳排 = 用气量 × 体积排放因子
  emissionFactorKgPerNm3: number
  costYuan: number | null // 成本 = 用气量 × 气价
  gasIntensity: number | null // 燃气单耗 = 用气量 / 装载量
  carbonIntensity: number | null // 碳单耗 = 碳排 / 装载量
}

/**
 * 基于用气量构建能碳汇总。
 * 注意：用气量应来自累计表/积分（已发生口径），不要用预测值算“已发生碳排”。
 */
export function buildEnergySummary(gasVolumeNm3: number, config: EnergyConfig): EnergySummary {
  const factor = emissionFactorKgPerNm3(config)
  const hasLoad = config.loadAmount != null && config.loadAmount > 0
  return {
    gasVolumeNm3,
    heatGJ: gasVolumeNm3 * config.lhvGJPerNm3,
    carbonKg: gasVolumeNm3 * factor,
    emissionFactorKgPerNm3: factor,
    costYuan:
      config.gasPriceYuanPerNm3 != null ? gasVolumeNm3 * config.gasPriceYuanPerNm3 : null,
    gasIntensity: hasLoad ? gasVolumeNm3 / (config.loadAmount as number) : null,
    carbonIntensity: hasLoad
      ? (gasVolumeNm3 * factor) / (config.loadAmount as number)
      : null,
  }
}
