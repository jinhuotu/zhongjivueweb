import assert from 'node:assert/strict'
import test from 'node:test'
import { compareValidationScores, sameExperimentConfig, samePhysicsParameters, sameTemplateSelection, temperatureCandidates } from '../src/lib/kiln-studio-state.ts'

const parameters = { ambientC: 25, lhvMJ: 36, efficiency: .75, capacityKJ: 20000, lossKW: .3, tauMinutes: 30, theoreticalAfr: 9.5, excessAir: 1.1, minGas: .5 }
const databaseParameters = Object.fromEntries(Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b)))
const config = { datasetId: 'dataset', mechanismId: 'mechanism', task: 'temperature', zone: 0, horizonMinutes: 30, historyMinutes: 30, ridgeAlpha: 1, boostingRounds: 40, learningRate: .1, calibrate: true, lockedParameters: ['capacityKJ', 'lossKW', 'tauMinutes'] }

test('temperature tuning ranks validation records independently of test errors', () => {
  const candidate = (key, mae, rmse, testError, count = 100) => ({
    key, available: true, validation: { mae, rmse, count, coverage: count / 100 },
    test: { mae: testError, rmse: testError, count: 80, coverage: 1 },
  })
  const candidates = [
    candidate('best_test', 20, 22, .01), candidate('best_validation', 1, 2, 8),
    candidate('incomplete', .1, .1, .1, 50),
  ]
  assert.deepEqual(temperatureCandidates(candidates, 100).map(item => item.key),
    ['best_validation', 'best_test'])
})

test('old experiment configs retain the default full zero-record scope', () => {
  assert.equal(sameExperimentConfig({ ...config, excludeZeroTemperatureRecords: false }, config), true)
  assert.equal(sameExperimentConfig({ ...config, excludeZeroTemperatureRecords: true }, config), false)
})

test('saved comparisons match the same algorithm versions in any order', () => {
  const chosen = { ...config, selectedAlgorithmKeys: ['ridge', 'custom_ridge'] }
  assert.equal(sameExperimentConfig(chosen, { ...chosen, selectedAlgorithmKeys: ['custom_ridge', 'ridge'] }), true)
  assert.equal(sameExperimentConfig(config, { ...config, selectedAlgorithmKeys: null }), true)
  assert.equal(sameExperimentConfig(config, chosen), false)
  assert.equal(sameExperimentConfig(chosen, { ...chosen, selectedAlgorithmKeys: ['ridge'] }), false)
})

test('saving and fetching identical parameters must not mark them dirty when MySQL reorders JSON keys', () => {
  assert.notEqual(JSON.stringify(parameters), JSON.stringify(databaseParameters))
  assert.equal(samePhysicsParameters(parameters, databaseParameters), true)
})

test('actual edits and missing parameters still require saving', () => {
  assert.equal(samePhysicsParameters({ ...parameters, tauMinutes: 45 }, databaseParameters), false)
  const missing = { ...databaseParameters }
  delete missing.lossKW
  assert.equal(samePhysicsParameters(parameters, missing), false)
  assert.equal(samePhysicsParameters({ ...parameters, tauMinutes: Number.NaN }, { ...parameters, tauMinutes: Number.NaN }), false)
})

test('mechanism and locked parameter choices are sets, so click order does not invalidate an experiment', () => {
  assert.equal(sameTemplateSelection(['thermal', 'energy'], ['energy', 'thermal']), true)
  assert.equal(sameTemplateSelection(['thermal'], ['thermal', 'energy']), false)
  assert.equal(sameExperimentConfig(config, { ...config, lockedParameters: [...config.lockedParameters].reverse() }), true)
})

test('different input versions, prediction windows and locks still invalidate old experiments', () => {
  for (const change of [{ datasetId: 'other' }, { mechanismId: 'other' }, { horizonMinutes: 60 }, { lockedParameters: [] }, { ridgeAlpha: 2 }]) {
    assert.equal(sameExperimentConfig(config, { ...config, ...change }), false)
  }
})

const algorithm = (key, mae, rmse, coverage = 1, count = 100) => ({
  key, name: key, available: true, validation: { mae, rmse, coverage, count },
})

test('scores match the comparison example and omit incomplete validation coverage', () => {
  const scores = compareValidationScores([
    algorithm('baseline', 13.74, 18.14),
    algorithm('ridge', 1.88, 5),
    algorithm('fusion', 1.94, 5.02),
    algorithm('physics', 0, 0, 0.9, 90),
    algorithm('boosting', 0, 0, 1, 99),
  ], 100)
  assert.deepEqual(scores.map(row => [row.key, row.score]), [['ridge', 100], ['fusion', 98], ['baseline', 19.2]])
  assert.equal(scores[0].lowestMae, true)
  assert.equal(scores[0].lowestRmse, true)
})

test('scores handle zero errors, ties, and a single eligible algorithm', () => {
  const perfect = algorithm('ridge', 0, 0)
  assert.deepEqual(compareValidationScores([perfect], 100), [])
  const scores = compareValidationScores([perfect, algorithm('fusion', 0, 0), algorithm('baseline', 5, 5)], 100)
  assert.deepEqual(scores.map(row => row.score), [100, 100, 0])
})
