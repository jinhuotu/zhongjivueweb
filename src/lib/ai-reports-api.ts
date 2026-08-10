import { apiRequest, getApiBaseUrl } from './api';
import { getAccessToken } from './auth';

export type ReportType = 'fault' | 'forecast' | 'efficiency' | 'carbon';
export type ReportMode = 'fast' | 'deep';

export type ReportTypeMeta = {
  id: ReportType | string;
  name: string;
  desc: string;
};

export type AiReportItem = {
  id: string;
  type: ReportType | string;
  typeName: string;
  title: string;
  furnaceId: string;
  furnaceName?: string | null;
  mode: ReportMode | string;
  status: 'generating' | 'done' | 'failed' | string;
  charCount: number;
  size: string;
  refsCount: number;
  errorMsg?: string | null;
  workflowId?: string | null;
  workflowRunId?: string | null;
  createdAt: number;
  updatedAt: number;
  content?: string;
  refs?: { content: string; score: number; doc_id?: string }[];
  contextSummary?: string | null;
};

export type PublishedWorkflowOption = {
  id: string;
  name: string;
  remark?: string | null;
  domain?: string;
  publishedVersion?: number;
};

function requireToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error('请先登录后再生成报告');
  return token;
}

export async function listReportTypes(): Promise<ReportTypeMeta[]> {
  const data = await apiRequest<{ items: ReportTypeMeta[] }>('/api/v1/ai/reports/types', {
    token: requireToken(),
  });
  return data.items || [];
}

export async function listAiReports(input?: {
  type?: ReportType;
  limit?: number;
}): Promise<AiReportItem[]> {
  const q = new URLSearchParams();
  if (input?.type) q.set('type', input.type);
  if (input?.limit) q.set('limit', String(input.limit));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const data = await apiRequest<{ items: AiReportItem[] }>(`/api/v1/ai/reports${suffix}`, {
    token: requireToken(),
  });
  return data.items || [];
}

export async function getAiReport(reportId: string): Promise<AiReportItem> {
  const data = await apiRequest<{ item: AiReportItem }>(
    `/api/v1/ai/reports/${encodeURIComponent(reportId)}`,
    { token: requireToken() }
  );
  return data.item;
}

export async function deleteAiReport(reportId: string): Promise<void> {
  await apiRequest(`/api/v1/ai/reports/${encodeURIComponent(reportId)}`, {
    method: 'DELETE',
    token: requireToken(),
  });
}

export type ReportStreamHandlers = {
  onMeta?: (meta: {
    reportId: string;
    type: string;
    furnaceId: string;
    furnaceName?: string;
    mode?: string;
    refs?: number;
    hasSamples?: boolean;
    workflowId?: string | null;
  }) => void;
  onStep?: (event: 'step_start' | 'step_end', payload: Record<string, unknown>) => void;
  onDelta?: (text: string) => void;
  onDone?: (payload: {
    ok?: boolean;
    reportId?: string;
    title?: string;
    charCount?: number;
    workflowId?: string | null;
    workflowRunId?: string | null;
  }) => void;
  onError?: (msg: string) => void;
};

export async function listPublishedWorkflows(): Promise<PublishedWorkflowOption[]> {
  const data = await apiRequest<{ items: PublishedWorkflowOption[] }>(
    '/api/v1/workflows/options',
    { token: requireToken() },
  );
  return data.items || [];
}

export async function streamGenerateReport(
  input: {
    type: ReportType;
    furnaceId: string;
    mode: ReportMode;
    workflowId?: string | null;
  },
  handlers: ReportStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const token = requireToken();
  const res = await fetch(`${getApiBaseUrl()}/api/v1/ai/reports/generate`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: input.type,
      furnaceId: input.furnaceId,
      mode: input.mode,
      ...(input.workflowId ? { workflowId: input.workflowId } : {}),
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = `服务异常 ${res.status}`;
    try {
      const j = await res.json();
      msg = j.msg || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = block.split('\n');
      let event = 'message';
      let data = '';
      for (const ln of lines) {
        if (ln.startsWith('event: ')) event = ln.slice(7).trim();
        else if (ln.startsWith('data: ')) data += ln.slice(6);
      }
      if (!data) continue;
      try {
        const payload = JSON.parse(data);
        if (event === 'meta') handlers.onMeta?.(payload);
        else if (event === 'step_start' || event === 'step_end')
          handlers.onStep?.(event, payload);
        else if (event === 'delta') handlers.onDelta?.(String(payload.text || ''));
        else if (event === 'done') handlers.onDone?.(payload);
        else if (event === 'error') handlers.onError?.(String(payload.msg || 'error'));
      } catch {
        // ignore parse errors
      }
    }
  }
}
