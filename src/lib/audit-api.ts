import { apiDownload, apiRequest } from './api'
import { getAccessToken } from './auth'

function requireToken(): string {
  const token = getAccessToken()
  if (!token) throw new Error('请先登录')
  return token
}

export type AuditSummary = {
  retentionDays: number
  traceRetentionDays: number
  cutoffAt: number
  traceCutoffAt: number
  operationTotal: number
  operationFail: number
  loginTotal: number
  loginFail: number
  knowledgeTotal: number
  queryTotal: number
  chatSessionTotal: number
  hotConfigTotal: number
}

export type OperationLogItem = {
  id: number
  module: string
  action: string
  method: string
  path: string
  resourceId: string | null
  operatorId: number | null
  operatorUsername: string | null
  success: boolean
  statusCode: number
  ip: string
  userAgent: string
  detail: string | null
  errorMsg: string | null
  durationMs: number
  requestId: string
  createdAt: number
}

export type LoginLogItem = {
  id: number
  username: string
  userId: number | null
  success: boolean
  reason: string
  ip: string
  userAgent: string
  createdAt: number
}

export type AuditList<T> = {
  items: T[]
  total: number
  retentionDays?: number
  traceRetentionDays?: number
  cutoffAt?: number
}

export type KnowledgeAuditItem = {
  id: number
  action: string
  baseId: string | null
  docId: string | null
  operatorId: number | null
  operatorUsername: string | null
  beforeJson: string | null
  afterJson: string | null
  ip: string
  requestId: string
  createdAt: number
}

export type DataQueryLogItem = {
  id: number
  source: string
  queryText: string
  toolName: string | null
  paramsJson: string | null
  resultSummary: string | null
  success: boolean
  durationMs: number
  operatorId: number | null
  operatorUsername: string | null
  sessionId: string | null
  ip: string
  requestId: string
  createdAt: number
}

export type HotConfigAuditItem = {
  id: number
  key: string
  action: string
  version: number
  oldValue: string | null
  newValue: string | null
  operatorId: number | null
  remark: string | null
  createdAt: number
}

export type ChatAuditItem = {
  id: string
  title: string
  username: string
  userId: number
  mode: string
  messageCount: number
  deleted: boolean
  deletedAt: number
  createdAt: number
  updatedAt: number
}

export type ChatAuditMessage = {
  id: string
  role: string
  content: string
  toolName: string | null
  createdAt: number
}

export type ChatAuditDetail = ChatAuditItem & {
  messages: ChatAuditMessage[]
  relatedQueries?: DataQueryLogItem[]
}

export type AuditRange = {
  fromMs?: number
  toMs?: number
}

function appendRange(q: URLSearchParams, range?: AuditRange) {
  if (range?.fromMs) q.set('from', String(range.fromMs))
  if (range?.toMs) q.set('to', String(range.toMs))
}

function qs(params: URLSearchParams): string {
  const s = params.toString()
  return s ? `?${s}` : ''
}

export async function fetchAuditSummary(): Promise<AuditSummary> {
  return apiRequest<AuditSummary>('/api/v1/audit/summary', {
    token: requireToken(),
  })
}

export async function fetchOperationLogs(params?: {
  module?: string
  success?: boolean
  keyword?: string
  username?: string
  fromMs?: number
  toMs?: number
  limit?: number
  offset?: number
}): Promise<AuditList<OperationLogItem>> {
  const q = new URLSearchParams()
  if (params?.module) q.set('module', params.module)
  if (params?.success !== undefined) q.set('success', String(params.success))
  if (params?.keyword) q.set('keyword', params.keyword)
  if (params?.username) q.set('username', params.username)
  appendRange(q, params)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  return apiRequest<AuditList<OperationLogItem>>(
    `/api/v1/audit/operations${qs(q)}`,
    { token: requireToken() },
  )
}

