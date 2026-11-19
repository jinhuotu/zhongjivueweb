import type { AlgorithmKey, ReplayFrame, ReplayPackage } from './kiln-studio-api'

// 总览看板的“视图模型”：把后端回放包整理成 KPI、阶段、误差等可直接渲染的结构。
// 这里只做纯数据计算、不依赖 Vue，方便单元测试和后续复用。

// 一个抽样时刻的全参数（来自回放帧 snapshot，时间已换算为相对窑次起点的分钟）
export type OverviewPoint = {
  minute: number
  ts: string
  temp: number | null
  tempSp: number | null
  gas: number | null
  air: number | null
  o2: number | null
  pressure: number | null
  afr: number | null
}

// 一个烧成阶段及其该阶段的用气量（燃气瞬时按时间积分，单位 Nm³）
export type OverviewStage = {
  key: 'preheat' | 'heating' | 'soak' | 'cooling'
  name: string
  startMinute: number
  endMinute: number
  gasVolume: number | null
}

// 不依赖当前播放位置的总览汇总结果
export type OverviewModel = {
  points: OverviewPoint[]
  frameStepMinutes: number
  totalGasVolume: number
  peakTemp: number
  stages: OverviewStage[]
}

// 逐点预测误差（预测值 - 事后实测），用于误差回放柱
export type OverviewErrorPoint = { minuteOffset: number; error: number | null }

// 阶段划分阈值（相对峰值温度的比例），集中放置便于后续按工艺调整
const PREHEAT_RATIO = 0.35
const SOAK_RATIO = 0.95

/**
 * 基于回放包构建总览模型。
 * 回放帧从窑次开头按 frameStep 抽样、snapshot 已带全参数，因此各任务（温度/燃气/空燃比）
 * 都能统一从 frames 提取，无需按任务写多套逻辑。
 */
export function buildOverviewModel(replay: ReplayPackage): OverviewModel {
  const points: OverviewPoint[] = replay.frames.map(frame => ({
    minute: frame.originMinute,
    ts: frame.originTs,
    temp: frame.snapshot.temp,
    tempSp: frame.snapshot.temp_sp,
    gas: frame.snapshot.gas,
    air: frame.snapshot.air,
    o2: frame.snapshot.o2,
    pressure: frame.snapshot.pressure,
    afr: frame.snapshot.afr,
  }))

  const totalGasVolume = integrateGas(points)
  const peakTemp = points.reduce((max, point) =>
    point.temp != null && point.temp > max ? point.temp : max, Number.NEGATIVE_INFINITY)

  return {
    points,
    frameStepMinutes: replay.request.frameStepMinutes,
    totalGasVolume,
    peakTemp: Number.isFinite(peakTemp) ? peakTemp : 0,
    stages: splitStages(points, Number.isFinite(peakTemp) ? peakTemp : 0),
  }
}

/**
 * 计算当前帧选定算法的逐点预测误差。
 * 事后实测来自 actualFuture，仅在同一 minuteOffset 两侧都有值时才计算误差。
 */
export function frameErrorSeries(frame: ReplayFrame, algorithmKey: AlgorithmKey): OverviewErrorPoint[] {
  const predictions = frame.future[algorithmKey] ?? []
  const actual = new Map(frame.actualFuture.map(point => [point.minuteOffset, point.value]))
  return predictions.map(point => {
    const real = actual.get(point.minuteOffset) ?? null
    return {
      minuteOffset: point.minuteOffset,
      error: point.value != null && real != null ? point.value - real : null,
    }
  })
}

/**
 * 燃气瞬时流量按时间梯形积分（Nm³）。
 * 流量单位 Nm³/h，时间差换算成小时；任一端点缺测则跳过该段，避免脏值污染累计。
 */
