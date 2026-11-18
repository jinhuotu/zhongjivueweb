import assert from 'node:assert/strict'
import test from 'node:test'
import { replayDeviations, replayFuelVolume } from '../src/lib/kiln-replay-comparison.ts'

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
