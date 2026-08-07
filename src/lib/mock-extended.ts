// 三大模块 mock：APS 高级排程 / 故障预测（FP）等
// 与 mock.ts 互补

// ============================================================
// 一、APS 高级排程
// ============================================================

export interface ApsOrder {
  id: string
  code: string
  customer: string
  product: string
  spec: string
  qty: number
  unit: string
  priority: 'P0-紧急' | 'P1-高' | 'P2-中' | 'P3-低'
  dueDate: string
  promisedDate: string
  status: '待排' | '已排' | '生产中' | '已完成' | '延期'
  process: string
  furnace: string
  startAt: string
  endAt: string
  delayDays: number
}

export const APS_ORDERS: ApsOrder[] = [
  { id: 'o1', code: 'SO-2026-0628-A01', customer: '中建材集团', product: '高铝砖 HA-75', spec: '230×114×65mm', qty: 12000, unit: '块', priority: 'P0-紧急', dueDate: '2026-07-05', promisedDate: '2026-07-04', status: '生产中', process: '烧成', furnace: 'TC-01', startAt: '2026-06-28 08:00', endAt: '2026-07-02 18:00', delayDays: 0 },
  { id: 'o2', code: 'SO-2026-0628-A02', customer: '宝钢股份', product: '镁碳砖 MT-80', spec: '400×200×100mm', qty: 3000, unit: '块', priority: 'P1-高', dueDate: '2026-07-08', promisedDate: '2026-07-07', status: '已排', process: '烧成', furnace: 'TC-03', startAt: '2026-07-01 06:00', endAt: '2026-07-04 22:00', delayDays: 0 },
  { id: 'o3', code: 'SO-2026-0628-A03', customer: '首钢集团', product: '刚玉砖 GY-90', spec: '300×150×80mm', qty: 5000, unit: '块', priority: 'P2-中', dueDate: '2026-07-12', promisedDate: '2026-07-11', status: '已排', process: '烧成', furnace: 'TC-02', startAt: '2026-07-03 00:00', endAt: '2026-07-07 12:00', delayDays: 0 },
  { id: 'o4', code: 'SO-2026-0628-A04', customer: '鞍钢集团', product: '硅莫砖 SM-65', spec: '230×114×65mm', qty: 8000, unit: '块', priority: 'P1-高', dueDate: '2026-07-06', promisedDate: '2026-07-05', status: '待排', process: '烧成', furnace: '-', startAt: '-', endAt: '-', delayDays: 0 },
  { id: 'o5', code: 'SO-2026-0628-A05', customer: '河钢集团', product: '碳化硅砖 SC-85', spec: '350×180×90mm', qty: 2000, unit: '块', priority: 'P0-紧急', dueDate: '2026-07-03', promisedDate: '2026-07-02', status: '生产中', process: '烧成', furnace: 'TC-05', startAt: '2026-06-27 20:00', endAt: '2026-07-01 10:00', delayDays: 0 },
  { id: 'o6', code: 'SO-2026-0628-A06', customer: '马钢股份', product: '高铝砖 HA-75', spec: '230×114×65mm', qty: 15000, unit: '块', priority: 'P3-低', dueDate: '2026-07-20', promisedDate: '2026-07-18', status: '待排', process: '烧成', furnace: '-', startAt: '-', endAt: '-', delayDays: 0 },
  { id: 'o7', code: 'SO-2026-0628-A07', customer: '沙钢集团', product: '镁铝尖晶石砖 MJ-70', spec: '400×200×120mm', qty: 4000, unit: '块', priority: 'P2-中', dueDate: '2026-07-15', promisedDate: '2026-07-14', status: '已排', process: '烧成', furnace: 'TC-04', startAt: '2026-07-05 08:00', endAt: '2026-07-10 16:00', delayDays: 0 },
  { id: 'o8', code: 'SO-2026-0628-A08', customer: '太钢不锈', product: '刚玉砖 GY-90', spec: '300×150×80mm', qty: 6000, unit: '块', priority: 'P1-高', dueDate: '2026-07-09', promisedDate: '2026-07-08', status: '延期', process: '烧成', furnace: 'TC-06', startAt: '2026-06-25 06:00', endAt: '2026-07-03 18:00', delayDays: 2 },
  { id: 'o9', code: 'SO-2026-0628-A09', customer: '本钢集团', product: '硅莫砖 SM-65', spec: '230×114×65mm', qty: 10000, unit: '块', priority: 'P2-中', dueDate: '2026-07-18', promisedDate: '2026-07-16', status: '待排', process: '烧成', furnace: '-', startAt: '-', endAt: '-', delayDays: 0 },
  { id: 'o10', code: 'SO-2026-0628-A10', customer: '华菱钢铁', product: '碳化硅砖 SC-85', spec: '350×180×90mm', qty: 2500, unit: '块', priority: 'P1-高', dueDate: '2026-07-07', promisedDate: '2026-07-06', status: '生产中', process: '烧成', furnace: 'TC-07', startAt: '2026-06-29 00:00', endAt: '2026-07-04 08:00', delayDays: 0 },
]

export interface ApsConstraint {
  id: string
  group: '资源能力' | '生产条件' | '排序策略'
  name: string
  desc: string
  enabled: boolean
}