function integrateGas(points: OverviewPoint[], startIndex = 0, endIndex = points.length - 1): number {
  let volume = 0
  for (let index = Math.max(1, startIndex + 1); index <= endIndex; index++) {
    const left = points[index - 1]!
    const right = points[index]!
    if (left.gas == null || right.gas == null) continue
    const hours = (right.minute - left.minute) / 60
    volume += ((left.gas + right.gas) / 2) * hours
  }
  return volume
}

/**
 * 按温度曲线自动划分预热/升温/保温/降温四段。
 * 优先用设定温度（计划曲线规整、无噪声），缺测时回退实测温度；
 * 不写死时间，避免不同窑次时长不同导致错位。
 */
function splitStages(points: OverviewPoint[], peakTemp: number): OverviewStage[] {
  if (points.length < 2) return []
  const planAt = (point: OverviewPoint) => point.tempSp ?? point.temp
  // 第一个达到/超过指定比例的帧索引；找不到时返回兜底索引
  const firstIndexAt = (ratio: number) => {
    const target = peakTemp * ratio
    const index = points.findIndex(point => {
      const value = planAt(point)
      return value != null && value >= target
    })
    return index >= 0 ? index : 0
  }
  const preheatEnd = firstIndexAt(PREHEAT_RATIO)
  const soakStart = firstIndexAt(SOAK_RATIO)
  // 保温终点：从末尾往前找最后一个仍在保温阈值以上的帧，其后即降温
  let soakEnd = points.length - 1
  for (let index = points.length - 1; index >= 0; index--) {
    const value = planAt(points[index]!)
    if (value != null && value >= peakTemp * SOAK_RATIO) {
      soakEnd = index
      break
    }
  }

  // 用 [起点索引, 终点索引] 描述每段，gas 积分在该索引区间内进行
  const definitions: Array<[OverviewStage['key'], string, number, number]> = [
    ['preheat', '预热', 0, preheatEnd],
    ['heating', '升温', preheatEnd, soakStart],
    ['soak', '保温', soakStart, soakEnd],
    ['cooling', '降温', soakEnd, points.length - 1],
  ]
  return definitions.map(([key, name, startIndex, endIndex]) => ({
    key,
    name,
    startMinute: points[startIndex]!.minute,
    endMinute: points[endIndex]!.minute,
    gasVolume: integrateGas(points, startIndex, endIndex),
  }))
}

// ===== 以下为 P1 工业总览新增：健康状态与阶段进度（纯函数、不依赖 Vue）=====

// 健康状态等级（与控制室状态灯对应）
export type HealthStatus = 'running' | 'warning' | 'alarm' | 'idle'

// 一条健康规则：正常区间（闭区间），超出即预警；规则可由调用方覆盖
export type HealthRule = {
  key: 'o2' | 'afr' | 'pressure'
  label: string
  unit: string
  normalMin: number
  normalMax: number
}

// 默认参考区间：基于 20 个真实窑次常见范围宽松取值，仅用于演示状态灯，现场应按工艺调整
export const DEFAULT_HEALTH_RULES: HealthRule[] = [
  { key: 'o2', label: '氧含量', unit: '%', normalMin: 2, normalMax: 6 },
  { key: 'afr', label: '空燃比', unit: 'Nm³/Nm³', normalMin: 9, normalMax: 12 },
  { key: 'pressure', label: '窑压', unit: 'Pa', normalMin: -50, normalMax: 50 },
]

/**
 * 按正常区间判定健康状态。
 * 缺测/非数值返回 idle（空闲）；落在正常区间返回 running；超出返回 warning。
 * alarm 预留给明确的严重越限，P1 不硬编码严重阈值，避免误报。
 */
export function evaluateHealth(value: number | null, rule: HealthRule): HealthStatus {
  if (value == null || Number.isNaN(value)) return 'idle'
  if (value < rule.normalMin || value > rule.normalMax) return 'warning'
  return 'running'
}

// 阶段与整体进度信息
export type StageProgressInfo = {
  stage: OverviewStage
  stageProgress: number // 当前阶段内进度 0-1
  overallProgress: number // 全窑次进度 0-1
}

