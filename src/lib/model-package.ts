import type { PackageFormat } from '../config/package-formats'
import type { NumericModelExport } from './model-package-api'

const portableAlgorithms = new Set(['baseline', 'physics', 'ridge', 'lasso', 'boosting', 'fusion', 'lstm'])

export function pythonExportIssue(data?: NumericModelExport) {
  if (!data) return ''
  const unsupported = data.models.map(model => model.implementationKey ?? model.algorithm)
    .filter(key => !portableAlgorithms.has(key))
  return unsupported.length ? `此模型包含 ${[...new Set(unsupported)].join('、')}，暂不支持仅依赖 NumPy 的离线包；可导出 JSON 或 Skill。` : ''
}

export function packageFileName(name: string, version: string, format: PackageFormat) {
  const clean = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().replace(/[. ]+$/, '').slice(0, 120)
  const base = clean(name)
  if (!base) throw new Error('请填写有效的产物名称。')
  const safeBase = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base) ? '_' + base : base
  return `${safeBase}-${clean(version)}${format.extension}`
}