export const APS_CONSTRAINTS: ApsConstraint[] = [
  { id: 'c1', group: '资源能力', name: '设备产能约束', desc: '每台窑炉额定装载量与烧成周期上限', enabled: true },
  { id: 'c2', group: '资源能力', name: '人员班组约束', desc: '三班两倒/四班三倒排班规则', enabled: true },
  { id: 'c3', group: '资源能力', name: '瓶颈工序约束', desc: '成型/烧成/精加工瓶颈识别', enabled: true },
  { id: 'c4', group: '资源能力', name: '库存量约束', desc: '原料/半成品/成品库存上下限', enabled: false },
  { id: 'c5', group: '生产条件', name: '物料齐套约束', desc: 'BOM 物料齐套率 ≥ 98% 方可开工', enabled: true },
  { id: 'c6', group: '生产条件', name: '模具占用约束', desc: '模具共用冲突检测与调度', enabled: true },
  { id: 'c7', group: '生产条件', name: '废品率约束', desc: '历史废品率 > 阈值触发工艺复核', enabled: false },
  { id: 'c8', group: '生产条件', name: '温度兼容性约束', desc: '同窑产品烧成温度区间需兼容（±30℃）', enabled: true },
  { id: 'c9', group: '排序策略', name: '交期优先', desc: '按交期由近到远排序，EDD 规则', enabled: true },
  { id: 'c10', group: '排序策略', name: '插单顺延', desc: '紧急插单后，后续订单按规则顺延', enabled: true },
  { id: 'c11', group: '排序策略', name: '人工调整', desc: '允许调度员手动拖拽调整甘特图', enabled: true },
  { id: 'c12', group: '排序策略', name: '能耗最优', desc: '优先利用谷电时段烧成', enabled: false },
]

export interface ApsScheduleResult {
  id: string
  name: string
  createdAt: string
  score: number
  onTimeRate: number
  delayRisk: number
  utilization: number
  energyCost: number
  constraintHits: number
  orders: { orderId: string; furnace: string; start: string; end: string; color: string }[]
}

export const APS_SCHEDULE_RESULTS: ApsScheduleResult[] = [
  {
    id: 'sch-1',
    name: '方案 A · 交期优先',
    createdAt: '2026-06-28 14:20',
    score: 87,
    onTimeRate: 92,
    delayRisk: 12,
    utilization: 84,
    energyCost: 148,
    constraintHits: 11,
    orders: [
      { orderId: 'o1', furnace: 'TC-01', start: '2026-06-28 08:00', end: '2026-07-02 18:00', color: '#FF6B35' },
      { orderId: 'o5', furnace: 'TC-05', start: '2026-06-27 20:00', end: '2026-07-01 10:00', color: '#F4C430' },
      { orderId: 'o10', furnace: 'TC-07', start: '2026-06-29 00:00', end: '2026-07-04 08:00', color: '#4A9EFF' },
      { orderId: 'o2', furnace: 'TC-03', start: '2026-07-01 06:00', end: '2026-07-04 22:00', color: '#7FB069' },
      { orderId: 'o3', furnace: 'TC-02', start: '2026-07-03 00:00', end: '2026-07-07 12:00', color: '#5DD3E0' },
      { orderId: 'o7', furnace: 'TC-04', start: '2026-07-05 08:00', end: '2026-07-10 16:00', color: '#B47BFF' },
    ],
  },
  {
    id: 'sch-2',
    name: '方案 B · 能耗最优',
    createdAt: '2026-06-28 14:25',
    score: 81,
    onTimeRate: 85,
    delayRisk: 22,
    utilization: 76,
    energyCost: 112,
    constraintHits: 9,
    orders: [
      { orderId: 'o1', furnace: 'TC-01', start: '2026-06-28 22:00', end: '2026-07-03 06:00', color: '#FF6B35' },
      { orderId: 'o5', furnace: 'TC-05', start: '2026-06-28 22:00', end: '2026-07-02 10:00', color: '#F4C430' },
      { orderId: 'o10', furnace: 'TC-07', start: '2026-06-29 22:00', end: '2026-07-05 06:00', color: '#4A9EFF' },
      { orderId: 'o2', furnace: 'TC-03', start: '2026-07-01 22:00', end: '2026-07-06 06:00', color: '#7FB069' },
      { orderId: 'o3', furnace: 'TC-02', start: '2026-07-03 22:00', end: '2026-07-08 06:00', color: '#5DD3E0' },
      { orderId: 'o7', furnace: 'TC-04', start: '2026-07-06 22:00', end: '2026-07-11 06:00', color: '#B47BFF' },
    ],
  },
]

export interface ApsFurnaceCapacity {
  id: string
  name: string
  type: string
  maxLoad: number
  currentLoad: number
  cycleHours: number
  availability: number
  bottleneck: boolean
}

export const APS_FURNACE_CAPACITY: ApsFurnaceCapacity[] = [
  { id: 'TC-01', name: '1# 车式窑', type: '燃气车底炉', maxLoad: 15, currentLoad: 12, cycleHours: 96, availability: 92, bottleneck: true },
  { id: 'TC-02', name: '2# 车式窑', type: '燃气车底炉', maxLoad: 15, currentLoad: 8, cycleHours: 108, availability: 88, bottleneck: false },
  { id: 'TC-03', name: '3# 车式窑', type: '燃气车底炉', maxLoad: 12, currentLoad: 10, cycleHours: 84, availability: 95, bottleneck: false },
  { id: 'TC-04', name: '4# 车式窑', type: '燃气车底炉', maxLoad: 12, currentLoad: 6, cycleHours: 120, availability: 81, bottleneck: false },
  { id: 'TC-05', name: '5# 车式窑', type: '燃气车底炉', maxLoad: 18, currentLoad: 16, cycleHours: 72, availability: 97, bottleneck: true },
  { id: 'TC-06', name: '6# 车式窑', type: '燃气车底炉', maxLoad: 15, currentLoad: 14, cycleHours: 96, availability: 89, bottleneck: true },
  { id: 'TC-07', name: '7# 车式窑', type: '燃气车底炉', maxLoad: 15, currentLoad: 11, cycleHours: 108, availability: 85, bottleneck: false },
  { id: 'TC-08', name: '8# 车式窑', type: '燃气车底炉', maxLoad: 18, currentLoad: 5, cycleHours: 84, availability: 78, bottleneck: false },
]

