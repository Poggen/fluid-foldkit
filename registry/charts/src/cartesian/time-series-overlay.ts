import { useChartConfig } from './chart-config'
import { Predicate } from 'effect'
import type { CartesianSnapshot } from './definition'
import type { OverlayDot, OverlayShape, HoverOverlayModel } from './hover-overlay'
import type { ChartTooltipProps } from './tooltip-options'
import type { TimeSeriesProps } from './root-options'
import { toDate as toDateValue } from './series'
import { seriesValueOf } from './domains'
import { pillLayout } from './date-pill'

export const timeSeriesHoverModel: <Row extends Readonly<Record<string, unknown>>>(
  next: CartesianSnapshot<Row>,
  props: TimeSeriesProps<Row>,
  tooltip: ChartTooltipProps<Row> | undefined,
  textWidth: (text: string) => number | null,
  sourceMotion?: boolean,
) => HoverOverlayModel<Row> | null = function <Row extends Readonly<Record<string, unknown>>>(
  next: CartesianSnapshot<Row>,
  props: TimeSeriesProps<Row>,
  tooltip: ChartTooltipProps<Row> | undefined,
  textWidth: (text: string) => number | null,
  sourceMotion = false,
) {
  const interactive = next.series.filter((series) => series.kind !== 'pattern')

  const dots = [
    ...seriesMarkerDots(next),
    ...(tooltip === undefined || tooltip.showDots === false
      ? []
      : [...tooltipDots(next, tooltip), ...(next.extraDots ?? [])]),
  ]

  const dates = next.rows.map((row) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
      (props.x ?? ((item: Row) => toDateValue(item[props.xDataKey ?? 'date'])))(row),
    ),
  )

  const hasMarks = interactive.length > 0 || (next.extraDots?.length ?? 0) > 0

  if (tooltip === undefined && dots.length === 0) {
    return null satisfies HoverOverlayModel<Row> | null
  }

  return {
    sourceMotion,
    springConfig: tooltip?.springConfig ?? useChartConfig(props.environment).tooltipSpring,
    crosshair: crosshairModel(tooltip, hasMarks),
    dots,
    pill:
      hasMarks && tooltip !== undefined && tooltip.showDatePill !== false
        ? { labels: dates, layout: pillLayout(dates, textWidth) }
        : null,
    indexOf: (time) =>
      next.rows.findIndex(
        (row) =>
          (props.x ?? ((item: Row) => toDateValue(item[props.xDataKey ?? 'date'])))(
            row,
          ).getTime() === time,
      ),
  } satisfies HoverOverlayModel<Row> | null
}

export const measuredOverlayPill: <Row>(
  overlay: HoverOverlayModel<Row> | null,
  textWidth: (text: string) => number | null,
) => HoverOverlayModel<Row> | null = function measuredOverlayPill<Row>(
  overlay: HoverOverlayModel<Row> | null,
  textWidth: (text: string) => number | null,
) {
  if (overlay === null || overlay.pill === null || overlay.pill === undefined) {
    return overlay satisfies HoverOverlayModel<Row> | null
  }

  return {
    ...overlay,
    pill: { ...overlay.pill, layout: pillLayout(overlay.pill.labels, textWidth) },
  } satisfies HoverOverlayModel<Row> | null
}

const seriesMarkerDots: <Row extends Readonly<Record<string, unknown>>>(
  next: CartesianSnapshot<Row>,
) => Array<OverlayDot<Row>> = function seriesMarkerDots<
  Row extends Readonly<Record<string, unknown>>,
>(next: CartesianSnapshot<Row>) {
  const interactive = next.series.filter((series) => series.kind !== 'pattern')
  const dots: Array<OverlayDot<Row>> = []

  for (const series of interactive) {
    const { marker } = series

    if (series.showMarkers && marker.fadeOnHover) {
      const scale = marker.showActiveHighlight ? 1.35 : 1

      const ringOuter =
        marker.strokeWidth > 0 ? marker.radius + marker.ringGap + marker.strokeWidth : marker.radius

      dots.push({
        yAxis: series.yAxisId,
        valueOf: (row) => seriesValueOf(series.kind)(row[series.dataKey]),
        glide: false,
        shapes: [
          ...(marker.outlineWidth > 0
            ? [
                {
                  r: (ringOuter + marker.outlineWidth / 2) * scale,
                  fill: 'none',
                  stroke: marker.outlineColor,
                  strokeWidth: marker.outlineWidth * scale,
                },
              ]
            : []),
          { r: marker.radius * scale, fill: marker.fill, stroke: 'none', strokeWidth: 0 },
          ...(marker.strokeWidth > 0
            ? [
                {
                  r: (marker.radius + marker.ringGap + marker.strokeWidth / 2) * scale,
                  fill: 'none',
                  stroke: marker.stroke,
                  strokeWidth: marker.strokeWidth * scale,
                },
              ]
            : []),
        ],
      })
    }
  }

  return dots satisfies Array<OverlayDot<Row>>
}

