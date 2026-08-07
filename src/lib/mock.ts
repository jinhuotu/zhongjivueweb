export const COLOR = {
  iron: '#FF6B35',
  molybdenum: '#4A9EFF',
  patina: '#7FB069',
  sulfur: '#F4C430',
  coolant: '#5DD3E0',
  rose: '#E06B8A',
}

export const energyMonth = Array.from({ length: 30 }, (_, i) => {
  return {
    name: `${i + 1}`,
    天然气: +(620 + Math.sin(i / 5) * 80 + Math.random() * 40).toFixed(0),
    辅助电力: +(108 + Math.cos(i / 4) * 12 + Math.random() * 8).toFixed(0),
    蒸汽: +(72 + Math.sin(i / 6) * 10 + Math.random() * 6).toFixed(0),
  }
})

export const energyMix = [
  { name: '天然气', value: 78.4, color: COLOR.sulfur },
  { name: '辅助电力（风机/控制）', value: 12.6, color: COLOR.molybdenum },
  { name: '低压蒸汽', value: 4.2, color: COLOR.coolant },
  { name: '焦炉煤气（备用）', value: 2.4, color: COLOR.iron },
  { name: '绿电消纳', value: 2.4, color: COLOR.patina },
]

export const carbonScope = [
  { name: '范围一 天然气燃烧', value: 82.6, color: COLOR.iron },
  { name: '范围二 外购电力', value: 14.8, color: COLOR.molybdenum },
  { name: '范围三 上游甲烷逸散等', value: 2.6, color: COLOR.coolant },
]

export const optimizationSuggestions = [
  {
    title: '2# 正火车式窑 空燃比闭环 + 残氧 PID 整定',
    target: '2# 正火车式窑',
    saveEnergy: '840 tce/年',
    saveCarbon: '2210 tCO₂/年',
    payback: '1.8 个月',
    confidence: 'high' as const,
    method: '燃烧诊断',
  },
  {
    title: '3# 调质车式窑 蓄热式烧嘴空气预热温度提至 880℃',
    target: '3# 调质车式窑',
    saveEnergy: '1240 tce/年',
    saveCarbon: '3260 tCO₂/年',
    payback: '6.4 个月',
    confidence: 'high' as const,
    method: '余热挖潜',
  },
  {
    title: '4# 烧成车式窑 烟气余热回收增设有机朗肯循环 ORC',
    target: '4# 烧成车式窑',
    saveEnergy: '1640 tce/年',
    saveCarbon: '4310 tCO₂/年',
    payback: '14 个月',
    confidence: 'medium' as const,
    method: '热平衡 + ROI',
  },
  {
    title: '1# 退火车式窑 升温曲线 AI 寻优 + 装炉密度优化',
    target: '1# 退火车式窑',
    saveEnergy: '620 tce/年',
    saveCarbon: '1630 tCO₂/年',
    payback: '3.2 个月',
    confidence: 'high' as const,
    method: 'AI 工艺寻优',
  },
  {
    title: '5# 去应力车式窑 台车密封气幕翻新 + 炉门缝隙补偿',
    target: '5# 去应力车式窑',
    saveEnergy: '420 tce/年',
    saveCarbon: '1100 tCO₂/年',
    payback: '4.8 个月',
    confidence: 'medium' as const,
    method: '炉体本体',
  },
  {
    title: '全车间峰平谷电价 + 储能套利策略（辅助风机/控制系统）',
    target: '全车间',
    saveEnergy: '—',
    saveCarbon: '780 tCO₂/年',
    payback: '21 个月',
    confidence: 'medium' as const,
    method: '电力市场',
  },
]

export const devices = [
  { id: 'DEV-A012', name: '蓄热式烧嘴组 (REGEN-A)', type: '燃烧器', vendor: 'Bloom · 上海布鲁姆', install: '2020-04', state: 'running' as const, health: 92, lastMaint: '2024-09-10' },
  { id: 'DEV-A013', name: '自身预热式高速烧嘴 ×16', type: '燃烧器', vendor: 'WS Wärmeprozesstechnik', install: '2021-08', state: 'running' as const, health: 86, lastMaint: '2024-08-25' },
  { id: 'DEV-B021', name: '烟气余热回收换热器', type: '余热利用', vendor: 'Alfa Laval', install: '2019-11', state: 'warning' as const, health: 71, lastMaint: '2024-07-02' },
  { id: 'DEV-B022', name: 'ORC 有机朗肯循环发电机组', type: '余热发电', vendor: 'Turboden', install: '2022-08', state: 'running' as const, health: 88, lastMaint: '2024-10-15' },
  { id: 'DEV-C031', name: '炉膛 O₂ / CO 在线分析仪 ×8', type: '工艺监测', vendor: '横河 / 西门子', install: '2022-04', state: 'running' as const, health: 81, lastMaint: '2024-10-28' },
  { id: 'DEV-C032', name: 'SCR 烟气脱硝装置', type: '环保', vendor: '龙净环保', install: '2020-06', state: 'running' as const, health: 90, lastMaint: '2024-09-30' },
  { id: 'DEV-D041', name: '屋顶光伏 3.6MW', type: '绿电', vendor: '隆基绿能', install: '2023-05', state: 'running' as const, health: 97, lastMaint: '2024-10-12' },
  { id: 'DEV-D042', name: '储能系统 2MWh', type: '储能', vendor: '宁德时代', install: '2024-01', state: 'idle' as const, health: 95, lastMaint: '2024-11-01' },
]

/**
 * ============== 低代码数据采集 / 决策分析（从 aizhongjiweb 同步） ==============
 */

export const FURNACES = [
  {
    id: 'TC-01',
    name: '1# 铸钢件退火车式窑',
    type: '燃气车式窑',
    workshop: '大件铸造车间',
    capacity: '装载 80 t · 6m×3m×2.4m',
    status: 'running' as const,
    temperature: 942, // ℃ 炉膛
    power: 0,
    gas: 1860, // m³/h 天然气
    eff: 78.4, // 热效率 %
    co2Hourly: 4.02, // tCO₂/h
    operator: '张明远',
    runHours: 18432,
  },
  {
    id: 'TC-02',
    name: '2# 锻件正火车式窑',
    type: '燃气车式窑',
    workshop: '锻造分厂',
    capacity: '装载 50 t · 5m×2.8m×2.2m',
    status: 'warning' as const,
    temperature: 978,
    power: 0,
    gas: 1640,
    eff: 72.6,
    co2Hourly: 3.55,
    operator: '李建国',
    runHours: 16021,
  },
  {
    id: 'TC-03',
    name: '3# 合金钢调质车式窑',
    type: '燃气车式窑（蓄热式）',
    workshop: '热处理车间',
    capacity: '装载 36 t · 4.5m×2.4m×2m',
    status: 'running' as const,
    temperature: 1048,
    power: 0,
    gas: 1420,
    eff: 84.2, // 蓄热式回收余热
    co2Hourly: 3.07,
    operator: '王晓梅',
    runHours: 9821,
  },
  {
    id: 'TC-04',
    name: '4# 耐火材料烧成车式窑',
    type: '燃气车式窑（高温）',
    workshop: '耐火制品分厂',
    capacity: '装载 28 t · 7m×2.6m×2.4m',
    status: 'running' as const,
    temperature: 1376,
    power: 0,
    gas: 2280,
    eff: 70.8,
    co2Hourly: 4.93,
    operator: '赵建波',
    runHours: 22340,
  },
  {
    id: 'TC-05',
    name: '5# 大型铸件去应力车式窑',
    type: '燃气车式窑',
    workshop: '大件铸造车间',
    capacity: '装载 120 t · 8m×3.2m×2.6m',
    status: 'alarm' as const,
    temperature: 632,
    power: 0,
    gas: 980,
    eff: 64.2, // 异常偏低
    co2Hourly: 2.12,
    operator: '陈志远',
    runHours: 6780,
  },
  {
    id: 'TC-06',
    name: '6# 船用锻件预热车式窑',
    type: '燃气车式窑',
    workshop: '锻造分厂',
    capacity: '装载 64 t · 6.5m×3m×2.5m',
    status: 'idle' as const,
    temperature: 320,
    power: 0,
    gas: 220, // 保温待装
    eff: 0,
    co2Hourly: 0.48,
    operator: '——',
    runHours: 12450,
  },
  {
    id: 'TC-07',
    name: '7# 风电主轴回火车式窑',
    type: '燃气车式窑（自身预热式）',
    workshop: '新能源装备车间',
    capacity: '装载 42 t · 5.5m×2.6m×2.2m',
    status: 'running' as const,
    temperature: 596,
    power: 0,
    gas: 760,
    eff: 81.4,
    co2Hourly: 1.64,
    operator: '孙磊',
    runHours: 14820,
  },
  {
    id: 'TC-08',
    name: '8# 核电压力容器消应车式窑',
    type: '燃气车式窑（精密温控）',
    workshop: '核电装备车间',
    capacity: '装载 90 t · 7m×3m×2.8m',
    status: 'offline' as const,
    temperature: 38,
    power: 0,
    gas: 0,
    eff: 0,
    co2Hourly: 0,
    operator: '——',
    runHours: 8902,
  },
];

export const FURNACE_SNAPSHOTS: Record<string, {
  temperature: number; pressure: number; flow: number; power: number;
  valvePos: number; airFuelRatio: number; o2: number; smoke: number;
  stage: string; combustion: string;
}> = {
  'TC-01': { temperature: 942, pressure: 28, flow: 1860, power: 86, valvePos: 72, airFuelRatio: 9.95, o2: 2.4, smoke: 218, stage: 'HOLDING', combustion: 'OPTIMAL' },
  'TC-02': { temperature: 978, pressure: 36, flow: 1640, power: 78, valvePos: 81, airFuelRatio: 11.2, o2: 4.8, smoke: 286, stage: 'HEATING', combustion: 'LEAN' },
  'TC-03': { temperature: 1042, pressure: 32, flow: 2120, power: 102, valvePos: 88, airFuelRatio: 9.6, o2: 1.9, smoke: 232, stage: 'HOLDING', combustion: 'OPTIMAL' },
  'TC-04': { temperature: 1378, pressure: 42, flow: 2680, power: 120, valvePos: 92, airFuelRatio: 8.8, o2: 0.7, smoke: 348, stage: 'HOLDING', combustion: 'RICH' },
  'TC-05': { temperature: 642, pressure: 18, flow: 980, power: 42, valvePos: 54, airFuelRatio: 10.1, o2: 2.8, smoke: 162, stage: 'HOLDING', combustion: 'OPTIMAL' },
  'TC-06': { temperature: 0, pressure: 0, flow: 0, power: 8, valvePos: 0, airFuelRatio: 0, o2: 20.9, smoke: 38, stage: 'IDLE', combustion: 'OPTIMAL' },
  'TC-07': { temperature: 588, pressure: 16, flow: 720, power: 36, valvePos: 48, airFuelRatio: 10.3, o2: 3.1, smoke: 142, stage: 'HOLDING', combustion: 'OPTIMAL' },
  'TC-08': { temperature: 692, pressure: 22, flow: 980, power: 56, valvePos: 62, airFuelRatio: 10.0, o2: 2.6, smoke: 178, stage: 'HOLDING', combustion: 'OPTIMAL' },
};

