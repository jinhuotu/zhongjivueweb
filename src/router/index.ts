import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'
import { flattenNavItems } from '@/config/nav'
import { useAuthStore } from '@/stores/auth'
import { useMobileMenuStore } from '@/stores/mobile-menu'
import { useTabsStore } from '@/stores/tabs'

const PlaceholderView = () => import('@/views/PlaceholderView.vue')
const LoginView = () => import('@/views/LoginView.vue')
const AppShell = () => import('@/layouts/AppShell.vue')

/** 已迁移页面：path → 懒加载组件 */
const MIGRATED_VIEWS: Record<string, () => Promise<{ default: Component }>> = {
  '/': () => import('@/views/OverviewView.vue'),
  '/realtime': () => import('@/views/RealtimeView.vue'),
  '/ai-chat': () => import('@/views/AiChatView.vue'),
  '/ai-reports': () => import('@/views/AiReportsView.vue'),
  '/scene-agents': () => import('@/views/SceneAgentsView.vue'),
  '/model-manage': () => import('@/views/ModelManageView.vue'),
  '/prompt-manage': () => import('@/views/PromptManageView.vue'),
  '/mcp-manage': () => import('@/views/McpManageView.vue'),
  '/knowledge': () => import('@/views/KnowledgeListView.vue'),
  '/data-collect': () => import('@/views/DataCollectView.vue'),
  '/data-governance': () => import('@/views/DataGovernanceView.vue'),
  '/decision-flow': () => import('@/views/DecisionFlowView.vue'),
  '/model-package': () => import('@/views/ModelPackageView.vue'),
  '/energy': () => import('@/views/EnergyView.vue'),
  '/energy-flow': () => import('@/views/EnergyFlowView.vue'),
  '/optimization': () => import('@/views/OptimizationView.vue'),
  '/budget': () => import('@/views/BudgetView.vue'),
  '/carbon': () => import('@/views/CarbonView.vue'),
  '/verification': () => import('@/views/VerificationView.vue'),
  '/product-footprint': () => import('@/views/ProductFootprintView.vue'),
  '/supply-chain': () => import('@/views/SupplyChainView.vue'),
  '/carbon-asset': () => import('@/views/CarbonAssetView.vue'),
  '/carbon-market': () => import('@/views/CarbonMarketView.vue'),
  '/policy': () => import('@/views/PolicyView.vue'),
  '/aps/orders': () => import('@/views/aps/ApsOrdersView.vue'),
  '/aps/mps': () => import('@/views/aps/ApsMpsView.vue'),
  '/aps/overview': () => import('@/views/aps/ApsOverviewView.vue'),
  '/aps/furnace-schedule': () => import('@/views/aps/ApsFurnaceScheduleView.vue'),
  '/aps/loading': () => import('@/views/aps/ApsLoadingView.vue'),
  '/aps/capacity': () => import('@/views/aps/ApsCapacityView.vue'),
  '/aps/material': () => import('@/views/aps/ApsMaterialView.vue'),
  '/aps/optimization': () => import('@/views/aps/ApsOptimizationView.vue'),
  '/aps/energy-schedule': () => import('@/views/aps/ApsEnergyScheduleView.vue'),
  '/aps/emergency': () => import('@/views/aps/ApsEmergencyView.vue'),
  '/aps/execution': () => import('@/views/aps/ApsExecutionView.vue'),
  '/aps/performance': () => import('@/views/aps/ApsPerformanceView.vue'),
  '/quality/overview': () => import('@/views/quality/QualityOverviewView.vue'),
  '/quality/realtime': () => import('@/views/quality/QualityRealtimeView.vue'),
  '/quality/prediction': () => import('@/views/quality/QualityPredictionView.vue'),
  '/quality/models': () => import('@/views/quality/QualityModelsView.vue'),
  '/quality/correlation': () => import('@/views/quality/QualityCorrelationView.vue'),
  '/quality/trace': () => import('@/views/quality/QualityTraceView.vue'),
  '/quality/alert': () => import('@/views/quality/QualityAlertView.vue'),
  '/quality/report': () => import('@/views/quality/QualityReportView.vue'),
  '/quality/standard': () => import('@/views/quality/QualityStandardView.vue'),
  '/quality/test-data': () => import('@/views/quality/QualityTestDataView.vue'),
  '/fault/overview': () => import('@/views/fault/FaultOverviewView.vue'),
  '/fault/realtime': () => import('@/views/fault/FaultRealtimeView.vue'),
  '/fault/collection': () => import('@/views/fault/FaultCollectionView.vue'),
  '/fault/prediction': () => import('@/views/fault/FaultPredictionView.vue'),
  '/fault/models': () => import('@/views/fault/FaultModelsView.vue'),
  '/fault/lifecycle': () => import('@/views/fault/FaultLifecycleView.vue'),
  '/fault/alerts': () => import('@/views/fault/FaultAlertsView.vue'),
  '/fault/diagnosis': () => import('@/views/fault/FaultDiagnosisView.vue'),
  '/fault/maintenance': () => import('@/views/fault/FaultMaintenanceView.vue'),
  '/fault/spares': () => import('@/views/fault/FaultSparesView.vue'),
  '/fault/knowledge': () => import('@/views/fault/FaultKnowledgeView.vue'),
  '/fault/reports': () => import('@/views/fault/FaultReportsView.vue'),
  '/agents/plan': () => import('@/views/agents/PlanAgentView.vue'),
  '/agents/procurement': () => import('@/views/agents/ProcurementAgentView.vue'),
  '/agents/warehouse': () => import('@/views/agents/WarehouseAgentView.vue'),
  '/agents/quality-trace': () => import('@/views/agents/QualityTraceAgentView.vue'),
  '/agents/vision-inspection': () =>
    import('@/views/agents/VisionInspectionAgentView.vue'),
  '/agents/root-cause': () => import('@/views/agents/RootCauseAgentView.vue'),
  '/agents/quality-closed': () =>
    import('@/views/agents/QualityClosedAgentView.vue'),
  '/agents/ops-workflow': () => import('@/views/agents/OpsWorkflowView.vue'),
  '/production/tunnel': () => import('@/views/ProductionScadaView.vue'),
  '/production/batching': () => import('@/views/ProductionScadaView.vue'),
  '/production/shuttle': () => import('@/views/ProductionScadaView.vue'),
  '/furnaces': () => import('@/views/FurnacesView.vue'),
  '/devices': () => import('@/views/DevicesView.vue'),
  '/reports': () => import('@/views/ReportsView.vue'),
  '/alerts': () => import('@/views/AlertsView.vue'),
  '/users': () => import('@/views/UsersView.vue'),
  '/settings': () => import('@/views/SettingsView.vue'),
}