export interface ApsMaterial {
  id: string
  code: string
  name: string
  stock: number
  required: number
  eta: string
  status: '齐套' | '缺口' | '在途'
  completeRate?: number
  inStock?: number
  inTransit?: number
}

export const APS_MATERIALS: ApsMaterial[] = [
  { id: 'm1', code: 'MAT-001', name: '高铝矾土 (85%)', stock: 120, required: 95, eta: '-', status: '齐套' },
  { id: 'm2', code: 'MAT-002', name: '电熔镁砂', stock: 45, required: 80, eta: '2026-07-02', status: '在途' },
  { id: 'm3', code: 'MAT-003', name: '棕刚玉', stock: 28, required: 60, eta: '2026-07-05', status: '缺口' },
  { id: 'm4', code: 'MAT-004', name: '碳化硅', stock: 72, required: 50, eta: '-', status: '齐套' },
  { id: 'm5', code: 'MAT-005', name: '酚醛树脂结合剂', stock: 18, required: 25, eta: '2026-07-01', status: '在途' },
  { id: 'm6', code: 'MAT-006', name: '硅莫骨料', stock: 95, required: 70, eta: '-', status: '齐套' },
]

export interface ApsExecution {
  id: string
  orderId: string
  furnace: string
  planStart: string
  planEnd: string
  actualStart: string
  actualEnd: string
  progress: number
  status: '正常' | '延误' | '提前' | '暂停'
  deviation: number
}

export const APS_EXECUTIONS: ApsExecution[] = [
  { id: 'e1', orderId: 'o1', furnace: 'TC-01', planStart: '06-28 08:00', planEnd: '07-02 18:00', actualStart: '06-28 08:15', actualEnd: '-', progress: 62, status: '正常', deviation: 0.25 },
  { id: 'e2', orderId: 'o5', furnace: 'TC-05', planStart: '06-27 20:00', planEnd: '07-01 10:00', actualStart: '06-27 20:30', actualEnd: '-', progress: 78, status: '延误', deviation: 1.5 },
  { id: 'e3', orderId: 'o10', furnace: 'TC-07', planStart: '06-29 00:00', planEnd: '07-04 08:00', actualStart: '06-29 00:00', actualEnd: '-', progress: 35, status: '正常', deviation: 0 },
  { id: 'e4', orderId: 'o8', furnace: 'TC-06', planStart: '06-25 06:00', planEnd: '07-03 18:00', actualStart: '06-25 07:20', actualEnd: '-', progress: 88, status: '延误', deviation: 48 },
]

export interface ApsKpi {
  id: string
  name: string
  value: number
  target: number
  unit: string
  trend: 'up' | 'down' | 'flat'
  delta: number
}

export const APS_KPIS: ApsKpi[] = [
  { id: 'k1', name: '订单准交率', value: 91.2, target: 95, unit: '%', trend: 'up', delta: 1.8 },
  { id: 'k2', name: '产能利用率', value: 84.5, target: 88, unit: '%', trend: 'flat', delta: 0.3 },
  { id: 'k3', name: '平均延期天数', value: 1.2, target: 0.5, unit: '天', trend: 'down', delta: -0.4 },
  { id: 'k4', name: '换产时间占比', value: 8.7, target: 6, unit: '%', trend: 'down', delta: -1.2 },
  { id: 'k5', name: '排程稳定性', value: 78.3, target: 85, unit: '%', trend: 'up', delta: 2.1 },
  { id: 'k6', name: '能耗成本/吨', value: 148, target: 135, unit: '¥/t', trend: 'down', delta: -6 },
]

export const APS_EMERGENCY = {
  pending: [
    { id: 'e1', order: 'ORD-007', product: '刚玉砖 G1', quantity: 200, deadline: '2026-07-02', impact: [{ type: '能耗', value: '+8%' }, { type: '产能', value: '-12%' }] },
    { id: 'e2', order: 'ORD-008', product: '高铝砖 A1', quantity: 150, deadline: '2026-07-03', impact: [{ type: '能耗', value: '+5%' }, { type: '产能', value: '-8%' }] },
  ],
  inProgress: [
    { id: 'e3', order: 'ORD-009', product: '莫来石砖 M2', quantity: 180, deadline: '2026-07-04', impact: [{ type: '能耗', value: '+6%' }, { type: '产能', value: '-10%' }] },
  ],
  impactMatrix: [
    { id: 'e1', order: 'ORD-012', delay: '2 天', affected: 3, revenue: 48000 },
    { id: 'e2', order: 'ORD-018', delay: '1 天', affected: 2, revenue: 22000 },
    { id: 'e3', order: 'ORD-022', delay: '3 天', affected: 4, revenue: 76000 },
  ],
  plans: [
    { id: 'p1', name: '方案 A · 加班赶工', score: 82, cost: 18500, delay: '0.5 天' },
    { id: 'p2', name: '方案 B · 转窑生产', score: 76, cost: 9200, delay: '1.5 天' },
    { id: 'p3', name: '方案 C · 外协分流', score: 68, cost: 24000, delay: '0 天' },
  ],
}

export const APS_ENERGY_SCHEDULE = [
  { hour: 0, load: 45, price: 0.4, gasFlow: 120 },
  { hour: 4, load: 52, price: 0.4, gasFlow: 135 },
  { hour: 8, load: 78, price: 1.2, gasFlow: 180 },
  { hour: 12, load: 85, price: 0.7, gasFlow: 195 },
  { hour: 16, load: 82, price: 0.7, gasFlow: 188 },
  { hour: 20, load: 68, price: 1.1, gasFlow: 165 },
  { hour: 23, load: 48, price: 0.4, gasFlow: 125 },
]

