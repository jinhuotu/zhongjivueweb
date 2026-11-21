import type { ReplayPoint } from './kiln-studio-api'

const tolerance = 1e-6

export function replayDeviations(actual: ReplayPoint[], algorithm: ReplayPoint[], mechanism: ReplayPoint[]) {
  const key = (minute: number) => Math.round(minute / tolerance)
  const index = (points: ReplayPoint[]) => new Map(points.map(point => [key(point.minuteOffset), point]))
  const observations = index(actual)
  const predictions = index(algorithm)
  const reference = index(mechanism)
  const offsets = [...new Set([...predictions.keys(), ...reference.keys()])].sort((a, b) => a - b)
  return offsets.map(offset => {
    const actualValue = observations.get(offset)?.value ?? null
    const predictedValue = predictions.get(offset)?.value ?? null
    const mechanismValue = reference.get(offset)?.value ?? null
    return {
      minute: (predictions.get(offset) ?? reference.get(offset))!.minuteOffset,
      actual: actualValue, algorithm: predictedValue, mechanism: mechanismValue,
      algorithmDeviation: actualValue !== null && predictedValue !== null ? predictedValue - actualValue : null,
      mechanismDeviation: actualValue !== null && mechanismValue !== null ? mechanismValue - actualValue : null,
    }
  })
}

export function replayFuelVolume(points: ReplayPoint[], window: number, maxGap: number) {
  let volume = 0
  let covered = 0
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1]!
    const right = points[index]!
    const gap = right.minuteOffset - left.minuteOffset
    if (left.minuteOffset >= window) break
    if (left.value === null || right.value === null || gap <= 0 || gap > maxGap + tolerance) continue
    const span = Math.min(right.minuteOffset, window) - left.minuteOffset
    const end = left.value + (right.value - left.value) * (span / gap)
    volume += (left.value + end) * span / 120
    covered += span
  }
  return { volume: covered ? volume : null, covered, complete: Math.abs(window - covered) <= tolerance }
}

export function replayAlgorithmFuelVolume(points: ReplayPoint[], window: number, nativeMinutes: number, trajectory?: string | null) {
  const minuteOutput = ['multiOutput', 'minuteRecursive', 'persistence', 'mechanism'].includes(trajectory ?? '')
  const allowedGap = minuteOutput ? 1 : Math.min(nativeMinutes, 5)
  return replayFuelVolume(points, window, allowedGap)
}
