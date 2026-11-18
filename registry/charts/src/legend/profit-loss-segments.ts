import { Schema } from 'effect'
import { sourceDate } from '../cartesian/source-date'

const resolveSign: (value: number, fallback: SegmentSign) => SegmentSign = function resolveSign(
  value: number,
  fallback: SegmentSign,
) {
  if (value > 0) {
    return 'positive'
  }

  return value < 0 ? 'negative' : fallback
}

const findInitialSign: (data: Array<Record<string, unknown>>, dataKey: string) => SegmentSign =
  function findInitialSign(data: Array<Record<string, unknown>>, dataKey: string) {
    for (const row of data) {
      const value = row[dataKey]

      if (isNumber(value)) {
        if (value > 0) {
          return 'positive'
        }

        if (value < 0) {
          return 'negative'
        }
      }
    }

    return 'positive'
  }

/** Pure synchronous Source boundary. Metadata is only read, grouped, shallow-spread and returned. */
export const splitProfitLossSegments: (
  argument0: SplitProfitLossSegmentsOptions,
) => Array<SplitProfitLossSegment> = function splitProfitLossSegments({
  data,
  dataKey,
  xDataKey = 'date',
  xAccessor,
}: SplitProfitLossSegmentsOptions) {
  const { 0: firstPoint } = data

  if (!firstPoint) {
    return []
  }

  const segments: Array<SplitProfitLossSegment> = []
  let currentSign = findInitialSign(data, dataKey)
  let currentSegment: Array<Record<string, unknown>> = [firstPoint]

  for (let index = 0; index < data.length - 1; index += 1) {
    const a = data[index]
    const b = data[index + 1]

    if (!(a && b)) {
      continue
    }

    let initialA = 0
    let initialB = 0
    let bIsNumber = false

    const admitA = (input: unknown): input is number => {
      if (!isNumber(input)) {
        return false
      }

      initialA = input

      return true
    }

    const admitB = (input: unknown): input is number => {
      if (!isNumber(input)) {
        return false
      }

      initialB = input
      bIsNumber = true

      return true
    }

    let crossing: Record<string, unknown> | undefined

    if (admitA(a[dataKey])) {
      if (
        admitB(b[dataKey]) &&
        initialA !== 0 &&
        initialB !== 0 &&
        Math.sign(initialA) !== Math.sign(initialB)
      ) {
        const freshA = a[dataKey]
        const freshB = b[dataKey]
        const t = freshA / (freshA - freshB)
        const start = xAccessor(a).getTime()
        const end = xAccessor(b).getTime()

        crossing = { ...a, [xDataKey]: sourceDate(start + t * (end - start)), [dataKey]: 0 }
      }
    } else {
      admitB(b[dataKey])
    }

    if (crossing !== undefined) {
      currentSegment.push(crossing)
      segments.push({ data: currentSegment, isPositive: currentSign === 'positive' })
      currentSegment = [crossing, b]
      currentSign = resolveSign(initialB, currentSign)
      continue
    }

    currentSegment.push(b)

    if (bIsNumber && initialB !== 0) {
      currentSign = resolveSign(initialB, currentSign)
    }
  }

  segments.push({ data: currentSegment, isPositive: currentSign === 'positive' })

  return segments
}

/** Source's opaque metadata facade; never a chart Model or engine row codec. */
export interface SplitProfitLossSegmentsOptions {
  data: Array<Record<string, unknown>>
  dataKey: string
  xDataKey?: string
  xAccessor: (row: Record<string, unknown>) => Date
}

/** Crossings overwrite dynamic keys and therefore cannot truthfully promise the caller's Row type. */
export interface SplitProfitLossSegment {
  data: Array<Record<string, unknown>>
  isPositive: boolean
}

type SegmentSign = 'positive' | 'negative'

const isNumber = Schema.is(Schema.Number)