// 工业通讯协议定义
export const PROTOCOLS = [
  { id: 'modbus-tcp', name: 'Modbus TCP', desc: '主流 PLC / 仪表通用，TCP 502 端口', icon: 'Network', color: 'molybdenum',
    fields: ['IP 地址', '端口', '从站 ID', '功能码', '起始寄存器', '寄存器数量', '数据类型', '字节序', '轮询间隔(ms)'] },
  { id: 'mqtt', name: 'MQTT', desc: '边缘网关 / IoT 设备首选，发布订阅', icon: 'Radio', color: 'patina',
    fields: ['Broker 地址', '端口', '用户名', '密码', 'ClientID', 'Topic', 'QoS', '保留消息', 'Keep Alive'] },
  { id: 'opc-ua', name: 'OPC UA', desc: '工业 4.0 标准，DCS / SCADA 互联', icon: 'Cpu', color: 'iron',
    fields: ['Endpoint URL', '安全策略', '安全模式', '用户名', '密码', '证书', 'NodeId 列表', '订阅周期'] },
];

// 8 台车式窑接入的协议与采集点
export const DEVICE_LINKS = [
  { furnaceId: 'TC-01', protocol: 'opc-ua', endpoint: 'opc.tcp://10.20.31.21:4840', ns: 'ns=4;s=TC01.', points: 86, status: 'connected' as const, latency: 23 },
  { furnaceId: 'TC-02', protocol: 'modbus-tcp', endpoint: '10.20.31.22:502', ns: 'unit=1', points: 64, status: 'connected' as const, latency: 18 },
  { furnaceId: 'TC-03', protocol: 'opc-ua', endpoint: 'opc.tcp://10.20.31.23:4840', ns: 'ns=4;s=TC03.', points: 102, status: 'connected' as const, latency: 26 },
  { furnaceId: 'TC-04', protocol: 'opc-ua', endpoint: 'opc.tcp://10.20.31.24:4840', ns: 'ns=4;s=TC04.', points: 124, status: 'warning' as const, latency: 142 },
  { furnaceId: 'TC-05', protocol: 'modbus-tcp', endpoint: '10.20.31.25:502', ns: 'unit=1', points: 48, status: 'connected' as const, latency: 21 },
  { furnaceId: 'TC-06', protocol: 'mqtt', endpoint: 'tcp://10.20.31.30:1883', ns: 'lujing/tc06/+', points: 32, status: 'idle' as const, latency: 0 },
  { furnaceId: 'TC-07', protocol: 'modbus-tcp', endpoint: '10.20.31.27:502', ns: 'unit=2', points: 56, status: 'connected' as const, latency: 19 },
  { furnaceId: 'TC-08', protocol: 'opc-ua', endpoint: 'opc.tcp://10.20.31.28:4840', ns: 'ns=4;s=TC08.', points: 96, status: 'connected' as const, latency: 24 },
];

// 数据点表样例（数据采集页右侧"采集点位"）
export const DATA_POINTS_SAMPLE = [
  { tag: 'TC01.FurnaceTemp.Zone1', desc: '1#区炉膛温度', unit: '℃', type: 'Float32', addr: 'NodeId 4:TC01.T1', rate: '1s', quality: 'VALID' },
  { tag: 'TC01.FurnaceTemp.Zone2', desc: '2#区炉膛温度', unit: '℃', type: 'Float32', addr: 'NodeId 4:TC01.T2', rate: '1s', quality: 'VALID' },
  { tag: 'TC01.GasFlow.NG', desc: '天然气流量', unit: 'Nm³/h', type: 'Float32', addr: 'NodeId 4:TC01.QG', rate: '5s', quality: 'VALID' },
  { tag: 'TC01.AirFlow', desc: '助燃风流量', unit: 'Nm³/h', type: 'Float32', addr: 'NodeId 4:TC01.QA', rate: '5s', quality: 'VALID' },
  { tag: 'TC01.O2.Stack', desc: '烟道残氧 O₂', unit: '%', type: 'Float32', addr: 'NodeId 4:TC01.O2', rate: '10s', quality: 'VALID' },
  { tag: 'TC01.SmokeTemp', desc: '排烟温度', unit: '℃', type: 'Float32', addr: 'NodeId 4:TC01.TS', rate: '5s', quality: 'VALID' },
  { tag: 'TC01.FurnacePressure', desc: '炉膛压力', unit: 'Pa', type: 'Float32', addr: 'NodeId 4:TC01.P', rate: '1s', quality: 'VALID' },
  { tag: 'TC01.BurnerValve.B1', desc: '1#烧嘴阀位反馈', unit: '%', type: 'Float32', addr: 'NodeId 4:TC01.V1', rate: '1s', quality: 'VALID' },
  { tag: 'TC01.Power.Fan1', desc: '1#助燃风机电能', unit: 'kWh', type: 'Float64', addr: 'NodeId 4:TC01.E1', rate: '1min', quality: 'VALID' },
  { tag: 'TC01.CarMotor.Pos', desc: '台车位置', unit: 'mm', type: 'Int32', addr: 'NodeId 4:TC01.CP', rate: '1s', quality: 'DRIFT' },
];

// 数据治理 5 层流水线统计
export const GOV_LAYERS = [
  { id: 'L1', name: '数据采集层', subtitle: 'Raw · PLC/DCS/SCADA/传感器', desc: '从车式窑控制系统直采的原始时序数据', metrics: [
    { k: '点位数', v: '3 842' }, { k: '入口速率', v: '12.4 K/s' }, { k: '今日入库', v: '986 M 行' }, { k: '协议构成', v: 'OPC UA 64% / Modbus 28% / MQTT 8%' },
  ], color: 'molybdenum' },
  { id: 'L2', name: '预处理层', subtitle: 'Cleansing · 去重 / 对齐 / 异常 / 缺失 / 单位', desc: '统一 5min 时序栅格、NTP 时钟同步、-9999 与超量程剔除、线性插值、Nm³ / ℃ 标准化', metrics: [
    { k: '去重率', v: '0.42%' }, { k: '异常剔除', v: '128 条/h' }, { k: '插值补齐', v: '36 条/h' }, { k: '处理延迟', v: '2.1 s' },
  ], color: 'coolant' },
  { id: 'L3', name: '质量标注层', subtitle: 'Tagging · 质量 / 工况 / 燃烧 三类标签', desc: '为每条记录打上 VALID/FAULT/SPIKE/DRIFT/GAP、HEATING/HOLDING/COOLING/IDLE、OPTIMAL/LEAN/RICH 三套标签', metrics: [
    { k: 'VALID 占比', v: '98.62%' }, { k: 'FAULT', v: '0.31%' }, { k: 'SPIKE', v: '0.62%' }, { k: 'DRIFT', v: '0.42%' },
  ], color: 'patina' },
  { id: 'L4', name: '特征工程层', subtitle: 'Features · 滑窗 / 派生 / 滞后 / 交叉', desc: '5/15/30/60 min 滑动窗口均值方差斜率，派生 实际λ/热效率/碳强度，滞后 t-5/t-10/t-15，交叉 温度×风量 / 燃气×O₂', metrics: [
    { k: '特征向量', v: '326 维' }, { k: '滑窗特征', v: '184' }, { k: '派生特征', v: '42' }, { k: '交叉特征', v: '64' },
  ], color: 'sulfur' },
  { id: 'L5', name: '存储层', subtitle: 'Storage · 时序库 / 特征库 / 元数据库', desc: 'TDengine 存原始+标注、向量化特征库供 AI 训练、元数据库管理血缘与质量报告', metrics: [
    { k: 'TDengine', v: '2.18 TB' }, { k: '特征库', v: '684 GB' }, { k: '元数据', v: '4 326 表' }, { k: '冷热分层', v: '热 7d / 温 90d / 冷 3y' },
  ], color: 'iron' },
];

// 数据分类（左侧树）
export const DATA_CATEGORIES = [
  { id: 'by-device', name: '按设备', children: [
    { id: 'tc-furnace', name: '车式窑本体', count: 1824 },
    { id: 'burner', name: '蓄热式 / 高速烧嘴', count: 612 },
    { id: 'heat-recovery', name: '余热回收装置', count: 384 },
    { id: 'environmental', name: '环保 (脱硝/脱白)', count: 242 },
    { id: 'pv-bess', name: '光伏 + 储能', count: 196 },
    { id: 'meter', name: '能源计量仪表', count: 584 },
  ]},
  { id: 'by-process', name: '按工艺阶段', children: [
    { id: 'heating', name: '升温段 HEATING', count: 482 },
    { id: 'holding', name: '保温段 HOLDING', count: 1648 },
    { id: 'cooling', name: '降温段 COOLING', count: 386 },
    { id: 'idle', name: '空炉 IDLE', count: 124 },
  ]},
  { id: 'by-kpi', name: '按指标域', children: [
    { id: 'temp', name: '温度 / 温场', count: 642 },
    { id: 'fuel', name: '燃料 / 空燃比', count: 384 },
    { id: 'pressure', name: '压力 / 流量', count: 326 },
    { id: 'power', name: '电能 / 电参量', count: 218 },
    { id: 'emission', name: '排放 (CO₂/NOx)', count: 162 },
  ]},
];

