import { liveFocus } from './focus'
import type { FocusTail } from './focus'
import { smoothRows, monotoneTangent, SMOOTH_STEPS } from './rows'

export { drawnValueAt } from './rows'

// Native definition for the streaming line: one keyed rolling window of rows,
// `motion.path rolling` for the scroll, plain marks for everything else.
import { DateTime } from 'effect'
import { areaY, defineChart, lineY } from '@tanstack/charts'
import type {
  DomChartDefinition,
  ChartGradient,
  ChartMark,
  ChartTooltipOptions,
} from '@tanstack/charts'
import { crosshair } from '@tanstack/charts/crosshair'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleUtc } from 'd3-scale'
import { liveTooltip as nativeTooltip } from './tooltip'
import { tooltipBoxMotion } from '../cartesian/tooltip-motion'
import type { ChartTooltipProps as TooltipBoxMotionProps } from '../cartesian/tooltip-options'
import { bklitTooltipPlacement as sizedTooltipPlacement } from '../cartesian/tooltip-placement'
import { crosshairGradient, crosshairRuleMark } from './crosshair'

const TOOLTIP_OFFSET = 16

import { bklitTheme } from './theme'
import type { ChartMargin } from './types'
import type { HeadLabel } from './head-ease'
import { liveTail } from './live-tail'
import { liveXLabels } from './live-xlabels'
import { liveTip } from './live-tip'

export interface LiveRow {
  readonly key: string
  readonly t: number
  readonly v: number
  /** Left padding while history is shorter than the window: the rolling contract needs a constant keyed row count, so pads repeat the first value and are painted invisible
   * (line: horizontal gradient mask; area: collapsed onto the floor). */
  readonly pad: boolean
}

// SAFETY: every live mark is built from LiveRow data, so a point's datum is a LiveRow (or absent).
export const liveRowOf = (
  point: { readonly datum?: unknown } | null | undefined,
): LiveRow | undefined => (isLiveRow(point?.datum) ? point.datum : undefined)

function isLiveRow(value: unknown): value is LiveRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    typeof value.key === 'string' &&
    't' in value &&
    typeof value.t === 'number' &&
    'v' in value &&
    typeof value.v === 'number' &&
    'pad' in value &&
    typeof value.pad === 'boolean'
  )
}

/** Plain index access that may fall outside the list (`at()` would wrap negative indexes). */

export interface LiveDefinitionInput {
  readonly rows: ReadonlyArray<LiveRow>
  readonly xDomain: readonly [number, number]
  readonly yDomain: readonly [number, number]
  /** Fixed area floor (semantic y1): must not change between rolling updates. */
  readonly areaFloor: number
  readonly margin: ChartMargin
  readonly uid: string
  readonly dataKey: string
  readonly stroke: string
  readonly strokeWidth: number
  readonly dotColor: string
  readonly dotSize: number
  /** bklit ChartTooltip dotSize: the hover dot radius (tooltip/chart-tooltip.tsx:103, default 5); the line dotSize is the live-edge dot. */
  readonly hoverDotSize: number
  readonly fill: boolean
  readonly badge: boolean
  /** The badge text as it eases: one formatted value per commit step of bklit's display lerp (see live-tip.ts). */
  readonly badgeLabels: ReadonlyArray<HeadLabel>
  /** Flips each tick so the label stack's CSS animations restart (the nodes themselves persist and tween). */
  readonly badgeParity: number
  /** The tip eases by a CSS animation along bklit's per-frame lerp (live-tip.ts); false during the intro, which follows the chart. */
  readonly tipEase: boolean
  /** The y domain jumped this tick (bklit moves an expanding edge or a nice() step at once): the path must not reproject it over the roll,
   * so its plan fails on purpose and falls back to snap (liveline.css slides it back in). */
  readonly yJump: boolean
  /** The dot: its clock time (one sample interval right of the newest sample's rest slot) and the target value. */
  readonly tip: { readonly t: number; readonly v: number } | undefined
  /** The lerped display value when the newest sample arrived: where the dot starts this tick (bklit's virtual point). */
  readonly dispV: number
  /** Pixels per ms of the live clock (the tail's click-through to the pointer). */
  readonly pxPerMs: number
  /** The seed frame has no roll: the tail renders at rest. */
  readonly still: boolean
  /** Transition for the roll: linear, one sample interval long. */
  readonly rollMs: number
  readonly easing: 'linear' | 'ease-out' | ((progress: number) => number)
  /** The evenly spaced x slot times (ms) at the start of the roll: bklit's fixed slots at 0..100% of the live window. */
  readonly xTickTimes: ReadonlyArray<number>
  /** bklit's hover area in chart coordinates (the margin-inset plot; the tooltip does not show in the margins). */
  readonly hoverBounds: {
    readonly left: number
    readonly right: number
    readonly top: number
    readonly bottom: number
  }
  readonly formatTime: (ms: number) => string
  readonly formatValue: (v: number) => string
  readonly yPosition: 'left' | 'right'
  /** Plot height in px. */
  readonly plotHeight: number
  readonly showCrosshair: boolean
  readonly showDots: boolean
  readonly showPill: boolean
  readonly tooltipEnabled: boolean
  /** The ChartTooltip props that pick the panel spring. */
  readonly tooltipBox?: Pick<
    TooltipBoxMotionProps,
    'boxSpringConfig' | 'matchCrosshair' | 'springConfig' | 'damping'
  >
}

