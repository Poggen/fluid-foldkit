import { expect, it } from 'vitest'
import { DateTime } from 'effect'
import {
  mergeProjectionXDomainMax,
  mergeProjectionYDomain,
  computeReferenceAreaRect,
} from '../src/index'
import type { ComputeReferenceAreaRectOptions, ProjectionLineConfig } from '../src/index'

const dateAt = (milliseconds: number) => DateTime.toDateUtc(DateTime.makeUnsafe(milliseconds))

const invalidDate = () => {
  const date = dateAt(0)

  date.setTime(Number.NaN)

  return date
}

const projectionWithValue: (value: number) => Array<ProjectionLineConfig> = (value: number) => [
  { yAxisId: 'left', data: [{ date: dateAt(0), value }] },
]

it('preserves the original y-domain on no extents and filters axes before reading selected paths', () => {
  const trace: Array<string> = []

  const selected: ProjectionLineConfig = {
    get yAxisId() {
      trace.push('axis:left')

      return 'left'
    },
    get data() {
      trace.push('data:left')

      return [{ date: dateAt(0), value: 10 }]
    },
  }

  const ignored: ProjectionLineConfig = {
    get yAxisId() {
      trace.push('axis:right')

      return 'right'
    },
    get data(): never {
      throw new Error('Unselected projection data must not be read')
    },
  }

  const domain: [number, number] = [2, 8]

  expect(mergeProjectionYDomain(domain, [], 'left')).toBe(domain)
  expect(mergeProjectionYDomain(domain, [{ yAxisId: 'left', data: [] }], 'left')).toBe(domain)
  expect(
    mergeProjectionYDomain(
      domain,
      [{ yAxisId: 'left', data: [{ date: dateAt(0), value: Number.NaN }] }],
      'left',
    ),
  ).toBe(domain)
  expect(mergeProjectionYDomain(domain, [selected, ignored], 'left')).toEqual([0, 11])
  expect(trace).toEqual(['axis:left', 'axis:right', 'data:left'])
  expect(domain).toEqual([2, 8])
})

it('retains non-niced projection padding, positive zero anchor and flat negative padding fallback', () => {
  expect(mergeProjectionYDomain([-10, -5], projectionWithValue(10), 'left')).toEqual([-11, 11])
  expect(mergeProjectionYDomain([0, 0], projectionWithValue(0), 'left')).toEqual([0, 100])
  expect(mergeProjectionYDomain([-1, -1], projectionWithValue(-1), 'left')).toEqual([-2, 0])
  expect(mergeProjectionYDomain([2, 8], projectionWithValue(10), 'right')).toEqual([2, 8])
})

it('extends the maximum date only and retains empty/invalid-date and nonfinite extent comparisons', () => {
  const config: Array<ProjectionLineConfig> = [
    {
      yAxisId: 'left',
      data: [
        { date: dateAt(1000), value: 0 },
        { date: dateAt(5000), value: 1 },
        { date: invalidDate(), value: 2 },
      ],
    },
  ]

  expect(mergeProjectionXDomainMax(3000, config)).toBe(5000)
  expect(mergeProjectionXDomainMax(6000, config)).toBe(6000)
  expect(mergeProjectionXDomainMax(3000, [])).toBe(3000)
  expect(
    mergeProjectionXDomainMax(3000, [
      { yAxisId: 'left', data: [{ date: invalidDate(), value: 0 }] },
    ]),
  ).toBe(3000)
  const domain: [number, number] = [1, 2]

  expect(
    mergeProjectionYDomain(
      domain,
      [{ yAxisId: 'left', data: [{ date: dateAt(0), value: Number.POSITIVE_INFINITY }] }],
      'left',
    ),
  ).toBe(domain)
})

it.each([
  [0, 100],
  [-1, 100],
  [100, 0],
  [100, -1],
])('skips scale capabilities for nonpositive plot size %s by %s', (innerWidth, innerHeight) => {
  expect(
    computeReferenceAreaRect({
      innerWidth,
      innerHeight,
      x1: 1,
      y1: 1,
      xScale: () => {
        throw new Error('xScale should not run')
      },
      yScale: () => {
        throw new Error('yScale should not run')
      },
    }),
  ).toBeNull()
})

