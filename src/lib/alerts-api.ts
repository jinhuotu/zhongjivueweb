import { apiRequest } from './api'
import { getAccessToken } from './auth'

function requireToken(): string {
  const token = getAccessToken()
  if (!token) throw new Error('请先登录')
  return token
}

export type AlertItem = {
  id: string
  severity: 'high' | 'medium' | 'low'
  target: string
  title: string
  rule: string
  occurred: string
  status: 'active' | 'ack' | 'closed'
  owner: string
  type?: string
  message?: string | null
}

export type AlertTypeDist = { name: string; value: number; color?: string }

export type AlertSummary = {
  monthlyTriggered: number
  highCount: number
  avgResponseMinutes: number
  mttrMinutes: number
  activeCount: number
  ackCount: number
  typeDist: AlertTypeDist[]
}

export type AlertRuleItem = {
  id: string
  name: string
  type: string
  expression: string
  threshold: string
  channels: string
  devices: string
  enabled: boolean
}

export async function fetchAlerts(params?: {
  status?: string
  severity?: string
  limit?: number
}): Promise<{ items: AlertItem[]; summary: AlertSummary }> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.severity) q.set('severity', params.severity)
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString()
  return apiRequest(`/api/v1/alerts${qs ? `?${qs}` : ''}`, {
    token: requireToken(),
  })
}

export async function fetchAlertRules(): Promise<AlertRuleItem[]> {
  const data = await apiRequest<{ items: AlertRuleItem[] }>('/api/v1/alerts/rules', {
    token: requireToken(),
  })
  return data.items || []
}

export async function ackAlert(id: string): Promise<AlertItem> {
  const data = await apiRequest<{ item: AlertItem }>(`/api/v1/alerts/${id}/ack`, {
    method: 'POST',
    token: requireToken(),
  })
  return data.item
}

export async function closeAlert(id: string): Promise<AlertItem> {
  const data = await apiRequest<{ item: AlertItem }>(`/api/v1/alerts/${id}/close`, {
    method: 'POST',
    token: requireToken(),
  })
  return data.item
}
