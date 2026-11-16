import type { SpringConfig } from './series-options'
import type { PillLayout } from './date-pill'
import type { CartesianSnapshot } from './definition'
import type { IndicatorFadeEdges } from './tooltip-options'
import { Predicate } from 'effect'

/** What the overlay reads of a draw: the host height, the plot size and the resolved domains (x in ms). */
export interface OverlayPlot {
  readonly height: number
  readonly innerWidth: number
  readonly innerHeight: number
  readonly xDomain: readonly [number, number]
  readonly yDomains: Readonly<Record<string, readonly [number, number]>>
}

export const overlayPlotOf = <Row>(snapshot: CartesianSnapshot<Row>): OverlayPlot => ({
  height: snapshot.height,
  innerWidth: snapshot.innerWidth,
  innerHeight: snapshot.innerHeight,
  xDomain: [snapshot.domains.x[0].getTime(), snapshot.domains.x[1].getTime()],
  yDomains: snapshot.domains.y,
})

/** One shape of a dot, centred on the point, SVG-style (stroke centred on the edge): a circle of radius `r`, or with `corner` a rounded square of half-extent `r` (bklit's "ring" tooltip dot). */
export interface OverlayShape {
  readonly r: number
  readonly corner?: number
  readonly fill: string
  readonly stroke: string
  readonly strokeWidth: number
}

/** A marker that follows the focused row of one series: bklit's TooltipDot (glides, `glide`) or the 1.35x active marker (jumps). */
export interface OverlayDot<Row> {
  readonly colorOf?: (row: Row) => string
  readonly colorTarget?: 'fill' | 'stroke'
  readonly yAxis: string
  readonly valueOf: (row: Row) => number | undefined
  /** Shapes in paint order; a function when they depend on the plot size (a bar's band width). */
  readonly shapes:
    | ReadonlyArray<OverlayShape>
    | ((plot: OverlayPlot) => ReadonlyArray<OverlayShape>)
  /** Where a category chart puts the dot: an x offset from the focus line and a y within the plot, or undefined to hide it. Replaces `valueOf` and the y domain. */
  readonly at?: (
    row: Row,
    plot: OverlayPlot,
    key: number,
  ) => { readonly dx: number; readonly y: number } | undefined
  readonly glide: boolean
}

export interface CrosshairPaintOptions {
  readonly width: number
  readonly dash: string | undefined
  readonly fadeEdges?: IndicatorFadeEdges
  readonly fadeLength?: number
}

export interface HoverOverlayModel<Row> {
  readonly sourceMotion?: boolean
  readonly animatePosition?: boolean
  readonly springConfig?: SpringConfig
  /** Original TooltipIndicator paint, with configurable vertical fades or a solid dashed stroke. */
  readonly crosshair:
    | (CrosshairPaintOptions & {
        readonly color: string | ((row: Row) => string)
      })
    | null
  /** Date ticker: the measured rolling layout, or null for the compact text-sized pill (above 60 labels, bklit date-ticker.tsx:12). */
  readonly pill: {
    readonly layout: PillLayout | null
    readonly labels: ReadonlyArray<string>
  } | null
  /** Markers in paint order (active markers first, dots last). */
  readonly dots: ReadonlyArray<OverlayDot<Row>>
  /** Position of a focused row's time in the pill's label list. */
  readonly indexOf: (time: number) => number
  /** x within the plot of a focus key; time charts omit it and the x domain maps the time. */
  readonly xOf?: (key: number, plot: OverlayPlot) => number
}

/** Domain frames retarget the same occurrence; only a changed presentation rebuilds its DOM. */
export function hoverPresentationKey<Row>(model: HoverOverlayModel<Row> | null, plot: OverlayPlot) {
  return JSON.stringify(
    model === null
      ? null
      : {
          sourceMotion: model.sourceMotion,
          animatePosition: model.animatePosition,
          spring: model.springConfig,
          rule: model.crosshair && {
            width: model.crosshair.width,
            dash: model.crosshair.dash,
            fadeEdges: model.crosshair.fadeEdges ?? 'both',
            fadeLength: model.crosshair.fadeLength ?? 10,
          },
          pill: model.pill,
          dots: model.dots.map((dot) => ({
            glide: dot.glide,
            shapes: Predicate.isFunction(dot.shapes) ? dot.shapes(plot) : dot.shapes,
          })),
        },
  )
}

export function overlaySpotOf<Row>(
  dot: OverlayDot<Row>,
  row: Row,
  plot: OverlayPlot,
  key: number,
  top: number,
): { readonly dx: number; readonly y: number } | undefined {
  if (dot.at) {
    const spot = dot.at(row, plot, key)

    return spot && Number.isFinite(spot.y) ? { dx: spot.dx, y: top + spot.y } : undefined
  }

  const value = dot.valueOf(row)
  const domain = plot.yDomains[dot.yAxis]

  if (value === undefined || !Number.isFinite(value) || !domain) {
    return undefined
  }

  return {
    dx: 0,
    y:
      top +
      plot.innerHeight -
      ((value - domain[0]) / (domain[1] - domain[0] || 1)) * plot.innerHeight,
  }
}

export function canRetainHover<Row>(
  previous: HoverOverlayModel<Row> | null,
  next: HoverOverlayModel<Row> | null,
  samePresentation: boolean,
): boolean {
  return samePresentation && previous?.sourceMotion === true && next?.sourceMotion === true
}

export function overlayXOf<Row>(model: HoverOverlayModel<Row>, plot: OverlayPlot, time: number) {
  if (model.xOf !== undefined) {
    return model.xOf(time, plot)
  }

  const [start, end] = plot.xDomain
  const span = end - start

  return span > 0 ? ((time - start) / span) * plot.innerWidth : 0
}
