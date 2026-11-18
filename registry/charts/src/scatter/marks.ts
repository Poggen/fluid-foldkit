import { Schema } from 'effect'
import { dot } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { yScaleForAxis } from '../cartesian/build-state'
import type { YScaleId, SeriesMark } from '../cartesian/build-state'
import type { ScatterSeries } from './series'
import type { ScatterMarkRole } from './paint'

/** The dot marks of one series (outline ring, disc + ring, or separate ring) with their per-datum entrance. */
export const seriesMarks: <Row extends Readonly<Record<string, unknown>>>(
  s: ScatterSeries,
  deps: SeriesMarksInput<Row>,
) => Array<ChartMark<Row, Date, number, Date, number, 'x', YScaleId>> = function seriesMarks<
  Row extends Readonly<Record<string, unknown>>,
>(s: ScatterSeries, deps: SeriesMarksInput<Row>) {
  const { input, data, xOf, colorDomain, colorRange } = deps
  const { revealed } = input
  const marks: Array<ChartMark<Row, Date, number, Date, number, 'x', YScaleId>> = []

  const yOf: (d: Row) => number = (d: Row) => {
    const value = d[s.dataKey]

    return isFiniteNumber(value) ? value : Number.NaN
  }

  const indices = revealed
    ? data.flatMap((d, index) => (Number.isFinite(yOf(d)) ? [index] : []))
    : []

  const rows = indices.flatMap((index) => (data[index] === undefined ? [] : [data[index]]))

  const keyOf: (_d: Row, argument1: { index: number }) => string = (
    _d: Row,
    { index }: { index: number },
  ) => `${s.dataKey}:${indices[index]}` satisfies string

  const pre = s.dim ? '' : 'nodim:'

  const common = {
    ...yScaleForAxis(s.yAxisId),
    x: xOf,
    z: () => s.dataKey satisfies string,
  }

  if (s.outlineWidth > 0) {
    const ringOuter = s.ringWidth > 0 ? s.radius + s.ringGap + s.ringWidth : s.radius
    marks.push(
      deps.present(
        dot(rows, {
          ...common,
          motion: false,
          id: `${pre}${s.dataKey}:outline`,
          y: yOf,
          key: keyOf,
          r: ringOuter + s.outlineWidth / 2,
          fill: 'none',
          stroke: s.outlineColor,
          strokeWidth: s.outlineWidth,
        }),
        'outline',
        indices,
      ),
    )
  }

  if (s.ringWidth > 0 && s.stroke === s.fill) {
    const discKey = `${s.dataKey}:disc`
    const ringKey = `${s.dataKey}:ring`
    colorDomain.push(discKey, ringKey)
    colorRange.push(s.fill, 'none')
    marks.push(
      deps.present(
        dot(
          rows.flatMap((d) => [d, d]),
          {
            ...common,
            motion: false,
            id: `${pre}${s.dataKey}`,
            y: yOf,
            color: (_d: Row, { index }: { index: number }) => (index % 2 === 0 ? discKey : ringKey),
            key: (d: Row, { index }: { index: number }) =>
              `${keyOf(d, { index: Math.floor(index / 2) })}:${index % 2}`,
            r: (_d: Row, { index }: { index: number }) =>
              index % 2 === 0 ? s.radius : s.radius + s.ringGap + s.ringWidth / 2,
            stroke: s.stroke,
            strokeWidth: s.ringWidth,
          },
        ),
        'paired',
        indices,
      ),
    )
  } else {
    marks.push(
      deps.present(
        dot(rows, {
          ...common,
          motion: false,
          id: `${pre}${s.dataKey}`,
          y: yOf,
          key: keyOf,
          r: s.radius,
          fill: s.fill,
        }),
        'disc',
        indices,
      ),
    )

    if (s.ringWidth > 0) {
      marks.push(
        deps.present(
          dot(rows, {
            ...common,
            motion: false,
            id: `${pre}${s.dataKey}:ring`,
            y: yOf,
            key: keyOf,
            r: s.radius + s.ringGap + s.ringWidth / 2,
            fill: 'none',
            stroke: s.stroke,
            strokeWidth: s.ringWidth,
          }),
          'ring',
          indices,
        ),
      )
    }
  }

  return marks satisfies Array<ChartMark<Row, Date, number, Date, number, 'x', YScaleId>>
}

const isFiniteNumber = Schema.is(Schema.Finite)

interface SeriesMarksInput<Row extends Readonly<Record<string, unknown>>> {
  readonly present: (
    mark: SeriesMark<Row>,
    role: ScatterMarkRole,
    indices: ReadonlyArray<number>,
  ) => SeriesMark<Row>
  readonly input: {
    readonly revealed: boolean
  }
  readonly data: ReadonlyArray<Row>
  readonly xOf: (d: Row) => Date
  readonly colorDomain: Array<string>
  readonly colorRange: Array<string>
}