export const APS_LOADING_RULES = [
  { id: 'r1', name: '温度兼容', desc: '同窑产品烧成温度差 ≤ 30℃', enabled: true, strict: true, condition: '温度差 ≤ 30℃' },
  { id: 'r2', name: '高度上限', desc: '装载高度 ≤ 窑膛有效高度 85%', enabled: true, strict: true, condition: '高度 ≤ 85%' },
  { id: 'r3', name: '重量均衡', desc: '窑车左右载重差 ≤ 10%', enabled: true, strict: true, condition: '载重差 ≤ 10%' },
  { id: 'r4', name: '气氛隔离', desc: '氧化/还原气氛产品分窑', enabled: true, strict: true, condition: '气氛隔离' },
  { id: 'r5', name: '窑具复用', desc: '优先复用已就位窑具', enabled: false, strict: false, condition: '优先复用' },
]

// ============================================================
// 二、故障预测 FP（页面契约字段 + Overview 兼容字段）
// ============================================================

export const FP_OVERVIEW = {
  healthScore: 78,
  riskDevices: 6,
  riskCount: 6,
  oee: 82.4,
  alerts: 12,
  predAccuracy: 91.5,
  mtbf: 420,
  mttr: 3.2,
  deviceList: [
    { id: 'TC-01', name: 'TC-01', health: 88, risk: '低', oee: 88, mtbf: 1420 },
    { id: 'TC-02', name: 'TC-02', health: 82, risk: '低', oee: 82, mtbf: 1180 },
    { id: 'TC-03', name: 'TC-03', health: 75, risk: '中', oee: 76, mtbf: 960 },
    { id: 'TC-04', name: 'TC-04', health: 68, risk: '中', oee: 68, mtbf: 720 },
    { id: 'TC-05', name: 'TC-05', health: 91, risk: '低', oee: 91, mtbf: 1580 },
    { id: 'TC-06', name: 'TC-06', health: 52, risk: '高', oee: 62, mtbf: 540 },
    { id: 'TC-07', name: 'TC-07', health: 79, risk: '中', oee: 85, mtbf: 1280 },
    { id: 'TC-08', name: 'TC-08', health: 73, risk: '中', oee: 71, mtbf: 880 },
  ],
  devices: [
    { id: 'TC-01', name: 'TC-01', health: 88, risk: '低', oee: 88, mtbf: 1420 },
    { id: 'TC-02', name: 'TC-02', health: 82, risk: '低', oee: 82, mtbf: 1180 },
    { id: 'TC-03', name: 'TC-03', health: 75, risk: '中', oee: 76, mtbf: 960 },
    { id: 'TC-04', name: 'TC-04', health: 68, risk: '中', oee: 68, mtbf: 720 },
    { id: 'TC-05', name: 'TC-05', health: 91, risk: '低', oee: 91, mtbf: 1580 },
    { id: 'TC-06', name: 'TC-06', health: 52, risk: '高', oee: 62, mtbf: 540 },
    { id: 'TC-07', name: 'TC-07', health: 79, risk: '中', oee: 85, mtbf: 1280 },
    { id: 'TC-08', name: 'TC-08', health: 73, risk: '中', oee: 71, mtbf: 880 },
  ],
  riskList: [
    { id: 'r1', equipment: 'TC-06', fault: '主轴承磨损', probability: 78, level: '高' },
    { id: 'r2', equipment: 'TC-04', fault: '风机振动异常', probability: 65, level: '中' },
    { id: 'r3', equipment: 'TC-02', fault: '热电偶漂移', probability: 52, level: '中' },
  ],
  riskSummary: [
    { type: '机械传动', count: 2, level: 'high' },
    { type: '传感仪表', count: 3, level: 'medium' },
    { type: '燃烧系统', count: 1, level: 'high' },
  ],
}

export const FP_REALTIME = {
  devices: [
    { id: 'TC-01', status: '运行', health: 88, temp: 1420, vibration: 2.1, pressure: 0.12 },
    { id: 'TC-02', status: '运行', health: 82, temp: 1385, vibration: 2.8, pressure: 0.11 },
    { id: 'TC-03', status: '运行', health: 75, temp: 1455, vibration: 3.4, pressure: 0.13 },
    { id: 'TC-04', status: '运行', health: 68, temp: 1398, vibration: 7.8, pressure: 0.15 },
    { id: 'TC-05', status: '待机', health: 91, temp: 420, vibration: 0.6, pressure: 0.05 },
    { id: 'TC-06', status: '告警', health: 52, temp: 1510, vibration: 6.2, pressure: 0.18 },
    { id: 'TC-07', status: '运行', health: 79, temp: 1412, vibration: 2.5, pressure: 0.12 },
    { id: 'TC-08', status: '运行', health: 73, temp: 1368, vibration: 3.9, pressure: 0.14 },
  ],
  vibrationSpectrum: Array.from({ length: 40 }, (_, i) => {
    const base = 1.2 + Math.sin(i / 3) * 0.8
    return Number((i === 16 ? 4.8 : base + (i % 5) * 0.15).toFixed(2))
  }),
  thermal: Array.from({ length: 64 }, (_, i) => {
    const row = Math.floor(i / 8)
    const col = i % 8
    return Math.min(1, Math.max(0, 0.35 + row * 0.08 + (col > 3 ? 0.15 : 0) + (i % 7) * 0.02))
  }),
}

