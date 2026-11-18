import { DateTime } from 'effect'
import { expect, test } from 'vitest'
import { timeSeriesTicks } from '../time-series-scales'

const date = (value: string) => DateTime.toDateUtc(DateTime.makeUnsafe(value))
const rows = [{ date: date('2026-01-01') }, { date: date('2026-01-02') }]
const x = (row: (typeof rows)[number]) => row.date

test('forecast ticks include both domain endpoints and divide the extended range evenly', () => {
  const domain = [date('2026-01-01'), date('2026-01-07')] as const
  const ticks = timeSeriesTicks(rows, x, { numTicks: 5 }, domain, undefined, true)
  expect(ticks.values?.map((value) => value.toISOString())).toEqual([
    '2026-01-01T00:00:00.000Z',
    '2026-01-02T12:00:00.000Z',
    '2026-01-04T00:00:00.000Z',
    '2026-01-05T12:00:00.000Z',
    '2026-01-07T00:00:00.000Z',
  ])
  expect(timeSeriesTicks(rows, x, { numTicks: 5 }, domain, undefined).values).toEqual(rows.map(x))
})
