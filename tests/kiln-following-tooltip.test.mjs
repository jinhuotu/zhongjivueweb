import assert from 'node:assert/strict'
import test from 'node:test'
import { followingForecast, followingTooltipPosition } from '../src/lib/kiln-following-tooltip.ts'

const frame = future => ({ snapshot: { temp: 900 }, future: { physics: future } })
const envelope = { offsets: [10, 30], halfWidths: [2, 5], sampleCounts: [10, 10] }

test('the current actual is not reported as the future forecast, even with unordered offsets', () => {
  const result = followingForecast(frame([
    { minuteOffset: 30, value: 940 }, { minuteOffset: 0, value: 900 }, { minuteOffset: 10, value: 910 },
  ]), 'physics', 30, envelope)
  assert.deepEqual(result, { offset: 30, forecast: 940, shortened: false, upper: 945, lower: 935 })
})

test('shorter coverage retains its actual horizon and does not extrapolate', () => {
  const result = followingForecast(frame([
    { minuteOffset: 10, value: 910 }, { minuteOffset: 60, value: 1000 },
  ]), 'physics', 30, envelope)
  assert.deepEqual(result, { offset: 10, forecast: 910, shortened: true, upper: 912, lower: 908 })
})

test('a missing endpoint does not silently reuse an earlier prediction', () => {
  const result = followingForecast(frame([
    { minuteOffset: 10, value: 910 }, { minuteOffset: 30, value: null },
  ]), 'physics', 30, envelope)
  assert.equal(result.offset, 30)
  assert.equal(result.forecast, null)
  assert.equal(result.upper, null)
  assert.equal(result.lower, null)
})

test('missing models or current frames do not invent readings', () => {
  assert.equal(followingForecast(undefined, 'physics', 30).forecast, null)
  assert.equal(followingForecast(frame([{ minuteOffset: 30, value: 940 }]), 'other', 30).offset, null)
  assert.equal(followingForecast(frame([{ minuteOffset: 30, value: NaN }]), 'physics', 30).forecast, null)
})

test('an unavailable error range is distinct from a measured zero-width range', () => {
  const current = frame([{ minuteOffset: 30, value: 940 }])
  assert.equal(followingForecast(current, 'physics', 30).upper, null)
  assert.equal(followingForecast(current, 'physics', 30, { offsets: [30], halfWidths: [0], sampleCounts: [1] }).upper, null)
  assert.equal(followingForecast(current, 'physics', 30, { offsets: [30], halfWidths: [0], sampleCounts: [2] }).upper, 940)
})

test('the tooltip flips to the left near the end and stays within the chart', () => {
  const size = [248, 210], view = [1000, 360]
  for (const anchor of [[0, 0], [500, 180], [999, 359], [-10, 400]]) {
    const point = followingTooltipPosition(anchor, size, view)
    assert.ok(point.left >= 8 && point.left + size[0] <= view[0] - 8)
    assert.ok(point.top >= 8 && point.top + size[1] <= view[1] - 8)
  }
  assert.ok(followingTooltipPosition([999, 180], size, view).left < 999)
})