export const FP_COLLECTION = {
  channels: 4,
  points: 272,
  features: 4,
  annotationRate: 82,
  channelsList: [
    { id: 'c1', name: 'OPC UA-TC01', protocol: 'OPC UA', status: 'online', points: 128, rate: 1, quality: 99.2 },
    { id: 'c2', name: 'Modbus-TC03', protocol: 'Modbus TCP', status: 'online', points: 64, rate: 0.2, quality: 98.5 },
    { id: 'c3', name: 'MQTT-振动', protocol: 'MQTT', status: 'online', points: 32, rate: 10, quality: 97.1 },
    { id: 'c4', name: 'Modbus-TC07', protocol: 'Modbus TCP', status: 'offline', points: 48, rate: 0.2, quality: 0 },
  ],
  featureLibrary: [
    { id: 'f1', name: '振动 RMS', type: '时域', count: 128, window: '5min' },
    { id: 'f2', name: '温度斜率', type: '趋势', count: 96, window: '15min' },
    { id: 'f3', name: '电流谐波', type: '频域', count: 64, window: '1min' },
    { id: 'f4', name: '压力波动', type: '统计', count: 48, window: '5min' },
  ],
}

export const FP_PREDICTION = {
  accuracy: 91.5,
  risks7d: 6,
  leadTime: 72,
  stability: 88,
  models: [
    { id: 'm1', name: '轴承劣化预测', weight: 0.4, accuracy: 92, recall: 89, f1: 0.9 },
    { id: 'm2', name: '热电偶漂移检测', weight: 0.3, accuracy: 88, recall: 85, f1: 0.86 },
    { id: 'm3', name: '燃烧器故障诊断', weight: 0.3, accuracy: 91, recall: 87, f1: 0.89 },
  ],
  degradation: Array.from({ length: 30 }, (_, i) => Number((0.25 + i * 0.018 + Math.sin(i / 4) * 0.04).toFixed(3))),
  whatIf: [
    { scenario: '维持当前工况', health: 62, faultProb: 38, life: 180 },
    { scenario: '降载 20%', health: 74, faultProb: 22, life: 240 },
    { scenario: '加强润滑', health: 70, faultProb: 26, life: 210 },
  ],
}

export const FP_MODELS = [
  { id: 'm1', name: '轴承劣化预测', type: 'LSTM', accuracy: 92, status: 'deployed', version: '2.3', updated: '2026-06-20' },
  { id: 'm2', name: '热电偶漂移检测', type: 'XGBoost', accuracy: 88, status: 'deployed', version: '1.8', updated: '2026-06-18' },
  { id: 'm3', name: '燃烧器故障诊断', type: 'CNN', accuracy: 91, status: 'canary', version: '3.1', updated: '2026-06-25' },
  { id: 'm4', name: '窑车卡滞预警', type: 'RandomForest', accuracy: 85, status: 'deployed', version: '1.2', updated: '2026-06-12' },
  { id: 'm5', name: '风机振动预测', type: 'Transformer', accuracy: 94, status: 'training', version: '0.9', updated: '2026-06-28' },
]

export const FP_LIFECYCLE = {
  components: 6,
  needReplace: 2,
  avgLife: 221,
  degradationRate: 1.8,
  componentsList: [
    { id: 'c1', name: '主轴承', device: 'TC-06', used: 8200, remaining: 180, health: 62, action: '关注' },
    { id: 'c2', name: '热电偶 K03', device: 'TC-02', used: 5400, remaining: 45, health: 48, action: '更换' },
    { id: 'c3', name: '燃烧器喷嘴', device: 'TC-01', used: 3600, remaining: 320, health: 78, action: '正常' },
    { id: 'c4', name: '排烟风机叶轮', device: 'TC-04', used: 6100, remaining: 210, health: 71, action: '关注' },
    { id: 'c5', name: '耐火材料', device: 'TC-08', used: 2800, remaining: 480, health: 85, action: '正常' },
    { id: 'c6', name: '窑车轮对', device: 'TC-03', used: 7200, remaining: 90, health: 55, action: '更换' },
  ],
  factors: [
    { factor: '温度循环', desc: '频繁升降温加速金属疲劳', impact: 1.35 },
    { factor: '负载波动', desc: '过载运行缩短轴承寿命', impact: 1.28 },
    { factor: '润滑状态', desc: '润滑不良导致磨损加速', impact: 1.22 },
    { factor: '环境湿度', desc: '高湿加速电气腐蚀', impact: 1.15 },
  ],
}

export const FP_ALERTS = {
  rules: 4,
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
  rulesList: [
    { id: 'ar1', name: '轴承温度超限', condition: '≥ 85℃', level: 'critical', notify: '短信+企微', enabled: true },
    { id: 'ar2', name: '振动值异常', condition: '≥ 7.1 mm/s', level: 'high', notify: '企微', enabled: true },
    { id: 'ar3', name: '电流波动', condition: 'σ ≥ 15%', level: 'medium', notify: '邮件', enabled: true },
    { id: 'ar4', name: '热电偶漂移', condition: 'Δ ≥ 5℃/h', level: 'high', notify: '企微', enabled: false },
  ],
  recentAlerts: [
    { id: 'a1', message: 'TC-06 主轴承温度 88.2℃ 超限', device: 'TC-06', time: '14:32', level: 'critical', status: 'open' },
    { id: 'a2', message: 'TC-04 排烟风机振动 7.8 mm/s', device: 'TC-04', time: '13:18', level: 'high', status: 'open' },
    { id: 'a3', message: 'TC-03 电流波动 σ=18.3%', device: 'TC-03', time: '11:45', level: 'medium', status: 'resolved' },
    { id: 'a4', message: 'TC-08 轴承温度 86.5℃ 超限', device: 'TC-08', time: '10:02', level: 'critical', status: 'resolved' },
  ],
}