// 质量 / 工况 / 燃烧标签分布
export const TAG_DISTRIBUTIONS = {
  quality: [
    { name: 'VALID', value: 9862, color: COLOR.patina },
    { name: 'SPIKE', value: 62, color: COLOR.sulfur },
    { name: 'DRIFT', value: 42, color: COLOR.coolant },
    { name: 'FAULT', value: 31, color: COLOR.iron },
    { name: 'GAP', value: 3, color: COLOR.rose },
  ],
  stage: [
    { name: 'HEATING', value: 24, color: COLOR.iron },
    { name: 'HOLDING', value: 58, color: COLOR.molybdenum },
    { name: 'COOLING', value: 12, color: COLOR.coolant },
    { name: 'IDLE', value: 6, color: COLOR.patina },
  ],
  combustion: [
    { name: 'OPTIMAL', value: 81, color: COLOR.patina },
    { name: 'LEAN', value: 11, color: COLOR.sulfur },
    { name: 'RICH', value: 8, color: COLOR.iron },
  ],
};

// AI 报告类型定义
export const AI_REPORT_TYPES = [
  { id: 'fault', name: '烧成故障分析报告', icon: 'TriangleAlert', color: 'iron',
    desc: '基于近 24h 工艺曲线 + 知识库故障树，定位异常根因，给出干预建议' },
  { id: 'forecast', name: '烧成温度预测报告（30 分钟）', icon: 'TrendingUp', color: 'molybdenum',
    desc: '结合滚动滑窗特征与趋势模型，预测未来 30 min 炉温走势及超限风险' },
  { id: 'efficiency', name: '设备能效分析报告', icon: 'Gauge', color: 'sulfur',
    desc: '对标 GB 21369-2008 单位产品燃气耗 / 热效率，识别能效短板' },
  { id: 'carbon', name: '设备能碳分析报告', icon: 'Leaf', color: 'patina',
    desc: '范围一二排放核算 + 碳强度对标 + 绿电消纳潜力分析' },
];

// AI 报告历史（持久化于本地索引，前端首批展示）
export const AI_REPORTS_SEED = [
  { id: 'AR-T-001', type: 'fault', title: 'TC-04 耐材烧成窑残氧异常故障分析', furnaceId: 'TC-04', createdAt: '2024-11-08 09:24', size: '3.8 K 字', mode: 'pro' },
  { id: 'AR-T-002', type: 'forecast', title: 'TC-03 调质窑 30 分钟温度预测', furnaceId: 'TC-03', createdAt: '2024-11-08 11:12', size: '2.4 K 字', mode: 'lite' },
  { id: 'AR-T-003', type: 'efficiency', title: 'TC-02 锻件正火窑能效短板分析', furnaceId: 'TC-02', createdAt: '2024-11-07 16:48', size: '5.1 K 字', mode: 'pro' },
  { id: 'AR-T-004', type: 'carbon', title: '8 台车式窑 11 月范围一二碳排分析', furnaceId: 'ALL', createdAt: '2024-11-06 14:20', size: '6.8 K 字', mode: 'pro' },
];

/** 运营 · 告警中心 */
export const alerts = [
  {
    id: 'A-2024-1142',
    severity: 'high' as const,
    target: '5# 去应力车式窑',
    title: '炉内温度场偏差 +38℃，疑似前后区烧嘴失衡',
    rule: 'ΔT(前后区) > 25℃',
    occurred: '2024-11-08 14:23:17',
    status: 'active' as const,
    owner: '陈志远',
  },
  {
    id: 'A-2024-1141',
    severity: 'medium' as const,
    target: '2# 正火车式窑',
    title: '单位产品燃气耗 178 m³/t，超 GB 21369 限定值 6.2%',
    rule: '单耗 > 168 m³/t',
    occurred: '2024-11-08 13:50:02',
    status: 'active' as const,
    owner: '李建国',
  },
  {
    id: 'A-2024-1140',
    severity: 'medium' as const,
    target: '4# 烧成车式窑',
    title: '烟气余热回收换热效率下降 5.8 个百分点',
    rule: 'η-烟气 < 62%',
    occurred: '2024-11-08 12:18:46',
    status: 'ack' as const,
    owner: '赵建波',
  },
  {
    id: 'A-2024-1139',
    severity: 'low' as const,
    target: '1# 退火车式窑',
    title: '台车密封气幕压力偏低，建议巡检',
    rule: 'P-气幕 < 80 Pa',
    occurred: '2024-11-08 09:42:11',
    status: 'closed' as const,
    owner: '张明远',
  },
  {
    id: 'A-2024-1138',
    severity: 'high' as const,
    target: '2# 正火车式窑',
    title: '空燃比 1.21 超阈，残氧 O₂ 5.4% 燃烧不完全',
    rule: 'O₂ > 4.5% 且 λ > 1.15',
    occurred: '2024-11-08 08:11:55',
    status: 'closed' as const,
    owner: '李建国',
  },
  {
    id: 'A-2024-1137',
    severity: 'low' as const,
    target: '7# 风电主轴回火车式窑',
    title: '升温速率 92℃/h 超工艺曲线设定 80℃/h',
    rule: 'dT/dt > 80℃/h',
    occurred: '2024-11-07 22:30:08',
    status: 'closed' as const,
    owner: '孙磊',
  },
]

/** 运营 · 统计报表历史 */
export const reportsHistory = [
  { id: 'R-2024-11-W2', title: '2024 年 11 月 W2 车式窑能碳周报', type: '周报', period: '2024-11-04 ~ 2024-11-10', size: '4.2 MB', createdBy: '系统', createdAt: '2024-11-11 08:00', status: 'ready' as const },
  { id: 'R-2024-10', title: '2024 年 10 月车式窑能碳月报', type: '月报', period: '2024-10', size: '11.8 MB', createdBy: '张克强', createdAt: '2024-11-03 16:42', status: 'ready' as const },
  { id: 'R-2024-Q3', title: '2024 Q3 热处理炉双碳合规季报', type: '季报', period: '2024-Q3', size: '23.5 MB', createdBy: '李双碳', createdAt: '2024-10-10 11:20', status: 'ready' as const },
  { id: 'R-2024-S1', title: '2024 上半年范围一二三排放清单 (8 台车式窑)', type: '专项', period: '2024-H1', size: '8.9 MB', createdBy: '李双碳', createdAt: '2024-07-28 14:05', status: 'ready' as const },
  { id: 'R-2024-PV', title: 'GB 21369 热处理炉节能监测专项分析', type: '专项', period: '2024 至今', size: '6.4 MB', createdBy: '王新能', createdAt: '2024-10-30 09:11', status: 'ready' as const },
  { id: 'R-2024-NOV', title: '2024 年 11 月车式窑能碳月报（草稿生成中）', type: '月报', period: '2024-11', size: '—', createdBy: '系统', createdAt: '2024-11-08 14:25', status: 'generating' as const },
]

/**
 * ============== 低代码决策分析 / 算法 & 模型库 ==============
 */

// 算法库分类
export const ALGO_CATEGORIES = [
  { id: 'data', name: '数据处理', color: 'coolant', icon: 'Filter' },
  { id: 'ts',   name: '时序分析', color: 'molybdenum', icon: 'TrendingUp' },
  { id: 'cv',   name: '视觉分析', color: 'iron', icon: 'Eye' },
  { id: 'sup',  name: '监督学习', color: 'sulfur', icon: 'Brain' },
  { id: 'opt',  name: '优化算法', color: 'patina', icon: 'Target' },
  { id: 'anom', name: '异常检测', color: 'iron', icon: 'TriangleAlert' },
  { id: 'cluster', name: '工况识别', color: 'molybdenum', icon: 'Network' },
  { id: 'monitor', name: '监控指标', color: 'sulfur', icon: 'Gauge' },
  { id: 'mgmt',   name: '模型管理', color: 'patina', icon: 'BookMarked' },
];

