/** 逻辑画布尺寸 */
export const KILN_W = 1960
export const KILN_H = 380
export const KILN_ASPECT = `${KILN_W} / ${KILN_H}`

/**
 * 布局（与叠字共用）
 * 左冷却带 | 中烧成带(红) | 右预热带
 */
export const KILN_LAYOUT = {
  bodyLeft: 40,
  bodyRight: 1920,
  bodyTop: 118,
  bodyH: 118,
  coolW: 260,
  preheatW: 220,
  /** 五根蓝竖管中心 X（六区→二区，均落在烧成带内） */
  riserXs: [480, 780, 1080, 1380, 1640] as const,
  orangeY: 175,
  orangeR: 22,
  blueY: 78,
  blueR: 7,
  baseTop: 248,
  baseH: 88,
  baseSegN: 5,
  baseGap: 3,
} as const

export const ZONE_XS = KILN_LAYOUT.riserXs.map((x) =>
  Math.round((x / KILN_W) * 1000) / 10,
) as [number, number, number, number, number]

/** 底座分段几何（叠字用，百分比相对整幅画布） */
export function getBaseSegments() {
  const L = KILN_LAYOUT
  const bodyW = L.bodyRight - L.bodyLeft
  const segW = (bodyW - L.baseGap * (L.baseSegN - 1)) / L.baseSegN
  return Array.from({ length: L.baseSegN }, (_, i) => {
    const x = L.bodyLeft + i * (segW + L.baseGap)
    return {
      leftPct: (x / KILN_W) * 100,
      widthPct: (segW / KILN_W) * 100,
      centerPct: ((x + segW / 2) / KILN_W) * 100,
    }
  })
}

export const BASE_TOP_PCT = (KILN_LAYOUT.baseTop / KILN_H) * 100
export const BASE_H_PCT = (KILN_LAYOUT.baseH / KILN_H) * 100

const ORANGE: [string, string, string] = ['#b84808', '#ffc056', '#e07018']
const BLUE: [string, string, string] = ['#1a3a9a', '#4a7cff', '#1e48b0']

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function strokeCylH(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  cy: number,
  r: number,
  colors: [string, string, string],
) {
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r)
  g.addColorStop(0, colors[0])
  g.addColorStop(0.42, colors[1])
  g.addColorStop(1, colors[2])
  ctx.strokeStyle = g
  ctx.lineWidth = r * 2
  ctx.lineCap = 'butt'
  ctx.beginPath()
  ctx.moveTo(x0, cy)
  ctx.lineTo(x1, cy)
  ctx.stroke()
}

function strokeCylV(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y0: number,
  y1: number,
  r: number,
  colors: [string, string, string],
) {
  const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0)
  g.addColorStop(0, colors[0])
  g.addColorStop(0.42, colors[1])
  g.addColorStop(1, colors[2])
  ctx.strokeStyle = g
  ctx.lineWidth = r * 2
  ctx.lineCap = 'butt'
  ctx.beginPath()
  ctx.moveTo(cx, y0)
  ctx.lineTo(cx, y1)
  ctx.stroke()
}