/** bklit's y label box is top-aligned at the tick (no -50% centring): its text centre sits this far below the gridline. */
/** bklit's x labels are HTML spans `bottom: 12` of the container (box top 232 in a 260px box, 40px bottom margin). */
const X_TICK_PADDING = 14

/** bklit's area gradient top stop (stopOpacity 0.1 at 0%, 0 at 100%). */
const AREA_OPACITY = 0.1

const PILL_HALO = 22

const PILL_OFFSET = X_TICK_PADDING

const LINE_ID = 'live:line'

interface LiveDefinition {
  definition: DomChartDefinition<LiveRow, Date, number>
  /** The area ramp in svg px: full strength at `top` (the curve's peak), zero at `bottom` (the plot bottom). */
  fillRamp: { readonly top: number; readonly bottom: number }
}

/** bklit's area gradient (0.1 -> 0 over the AreaClosed bbox) as one ramp in the svg's coordinates, masking flat-painted pieces (liveline.css). */
function areaFillRamp(
  rows: ReadonlyArray<LiveRow>,
  input: Readonly<LiveDefinitionInput>,
): LiveDefinition['fillRamp'] {
  // Peak over every real row: the tail (N and the dot) is part of bklit's curve.
  let curvePeak = Number.NEGATIVE_INFINITY

  for (const r of rows) {
    if (!r.pad) {
      curvePeak = Math.max(curvePeak, r.v)
    }
  }

  const [yLo, yHi] = input.yDomain
  const plotBottom = input.margin.top + input.plotHeight

  const peakPx = Number.isFinite(curvePeak)
    ? input.margin.top + ((yHi - curvePeak) / (yHi - yLo || 1)) * input.plotHeight
    : input.margin.top

  return { top: Math.round(peakPx * 100) / 100, bottom: Math.round(plotBottom * 100) / 100 }
}

/** bklit's line gradient: full strength at the top of the curve, 60% at the bottom, so the lower (older) stretch reads lighter. */
function lineGradient(id: string, stroke: string): ChartGradient {
  return {
    id,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
    stops: [
      { offset: 0, color: stroke, opacity: 1 },
      { offset: 1, color: stroke, opacity: 0.6 },
    ],
  }
}

interface TailSpan {
  readonly a: LiveRow
  readonly b: LiveRow
  readonly tip: { readonly t: number; readonly v: number }
}

/** The tail (N-1 -> N -> dot) exists once the window holds real rows at both ends. */
function tailSpan(
  rows: ReadonlyArray<LiveRow>,
  tip: LiveDefinitionInput['tip'],
): TailSpan | undefined {
  const a = rows.at(-2)
  const b = rows.at(-1)

  if (!tip || !a || !b) {
    return undefined
  }

  if (rows.length < 4 || a.pad || b.pad) {
    return undefined
  }

  return { a, b, tip }
}

/** bklit's line gradient runs 1 -> 0.6 down the curve's bbox; a piece takes the opacity at its own middle. */
function tailLineOpacity(rows: ReadonlyArray<LiveRow>, tail: TailSpan): number {
  let vMin = Number.POSITIVE_INFINITY
  let vMax = Number.NEGATIVE_INFINITY

  for (const [i, r] of rows.entries()) {
    if (!r.pad && i > 0 && i < rows.length - 1) {
      vMin = Math.min(vMin, r.v)
      vMax = Math.max(vMax, r.v)
    }
  }

  const midV = (tail.a.v + tail.b.v) / 2

  return vMax > vMin ? 0.6 + 0.4 * Math.min(1, Math.max(0, (midV - vMin) / (vMax - vMin))) : 1
}

