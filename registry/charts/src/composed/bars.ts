// SeriesBar -> native `rect` marks on the kit's time x scale: `barY` + `group()` need a band scale, so each bar is a time
// interval (x1/x2) sized in ms from the plot width. Entrance, focus fade and radius are native mark behaviour.
import { rect } from '@tanstack/charts'
import type { ChartMark, ChartMotionContext, ChartMotionTiming } from '@tanstack/charts'
import { cubicBezier } from '../kit/motion/easing'
import { resumeEnter } from '../kit/motion/resume-enter'
import { DEFAULT_Y_AXIS_ID } from '../cartesian/series'
import type { OverlayDot } from '../cartesian/hover-overlay'

import { DateTime } from 'effect'
import { toDate as dateValue } from '../cartesian/series'

const numberValue = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const date = (milliseconds: number): Date => DateTime.toDateUtc(DateTime.makeUnsafe(milliseconds))

// bklit's bar easing, cubic-bezier(0.85, 0, 0.15, 1).
const barEasing = cubicBezier(0.85, 0, 0.15, 1)

const Y_DOMAIN_GLIDE = {
  transition: { type: 'tween', duration: 500, easing: barEasing },
} satisfies ChartMotionTiming

export interface SeriesBarSpec {
  readonly dataKey: string
  readonly fill: string
  readonly dotColor: string
  readonly radius: number
  readonly animate: boolean
  readonly fadedOpacity: number
}

export interface BarLayoutInput<Row extends Readonly<Record<string, unknown>>> {
  readonly data: ReadonlyArray<Row>
  readonly clock: () => number
  readonly xKey: string
  readonly bars: ReadonlyArray<SeriesBarSpec>
  readonly innerWidth: number
  readonly innerHeight: number
  /** Time covered by the x scale, in ms. */
  readonly xSpanMs: number
  readonly yDomain: readonly [number, number]
  readonly barSize?: number
  readonly maxBarSize?: number
  readonly barGap: number
  readonly stacked: boolean
  readonly stackGap: number
  readonly animationDuration: number
  /** The y-domain glide step of a data update (kit/cartesian/use-data-update-step.ts): bars tween with the domain. */
  glide?: boolean
  /** false = paint the first scene with zero-height bar seeds; the build that follows (true) grows them as a keyed update. */
  readonly entered: boolean
  /** The reveal arm's `performance.now()` during the render that flips `entered` (bar updates then run the staggered grow), else null. */
  readonly growingSince: () => number | null
  readonly dots:
    | false
    | { readonly radius: number; readonly strokeWidth: number; readonly color?: string }
}

export class ComposedBarDatum<Row> {
  readonly source: Row
  readonly i: number
  readonly t: Date
  readonly x1: Date
  readonly x2: Date
  readonly y1: number
  readonly y2: number
  readonly value: number
  readonly top: number
  constructor(
    source: Row,
    i: number,
    t: Date,
    x1: Date,
    x2: Date,
    y1: number,
    y2: number,
    value: number,
    top: number,
  ) {
    this.source = source
    this.i = i
    this.t = t
    this.x1 = x1
    this.x2 = x2
    this.y1 = y1
    this.y2 = y2
    this.value = value
    this.top = top
  }
}

type BarRow<Row> = ComposedBarDatum<Row>

type BarMark<Row> = ChartMark<BarRow<Row>, Date, number>

/** bklit's bar width: 88% of the slot (or barSize), capped by maxBarSize, shrunk to fit groups. */
export function seriesBarWidth(input: {
  innerWidth: number
  dataLength: number
  seriesCount: number
  barSize?: number
  maxBarSize?: number
  gap: number
  stacked: boolean
}): number {
  const { innerWidth, dataLength, seriesCount, barSize, maxBarSize, gap, stacked } = input
  const groupCount = stacked ? 1 : Math.max(1, seriesCount)
  const slot = dataLength < 2 ? innerWidth : innerWidth / (dataLength - 1)
  let width = barSize ?? Math.min(slot * 0.88, maxBarSize ?? Number.POSITIVE_INFINITY)

  if (maxBarSize !== undefined) {
    width = Math.min(width, maxBarSize)
  }

  if (groupCount > 1) {
    const maxGroup = slot * 0.92
    const needed = groupCount * width + (groupCount - 1) * gap

    if (needed > maxGroup && maxGroup > 0) {
      width = Math.max(4, (maxGroup - (groupCount - 1) * gap) / groupCount)
    }
  }

  return Math.max(2, width)
}

