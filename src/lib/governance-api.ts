import { apiDownload, apiRequest } from './api';
import { getAccessToken } from './auth';

function requireToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error('请先登录');
  return token;
}

export type GovTaskApi = {
  id: string;
  name: string;
  description?: string;
  owner: string;
  sourceType: string;
  status: string;
  excel?: {
    fileName: string;
    sheetName: string;
    headers: string[];
    rows: (string | number | null)[][];
    rowCount: number;
    importedAt?: string;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export async function listGovTasks(): Promise<GovTaskApi[]> {
  const data = await apiRequest<{ items: GovTaskApi[] }>('/api/v1/governance/tasks', {
    token: requireToken(),
  });
  return data.items || [];
}

export async function createGovTask(body: {
  name: string;
  description?: string;
  owner?: string;
  sourceType?: string;
}): Promise<GovTaskApi> {
  const data = await apiRequest<{ item: GovTaskApi }>('/api/v1/governance/tasks', {
    method: 'POST',
    token: requireToken(),
    body,
  });
  return data.item;
}

export async function updateGovTask(
  id: string,
  body: {
    name?: string;
    description?: string;
    owner?: string;
    sourceType?: string;
  }
): Promise<GovTaskApi> {
  const data = await apiRequest<{ item: GovTaskApi }>(
    `/api/v1/governance/tasks/${encodeURIComponent(id)}`,
    { method: 'PUT', token: requireToken(), body }
  );
  return data.item;
}

export async function deleteGovTask(id: string): Promise<void> {
  await apiRequest(`/api/v1/governance/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: requireToken(),
  });
}

export async function saveGovTaskExcel(
  id: string,
  excel: {
    fileName: string;
    sheetName: string;
    headers: string[];
    rows: (string | number | null)[][];
    rowCount: number;
    importedAt?: string;
    contentBase64?: string;
  }
): Promise<GovTaskApi> {
  const data = await apiRequest<{ item: GovTaskApi }>(
    `/api/v1/governance/tasks/${encodeURIComponent(id)}/excel`,
    { method: 'POST', token: requireToken(), body: excel }
  );
  return data.item;
}

export async function exportGovTask(id: string): Promise<void> {
  await apiDownload(`/api/v1/governance/tasks/${encodeURIComponent(id)}/export`, {
    token: requireToken(),
    fallbackName: `governance-${id}.csv`,
  });
}
