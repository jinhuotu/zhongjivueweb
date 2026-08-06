export type ApiEnvelope<T> = {
  code: number
  msg: string
  data: T
}

const DEFAULT_BASE = 'http://127.0.0.1:8000'

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')
}

export class ApiError extends Error {
  code: number
  status: number

  constructor(message: string, code: number, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
  signal?: AbortSignal
  /** internal: already retried after token refresh */
  _retry?: boolean
}

function friendlyMessage(status: number, msg?: string): string {
  if (status === 401) {
    return '登录已过期或未登录，请重新登录后再试'
  }
  if (status === 403) {
    return '没有权限执行此操作'
  }
  if (status === 0 || status >= 500) {
    return msg || '服务暂时不可用，请稍后重试'
  }
  return msg || '请求失败'
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, token, signal, _retry } = options
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch {
    throw new ApiError('无法连接后端服务，请确认 API 已启动', -1, 0)
  }

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await res.json()) as ApiEnvelope<T>
  } catch {
    throw new ApiError(friendlyMessage(res.status, res.statusText), -1, res.status)
  }

  const isAuthEndpoint =
    path.includes('/auth/login') || path.includes('/auth/refresh')
  if (
    res.status === 401 &&
    !_retry &&
    !isAuthEndpoint &&
    Boolean(token)
  ) {
    const { refreshTokens, getAccessToken, clearTokens } = await import('./auth')
    const refreshed = await refreshTokens()
    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        token: getAccessToken(),
        _retry: true,
      })
    }
    clearTokens()
    throw new ApiError(friendlyMessage(401, payload.msg), payload.code ?? 40100, 401)
  }

  if (!res.ok || payload.code !== 0) {
    throw new ApiError(
      friendlyMessage(res.status, payload.msg),
      payload.code ?? -1,
      res.status,
    )
  }
  return payload.data
}
