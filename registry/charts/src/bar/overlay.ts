import { Predicate } from 'effect'
import { useChartConfig } from '../cartesian/chart-config'
import type { BarDatum, BarSeries } from './model'
import type { BarChartProps } from './options'
import type { HoverOverlayModel } from '../cartesian/hover-overlay'
import type { ChartTooltipProps } from '../cartesian/tooltip-options'
import { barEndValues, barOverlayDots, memoBand } from './overlay-geometry'
import { pillLayout } from '../cartesian/date-pill'

export const barOverlay: <Row>(
  props: BarChartProps<Row>,
  datums: ReadonlyArray<BarDatum<Row>>,
  categories: ReadonlyArray<string>,
  series: ReadonlyArray<BarSeries>,
  domain: readonly [number, number],
  tip: ChartTooltipProps<Row>,
) => HoverOverlayModel<Row> = function barOverlay<Row>(
  props: BarChartProps<Row>,
  datums: ReadonlyArray<BarDatum<Row>>,
  categories: ReadonlyArray<string>,
  series: ReadonlyArray<BarSeries>,
  domain: readonly [number, number],
  tip: ChartTooltipProps<Row>,
) {
  const springConfig = tip.springConfig ?? useChartConfig(props.environment).tooltipSpring

  const crosshair =
    tip.showCrosshair === false
      ? null
      : {
          color: 'var(--chart-crosshair)',
          dash: undefined,
          width: 1,
          fadeEdges: tip.indicatorFadeEdges ?? 'both',
          fadeLength: tip.indicatorFadeLength ?? 10,
        }

  if (props.orientation === 'horizontal') {
    const ends = barEndValues(datums, props.stacked === true)

    return {
      springConfig,
      crosshair,
      dots: [],
      indexOf: (index) => index,
      pill: null,
      xOf: (index, plot) =>
        (((ends.get(categories[index] ?? '') ?? Number.NaN) - domain[0]) /
          (domain[1] - domain[0] || 1)) *
        plot.innerWidth,
    } satisfies HoverOverlayModel<Row>
  }

  const squares = new Map(
    series.flatMap((item) =>
      item.squares === undefined
        ? []
        : [
            [
              item.key,
              {
                gap: item.squares.squareGap ?? 3,
                fit: item.squares.squareFit ?? false,
                groupGap: item.squares.groupGap ?? 4,
              },
            ] satisfies [string, { gap: number; fit: boolean; groupGap: number }],
          ],
    ),
  )

  const bandFor = memoBand(categories, props.barGap ?? 0.2, props.barWidth)

  return {
    springConfig,
    crosshair,
    dots: verticalDots({ props, datums, categories, series, tip, squares }),
    indexOf: (index) => index,
    pill: { labels: categories, layout: pillLayout(categories, () => null) },
    xOf: (index, plot) => bandFor(plot.innerWidth).centre(categories[index] ?? ''),
  } satisfies HoverOverlayModel<Row>
}

function verticalDots<Row>(input: {
  readonly props: BarChartProps<Row>
  readonly datums: ReadonlyArray<BarDatum<Row>>
  readonly categories: ReadonlyArray<string>
  readonly series: ReadonlyArray<BarSeries>
  readonly tip: ChartTooltipProps<Row>
  readonly squares: NonNullable<Parameters<typeof barOverlayDots<Row>>[0]['squares']>
}) {
  const { props, datums, categories, series, tip, squares } = input

  if (tip.showDots === false) {
    return []
  }

  let options: Parameters<typeof barOverlayDots<Row>>[0] = {
    datums,
    categories,
    series,
    barGap: props.barGap ?? 0.2,
    ...(props.barWidth === undefined ? {} : { barWidth: props.barWidth }),
    groupGap: 4,
    stacked: props.stacked === true,
    stackGap: props.stackGap ?? 0,
    squares,
  }

  if (props.squareSnap !== undefined) {
    options = { ...options, squareSnap: props.squareSnap }
  }

  if (tip.dotVariant === 'ring') {
    let ring: NonNullable<typeof options.ring> = {
      fraction: tip.dotRadiusFraction ?? 0.25,
      scale: tip.dotScale ?? 1,
      size: tip.dotSize ?? 5,
      slotGap:
        props.squareSnap?.groupGap ??
        [...squares.values()].at(0)?.groupGap ??
        (series.length > 1 ? 4 : 0),
      strokeWidth: tip.dotStrokeWidth ?? 2,
    }

    if (Predicate.isString(tip.dotColor)) {
      ring = { ...ring, color: tip.dotColor }
    }

    options = { ...options, ring }
  }

  return barOverlayDots(options)
}