/** Largest bar total (stacked) or value (grouped), for the y domain. */
export function barYValues(
  data: ReadonlyArray<Record<string, unknown>>,
  keys: ReadonlyArray<string>,
  stacked: boolean,
): Array<number> {
  return data.flatMap((row) => {
    const values = keys.flatMap((key) => numberValue(row[key]) ?? [])

    return stacked ? [values.reduce((sum, v) => sum + v, 0)] : values
  })
}

interface BarGeometry {
  readonly msPerPx: number
  readonly unitsPerPx: number
  readonly barWidth: number
  readonly groupWidth: number
  readonly baseline: number
}

/** The bars of one series as time intervals; stacked bars sit on the series below them, raised by the stack gap. */
function barRowsOf<Row extends Readonly<Record<string, unknown>>>(
  input: BarLayoutInput<Row>,
  geo: BarGeometry,
  bar: SeriesBarSpec,
  seriesIndex: number,
): Array<BarRow<Row>> {
  const { bars, stacked, stackGap, barGap } = input
  const isLast = seriesIndex === bars.length - 1

  return input.data.flatMap((row, rowIndex) => {
    const value = numberValue(row[bar.dataKey])

    if (value === undefined) {
      return []
    }

    const t = dateValue(row[input.xKey])

    const leftPx = stacked
      ? -geo.barWidth / 2
      : -geo.groupWidth / 2 + seriesIndex * (geo.barWidth + barGap)

    const x1 = date(t.getTime() + leftPx * geo.msPerPx)
    const x2 = date(x1.getTime() + geo.barWidth * geo.msPerPx)
    let y1 = geo.baseline
    let y2 = value

    if (stacked) {
      const offset = bars
        .slice(0, seriesIndex)
        .reduce((sum, below) => sum + (numberValue(row[below.dataKey]) ?? 0), 0)

      const raise = seriesIndex * stackGap
      y1 = offset + (raise + (isLast ? 0 : stackGap)) * geo.unitsPerPx
      y2 = offset + value + raise * geo.unitsPerPx
    }

    return [new ComposedBarDatum(row, rowIndex, t, x1, x2, y1, y2, value, y2)]
  })
}

/** One tween spanning the reveal: 0 for the stagger delay, bklit's easing, then the final height when the reveal ends (bklit swaps to static rects). `clock` is the first entrance. */
function growMotionOf<Row extends Readonly<Record<string, unknown>>>(
  input: BarLayoutInput<Row>,
  stagger: number,
  clock: { readonly at: number | null },
): (
  context: ChartMotionContext<BarRow<Row>>,
) => false | ChartMotionTiming<BarRow<Row>> | undefined {
  return (context) => {
    // The y-domain glide step (bklit tweens every element drawn with the y scale) outranks the settled-snap below.
    if (input.glide === true && context.phase === 'update') {
      return Y_DOMAIN_GLIDE
    }

    const delay = context.datumIndex * stagger
    const total = input.animationDuration

    const plan = {
      delay: 0,
      duration: total,
      easing: (t: number): number => (t >= 1 ? 1 : barEasing((t * total - delay) / total)),
    }

    const since = input.growingSince()

    if (context.phase === 'enter' || (context.phase === 'update' && since !== null)) {
      // bklit's grow starts in the arming effect (chart-reveal-clip.tsx:81-85); ours a commit later, so it resumes from the arm.
      return (
        resumeEnter(plan, clock.at ?? since, input.clock()) || {
          delay: 0,
          transition: { type: 'tween', duration: plan.duration, easing: plan.easing },
        }
      )
    }

    if (context.phase !== 'update') {
      return undefined
    }

    // A render forced mid-entrance (web-font swap after a hydrated mount) resumes the schedule; any other update snaps like bklit.
    return resumeEnter(plan, clock.at, input.clock())
  }
}

