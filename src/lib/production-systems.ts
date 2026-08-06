import type { ProdSystemCode } from './production-api';

export type ProductionSystemKey = 'tunnel' | 'batching' | 'shuttle';

export const PRODUCTION_SYSTEMS: Record<
  ProductionSystemKey,
  {
    code: ProdSystemCode;
    title: string;
    scadaTitle: string;
    description: string;
    seriesTags: string[];
  }
> = {
  tunnel: {
    code: 'tunnel',
    title: '隧道窑管理',
    scadaTitle: '隧道窑控制系统',
    description: '通达隧道窑画面还原：沿程温度曲线、分区示意、流量与操作/报警/历史',
    seriesTags: ['Z4_TEMP', 'Z5_TEMP', 'Z2_TEMP', 'Z2_GAS', 'Z2_AIR', 'AIR_TEMP', 'P40', 'P20'],
  },
  batching: {
    code: 'batching',
    title: '配料管理',
    scadaTitle: '配料楼',
    description: '通达配料楼画面还原：料仓目标/实际、秤车、卸料口、操作/报警/历史',
    seriesTags: ['SILO01_ACT', 'SILO03_ACT', 'SILO11_ACT', 'CART1_A', 'CART1_B', 'DISCHARGE2'],
  },
  shuttle: {
    code: 'shuttle',
    title: '梭式窑管理',
    scadaTitle: '梭式窑烟气治理系统',
    description: '通达梭式窑烟气治理画面还原：换热/脱硫脱硝/CEMS、操作/报警/历史',
    seriesTags: ['SO2', 'NOX', 'DUST', 'NH3', 'O2', 'FG_FLOW', 'DES_TOWER_P', 'IDF_HZ'],
  },
};

export function isProductionSystem(v: string): v is ProductionSystemKey {
  return v === 'tunnel' || v === 'batching' || v === 'shuttle';
}

export function num(v: unknown, digits = 1): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isNaN(n)) return v;
    return n.toFixed(digits);
  }
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '—';
    return v.toFixed(digits);
  }
  return String(v);
}