// 标准算法库（30+）
export const ALGORITHMS = [
  // 数据处理
  { id: 'algo-clean',        cat: 'data',   name: '数据清洗 Cleansing',         tag: 'standard', desc: '空值/-9999/超量程/重复行清理', params: ['上下限', '空值策略', '去重键'],            inputs: ['raw_ts'], outputs: ['clean_ts'], runtime: 'pandas',  pop: 98 },
  { id: 'algo-impute',       cat: 'data',   name: '缺失插补 KNN/线性',         tag: 'standard', desc: 'KNN/Spline/Linear 多策略缺失补齐', params: ['method', 'k', 'window'],                inputs: ['clean_ts'], outputs: ['filled_ts'], runtime: 'sklearn', pop: 84 },
  { id: 'algo-align',        cat: 'data',   name: '时序对齐 5min · NTP',       tag: 'standard', desc: '统一 5min 栅格 / NTP 时钟同步', params: ['频率', '对齐方式'],                          inputs: ['multi_ts'], outputs: ['aligned_ts'], runtime: 'pandas', pop: 76 },
  { id: 'algo-norm',         cat: 'data',   name: '归一化 Z-Score / MinMax',   tag: 'standard', desc: '特征尺度统一', params: ['method'],                                                  inputs: ['features'], outputs: ['scaled'], runtime: 'sklearn', pop: 62 },
  // 时序
  { id: 'algo-temp-lstm',    cat: 'ts',     name: '炉温预测 LSTM',             tag: 'core', desc: '基于多变量时序 LSTM 预测未来 30 min 炉温走势', params: ['lookback', 'horizon', 'units', 'dropout'], inputs: ['T_ts','Q_ts','O2_ts','λ_ts'], outputs: ['T_forecast'], runtime: 'PyTorch', pop: 92 },
  { id: 'algo-arima',        cat: 'ts',     name: 'ARIMA 时序模型',             tag: 'standard', desc: '自回归滑动平均，适合稳态工况短期预测', params: ['p','d','q'],                            inputs: ['T_ts'], outputs: ['T_forecast'], runtime: 'statsmodels', pop: 58 },
  { id: 'algo-prophet',      cat: 'ts',     name: 'Prophet 趋势 + 季节',      tag: 'standard', desc: '内置节假日/班次效应，鲁棒短期预测', params: ['seasonality', 'changepoint_prior'],         inputs: ['T_ts'], outputs: ['T_forecast'], runtime: 'Prophet',   pop: 54 },
  { id: 'algo-tcn',          cat: 'ts',     name: '热效率 TCN 预测',           tag: 'core', desc: '时序卷积网络预测设备热效率趋势', params: ['kernel_size','levels'],                        inputs: ['features'], outputs: ['η_forecast'], runtime: 'PyTorch', pop: 71 },
  // 视觉
  { id: 'algo-flame-yolo',   cat: 'cv',     name: '火焰图像分析 YOLOv8',       tag: 'core', desc: '烧嘴火焰形态识别、温度/CO 预估、回火/脱火预警', params: ['conf','iou','imgsz'],          inputs: ['flame_img'], outputs: ['flame_status','flame_kpi'], runtime: 'ONNX', pop: 88 },
  { id: 'algo-thermo-cnn',   cat: 'cv',     name: '红外热成像 CNN',            tag: 'core', desc: '炉膛温度场重建 / 死区识别', params: ['threshold','smooth'],                                   inputs: ['ir_img'], outputs: ['temp_field','dead_zone'], runtime: 'ONNX',   pop: 64 },
  // 监督学习 - 故障预测
  { id: 'algo-fault-xgb',    cat: 'sup',    name: '故障预测 XGBoost',          tag: 'core', desc: '基于工艺特征的故障 0/1 分类', params: ['n_estimators','max_depth','learning_rate'],     inputs: ['features'], outputs: ['fault_prob'], runtime: 'XGBoost',   pop: 89 },
  { id: 'algo-fault-rf',     cat: 'sup',    name: '故障预测 RandomForest',     tag: 'standard', desc: '随机森林分类，强解释性', params: ['n_estimators','max_features'],                       inputs: ['features'], outputs: ['fault_prob'], runtime: 'sklearn', pop: 66 },
  { id: 'algo-rul',          cat: 'sup',    name: '剩余寿命预测 RUL',          tag: 'core', desc: '烧嘴/风机 RUL 回归', params: ['model','horizon'],                                       inputs: ['features'], outputs: ['RUL'], runtime: 'PyTorch', pop: 58 },
  // 优化
  { id: 'algo-param-bayes',  cat: 'opt',    name: '工艺参数贝叶斯优化',         tag: 'core', desc: '空燃比 / 烧嘴负荷 / 炉压 联合贝叶斯寻优', params: ['acq','init_points','iter'],          inputs: ['target','bounds'], outputs: ['best_params'], runtime: 'BayesOpt', pop: 86 },
  { id: 'algo-ga',           cat: 'opt',    name: '遗传算法 GA',                tag: 'standard', desc: '多目标遗传算法，能效与产能 Pareto 前沿', params: ['pop','gen','mutation'],                  inputs: ['target','bounds'], outputs: ['pareto'], runtime: 'DEAP', pop: 52 },
  { id: 'algo-pso',          cat: 'opt',    name: '粒子群 PSO',                 tag: 'standard', desc: 'PSO 高维参数空间搜索', params: ['swarm','iter','w','c1','c2'],                          inputs: ['target','bounds'], outputs: ['best_params'], runtime: 'PySwarm', pop: 38 },
  { id: 'algo-eff-opt',      cat: 'opt',    name: '能效优化 决策模型',          tag: 'core', desc: '基于实时工况自动下发空燃比 / 烟气 / 风机最优工作点', params: ['horizon','constraints'],         inputs: ['kpi_ts','constraints'], outputs: ['set_points'], runtime: 'Pyomo', pop: 78 },
  { id: 'algo-carbon-opt',   cat: 'opt',    name: '碳排优化 MILP',             tag: 'core', desc: '燃料结构 + 绿电 + CCER 多约束 MILP，分钟级最低碳成本', params: ['time_horizon','price_curve'],   inputs: ['load','price','quota'], outputs: ['fuel_mix','co2'], runtime: 'Gurobi', pop: 74 },
  // 异常
  { id: 'algo-iforest',      cat: 'anom',   name: 'iForest 隔离森林',         tag: 'standard', desc: '快速无监督异常打分', params: ['n_estimators','contamination'],                          inputs: ['features'], outputs: ['anomaly_score'], runtime: 'sklearn', pop: 72 },
  { id: 'algo-ae-anom',      cat: 'anom',   name: 'AutoEncoder 异常检测',       tag: 'core', desc: '重构误差异常检测，适合工艺多变量', params: ['hidden','threshold'],                       inputs: ['features'], outputs: ['anomaly'], runtime: 'PyTorch', pop: 64 },
  { id: 'algo-3sigma',       cat: 'anom',   name: '3σ + EWMA',                 tag: 'standard', desc: '经典统计监控，阈值简单稳定', params: ['k','window'],                                inputs: ['ts'], outputs: ['anomaly_flag'], runtime: 'numpy',   pop: 58 },
  // 工况识别
  { id: 'algo-hmm',          cat: 'cluster',name: 'HMM 工况识别',              tag: 'core', desc: '隐马尔可夫识别 HEATING/HOLDING/COOLING/IDLE', params: ['n_states','covariance'],     inputs: ['features'], outputs: ['stage'], runtime: 'hmmlearn', pop: 76 },
  { id: 'algo-kmeans',       cat: 'cluster',name: 'KMeans 聚类',              tag: 'standard', desc: '工况自动分群', params: ['k','init'],                                                  inputs: ['features'], outputs: ['cluster'], runtime: 'sklearn', pop: 48 },
  { id: 'algo-dbscan',       cat: 'cluster',name: 'DBSCAN 密度聚类',           tag: 'standard', desc: '密度聚类适合不规则形状', params: ['eps','min_samples'],                                inputs: ['features'], outputs: ['cluster'], runtime: 'sklearn', pop: 32 },
  // 监控指标
  { id: 'algo-kpi-energy',   cat: 'monitor',name: '能效 KPI 监控',             tag: 'standard', desc: '实时单产能耗 / 热效率 / 表面散热阈值看板', params: ['thresholds'],                  inputs: ['kpi_ts'], outputs: ['kpi_state'], runtime: 'pandas', pop: 68 },
  { id: 'algo-kpi-carbon',   cat: 'monitor',name: '碳强度 KPI 监控',          tag: 'standard', desc: '吨产品 tCO₂ 实时监控 / 配额预警', params: ['baseline','quota'],                       inputs: ['kpi_ts'], outputs: ['kpi_state'], runtime: 'pandas', pop: 62 },
  // 模型管理
  { id: 'algo-model-reg',    cat: 'mgmt',   name: '模型注册',                  tag: 'standard', desc: '版本/元数据/血缘/审批', params: ['stage','tags'],                                          inputs: ['model_artifact'], outputs: ['model_id'], runtime: 'MLflow', pop: 70 },
  { id: 'algo-shadow',       cat: 'mgmt',   name: '影子部署对照',              tag: 'standard', desc: '新模型与现网并行打分，对比偏差', params: ['traffic','duration'],                       inputs: ['model_id','live_ts'], outputs: ['drift_report'], runtime: 'MLflow', pop: 44 },
];

// 预训练模型库（12）
export const MODELS = [
  { id: 'mdl-flame-v3',   name: 'FlameNet-v3',           cat: 'cv',  type: 'CNN-YOLOv8', size: '24.6 MB', metric: 'mAP50 0.96', desc: '烧嘴火焰 7 类形态识别，含回火/脱火/异色检测', samples: '12 万张',  finetuned: true,  updated: '2024-10-22', license: 'Apache-2.0', tag: 'core' },
  { id: 'mdl-temp-lstm',  name: 'KilnTemp-LSTM-30m',     cat: 'ts',  type: 'LSTM-Stack', size: '6.8 MB',  metric: 'RMSE 4.2 ℃', desc: '8 台车式窑 30 min 多变量温度预测，置信带输出', samples: '8 万小时',  finetuned: true,  updated: '2024-10-30', license: 'Apache-2.0', tag: 'core' },
  { id: 'mdl-tcn-eff',    name: 'EfficiencyTCN',         cat: 'ts',  type: 'TCN',        size: '4.2 MB',  metric: 'MAE 0.86%', desc: '15 min 热效率趋势预测', samples: '5 万小时',                                  finetuned: true,  updated: '2024-09-18', license: 'Apache-2.0', tag: 'core' },
  { id: 'mdl-fault-xgb',  name: 'FaultPred-XGB',         cat: 'sup', type: 'XGBoost',    size: '1.4 MB',  metric: 'AUC 0.928', desc: '车式窑常见 12 类故障预测（蓄热失效/烧嘴堵塞/密封气幕泄漏…）', samples: '32 万样本', finetuned: true,  updated: '2024-10-12', license: 'MIT',         tag: 'core' },
  { id: 'mdl-rul-burner', name: 'BurnerRUL-Tx',          cat: 'sup', type: 'Transformer',size: '12.8 MB', metric: 'MAE 86 h',  desc: '烧嘴剩余使用寿命回归', samples: '4.2 万寿命周期',                              finetuned: false, updated: '2024-08-05', license: 'Apache-2.0', tag: 'standard' },
  { id: 'mdl-bayes-eff',  name: 'BayesOpt-Combustion',   cat: 'opt', type: 'BayesOpt',   size: '0.9 MB',  metric: 'gain 4.6%', desc: '空燃比/炉压/烟气联合贝叶斯优化器', samples: '在线学习',                       finetuned: true,  updated: '2024-11-02', license: 'BSD-3',       tag: 'core' },
  { id: 'mdl-co2-milp',   name: 'CarbonMILP-v2',         cat: 'opt', type: 'MILP',       size: '0.4 MB',  metric: 'cost ↓ 6.8%', desc: '燃料结构 + 绿电 + CCER 分钟级最低碳成本求解', samples: '解析模型',           finetuned: false, updated: '2024-09-10', license: 'GPL-3.0',     tag: 'core' },
  { id: 'mdl-ae-anom',    name: 'AnomAE-MultiVar',       cat: 'anom',type: 'AutoEncoder',size: '2.1 MB',  metric: 'F1 0.842',  desc: '多变量异常检测，重构误差 + 注意力', samples: '18 万小时',                       finetuned: true,  updated: '2024-10-08', license: 'Apache-2.0', tag: 'core' },
  { id: 'mdl-hmm-stage',  name: 'StageHMM',              cat: 'cluster', type: 'HMM',    size: '0.3 MB',  metric: 'Acc 0.97',  desc: '工艺阶段自动识别', samples: '24 万小时',                                       finetuned: true,  updated: '2024-08-22', license: 'MIT',         tag: 'standard' },
  { id: 'mdl-thermo-cnn', name: 'ThermoField-CNN',       cat: 'cv',  type: 'U-Net',      size: '18.4 MB', metric: 'IoU 0.88',  desc: '红外热成像炉膛温度场重建', samples: '6.8 万张',                                 finetuned: true,  updated: '2024-09-28', license: 'Apache-2.0', tag: 'core' },
  { id: 'mdl-kpi-rules',  name: 'KPI-RuleEngine',        cat: 'monitor',type: 'Rules+ML',size: '0.2 MB',  metric: '—',         desc: '能效/碳/质量 KPI 三色阈值引擎', samples: '规则集',                                  finetuned: false, updated: '2024-10-20', license: 'MIT',         tag: 'standard' },
  { id: 'mdl-shadow',     name: 'ShadowDeploy-Compare',  cat: 'mgmt',type: 'Compare',    size: '0.1 MB',  metric: '—',         desc: '影子部署对照工具', samples: '工具类',                                            finetuned: false, updated: '2024-07-30', license: 'MIT',         tag: 'standard' },
];

