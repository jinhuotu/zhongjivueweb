import type { AlgorithmTuning, Task } from './kiln-studio-api'

export const KILN_PARAMETER_DIGITS = 4
export const KILN_TASK_UNITS: Record<Task, string> = { temperature: '℃', energy: 'Nm³/h', afr: 'Nm³/Nm³' }

export function kilnReadingDigits(unit?: string): number {
  return unit === 'Nm³/Nm³' ? 3 : 2
}

export function formatKilnNumber(value: unknown, digits = 2, useGrouping = true): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  const text = value.toLocaleString('zh-CN', { maximumFractionDigits: digits, useGrouping })
  return text === '-0' ? '0' : text
}

export function formatKilnReading(value: unknown, unit = ''): string {
  const text = formatKilnNumber(value, kilnReadingDigits(unit))
  return unit && text !== '—' ? text + ' ' + unit : text
}

export function formatKilnChartValue(value: unknown, unit = ''): string {
  return formatKilnReading(Array.isArray(value) ? value[1] : value, unit)
}

export function formatKilnParameterInput(value: number): string {
  return Number.isFinite(value) ? formatKilnNumber(value, KILN_PARAMETER_DIGITS, false) : ''
}

export function algorithmTuningLabel(tuning?: AlgorithmTuning | null): string {
  if (tuning?.ridgeAlpha != null) return `α = ${formatKilnNumber(tuning.ridgeAlpha, KILN_PARAMETER_DIGITS)}`
  if (tuning?.boostingRounds != null) return `${tuning.boostingRounds} 轮 · 学习率 ${formatKilnNumber(tuning.learningRate, KILN_PARAMETER_DIGITS)}`
  return ''
}
