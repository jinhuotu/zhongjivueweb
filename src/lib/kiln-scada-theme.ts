// 窑炉控制室（SCADA）深色色板：总览看板专用，自包含、不依赖全局主题，
// 因此切到总览不会改变应用其他页面的浅色外观。
// 所有 ECharts 配置统一从这里取色，保证一屏内颜色语义一致。

export const scada = {
  // 容器与卡片
  bg: '#0d141d',
  card: '#141d29',
  cardAlt: '#18222f',
  border: '#243040',
  // 文字
  text: '#e6edf3',
  textSoft: '#aeb9c6',
  muted: '#7d8b9c',
  faint: '#566373',
  // 网格与轴
  grid: '#22303f',
  axis: '#6b7889',
  // 数据语义色
  actual: '#e08a3c', // 实测（橙）
  setpoint: '#93a0b0', // 设定（灰）
  prediction: '#3f93e8', // 预测（蓝）
  gas: '#2fae96', // 燃气/正向（青绿）
  violet: '#b06ab3', // 机理（紫）
  amber: '#d9a441', // 警告（琥珀）
  red: '#d65a4f', // 报警（红）
} as const

// 多算法/多系列顺序用色（与回放图例顺序对应）
export const scadaSeriesColors = [
  scada.prediction, scada.gas, scada.violet, scada.amber,
  '#7a6ad0', '#4f9b57', '#2f93a8',
]

// 状态灯颜色（与 HealthStatus 对应）
export const scadaStatusColor: Record<'running' | 'warning' | 'alarm' | 'idle', string> = {
  running: scada.gas,
  warning: scada.amber,
  alarm: scada.red,
  idle: scada.axis,
}

// 深色 tooltip 基础配置（结构与全局 tooltipBase 对齐，仅替换为 SCADA 色）
export function scadaTooltip() {
  return {
    backgroundColor: '#1b2532',
    borderColor: scada.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: [8, 10] as [number, number],
    textStyle: { color: scada.text, fontSize: 12 },
  }
}
