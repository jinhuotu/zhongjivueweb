import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { useThemeStore } from '@/stores/theme'

export type ChartPalette = {
  grid: string
  axis: string
  legend: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  track: string
  pieBorder: string
  pointerShadow: string
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Read current document theme tokens (call inside computed that depends on theme.mode). */
export function getChartPalette(): ChartPalette {
  const isDark = document.documentElement.classList.contains('dark')
  return {
    grid: cssVar('--hairline', isDark ? '#2a3441' : '#d6e2f0'),
    axis: cssVar('--text-muted', isDark ? '#5A6677' : '#6b7280'),
    legend: cssVar('--text-secondary', isDark ? '#8b97a8' : '#4b5563'),
    tooltipBg: cssVar('--popover', isDark ? '#1c242e' : '#ffffff'),
    tooltipBorder: cssVar('--border', isDark ? '#2f3a48' : '#d6e2f0'),
    tooltipText: cssVar('--popover-foreground', isDark ? '#e6edf3' : '#111827'),
    track: cssVar('--muted', isDark ? '#1c242e' : '#eef3fa'),
    pieBorder: cssVar('--card', isDark ? '#0b0f14' : '#ffffff'),
    pointerShadow: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(37,99,235,0.06)',
  }
}

/** Reactive palette that updates when theme toggles. */
export function useChartPalette() {
  const theme = useThemeStore()
  return computed(() => {
    void theme.mode
    return getChartPalette()
  })
}

export function tooltipBase(p: ChartPalette = getChartPalette()) {
  return {
    backgroundColor: p.tooltipBg,
    borderColor: p.tooltipBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: [8, 10] as [number, number],
    textStyle: {
      color: p.tooltipText,
      fontSize: 12,
    },
  }
}

export function axisCommon(p: ChartPalette = getChartPalette()) {
  return {
    axisLine: { lineStyle: { color: p.grid } },
    axisTick: { show: false },
    axisLabel: {
      color: p.axis,
      fontSize: 10,
      fontFamily: 'JetBrains Mono, monospace',
    },
    splitLine: {
      show: true,
      lineStyle: { color: p.grid, type: [2, 4] as number[] },
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

export function baseGridOption(
  extra?: Partial<EChartsOption>,
  p: ChartPalette = getChartPalette(),
): EChartsOption {
  return {
    grid: { left: 40, right: 16, top: 28, bottom: 28, containLabel: false },
    tooltip: { ...tooltipBase(p), trigger: 'axis' },
    ...extra,
  }
}

/** @deprecated use useChartPalette() — kept for light fallback imports */
export const GRID_COLOR = '#d6e2f0'
export const AXIS_COLOR = '#6b7280'
export const TOOLTIP_BG = '#ffffff'
export const LEGEND_COLOR = '#4b5563'
