import assert from 'node:assert/strict'
import test from 'node:test'
import { formatKilnChartValue, formatKilnNumber, formatKilnParameterInput } from '../src/lib/kiln-studio-format.ts'

test('the two readings from the backtest tooltip use two decimals and the temperature unit', () => {
  assert.equal(formatKilnChartValue(981.4158935546876, '℃'), '981.42 ℃')
  assert.equal(formatKilnChartValue(956.4294840494792, '℃'), '956.43 ℃')
})

test('chart tuples format the reading instead of the timestamp', () => {
  assert.equal(formatKilnChartValue([987.3333333, 9.512349], 'Nm³/Nm³'), '9.512 Nm³/Nm³')
  assert.equal(formatKilnChartValue([987.3333333, null], '℃'), '—')
  assert.equal(formatKilnChartValue(3087.59238, 'Nm³'), '3,087.59 Nm³')
})

test('invalid values and negative zero are displayed consistently', () => {
  assert.equal(formatKilnNumber(NaN), '—')
  assert.equal(formatKilnNumber(Infinity), '—')
  assert.equal(formatKilnNumber(-0.000001), '0')
  assert.equal(formatKilnChartValue(0, 'Nm³/h'), '0 Nm³/h')
})

test('parameter inputs keep up to four decimals and use no thousands separators', () => {
  assert.equal(formatKilnParameterInput(23000.123456789), '23000.1235')
  assert.equal(formatKilnParameterInput(0.0001), '0.0001')
  assert.equal(formatKilnParameterInput(Infinity), '')
})
