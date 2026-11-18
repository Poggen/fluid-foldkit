import { scaleLinear } from 'd3-scale'
import type { ScaleBand } from 'd3-scale'
import type { ChartPositionScaleOptions } from '@tanstack/charts'
import type { BarValue } from './definition'
import type { BarXAxisProps, BarYAxisProps } from './options'
import type { GridProps, YAxisConfig } from '../cartesian/axis-options'
import { barAxisId } from './model'
import type { Domains } from '../cartesian/state'
import { gridRowGuides, gridLineStyle } from '../cartesian/grid-guides'

const valueScaleFor: (
  argument0: BarScaleInputs,
  yAxis: YAxisConfig | undefined,
  grid: GridProps | undefined,
  rowGuides: ReturnType<typeof gridRowGuides> | undefined,
) => ChartPositionScaleOptions<BarValue> = function valueScaleFor(
  { domain, horizontal }: BarScaleInputs,
  yAxis: YAxisConfig | undefined,
  grid: GridProps | undefined,
  rowGuides: ReturnType<typeof gridRowGuides> | undefined,
) {
  let valueScale: ChartPositionScaleOptions<BarValue> = {
    scale: scaleLinear().domain(domain),
    grid:
      grid !== undefined && (rowGuides?.native ?? grid.vertical !== false)
        ? gridLineStyle(grid)
        : false,
    axis: false,
  }

  if (!horizontal) {
    valueScale = {
      ...valueScale,
      side: yAxis?.orientation ?? 'left',
    }
  }

  return valueScale
}

interface BarScaleInputs {
  readonly xAxis: BarXAxisProps | undefined
  readonly yAxis: BarYAxisProps | undefined
  readonly numericAxis: YAxisConfig | undefined
  readonly numericAxes: ReadonlyArray<YAxisConfig>
  readonly domains: Domains
  readonly grid: GridProps | undefined
  readonly horizontal: boolean
  readonly categories: ReadonlyArray<string>
  readonly categoryBand: ScaleBand<string>
  readonly bandWidth: number
  readonly domain: readonly [number, number]
  readonly innerHeight: number
}

function categoryScaleFor(
  { categories, categoryBand, horizontal }: BarScaleInputs,
  labelAxis: BarXAxisProps | BarYAxisProps | undefined,
) {
  const showAll = labelAxis?.showAllLabels ?? horizontal
  const maxLabels = labelAxis?.maxLabels ?? (horizontal ? 20 : 12)

  const tickValues =
    labelAxis === undefined || showAll || categories.length <= maxLabels
      ? undefined
      : categories.filter((_, index) => index % Math.ceil(categories.length / maxLabels) === 0)

  const categoryScale: ChartPositionScaleOptions<BarValue> = {
    scale: categoryBand,
    grid: false,
    axis: false,
  }

  return { categoryScale, tickValues }
}

export function buildBarScales(input: BarScaleInputs) {
  const { domain, horizontal, xAxis, numericAxis, grid } = input

  const rowGuides = horizontal
    ? undefined
    : gridRowGuides(
        grid,
        scaleLinear().domain(domain),
        numericAxis !== undefined,
        numericAxis?.numTicks,
      )

  const { categoryScale, tickValues } = categoryScaleFor(input, horizontal ? undefined : xAxis)
  let valueScale = valueScaleFor(input, numericAxis, grid, rowGuides)
  if (xAxis?.type === 'number') {
    if (!horizontal) throw new TypeError('Numeric BarXAxis requires horizontal orientation')
    valueScale = {
      ...valueScale,
      axis: {
        line: false,
        ticks: {
          count: 5,
          size: 0,
          format: (value) => xAxis.formatValue?.(Number(value)) ?? String(value),
        },
        tickLabels: { fontSize: 12, opacity: 1, thin: false },
      },
    }
  }

  const valueScales: Record<`y:${string}`, ChartPositionScaleOptions<BarValue>> = {}
  if (!horizontal) {
    for (const [id, domain] of Object.entries(input.domains)) {
      if (id === 'left') continue
      const axis = input.numericAxes.find((item) => barAxisId(item.yAxisId) === id)
      valueScales[`y:${id}`] = {
        ...valueScaleFor({ ...input, domain }, axis, undefined, undefined),
        channel: 'y',
      }
    }
  }
  return { categoryScale, valueScale, valueScales, rowGuides, tickValues }
}
