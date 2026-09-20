import { init } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import ExcelJS from 'exceljs'
import type { Border, Fill, Font, Worksheet } from 'exceljs'
import { ensureEcharts } from '@/components/ui-kit/charts/register'
import type { WechatDailyParseResult } from '@/lib/casting-api'

export function stripAtMentions(text: string): string {
  return (text || '')
    .replace(/@+[\u200b\u200c\u200d\ufeff]*[^\s@]+(?:[ \t\u00a0\u2005]+[A-Za-z][A-Za-z.]*)*/g, ' ')
    .replace(/[ \t\u00a0\u2005]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function scrubQaDay(col: WechatDailyParseResult | null): WechatDailyParseResult | null {
  if (!col) return null
  const firstDetails = stripAtMentions(col.firstDetails || '')
  const secondDetails = stripAtMentions(col.secondDetails || '')
  return {
    ...col,
    firstDetails,
    secondDetails,
    casting: {
      ...col.casting,
      details: stripAtMentions(col.casting?.details || ''),
    },
    machining: {
      ...col.machining,
      details: stripAtMentions(col.machining?.details || ''),
    },
  }
}

const HEADER_FILL = 'FF1F4E79'
const WHITE = 'FFFFFFFF'
const TEXT = 'FF1F2937'
const LINE = 'FF8EA9DB'
const NOTE_FILL = 'FFFFF2CC'
const DETAIL_FILL = 'FFF8FAFC'

const thin: Partial<Border> = { style: 'thin', color: { argb: LINE } }
const borders = { top: thin, left: thin, bottom: thin, right: thin }

type DayCol = WechatDailyParseResult | null

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

function createWorkbook(): ExcelJS.Workbook {
  const mod = ExcelJS as unknown as {
    Workbook?: new () => ExcelJS.Workbook
    default?: { Workbook?: new () => ExcelJS.Workbook }
  }
  const Ctor = mod.Workbook ?? mod.default?.Workbook
  if (!Ctor) throw new Error('ExcelJS 未能加载')
  return new Ctor()
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

function fmtNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return ''
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return ''
  return `${v.toFixed(1)}%`
}

function waitPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function dataUrlToBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(',')
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl
}

async function renderLinePng(
  year: number,
  month: number,
  days: DayCol[],
): Promise<string | null> {
  ensureEcharts()
  const cats = Array.from({ length: 31 }, (_, i) => String(i + 1))
  const first = days.map((d) => d?.firstRate ?? null)
  const second = days.map((d) => d?.secondRate ?? null)
  const target = days.map((d) => (d ? 100 : null))
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:-99999px;top:0;width:960px;height:320px;'
  document.body.appendChild(el)
  const chart = init(el, undefined, { renderer: 'canvas', width: 960, height: 320 })
  const option: EChartsOption = {
    animation: false,
    backgroundColor: '#ffffff',
    title: {
      text: `${year}年${month}月合格率情况`,
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 600, color: '#111827' },
    },
    legend: { top: 28, textStyle: { fontSize: 11, color: '#374151' } },
    grid: { left: 48, right: 24, top: 56, bottom: 28 },
    xAxis: {
      type: 'category',
      data: cats,
      axisLabel: { fontSize: 10, color: '#4b5563' },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 120,
      axisLabel: { formatter: '{value}%', fontSize: 10, color: '#4b5563' },
      splitLine: { lineStyle: { color: '#e5e7eb' } },
    },
    series: [
      {
        name: '一检',
        type: 'line',
        data: first,
        connectNulls: false,
        itemStyle: { color: '#2563eb' },
        label: { show: true, fontSize: 9, formatter: (p) => (p.value == null ? '' : `${p.value}`) },
      },
      {
        name: '二检汇总',
        type: 'line',
        data: second,
        connectNulls: false,
        itemStyle: { color: '#dc2626' },
        label: { show: true, fontSize: 9, formatter: (p) => (p.value == null ? '' : `${p.value}`) },
      },
      {
        name: '指标',
        type: 'line',
        data: target,
        connectNulls: false,
        itemStyle: { color: '#16a34a' },
        lineStyle: { type: 'dashed' },
      },
    ],
  }
  try {
    chart.setOption(option, { notMerge: true })
    await waitPaint()
    return chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' })
  } catch {
    return null
  } finally {
    chart.dispose()
    el.remove()
  }
}