// 工作流模板（预设示例）
export const WORKFLOW_TEMPLATES = [
  { id: 'wf-temp',     name: '炉温 30 分钟预测', desc: '数据清洗 → 时序对齐 → 归一化 → KilnTemp-LSTM-30m → KPI 监控', tags: ['温度预测','LSTM','30 min'],   color: 'molybdenum' },
  { id: 'wf-flame',    name: '烧嘴火焰智能巡检', desc: '红外/可见光双流 → ThermoField-CNN → FlameNet-v3 → 异常路由 → 告警',   tags: ['火焰分析','CV','YOLOv8'],     color: 'iron' },
  { id: 'wf-fault',    name: '车式窑故障预测',   desc: '数据清洗 → 特征构建(326 维) → FaultPred-XGB → 影子部署对照 → 工单',   tags: ['故障预测','XGBoost'],           color: 'sulfur' },
  { id: 'wf-eff',      name: '能效优化闭环',     desc: '工况识别 HMM → 能效 KPI → BayesOpt 寻优 → 下发 OPC UA → 复核',     tags: ['能效优化','BayesOpt'],         color: 'patina' },
  { id: 'wf-carbon',   name: '碳排优化决策',     desc: '负载预测 → 价格曲线 → CarbonMILP-v2 → 燃料结构调度 → CCEA 复核',     tags: ['碳排优化','MILP'],             color: 'patina' },
  { id: 'wf-clean',    name: '数据清洗 ETL',     desc: '原始数据 → 去重 → 时序对齐 → 缺失插补 → 归一化 → 入特征库',         tags: ['数据清洗','ETL'],               color: 'coolant' },
];

// 当前画布默认工作流节点（炉温预测）
export const DEFAULT_FLOW_NODES = [
  { id: 'n1', type: 'source',    name: '治理后特征库',         x: 60,  y: 60,  meta: 'TC-01 · 5min 栅格 · 326 维' },
  { id: 'n2', algoId: 'algo-clean',  x: 280, y: 60,  cat: 'data' },
  { id: 'n3', algoId: 'algo-align',  x: 500, y: 60,  cat: 'data' },
  { id: 'n4', algoId: 'algo-norm',   x: 720, y: 60,  cat: 'data' },
  { id: 'n5', algoId: 'algo-temp-lstm', x: 280, y: 220, cat: 'ts' },
  { id: 'n6', algoId: 'algo-kpi-energy', x: 500, y: 220, cat: 'monitor' },
  { id: 'n7', type: 'sink',      name: '决策输出',             x: 720, y: 220, meta: '下发 OPC UA · 告警 · 工单' },
];

export const DEFAULT_FLOW_EDGES: Array<[string, string]> = [
  ['n1','n2'], ['n2','n3'], ['n3','n4'], ['n4','n5'], ['n5','n6'], ['n6','n7'],
];

// 工作流预设：每个工作流模板对应一套独立的画布节点和连线
export const WORKFLOW_PRESETS: Record<string, { nodes: Array<{ id: string; type?: string; algoId?: string; modelId?: string; name?: string; x: number; y: number; meta?: string; cat?: string }>; edges: Array<[string, string]> }> = {
  'wf-temp': {
    nodes: [
      { id: 'n1', type: 'source',    name: '治理后特征库',          x: 60,  y: 60,  meta: 'TC-01 · 5min 栅格 · 326 维' },
      { id: 'n2', algoId: 'algo-clean',     x: 280, y: 60,  cat: 'data' },
      { id: 'n3', algoId: 'algo-align',     x: 500, y: 60,  cat: 'data' },
      { id: 'n4', algoId: 'algo-norm',      x: 720, y: 60,  cat: 'data' },
      { id: 'n5', algoId: 'algo-temp-lstm', x: 280, y: 220, cat: 'ts' },
      { id: 'n6', algoId: 'algo-kpi-energy',x: 500, y: 220, cat: 'monitor' },
      { id: 'n7', type: 'sink',      name: '决策输出',              x: 720, y: 220, meta: '下发 OPC UA · 告警 · 工单' },
    ],
    edges: [['n1','n2'],['n2','n3'],['n3','n4'],['n4','n5'],['n5','n6'],['n6','n7']],
  },
  'wf-flame': {
    nodes: [
      { id: 'n1', type: 'source',    name: '红外/可见光双流采集',    x: 60,  y: 60,  meta: '8.6 万张 · 25 FPS · ROI 标定' },
      { id: 'n2', algoId: 'algo-thermo-cnn', x: 280, y: 60,  cat: 'cv' },
      { id: 'n3', algoId: 'algo-flame-yolo', x: 500, y: 60,  cat: 'cv' },
      { id: 'n4', algoId: 'algo-3sigma',     x: 280, y: 220, cat: 'anom' },
      { id: 'n5', algoId: 'algo-kpi-energy', x: 500, y: 220, cat: 'monitor' },
      { id: 'n6', type: 'sink',      name: '告警 / 工单',            x: 720, y: 140, meta: '回火/脱火 · 钉钉 · 工单系统' },
    ],
    edges: [['n1','n2'],['n2','n3'],['n3','n5'],['n1','n4'],['n4','n5'],['n5','n6']],
  },
  'wf-fault': {
    nodes: [
      { id: 'n1', type: 'source',    name: '治理后特征库',          x: 60,  y: 60,  meta: '326 维 · 32 万样本' },
      { id: 'n2', algoId: 'algo-clean',     x: 280, y: 60,  cat: 'data' },
      { id: 'n3', algoId: 'algo-norm',      x: 500, y: 60,  cat: 'data' },
      { id: 'n4', algoId: 'algo-fault-xgb', x: 280, y: 220, cat: 'sup' },
      { id: 'n5', algoId: 'algo-shadow',    x: 500, y: 220, cat: 'mgmt' },
      { id: 'n6', algoId: 'algo-rul',       x: 720, y: 60,  cat: 'sup' },
      { id: 'n7', type: 'sink',      name: '维修工单 / 备件预测',    x: 720, y: 220, meta: 'EAM 工单 · 备件采购建议' },
    ],
    edges: [['n1','n2'],['n2','n3'],['n3','n4'],['n3','n6'],['n4','n5'],['n5','n7'],['n6','n7']],
  },
  'wf-eff': {
    nodes: [
      { id: 'n1', type: 'source',    name: '治理后特征库 + 工况',    x: 60,  y: 60,  meta: 'HEATING/HOLDING/COOLING/IDLE' },
      { id: 'n2', algoId: 'algo-hmm',         x: 280, y: 60,  cat: 'cluster' },
      { id: 'n3', algoId: 'algo-kpi-energy',  x: 500, y: 60,  cat: 'monitor' },
      { id: 'n4', algoId: 'algo-param-bayes', x: 280, y: 220, cat: 'opt' },
      { id: 'n5', algoId: 'algo-eff-opt',     x: 500, y: 220, cat: 'opt' },
      { id: 'n6', type: 'sink',      name: 'OPC UA 下发 + 复核',     x: 720, y: 140, meta: '空燃比 / 烟气 / 风机 / 人工复核' },
    ],
    edges: [['n1','n2'],['n2','n3'],['n2','n4'],['n3','n5'],['n4','n5'],['n5','n6']],
  },
  'wf-carbon': {
    nodes: [
      { id: 'n1', type: 'source',    name: '负载预测 + 价格曲线',    x: 60,  y: 60,  meta: '电价 / 气价 / 配额 / CCER' },
      { id: 'n2', algoId: 'algo-tcn',         x: 280, y: 60,  cat: 'ts' },
      { id: 'n3', algoId: 'algo-kpi-carbon',  x: 500, y: 60,  cat: 'monitor' },
      { id: 'n4', algoId: 'algo-carbon-opt',  x: 280, y: 220, cat: 'opt' },
      { id: 'n5', algoId: 'algo-shadow',      x: 500, y: 220, cat: 'mgmt' },
      { id: 'n6', type: 'sink',      name: '燃料结构调度 + CCEA',    x: 720, y: 140, meta: '天然气/绿电 · CCER · 月度核查' },
    ],
    edges: [['n1','n2'],['n2','n3'],['n2','n4'],['n3','n5'],['n4','n5'],['n5','n6']],
  },
  'wf-clean': {
    nodes: [
      { id: 'n1', type: 'source',    name: '原始数据池',              x: 60,  y: 60,  meta: 'PLC/DCS/SCADA · 1Hz' },
      { id: 'n2', algoId: 'algo-clean',     x: 280, y: 60,  cat: 'data' },
      { id: 'n3', algoId: 'algo-impute',    x: 500, y: 60,  cat: 'data' },
      { id: 'n4', algoId: 'algo-align',     x: 720, y: 60,  cat: 'data' },
      { id: 'n5', algoId: 'algo-norm',      x: 280, y: 220, cat: 'data' },
      { id: 'n6', algoId: 'algo-3sigma',    x: 500, y: 220, cat: 'anom' },
      { id: 'n7', type: 'sink',      name: '特征库入库',              x: 720, y: 220, meta: 'TDengine · MinIO · MLflow 血缘' },
    ],
    edges: [['n1','n2'],['n2','n3'],['n3','n4'],['n4','n5'],['n5','n6'],['n6','n7']],
  },
};

// 迭代分析（训练历史 / 版本对比）
export const ITERATION_HISTORY = [
  { ver: 'v1.0', date: '2024-10-12', samples: '4.2 万 h', loss: 0.0186, rmse: '5.8 ℃', auc: 0.892, status: 'archived' },
  { ver: 'v1.1', date: '2024-10-20', samples: '5.6 万 h', loss: 0.0142, rmse: '4.9 ℃', auc: 0.911, status: 'archived' },
  { ver: 'v1.2', date: '2024-10-30', samples: '6.8 万 h', loss: 0.0118, rmse: '4.6 ℃', auc: 0.918, status: 'production' },
  { ver: 'v1.3-rc', date: '2024-11-06', samples: '8.0 万 h', loss: 0.0098, rmse: '4.2 ℃', auc: 0.928, status: 'shadow' },
];

