import { apiRequest } from './api';
import { getAccessToken } from './auth';

function requireToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error('请先登录');
  return token;
}

export type FurnaceDataRange = {
  startTs: string | null;
  endTs: string | null;
  sampleCount: number;
};

export type ProcessSample = {
  ts: string | null;
  tempSp: number | null;
  afrSp: number | null;
  zoneAvgTemp: number | null;
  z1Temp: number | null;
  z2Temp: number | null;
  z3Temp: number | null;
  z4Temp: number | null;
  z5Temp: number | null;
  z6Temp: number | null;
  furnacePMeas: number | null;
  gasFlowInstant: number | null;
  airFlowInstant: number | null;
  o2Meas: number | null;
  o2Sp: number | null;
  co2Hourly: number | null;
  gasPMeas: number | null;
  airPMeas: number | null;
  furnacePOut: number | null;
  sourceFile?: string | null;
  batchNo?: string | null;
  zoneCount?: number | null;
};

export type FurnaceItem = {
  id: string;
  code: string;
  name: string;
  kilnNo: string | null;
  type: string | null;
  workshop: string | null;
  capacity: string | null;
  status: 'running' | 'warning' | 'alarm' | 'idle' | string;
  remark: string | null;
  temperature: number | null;
  gas: number | null;
  afr: number | null;
  o2: number | null;
  furnacePressure: number | null;
  tempSp: number | null;
  co2Hourly: number | null;
  power: number;
  eff: number | null;
  operator: string;
  runHours: number;
  latestTs: string | null;
  snapshot: ProcessSample | null;
  dataRange: FurnaceDataRange | null;
};

export type SeriesResponse = {
  kilnCode: string;
  from: string;
  to: string;
  stepMinutes: number;
  dataRange: FurnaceDataRange | null;
  points: ProcessSample[];
};

export async function listFurnaces(options?: { lite?: boolean }): Promise<FurnaceItem[]> {
  const q = options?.lite ? '?lite=true' : '';
  const data = await apiRequest<{ items: FurnaceItem[] }>(`/api/v1/furnaces${q}`, {
    token: requireToken(),
  });
  return data.items || [];
}

export async function getFurnace(code: string): Promise<FurnaceItem> {
  const data = await apiRequest<{ item: FurnaceItem }>(`/api/v1/furnaces/${encodeURIComponent(code)}`, {
    token: requireToken(),
  });
  return data.item;
}

export async function getFurnaceSeries(
  code: string,
  params?: {
    from?: string;
    to?: string;
    stepMinutes?: number;
    limit?: number;
  },
): Promise<SeriesResponse> {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.stepMinutes != null) q.set('stepMinutes', String(params.stepMinutes));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiRequest<SeriesResponse>(
    `/api/v1/furnaces/${encodeURIComponent(code)}/series${qs ? `?${qs}` : ''}`,
    { token: requireToken() },
  );
}

export async function getFurnaceSnapshot(
  code: string,
  params?: { at?: string; offsetMinutes?: number },
): Promise<{
  item: FurnaceItem;
  sample: ProcessSample | null;
  playback: {
    mode: string;
    offsetMinutes: number | null;
    at: string | null;
    requestedAt?: string;
  };
}> {
  const q = new URLSearchParams();
  if (params?.at) q.set('at', params.at);
  if (params?.offsetMinutes != null) q.set('offsetMinutes', String(params.offsetMinutes));
  const qs = q.toString();
  return apiRequest(
    `/api/v1/furnaces/${encodeURIComponent(code)}/snapshot${qs ? `?${qs}` : ''}`,
    { token: requireToken() },
  );
}
