import assert from 'node:assert/strict'
import test from 'node:test'
import { releaseActions, validationInputIssue } from '../src/lib/kiln-algorithm-management.ts'
import { matchAlgorithmLibraryOrigin, readAlgorithmLibraryOrigin, rememberAlgorithmLibraryOrigin } from '../src/lib/kiln-algorithm-library-origin.ts'

test('drafts cannot validate or publish; only a checked bound version can publish', () => {
  assert.deepEqual(releaseActions({ state: 'draft', implementationKey: null }), { bind: true, validate: false, publish: false, retire: false })
  assert.equal(releaseActions({ state: 'bound', implementationKey: 'new_method' }).publish, false)
  assert.equal(releaseActions({ state: 'validated', implementationKey: 'new_method', validationId: 'real-check' }).publish, true)
})
test('runtime mismatch blocks validating and publishing; published weights can only be retired', () => {
  const stale = { state: 'validated', implementationKey: 'new_method', validationId: 'real-check', runtimeIssue: 'version changed' }
  assert.equal(releaseActions(stale).validate, false)
  assert.equal(releaseActions(stale).publish, false)
  assert.deepEqual(releaseActions({ state: 'published', implementationKey: 'new_method' }), { bind: false, validate: false, publish: false, retire: true })
})

test('validation explains missing data and mechanism versions in order', () => {
  const dataset = { id: 'dataset' }
  const mechanism = { id: 'mechanism' }
  const project = { datasets: [dataset] }
  assert.equal(validationInputIssue('project', { datasets: [] }, '', [], '').step, 'data')
  assert.equal(validationInputIssue('project', project, dataset.id, [], '').step, 'mechanism')
  assert.equal(validationInputIssue('project', project, dataset.id, [mechanism], 'outdated').message, '请选择与数据版本匹配的机理版本。')
  assert.equal(validationInputIssue('project', project, dataset.id, [mechanism], mechanism.id), null)
})

test('return to the original project and preserve the current comparison independently of validation', () => {
  const dataset = { id: 'production-data' }
  const mechanism = { id: 'production-mechanism', datasetId: dataset.id }
  const config = { task: 'temperature', datasetId: dataset.id, mechanismId: mechanism.id, selectedAlgorithmKeys: ['baseline'] }
  const experiment = { id: 'production-experiment', datasetId: dataset.id, config: { task: 'temperature' } }
  const project = { project: { id: 'production' }, datasets: [dataset], mechanisms: [mechanism], experiments: [experiment] }
  const token = rememberAlgorithmLibraryOrigin({ accountId: 7, projectId: project.project.id, experimentId: experiment.id, config })
  config.selectedAlgorithmKeys.push('changed-after-navigation')

  const origin = readAlgorithmLibraryOrigin(token, 7)
  assert.deepEqual(origin.config.selectedAlgorithmKeys, ['baseline'])
  assert.deepEqual(matchAlgorithmLibraryOrigin(origin, project), { dataset, mechanism, experiment })
  assert.equal(matchAlgorithmLibraryOrigin(origin, { ...project, project: { id: 'demo-validation' } }), undefined)
  assert.equal(readAlgorithmLibraryOrigin(token, 8), undefined)
  assert.equal(readAlgorithmLibraryOrigin('different-token', 7), undefined)
})
