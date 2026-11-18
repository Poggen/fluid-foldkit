import { sourceDate } from '../source-date'
import { Predicate } from 'effect'
import { expect, test } from 'vitest'
import { splitProfitLossSegments } from '@foldkit-visuals/charts'
import type {
  SplitProfitLossSegment,
  SplitProfitLossSegmentsOptions,
} from '@foldkit-visuals/charts'

const xAccessor: SplitProfitLossSegmentsOptions['xAccessor'] = (row) => {
  if (!Predicate.isDate(row.date)) {
    throw new TypeError('Expected test Date')
  }

  return row.date
}

const crossingTime: (row: SplitProfitLossSegment['data'][number] | undefined) => number = (
  row: SplitProfitLossSegment['data'][number] | undefined,
) => {
  const value = row?.date

  if (!Predicate.isDate(value)) {
    throw new TypeError('Expected crossing Date')
  }

  return value.getTime()
}

const callback = () => 'opaque'

test('public splitter preserves original metadata and shared mutable crossing identity', () => {
  const symbol = Symbol('metadata')
  const metadata = { callback }
  const a = { value: 1, date: sourceDate(0), metadata, [symbol]: callback }
  const b = { value: -3, date: sourceDate(100), metadata }
  const segments = splitProfitLossSegments({ data: [a, b], dataKey: 'value', xAccessor })
  const cross = segments[0]?.data[1]

  expect(segments.map((segment) => segment.isPositive)).toEqual([true, false])
  expect(segments[0]?.data[0]).toBe(a)
  expect(segments[1]?.data[1]).toBe(b)
  expect(segments[1]?.data[0]).toBe(cross)
  expect(cross?.metadata).toBe(metadata)
  expect(Object.getOwnPropertyDescriptor(cross ?? {}, symbol)).toMatchObject({
    value: callback,
    enumerable: true,
  })
  expect(cross?.value).toBe(0)
  expect(crossingTime(cross)).toBe(25)
  segments.push({ data: [a], isPositive: true })
  expect(segments).toHaveLength(3)
})

test('fresh numeric-string getter drift and spread retain exact Source read order', () => {
  const trace: Array<string> = []
  let readsA = 0
  let readsB = 0

  const a = {
    date: sourceDate(0),
    get value() {
      trace.push('a')
      readsA += 1

      return readsA <= 2 ? 1 : '6'
    },
  }

  const b = {
    date: sourceDate(100),
    get value() {
      trace.push('b')
      readsB += 1

      return readsB === 1 ? -1 : '-2'
    },
  }

  const accessor: SplitProfitLossSegmentsOptions['xAccessor'] = (row) => {
    trace.push(row === a ? 'x:a' : 'x:b')

    return xAccessor(row)
  }

  const result = splitProfitLossSegments({ data: [a, b], dataKey: 'value', xAccessor: accessor })

  expect(crossingTime(result[0]?.data[1])).toBe(75)
  expect(trace).toEqual(['a', 'a', 'b', 'a', 'b', 'x:a', 'x:b', 'a'])
})

test('interpolation failure precedes accessors while accessor failure precedes spread', () => {
  let reads = 0
  const failure = new Error('x accessor')

  const a = {
    date: sourceDate(0),
    get value() {
      reads += 1

      return reads <= 2 ? 1 : Symbol('drift')
    },
  }

  const b = { date: sourceDate(100), value: -1 }
  let accessorCalls = 0

  expect(() =>
    splitProfitLossSegments({
      data: [a, b],
      dataKey: 'value',
      xAccessor: () => {
        accessorCalls += 1
        throw failure
      },
    }),
  ).toThrow(TypeError)
  expect(accessorCalls).toBe(0)
  const trace: Array<string> = []

  const c = {
    date: sourceDate(0),
    value: 1,
    get metadata() {
      trace.push('spread')

      return 1
    },
  }

  expect(() =>
    splitProfitLossSegments({
      data: [c, b],
      dataKey: 'value',
      xAccessor: () => {
        throw failure
      },
    }),
  ).toThrow(failure)
  expect(trace).toEqual([])
})

test('zero runs inherit sign, missing first returns empty, later initial-scan hole throws', () => {
  const zero = { value: 0, date: sourceDate(0) }
  const negative = { value: -1, date: sourceDate(100) }
  const result = splitProfitLossSegments({ data: [zero, negative], dataKey: 'value', xAccessor })

  expect(result).toEqual([{ data: [zero, negative], isPositive: false }])
  const emptyFirst: Array<{ value: number; date: Date }> = []

  emptyFirst.length = 2

  emptyFirst[1] = negative
  expect(splitProfitLossSegments({ data: emptyFirst, dataKey: 'value', xAccessor })).toEqual([])
  const scanHole: Array<{ value: number; date: Date }> = []

  scanHole.length = 3

  scanHole[0] = zero
  scanHole[2] = negative
  expect(() => splitProfitLossSegments({ data: scanHole, dataKey: 'value', xAccessor })).toThrow(
    TypeError,
  )
  scanHole[0] = { value: 1, date: sourceDate(0) }
  expect(splitProfitLossSegments({ data: scanHole, dataKey: 'value', xAccessor })[0]?.data).toEqual(
    [scanHole[0]],
  )
})

test('NaN and infinities retain invalid crossings; colliding keys leave the final zero', () => {
  for (const value of [Number.NaN, Infinity]) {
    const result = splitProfitLossSegments({
      data: [
        { value, date: sourceDate(0) },
        { value: -1, date: sourceDate(100) },
      ],
      dataKey: 'value',
      xAccessor,
    })

    expect(Number.isNaN(crossingTime(result[0]?.data[1]))).toBe(true)
  }

  const result = splitProfitLossSegments({
    data: [{ value: 1 }, { value: -1 }],
    dataKey: 'value',
    xDataKey: 'value',
    xAccessor: () => sourceDate(0),
  })

  expect(result[0]?.data[1]?.value).toBe(0)
})

test('inherited y fields need get but no has trap and noncrossing rows retain prototypes', () => {
  const gets: Array<string> = []
  const target = {}
  const prototype = { value: 1 }
  Object.setPrototypeOf(target, prototype)

  const a = new Proxy(target, {
    get: (_target, key) => {
      gets.push(String(key))

      return key === 'value' ? prototype.value : undefined
    },
    has: () => {
      throw new Error('Source does not test membership')
    },
  })

  const result = splitProfitLossSegments({
    data: [a, { value: 2 }],
    dataKey: 'value',
    xAccessor: () => {
      throw new Error('No crossing')
    },
  })

  expect(result[0]?.data[0]).toBe(a)
  expect(gets).toEqual(['value', 'value'])
})
