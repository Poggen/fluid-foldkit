import type { ChartTooltipProps } from '../cartesian/tooltip-options'
import type { ScatterSeries } from './series'
import type { PillLayout } from '../cartesian/date-pill'
import type { HoverOverlayModel, OverlayDot } from '../cartesian/hover-overlay'
import { Option, Predicate, Schema } from 'effect'
import { scatterRolePaint } from './paint'

const shortDateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

const finiteNumber = Schema.decodeUnknownOption(Schema.Finite)

const colorOr = <Row>(value: ChartTooltipProps<Row>['dotColor'], fallback: string): string =>
  Predicate.isString(value) ? value : fallback

interface TooltipModelInput<Row extends Readonly<Record<string, unknown>>> {
  readonly paintScope: string
  readonly tooltipProps: ChartTooltipProps<Row>
  readonly series: ReadonlyArray<ScatterSeries>
  readonly data: ReadonlyArray<Row>
  readonly xOf: (d: Row) => Date
  readonly pill: PillLayout | null
}

/** The hover indicator for the HoverOverlay the host owns (kit/cartesian/hover-overlay.ts): crosshair rule, the focused point's active-highlight copies (they jump), one tooltip dot per series (they glide) and the date pill. */
export function tooltipOverlay<Row extends Readonly<Record<string, unknown>>>({
  paintScope,
  tooltipProps,
  series,
  data,
  xOf,
  pill,
}: TooltipModelInput<Row>): HoverOverlayModel<Row> {
  const head = series.at(0)
  const labelIndex = new Map<number, number>()

  const labels = data.map((row, i) => {
    labelIndex.set(xOf(row).getTime(), i)

    return shortDateFmt.format(xOf(row))
  })

  const valueOf =
    (dataKey: string) =>
    (row: Row): number | undefined => {
      const value = Option.getOrElse(finiteNumber(row[dataKey]), () => Number.NaN)

      return Number.isFinite(value) ? value : undefined
    }

  // bklit's active highlight: the focused point's markers redrawn on top at activeScale (the dimmed layer keeps its own copy beneath, like bklit). They snap, no tween.
  const dots: Array<OverlayDot<Row>> = []

  for (const [index, s] of series.entries()) {
    if (!s.dim) {
      continue
    }

    const k = s.activeScale
    const ringOuter = s.ringWidth > 0 ? s.radius + s.ringGap + s.ringWidth : s.radius
    dots.push({
      yAxis: s.yAxisId,
      valueOf: valueOf(s.dataKey),
      glide: false,
      shapes: [
        ...(s.outlineWidth > 0
          ? [
              {
                r: (ringOuter + s.outlineWidth / 2) * k,
                fill: 'none',
                stroke: scatterRolePaint(s, paintScope, index, 'outline'),
                strokeWidth: s.outlineWidth * k,
              },
            ]
          : []),
        {
          r: s.radius * k,
          fill: scatterRolePaint(s, paintScope, index, 'disc'),
          stroke: 'none',
          strokeWidth: 0,
        },
        ...(s.ringWidth > 0
          ? [
              {
                r: (s.radius + s.ringGap + s.ringWidth / 2) * k,
                fill: 'none',
                stroke: scatterRolePaint(s, paintScope, index, 'ring'),
                strokeWidth: s.ringWidth * k,
              },
            ]
          : []),
      ],
    })
  }

  // bklit TooltipDot per series: r = dotSize (5), 2px background stroke, springing to the hovered point, painted over the rule.
  if (tooltipProps.showDots !== false) {
    for (const s of series) {
      dots.push({
        yAxis: s.yAxisId,
        valueOf: valueOf(s.dataKey),
        glide: true,
        shapes: [
          {
            r: tooltipProps.dotSize ?? 5,
            fill: colorOr(tooltipProps.dotColor, s.tooltipColor),
            stroke: 'var(--chart-background)',
            strokeWidth: 2,
          },
        ],
      })
    }
  }

  return {
    crosshair:
      head && tooltipProps.showCrosshair !== false
        ? {
            color: colorOr(tooltipProps.indicatorColor, 'var(--chart-crosshair)'),
            dash: tooltipProps.indicatorDasharray,
            fadeEdges: tooltipProps.indicatorFadeEdges ?? 'both',
            fadeLength: tooltipProps.indicatorFadeLength ?? 10,
            width: 1,
          }
        : null,
    dots,
    indexOf: (time) => labelIndex.get(time) ?? 0,
    pill:
      head && pill !== undefined && tooltipProps.showDatePill !== false
        ? { labels, layout: pill }
        : null,
  }
}
