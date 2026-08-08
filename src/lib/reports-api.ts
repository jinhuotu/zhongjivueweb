import { apiDownload, apiRequest } from './api'
import { getAccessToken } from './auth'

function requireToken(): string {
  const token = getAccessToken()
  if (!token) throw new Error('请先登录')
  return token
}

export type BizReportItem = {
  id: string
  title: string
  type: string
  period: string
  size: string
  createdBy: string
  createdAt: string
  status: 'ready' | 'generating' | 'pending_review' | 'failed'
  templateKey?: string | null
  content?: string
}

export type BizReportSummary = {
  totalCount: number
  monthGenerated: number
  pendingReview: number
  automationCoverage: number
}

export type BizReportTemplate = {
  key: string
  name: string
  desc: string
  icon: string
  type: string
}

export async function fetchReportTemplates(): Promise<BizReportTemplate[]> {
  const data = await apiRequest<{ items: BizReportTemplate[] }>('/api/v1/reports/templates', {
    token: requireToken(),
  })
  return data.items || []
}

export async function fetchBizReports(params?: {
  type?: string
  status?: string
  limit?: number
}): Promise<{ items: BizReportItem[]; summary: BizReportSummary }> {
  const q = new URLSearchParams()
  if (params?.type) q.set('type', params.type)
  if (params?.status) q.set('status', params.status)
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString()
  return apiRequest(`/api/v1/reports${qs ? `?${qs}` : ''}`, {
    token: requireToken(),
  })
}

export async function generateBizReport(body: {
  templateKey?: string
  templateName?: string
  type?: string
  period?: string
}): Promise<BizReportItem> {
  const data = await apiRequest<{ item: BizReportItem }>('/api/v1/reports/generate', {
    method: 'POST',
    body,
    token: requireToken(),
  })
  return data.item
}

export async function fetchBizReport(id: string): Promise<BizReportItem> {
  const data = await apiRequest<{ item: BizReportItem }>(`/api/v1/reports/${id}`, {
    token: requireToken(),
  })
  return data.item
}

export async function downloadBizReport(id: string, filename?: string): Promise<void> {
  await apiDownload(`/api/v1/reports/${id}/download`, {
    token: requireToken(),
    fallbackName: filename || 'report.md',
  })
}