export function buildBarMarks<Row extends Readonly<Record<string, unknown>>>(
  input: BarLayoutInput<Row>,
): Array<BarMark<Row>> {
  const { data, bars, innerWidth, innerHeight, xSpanMs, yDomain, barGap, stacked, stackGap } = input
  const n = bars.length

  if (n === 0 || innerWidth <= 0 || innerHeight <= 0 || data.length === 0) {
    return []
  }

  const barWidth = seriesBarWidth({
    innerWidth,
    dataLength: data.length,
    seriesCount: n,
    ...(input.barSize === undefined ? {} : { barSize: input.barSize }),
    ...(input.maxBarSize === undefined ? {} : { maxBarSize: input.maxBarSize }),
    gap: barGap,
    stacked,
  })

  const geo: BarGeometry = {
    msPerPx: xSpanMs / innerWidth,
    unitsPerPx: (yDomain[1] - yDomain[0]) / innerHeight,
    barWidth,
    groupWidth: n * barWidth + (n > 1 ? (n - 1) * barGap : 0),
    baseline: yDomain[0],
  }

  // bklit: each bar tweens for the full reveal duration, delayed by index * (40% of it / n) (ends at ~1.4x).
  const stagger = data.length > 1 ? (input.animationDuration * 0.4) / data.length : 0
  const growMotion = growMotionOf(input, stagger, { at: null })
  const marks: Array<BarMark<Row>> = []

  for (const [seriesIndex, bar] of bars.entries()) {
    const rows = barRowsOf(input, geo, bar, seriesIndex)
    const isLast = seriesIndex === n - 1
    // First paint: zero-height seeds (y2 at the bar's base); the entrance is the UPDATE of these keyed bars, since a rect
    // enters natively only into a painted scene and the initial pass animates barY alone.
    const eps = 0.01 * geo.unitsPerPx

    const seeded =
      input.entered || !bar.animate
        ? rows
        : rows.map(
            (row) =>
              new ComposedBarDatum(
                row.source,
                row.i,
                row.t,
                row.x1,
                row.x2,
                row.y1,
                row.y1 + eps,
                row.value,
                row.top,
              ),
          )

    const rounded = stacked ? stackGap > 0 || isLast : true
    marks.push(
      rect(seeded, {
        id: `bar:${bar.dataKey}`,
        x: (d: BarRow<Row>) => d.t,
        x1: (d: BarRow<Row>) => d.x1,
        x2: (d: BarRow<Row>) => d.x2,
        y: (d: BarRow<Row>) => d.value,
        y1: (d: BarRow<Row>) => d.y1,
        y2: (d: BarRow<Row>) => d.y2,
        z: () => bar.dataKey,
        key: (d: BarRow<Row>) => d.i,
        fill: bar.fill,
        inset: 0,
        // bklit's rect rx = ry = radius (series-bar.tsx:312-313), clamped per axis by the browser: the scalar radius is the
        // native <rect rx>; a corner-radii path would scale both radii together instead.
        radius: rounded ? bar.radius : 0,
        // The hover fade and legend dim are fixed CSS on host attributes (composed/static-css.ts; no native `states`).
        motion: bar.animate ? growMotion : false,
      }),
    )
  }

  return marks
}

/** One hover dot per bar series, at the visual top of the focused row's bar (the hover overlay's dots, kit/cartesian/hover-overlay.ts; bklit TooltipDot per series). */
export function buildBarDots<Row extends Readonly<Record<string, unknown>>>(
  input: BarLayoutInput<Row>,
): Array<OverlayDot<Row>> {
  const { bars, dots, innerWidth, innerHeight, xSpanMs, yDomain, barGap, stacked, data } = input

  if (
    dots === false ||
    bars.length === 0 ||
    innerWidth <= 0 ||
    innerHeight <= 0 ||
    data.length === 0
  ) {
    return []
  }

  const barWidth = seriesBarWidth({
    innerWidth,
    dataLength: data.length,
    seriesCount: bars.length,
    ...(input.barSize === undefined ? {} : { barSize: input.barSize }),
    ...(input.maxBarSize === undefined ? {} : { maxBarSize: input.maxBarSize }),
    gap: barGap,
    stacked,
  })

  const geo: BarGeometry = {
    msPerPx: xSpanMs / innerWidth,
    unitsPerPx: (yDomain[1] - yDomain[0]) / innerHeight,
    barWidth,
    groupWidth: bars.length * barWidth + (bars.length > 1 ? (bars.length - 1) * barGap : 0),
    baseline: yDomain[0],
  }

  return bars.map((bar, seriesIndex): OverlayDot<Row> => {
    const topAt = new Map<number, number>(
      barRowsOf(input, geo, bar, seriesIndex).map((d) => [d.t.getTime(), d.top]),
    )

    return {
      yAxis: DEFAULT_Y_AXIS_ID,
      valueOf: (row) => topAt.get(dateValue(row[input.xKey]).getTime()),
      shapes: [
        {
          r: dots.radius,
          fill: dots.color ?? bar.dotColor,
          stroke: 'var(--chart-background)',
          strokeWidth: dots.strokeWidth,
        },
      ],
      glide: true,
    }
  })
}