export async function fetchLoginLogs(params?: {
  success?: boolean
  username?: string
  fromMs?: number
  toMs?: number
  limit?: number
  offset?: number
}): Promise<AuditList<LoginLogItem>> {
  const q = new URLSearchParams()
  if (params?.success !== undefined) q.set('success', String(params.success))
  if (params?.username) q.set('username', params.username)
  appendRange(q, params)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  return apiRequest<AuditList<LoginLogItem>>(
    `/api/v1/audit/logins${qs(q)}`,
    { token: requireToken() },
  )
}

export async function fetchKnowledgeAudits(params?: {
  action?: string
  keyword?: string
  fromMs?: number
  toMs?: number
  limit?: number
  offset?: number
}): Promise<AuditList<KnowledgeAuditItem>> {
  const q = new URLSearchParams()
  if (params?.action) q.set('action', params.action)
  if (params?.keyword) q.set('keyword', params.keyword)
  appendRange(q, params)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  return apiRequest<AuditList<KnowledgeAuditItem>>(
    `/api/v1/audit/knowledge${qs(q)}`,
    { token: requireToken() },
  )
}

export async function fetchDataQueryLogs(params?: {
  source?: string
  success?: boolean
  keyword?: string
  fromMs?: number
  toMs?: number
  limit?: number
  offset?: number
}): Promise<AuditList<DataQueryLogItem>> {
  const q = new URLSearchParams()
  if (params?.source) q.set('source', params.source)
  if (params?.success !== undefined) q.set('success', String(params.success))
  if (params?.keyword) q.set('keyword', params.keyword)
  appendRange(q, params)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  return apiRequest<AuditList<DataQueryLogItem>>(
    `/api/v1/audit/queries${qs(q)}`,
    { token: requireToken() },
  )
}

export async function fetchHotConfigAudits(params?: {
  action?: string
  keyword?: string
  fromMs?: number
  toMs?: number
  limit?: number
  offset?: number
}): Promise<AuditList<HotConfigAuditItem>> {
  const q = new URLSearchParams()
  if (params?.action) q.set('action', params.action)
  if (params?.keyword) q.set('keyword', params.keyword)
  appendRange(q, params)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  return apiRequest<AuditList<HotConfigAuditItem>>(
    `/api/v1/audit/hot-configs${qs(q)}`,
    { token: requireToken() },
  )
}

export async function fetchChatAudits(params?: {
  username?: string
  keyword?: string
  sessionId?: string
  fromMs?: number
  toMs?: number
  limit?: number
  offset?: number
}): Promise<AuditList<ChatAuditItem>> {
  const q = new URLSearchParams()
  if (params?.username) q.set('username', params.username)
  if (params?.keyword) q.set('keyword', params.keyword)
  if (params?.sessionId) q.set('sessionId', params.sessionId)
  appendRange(q, params)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.offset) q.set('offset', String(params.offset))
  return apiRequest<AuditList<ChatAuditItem>>(
    `/api/v1/audit/chats${qs(q)}`,
    { token: requireToken() },
  )
}

export async function fetchChatAuditDetail(sessionId: string): Promise<{ item: ChatAuditDetail }> {
  return apiRequest<{ item: ChatAuditDetail }>(
    `/api/v1/audit/chats/${encodeURIComponent(sessionId)}`,
    { token: requireToken() },
  )
}

export type AuditExportKind =
  | 'operations'
  | 'logins'
  | 'chats'
  | 'queries'
  | 'knowledge'
  | 'hot-configs'

export async function exportAuditCsv(
  kind: AuditExportKind,
  params: Record<string, string | number | boolean | undefined | null>,
): Promise<void> {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    q.set(k, String(v))
  }
  const names: Record<AuditExportKind, string> = {
    operations: 'audit-operations.csv',
    logins: 'audit-logins.csv',
    chats: 'audit-chats.csv',
    queries: 'audit-queries.csv',
    knowledge: 'audit-knowledge.csv',
    'hot-configs': 'audit-hot-configs.csv',
  }
  await apiDownload(`/api/v1/audit/${kind}/export${qs(q)}`, {
    token: requireToken(),
    fallbackName: names[kind],
  })
}
