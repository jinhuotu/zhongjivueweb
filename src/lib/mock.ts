export const COLOR = {
  iron: '#FF6B35',
  molybdenum: '#4A9EFF',
  patina: '#7FB069',
  sulfur: '#F4C430',
  coolant: '#5DD3E0',
  rose: '#E06B8A',
}

export const carbonScope = [
  { name: '范围一 天然气燃烧', value: 82.6, color: COLOR.iron },
  { name: '范围二 外购电力', value: 14.8, color: COLOR.molybdenum },
  { name: '范围三 上游甲烷逸散等', value: 2.6, color: COLOR.coolant },
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
