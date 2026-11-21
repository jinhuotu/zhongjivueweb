import assert from 'node:assert/strict'
import test from 'node:test'
import { algorithmSource, algorithmBadges, algorithmParameterDefaults, validateAlgorithmParameters } from '../src/lib/kiln-algorithm-library.ts'
import { sameExperimentConfig } from '../src/lib/kiln-studio-state.ts'

test('source categories distinguish implementations, presets and frozen models, including old records', () => {
  assert.equal(algorithmSource({ key: 'ridge' }), 'builtin')
  assert.equal(algorithmSource({ baseKey: 'ridge' }), 'preset')
  assert.equal(algorithmSource({ external: {} }), 'external')
  assert.equal(algorithmSource({ sourceKind: 'external' }), 'external')
  assert.equal(algorithmSource({ sourceKind: 'package' }), 'package')
  assert.equal(algorithmBadges({})[0].label, '能力未声明')
})

const item = { parameterSchema: { properties: {
  bias: { type: 'number', title: '偏置', default: 0, minimum: -10, maximum: 10 },
  count: { type: 'integer', title: '次数', minimum: 1 },
  enabled: { type: 'boolean', default: false },
}, required: ['count'] } }

test('registered parameter schemas preserve defaults and reject invalid values', () => {
  assert.deepEqual(algorithmParameterDefaults(item), { bias: 0, enabled: false })
  assert.throws(() => validateAlgorithmParameters(item, {}), /次数/)
  assert.throws(() => validateAlgorithmParameters(item, { count: 1.5 }), /整数/)
  assert.throws(() => validateAlgorithmParameters(item, { count: 2, bias: 100 }), /范围/)
  assert.deepEqual(validateAlgorithmParameters(item, { bias: 1, count: 2, enabled: false }), { bias: 1, count: 2, enabled: false })
})

test('old configs and empty options compare equally; edited algorithm parameters invalidate saved results', () => {
  const base = { selectedAlgorithmKeys: ['a'] }
  assert.equal(sameExperimentConfig(base, { ...base, algorithmOptions: {} }), true)
  assert.equal(sameExperimentConfig(base, { ...base, algorithmOptions: { a: { bias: 1 } } }), false)
  const left = { ...base, algorithmOptions: { a: { bias: 1, count: 2 }, b: { enabled: false } } }
  const right = { ...base, algorithmOptions: { b: { enabled: false }, a: { count: 2, bias: 1 } } }
  assert.equal(sameExperimentConfig(left, right), true)
  assert.equal(sameExperimentConfig(left, { ...right, algorithmOptions: { a: { bias: 2, count: 2 } } }), false)
})
