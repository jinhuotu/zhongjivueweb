import type { ReplayFrame } from './kiln-studio-api'
import type { BacktestEnvelope } from './kiln-overview-model'

/** Keep the forecast horizon separate from the measured origin of the curve. */
export function followingForecast(frame: ReplayFrame | undefined, algorithm: string, horizon: number, envelope?: BacktestEnvelope) {
  const candidates = (frame?.future[algorithm] ?? [])
    .filter(point => point.minuteOffset > 0 && point.minuteOffset <= horizon)
  const target = candidates.reduce<(typeof candidates)[number] | undefined>(
    (latest, point) => !latest || point.minuteOffset > latest.minuteOffset ? point : latest, undefined,
  )
  const offset = target?.minuteOffset ?? null
  const forecast = typeof target?.value === 'number' && Number.isFinite(target.value) ? target.value : null
  const index = envelope?.offsets.findIndex(value => value === offset) ?? -1
  const half = index >= 0 && (envelope?.sampleCounts[index] ?? 0) >= 2 ? envelope?.halfWidths[index] : undefined
  const hasBounds = forecast != null && half != null && Number.isFinite(half) && half >= 0
  return {
    offset, forecast, shortened: offset != null && offset < horizon,
    upper: hasBounds ? forecast + half : null,
    lower: hasBounds ? forecast - half : null,
  }
}

/** Prefer above/right of the moving node; flip and clamp near chart edges. */
export function followingTooltipPosition(anchor: number[], box: number[], view: number[]) {
  const [x = 0, y = 0] = anchor
  const [width = 0, height = 0] = box
  const [viewWidth = 0, viewHeight = 0] = view
  const margin = 8
  const left = x + width + 16 <= viewWidth - margin ? x + 16 : x - width - 16
  const top = y - height - 16 >= margin ? y - height - 16 : y + 16
  return {
    left: Math.max(margin, Math.min(left, viewWidth - width - margin)),
    top: Math.max(margin, Math.min(top, viewHeight - height - margin)),
  }
}
