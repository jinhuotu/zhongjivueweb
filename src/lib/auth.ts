// ============================================================================
// 【中文注解】src/lib/auth.ts | Token存取+登录/刷新/取我（localStorage持久登录）
// - ACCESS/REFRESH_KEY：localStorage键名，后端login下发后setTokens存入。
// - login()：POST /auth/login，成功自动存双token；fetchMe()：GET /auth/me恢复用户+menus。
// - refreshTokens()：用refresh换新对+重新fetchMe，失败清掉(踢回登录)；api.ts401时被调用。
// - logout()：仅清本地，前端路由守卫会跳/login。后端refresh不查库故无失效接口。
// - 只加注释，未改逻辑。
// ============================================================================
import { apiRequest } from './api'

const ACCESS_KEY = 'zhongji_access_token'
const REFRESH_KEY = 'zhongji_refresh_token'

export type AuthUser = {
  id: number
  username: string
  display_name: string | null
  email: string | null
  is_superuser: boolean
  roles: string[]
  /** 后端下发的可访问菜单 href；缺省时前端仅按 adminOnly 过滤 */
  menus?: string[]
}

export type LoginResult = {
  access_token: string
  refresh_token: string
  token_type: string
  user: AuthUser
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const data = await apiRequest<LoginResult>('/api/v1/auth/login', {
    method: 'POST',
    body: { username, password },
  })
  setTokens(data.access_token, data.refresh_token)
  return data
}

export async function fetchMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/v1/auth/me', {
    token: getAccessToken(),
  })
}

export async function refreshTokens(): Promise<LoginResult | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  try {
    const data = await apiRequest<Omit<LoginResult, 'user'> & { user?: AuthUser }>(
      '/api/v1/auth/refresh',
      {
        method: 'POST',
        body: { refresh_token: refresh },
      },
    )
    setTokens(data.access_token, data.refresh_token)
    const user = await fetchMe()
    return { ...data, user, token_type: data.token_type || 'bearer' }
  } catch {
    clearTokens()
    return null
  }
}

export function logout(): void {
  clearTokens()
}
