export const FP_ALERTS = {
  todayAlerts: 35,
  resolved: 28,
  pending: 7,
  summary: { critical: 3, warning: 8, info: 24, suppressed: 12 },
  recent: [
    { id: 'a1', time: '14:32', equipment: 'TC-06', rule: '轴承温度超限', value: '88.2℃', level: '严重' },
    { id: 'a2', time: '13:18', equipment: 'TC-04', rule: '振动值异常', value: '7.8 mm/s', level: '警告' },
    { id: 'a3', time: '11:45', equipment: 'TC-03', rule: '电流波动', value: 'σ=18.3%', level: '提示' },
    { id: 'a4', time: '10:02', equipment: 'TC-08', rule: '轴承温度超限', value: '86.5℃', level: '严重' },
  ],
}

export const FP_MAINTENANCE = {
  orders: [
    { id: 'o1', equipment: 'TC-06', type: '预测性', content: '主轴承更换', scheduled: '2026-07-01', status: '待执行', cost: 12500 },
    { id: 'o2', equipment: 'TC-04', type: '预测性', content: '风机轴承更换', scheduled: '2026-07-10', status: '待执行', cost: 4800 },
    { id: 'o3', equipment: 'TC-03', type: '预防性', content: '窑车密封条更换', scheduled: '2026-07-15', status: '待执行', cost: 2200 },
    { id: 'o4', equipment: 'TC-02', type: '预测性', content: '热电偶 K03 更换', scheduled: '2026-07-05', status: '执行中', cost: 900 },
    { id: 'o5', equipment: 'TC-01', type: '预防性', content: '燃烧器季度保养', scheduled: '2026-07-20', status: '待执行', cost: 3500 },
  ],
}

export const FP_OVERVIEW = {
  healthScore: 78,
  riskCount: 6,
  oee: 82.4,
  mtbf: 420,
  mttr: 3.2,
  deviceList: [
    { id: 'd1', name: 'TC-01', health: 88, risk: '低' },
    { id: 'd2', name: 'TC-02', health: 82, risk: '低' },
    { id: 'd3', name: 'TC-03', health: 75, risk: '中' },
    { id: 'd4', name: 'TC-04', health: 68, risk: '中' },
    { id: 'd5', name: 'TC-05', health: 91, risk: '低' },
    { id: 'd6', name: 'TC-06', health: 52, risk: '高' },
    { id: 'd7', name: 'TC-07', health: 79, risk: '中' },
    { id: 'd8', name: 'TC-08', health: 73, risk: '中' },
  ],
  riskList: [
    { id: 'r1', equipment: 'TC-06', fault: '主轴承磨损', probability: 78, level: '高' },
    { id: 'r2', equipment: 'TC-04', fault: '风机振动异常', probability: 65, level: '中' },
    { id: 'r3', equipment: 'TC-02', fault: '热电偶漂移', probability: 52, level: '中' },
  ],
}