/**
 * 计算当前分钟所处阶段及进度。
 * 阶段内进度按时间线性；整体进度按当前分钟占窑次总时长。
 */
export function stageProgress(stages: OverviewStage[], minute: number): StageProgressInfo | null {
  const stage = stages.find(item => minute >= item.startMinute && minute <= item.endMinute)
    ?? stages.find(item => minute < item.startMinute) ?? stages[stages.length - 1]
  if (!stage) return null
  const span = stage.endMinute - stage.startMinute
  const inside = span > 0 ? (minute - stage.startMinute) / span : 0
  const first = stages[0]?.startMinute ?? 0
  const last = stages[stages.length - 1]?.endMinute ?? first
  const overall = last > first ? (minute - first) / (last - first) : 0
  return {
    stage,
    stageProgress: Math.min(1, Math.max(0, inside)),
    overallProgress: Math.min(1, Math.max(0, overall)),
  }
}

/**
 * 取某信号最近 count 个非空点（用于迷你 sparkline）。
 * key 对应 OverviewPoint 字段；返回 [分钟, 值] 序列。
 */
export function recentSignal(
  points: OverviewPoint[], index: number, key: keyof OverviewPoint, count = 16,
): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let i = index; i >= 0 && out.length < count; i--) {
    const value = points[i]?.[key]
    if (typeof value === 'number') out.unshift([points[i]!.minute, value])
  }
  return out
}

// ===== 以下为 P3 新增：回测误差包络（历史残差范围，非概率置信区间）=====

// 按预测提前量汇总的误差包络：半宽取该提前量残差的样本标准差
export type BacktestEnvelope = {
  offsets: number[]
  halfWidths: number[]
  sampleCounts: number[]
}

// 样本标准差（n-1）；样本不足 2 个返回 0，避免除零
function sampleStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/**
 * 基于回放包全部帧的回测残差，按预测提前量统计误差半宽。
 * 残差 = 预测值 - 事后实测；同一提前量的所有残差求样本标准差。
 * 用途：在当前预测曲线两侧画“历史回测误差范围”，它不是概率置信区间，前端须如实标注。
 */
export function backtestEnvelope(replay: ReplayPackage, algorithmKey: AlgorithmKey): BacktestEnvelope {
  const residuals = new Map<number, number[]>()
  for (const frame of replay.frames) {
    const actual = new Map(frame.actualFuture.map(point => [point.minuteOffset, point.value]))
    for (const point of frame.future[algorithmKey] ?? []) {
      const real = actual.get(point.minuteOffset)
      if (point.value == null || real == null) continue
      const list = residuals.get(point.minuteOffset) ?? []
      list.push(point.value - real)
      residuals.set(point.minuteOffset, list)
    }
  }
  const offsets = [...residuals.keys()].sort((left, right) => left - right)
  return {
    offsets,
    halfWidths: offsets.map(offset => sampleStandardDeviation(residuals.get(offset) ?? [])),
    sampleCounts: offsets.map(offset => (residuals.get(offset) ?? []).length),
  }
}

// 当前帧预测结合误差包络后的上下界（用于在主图上画范围边界）
export type EnvelopeBandPoint = {
  minuteOffset: number
  forecast: number | null
  upper: number | null
  lower: number | null
}

/**
 * 把当前帧的预测序列与回测误差包络结合，输出每个提前量的预测值与上下界。
 */
export function envelopeBand(
  frame: ReplayFrame, algorithmKey: AlgorithmKey, envelope: BacktestEnvelope,
): EnvelopeBandPoint[] {
  const halfWidth = new Map(envelope.offsets.map((offset, i) => [offset, envelope.halfWidths[i]!]))
  return (frame.future[algorithmKey] ?? []).map(point => {
    const half = halfWidth.get(point.minuteOffset) ?? 0
    return {
      minuteOffset: point.minuteOffset,
      forecast: point.value,
      upper: point.value != null ? point.value + half : null,
      lower: point.value != null ? point.value - half : null,
    }
  })
}