function buildFeatureRoutes(): RouteRecordRaw[] {
  const items = flattenNavItems()
  const seen = new Set<string>()
  const routes: RouteRecordRaw[] = []

  for (const item of items) {
    if (seen.has(item.href)) continue
    seen.add(item.href)
    const path = item.href === '/' ? '' : item.href.replace(/^\//, '')
    const component = MIGRATED_VIEWS[item.href] || PlaceholderView
    routes.push({
      path,
      name: item.href === '/' ? 'overview' : item.href.slice(1).replace(/\//g, '-'),
      component,
      meta: { title: item.label },
      ...(item.href.startsWith('/production/')
        ? { props: { system: item.href.split('/').pop() } }
        : {}),
    })
  }

  routes.push(
    {
      path: 'knowledge/:baseId',
      name: 'knowledge-detail',
      component: () => import('@/views/KnowledgeDetailView.vue'),
      meta: { title: '知识库详情' },
    },
    {
      path: 'production/:system',
      name: 'production-system',
      component: () => import('@/views/ProductionScadaView.vue'),
      meta: { title: '生产系统' },
    },
  )

  return routes
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true, title: '登录' },
    },
    {
      path: '/',
      component: AppShell,
      children: buildFeatureRoutes(),
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.loading) {
    await auth.bootstrap()
  }

  const isPublic = Boolean(to.meta.public)
  if (!auth.user && !isPublic) {
    return {
      path: '/login',
      query: { next: to.fullPath },
    }
  }
  if (auth.user && isPublic) {
    return { path: '/' }
  }
  return true
})

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) || '优祺智能'
  document.title = `${title} · 优祺智能`

  useMobileMenuStore().close()

  if (to.path !== '/login') {
    const tabs = useTabsStore()
    const label = (to.meta.title as string | undefined) || undefined
    tabs.ensureTab(to.path, label)
  }
})

export default router