export function drawKiln(ctx: CanvasRenderingContext2D) {
  const L = KILN_LAYOUT
  const bodyL = L.bodyLeft
  const bodyR = L.bodyRight
  const bodyW = bodyR - bodyL
  const bodyT = L.bodyTop
  const bodyH = L.bodyH
  const bodyB = bodyT + bodyH
  const coolR = bodyL + L.coolW
  const fireR = bodyR - L.preheatW

  ctx.clearRect(0, 0, KILN_W, KILN_H)

  // 底座分段
  const baseY = L.baseTop
  const baseH = L.baseH
  const segN = L.baseSegN
  const gap = L.baseGap
  const segW = (bodyW - gap * (segN - 1)) / segN
  for (let i = 0; i < segN; i++) {
    const x = bodyL + i * (segW + gap)
    const g = ctx.createLinearGradient(0, baseY, 0, baseY + baseH)
    g.addColorStop(0, '#3a3f48')
    g.addColorStop(0.55, '#2a2e36')
    g.addColorStop(1, '#1c1f26')
    ctx.fillStyle = g
    roundRect(ctx, x, baseY, segW, baseH, i === 0 || i === segN - 1 ? 14 : 4)
    ctx.fill()
    ctx.strokeStyle = 'rgba(180,190,210,0.16)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // 色带：整块 fill，避免位图毛边
  {
    const g = ctx.createLinearGradient(0, bodyT, 0, bodyB)
    g.addColorStop(0, '#7ef0e8')
    g.addColorStop(0.5, '#3ad4c8')
    g.addColorStop(1, '#1aa89c')
    ctx.fillStyle = g
    ctx.fillRect(bodyL, bodyT, L.coolW, bodyH)
  }
  {
    const g = ctx.createLinearGradient(0, bodyT, 0, bodyB)
    g.addColorStop(0, '#ff5a4a')
    g.addColorStop(0.3, '#e82018')
    g.addColorStop(0.65, '#c41010')
    g.addColorStop(1, '#9a0c0c')
    ctx.fillStyle = g
    ctx.fillRect(coolR, bodyT, fireR - coolR, bodyH)
  }
  {
    const g = ctx.createLinearGradient(0, bodyT, 0, bodyB)
    g.addColorStop(0, '#f0a0c8')
    g.addColorStop(0.5, '#d060a0')
    g.addColorStop(1, '#8a4080')
    ctx.fillStyle = g
    ctx.fillRect(fireR, bodyT, L.preheatW, bodyH)
  }

  ctx.strokeStyle = 'rgba(200,210,230,0.5)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(bodyL + 0.5, bodyT + 0.5, bodyW - 1, bodyH - 1)

  // 车位竖格
  const cells = 72
  const cellW = bodyW / cells
  for (let i = 1; i < cells; i++) {
    const x = Math.round(bodyL + i * cellW) + 0.5
    const atBound = Math.abs(x - coolR) < 1.5 || Math.abs(x - fireR) < 1.5
    ctx.strokeStyle = atBound ? 'rgba(15,18,24,0.5)' : 'rgba(15,18,24,0.26)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, bodyT)
    ctx.lineTo(x, bodyB)
    ctx.stroke()
  }

  const footH = 16
  const footY = bodyB - footH
  ctx.fillStyle = 'rgba(15,18,24,0.55)'
  ctx.fillRect(bodyL, footY, bodyW, footH)
  for (let i = 0; i < cells; i++) {
    const x = bodyL + i * cellW
    ctx.strokeStyle = 'rgba(180,190,210,0.22)'
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(x) + 0.5, footY + 0.5, Math.max(1, cellW - 1), footH - 1)
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.moveTo(bodyL, Math.round(bodyT + bodyH * 0.42) + 0.5)
  ctx.lineTo(bodyR, Math.round(bodyT + bodyH * 0.42) + 0.5)
  ctx.stroke()

  // 二区半透明高亮
  {
    const hx = L.riserXs[4] - 70
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(hx, bodyT + 4, 140, bodyH - footH - 8)
    ctx.strokeStyle = 'rgba(255,255,255,0.32)'
    ctx.lineWidth = 1
    ctx.strokeRect(hx + 0.5, bodyT + 4.5, 139, bodyH - footH - 9)
  }

  // 蓝管总管 + 细支
  const blueY = L.blueY
  const blueR = L.blueR
  const blueLeft = coolR + 24
  const blueRight = bodyR - 40
  strokeCylH(ctx, blueLeft, blueRight, blueY, blueR, BLUE)

  ctx.save()
  ctx.strokeStyle = '#2a5ad4'
  ctx.lineWidth = 1.4
  const fireStart = Math.round(((coolR - bodyL) / bodyW) * cells)
  const fireEnd = Math.round(((fireR - bodyL) / bodyW) * cells)
  for (let i = fireStart; i < fireEnd; i++) {
    const x = bodyL + (i + 0.5) * cellW
    ctx.beginPath()
    ctx.moveTo(x, blueY + blueR)
    ctx.lineTo(x, bodyT + 1)
    ctx.stroke()
  }
  ctx.restore()

  for (const rx of L.riserXs) {
    const top = blueY - 44
    strokeCylV(ctx, rx, top, blueY + blueR, blueR + 1.5, BLUE)
    strokeCylH(ctx, rx - 18, rx + 18, top, blueR + 0.5, BLUE)
  }

  const dropX = blueRight
  strokeCylV(ctx, dropX, blueY, L.orangeY, blueR, BLUE)
  strokeCylH(ctx, fireR - 36, dropX, L.orangeY, blueR, BLUE)

  // 橙管 L：竖段 / 弯头 / 横段分开画
  const oy = L.orangeY
  const or = L.orangeR
  const elbowX = bodyL + 72
  const upTop = bodyT - 10
  const bendR = Math.max(or + 4, 28)
  const bendCx = elbowX + bendR
  const bendCy = oy - bendR

  strokeCylV(ctx, elbowX, upTop, bendCy + 1, or, ORANGE)
  strokeCylH(ctx, bendCx - 1, fireR - 10, oy, or, ORANGE)

  {
    const g = ctx.createLinearGradient(elbowX - or, oy - bendR, elbowX + bendR + or, oy + or)
    g.addColorStop(0, ORANGE[0])
    g.addColorStop(0.45, ORANGE[1])
    g.addColorStop(1, ORANGE[2])
    ctx.strokeStyle = g
    ctx.lineWidth = or * 2
    ctx.lineCap = 'butt'
    ctx.beginPath()
    ctx.arc(bendCx, bendCy, bendR, Math.PI, Math.PI / 2, true)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(255,230,160,0.42)'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(bendCx, oy - or * 0.38)
  ctx.lineTo(fireR - 18, oy - or * 0.38)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(elbowX - or * 0.38, upTop + 8)
  ctx.lineTo(elbowX - or * 0.38, bendCy)
  ctx.stroke()
}
