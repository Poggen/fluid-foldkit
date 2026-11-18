import { bklitYDomain, toNumber } from './domains'
import { mergeProjectionDomains } from './projection-marks'
import type { ResolvedSeries } from './series'
import type { ChartSkeletonDatum } from './skeleton'
import type { Domains } from './state'
import { scaleLinear, scaleUtc } from 'd3-scale'
import type { ChartPositionScaleOptions, ChartAxisTickLabelOptions } from '@tanstack/charts'
import type { GridProps, XAxisConfig, YAxisConfig } from './axis-options'
import { axisId, DEFAULT_Y_AXIS_ID, toDate } from './series'
import { gridLineStyle } from './grid-guides'
import type { gridRowGuides } from './grid-guides'
import { dataTickValues } from './data-ticks'

const axisFormat: (axis: YAxisConfig) => (value: number) => string = function axisFormat(
  axis: YAxisConfig,
) {
  return (
    axis.formatValue ??
    ((value) =>
      axis.formatLargeNumbers !== false && Math.abs(value) >= 1000
        ? `${(value / 1000).toFixed(0)}k`
        : String(value))
  )
}

export const timeSeriesXScale: (
  axis: XAxisConfig | undefined,
  domain: readonly [Date, Date],
  ticks: ReturnType<typeof timeSeriesTicks>,
  format: (value: Date) => string,
  innerHeight: number,
  explicitDomain: boolean,
) => ChartPositionScaleOptions<Date> = function timeSeriesXScale(
  axis: XAxisConfig | undefined,
  domain: readonly [Date, Date],
  ticks: ReturnType<typeof timeSeriesTicks>,
  format: (value: Date) => string,
  innerHeight: number,
  explicitDomain: boolean,
) {
  const base: ChartPositionScaleOptions<Date> = { scale: scaleUtc().domain(domain), grid: false }

  if (axis === undefined) {
    return { ...base, axis: false }
  }

  let labels: ChartAxisTickLabelOptions<Date> = { fontSize: 12, opacity: 1, thin: false }

  if (innerHeight < 1) {
    labels = { ...labels, dy: innerHeight - 1 }
  }

  if (explicitDomain) {
    labels = { ...labels, motion: false }
  }

  return {
    ...base,
    axis: {
      line: false,
      ticks: { ...ticks, size: 0, padding: 14.4, format },
      tickLabels: labels,
    },
  }
}

export function timeSeriesYScales(
  domains: ReadonlyMap<string, readonly [number, number]>,
  axes: ReadonlyArray<YAxisConfig>,
  rowGuides: ReturnType<typeof gridRowGuides>,
  grid: GridProps | undefined,
) {
  const scales: Record<`y:${string}`, ChartPositionScaleOptions<number>> = {}
  let primaryY: ChartPositionScaleOptions<number> | undefined

  for (const [id, domain] of domains) {
    const axis = axes.find((child) => axisId(child.yAxisId) === id)
    const primary = id === DEFAULT_Y_AXIS_ID
    const ticks = { count: primary ? rowGuides.count : (axis?.numTicks ?? 5), size: 0 }

    let scale: ChartPositionScaleOptions<number> = {
      scale: scaleLinear().domain(domain),
      axis: {
        line: false,
        ticks: axis === undefined ? ticks : { ...ticks, format: axisFormat(axis) },
        tickLabels: axis === undefined ? false : { fontSize: 12, opacity: 1, thin: false },
      },
      grid: primary && rowGuides.native && grid !== undefined ? gridLineStyle(grid) : false,
    }

    if (!primary) {
      scale = { ...scale, channel: 'y', side: axis?.orientation ?? 'right' }
    } else if (axis?.orientation !== undefined) {
      scale = { ...scale, side: axis.orientation }
    }

    if (primary) {
      primaryY = scale
    } else {
      scales[`y:${id}`] = scale
    }
  }

  return { scales, primaryY }
}

export function timeSeriesTicks<Row>(
  rows: ReadonlyArray<Row>,
  x: (row: Row) => Date,
  axis: XAxisConfig | undefined,
  xDomain: readonly [Date, Date],
  explicitDomain: readonly [Date, Date] | undefined,
  overlaysWidenX = false,
) {
  if (overlaysWidenX) {
    const count = axis?.numTicks ?? 5
    const first = xDomain[0].getTime()
    const span = xDomain[1].getTime() - first
    return {
      values: Array.from({ length: count }, (_, index) =>
        toDate(first + (span * index) / Math.max(1, count - 1)),
      ),
    }
  }
  const visibleRows =
    explicitDomain === undefined
      ? rows
      : rows.filter((row) => {
          const time = x(row).getTime()

          return time >= xDomain[0].getTime() && time <= xDomain[1].getTime()
        })

  return axis?.tickMode === 'domain'
    ? { count: axis.numTicks ?? 5 }
    : { values: dataTickValues(visibleRows, x, axis?.numTicks ?? 5, explicitDomain) }
}

export function seriesYValues<Row>(
  rows: ReadonlyArray<Row>,
  skeletonRows: ReadonlyArray<ChartSkeletonDatum>,
  series: ReadonlyArray<ResolvedSeries>,
  valueOf: (row: Row, series: ResolvedSeries) => number,
) {
  const values = new Map<string, Array<number>>()

  for (const item of series) {
    const bucket = values.get(item.yAxisId) ?? []

    bucket.push(
      ...rows.map((row) => valueOf(row, item)),
      ...skeletonRows.map((row) => toNumber(row[item.dataKey])),
    )
    values.set(item.yAxisId, bucket)
  }

  if (!values.has(DEFAULT_Y_AXIS_ID)) {
    values.set(DEFAULT_Y_AXIS_ID, [])
  }

  return values
}

export function timeSeriesYDomains(
  values: Map<string, Array<number>>,
  extras: ReadonlyArray<number>,
  projections: ReadonlyMap<string, ReadonlyArray<number>>,
  from: Domains | undefined,
  fixed: Domains = {},
) {
  values.get(DEFAULT_Y_AXIS_ID)?.push(...extras)

  const inferred = mergeProjectionDomains(
    Object.fromEntries([...values].map(([id, entries]) => [id, bklitYDomain(entries)])),
    projections,
  )

  const targetY = { ...inferred, ...fixed }
  const fixedByAxis = new Map(Object.entries(fixed))
  const yDomains = new Map(
    Object.entries(targetY).map(([id, domain]) => [
      id,
      fixedByAxis.get(id) ?? from?.[id] ?? domain,
    ]),
  )

  return { targetY, yDomains }
}
