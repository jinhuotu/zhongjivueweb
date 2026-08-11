import type { Component } from 'vue'
import {
  LayoutDashboard,
  Flame,
  Zap,
  CloudCog,
  ShieldCheck,
  Coins,
  FileChartColumn,
  Sparkles,
  Cpu,
  Bell,
  Users,
  Settings,
  Activity,
  LibraryBig,
  BotMessageSquare,
  FileSearch,
  Workflow,
  Database,
  Boxes,
  PackageOpen,
  Waypoints,
  Wallet,
  ClipboardCheck,
  Footprints,
  Truck,
  BadgeCheck,
  CalendarRange,
  ClipboardList,
  LayoutGrid,
  FlameKindling,
  PackagePlus,
  Gauge,
  PackageSearch,
  Brain,
  LeafyGreen,
  Siren,
  PlaySquare,
  Trophy,
  Eye,
  ScanEye,
  ScanLine,
  FlaskConical,
  GitCompareArrows,
  GitBranch,
  AlertTriangle,
  FileText,
  Scale,
  Microscope,
  HeartPulse,
  Radio,
  Wrench,
  Stethoscope,
  LifeBuoy,
  BookOpenText,
  BarChart3,
  Plug,
  Bot,
  CalendarClock,
  ShoppingCart,
  Warehouse,
  Search,
  Camera,
  GitBranchPlus,
  RefreshCcw,
} from 'lucide-vue-next'

export type NavItem = {
  href: string
  label: string
  icon: Component
  adminOnly?: boolean
  /** 若设置，仅当用户 menus 包含该 href（或管理员）时可见；未设置则按 adminOnly / menus 通用规则 */
  requireMenu?: boolean
}

export type NavChild = {
  key: string
  label: string
  items: NavItem[]
}

export type NavGroup = {
  title: string
  icon: Component
  items?: NavItem[]
  children?: NavChild[]
}

function canSeeNavItem(
  it: NavItem,
  admin: boolean,
  menus: string[] | null | undefined,
): boolean {
  if (it.adminOnly && !admin) return false
  // menus 为空：兼容旧登录态，仅按 adminOnly
  if (!menus || menus.length === 0) return true
  return menus.includes(it.href)
}

export function filterNavGroups(
  groups: NavGroup[],
  admin: boolean,
  menus?: string[] | null,
): NavGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items?.filter((it) => canSeeNavItem(it, admin, menus)),
      children: g.children?.map((c) => ({
        ...c,
        items: c.items.filter((it) => canSeeNavItem(it, admin, menus)),
      })),
    }))
    .filter(
      (g) =>
        (g.items && g.items.length > 0) ||
        (g.children && g.children.some((c) => c.items.length > 0)),
    )
}

/** 路由守卫：根据 nav 配置判断是否 adminOnly */
export function isAdminOnlyPath(path: string): boolean {
  return flattenNavItems().some((it) => it.href === path && Boolean(it.adminOnly))
}

