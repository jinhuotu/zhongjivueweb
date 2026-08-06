import { apiRequest } from './api';
import { getAccessToken } from './auth';
import type { FurnaceItem } from './furnaces-api';

function requireToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error('请先登录');
  return token;
}

export type OverviewTrend = {
  value: string;
  up: boolean;
};

export type OverviewAlert = {
  id: string;
  title: string;
  target: string;
  severity: 'high' | 'medium' | 'low' | string;
  status: string;
  ts?: string;
};

export type OverviewData = {
  source: string;
  kilnCode: string;
  kilnName?: string | null;
  referenceDate?: string;
  dataRange?: {
    startTs: string | null;
    endTs: string | null;
    sampleCount: number;
  } | null;
  kpis: {
    dayTce?: number;
    dayTceTrend?: OverviewTrend | null;
    dayCo2?: number;
    dayCo2Trend?: OverviewTrend | null;
    avgGasFlow?: number;
    avgGasFlowUnit?: string;
    avgGasFlowHint?: string;
    greenPowerShare?: number | null;
    greenPowerHint?: string;
    sampleCount?: number;
  };
  gauges: {
    carbonIntensity?: number;
    energyEfficiency?: number;
    greenPower?: number | null;
  };
  energyTrend24h: Array<{
    name: string;
    天然气: number;
    辅助电力: number;
    蒸汽: number;
    天然气流量?: number;
  }>;
  carbonTrend24h: Array<{
    name: string;
    实际排放: number;
    配额基线: number;
    去年同期: number;
  }>;
  energyMix: Array<{ name: string; value: number; color: string }>;
  furnaces: FurnaceItem[];
  alerts: OverviewAlert[];
  meta?: { message?: string };
  policyCards?: {
    annualCarbonProgress?: number | null;
    efficiencyGrade?: string | null;
    ceaSurplus?: number | null;
  };
};

/** 兼容后端空数据（未导入 Excel）缺字段，避免首页客户端崩溃 */
function normalizeOverview(raw: Partial<OverviewData> | null | undefined): OverviewData {
  const data = raw ?? {};
  return {
    source: data.source ?? 'empty',
    kilnCode: data.kilnCode ?? 'TC-03',
    kilnName: data.kilnName ?? null,
    referenceDate: data.referenceDate,
    dataRange: data.dataRange ?? null,
    kpis: data.kpis ?? {},
    gauges: {
      carbonIntensity: data.gauges?.carbonIntensity ?? 0,
      energyEfficiency: data.gauges?.energyEfficiency ?? 0,
      greenPower: data.gauges?.greenPower ?? null,
    },
    energyTrend24h: data.energyTrend24h ?? [],
    carbonTrend24h: data.carbonTrend24h ?? [],
    energyMix: data.energyMix ?? [],
    furnaces: data.furnaces ?? [],
    alerts: data.alerts ?? [],
    meta: data.meta,
    policyCards: data.policyCards,
  };
}

export async function getOverview(kilnCode = 'TC-03'): Promise<OverviewData> {
  const q = new URLSearchParams({ kilnCode });
  const raw = await apiRequest<Partial<OverviewData>>(`/api/v1/overview?${q.toString()}`, {
    token: requireToken(),
  });
  return normalizeOverview(raw);
}
