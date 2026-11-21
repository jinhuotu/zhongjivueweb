import assert from 'node:assert/strict'
import test from 'node:test'
import { PACKAGE_EXPORT_FORMATS } from '../src/config/package-formats.ts'
import { packageFileName, pythonExportIssue } from '../src/lib/model-package.ts'

test('only implemented formats can produce a download request', () => {
  assert.deepEqual(PACKAGE_EXPORT_FORMATS.filter(item => item.available).map(item => item.format), ['json', 'skill', 'python', 'onnx'])
  const planned = PACKAGE_EXPORT_FORMATS.filter(item => !item.available)
  assert.deepEqual(planned.map(item => item.id), ['tensorrt', 'pmml', 'docker', 'api', 'exe', 'app'])
  assert.ok(planned.every(item => !item.format && item.prerequisite))
  assert.equal(new Set(PACKAGE_EXPORT_FORMATS.map(item => item.id)).size, PACKAGE_EXPORT_FORMATS.length)
})

test('filenames use the actual version and tolerate Chinese names and Windows reserved characters', () => {
  const json = PACKAGE_EXPORT_FORMATS[0]
  assert.equal(packageFileName('窑炉模型', 'abc123', json), '窑炉模型-abc123.model.json')
  assert.equal(packageFileName('窑炉模型', 'abc123', PACKAGE_EXPORT_FORMATS.find(item => item.id === 'onnx')), '窑炉模型-abc123.onnx.zip')
  assert.equal(packageFileName('../my:model', 'v1', json), '.._my_model-v1.model.json')
  assert.equal(packageFileName('CON', 'v1', json), '_CON-v1.model.json')
  assert.throws(() => packageFileName('...', 'v1', json), /有效的产物名称/)
})

test('NumPy-only export clearly rejects ONNX but accepts saved algorithm presets', () => {
  assert.equal(pythonExportIssue({ models: [{ algorithm: 'ridge_custom', implementationKey: 'ridge' }, { algorithm: 'lstm' }] }), '')
  assert.match(pythonExportIssue({ models: [{ algorithm: 'external_model', implementationKey: 'onnx' }] }), /onnx/)
})
