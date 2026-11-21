import type { ExperimentConfig, StudioState } from './kiln-studio-api'

export type AlgorithmLibraryOrigin = {
  accountId: number
  projectId: string
  experimentId: string
  config: ExperimentConfig
}

const storageKey = 'kiln.algorithm-library-origin'
let lastOrigin: { token: string; origin: AlgorithmLibraryOrigin } | undefined

export function rememberAlgorithmLibraryOrigin(origin: AlgorithmLibraryOrigin) {
  const token = Array.from(crypto.getRandomValues(new Uint32Array(4)), part => part.toString(16)).join('-')
  const snapshot = JSON.stringify({ token, origin })
  lastOrigin = JSON.parse(snapshot)
  try { sessionStorage.setItem(storageKey, snapshot) } catch { /* Keep the in-page snapshot if storage is unavailable. */ }
  return token
}

export function readAlgorithmLibraryOrigin(token: unknown, accountId?: number): AlgorithmLibraryOrigin | undefined {
  if (typeof token !== 'string' || !token || accountId === undefined) return
  let entry = lastOrigin
  if (!entry) {
    try {
      const snapshot = sessionStorage.getItem(storageKey)
      if (snapshot) entry = JSON.parse(snapshot)
    } catch { /* The origin may have expired with the browser session. */ }
  }
  if (entry?.token === token && entry.origin?.accountId === accountId) return entry.origin
}

export function matchAlgorithmLibraryOrigin(origin: AlgorithmLibraryOrigin, project: StudioState) {
  if (origin.projectId !== project.project.id) return
  const dataset = project.datasets.find(item => item.id === origin.config.datasetId)
  const mechanism = project.mechanisms.find(item => item.id === origin.config.mechanismId && item.datasetId === dataset?.id)
  const experiment = project.experiments.find(item => item.id === origin.experimentId && item.datasetId === dataset?.id && item.config.task === origin.config.task)
  return { dataset, mechanism, experiment }
}
