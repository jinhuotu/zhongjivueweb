import assert from 'node:assert/strict'
import test from 'node:test'
import { apiErrorMessage } from '../src/lib/api-errors.ts'

test('old backend rejecting the new zero-record rule identifies the field and restart action', () => {
  const message = apiErrorMessage({ detail: [{
    loc: ['body', 'excludeZeroTemperatureRecords'], type: 'extra_forbidden',
    msg: 'Extra inputs are not permitted', input: false,
  }] })
  assert.match(message, /全零温度处理规则/)
  assert.match(message, /excludeZeroTemperatureRecords/)
  assert.match(message, /重启 API/)
})

test('business messages and string details remain readable', () => {
  assert.equal(apiErrorMessage({ msg: '机理与数据版本不匹配', detail: [] }), '机理与数据版本不匹配')
  assert.equal(apiErrorMessage({ detail: '记录不存在' }), '记录不存在')
})

test('validation errors identify fields without printing user inputs or context', () => {
  const message = apiErrorMessage({ detail: [{
    loc: ['body', 'historyMinutes'], type: 'greater_than_equal',
    msg: 'Input should be greater than or equal to 5', input: 'private-upload-value',
    ctx: { extra: 'private-upload-context' },
  }, { loc: ['body', 'datasetId'], type: 'missing', input: { token: 'secret' } }] })
  assert.match(message, /历史窗口/)
  assert.match(message, /数据版本.*缺少必填值/)
  assert.doesNotMatch(message, /private-upload|secret/)
})

test('empty or unexpected error responses use the gateway fallback', () => {
  for (const payload of [null, [], 'bad gateway', {}, { detail: [null, 42] }]) {
    assert.equal(apiErrorMessage(payload), undefined)
  }
})
