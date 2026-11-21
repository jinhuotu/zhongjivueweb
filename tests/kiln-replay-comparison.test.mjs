import assert from 'node:assert/strict'
import test from 'node:test'
import { replayAlgorithmFuelVolume, replayDeviations, replayFuelVolume } from '../src/lib/kiln-replay-comparison.ts'

const point = (minuteOffset, value) => ({ minuteOffset, value })

test('rolling deviations only compare matching timestamps', () => {
  const rows = replayDeviations([point(1.00000001, 40), point(4, 50)],
    [point(1, 41), point(5, 52)], [point(1, 37), point(4, 53)])
  assert.deepEqual(rows.map(row => [row.minute, row.algorithmDeviation, row.mechanismDeviation]),
    [[1, 1, -3], [4, null, 3], [5, null, null]])
})

test('rolling cumulative use integrates each window and exposes gaps', () => {
  const full = Array.from({ length: 31 }, (_, minute) => point(minute, 60))
  assert.deepEqual(replayFuelVolume(full, 5, 1), { volume: 5, covered: 5, complete: true })
  assert.deepEqual(replayFuelVolume(full, 30, 1), { volume: 30, covered: 30, complete: true })
  assert.deepEqual(replayFuelVolume([point(0, 60), point(1, 60), point(4, 60), point(5, 60)], 5, 1),
    { volume: 2, covered: 2, complete: false })
})

test('a thirty-minute model with minute outputs can integrate gas and calculate deviation', () => {
  const prediction = Array.from({ length: 31 }, (_, minute) => point(minute, 60))
  const measured = prediction.map(p => ({ ...p, value: 54 }))
  const forecast = replayAlgorithmFuelVolume(prediction, 30, 30, 'multiOutput')
  const actual = replayFuelVolume(measured, 30, 1)
  assert.deepEqual(forecast, { volume: 30, covered: 30, complete: true })
  assert.equal(actual.complete, true)
  assert.ok(Math.abs(forecast.volume - actual.volume - 3) < 1e-9)
  assert.deepEqual(replayAlgorithmFuelVolume(prediction, 5, 30, 'multiOutput'), { volume: 5, covered: 5, complete: true })
})

test('sparse old gas models and missing minutes do not fabricate cumulative predictions', () => {
  assert.deepEqual(replayAlgorithmFuelVolume([point(0, 60), point(30, 60)], 30, 30, 'fixedHorizon'),
    { volume: null, covered: 0, complete: false })
  const prediction = Array.from({ length: 31 }, (_, minute) => point(minute, minute === 10 ? null : 60))
  assert.equal(replayAlgorithmFuelVolume(prediction, 30, 30, 'multiOutput').complete, false)
  const full = prediction.map(p => ({ ...p, value: 60 }))
  assert.deepEqual(replayAlgorithmFuelVolume(full, 60, 30, 'multiOutput'), { volume: 30, covered: 30, complete: false })
  assert.deepEqual(replayAlgorithmFuelVolume([0, 5, 10, 15, 20, 25, 30].map(t => point(t, 60)), 30, 30, 'fixedHorizon'),
    { volume: 30, covered: 30, complete: true })
})
