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
  '/model-manage': () => import('@/views/ModelManageView.vue'),
  '/prompt-manage': () => import('@/views/PromptManageView.vue'),
  '/mcp-manage': () => import('@/views/McpManageView.vue'),
  '/knowledge': () => import('@/views/KnowledgeListView.vue'),
  '/data-collect': () => import('@/views/DataCollectView.vue'),
  '/data-governance': () => import('@/views/DataGovernanceView.vue'),
  '/decision-flow': () => import('@/views/DecisionFlowView.vue'),
  '/production/tunnel': () => import('@/views/ProductionScadaView.vue'),
  '/production/batching': () => import('@/views/ProductionScadaView.vue'),
  '/production/shuttle': () => import('@/views/ProductionScadaView.vue'),
  '/furnaces': () => import('@/views/FurnacesView.vue'),
  '/devices': () => import('@/views/DevicesView.vue'),
  '/users': () => import('@/views/UsersView.vue'),
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
  const title = (to.meta.title as string | undefined) || '中机六院设备能碳'
  document.title = `${title} · 中机六院设备能碳`

  useMobileMenuStore().close()

  if (to.path !== '/login') {
    const tabs = useTabsStore()
    const label = (to.meta.title as string | undefined) || undefined
    tabs.ensureTab(to.path, label)
  }
})

export default router
