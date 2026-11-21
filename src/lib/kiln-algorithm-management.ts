import type { AlgorithmMetadata, BaseAsset, ExperimentConfig, Metric, StudioState } from './kiln-studio-api'

export type ReleaseState = 'draft' | 'bound' | 'validating' | 'failed' | 'validated' | 'published' | 'retired'
export type AlgorithmRelease = BaseAsset & {
  name: string; description: string; requestedKey: string | null; state: ReleaseState
  implementationKey: string | null; implementationVersion: string | null
  implementationFingerprint: string | null; definition: AlgorithmMetadata | null
  validationId: string | null; activeJobId: string | null; latestJobId?: string | null; runtimeIssue: string
  history: { action: string; detail: string; at: string }[]
}
export type Implementation = { definition: AlgorithmMetadata; builtin: boolean; bindable: boolean }
export type AlgorithmManagementState = { items: AlgorithmRelease[]; implementations: Implementation[]; scope: 'current_account' }
export type AlgorithmValidationReport = BaseAsset & {
  technicalPassed: boolean; validation: Metric; test: Metric; splitMethod: string
  predictionOffsets: number[]; probeCount: number; restoreMaxDifference: number; elapsedSeconds: number
  config: ExperimentConfig; dataHash: string; mechanismVersion: string; limitations: string[]
}
export const RELEASE_STATES: Record<ReleaseState, string> = {
  draft: '待接入', bound: '待验证', validating: '验证中', failed: '验证失败',
  validated: '验证通过，待发布', published: '已发布', retired: '已停用',
}

export function releaseActions(item: AlgorithmRelease) {
  const ready = !item.runtimeIssue && !!item.implementationKey
  return {
    bind: ['draft', 'bound', 'failed', 'validated'].includes(item.state),
    validate: ready && ['bound', 'failed', 'validated', 'validating'].includes(item.state),
    publish: ready && item.state === 'validated' && !!item.validationId,
    retire: item.state === 'published',
  }
}

export function validationInputIssue(
  projectId: string, project: Pick<StudioState, 'datasets'> | undefined,
  datasetId: string, mechanisms: { id: string }[], mechanismId: string,
) {
  if (!projectId) return { message: '请选择要用于验证的建模项目。' }
  if (!project) return { message: '当前项目的版本尚未读取，请点击刷新。' }
  if (!project.datasets.length) return { message: '当前项目还没有保存的数据版本。请先确认测点和数据口径，再保存数据版本。', step: 'data' }
  if (!project.datasets.some(item => item.id === datasetId)) return { message: '请选择数据版本。' }
  if (!mechanisms.length) return { message: '所选数据版本还没有对应的机理版本。请先保存该数据版本的机理与参数。', step: 'mechanism' }
  if (!mechanisms.some(item => item.id === mechanismId)) return { message: '请选择与数据版本匹配的机理版本。' }
  return null
}
