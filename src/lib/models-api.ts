import { apiRequest } from './api';
import { getAccessToken } from './auth';

export type ModelKind = 'llm' | 'embedding';

export type ModelConfigItem = {
  id: string;
  name: string;
  kind: ModelKind;
  apiBase: string;
  apiKeyMasked: string;
  modelName: string;
  temperature?: number | null;
  timeoutSeconds: number;
  embeddingDim?: number | null;
  remark?: string | null;
  enabled: boolean;
  scopeFast: boolean;
  scopeDeep: boolean;
  scopeEmbedding: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ModelRuntime = {
  llm_configured: boolean;
  embedding_configured: boolean;
  llm_fast: ModelConfigItem | null;
  llm_deep: ModelConfigItem | null;
  embedding: ModelConfigItem | null;
};

function requireToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error('请先登录');
  return token;
}

export async function fetchModelRuntime(): Promise<ModelRuntime> {
  return apiRequest<ModelRuntime>('/api/v1/models/runtime', { token: requireToken() });
}

export async function listModelConfigs(kind?: ModelKind): Promise<ModelConfigItem[]> {
  const q = kind ? `?kind=${kind}` : '';
  const data = await apiRequest<{ items: ModelConfigItem[] }>(`/api/v1/models${q}`, {
    token: requireToken(),
  });
  return data.items || [];
}

export async function createModelConfig(body: {
  name: string;
  kind: ModelKind;
  apiBase: string;
  apiKey: string;
  modelName: string;
  temperature?: number | null;
  timeoutSeconds?: number;
  embeddingDim?: number | null;
  remark?: string;
  enabled?: boolean;
  scopeFast?: boolean;
  scopeDeep?: boolean;
  scopeEmbedding?: boolean;
}): Promise<ModelConfigItem> {
  const data = await apiRequest<{ item: ModelConfigItem }>('/api/v1/models', {
    method: 'POST',
    token: requireToken(),
    body,
  });
  return data.item;
}

export async function updateModelConfig(
  id: string,
  body: Record<string, unknown>
): Promise<ModelConfigItem> {
  const data = await apiRequest<{ item: ModelConfigItem }>(
    `/api/v1/models/${encodeURIComponent(id)}`,
    { method: 'PATCH', token: requireToken(), body }
  );
  return data.item;
}

export async function deleteModelConfig(id: string): Promise<void> {
  await apiRequest(`/api/v1/models/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: requireToken(),
  });
}