export const FP_DIAGNOSIS = {
  knowledgeNodes: 128,
  cases: 4,
  diagnoses: 23,
  accuracy: 91.5,
  casesList: [
    {
      id: 'c1',
      title: '主轴承磨损导致停机',
      similarity: 92,
      symptom: '振动上升 + 轴承温升',
      rootCause: '润滑不良 + 长期过载',
      solution: '更换轴承 + 修复润滑系统',
      date: '2026-05-12',
    },
    {
      id: 'c2',
      title: '热电偶漂移引发控温偏差',
      similarity: 85,
      symptom: '测点读数异常波动',
      rootCause: '保护管腐蚀',
      solution: '更换热电偶 + 标定',
      date: '2026-04-28',
    },
    {
      id: 'c3',
      title: '燃烧器熄火连锁跳停',
      similarity: 78,
      symptom: '火焰检测丢失',
      rootCause: '燃气压力波动',
      solution: '稳压阀检修',
      date: '2026-04-08',
    },
    {
      id: 'c4',
      title: '窑车卡滞无法进窑',
      similarity: 71,
      symptom: '驱动力矩超限',
      rootCause: '轨道变形',
      solution: '轨道校正 + 车轮更换',
      date: '2026-03-22',
    },
  ],
}

export const FP_MAINTENANCE = {
  monthlyOrders: 18,
  completed: 11,
  inProgress: 2,
  avgDuration: 4.6,
  orders: [
    {
      id: 'WO-2401',
      device: 'TC-06',
      equipment: 'TC-06',
      type: '预测性',
      content: '主轴承更换',
      planned: '2026-07-01',
      scheduled: '2026-07-01',
      assignee: '赵工',
      status: '待执行',
      cost: 12500,
    },
    {
      id: 'WO-2402',
      device: 'TC-04',
      equipment: 'TC-04',
      type: '预测性',
      content: '风机轴承更换',
      planned: '2026-07-10',
      scheduled: '2026-07-10',
      assignee: '钱工',
      status: '待执行',
      cost: 4800,
    },
    {
      id: 'WO-2403',
      device: 'TC-03',
      equipment: 'TC-03',
      type: '预防性',
      content: '窑车密封条更换',
      planned: '2026-07-15',
      scheduled: '2026-07-15',
      assignee: '孙工',
      status: '待执行',
      cost: 2200,
    },
    {
      id: 'WO-2404',
      device: 'TC-02',
      equipment: 'TC-02',
      type: '预测性',
      content: '热电偶 K03 更换',
      planned: '2026-07-05',
      scheduled: '2026-07-05',
      assignee: '李工',
      status: '执行中',
      cost: 900,
    },
    {
      id: 'WO-2405',
      device: 'TC-01',
      equipment: 'TC-01',
      type: '预防性',
      content: '燃烧器季度保养',
      planned: '2026-07-20',
      scheduled: '2026-07-20',
      assignee: '周工',
      status: '已完成',
      cost: 3500,
    },
  ],
}

export const FP_SPARES = {
  categories: 248,
  inStock: 186,
  lowStock: 42,
  forecast: 156,
  sparesList: [
    { id: 's1', name: '主轴承 6320', spec: '6320-2RS', stock: 8, safety: 4, monthly: 2, status: 'sufficient' },
    { id: 's2', name: '热电偶 K 型', spec: 'K-φ3×200', stock: 24, safety: 10, monthly: 4, status: 'sufficient' },
    { id: 's3', name: '燃烧器喷嘴', spec: 'DN25', stock: 3, safety: 6, monthly: 3, status: 'warning' },
    { id: 's4', name: '窑车轮对', spec: 'φ450', stock: 2, safety: 4, monthly: 1, status: 'warning' },
    { id: 's5', name: '耐火砖 (高铝)', spec: '230×114×65', stock: 480, safety: 200, monthly: 60, status: 'sufficient' },
    { id: 's6', name: '密封条', spec: 'φ20 硅胶', stock: 1, safety: 10, monthly: 5, status: 'low' },
  ],
  forecastData: [
    { month: '7月', predicted: 8, actual: 6 },
    { month: '8月', predicted: 10, actual: 9 },
    { month: '9月', predicted: 7, actual: 8 },
    { month: '10月', predicted: 12, actual: 11 },
  ],
}

export const FP_KNOWLEDGE = {
  fmeaItems: 128,
  cases: 342,
  sops: 86,
  expertContribs: 47,
  fmeaList: [
    { id: 'f1', mode: '主轴承失效', severity: 9, occurrence: 4, detection: 3, rpn: 108, cause: '润滑不良 / 长期过载 / 安装误差' },
    { id: 'f2', mode: '热电偶漂移', severity: 6, occurrence: 5, detection: 4, rpn: 120, cause: '保护管腐蚀 / 老化' },
    { id: 'f3', mode: '燃烧器熄火', severity: 8, occurrence: 3, detection: 5, rpn: 120, cause: '燃气压力波动 / 点火器故障' },
    { id: 'f4', mode: '窑车卡滞', severity: 7, occurrence: 4, detection: 4, rpn: 112, cause: '轨道变形 / 车轮磨损' },
    { id: 'f5', mode: '排烟风机振动', severity: 5, occurrence: 6, detection: 3, rpn: 90, cause: '叶片不平衡 / 轴承磨损' },
    { id: 'f6', mode: '耐火材料剥落', severity: 9, occurrence: 2, detection: 5, rpn: 90, cause: '热震 / 化学侵蚀' },
  ],
  sopList: [
    { id: 's1', title: '主轴承更换标准作业规程', category: '机械', steps: 18 },
    { id: 's2', title: '热电偶标定与更换规程', category: '仪表', steps: 12 },
    { id: 's3', title: '燃烧器季度保养规程', category: '燃烧', steps: 24 },
    { id: 's4', title: '窑车轨道校正规程', category: '机械', steps: 15 },
  ],
}

