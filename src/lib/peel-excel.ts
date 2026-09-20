import { init } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import ExcelJS from 'exceljs'
import type { Border, Fill, Font, Worksheet } from 'exceljs'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import type { PeelMetrics, PeelPieSlice, PeelReportResult, PeelTableRow } from '@/lib/casting-api'

const PIE_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed']
const BAR_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706']

const FURNACE_FILLS = [
  { shift: 'FFD6EAF8', total: 'FFBDD7EE' },
  { shift: 'FFFCE4D6', total: 'FFF8CBAD' },
  { shift: 'FFE2EFDA', total: 'FFC6E0B4' },
  { shift: 'FFE2D5F1', total: 'FFCCC0DA' },
] as const

const HEADER_FILL = 'FF1F4E79'
const SUBHEAD_FILL = 'FF2E75B6'
const DATE_FILL = 'FF5B9BD5'
const GRAND_FILL = 'FFFFE699'
const NOTE_FILL = 'FFFFF2CC'
const WHITE = 'FFFFFFFF'
const RED = 'FFDC2626'
const TEXT = 'FF1F2937'
const LINE = 'FF8EA9DB'

const thin: Partial<Border> = { style: 'thin', color: { argb: LINE } }
const borders = { top: thin, left: thin, bottom: thin, right: thin }

const PIE_W = 380
const PIE_H = 260
const BAR_W = 560
const BAR_H = 260

function colLetter(n: number): string {
  let s = ''
  let x = n
  while (x > 0) {
    const m = (x - 1) % 26
    s = String.fromCharCode(65 + m) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

function fillArgb(argb: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function rateText(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate) || rate === 0) return '0%'
  return `${rate.toFixed(1)}%`
}

function fmtDateHead(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  return `${Number(m[2])}月${Number(m[3])}日`
}

function styleCell(
  ws: Worksheet,
  row: number,
  col: number,
  value: string | number,
  opts: {
    fill: string
    font?: Partial<Font>
    align?: 'center' | 'right' | 'left'
    wrap?: boolean
  },
): void {
  const cell = ws.getCell(row, col)
  cell.value = value
  cell.fill = fillArgb(opts.fill)
  cell.border = borders
  cell.font = { name: '微软雅黑', size: 9, color: { argb: TEXT }, ...opts.font }
  cell.alignment = {
    vertical: 'middle',
    horizontal: opts.align ?? 'center',
    wrapText: Boolean(opts.wrap),
  }
}

const SHIFT_TOTAL_FILL = 'FFF2F2F2'

function furnaceColorMap(rows: PeelTableRow[]): Map<string, (typeof FURNACE_FILLS)[number]> {
  const map = new Map<string, (typeof FURNACE_FILLS)[number]>()
  let i = 0
  for (const row of rows) {
    if (row.kind === 'grandTotal' || row.kind === 'shiftTotal') continue
    if (!row.furnaceName || map.has(row.furnaceName)) continue
    map.set(row.furnaceName, FURNACE_FILLS[i % FURNACE_FILLS.length])
    i += 1
  }
  return map
}

function rowFill(row: PeelTableRow, colors: Map<string, (typeof FURNACE_FILLS)[number]>): string {
  if (row.kind === 'grandTotal') return GRAND_FILL
  if (row.kind === 'shiftTotal') return SHIFT_TOTAL_FILL
  const pair = colors.get(row.furnaceName)
  if (!pair) return 'FFF8FAFC'
  return row.kind === 'furnaceTotal' ? pair.total : pair.shift
}

function dataUrlToBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(',')
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl
}

function createWorkbook(): ExcelJS.Workbook {
  const mod = ExcelJS as unknown as {
    Workbook?: new () => ExcelJS.Workbook
    default?: { Workbook?: new () => ExcelJS.Workbook }
  }
  const Ctor = mod.Workbook ?? mod.default?.Workbook
  if (!Ctor) throw new Error('ExcelJS 未能加载')
  return new Ctor()
}

function waitPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function renderChartPng(
  width: number,
  height: number,
  option: EChartsOption,
): Promise<string | null> {
  ensureEcharts()
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;height:${height}px;`
  document.body.appendChild(el)
  const chart = init(el, undefined, { renderer: 'canvas', width, height })
  try {
    chart.setOption(
      {
        animation: false,
        backgroundColor: '#ffffff',
        ...option,
      },
      { notMerge: true },
    )
    await waitPaint()
    return chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })
  } catch {
    return null
  } finally {
    chart.dispose()
    el.remove()
  }
}

function pieOption(
  title: string,
  slices: Array<{ name: string; value: number; color: string }>,
): EChartsOption {
  return {
    title: {
      text: title,
      left: 'center',
      top: 8,
      textStyle: { fontSize: 13, fontWeight: 600, color: '#111827' },
    },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'middle',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#374151', fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['38%', '55%'],
        padAngle: 2,
        label: { show: false },
        data: slices.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.color },
        })),
      },
    ],
  }
}

function barOption(result: PeelReportResult): EChartsOption {
  const shifts = result.shifts || []
  const keys = [
    { key: '平均', color: BAR_COLORS[0] },
    ...shifts.map((name, i) => ({
      key: name,
      color: BAR_COLORS[(i + 1) % BAR_COLORS.length],
    })),
  ]
  return {
    title: {
      text: '分日脱棱角率',
      left: 'center',
      top: 6,
      textStyle: { fontSize: 13, fontWeight: 600, color: '#111827' },
    },
    grid: { left: 44, right: 16, top: 48, bottom: 28 },
    legend: {
      top: 26,
      textStyle: { color: '#374151', fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: 'category',
      data: result.dailyBars.map((d) => String(d.name ?? '')),
      axisTick: { show: false },
      axisLabel: { color: '#4b5563', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#4b5563',
        fontSize: 10,
        formatter: (v: number | string) => `${v}%`,
      },
      splitLine: { lineStyle: { color: '#e5e7eb', type: [2, 4] } },
    },
    series: keys.map((k) => ({
      name: k.key,
      type: 'bar' as const,
      barMaxWidth: 22,
      itemStyle: { color: k.color, borderRadius: [3, 3, 0, 0] },
      data: result.dailyBars.map((d) => Number(d[k.key] ?? 0)),
    })),
  }
}

function chartSlices(
  items: PeelPieSlice[] | undefined,
  label: (s: PeelPieSlice) => string,
): Array<{ name: string; value: number; color: string }> {
  return (items || [])
    .filter((s) => s.peelCnt > 0)
    .map((s, i) => ({
      name: label(s),
      value: s.peelCnt,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
}

type ChartShot = {
  dataUrl: string | null
  width: number
  height: number
}

async function captureCharts(result: PeelReportResult): Promise<ChartShot[]> {
  const furnace = chartSlices(result.furnacePie, (s) => `${s.name} ${rateText(s.peelRate)}`)
  const shift = chartSlices(result.shiftPie, (s) => `${s.name} ${rateText(s.peelRate)}`)
  const position = (result.positionPie || [])
    .filter((s) => s.peelCnt > 0)
    .map((s, i) => ({
      name: `${s.name} ${s.share.toFixed(2)}%`,
      value: s.peelCnt,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))

  return [
    {
      dataUrl: furnace.length
        ? await renderChartPng(PIE_W, PIE_H, pieOption('电炉占比', furnace))
        : null,
      width: PIE_W,
      height: PIE_H,
    },
    {
      dataUrl: shift.length
        ? await renderChartPng(PIE_W, PIE_H, pieOption('班别占比', shift))
        : null,
      width: PIE_W,
      height: PIE_H,
    },
    {
      dataUrl: result.dailyBars.length
        ? await renderChartPng(BAR_W, BAR_H, barOption(result))
        : null,
      width: BAR_W,
      height: BAR_H,
    },
    {
      dataUrl: position.length
        ? await renderChartPng(PIE_W, PIE_H, pieOption('脱角部位', position))
        : null,
      width: PIE_W,
      height: PIE_H,
    },
  ]
}

function writeHeaders(ws: Worksheet, dates: string[], lastCol: number): void {
  const headFont: Partial<Font> = {
    name: '微软雅黑',
    size: 9,
    bold: true,
    color: { argb: WHITE },
  }
  const left = ['序号', '电炉', '班别', '出砖数', '脱角数', '占比%']
  left.forEach((text, i) => {
    ws.mergeCells(3, i + 1, 5, i + 1)
    styleCell(ws, 3, i + 1, text, { fill: HEADER_FILL, font: headFont, wrap: true })
    ws.getCell(4, i + 1).fill = fillArgb(HEADER_FILL)
    ws.getCell(4, i + 1).border = borders
    ws.getCell(5, i + 1).fill = fillArgb(HEADER_FILL)
    ws.getCell(5, i + 1).border = borders
  })

  if (!dates.length) return
  ws.mergeCells(3, 7, 3, lastCol)
  styleCell(ws, 3, 7, '生产日期', { fill: HEADER_FILL, font: headFont })
  for (let c = 8; c <= lastCol; c += 1) {
    ws.getCell(3, c).fill = fillArgb(HEADER_FILL)
    ws.getCell(3, c).border = borders
  }

  dates.forEach((d, i) => {
    const start = 7 + i * 3
    ws.mergeCells(4, start, 4, start + 2)
    styleCell(ws, 4, start, fmtDateHead(d), { fill: SUBHEAD_FILL, font: headFont })
    ws.getCell(4, start + 1).fill = fillArgb(SUBHEAD_FILL)
    ws.getCell(4, start + 1).border = borders
    ws.getCell(4, start + 2).fill = fillArgb(SUBHEAD_FILL)
    ws.getCell(4, start + 2).border = borders
    ;['出砖', '脱角', '占比'].forEach((label, j) => {
      styleCell(ws, 5, start + j, label, {
        fill: DATE_FILL,
        font: { ...headFont, size: 8 },
      })
    })
  })
}

function writeBody(
  ws: Worksheet,
  result: PeelReportResult,
  colors: Map<string, (typeof FURNACE_FILLS)[number]>,
): void {
  result.rows.forEach((row, idx) => {
    const r = 6 + idx
    const bg = rowFill(row, colors)
    const bold = row.kind !== 'shift'
    const font: Partial<Font> = { bold, size: 9, name: '微软雅黑', color: { argb: TEXT } }
    const hot = (peel: number): Partial<Font> =>
      peel > 0 ? { ...font, color: { argb: RED }, bold: true } : font

    styleCell(ws, r, 1, idx + 1, { fill: bg, font, align: 'center' })
    styleCell(ws, r, 2, row.kind === 'shiftTotal' ? '班别合计' : row.furnaceName, {
      fill: bg,
      font,
      align: 'center',
    })
    styleCell(ws, r, 3, row.shiftName || '', { fill: bg, font, align: 'center' })
    styleCell(ws, r, 4, row.total.brickCnt, { fill: bg, font, align: 'right' })
    styleCell(ws, r, 5, row.total.peelCnt, {
      fill: bg,
      font: hot(row.total.peelCnt),
      align: 'right',
    })
    styleCell(ws, r, 6, rateText(row.total.peelRate), {
      fill: bg,
      font: hot(row.total.peelCnt),
      align: 'right',
    })

    result.dates.forEach((d, di) => {
      const m: PeelMetrics | undefined = row.byDate[d]
      const start = 7 + di * 3
      const peel = m?.peelCnt ?? 0
      styleCell(ws, r, start, m?.brickCnt ?? 0, { fill: bg, font, align: 'right' })
      styleCell(ws, r, start + 1, peel, { fill: bg, font: hot(peel), align: 'right' })
      styleCell(ws, r, start + 2, rateText(m?.peelRate), {
        fill: bg,
        font: hot(peel),
        align: 'right',
      })
    })
    ws.getRow(r).height = 18
  })
}

function furnaceNoteLabel(name: string): string {
  const n = name.trim()
  if (!n) return n
  return n.endsWith('炉') ? n : `${n}炉`
}

function noteLines(result: PeelReportResult): string[] {
  const code = result.contractCode || '—'
  const to = result.dateTo || '—'
  const mat = result.rules?.materialLike || 'PT'
  const furnaceBits = (result.furnacePie || [])
    .map((s) => `${furnaceNoteLabel(s.name)}占比 ${rateText(s.peelRate)}`)
    .join('；')
  const lines = [
    '说明：',
    `1）、${code}=${mat}砖材，截止${to}，没有全部加工验收完。`,
    `2）按浇铸生产日期统计现有脱棱角情况，${furnaceBits || '暂无分炉数据'}。`,
  ]
  if (result.warnings?.length) {
    lines.push(`3）${result.warnings.join('；')}`)
  }
  return lines
}

export function peelReportNotes(result: PeelReportResult): string[] {
  return noteLines(result)
}

function writeNotesAndCharts(
  wb: ExcelJS.Workbook,
  ws: Worksheet,
  result: PeelReportResult,
  shots: ChartShot[],
  lastCol: number,
): void {
  const noteStart = 6 + result.rows.length + 1
  const notes = noteLines(result)
  const noteSpan = Math.max(12, Math.min(lastCol, 18))
  notes.forEach((line, i) => {
    const r = noteStart + i
    ws.mergeCells(r, 1, r, noteSpan)
    styleCell(ws, r, 1, line, {
      fill: NOTE_FILL,
      font: {
        name: '微软雅黑',
        size: 9,
        bold: i === 0,
        color: { argb: TEXT },
      },
      align: 'left',
      wrap: true,
    })
    ws.getRow(r).height = i === 0 ? 18 : 32
  })

  const chartRow = noteStart + notes.length + 1
  let colOffset = 0
  shots.forEach((shot) => {
    if (!shot.dataUrl) {
      colOffset += shot.width === BAR_W ? 8 : 5.5
      return
    }
    const imageId = wb.addImage({
      base64: dataUrlToBase64(shot.dataUrl),
      extension: 'png',
    })
    ws.addImage(imageId, {
      tl: { col: colOffset, row: chartRow - 1 },
      ext: { width: shot.width, height: shot.height },
      editAs: 'oneCell',
    })
    colOffset += shot.width === BAR_W ? 8 : 5.5
  })
  for (let i = 0; i < 16; i += 1) {
    ws.getRow(chartRow + i).height = 18
  }
}

async function buildWorkbook(result: PeelReportResult): Promise<ExcelJS.Workbook> {
  const dates = result.dates || []
  const lastCol = Math.max(6, 6 + dates.length * 3)
  const lastLetter = colLetter(lastCol)
  const wb = createWorkbook()
  wb.creator = '优祺智能 ECM'
  wb.created = new Date()
  wb.title = `${result.contractCode}合同PT砖材脱棱角情况统计`

  const ws = wb.addWorksheet('脱棱角统计', {
    views: [{ state: 'normal', activeCell: 'A1', showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      horizontalCentered: true,
    },
  })

  ws.columns = [
    { width: 8 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    ...dates.flatMap(() => [{ width: 8 }, { width: 8 }, { width: 9 }]),
  ]

  ws.mergeCells(`A1:${lastLetter}1`)
  styleCell(ws, 1, 1, `${result.contractCode}合同PT砖材脱棱角情况统计`, {
    fill: WHITE,
    font: { name: '微软雅黑', size: 16, bold: true, color: { argb: 'FF1F4E79' } },
  })
  ws.getCell(1, 1).border = {}
  ws.getRow(1).height = 28

  ws.mergeCells(`A2:${lastLetter}2`)
  styleCell(
    ws,
    2,
    1,
    `浇铸 ${result.dateFrom || '—'} ～ ${result.dateTo || '—'}  ·  PT规格 ${result.specCnt}  ·  出砖/脱角/占比`,
    {
      fill: WHITE,
      font: { name: '微软雅黑', size: 9, color: { argb: 'FF6B7280' } },
      align: 'left',
    },
  )
  ws.getCell(2, 1).border = {}

  writeHeaders(ws, dates, lastCol)
  ws.getRow(3).height = 22
  ws.getRow(4).height = 20
  ws.getRow(5).height = 18

  const colors = furnaceColorMap(result.rows)
  writeBody(ws, result, colors)

  const shots = await captureCharts(result)
  writeNotesAndCharts(wb, ws, result, shots, lastCol)

  return wb
}

export async function downloadPeelReportExcel(result: PeelReportResult): Promise<void> {
  if (!result.found) {
    throw new Error('请先生成报表后再导出')
  }
  const wb = await buildWorkbook(result)
  const buf = await wb.xlsx.writeBuffer()
  const bytes = new Uint8Array(buf as unknown as ArrayBuffer)
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.contractCode}合同PT砖材脱棱角情况统计.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
