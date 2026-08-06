import { apiRequest } from './api';
import { getAccessToken } from './auth';

function requireToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error('请先登录');
  return token;
}

export type ProdSystemCode = 'tunnel' | 'batching' | 'shuttle' | string;

export type ProdSystemItem = {
  code: ProdSystemCode;
  name: string;
  kind: string;
  description?: string | null;
  meta?: Record<string, unknown>;
};

export type ProdTagValue = {
  tagCode: string;
  name: string;
  unit?: string | null;
  group?: string | null;
  writable?: boolean;
  alarmLo?: number | null;
  alarmHi?: number | null;
  value?: number | string | null;
};

export type ProdSnapshot = {
  system: ProdSystemItem;
  ts: string;
  values: Record<string, number | string | null>;
  groups: Record<string, ProdTagValue[]>;
  tags: ProdTagValue[];
};

export type ProdSeries = {
  systemCode: string;
  from: string;
  series: Record<string, { ts: string; value: number | string | null }[]>;
};

export type ProdAlarm = {
  id: string;
  systemCode: string;
  tagCode?: string | null;
  level: string;
  title: string;
  message?: string | null;
  status: string;
  raisedAt?: string | null;
};

export type ProdCommand = {
  id: string;
  tagCode: string;
  targetValue?: number | null;
  status: string;
  executor: string;
  resultMsg?: string | null;
  createdAt?: string | null;
};

export async function listProdSystems(): Promise<ProdSystemItem[]> {
  const data = await apiRequest<{ items: ProdSystemItem[] }>('/api/v1/production/systems', {
    token: requireToken(),
  });
  return data.items || [];
}

export async function fetchProdSnapshot(system: ProdSystemCode): Promise<ProdSnapshot> {
  return apiRequest<ProdSnapshot>(`/api/v1/production/${encodeURIComponent(system)}/snapshot`, {
    token: requireToken(),
  });
}

export async function fetchProdSeries(
  system: ProdSystemCode,
  tags: string[],
  hours = 24
): Promise<ProdSeries> {
  const q = new URLSearchParams({
    tags: tags.join(','),
    hours: String(hours),
  });
  return apiRequest<ProdSeries>(
    `/api/v1/production/${encodeURIComponent(system)}/series?${q}`,
    { token: requireToken() }
  );
}

export async function listProdAlarms(
  system: ProdSystemCode,
  status?: string
): Promise<ProdAlarm[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const data = await apiRequest<{ items: ProdAlarm[] }>(
    `/api/v1/production/${encodeURIComponent(system)}/alarms${q}`,
    { token: requireToken() }
  );
  return data.items || [];
}

export async function ackProdAlarm(alarmId: string): Promise<ProdAlarm> {
  const data = await apiRequest<{ item: ProdAlarm }>(
    `/api/v1/production/alarms/${encodeURIComponent(alarmId)}/ack`,
    { method: 'POST', token: requireToken() }
  );
  return data.item;
}

export async function listProdCommands(system: ProdSystemCode): Promise<ProdCommand[]> {
  const data = await apiRequest<{ items: ProdCommand[] }>(
    `/api/v1/production/${encodeURIComponent(system)}/commands`,
    { token: requireToken() }
  );
  return data.items || [];
}

export async function issueProdCommand(
  system: ProdSystemCode,
  input: { tagCode: string; targetValue: number; executor?: 'simulate' | 'plc' }
): Promise<ProdCommand> {
  const data = await apiRequest<{ item: ProdCommand }>(
    `/api/v1/production/${encodeURIComponent(system)}/commands`,
    {
      method: 'POST',
      token: requireToken(),
      body: {
        tagCode: input.tagCode,
        targetValue: input.targetValue,
        executor: input.executor || 'simulate',
      },
    }
  );
  return data.item;
}
