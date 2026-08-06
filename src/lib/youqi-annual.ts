import { COLOR } from './mock'

/** 优祺式年度演示数据（后端年累计未接入时的占位） */
export const YOUQI_ANNUAL = {
  elecShare: [
    { name: '2025', value: 78.89, color: COLOR.molybdenum },
    { name: '2026 YTD', value: 21.11, color: COLOR.patina },
  ],
  renewableTrend: [
    { name: '2023', 占比: 0.12 },
    { name: '2024', 占比: 0.28 },
    { name: '2025', 占比: 0.41 },
    { name: '2026', 占比: 0.55 },
  ],
  carbonVsValue: [
    { name: '2023', 工业增加值: 8200, 碳排放: 18600 },
    { name: '2024', 工业增加值: 9100, 碳排放: 19800 },
    { name: '2025', 工业增加值: 12800, 碳排放: 22400 },
    { name: '2026', 工业增加值: 5400, 碳排放: 6100 },
  ],
  emissionCompare: [
    { name: '2025', 排放量: 22450 },
    { name: '2026 YTD', 排放量: 6100 },
  ],
}