// 数据投喂窗口（候选数据集）
export const FEED_DATASETS = [
  { id: 'ds-7d-tc01-01', name: 'TC-01 近 7 天 5min 栅格', range: '7d', size: '2 016 行', cols: 86, quality: 'VALID 98.6%' },
  { id: 'ds-30d-all',    name: '8 台车式窑 30 天 5min',    range: '30d', size: '69 120 行', cols: 326, quality: 'VALID 98.2%' },
  { id: 'ds-90d-prod',   name: '90 天生产批次（含工艺标签）', range: '90d', size: '12 480 行', cols: 142, quality: 'VALID 97.8%' },
  { id: 'ds-flame-img',  name: '烧嘴火焰图像集 (8.6 万张)', range: '6m', size: '8.6 万张', cols: 0, quality: '人工复核' },
  { id: 'ds-ir-thermo',  name: '红外热成像采集 (5.2 万张)', range: '6m', size: '5.2 万张', cols: 0, quality: '人工复核' },
];

// 封装产物历史
export const PACKAGE_FORMATS = [
  { id: 'skill', name: 'AI Skill (JSON)',  ext: '.skill.json', desc: '能力中心 / Coze / Agent 调用规格',     icon: 'Sparkles',   color: 'molybdenum', size: '< 4 KB', useCase: '智能体调度' },
  { id: 'onnx',  name: 'ONNX 模型',         ext: '.onnx',       desc: '跨平台推理标准格式，边缘 / 云通用',   icon: 'Cpu',        color: 'coolant',    size: '6 MB ~ 80 MB', useCase: '跨语言推理' },
  { id: 'exe',   name: 'Windows EXE',       ext: '.exe',        desc: 'PyInstaller 单文件可执行，工控机离线部署', icon: 'Square', color: 'iron',       size: '60 MB ~ 200 MB', useCase: '工控机离线' },
  { id: 'app',   name: '移动 APP',          ext: '.apk / .ipa', desc: '现场巡检 App，Android / iOS 双端',     icon: 'Smartphone', color: 'patina',     size: '20 MB ~ 60 MB',  useCase: '移动巡检' },
  { id: 'docker',name: 'Docker 镜像',       ext: '.tar / Registry', desc: '容器化云端 / K8s 部署',           icon: 'Package',    color: 'sulfur',     size: '180 MB ~ 800 MB', useCase: '云端服务' },
  { id: 'api',   name: 'HTTP API 服务',     ext: 'OpenAPI 3.1', desc: 'RESTful + OpenAPI 自动文档',          icon: 'Network',    color: 'molybdenum', size: '—',             useCase: '系统集成' },
]

export const PACKAGE_HISTORY = [
  { id: 'PKG-2411-018', name: 'KilnTempLSTM30m', ver: 'v1.2.0', format: 'onnx',  baseFlow: 'wf-temp',  size: '6.8 MB', downloads: 24, exportedAt: '2024-11-08 10:14', author: '中机六院·算法组', status: 'released' },
  { id: 'PKG-2411-017', name: 'FlameInspector',  ver: 'v3.1.0', format: 'docker',baseFlow: 'wf-flame', size: '524 MB', downloads: 12, exportedAt: '2024-11-07 16:32', author: '中机六院·视觉组', status: 'released' },
  { id: 'PKG-2411-016', name: 'CarbonOptDaily',  ver: 'v2.0.4', format: 'skill', baseFlow: 'wf-carbon',size: '3.2 KB', downloads: 86, exportedAt: '2024-11-07 09:48', author: '中机六院·能碳组', status: 'released' },
  { id: 'PKG-2411-015', name: 'FaultPredXGB',    ver: 'v1.3.0', format: 'exe',   baseFlow: 'wf-fault', size: '146 MB', downloads: 6,  exportedAt: '2024-11-05 14:20', author: '中机六院·算法组', status: 'released' },
  { id: 'PKG-2411-014', name: 'PatrolApp',       ver: 'v0.9.0', format: 'app',   baseFlow: 'wf-flame', size: '38 MB',  downloads: 132, exportedAt: '2024-11-04 11:08', author: '中机六院·应用组', status: 'beta' },
  { id: 'PKG-2411-013', name: 'EffOptAPI',       ver: 'v1.1.2', format: 'api',   baseFlow: 'wf-eff',   size: '—',      downloads: 48, exportedAt: '2024-11-02 19:50', author: '中机六院·能碳组', status: 'released' },
]

/**
 * ============== 能流分析 Sankey ==============
 */
export const ENERGY_FLOW = {
  totalGJ: 784,
  columns: [
    {
      title: '能源输入',
      nodes: [
        { id: 'NG', name: '天然气', value: 614, color: '#FF6B35' },
        { id: 'ELC', name: '外购电', value: 98, color: '#4A9EFF' },
        { id: 'STM', name: '外购蒸汽', value: 33, color: '#5DD3E0' },
        { id: 'COG', name: '焦炉煤气', value: 20, color: '#F4C430' },
        { id: 'PV', name: '光伏绿电', value: 19, color: '#7FB069' },
      ],
    },
    {
      title: '车式窑 & 辅助',
      nodes: [
        { id: 'TC01', name: '1# 退火窑', value: 120, color: '#FF6B35' },
        { id: 'TC02', name: '2# 正火窑', value: 105, color: '#FF6B35' },
        { id: 'TC03', name: '3# 调质窑', value: 130, color: '#FF6B35' },
        { id: 'TC04', name: '4# 烧成窑', value: 156, color: '#FF6B35' },
        { id: 'TC05', name: '5# 去应力', value: 76, color: '#FF6B35' },
        { id: 'TC07', name: '7# 回火窑', value: 48, color: '#FF6B35' },
        { id: 'TC08', name: '8# 消应窑', value: 70, color: '#FF6B35' },
        { id: 'AUX', name: '辅助 (风机/水泵/控制)', value: 79, color: '#4A9EFF' },
      ],
    },
    {
      title: '用能去向',
      nodes: [
        { id: 'EFFECT', name: '产品有效热', value: 286, color: '#7FB069' },
        { id: 'STACK', name: '排烟损失', value: 218, color: '#F4C430' },
        { id: 'WALL', name: '炉墙散热', value: 86, color: '#FF6B35' },
        { id: 'CAR', name: '台车带走', value: 42, color: '#FF6B35' },
        { id: 'RECO', name: '余热回收', value: 108, color: '#5DD3E0' },
        { id: 'INCOMP', name: '不完全燃烧', value: 26, color: '#F4C430' },
        { id: 'ELOSS', name: '电力 / 机械损耗', value: 18, color: '#4A9EFF' },
      ],
    },
  ],
  links: [
    { source: 'NG', target: 'TC01', value: 102 },
    { source: 'NG', target: 'TC02', value: 92 },
    { source: 'NG', target: 'TC03', value: 110 },
    { source: 'NG', target: 'TC04', value: 138 },
    { source: 'NG', target: 'TC05', value: 64 },
    { source: 'NG', target: 'TC07', value: 38 },
    { source: 'NG', target: 'TC08', value: 60 },
    { source: 'NG', target: 'AUX', value: 10 },
    { source: 'ELC', target: 'TC01', value: 8 },
    { source: 'ELC', target: 'TC02', value: 7 },
    { source: 'ELC', target: 'TC03', value: 9 },
    { source: 'ELC', target: 'TC04', value: 8 },
    { source: 'ELC', target: 'TC05', value: 5 },
    { source: 'ELC', target: 'TC07', value: 4 },
    { source: 'ELC', target: 'TC08', value: 5 },
    { source: 'ELC', target: 'AUX', value: 52 },
    { source: 'STM', target: 'AUX', value: 14 },
    { source: 'STM', target: 'TC05', value: 7 },
    { source: 'STM', target: 'TC08', value: 5 },
    { source: 'STM', target: 'TC02', value: 7 },
    { source: 'COG', target: 'TC04', value: 10 },
    { source: 'COG', target: 'TC03', value: 6 },
    { source: 'COG', target: 'TC07', value: 4 },
    { source: 'PV', target: 'AUX', value: 3 },
    { source: 'PV', target: 'TC01', value: 2 },
    { source: 'PV', target: 'TC02', value: 2 },
    { source: 'PV', target: 'TC03', value: 2 },
    { source: 'PV', target: 'TC04', value: 4 },
    { source: 'PV', target: 'TC05', value: 2 },
    { source: 'PV', target: 'TC07', value: 2 },
    { source: 'PV', target: 'TC08', value: 2 },
    { source: 'TC01', target: 'EFFECT', value: 44 },
    { source: 'TC01', target: 'STACK', value: 36 },
    { source: 'TC01', target: 'WALL', value: 14 },
    { source: 'TC01', target: 'CAR', value: 6 },
    { source: 'TC01', target: 'RECO', value: 16 },
    { source: 'TC01', target: 'INCOMP', value: 2 },
    { source: 'TC01', target: 'ELOSS', value: 2 },
    { source: 'TC02', target: 'EFFECT', value: 38 },
    { source: 'TC02', target: 'STACK', value: 30 },
    { source: 'TC02', target: 'WALL', value: 12 },
    { source: 'TC02', target: 'CAR', value: 6 },
    { source: 'TC02', target: 'RECO', value: 14 },
    { source: 'TC02', target: 'INCOMP', value: 3 },
    { source: 'TC02', target: 'ELOSS', value: 2 },
    { source: 'TC03', target: 'EFFECT', value: 50 },
    { source: 'TC03', target: 'STACK', value: 36 },
    { source: 'TC03', target: 'WALL', value: 14 },
    { source: 'TC03', target: 'CAR', value: 6 },
    { source: 'TC03', target: 'RECO', value: 18 },
    { source: 'TC03', target: 'INCOMP', value: 3 },
    { source: 'TC03', target: 'ELOSS', value: 3 },
    { source: 'TC04', target: 'EFFECT', value: 56 },
    { source: 'TC04', target: 'STACK', value: 48 },
    { source: 'TC04', target: 'WALL', value: 18 },
    { source: 'TC04', target: 'CAR', value: 8 },
    { source: 'TC04', target: 'RECO', value: 18 },
    { source: 'TC04', target: 'INCOMP', value: 5 },
    { source: 'TC04', target: 'ELOSS', value: 3 },
    { source: 'TC05', target: 'EFFECT', value: 28 },
    { source: 'TC05', target: 'STACK', value: 22 },
    { source: 'TC05', target: 'WALL', value: 8 },
    { source: 'TC05', target: 'CAR', value: 4 },
    { source: 'TC05', target: 'RECO', value: 10 },
    { source: 'TC05', target: 'INCOMP', value: 2 },
    { source: 'TC05', target: 'ELOSS', value: 2 },
    { source: 'TC07', target: 'EFFECT', value: 18 },
    { source: 'TC07', target: 'STACK', value: 14 },
    { source: 'TC07', target: 'WALL', value: 6 },
    { source: 'TC07', target: 'CAR', value: 2 },
    { source: 'TC07', target: 'RECO', value: 6 },
    { source: 'TC07', target: 'INCOMP', value: 1 },
    { source: 'TC07', target: 'ELOSS', value: 1 },
    { source: 'TC08', target: 'EFFECT', value: 26 },
    { source: 'TC08', target: 'STACK', value: 20 },
    { source: 'TC08', target: 'WALL', value: 8 },
    { source: 'TC08', target: 'CAR', value: 4 },
    { source: 'TC08', target: 'RECO', value: 8 },
    { source: 'TC08', target: 'INCOMP', value: 2 },
    { source: 'TC08', target: 'ELOSS', value: 2 },
    { source: 'AUX', target: 'EFFECT', value: 26 },
    { source: 'AUX', target: 'STACK', value: 12 },
    { source: 'AUX', target: 'WALL', value: 6 },
    { source: 'AUX', target: 'CAR', value: 6 },
    { source: 'AUX', target: 'RECO', value: 18 },
    { source: 'AUX', target: 'INCOMP', value: 8 },
    { source: 'AUX', target: 'ELOSS', value: 3 },
  ],
  diagnostics: [
    {
      id: 'D-01',
      target: '4# 烧成窑',
      loss: '排烟损失 48 GJ/h',
      pct: '31.0% of unit',
      advice: '增设烟道蓄热回收，预热助燃风温度提升 60 ℃→ 预计节气 4.6%',
    },
    {
      id: 'D-02',
      target: '炉墙群',
      loss: '炉墙散热 86 GJ/h',
      pct: '11.0% of total',
      advice: 'TC-02 / TC-04 炉门密封气幕压力偏低 0.4 kPa，优化后散热降 12%',
    },
    {
      id: 'D-03',
      target: '台车热损',
      loss: '台车带走 42 GJ/h',
      pct: '5.4% of total',
      advice: '工件出炉余热回用至预热段，回收潜力 28 GJ/h',
    },
    {
      id: 'D-04',
      target: '不完全燃烧',
      loss: '26 GJ/h',
      pct: '3.3% of total',
      advice: 'TC-04 残氧偏低，建议提高空燃比 0.4 → 燃烧损失↓ 38%',
    },
  ],
}