export async function downloadQaMonthExcel(
  year: number,
  month: number,
  days: DayCol[],
): Promise<void> {
  const cleaned = days.map((d) => scrubQaDay(d))
  const wb = createWorkbook()
  wb.creator = '优祺智能 ECM'
  wb.title = `${year}年${month}月合格率情况`
  const lastCol = 32
  const lastLetter = colLetter(lastCol)
  const ws = wb.addWorksheet('合格率情况', {
    views: [{ state: 'normal', activeCell: 'A1', showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  })
  ws.columns = [{ width: 14 }, ...Array.from({ length: 31 }, () => ({ width: 9 }))]

  ws.mergeCells(`A1:${lastLetter}1`)
  styleCell(ws, 1, 1, `${String(year).slice(2)}年${month}月合格率情况`, {
    fill: WHITE,
    font: { name: '微软雅黑', size: 16, bold: true, color: { argb: 'FF1F4E79' } },
  })
  ws.getCell(1, 1).border = {}
  ws.getRow(1).height = 28

  const headFont: Partial<Font> = {
    name: '微软雅黑',
    size: 9,
    bold: true,
    color: { argb: WHITE },
  }
  styleCell(ws, 2, 1, '', { fill: HEADER_FILL, font: headFont })
  for (let d = 1; d <= 31; d += 1) {
    styleCell(ws, 2, d + 1, d, { fill: HEADER_FILL, font: headFont })
  }

  const metricRows: Array<{
    label: string
    fill: string
    height: number
    wrap?: boolean
    value: (col: DayCol) => string
  }> = [
    { label: '台数', fill: WHITE, height: 18, value: (c) => fmtNum(c?.taiShu) },
    { label: '合格率', fill: WHITE, height: 18, value: (c) => fmtPct(c?.heGeRate) },
    { label: '一检', fill: WHITE, height: 18, value: (c) => fmtPct(c?.firstRate) },
    { label: '二检汇总', fill: WHITE, height: 18, value: (c) => fmtPct(c?.secondRate) },
    { label: '回收率', fill: WHITE, height: 18, value: (c) => (c ? fmtPct(c.recycleRate ?? 100) : '') },
    { label: '指标', fill: WHITE, height: 18, value: (c) => (c ? fmtPct(c.targetRate ?? 100) : '') },
    { label: '一检偏差', fill: WHITE, height: 18, value: (c) => fmtPct(c?.firstDeviation) },
    { label: '二检偏差', fill: WHITE, height: 18, value: (c) => fmtPct(c?.secondDeviation) },
    {
      label: '一检明细',
      fill: DETAIL_FILL,
      height: 72,
      wrap: true,
      value: (c) => c?.firstDetails || '',
    },
    {
      label: '二检明细',
      fill: DETAIL_FILL,
      height: 72,
      wrap: true,
      value: (c) => c?.secondDetails || '',
    },
  ]

  metricRows.forEach((row, i) => {
    const r = 3 + i
    styleCell(ws, r, 1, row.label, {
      fill: HEADER_FILL,
      font: headFont,
      wrap: true,
    })
    for (let d = 1; d <= 31; d += 1) {
      const col = cleaned[d - 1] || null
      styleCell(ws, r, d + 1, row.value(col), {
        fill: row.fill,
        align: row.wrap ? 'left' : 'center',
        wrap: row.wrap,
        font: { name: '微软雅黑', size: row.wrap ? 8 : 9, color: { argb: TEXT } },
      })
    }
    ws.getRow(r).height = row.height
  })

  const noteRow = 13
  ws.mergeCells(`A${noteRow}:${lastLetter}${noteRow}`)
  styleCell(
    ws,
    noteRow,
    1,
    '说明：台数=熔铸投入吨；合格率=熔铸+加工吨加权；一检=熔铸成品率；二检汇总=加工成品率；偏差=实际−100%。来源为微信群日报粘贴解析。',
    {
      fill: NOTE_FILL,
      font: { name: '微软雅黑', size: 9, color: { argb: TEXT } },
      align: 'left',
      wrap: true,
    },
  )
  ws.getRow(noteRow).height = 28

  const png = await renderLinePng(year, month, cleaned)
  if (png) {
    const imageId = wb.addImage({
      base64: dataUrlToBase64(png),
      extension: 'png',
    })
    ws.addImage(imageId, {
      tl: { col: 0, row: noteRow },
      ext: { width: 960, height: 320 },
      editAs: 'oneCell',
    })
    for (let i = 0; i < 18; i += 1) {
      ws.getRow(noteRow + 1 + i).height = 18
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  const bytes = new Uint8Array(buf as unknown as ArrayBuffer)
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${year}年${month}月合格率情况.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