export const FP_REPORTS = {
  monthly: 18,
  autoGenerated: 14,
  avgGenTime: 12,
  downloads: 86,
  reportsList: [
    { id: 'r1', name: '6 月设备故障月报', type: '月报', generated: '2026-07-01 08:00', pages: 28, status: '已发布' },
    { id: 'r2', name: '第 26 周故障周报', type: '周报', generated: '2026-06-30 08:00', pages: 12, status: '已发布' },
    { id: 'r3', name: 'TC-06 轴承故障专项分析', type: '专项', generated: '2026-06-28 14:30', pages: 18, status: '已发布' },
    { id: 'r4', name: '6 月 29 日故障日报', type: '日报', generated: '2026-06-30 00:00', pages: 4, status: '已发布' },
    { id: 'r5', name: '6 月 28 日故障日报', type: '日报', generated: '2026-06-29 00:00', pages: 4, status: '已发布' },
  ],
}

// ============================================================
// 三、质量预测 QUALITY
// ============================================================

export interface QualityOverview {
  id: string
  metric: string
  value: number
  target: number
  unit: string
  status: '优' | '良' | '预警' | '异常'
}

export const QUALITY_OVERVIEW = {
  passRate: 96.8,
  alerts: 12,
  orders: 28,
  predAccuracy: 94.5,
  qualityScore: 92,
  tempDeviation: 2.3,
  trend: [
    { date: '2026-06-01', passRate: 95.2 },
    { date: '2026-06-02', passRate: 96.1 },
    { date: '2026-06-03', passRate: 95.8 },
    { date: '2026-06-04', passRate: 96.4 },
    { date: '2026-06-05', passRate: 96.8 },
    { date: '2026-06-06', passRate: 97.1 },
    { date: '2026-06-07', passRate: 96.5 },
    { date: '2026-06-08', passRate: 96.9 },
    { date: '2026-06-09', passRate: 97.2 },
    { date: '2026-06-10', passRate: 96.7 },
    { date: '2026-06-11', passRate: 96.3 },
    { date: '2026-06-12', passRate: 96.8 },
  ],
  alertSummary: [
    { type: '温度偏差', level: 'high', count: 3, furnace: 'TC-03' },
    { type: '空燃比异常', level: 'high', count: 2, furnace: 'TC-06' },
    { type: '保温时间不足', level: 'low', count: 4, furnace: 'TC-04' },
    { type: '升温速率过快', level: 'low', count: 3, furnace: 'TC-07' },
  ],
}

export interface QualityRealtime {
  furnace: string
  product: string
  position: number
  temperature: number
  targetTemp: number
  deviation: number
  predictedPass: number
  status: '正常' | '预警' | '异常'
}

export const QUALITY_REALTIME = [
  { orderId: 'ORD-001', risk: '低', predictedPassRate: 96.8, currentStage: '烧成' },
  { orderId: 'ORD-002', risk: '中', predictedPassRate: 92.3, currentStage: '保温' },
  { orderId: 'ORD-003', risk: '低', predictedPassRate: 97.5, currentStage: '冷却' },
  { orderId: 'ORD-004', risk: '高', predictedPassRate: 85.2, currentStage: '烧成' },
  { orderId: 'ORD-005', risk: '低', predictedPassRate: 98.1, currentStage: '预热' },
  { orderId: 'ORD-006', risk: '中', predictedPassRate: 91.8, currentStage: '保温' },
  { orderId: 'ORD-007', risk: '低', predictedPassRate: 96.2, currentStage: '烧成' },
  { orderId: 'ORD-008', risk: '低', predictedPassRate: 97.8, currentStage: '冷却' },
]

export interface QualityModel {
  id: string
  name: string
  type: string
  version: string
  accuracy: number
  f1Score: number
  trainedAt: string
  status: '生产中' | '灰度' | '训练中' | '已下线'
  samples: number
}

export const QUALITY_MODELS = [
  { id: 'm1', name: 'LSTM 温度预测', type: 'LSTM', accuracy: 96, status: '生产', version: 'v3.2' },
  { id: 'm2', name: 'XGBoost 成分预测', type: 'XGBoost', accuracy: 92, status: '生产', version: 'v2.1' },
  { id: 'm3', name: 'CNN 缺陷识别', type: 'CNN', accuracy: 94, status: '灰度', version: 'v1.5' },
  { id: 'm4', name: 'Transformer 质量预测', type: 'Transformer', accuracy: 97, status: '训练', version: 'v0.8' },
]

export interface QualityCorrelation {
  param: string
  quality: string
  coefficient: number
  pValue: number
  optimal: string
}

export const QUALITY_CORRELATIONS = [
  { id: 'c1', param: '烧成温度', target: '抗压强度', correlation: 0.88 },
  { id: 'c2', param: '保温时间', target: '抗压强度', correlation: 0.72 },
  { id: 'c3', param: '空燃比', target: '气孔率', correlation: -0.65 },
  { id: 'c4', param: '升温速率', target: '裂纹率', correlation: 0.58 },
  { id: 'c5', param: '冷却速率', target: '热震稳定性', correlation: -0.71 },
]

export interface QualityTrace {
  id: string
  batch: string
  product: string
  furnace: string
  operator: string
  rawMaterial: string
  firingTemp: number
  holdTime: number
  result: '合格' | '不合格'
  defect: string
  rootCause: string
}