/**
 * ============== 用能 & 碳排预算管理 ==============
 */
export const BUDGET_KPIS = {
  energyBudgetGJ: 5_840_000,
  energyConsumedGJ: 4_186_400,
  carbonBudgetT: 308_400,
  carbonConsumedT: 218_640,
  electricBudgetMWh: 84_000,
  electricConsumedMWh: 62_180,
  gasBudgetWan: 18_400,
  gasConsumedWan: 13_180,
}

export const BUDGET_DEPARTMENTS = [
  {
    dept: '大件铸造车间',
    scope: 'TC-01/05',
    eBud: 1840000,
    eUse: 1336000,
    cBud: 96400,
    cUse: 70520,
    status: 'ontrack' as const,
  },
  {
    dept: '锻件热处理车间',
    scope: 'TC-02/06',
    eBud: 1240000,
    eUse: 924000,
    cBud: 64800,
    cUse: 48360,
    status: 'ontrack' as const,
  },
  {
    dept: '精密热处理车间',
    scope: 'TC-03/07/08',
    eBud: 1380000,
    eUse: 1018000,
    cBud: 72400,
    cUse: 53120,
    status: 'ontrack' as const,
  },
  {
    dept: '耐火材料烧成车间',
    scope: 'TC-04',
    eBud: 1080000,
    eUse: 824400,
    cBud: 56400,
    cUse: 42120,
    status: 'warning' as const,
  },
  {
    dept: '公用 & 辅助',
    scope: '风机/水泵/光伏储能',
    eBud: 300000,
    eUse: 84000,
    cBud: 18400,
    cUse: 4520,
    status: 'good' as const,
  },
]

export const BUDGET_TIMELINE = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, i) => ({
  name: q,
  能耗预算: [1460000, 1480000, 1480000, 1420000][i],
  能耗实际: [1380000, 1402000, 1404400, 0][i],
  碳预算: [77100, 77100, 77100, 77100][i],
  碳实际: [72200, 74840, 71600, 0][i],
}))

export const BUDGET_ALERTS = [
  {
    id: 'B-001',
    dept: '耐火材料烧成车间',
    kpi: '燃气月预算',
    actual: '108.4%',
    advice: '建议 11 月限产 8% 或申请配额调整',
  },
  {
    id: 'B-002',
    dept: '精密热处理车间',
    kpi: '电力季预算',
    actual: '92.4%',
    advice: '12 月需启动错峰用电 + 储能放电',
  },
  {
    id: 'B-003',
    dept: '集团范围',
    kpi: '碳排年预算',
    actual: '70.9%',
    advice: '剩余 89 760 tCO₂ 可覆盖 Q4，预计 Q4 末 95%',
  },
]

/**
 * ============== 碳排核算 / 核查 / 产品足迹 / 供应链 / 碳资产 / 碳市场 / 政策 ==============
 */

export const HOURS_24 = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)

export const carbonTrend24h = HOURS_24.map((name, i) => {
  const base = 14 + Math.sin((i + 2) / 24 * Math.PI * 2) * 4 + (i > 9 && i < 21 ? 3 : 0)
  return {
    name,
    实际排放: +(base + Math.random() * 1.2).toFixed(2),
    配额基线: +(17 + Math.cos(i / 12 * Math.PI) * 0.6).toFixed(2),
    去年同期: +(base * 1.16 + Math.random() * 1.4).toFixed(2),
  }
})

export const policies = [
  {
    code: 'GB 21369-2008',
    name: '工业热处理炉节能监测',
    level: '强制性国标',
    issuer: '国家市场监督管理总局',
    effective: '2008-10-01（在用，2024 修订征求意见）',
    progress: 92,
    status: 'inprogress' as const,
  },
  {
    code: 'GB/T 17358-2009',
    name: '热处理生产电耗、燃料消耗计算和测定方法',
    level: '推荐性国标',
    issuer: '全国热处理标准化技术委员会',
    effective: '2010-04-01',
    progress: 100,
    status: 'done' as const,
  },
  {
    code: 'GB/T 13338-2018',
    name: '工业燃料炉热平衡测试与计算基本规则',
    level: '推荐性国标',
    issuer: '国家标准化管理委员会',
    effective: '2019-04-01',
    progress: 100,
    status: 'done' as const,
  },
  {
    code: '国发〔2021〕23号',
    name: '2030 年前碳达峰行动方案',
    level: '国务院文件',
    issuer: '国务院',
    effective: '2021-10-24',
    progress: 62,
    status: 'inprogress' as const,
  },
  {
    code: '工信厅联节〔2024〕23号',
    name: '工业领域碳达峰实施方案 · 机械装备行业实施细则',
    level: '部委联合发文',
    issuer: '工信部 / 发改委 / 生态环境部',
    effective: '2024-06-15',
    progress: 84,
    status: 'inprogress' as const,
  },
  {
    code: '发改环资〔2023〕1714号',
    name: '工业重点领域能效标杆水平和基准水平（热处理炉部分）',
    level: '部委联合发文',
    issuer: '国家发改委 / 工信部',
    effective: '2023-12-01',
    progress: 78,
    status: 'inprogress' as const,
  },
]

export const carbonMarketTrades = [
  { date: '2024-11-07', type: 'CEA 配额', price: 96.5, volume: 1500, dir: 'sell' as const, party: '上海环境能源交易所' },
  { date: '2024-11-05', type: 'CCER', price: 78.2, volume: 1200, dir: 'buy' as const, party: '北京绿色交易所' },
  { date: '2024-10-30', type: '绿电交易', price: 0.412, volume: 480000, dir: 'buy' as const, party: '国网冀北' },
  { date: '2024-10-22', type: 'CEA 配额', price: 91.8, volume: 2400, dir: 'sell' as const, party: '上海环境能源交易所' },
  { date: '2024-10-15', type: '绿证 I-REC', price: 36.0, volume: 360, dir: 'buy' as const, party: '国家可再生能源中心' },
]

export const MRV_PILLARS = [
  { id: 'M', name: 'Monitoring 监测', metric: '3 842 点位', detail: '能源计量、O₂、烟温、热值 100% 在线 + 5min 入库', color: 'molybdenum' },
  { id: 'R', name: 'Reporting 报告',  metric: '12 类台账',  detail: '燃料采购、设备能效、配额履约、绿电消纳、CCER 抵销', color: 'patina' },
  { id: 'V', name: 'Verification 核查', metric: 'CMA + DOE', detail: '中证联合 / 必维国际 第三方核查记录可追溯', color: 'iron' },
]

export const VERIFICATION_PROCESS = [
  { id: 1, step: '数据采集',     desc: '在线表 + 计量器具校准证书 (CMA)',           progress: 100, status: 'done' as const },
  { id: 2, step: '排放因子核对', desc: 'GB/T 32151 + IPCC 2006 因子库版本控制',     progress: 100, status: 'done' as const },
  { id: 3, step: '边界 & 范围', desc: '范围一/二/三划分 + 设施图边界图入档',         progress: 100, status: 'done' as const },
  { id: 4, step: '台账归集',     desc: '12 类台账自动汇总 + 异常旁路记录',           progress: 96,  status: 'doing' as const },
  { id: 5, step: '不确定度评估', desc: 'GUM 法 95% 置信区间，目标 ≤ 5%',            progress: 78,  status: 'doing' as const },
  { id: 6, step: '第三方核查',   desc: 'DOE/DNV 资质机构现场审验',                  progress: 0,   status: 'pending' as const },
  { id: 7, step: '碳排报告披露', desc: 'ESG 报告 + ISO 14064-1 兼容披露',          progress: 0,   status: 'pending' as const },
]

