import { isNumber } from '../kit/guards'
import { visibleRows } from './domains'

const decimateTimeSeries: <Row extends Readonly<Record<string, unknown>>>(
  data: ReadonlyArray<Row>,
  maxPoints: number,
  valueKeys?: ReadonlyArray<string>,
) => { readonly rows: ReadonlyArray<Row>; readonly indices: ReadonlyArray<number> } | undefined =
  function decimateTimeSeries<Row extends Readonly<Record<string, unknown>>>(
    data: ReadonlyArray<Row>,
    maxPoints: number,
    valueKeys: ReadonlyArray<string> = [],
  ) {
    const len = data.length

    if (maxPoints >= len || maxPoints < 3) {
      return undefined satisfies
        | { readonly rows: ReadonlyArray<Row>; readonly indices: ReadonlyArray<number> }
        | undefined
    }

    const y: (index: number) => number = (index: number) => {
      const point = data[index]

      if (point === undefined) {
        return index
      }

      if (valueKeys.length === 0) {
        return Object.values(point).find(isNumber) ?? index
      }

      const values = valueKeys.flatMap((key) => {
        const value = point[key]

        return isNumber(value) ? [value] : []
      })

      return values.length > 0
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : index
    }

    const bucketSize = (len - 2) / (maxPoints - 2)
    const picked: Array<number> = [0]
    let previous = 0

    for (let i = 0; i < maxPoints - 2; i += 1) {
      const rangeStart = Math.floor((i + 1) * bucketSize) + 1
      const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, len - 1)

      const next = nextAverage(
        len,
        rangeStart,
        Math.min(Math.floor((i + 3) * bucketSize) + 1, len),
        y,
      )

      const ay = y(previous)
      let maxArea = -1
      let maxIndex = rangeStart

      for (let j = rangeStart; j < rangeEnd; j += 1) {
        const area =
          Math.abs((previous - next.x) * (y(j) - ay) - (previous - j) * (next.y - ay)) * 0.5

        if (area > maxArea) {
          maxArea = area
          maxIndex = j
        }
      }

      picked.push(maxIndex)
      previous = maxIndex
    }

    picked.push(len - 1)

    return {
      indices: picked,
      rows: picked.flatMap((index) => {
        const row = data[index]

        return row === undefined ? [] : [row]
      }),
    } satisfies
      | { readonly rows: ReadonlyArray<Row>; readonly indices: ReadonlyArray<number> }
      | undefined
  }

/** `rows`: the rows in the brushed window, the source of the y domain. `drawRows`: what the marks draw, `data` LTTB-decimated past max(64, 1.5 x innerWidth)
 * (bklit time-series-chart-shell.tsx:309-315) and then windowed. `pathRows`: the line / area rows. Nothing is cut before the plot is measured (a 0 width would reduce a chart to 64 rows for one render). */
export const rowSets: <Row extends Readonly<Record<string, unknown>>>(input: {
  readonly data: ReadonlyArray<Row>
  readonly x: (row: Row) => Date
  readonly xDomain?: readonly [Date, Date]
  readonly innerWidth?: number
  readonly valueKeys: ReadonlyArray<string>
}) => RowSets<Row> = function rowSets<Row extends Readonly<Record<string, unknown>>>(input: {
  readonly data: ReadonlyArray<Row>
  readonly x: (row: Row) => Date
  readonly xDomain?: readonly [Date, Date]
  readonly innerWidth?: number
  readonly valueKeys: ReadonlyArray<string>
}) {
  const { data, x, xDomain, innerWidth } = input
  const rows = visibleRows(data, x, xDomain)

  if (innerWidth === undefined || innerWidth <= 0) {
    return { rows, drawRows: rows, pathRows: data } satisfies RowSets<Row>
  }

  const keys = input.valueKeys
  const sample = decimateTimeSeries(data, maxRenderPointsForWidth(innerWidth), keys)
  const decimated = sample?.rows ?? data
  const drawRows = visibleRows(decimated, x, xDomain)
  const result = { rows, drawRows, pathRows: xDomain ? decimated : drawRows }

  return (
    sample === undefined ? result : { ...result, pathIndices: sample.indices }
  ) satisfies RowSets<Row>
}

/** Keep each missing-run edge and its neighboring observation without replacing the Source sample. */
export const preserveGapRows: <Row>(
  data: ReadonlyArray<Row>,
  sampled: ReadonlyArray<Row>,
  indices: ReadonlyArray<number> | undefined,
  valueOf: (row: Row) => number,
) => ReadonlyArray<Row> = function preserveGapRows<Row>(
  data: ReadonlyArray<Row>,
  sampled: ReadonlyArray<Row>,
  indices: ReadonlyArray<number> | undefined,
  valueOf: (row: Row) => number,
) {
  if (indices === undefined) {
    return sampled satisfies ReadonlyArray<Row>
  }

  let retained: Set<number> | undefined
  let previousDefined: boolean | undefined

  for (const [index, row] of data.entries()) {
    const defined = Number.isFinite(valueOf(row))

    if (previousDefined !== undefined && defined !== previousDefined) {
      retained ??= new Set(indices)
      retained.add(index - 1)
      retained.add(index)
    }

    previousDefined = defined
  }

  return (
    retained === undefined
      ? sampled
      : [...retained]
          .toSorted((a, b) => a - b)
          .flatMap((index) => {
            const row = data[index]

            return row === undefined ? [] : [row]
          })
  ) satisfies ReadonlyArray<Row>
}

const maxRenderPointsForWidth: (innerWidth: number) => number = function maxRenderPointsForWidth(
  innerWidth: number,
) {
  return Math.max(64, Math.ceil(innerWidth * 1.5))
}

const nextAverage: (len: number, from: number, to: number, y: (index: number) => number) => Mean =
  function nextAverage(len: number, from: number, to: number, y: (index: number) => number) {
    if (to <= from) {
      return { x: len - 1, y: y(len - 1) }
    }

    let sumX = 0
    let sumY = 0

    for (let j = from; j < to; j += 1) {
      sumX += j
      sumY += y(j)
    }

    return { x: sumX / (to - from), y: sumY / (to - from) }
  }

interface Mean {
  readonly x: number
  readonly y: number
}

interface RowSets<Row> {
  readonly pathIndices?: ReadonlyArray<number>
  readonly rows: ReadonlyArray<Row>
  readonly drawRows: ReadonlyArray<Row>
  /** What the line / area paths draw: with a window, the whole decimated series (bklit time-series-chart-shell.tsx:294-297), so a window change keeps the path topology and morphs. */
  readonly pathRows: ReadonlyArray<Row>
}
