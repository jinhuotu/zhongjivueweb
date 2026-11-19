import type { Algorithm, AlgorithmKey, AlgorithmMetadata, ExperimentConfig, ExperimentPoint, Parameters } from './kiln-studio-api'

/** JSON object property order can change during a database/API round trip. */
export function samePhysicsParameters(left: Parameters, right: Parameters): boolean {
  const keys = Object.keys(left) as (keyof Parameters)[]
  return keys.length === Object.keys(right).length && keys.every(key =>
    Number.isFinite(left[key]) && left[key] === right[key],
  )
}

export function sameTemplateSelection(left: string[], right: string[]): boolean {
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  return leftSet.size === rightSet.size && [...leftSet].every(key => rightSet.has(key))
}

export function sameExperimentConfig(left: ExperimentConfig, right: ExperimentConfig): boolean {
  return sameTemplateSelection(left.selectedAlgorithmKeys ?? [], right.selectedAlgorithmKeys ?? []) &&
    (Object.keys(left) as (keyof ExperimentConfig)[]).every(key =>
      key === 'selectedAlgorithmKeys' || (key === 'lockedParameters'
      ? sameTemplateSelection(left.lockedParameters, right.lockedParameters)
      : key === 'excludeZeroTemperatureRecords' ? !!left[key] === !!right[key]
      : left[key] === right[key]),
  )
}

export function externalAlgorithmIssue(item: AlgorithmMetadata, config: ExperimentConfig): string {
  const model = item.external
  if (!model) return ''
  if (model.task !== config.task || model.zone !== config.zone) return '外部模型的预测任务或温区与当前实验不一致'
  if (model.horizonMinutes !== config.horizonMinutes) return `外部模型要求预测时长 ${model.horizonMinutes} 分钟`
  if (model.historyMinutes !== config.historyMinutes) return `外部模型要求历史窗口 ${model.historyMinutes} 分钟`
  return ''
}

export function algorithmCards(library: AlgorithmMetadata[], algorithms: Algorithm[] = []) {
  const results = new Map(algorithms.map(item => [item.key, item]))
  const current = library.map(definition => {
    const result = results.get(definition.key)
    results.delete(definition.key)
    return { definition, result, historical: !!result && (result.version ?? '1') !== definition.version }
  })
  return [
    ...current,
    ...[...results.values()].map(result => ({ definition: undefined, result, historical: true })),
  ]
}

export function hasUsableBacktest(result: Algorithm | undefined): boolean {
  return !!result?.available && !!result.test && result.test.count > 0 &&
    result.test.mae != null && Number.isFinite(result.test.mae)
}

export function hasMinuteForecast(algorithm: Algorithm | undefined, minutes: number): boolean {
  const offsets = new Set(algorithm?.predictionOffsets)
  return algorithm?.available === true && Array.from({ length: minutes }, (_, index) => index + 1)
    .every(minute => offsets.has(minute))
}

export function temperatureCandidates(algorithms: Algorithm[], validationCount: number): Algorithm[] {
  return algorithms.filter(algorithm => hasUsableBacktest(algorithm) &&
    algorithm.validation?.count === validationCount && algorithm.validation.coverage === 1 &&
    algorithm.validation.mae != null && Number.isFinite(algorithm.validation.mae) &&
    algorithm.validation.rmse != null && Number.isFinite(algorithm.validation.rmse),
  ).sort((left, right) => {
    const a = left.validation!
    const b = right.validation!
    const aMeets = a.mae! <= 10 && a.rmse! <= 15
    const bMeets = b.mae! <= 10 && b.rmse! <= 15
    return Number(bMeets) - Number(aMeets) || a.rmse! - b.rmse! || a.mae! - b.mae!
  })
}

export function algorithmPrediction(point: ExperimentPoint, key: AlgorithmKey): number | null {
  const value = point[key]
  return typeof value === 'number' && Number.isFinite(value) && value !== -9999 ? value : null
}

export function compareValidationScores(algorithms: Algorithm[], validationCount: number) {
  const eligible = algorithms.flatMap(algorithm => {
    const metric = algorithm.validation
    if (!algorithm.available || !metric || validationCount <= 0 ||
      metric.count !== validationCount || metric.coverage !== 1 ||
      metric.mae == null || !Number.isFinite(metric.mae) || metric.mae < 0 ||
      metric.rmse == null || !Number.isFinite(metric.rmse) || metric.rmse < 0) return []
    return [{ key: algorithm.key, name: algorithm.name, mae: metric.mae, rmse: metric.rmse }]
  })
  if (eligible.length < 2) return []

  const bestMae = Math.min(...eligible.map(row => row.mae))
  const bestRmse = Math.min(...eligible.map(row => row.rmse))
  const ratio = (best: number, value: number) => value === 0 ? 1 : best / value
  return eligible.map(row => ({
    ...row,
    score: Math.round(10 * (60 * ratio(bestMae, row.mae) + 40 * ratio(bestRmse, row.rmse))) / 10,
    lowestMae: row.mae === bestMae,
    lowestRmse: row.rmse === bestRmse,
  })).sort((a, b) => b.score - a.score)
}