const tooltipDots: <Row extends Readonly<Record<string, unknown>>>(
  next: CartesianSnapshot<Row>,
  tooltip: ChartTooltipProps<Row> | undefined,
) => Array<OverlayDot<Row>> = function tooltipDots<Row extends Readonly<Record<string, unknown>>>(
  next: CartesianSnapshot<Row>,
  tooltip: ChartTooltipProps<Row> | undefined,
) {
  const interactive = next.series.filter((series) => series.kind !== 'pattern')
  const dots: Array<OverlayDot<Row>> = []

  if (tooltip?.showDots !== false) {
    for (const [index, series] of interactive.entries()) {
      const color = tooltip?.dotColor
      const customRows = tooltip?.rows

      const dot: OverlayDot<Row> = {
        yAxis: series.yAxisId,
        valueOf: (row) => seriesValueOf(series.kind)(row[series.dataKey]),
        glide: true,
        colorTarget: tooltip?.dotVariant === 'ring' ? 'stroke' : 'fill',
        shapes: [tooltipDotShape(tooltip, Predicate.isString(color) ? color : series.stroke)],
      }

      dots.push(
        Predicate.isFunction(color) || customRows !== undefined
          ? {
              ...dot,
              colorOf: (row) => {
                const rowColor = customRows?.(row)[index]?.color

                if (rowColor !== undefined && rowColor !== '') {
                  return rowColor
                }

                return Predicate.isFunction(color)
                  ? color(row, {
                      dataKey: series.dataKey,
                      stroke: series.stroke,
                      strokeWidth: series.strokeWidth,
                      yAxisId: series.yAxisId,
                    })
                  : (color ?? series.stroke)
              },
            }
          : dot,
      )
    }
  }

  return dots satisfies Array<OverlayDot<Row>>
}

const tooltipDotShape: (
  tooltip:
    | Pick<
        ChartTooltipProps,
        'dotSize' | 'dotScale' | 'dotVariant' | 'dotRadiusFraction' | 'dotStrokeWidth'
      >
    | undefined,
  color: string,
) => OverlayShape = function tooltipDotShape(
  tooltip:
    | Pick<
        ChartTooltipProps,
        'dotSize' | 'dotScale' | 'dotVariant' | 'dotRadiusFraction' | 'dotStrokeWidth'
      >
    | undefined,
  color: string,
) {
  const r = (tooltip?.dotSize ?? 5) * (tooltip?.dotScale ?? 1)

  return tooltip?.dotVariant === 'ring'
    ? {
        r,
        corner: r * 2 * Math.max(0, Math.min(0.5, tooltip.dotRadiusFraction ?? 0.25)),
        fill: 'transparent',
        stroke: color,

        strokeWidth: tooltip.dotStrokeWidth ?? 2,
      }
    : { r, fill: color, stroke: 'var(--chart-background)', strokeWidth: 2 }
}

const indicatorWidth: (width: ChartTooltipProps['indicatorWidth']) => number =
  function indicatorWidth(width: ChartTooltipProps['indicatorWidth']) {
    if (Predicate.isNumber(width)) {
      return width
    }

    return { thin: 2, medium: 4, thick: 8, line: 1 }[width ?? 'line']
  }

function crosshairModel<Row>(tooltip: ChartTooltipProps<Row> | undefined, hasMarks: boolean) {
  if (tooltip === undefined || !hasMarks || tooltip.showCrosshair === false) {
    return null
  }

  return {
    color: tooltip.indicatorColor ?? 'var(--chart-crosshair)',
    width: indicatorWidth(tooltip.indicatorWidth),
    dash: tooltip.indicatorDasharray,
    fadeEdges: tooltip.indicatorFadeEdges ?? 'both',
    fadeLength: tooltip.indicatorFadeLength ?? 10,
  }
}