it('uses missing bounds as plot edges without invoking scale capabilities', () => {
  expect(
    computeReferenceAreaRect({
      innerWidth: 100,
      innerHeight: 80,
      xScale: () => {
        throw new Error('Missing x must use the edge')
      },
      yScale: () => {
        throw new Error('Missing y must use the edge')
      },
    }),
  ).toEqual({ x: 0, y: 0, width: 100, height: 80 })
})

it('preserves original Date identity, numeric TimeClip and x-before-y scale call ordering', () => {
  const trace: Array<string> = []
  const dates: Array<Date> = []
  const original = dateAt(40)

  const options: ComputeReferenceAreaRectOptions = {
    innerWidth: 100,
    innerHeight: 80,
    x1: original,
    x2: 10.9,
    y1: 60,
    y2: 20,
    xScale: (date) => {
      dates.push(date)
      trace.push(`x:${date.getTime()}`)

      return date.getTime()
    },
    yScale: (value) => {
      trace.push(`y:${value}`)

      return value
    },
  }

  expect(computeReferenceAreaRect(options)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
  expect(trace).toEqual(['x:40', 'x:10', 'y:60', 'y:20'])
  expect(dates[0]).toBe(original)
  expect(dates[1]).toBeInstanceOf(Date)
})

it('passes invalid Date values to the scale and retains resulting NaN geometry', () => {
  const seen: Array<Date> = []
  const invalid = invalidDate()

  const options: ComputeReferenceAreaRectOptions = {
    innerWidth: 100,
    innerHeight: 80,
    x1: invalid,
    x2: Number.POSITIVE_INFINITY,
    xScale: (date) => {
      seen.push(date)

      return date.getTime()
    },
    yScale: (value) => value,
  }

  expect(computeReferenceAreaRect(options)).toEqual({
    x: Number.NaN,
    y: 0,
    width: Number.NaN,
    height: 80,
  })
  expect(seen[0]).toBe(invalid)
  expect(Number.isNaN(seen[1]?.getTime())).toBe(true)
})

it('retains hidden clipping, visible overflow, discard boundaries and fully clipped rejection', () => {
  const options: ComputeReferenceAreaRectOptions = {
    innerWidth: 100,
    innerHeight: 80,
    x1: -10,
    x2: 120,
    y1: -20,
    y2: 100,
    xScale: (date) => date.getTime(),
    yScale: (value) => value,
  }

  expect(computeReferenceAreaRect(options)).toEqual({ x: 0, y: 0, width: 100, height: 80 })
  expect(computeReferenceAreaRect({ ...options, ifOverflow: 'visible' })).toEqual({
    x: -10,
    y: -20,
    width: 130,
    height: 120,
  })
  expect(computeReferenceAreaRect({ ...options, ifOverflow: 'discard' })).toBeNull()
  expect(
    computeReferenceAreaRect({ ...options, x1: 0, x2: 100, y1: 0, y2: 80, ifOverflow: 'discard' }),
  ).toEqual({ x: 0, y: 0, width: 100, height: 80 })
  expect(computeReferenceAreaRect({ ...options, x1: 110, x2: 120 })).toBeNull()
  expect(computeReferenceAreaRect({ ...options, x1: 5, x2: 5 })).toBeNull()
})

it('clones a genuine Date with a different prototype before invoking the scale', () => {
  const original = dateAt(40)
  const received: Array<Date> = []

  Object.setPrototypeOf(original, null)

  expect(original instanceof Date).toBe(false)
  expect(Date.prototype.getTime.call(original)).toBe(40)
  expect(
    computeReferenceAreaRect({
      innerWidth: 100,
      innerHeight: 80,
      x1: original,
      x2: 100,
      xScale: (date) => {
        received.push(date)

        return date.getTime()
      },
      yScale: (value) => value,
    }),
  ).toEqual({ x: 40, y: 0, width: 60, height: 80 })
  expect(received[0] === original).toBe(false)
  expect(received[0]).toBeInstanceOf(Date)
})