export const QUALITY_TRACES = {
  items: [
    {
      id: 'qt1',
      product: '高铝砖 A1',
      batch: 'B20260628-01',
      testItem: '抗压强度',
      standard: '≥ 60MPa',
      actual: '62.5MPa',
      result: '合格',
      tester: '张工',
    },
    {
      id: 'qt2',
      product: '高铝砖 A1',
      batch: 'B20260628-01',
      testItem: '气孔率',
      standard: '≤ 20%',
      actual: '18.2%',
      result: '合格',
      tester: '张工',
    },
    {
      id: 'qt3',
      product: '莫来石砖 M2',
      batch: 'B20260628-02',
      testItem: '莫来石含量',
      standard: '≥ 70%',
      actual: '68.5%',
      result: '不合格',
      tester: '李工',
    },
    {
      id: 'qt4',
      product: '刚玉砖 G1',
      batch: 'B20260628-03',
      testItem: '体积密度',
      standard: '≥ 3.2g/cm³',
      actual: '3.28g/cm³',
      result: '合格',
      tester: '王工',
    },
  ],
}

export interface QualityAlert {
  id: string
  level: '严重' | '警告' | '提示'
  furnace: string
  content: string
  triggeredAt: string
  status: '待处理' | '处理中' | '已闭环'
}

export const QUALITY_ALERTS = {
  items: [
    {
      id: 'qa1',
      time: '14:32',
      product: '高铝砖 A1',
      batch: 'B20260628-01',
      type: '温度偏差',
      level: 'high',
      status: '待处理',
    },
    {
      id: 'qa2',
      time: '13:18',
      product: '莫来石砖 M2',
      batch: 'B20260628-02',
      type: '空燃比异常',
      level: 'high',
      status: '处理中',
    },
    {
      id: 'qa3',
      time: '11:45',
      product: '刚玉砖 G1',
      batch: 'B20260628-03',
      type: '升温过快',
      level: 'low',
      status: '已关闭',
    },
    {
      id: 'qa4',
      time: '10:02',
      product: '高铝砖 A1',
      batch: 'B20260628-01',
      type: '保温不足',
      level: 'low',
      status: '已关闭',
    },
  ],
}

export const QUALITY_PREDICTIONS = [
  { id: 'qp1', orderId: 'ORD-001', product: '高铝砖 A1', predictedPassRate: 96.8, risk: '低', currentStage: '烧成' },
  { id: 'qp2', orderId: 'ORD-002', product: '莫来石砖 M2', predictedPassRate: 92.3, risk: '中', currentStage: '保温' },
  { id: 'qp3', orderId: 'ORD-003', product: '刚玉砖 G1', predictedPassRate: 97.5, risk: '低', currentStage: '冷却' },
  { id: 'qp4', orderId: 'ORD-004', product: '高铝砖 A1', predictedPassRate: 85.2, risk: '高', currentStage: '烧成' },
  { id: 'qp5', orderId: 'ORD-005', product: '莫来石砖 M2', predictedPassRate: 98.1, risk: '低', currentStage: '预热' },
  { id: 'qp6', orderId: 'ORD-006', product: '刚玉砖 G1', predictedPassRate: 91.8, risk: '中', currentStage: '保温' },
]

export const QUALITY_REPORTS = {
  items: [
    { id: 'qr1', title: '6 月质量月报', type: '月报', generated: '2026-07-01 08:00', pages: 32, status: '已发布' },
    { id: 'qr2', title: '第 26 周质量周报', type: '周报', generated: '2026-06-30 08:00', pages: 16, status: '已发布' },
    { id: 'qr3', title: '高铝砖 A1 质量专项分析', type: '专项', generated: '2026-06-28 14:30', pages: 22, status: '已发布' },
    { id: 'qr4', title: '6 月 29 日质量日报', type: '日报', generated: '2026-06-30 00:00', pages: 6, status: '已发布' },
  ],
}

export const QUALITY_STANDARDS = {
  items: [
    {
      id: 'qs1',
      name: '高铝砖质量标准',
      code: 'GB/T 2992-2018',
      product: '高铝砖 A1',
      criteria: 'Al₂O₃ ≥ 75%, 抗压强度 ≥ 60MPa',
      status: '生效',
    },
    {
      id: 'qs2',
      name: '莫来石砖质量标准',
      code: 'GB/T 2993-2018',
      product: '莫来石砖 M2',
      criteria: '莫来石含量 ≥ 70%, 气孔率 ≤ 18%',
      status: '生效',
    },
    {
      id: 'qs3',
      name: '刚玉砖质量标准',
      code: 'GB/T 2994-2018',
      product: '刚玉砖 G1',
      criteria: 'Al₂O₃ ≥ 90%, 体积密度 ≥ 3.2g/cm³',
      status: '生效',
    },
    {
      id: 'qs4',
      name: '碳化硅砖质量标准',
      code: 'GB/T 2995-2018',
      product: '碳化硅砖 S1',
      criteria: 'SiC ≥ 88%, 导热系数 ≥ 25W/(m·K)',
      status: '草稿',
    },
  ],
}

export const QUALITY_TEST_DATA = {
  items: [
    {
      id: 'qt1',
      product: '高铝砖 A1',
      batch: 'B20260628-01',
      testItem: '抗压强度',
      standard: '≥ 60MPa',
      actual: '62.5MPa',
      result: '合格',
      tester: '张工',
    },
    {
      id: 'qt2',
      product: '高铝砖 A1',
      batch: 'B20260628-01',
      testItem: '气孔率',
      standard: '≤ 20%',
      actual: '18.2%',
      result: '合格',
      tester: '张工',
    },
    {
      id: 'qt3',
      product: '莫来石砖 M2',
      batch: 'B20260628-02',
      testItem: '莫来石含量',
      standard: '≥ 70%',
      actual: '68.5%',
      result: '不合格',
      tester: '李工',
    },
    {
      id: 'qt4',
      product: '刚玉砖 G1',
      batch: 'B20260628-03',
      testItem: '体积密度',
      standard: '≥ 3.2g/cm³',
      actual: '3.28g/cm³',
      result: '合格',
      tester: '王工',
    },
  ],
}
