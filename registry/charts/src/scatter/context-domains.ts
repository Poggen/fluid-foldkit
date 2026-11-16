import type { ScaleLinear } from 'd3-scale'
import type { ChartPositionScaleOptions } from '@tanstack/charts'
import { axisId } from '../cartesian/series'
import type { YScaleId } from '../cartesian/build-state'
import type { YAxisConfig, GridProps } from '../cartesian/axis-options'
import { gridLineStyle } from '../cartesian/grid-guides'
import type { gridRowGuides } from '../cartesian/grid-guides'
import { DateTime, Schema } from 'effect'
import type { CartesianLayer } from '../cartesian/layers'
import type { Margin } from '../cartesian/context-types'
import { resolveScatterSeries, scatterYDomain } from './series'

const isCoordinate = Schema.is(Schema.Finite)

const date = (value: number): Date => DateTime.toDateUtc(DateTime.makeUnsafe(Math.trunc(value)))

interface ScatterDomainResolution {
  readonly min: number
  readonly max: number
  readonly span: number
  readonly yDomains: Readonly<Record<string, readonly [number, number]>>
}

/** The Source scatter context resolves domains before the first measured draw. */
export function projectScatterDomains<Row extends Readonly<Record<string, unknown>>>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  x: (row: Row) => Date,
) {
  const series = resolveScatterSeries(children)
  const xPad = (series.length > 0 ? Math.max(...series.map((item) => item.radius)) : 5) + 10
  let lastData: ReadonlyArray<Row> | undefined
  let resolved: ScatterDomainResolution | undefined

  return (data: ReadonlyArray<Row>, width: number, margin: Margin) => {
    if (resolved === undefined || lastData !== data) {
      const times = data.map((row) => x(row).getTime())
      const min = times.length > 0 ? Math.min(...times) : 0
      const max = times.length > 0 ? Math.max(...times) : 1
      const values = new Map<string, Array<number>>()

      for (const item of series) {
        const axis = values.get(item.yAxisId) ?? []

        for (const row of data) {
          const coordinate = row[item.dataKey]
          axis.push(isCoordinate(coordinate) ? coordinate : Number.NaN)
        }

        values.set(item.yAxisId, axis)
      }

      if (!values.has('left')) {
        values.set('left', [])
      }

      resolved = {
        min,
        max,
        span: Math.max(1, max - min),
        yDomains: Object.fromEntries([...values].map(([id, axis]) => [id, scatterYDomain(axis)])),
      }
      lastData = data
    }

    const plot = Math.max(1, width - margin.left - margin.right - xPad * 2)
    const pad = (xPad * resolved.span) / plot

    const xDomain: readonly [Date, Date] =
      resolved.min === resolved.max
        ? [date(resolved.min - 1), date(resolved.max + 1)]
        : [date(resolved.min - pad), date(resolved.max + pad)]

    return {
      xDomain,
      yDomains: resolved.yDomains,
      lines: series.map((item) => ({
        dataKey: item.dataKey,
        stroke: item.tooltipColor,
        strokeWidth: 0,
        yAxisId: item.yAxisId,
      })),
    }
  }
}

export function scatterYScales(
  sourceScales: ReadonlyMap<string, ScaleLinear<number, number>>,
  yAxes: ReadonlyArray<YAxisConfig>,
  guides: ReturnType<typeof gridRowGuides>,
  grid: GridProps | undefined,
) {
  const scales: Partial<Record<YScaleId, ChartPositionScaleOptions<number>>> = {}

  for (const [id, sourceScale] of sourceScales) {
    const axis = yAxes.find((candidate) => axisId(candidate.yAxisId) === id)
    const primary = id === 'left'
    const ticks = { count: primary ? guides.count : (axis?.numTicks ?? 5) }
    const side = primary ? axis?.orientation : (axis?.orientation ?? 'right')
    const scaleId: YScaleId = primary ? 'y' : `y:${id}`

    let scaleOption: ChartPositionScaleOptions<number> = {
      scale: sourceScale,
      grid: primary && guides.native && grid !== undefined ? gridLineStyle(grid) : false,
      axis:
        axis === undefined
          ? { line: false, ticks: { ...ticks, size: 0 }, tickLabels: false }
          : {
              line: false,
              ticks: {
                ...ticks,
                size: 0,
                format: (value: number) =>
                  axis.formatValue?.(value) ??
                  (axis.formatLargeNumbers !== false && Math.abs(value) >= 1000
                    ? `${(value / 1000).toFixed(0)}k`
                    : String(value)),
              },
              tickLabels: false,
            },
    }

    if (!primary) {
      scaleOption = { ...scaleOption, channel: 'y' }
    }

    if (side !== undefined) {
      scaleOption = { ...scaleOption, side }
    }

    scales[scaleId] = scaleOption
  }

  return scales
}
