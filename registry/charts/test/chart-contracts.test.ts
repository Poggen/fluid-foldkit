import { DateTime } from 'effect'
import { describe, expect, it } from 'vitest'
import { getHeatmapCalendarRangeStart, resolveHeatmapWeekRange } from '../src/heatmap/calendar'
import { buildHeatmapColorScale, buildHeatmapFillScale } from '../src/heatmap/colors'
import { filterHeatmapColumns, getHeatmapTimeExtent } from '../src/heatmap/columns'
import { computeSquareColumn, topSquareCenterY } from '../src/bar/geometry'

const day = (year: number, month: number, date: number) =>
  DateTime.toDateUtc(
    DateTime.makeZonedUnsafe(
      { year, month, day: date },
      { timeZone: DateTime.zoneMakeLocal(), adjustForTimeZone: true },
    ),
  )
const fields = (date: Date | null) =>
  date === null ? null : [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()]

describe('calendar contribution window', () => {
  it('retains the leading partial Sunday week and uses source calendar-month ranges', () => {
    const range = resolveHeatmapWeekRange(day(2026, 11, 2))
    expect(fields(range.rangeStart)).toEqual([2025, 12, 1, 0])
    expect(fields(range.startDate)).toEqual([2025, 11, 30, 0])
    expect(range.weekCount).toBe(49)
    expect(fields(getHeatmapCalendarRangeStart(day(2026, 11, 2), 6))).toEqual([2026, 5, 1, 0])
  })
  it('filters overlapping columns and preserves empty input without fabricated dates', () => {
    const columns = [1, 8, 15].map((date, bin) => ({
      bin,
      bins: [{ bin: 0, count: bin, date: day(2026, 6, date) }],
    }))
    expect(
      filterHeatmapColumns(columns, [day(2026, 6, 5), day(2026, 6, 10)]).map(
        (column) => column.bin,
      ),
    ).toEqual([1])
    expect(getHeatmapTimeExtent([])).toBeNull()
  })
})

it('maps empty and missing contribution counts to the empty level and retains pattern fills', () => {
  const color = buildHeatmapColorScale(['empty', 'one', 'two', 'three', 'many'])
  expect([-1, 0, 1, 2, 3, 4, 100, null, undefined].map(color)).toEqual([
    'empty',
    'empty',
    'one',
    'two',
    'three',
    'many',
    'many',
    'empty',
    'empty',
  ])
  const fill = buildHeatmapFillScale([
    { color: 'empty' },
    { color: 'one' },
    { color: 'two' },
    { color: 'three' },
    { color: 'many', fillMode: 'pattern', pattern: 'diagonal' },
  ])
  expect(fill(100)).toBe('url(#heatmap-level-4)')
})

it('keeps square-column tooltip anchors aligned with quantized and fitted bar tops', () => {
  const quantized = { barLengthPx: 48, squareSize: 10, gap: 2 }
  expect(computeSquareColumn(quantized).columnHeight).toBe(46)
  expect(topSquareCenterY({ ...quantized, baselineY: 100 })).toBe(59)
  expect(topSquareCenterY({ ...quantized, baselineY: 100, fit: true })).toBe(57)
  expect(topSquareCenterY({ barLengthPx: -1, squareSize: 10, gap: 2, baselineY: 100 })).toBe(100)
})
