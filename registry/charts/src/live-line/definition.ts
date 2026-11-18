import { liveFocus } from './focus'
import type { FocusTail } from './focus'
import { smoothRows, monotoneTangent, SMOOTH_STEPS } from './rows'

const areaFillRamp: (
  rows: ReadonlyArray<LiveRow>,
  input: Readonly<LiveDefinitionInput>,
) => LiveDefinition['fillRamp'] = function areaFillRamp(
  rows: ReadonlyArray<LiveRow>,
  input: Readonly<LiveDefinitionInput>,
) {
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

const lineGradient: (id: string, stroke: string) => ChartGradient = function lineGradient(
  id: string,
  stroke: string,
) {
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

const tailSpan: (
  rows: ReadonlyArray<LiveRow>,
  tip: LiveDefinitionInput['tip'],
) => TailSpan | undefined = function tailSpan(
  rows: ReadonlyArray<LiveRow>,
  tip: LiveDefinitionInput['tip'],
) {
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

const tailLineOpacity: (rows: ReadonlyArray<LiveRow>, tail: TailSpan) => number =
  function tailLineOpacity(rows: ReadonlyArray<LiveRow>, tail: TailSpan) {
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

const tailMark: (
  input: Readonly<LiveDefinitionInput>,
  rows: ReadonlyArray<LiveRow>,
  pathRows: ReadonlyArray<LiveRow>,
  tail: TailSpan,
) => ReturnType<typeof liveTail> = function tailMark(
  input: Readonly<LiveDefinitionInput>,
  rows: ReadonlyArray<LiveRow>,
  pathRows: ReadonlyArray<LiveRow>,
  tail: TailSpan,
) {
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

    lead: pathRows.slice(-(3 * SMOOTH_STEPS + 1)).map((r) => [r.t, r.v] satisfies [number, number]),
    still: input.still,
  })
}

const pillCrosshair: (
  input: Readonly<LiveDefinitionInput>,
) => ReturnType<typeof crosshair<Date, number>> = function pillCrosshair(
  input: Readonly<LiveDefinitionInput>,
) {
  return crosshair<Date, number>({
    x: {
      stroke: 'transparent',
      label:
        input.showCrosshair && input.showPill
          ? {
              format: (value: Date) => input.formatTime(value.getTime()) satisfies string,
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

const liveTooltip: (
  boxMotion: ReturnType<typeof tooltipBoxMotion>,
  uid: string,
) => LiveTooltipOptions = function liveTooltip(
  boxMotion: ReturnType<typeof tooltipBoxMotion>,
  uid: string,
) {
  return {
    use: nativeTooltip(`${uid}-tooltip`),

    anchor: (_points, context) => ({
      x: context.pointer?.x ?? context.focus.primary.x,
      y: context.plot.y - TOOLTIP_OFFSET,
    }),
    placement: ['bottom-right', 'bottom-left'],
    offset: TOOLTIP_OFFSET,

    portal: sizedTooltipPlacement(),
    className: String.raw`bkm-live-tooltip bottom-auto m-0 absolute right-auto w-max z-[1] left-[var(--bkm-tooltip-left)] top-[var(--bkm-tooltip-top)]`,
    sticky: false,

    motion: boxMotion,
  }
}

export const buildLiveDefinition: (input: Readonly<LiveDefinitionInput>) => LiveDefinition =
  function buildLiveDefinition(input: Readonly<LiveDefinitionInput>) {
    const { rows, uid, stroke, strokeWidth, tooltipEnabled } = input
    const pathRows = smoothRows(rows)
    const x: (d: LiveRow) => Date = (d: LiveRow) => DateTime.toDateUtc(DateTime.makeUnsafe(d.t))

    const common = {
      x,
      y: (d: LiveRow) => d.v satisfies number,
      key: (d: LiveRow) => d.key satisfies string,
      z: () => input.dataKey satisfies string,
    }

    const lineId = `${uid}-live-line`
    const gradients: Array<ChartGradient> = [lineGradient(lineId, stroke)]

    const marks: Array<
      ChartMark<LiveRow, Date, number> | ReturnType<typeof crosshair<Date, number>>
    > = []

    const fillRamp = areaFillRamp(rows, input)

    if (input.fill) {
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
        transition: {
          type: 'tween' satisfies 'tween',
          duration: input.rollMs,
          easing: input.easing,
        },
      },
      scales: {
        x: {
          scale: scaleUtc().domain([
            DateTime.toDateUtc(DateTime.makeUnsafe(input.xDomain[0])),
            DateTime.toDateUtc(DateTime.makeUnsafe(input.xDomain[1])),
          ]),

          axis: { line: false, ticks: false, tickLabels: false },
        },
        y: {
          scale: scaleLinear().domain([input.yDomain[0], input.yDomain[1]]),
          side: input.yPosition,

          axis: { line: false, ticks: false, tickLabels: false },
        },
      },

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

export { drawnValueAt } from './rows'

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

// WARNING: SAFETY: every live mark is built from LiveRow data, so a point's datum is a LiveRow (or absent).
export const liveRowOf: (
  point: { readonly datum?: unknown } | null | undefined,
) => LiveRow | undefined = (point: { readonly datum?: unknown } | null | undefined) =>
  isLiveRow(point?.datum) ? point.datum : undefined

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

const X_TICK_PADDING = 14

const AREA_OPACITY = 0.1

const PILL_HALO = 22

const PILL_OFFSET = X_TICK_PADDING

const LINE_ID = 'live:line'

interface LiveDefinition {
  definition: DomChartDefinition<LiveRow, Date, number>
  /** The area ramp in svg px: full strength at `top` (the curve's peak), zero at `bottom` (the plot bottom). */
  fillRamp: { readonly top: number; readonly bottom: number }
}

interface TailSpan {
  readonly a: LiveRow
  readonly b: LiveRow
  readonly tip: { readonly t: number; readonly v: number }
}

type LiveTooltipOptions = ChartTooltipOptions<LiveRow, Date, number> & {
  readonly use: ReturnType<typeof nativeTooltip>
}

export { buildLiveYAxisDefinition } from './ylabels-definition'
