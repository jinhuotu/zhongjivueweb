import * as XLSX from 'xlsx';
import type { GovExcelPreview } from './governance-tasks';

export function parseExcelBuffer(buf: ArrayBuffer, fileName: string): GovExcelPreview {
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0] || 'Sheet1';
  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as (string | number | null)[][];

  const headers = (aoa[0] || []).map((h) => String(h ?? ''));
  const body = aoa.slice(1).filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
  const rows = body.slice(0, 200).map((r) => {
    const row = [...r];
    while (row.length < headers.length) row.push('');
    return row.slice(0, headers.length);
  });

  return {
    fileName,
    sheetName,
    headers,
    rows,
    rowCount: body.length,
    importedAt: new Date().toISOString(),
  };
}

export function buildSampleExcelPreview(): GovExcelPreview {
  const rows: (string | number)[][] = [
    ['点位编码', '点位名称', '设备', '单位', '采集值', '时间戳', '质量码'],
    ['TC01.T.Z1', '1#窑一区温度', 'TC-01', '℃', 1362, '2026-08-04 08:00:00', 'GOOD'],
    ['TC01.T.Z2', '1#窑二区温度', 'TC-01', '℃', 1288, '2026-08-04 08:00:00', 'GOOD'],
    ['TC01.GAS', '天然气流量', 'TC-01', 'm³/h', 420.5, '2026-08-04 08:00:00', 'GOOD'],
    ['TC01.AIR', '助燃风量', 'TC-01', 'm³/h', 3850, '2026-08-04 08:00:00', 'UNCERTAIN'],
    ['TC02.T.Z1', '2#窑一区温度', 'TC-02', '℃', 980, '2026-08-04 08:00:00', 'GOOD'],
    ['EG.SO2', '烟气SO2', 'CEMS', 'mg/m³', 28.4, '2026-08-04 08:00:00', 'GOOD'],
    ['EG.NOX', '烟气NOx', 'CEMS', 'mg/m³', 62.1, '2026-08-04 08:00:00', 'GOOD'],
    ['EG.DUST', '颗粒物', 'CEMS', 'mg/m³', 8.2, '2026-08-04 08:00:00', 'BAD'],
    ['PW.KWH', '总用电量', '电表', 'kWh', 15230, '2026-08-04 08:00:00', 'GOOD'],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, '原始点位');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return parseExcelBuffer(out, 'governance-sample.xlsx');
}

export async function loadProvidedSampleExcel(): Promise<GovExcelPreview> {
  try {
    const res = await fetch('/samples/governance-sample.xlsx');
    if (res.ok) {
      const buf = await res.arrayBuffer();
      return parseExcelBuffer(buf, 'governance-sample.xlsx');
    }
  } catch {
    /* fallback */
  }
  return buildSampleExcelPreview();
}