export function canAccessPath(
  path: string,
  admin: boolean,
  menus?: string[] | null,
): boolean {
  if (admin) return true
  // /workflows/:id 等：父级 adminOnly 时非管理员不可进
  const adminParent = flattenNavItems().find(
    (it) =>
      Boolean(it.adminOnly) &&
      (path === it.href || (it.href !== '/' && path.startsWith(`${it.href}/`))),
  )
  if (adminParent) return false

  const exact = flattenNavItems().find((it) => it.href === path)
  if (exact) return canSeeNavItem(exact, admin, menus)
  // 详情页前缀
  if (!menus || menus.length === 0) return true
  return menus.some((m) => m !== '/' && (path === m || path.startsWith(`${m}/`)))
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: '态势',
    icon: LayoutDashboard,
    items: [
      { href: '/', label: '能碳总览', icon: LayoutDashboard },
      { href: '/realtime', label: '实时态势', icon: Activity },
    ],
  },
  {
    title: 'AI 智控',
    icon: BotMessageSquare,
    items: [
      { href: '/ai-chat', label: 'AI 智能问答', icon: BotMessageSquare },
      { href: '/ai-reports', label: 'AI 智能报告', icon: FileSearch },
      { href: '/scene-agents', label: '场景智能体', icon: Sparkles, adminOnly: true },
      { href: '/workflows', label: '工作流', icon: Workflow, adminOnly: true },
      { href: '/model-manage', label: '模型管理', icon: Boxes, adminOnly: true },
      { href: '/prompt-manage', label: '提示词管理', icon: BookOpenText, adminOnly: true },
      { href: '/mcp-manage', label: '工具管理', icon: Plug, adminOnly: true },
      { href: '/knowledge', label: '知识库', icon: LibraryBig },
    ],
  },
  {
    title: '智能体',
    icon: Bot,
    children: [
      {
        key: 'agents-core',
        label: '核心智能体',
        items: [
          { href: '/agents/plan', label: '计划智能体', icon: CalendarClock },
          { href: '/agents/procurement', label: '采购智能体', icon: ShoppingCart },
          { href: '/agents/warehouse', label: '仓储智能体', icon: Warehouse },
          { href: '/agents/quality-trace', label: '质量追溯智能体', icon: Search },
          { href: '/agents/vision-inspection', label: '视觉质检智能体', icon: Camera },
          { href: '/agents/root-cause', label: '根因分析智能体', icon: GitBranchPlus },
          {
            href: '/agents/quality-closed',
            label: '质量闭环管理智能体',
            icon: RefreshCcw,
          },
        ],
      },
      {
        key: 'agents-ops',
        label: '运维后台',
        items: [
          {
            href: '/agents/ops-workflow',
            label: '全量工作流管理',
            icon: Workflow,
          },
        ],
      },
    ],
  },
  {
    title: '数据中台',
    icon: Database,
    items: [
      { href: '/data-collect', label: '低代码采集', icon: Workflow },
      { href: '/data-governance', label: '数据治理', icon: Database },
    ],
  },
  {
    title: '决策分析',
    icon: Boxes,
    items: [
      { href: '/decision-flow', label: '低代码决策分析', icon: Boxes },
      { href: '/model-package', label: '模型封装导出', icon: PackageOpen },
    ],
  },
  {
    title: '生产侧',
    icon: Flame,
    items: [
      { href: '/production/tunnel', label: '隧道窑管理', icon: Flame },
      { href: '/production/batching', label: '配料管理', icon: Boxes },
      { href: '/production/shuttle', label: '梭式窑烟气', icon: CloudCog },
      { href: '/furnaces', label: '车式窑监控', icon: Flame },
      { href: '/devices', label: '设备资产', icon: Cpu },
    ],
  },
  {
    title: '能耗',
    icon: Zap,
    items: [
      { href: '/energy', label: '能耗分析 & 对标', icon: Zap },
      { href: '/energy-flow', label: '能流分析 · 桑基图', icon: Waypoints },
      { href: '/optimization', label: '节能优化', icon: Sparkles },
      { href: '/budget', label: '用能 & 碳预算', icon: Wallet },
    ],
  },
  {
    title: '碳侧',
    icon: CloudCog,
    items: [
      { href: '/carbon', label: '碳排核算', icon: CloudCog },
      { href: '/verification', label: '碳核查支撑 MRV', icon: ClipboardCheck },
      { href: '/product-footprint', label: '产品碳足迹 LCA', icon: Footprints },
      { href: '/supply-chain', label: '供应链碳管理', icon: Truck },
      { href: '/carbon-asset', label: '碳资产管理', icon: BadgeCheck },
      { href: '/carbon-market', label: '碳市场 & 绿电', icon: Coins },
      { href: '/policy', label: '政策合规', icon: ShieldCheck },
    ],
  },
  {
    title: 'APS 排程',
    icon: CalendarRange,
    children: [
      {
        key: 'plan',
        label: '计划层',
        items: [
          { href: '/aps/orders', label: '生产订单管理', icon: ClipboardList },
          { href: '/aps/mps', label: '主生产计划 MPS', icon: CalendarRange },
          { href: '/aps/overview', label: '排程总览', icon: LayoutGrid },
        ],
      },
      {
        key: 'schedule',
        label: '排程层',
        items: [
          { href: '/aps/furnace-schedule', label: '窑炉排程', icon: FlameKindling },
          { href: '/aps/loading', label: '装窑优化', icon: PackagePlus },
          { href: '/aps/capacity', label: '产能管理与平衡', icon: Gauge },
          { href: '/aps/material', label: '物料齐套排程', icon: PackageSearch },
        ],
      },
      {
        key: 'smart',
        label: '智能层',
        items: [
          { href: '/aps/optimization', label: '排程优化与决策', icon: Brain },
          { href: '/aps/energy-schedule', label: '能耗排程协同', icon: LeafyGreen },
          { href: '/aps/emergency', label: '插单与紧急排程', icon: Siren },
        ],
      },
      {
        key: 'execute',
        label: '执行层',
        items: [
          { href: '/aps/execution', label: '排程执行跟踪', icon: PlaySquare },
          { href: '/aps/performance', label: '排程绩效分析', icon: Trophy },
        ],
      },
    ],
  },
  {
    title: '质量预测',
    icon: Eye,
    children: [
      {
        key: 'sense',
        label: '感知层',
        items: [
          { href: '/quality/overview', label: '质量数据总览', icon: Eye },
          { href: '/quality/realtime', label: '实时质量监控', icon: ScanEye },
        ],
      },
      {
        key: 'analyze',
        label: '分析层',
        items: [
          { href: '/quality/prediction', label: '质量预测分析', icon: ScanLine },
          { href: '/quality/models', label: '预测模型管理', icon: FlaskConical },
          { href: '/quality/correlation', label: '工艺参数关联', icon: GitCompareArrows },
          { href: '/quality/trace', label: '质量追溯分析', icon: GitBranch },
        ],
      },
      {
        key: 'manage',
        label: '管理层',
        items: [
          { href: '/quality/alert', label: '质量预警管理', icon: AlertTriangle },
          { href: '/quality/report', label: '质量报告中心', icon: FileText },
          { href: '/quality/standard', label: '质量标准管理', icon: Scale },
          { href: '/quality/test-data', label: '质量检测数据', icon: Microscope },
        ],
      },
    ],
  },
  {
    title: '故障预测',
    icon: HeartPulse,
    children: [
      {
        key: 'sense',
        label: '感知层',
        items: [
          { href: '/fault/overview', label: '设备健康总览', icon: HeartPulse },
          { href: '/fault/realtime', label: '实时状态监控', icon: Radio },
          { href: '/fault/collection', label: '采集与特征工程', icon: ScanLine },
        ],
      },
      {
        key: 'predict',
        label: '预测层',
        items: [
          { href: '/fault/prediction', label: '故障预测分析', icon: Stethoscope },
          { href: '/fault/models', label: '预测模型管理', icon: FlaskConical },
          { href: '/fault/lifecycle', label: '寿命与劣化管理', icon: LifeBuoy },
        ],
      },
      {
        key: 'respond',
        label: '响应层',
        items: [
          { href: '/fault/alerts', label: '故障预警管理', icon: Siren },
          { href: '/fault/diagnosis', label: '故障诊断根因', icon: Wrench },
          { href: '/fault/maintenance', label: '预测性维护计划', icon: ClipboardList },
          { href: '/fault/spares', label: '备件与资源管理', icon: PackageSearch },
        ],
      },
      {
        key: 'settle',
        label: '沉淀层',
        items: [
          { href: '/fault/knowledge', label: '故障知识库', icon: BookOpenText },
          { href: '/fault/reports', label: '故障统计报告', icon: BarChart3 },
        ],
      },
    ],
  },
  {
    title: '运营',
    icon: Settings,
    items: [
      { href: '/reports', label: '统计报表', icon: FileChartColumn },
      { href: '/alerts', label: '告警中心', icon: Bell },
      { href: '/users', label: '用户与权限', icon: Users, adminOnly: true },
      { href: '/settings', label: '系统设置', icon: Settings },
    ],
  },
]

/** 扁平化所有导航项，用于路由 meta 标题查找 */
export function flattenNavItems(groups: NavGroup[] = NAV_GROUPS): NavItem[] {
  return groups.flatMap((g) =>
    g.items ? [...g.items] : (g.children || []).flatMap((c) => c.items),
  )
}
