// ============================================================================
// 【中文注解】src/stores/auth.ts | 全局登录态(pinia)：user/isAdmin/menus+守卫依据
// - bootstrap()：有token就fetchMe恢复，无则直接空；失败自动refresh再试一次。
// - 详见 overview-api.ts 头部合注；后端对应 GET /auth/me(含menus并集)。
// - 只加注释，未改逻辑。
// ============================================================================
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  type AuthUser,
  fetchMe,
  getAccessToken,
  login as apiLogin,
  logout as apiLogout,
  refreshTokens,
} from '@/lib/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loading = ref(true)

  const isAdmin = computed(() =>
    Boolean(user.value?.is_superuser || user.value?.roles?.includes('admin')),
  )

  const menus = computed(() => user.value?.menus ?? [])

  async function bootstrap() {
    const token = getAccessToken()
    if (!token) {
      user.value = null
      loading.value = false
      return
    }
    try {
      user.value = await fetchMe()
    } catch {
      const refreshed = await refreshTokens()
      user.value = refreshed?.user ?? null
    } finally {
      loading.value = false
    }
  }

  async function login(username: string, password: string) {
    const result = await apiLogin(username, password)
    user.value = result.user
  }

  function logout() {
    apiLogout()
    user.value = null
  }

  return { user, loading, isAdmin, menus, bootstrap, login, logout }
})
