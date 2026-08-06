import type { EChartsOption } from 'echarts'

export const GRID_COLOR = '#2a3441'
export const AXIS_COLOR = '#5A6677'
export const TOOLTIP_BG = '#1c242e'
export const LEGEND_COLOR = '#8b97a8'

export const tooltipBase = {
  backgroundColor: TOOLTIP_BG,
  borderColor: '#2f3a48',
  borderWidth: 1,
  borderRadius: 8,
  padding: [8, 10] as [number, number],
  textStyle: {
    color: '#e6edf3',
    fontSize: 12,
  },
}

export function axisCommon() {
  return {
    axisLine: { lineStyle: { color: GRID_COLOR } },
    axisTick: { show: false },
    axisLabel: {
      color: AXIS_COLOR,
      fontSize: 10,
      fontFamily: 'JetBrains Mono, monospace',
    },
    splitLine: {
      show: true,
      lineStyle: { color: GRID_COLOR, type: [2, 4] as number[] },
    },
  }
}

export function withYUnit(unit?: string) {
  return (v: number | string) => `${v}${unit ?? ''}`
}

/** hex → rgba with alpha */
export function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  const n = parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

export type ChartKey = {
  key: string
  color: string
  label?: string
  dashed?: boolean
}

export type ChartDatum = Record<string, number | string>

export function baseGridOption(extra?: Partial<EChartsOption>): EChartsOption {
  return {
    grid: { left: 40, right: 16, top: 28, bottom: 28, containLabel: false },
    tooltip: { ...tooltipBase, trigger: 'axis' },
    ...extra,
  }
}