/** The tail drawn beside the rolling path, which ends at N-1 (see live-tail.ts). */
function tailMark(
  input: Readonly<LiveDefinitionInput>,
  rows: ReadonlyArray<LiveRow>,
  pathRows: ReadonlyArray<LiveRow>,
  tail: TailSpan,
): ReturnType<typeof liveTail> {
  return liveTail({
    id: 'live:tail',
    parity: input.badgeParity,
    aT: tail.a.t,
    aV: tail.a.v,
    aSlope: monotoneTangent(rows, rows.length - 2),
    bT: tail.b.t,
    bV: tail.b.v,
    dispV: input.dispV,
    tipT: tail.tip.t,
    stroke: input.stroke,
    strokeWidth: input.strokeWidth,
    strokeOpacity: tailLineOpacity(rows, tail),
    areaFloor: input.areaFloor,
    ...(input.fill ? { fill: input.stroke } : {}),
    fillOpacity: AREA_OPACITY,
    // Three row intervals of the path (a roll's x start is one interval, two after a late sample, plus what is left of the
    // previous roll): the cut at the path's end stays covered.
    lead: pathRows.slice(-(3 * SMOOTH_STEPS + 1)).map((r): [number, number] => [r.t, r.v]),
    still: input.still,
  })
}

/** Native crosshair for the time pill (halo stroke reads as bklit's pill) and the focused-point marker; its rule is transparent. */
function pillCrosshair(
  input: Readonly<LiveDefinitionInput>,
): ReturnType<typeof crosshair<Date, number>> {
  return crosshair<Date, number>({
    x: {
      stroke: 'transparent',
      label:
        input.showCrosshair && input.showPill
          ? {
              format: (value: Date): string => input.formatTime(value.getTime()),
              fill: 'var(--chart-date-pill-foreground)',
              stroke: 'var(--chart-date-pill-background)',
              strokeWidth: PILL_HALO,
              fontSize: 14,
              fontWeight: 500,
              offset: PILL_OFFSET,
            }
          : false,
    },
    y: false,
    marker: input.showDots
      ? {
          radius: input.hoverDotSize,
          fill: input.stroke,
          stroke: 'var(--chart-background)',
          strokeWidth: 2,
        }
      : false,
    motion: false,
  })
}

type LiveTooltipOptions = ChartTooltipOptions<LiveRow, Date, number> & {
  readonly use: ReturnType<typeof nativeTooltip>
}

/** bklit TooltipBox: panel top on the plot top, `offset` right of the pointer (flipping left at the edge). */
function liveTooltip(
  boxMotion: ReturnType<typeof tooltipBoxMotion>,
  uid: string,
): LiveTooltipOptions {
  return {
    // Instant hide (bklit TooltipBox has no exit presence; the roll's repeat hides are skipped). Gap #19.
    use: nativeTooltip(`${uid}-tooltip`),
    // The pointer, not the focused row, so the box does not snap to the 18px row grid.
    anchor: (_points, context) => ({
      x: context.pointer?.x ?? context.focus.primary.x,
      y: context.plot.y - TOOLTIP_OFFSET,
    }),
    placement: ['bottom-right', 'bottom-left'],
    offset: TOOLTIP_OFFSET,
    // The same placement without the per-paint size read (gap #21, kit/tooltip/sized-tooltip-placement.ts).
    portal: sizedTooltipPlacement(),
    className: String.raw`bkm-live-tooltip bottom-auto m-0 absolute right-auto w-max z-[1] left-[var(--bkm-tooltip-left)] top-[var(--bkm-tooltip-top)]`,
    sticky: false,
    // bklit's box follows the pointer on tooltipBoxSpring.
    motion: boxMotion,
  }
}