export const EVIDENCE_PACK = [
  { id: 'EV-001', name: '燃料采购台账（天然气）.xlsx', period: '2024 YTD', type: 'xlsx', size: '4.6 MB', sha: 'a31c…f9d2', linked: 'L1 采集' },
  { id: 'EV-002', name: '电表月抄表 + 校准证书.pdf',    period: '2024-Q1~Q3', type: 'pdf',  size: '12.4 MB', sha: 'b7e4…2c81', linked: 'L1 采集' },
  { id: 'EV-003', name: '排放因子库版本变更记录.json',  period: 'v2024.10', type: 'json', size: '1.8 KB', sha: 'c4a6…d7b3', linked: 'L2 因子' },
  { id: 'EV-004', name: '设施边界图.dwg',              period: '2024-09 终版', type: 'dwg',  size: '6.2 MB', sha: 'd1f5…ee92', linked: 'L3 边界' },
  { id: 'EV-005', name: '不确定度评估报告_GUM.docx',    period: '2024-Q3',   type: 'docx', size: '2.4 MB', sha: 'e83b…41cd', linked: 'L5 不确定度' },
  { id: 'EV-006', name: 'CCER 项目说明书.pdf',          period: '余热回收',   type: 'pdf',  size: '8.6 MB', sha: 'f046…7a8d', linked: 'L6 第三方' },
  { id: 'EV-007', name: '蓄热式烧嘴改造方案.pdf',       period: '2024-08',   type: 'pdf',  size: '5.2 MB', sha: '12ac…bf73', linked: 'L7 披露' },
]

export const QUALITY_GATES = [
  { id: 'Q1', name: '完整性（数据缺失率）',  target: '≤ 1%',  actual: '0.42%',  status: 'pass' as const },
  { id: 'Q2', name: '一致性（核算口径）',    target: '统一 GB/T 32151',  actual: '已统一',  status: 'pass' as const },
  { id: 'Q3', name: '准确性（不确定度）',    target: '≤ 5%',  actual: '4.2%',   status: 'pass' as const },
  { id: 'Q4', name: '可追溯（采集→核算）',  target: '100% 血缘',  actual: '100%', status: 'pass' as const },
  { id: 'Q5', name: '边界完整（范围1+2+3）', target: '100%',  actual: '范围三 92%', status: 'warn' as const },
  { id: 'Q6', name: '档案保留期 ≥ 5 年',    target: '≥ 5 年',  actual: '已配置',  status: 'pass' as const },
]

export const PRODUCTS_LCA = [
  { id: 'P-01', name: '120t 大型铸钢件 ZG270-500',  unit: '吨', pcf: 1.86, base: 2.20, prodVol: '8 640 t/y', cert: 'ISO 14067', furnace: 'TC-01', stages: { up: 0.86, prod: 0.74, down: 0.26 } },
  { id: 'P-02', name: '风电主轴锻件 42CrMo',        unit: '件', pcf: 0.42, base: 0.58, prodVol: '24 000 件/y', cert: 'ISO 14067', furnace: 'TC-02/07', stages: { up: 0.18, prod: 0.18, down: 0.06 } },
  { id: 'P-03', name: '核电压力容器筒节',           unit: '件', pcf: 2.84, base: 3.40, prodVol: '120 件/y', cert: 'EPD 三方', furnace: 'TC-03/08', stages: { up: 1.36, prod: 1.18, down: 0.30 } },
  { id: 'P-04', name: '耐火砖 (高铝质)',           unit: '吨', pcf: 0.96, base: 1.20, prodVol: '32 000 t/y', cert: '内部核算', furnace: 'TC-04', stages: { up: 0.42, prod: 0.42, down: 0.12 } },
  { id: 'P-05', name: '船用大型曲轴锻件',           unit: '件', pcf: 1.24, base: 1.64, prodVol: '420 件/y', cert: '内部核算', furnace: 'TC-06/02', stages: { up: 0.58, prod: 0.52, down: 0.14 } },
]

export const LCA_BREAKDOWN = [
  { phase: '原材料获取', desc: '铸坯、合金、耐材、辅料 上游碳因子' },
  { phase: '入厂运输',   desc: '陆运/水运 距离 × 燃油因子' },
  { phase: '热处理工艺', desc: '车式窑燃气、电、蒸汽、辅料' },
  { phase: '机加工',     desc: '机床能耗、切削液、刀具' },
  { phase: '包装 & 出厂', desc: '包装材料 + 出厂物流' },
  { phase: '使用阶段',   desc: '客户使用碳排（仅产品类目相关时）' },
  { phase: '寿终处置',   desc: '回收/再制造/填埋 折算' },
]

export const SUPPLIERS = [
  { id: 'S-01', name: '河钢承钢 · 铸坯',         tier: 'T1', cat: '原材料', share: 28.6, scope3T: 12480, ecoRating: 'A',  esgScore: 86, certs: ['ISO 14064','EPD'],      risk: 'low' as const },
  { id: 'S-02', name: '中铝沈阳 · 合金原料',     tier: 'T1', cat: '原材料', share: 14.2, scope3T: 6840,  ecoRating: 'A-', esgScore: 82, certs: ['ISO 14064'],            risk: 'low' as const },
  { id: 'S-03', name: '海螺水泥 · 耐火材料',     tier: 'T1', cat: '辅料',   share: 9.6,  scope3T: 4680,  ecoRating: 'B+', esgScore: 76, certs: ['LCA 报告'],              risk: 'medium' as const },
  { id: 'S-04', name: '昆仑能源 · 天然气',       tier: 'T1', cat: '燃料',   share: 24.8, scope3T: 8640,  ecoRating: 'A',  esgScore: 88, certs: ['ISO 14064','ISO 50001'], risk: 'low' as const },
  { id: 'S-05', name: '国家电网 · 外购电',       tier: 'T1', cat: '能源',   share: 12.4, scope3T: 5860,  ecoRating: 'A-', esgScore: 84, certs: ['绿电凭证'],              risk: 'low' as const },
  { id: 'S-06', name: '中铁特货 · 物流',         tier: 'T1', cat: '物流',   share: 6.8,  scope3T: 3120,  ecoRating: 'B',  esgScore: 72, certs: ['ISO 14001'],            risk: 'medium' as const },
  { id: 'S-07', name: '本地包装供应商 X3',       tier: 'T2', cat: '包装',   share: 3.6,  scope3T: 980,   ecoRating: 'B-', esgScore: 64, certs: ['—'],                    risk: 'high' as const },
]

export const SCOPE3_CATEGORIES = [
  { name: '1. 采购商品 & 服务', value: 18920, share: 44.2 },
  { name: '2. 资本商品',         value: 4680,  share: 10.9 },
  { name: '3. 燃料能源相关',     value: 6840,  share: 16.0 },
  { name: '4. 上游运输配送',     value: 3120,  share: 7.3 },
  { name: '5. 经营废弃物',       value: 962,   share: 2.2 },
  { name: '6. 员工差旅',         value: 642,   share: 1.5 },
  { name: '7. 员工通勤',         value: 384,   share: 0.9 },
  { name: '9. 下游运输',         value: 2680,  share: 6.3 },
  { name: '11. 产品使用',        value: 3840,  share: 9.0 },
  { name: '12. 产品寿终',        value: 768,   share: 1.7 },
]

export const CARBON_ASSETS = {
  totalCEA: 86_400,
  totalCCER: 12_840,
  totalGEC: 18_600, // 绿证 张
  netPosition: 23_640, // 净持有 tCO₂e
  monetaryValue: 9_864_800, // 货币化 元
}

export const CARBON_ASSET_BREAKDOWN = [
  { kind: 'CEA 配额',     held: 86400, avgCost: 78.4, marketPrice: 92.6, ytdPL: 1228000,  status: 'long' as const },
  { kind: 'CCER 减排量',  held: 12840, avgCost: 64.8, marketPrice: 78.2, ytdPL: 172000,   status: 'long' as const },
  { kind: '绿证 GEC',     held: 18600, avgCost: 52.0, marketPrice: 60.0, ytdPL: 148800,   status: 'long' as const },
  { kind: 'CCER 远期合约', held: 8000,  avgCost: 72.4, marketPrice: 78.2, ytdPL: 46400,    status: 'forward' as const },
]

export const CARBON_ASSET_OPS = [
  { date: '2024-11-08', op: '买入',  kind: 'CCER', volume: 2400, price: 78.2 as number | string, amount: 187680,  counter: '上海环境能源交易所', operator: '中机六院·能碳组' },
  { date: '2024-11-06', op: '卖出',  kind: 'CEA',  volume: 4800, price: 92.6 as number | string, amount: 444480,  counter: '湖北碳排放权交易中心', operator: '中机六院·能碳组' },
  { date: '2024-11-04', op: '注销',  kind: 'CCER', volume: 1200, price: '-' as number | string, amount: 0,        counter: '履约抵销 (本厂范围一)', operator: '中机六院·能碳组' },
  { date: '2024-11-02', op: '认购',  kind: 'GEC',  volume: 3200, price: 60 as number | string,   amount: 192000,  counter: '北京绿色交易所',     operator: '中机六院·能碳组' },
  { date: '2024-10-28', op: '买入',  kind: 'CCER 远期', volume: 8000, price: 72.4 as number | string, amount: 579200, counter: 'OTC · 大唐碳资产', operator: '中机六院·能碳组' },
]

export const ASSET_STRATEGIES = [
  { id: 'AS-01', name: '配额履约保底', logic: '保留 CEA ≥ 预计履约缺口 110%',  status: '执行中', target: '≥ 92 K t' },
  { id: 'AS-02', name: 'CCER 套利',    logic: 'CCER 现货折价超 10% 即买入',   status: '执行中', target: '∆ ≥ 10%' },
  { id: 'AS-03', name: '绿证抵扣',     logic: '范围二外购电 100% 绿电覆盖',    status: '执行中', target: '100%' },
  { id: 'AS-04', name: '远期锁定',     logic: 'Q4 锁定 8 K t CCER 远期防上行', status: '已完成', target: '8 000 t' },
  { id: 'AS-05', name: 'ESG 披露增信', logic: '每季披露净排放 + 抵销组合',     status: '执行中', target: '季度' },
]
