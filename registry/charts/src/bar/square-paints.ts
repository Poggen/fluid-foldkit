import { inertHtml as h } from 'foldkit/html'
import type { ChartViewport } from '../cartesian/viewport'
import type { BarChartProps } from './options'
import type { BarSeries } from './model'
import { buildBarData, configuredBarDomains, resolveBarSeries } from './model'
import { barPlot, barValueScales } from './plot'
import { squareColumnFrame } from './geometry'
import { renderPatternPreset } from '../kit/pattern/presets'
import { patternResourceView, scopedPatternId } from '../kit/pattern/resources'
import type { PatternResource } from '../kit/pattern/types'
import { bklitSurfaceStyle } from '../cartesian/style'

export const hasSquarePaints: <Row>(props: BarChartProps<Row>) => boolean =
  function hasSquarePaints<Row>(props: BarChartProps<Row>) {
    return (props.orientation !== 'horizontal' &&
      props.stacked !== true &&
      resolveBarSeries(props.children).some(
        (series) => series.squares?.useGradient === true,
      )) satisfies boolean
  }

export const squareFill: (uid: string, series: BarSeries, row: number) => string =
  function squareFill(uid: string, series: BarSeries, row: number) {
    const props = series.squares

    if (props?.useGradient !== true) {
      return series.fill
    }

    const ids = squarePaintIds(uid, series.index, row)

    const patterned =
      series.fill.startsWith('url(') &&
      props.patternPreset !== undefined &&
      props.patternPreset !== 'none'

    return `url(#${patterned ? ids.pattern : ids.gradient})`
  }

interface SquareGradient {
  readonly id: string
  readonly baseline: number
  readonly top: number
  readonly stops: ReadonlyArray<{ readonly offset: number; readonly color: string }>
}

const paintId: (series: number, row: number, role: string) => string = (
  series: number,
  row: number,
  role: string,
) => `square-${series}-${row}-${role}`

export function squarePaintIds(uid: string, series: number, row: number) {
  return {
    gradient: scopedPatternId(`${uid}-square-paints`, paintId(series, row, 'gradient')),
    pattern: scopedPatternId(`${uid}-square-paints`, paintId(series, row, 'pattern')),
  }
}

function gradientView(gradient: SquareGradient) {
  return h.keyed('linearGradient')(
    gradient.id,
    [
      h.Id(gradient.id),
      h.Attribute('gradientUnits', 'userSpaceOnUse'),
      h.X1('0'),
      h.X2('0'),
      h.Y1(String(gradient.baseline)),
      h.Y2(String(gradient.top)),
    ],
    gradient.stops.map((stop) => h.stop([h.Offset(`${stop.offset}%`), h.StopColor(stop.color)])),
  )
}

export function squarePaintResources<Row extends Readonly<Record<string, unknown>>>(
  uid: string,
  data: ReadonlyArray<Row>,
  props: BarChartProps<Row>,
  viewport: ChartViewport,
) {
  if (!hasSquarePaints(props)) {
    return h.empty
  }

  const innerWidth = viewport.width - viewport.margin.left - viewport.margin.right
  const innerHeight = viewport.height - viewport.margin.top - viewport.margin.bottom

  if (innerHeight <= 0) {
    return h.empty
  }

  const series = resolveBarSeries(props.children)
  const categories = data.map((row) => String(row[props.xDataKey ?? 'name']))
  const datums = buildBarData(data, props.xDataKey ?? 'name', series, props.missingValues)
  const domains = configuredBarDomains(datums, categories, series, props)
  const domain: readonly [number, number] = domains.left ?? [0, 100]
  const valueScales = barValueScales(domains, innerWidth, innerHeight, false)
  const plot = barPlot(categories, domain, innerWidth, innerHeight, props)
  const gradients: Array<SquareGradient> = []
  const patterns: Array<PatternResource> = []

  for (const item of series) {
    const square = item.squares
    const valueScale = valueScales[item.yAxisId]

    if (square?.useGradient !== true || valueScale === undefined) {
      continue
    }

    for (const datum of datums.filter((value) => value.series === item.key)) {
      const frame = squareColumnFrame({
        centre: (plot.categoryBand(datum.category) ?? Number.NaN) + plot.bandWidth / 2,
        bandwidth: plot.bandWidth,
        baseline: valueScale(0),
        top: valueScale(datum.value),
        value: datum.value,
        slot: item.index,
        slots: series.length,
        groupGap: square.groupGap ?? 4,
        squareGap: square.squareGap ?? 3,
        fit: square.squareFit ?? false,
      })

      if (frame === null) {
        continue
      }

      const ids = squarePaintIds(uid, item.index, datum.index)
      gradients.push({
        id: ids.gradient,

        baseline: viewport.margin.top + frame.baseline,
        top: viewport.margin.top + frame.columnTop,
        stops:
          square.gradientStops !== undefined && square.gradientStops.length >= 2
            ? square.gradientStops
            : [
                { offset: 0, color: item.fill },
                { offset: 100, color: item.fill },
              ],
      })

      if (
        item.fill.startsWith('url(') &&
        square.patternPreset !== undefined &&
        square.patternPreset !== 'none'
      ) {
        const pattern = renderPatternPreset(square.patternPreset, ids.pattern, {
          color: `url(#${ids.gradient})`,
        })

        if (pattern !== undefined) {
          patterns.push(pattern.props)
        }
      }
    }
  }

  return patternResourceView(`${uid}-square-paints`, patterns, gradients.map(gradientView), {
    ...bklitSurfaceStyle,
    ...props.style,
  })
}