export function buildLiveDefinition(input: Readonly<LiveDefinitionInput>): LiveDefinition {
  const { rows, uid, stroke, strokeWidth, tooltipEnabled } = input
  const pathRows = smoothRows(rows)
  const x = (d: LiveRow): Date => DateTime.toDateUtc(DateTime.makeUnsafe(d.t))

  const common = {
    x,
    y: (d: LiveRow): number => d.v,
    key: (d: LiveRow): string => d.key,
    z: (): string => input.dataKey,
  }

  const lineId = `${uid}-live-line`
  const gradients: Array<ChartGradient> = [lineGradient(lineId, stroke)]

  const marks: Array<
    ChartMark<LiveRow, Date, number> | ReturnType<typeof crosshair<Date, number>>
  > = []

  const fillRamp = areaFillRamp(rows, input)

  if (input.fill) {
    // Not `decorative`: that strips the interaction points the rolling plan reads, so the fill would snap while the line
    // rolls. The focus strategy only resolves `live:line` points, so the area stays out of hover.
    marks.push(
      areaY(pathRows, {
        id: 'live:area',
        ...common,
        y1: input.areaFloor,
        y2: (d: LiveRow) => (d.pad ? input.areaFloor : d.v),
        fill: stroke,
        fillOpacity: AREA_OPACITY,
        stroke: 'none',
      }),
    )
  }

  // The pad / past-the-tip cuts of the line are CSS clip-path (liveline.css), not a gradient.
  marks.push(lineY(pathRows, { id: LINE_ID, ...common, stroke: `url(#${lineId})`, strokeWidth }))
  const tail = tailSpan(rows, input.tip)

  if (tail) {
    marks.push(tailMark(input, rows, pathRows, tail))
  }

  if (input.tip) {
    marks.push(
      liveTip({
        id: 'live:tip',
        time: input.tip.t,
        value: input.tip.v,
        color: input.dotColor,
        stroke,
        dotSize: input.dotSize,
        badge: input.badge,
        labels: input.badgeLabels,
        parity: input.badgeParity,
        ease: input.tipEase,
      }),
    )
  }

  if (tooltipEnabled) {
    // bklit's TooltipIndicator (chart-tooltip.tsx:258-283, tooltip-indicator.tsx:125-190): a 1px rect with the fade gradient, drawn by the kit rect guide
    // ahead of the pill and marker. Guide motion is off (the 1s rolling tween would drag it); the pointer glide is liveline.css.
    if (input.showCrosshair) {
      gradients.push(crosshairGradient('live-crosshair', 'var(--chart-crosshair)'))
      marks.push(
        crosshairRuleMark({
          id: 'live:crosshair',
          paint: `url(#${uid}-live-crosshair)`,
          width: 1,
          motion: false,
          className: 'bkm-live-rule',
        }),
      )
    }

    marks.push(pillCrosshair(input))
  }

  const tailFocus: FocusTail | undefined = tail
    ? {
        tipT: tail.tip.t,
        bT: tail.b.t,
        bV: tail.b.v,
        pxPerMs: input.pxPerMs,
        pxPerValue: input.plotHeight / (input.yDomain[1] - input.yDomain[0] || 1),
      }
    : undefined

  const definition = defineChart({
    marks,
    controls: [
      liveXLabels({
        id: 'live:xlabels',
        times: input.xTickTimes,
        rollMs: input.rollMs,
        parity: input.badgeParity,
        padding: X_TICK_PADDING,
        fontSize: 12,
        format: (t: number) => input.formatTime(t),
      }),
    ],
    motion: {
      path: {
        update: 'rolling' satisfies 'rolling',
        x: 'shift' satisfies 'shift',
        y: input.yJump ? ('fixed' satisfies 'fixed') : ('reproject' satisfies 'reproject'),
        fallback: 'snap' satisfies 'snap',
      },
      transition: { type: 'tween' satisfies 'tween', duration: input.rollMs, easing: input.easing },
    },
    scales: {
      x: {
        scale: scaleUtc().domain([
          DateTime.toDateUtc(DateTime.makeUnsafe(input.xDomain[0])),
          DateTime.toDateUtc(DateTime.makeUnsafe(input.xDomain[1])),
        ]),
        // The x labels are fixed slots drawn by liveXLabels (live-xlabels.ts); the axis itself draws nothing.
        axis: { line: false, ticks: false, tickLabels: false },
      },
      y: {
        scale: scaleLinear().domain([input.yDomain[0], input.yDomain[1]]),
        side: input.yPosition,
        // The y labels are a second chart over this one (buildLiveYAxisDefinition): the axis itself draws nothing.
        axis: { line: false, ticks: false, tickLabels: false },
      },
    },
    // Explicit margins on every side: the rolling contract needs stable plot bounds.
    margin: input.margin,
    theme: bklitTheme,
    gradients,
    clip: true,
    ...(tooltipEnabled ? { focus: liveFocus(input.hoverBounds, tailFocus) } : {}),
    maxFocusDistance: Number.POSITIVE_INFINITY,
    focusRing: false,
    tooltip: tooltipEnabled ? liveTooltip(tooltipBoxMotion(input.tooltipBox), uid) : false,
  })

  return { definition, fillRamp }
}

export { buildLiveYAxisDefinition } from './ylabels-definition'
