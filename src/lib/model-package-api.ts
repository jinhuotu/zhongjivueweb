import { getApiBaseUrl } from './api'
import { getAccessToken, refreshTokens } from './auth'
import { studioGet } from './kiln-studio-api'
import type { Bundle, ExperimentConfig } from './kiln-studio-api'

export type ExportFormat = 'json' | 'skill' | 'python' | 'onnx'
export type ExportedModel = {
  algorithm: string; implementationKey?: string; features: string[]; config: ExperimentConfig
}
export type NumericModelExport = {
  format: 'kiln-studio-numeric-model-v1'; bundle: Bundle & { author?: string | null }
  models: ExportedModel[]; datasetConfig: Record<string, unknown>
  engineVersion: string; replayInstructions: string
}

export function fetchNumericModel(bundleId: string) {
  return studioGet<NumericModelExport>(`/bundles/${encodeURIComponent(bundleId)}/export`)
}
export async function fetchModelExport(bundleId: string, format: 'json' | 'skill') {
  const result = await studioGet<{ format?: string }>(`/bundles/${encodeURIComponent(bundleId)}/export?format=${format}`)
  const expected = format === 'json' ? 'kiln-studio-numeric-model-v1' : 'kiln-studio-ai-skill-v1'
  if (result.format !== expected) throw new Error('后端返回格式与所选格式不一致，请确认后端已更新并重启。')
  return result
}

/** 二进制下载保留后端错误正文，并仅刷新一次令牌。 */
export type ExportCapabilities = { onnx: { available: boolean; reason: string; precision: string } }

export function fetchExportCapabilities(bundleId: string) {
  return studioGet<ExportCapabilities>(`/bundles/${encodeURIComponent(bundleId)}/export/capabilities`)
}

export async function fetchBinaryModelPackage(bundleId: string, format: 'python' | 'onnx'): Promise<Blob> {
  const url = `${getApiBaseUrl()}/api/v1/kiln-studio/bundles/${encodeURIComponent(bundleId)}/export/${format}.zip`
  const request = () => fetch(url, { headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` } })
  let response = await request()
  if (response.status === 401 && await refreshTokens()) response = await request()
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { msg?: string; detail?: string | { msg: string }[] } | null
    const detail = Array.isArray(body?.detail) ? body.detail.map(item => item.msg).join('；') : body?.detail
    throw new Error(body?.msg || detail || `下载失败（HTTP ${response.status}）`)
  }
  if (!response.headers.get('content-type')?.includes('application/zip')) throw new Error('后端没有返回有效的 ZIP 文件，请检查接口。')
  return response.blob()
}
