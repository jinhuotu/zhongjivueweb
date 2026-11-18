import { studioPost, type CatalogVersion } from '@/lib/kiln-studio-api'

const normalized = (value: string) => value.normalize('NFKC').replace(/−/g, '-').replace(/\s+/g, '')
const sourceIdentity = (source: CatalogVersion['evidence'][number]) =>
  [source.file, source.location, normalized(source.text)].join('\n')
const sortedFields = (value: object) => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))

export function catalogUseIssue(version: CatalogVersion, solverEnabled: boolean): string {
  if (version.status === 'pending') return '请先在机理库审核此候选。'
  if (version.status === 'reviewed') return '请选用审核后的版本。'
  const issues = [...version.compatibilityIssues]
  if (solverEnabled && version.task && version.status !== 'builtin') {
    if (!version.solverSupported) issues.push('公式或输入与现有求解器不兼容，可先关闭求解后作为参考收录')
    issues.push(...version.solverIssues)
  }
  return issues.join('；')
}

export function retainCatalogVersion(version: CatalogVersion, datasetId?: string): Promise<CatalogVersion> {
  if (!version.projected || !version.sourcePlan) return Promise.resolve(version)
  const query = datasetId ? '?dataset_id=' + encodeURIComponent(datasetId) : ''
  return studioPost(`/mechanism-catalog/history/${encodeURIComponent(version.sourcePlan.id)}/${encodeURIComponent(version.key)}${query}`, {})
}

export function catalogDifference(current: CatalogVersion, version: CatalogVersion) {
  const formulaChanged = normalized(current.formula) !== normalized(version.formula)
  const inputsChanged = normalized([...current.variables].sort().join('\n')) !== normalized([...version.variables].sort().join('\n'))
  const currentSources = new Set(current.evidence.map(sourceIdentity))
  const newSources = new Set(version.evidence.map(sourceIdentity))
  const retainsSources = [...currentSources].every(source => newSources.has(source))
  const additions = [
    version.evidence.some(source => !currentSources.has(sourceIdentity(source))) && '资料出处',
    version.parameterNotes.trim() && version.parameterNotes !== current.parameterNotes && '参数依据与单位',
    version.check.trim() && version.check !== current.check && '适用条件',
    Object.keys(version.parameterValues).some(key => !Object.hasOwn(current.parameterValues, key)) && '参数值',
    version.parameterDefinitions.some(({ key }) =>
      version.parameterSources?.[key] && version.parameterSources[key] !== '人工输入或假设'
      && (!current.parameterSources?.[key] || current.parameterSources[key] === '人工输入或假设')) && '参数来源',
  ].filter(Boolean)
  const changed = formulaChanged || inputsChanged || additions.length > 0
    || current.name !== version.name || current.explanation !== version.explanation
    || current.parameterNotes !== version.parameterNotes || current.check !== version.check
    || sortedFields(current.scope) !== sortedFields(version.scope)
    || sortedFields(current.parameterValues) !== sortedFields(version.parameterValues)
    || !retainsSources
  const recommends = version.status === 'approved' && changed && !formulaChanged && !inputsChanged
    && !version.compatibilityIssues.length && !version.solverIssues.length
    && additions.length > 0 && retainsSources
    && (!current.parameterNotes || version.parameterNotes.includes(current.parameterNotes))
    && (!current.check || version.check.includes(current.check))
  const text = formulaChanged ? '公式有差异'
    : inputsChanged ? '输入或单位有差异'
    : recommends ? '库版本补充' + additions.join('、')
    : version.compatibilityIssues.length ? '适用范围有差异'
    : version.status === 'pending' ? '有资料候选待审核'
    : changed ? '有库版本可对比' : '有其他库版本'
  return { recommends, text }
}

export function matchingCatalogVersions(items: CatalogVersion[], current: CatalogVersion) {
  return items.filter(item => item.key === current.key && item.id !== current.id && item.status !== 'reviewed')
    .map(version => ({ version, ...catalogDifference(current, version) }))
    .sort((a, b) => Number(b.recommends) - Number(a.recommends)
      || Number(b.version.status === 'approved' && !b.version.compatibilityIssues.length)
        - Number(a.version.status === 'approved' && !a.version.compatibilityIssues.length))
}
