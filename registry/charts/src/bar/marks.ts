import type { DepthFrame } from './depth-frame'
// Bar-family marks that have no native equivalent (squares, depth, pulse).
import { createMark } from '@tanstack/charts'
import type {
  ChartMark,
  ChartMotionContext,
  ChartPoint,
  ResolvedScale,
  SceneNode,
} from '@tanstack/charts'

import { squareColumnFrame } from './geometry'
import type { SquareColumnLayout } from './geometry'
import { squareFill } from './square-paints'
import type { BarLayer } from './options'
import { REVEAL_EASING } from '../kit/motion/easing'
import { enterOrResume } from './enter-timing'
import type { EnterTiming, EnterClock } from './enter-timing'
import { yScaleForAxis } from '../cartesian/build-state'
import { barIndexClass } from './hover'
import type { HoverTarget } from './hover'
import type { BarDatum, BarSeries } from './model'

export interface ExtraMarkInput<Row> {
  readonly bandWidth: number
  readonly depthFrame: DepthFrame
  readonly revealed: boolean
  readonly datums: ReadonlyArray<BarDatum<Row>>
  readonly series: ReadonlyArray<BarSeries>
  readonly children: ReadonlyArray<BarLayer<Row>>
  readonly categories: ReadonlyArray<string>
  readonly animationDuration: number
  readonly faded: number
  readonly uid: string
  readonly stacked?: boolean
  /** First paint of an entrance: square columns render collapsed so the next build tweens them in. */
  readonly seed: boolean
  /** Entrance clock shared across builds (the seed build and the one after it): later updates resume it, then snap. */
  readonly clock: EnterClock
  /** The plot height of the latest draw, unfloored (written by the definition's `chart` callback before the marks render). */
  readonly live: { innerHeight: number }
}

/** Documented node `className` (reference/runtime-and-scene.md "Scene nodes") the hover CSS selects, instead of the key encoding. */
const columnClass = (kind: 'squares' | 'track', seriesIndex: number): string =>
  `bkm-b${kind}-s${seriesIndex}`

const SQUARE_GAP = 3

const SQUARE_RADIUS = 0.25

type Scales = Readonly<Record<string, ResolvedScale>>

/** A chart scale by channel name; typed optional because a chart without that channel has no scale. */
export const scaleAt = (scales: Scales, key: string): ResolvedScale | undefined => scales[key]

interface ColumnInput<Row> {
  readonly bandWidth: number
  readonly id: string
  readonly datums: ReadonlyArray<BarDatum<Row>>
  readonly slot: number
  readonly slots: number
  readonly groupGap: number
  readonly kind: 'squares' | 'track'
  readonly yScale: string
  readonly squareGap: number
  readonly squareRadius: number
  readonly squareFit: boolean
  readonly fill: string
  readonly opacity: number
  readonly fillOf?: (rowIndex: number) => string
  readonly animationDuration: number
  readonly staggerMs: number
  readonly animate: boolean
  readonly seed: boolean
  readonly clock: EnterClock
  readonly uid: string
  readonly live: { innerHeight: number }
}

interface ColumnFrame {
  readonly pointKey: string
  readonly className: string
  readonly x: number
  readonly size: number
  readonly radius: number
  readonly columnTop: number
  readonly baseline: number
}

function trackNode<Row>(input: ColumnInput<Row>, f: ColumnFrame, seedTop: number): SceneNode {
  const height = Math.max(0, f.columnTop - seedTop)

  // Seed: bklit starts the track as a full-height column (y 0 .. baseline) that shrinks to its remainder.
  return {
    kind: 'rect',
    key: `${f.pointKey}:sq0`,
    className: f.className,
    x: f.x,
    y: input.seed ? seedTop : f.columnTop - height,
    width: f.size,
    height: input.seed ? f.baseline - seedTop : height,
    radius: f.radius,
    ariaHidden: true,
    style: { fill: input.fill, opacity: input.opacity },
  }
}

function squareNodes<Row>(
  input: ColumnInput<Row>,
  f: ColumnFrame,
  col: SquareColumnLayout,
  rowIndex: number,
): Array<SceneNode> {
  return col.positions.map((rel, i): SceneNode => {
    // Seed: each square starts as a zero-height sliver on its own bottom edge (bklit grows it in place).
    const squareY = f.columnTop + rel
    const seed = input.seed && input.animate

    return {
      kind: 'rect',
      key: `${f.pointKey}:sq${i}`,
      className: f.className,
      x: f.x,
      y: seed ? squareY + f.size : squareY,
      width: f.size,
      height: seed ? 0 : f.size,
      radius: f.radius,
      style: { fill: input.fillOf?.(rowIndex) ?? input.fill, opacity: 1 },
    }
  })
}

function columnTiming<Row>(
  input: ColumnInput<Row>,
  counts: ReadonlyMap<string, number>,
  ctx: ChartMotionContext<BarDatum<Row>>,
): EnterTiming {
  const { id, kind } = input
  const total = input.animationDuration
  const cat = Math.max(0, ctx.datumIndex)
  const sqIndex = Number(/:sq(?<square>\d+)$/u.exec(ctx.key)?.groups?.square ?? 0)
  const count = counts.get(ctx.key.slice(id.length + 1).replace(/:sq\d+$/u, '')) ?? 1
  const cascade = kind === 'squares' && count > 1 ? (total * 0.4) / (count - 1) : 0
  // bklit runs every square on the full enter tween (delay = column stagger + square cascade); the track
  // shrinks from the full plot height over that tween plus the column's whole cascade.
  const trackSpan = count > 1 ? total * 1.4 : total

  const plan = {
    delay: cat * input.staggerMs + sqIndex * cascade,
    duration: kind === 'squares' ? total : trackSpan,
    easing: REVEAL_EASING,
  }

  // Seeded squares are collapsed nodes, so the entrance arrives as the first UPDATE. A render forced mid-entrance
  // (web-font swap) re-enters here as another update: resume the schedule instead of restarting it; false once it is over.
  return enterOrResume(input.clock, ctx.phase, plan)
}

/** One column of stacked squares per category (kind "squares") or the empty remainder above it (kind "track"), as plain rect nodes keyed under a point key. */
function columnMark<Row>(input: ColumnInput<Row>): ChartMark<BarDatum<Row>, string, number> {
  const { id, datums, slot, slots, groupGap, kind } = input
  const counts = new Map<string, number>()

  // The schedule must outlive the mark thunk (re-run per render) and the build (seed, then full): clock lives in the input.
  return createMark<BarDatum<Row>, string, number>(() => ({
    id,
    channels: {
      x: { scale: 'x', values: datums.map((d) => d.category) },
      y: { scale: input.yScale, includeZero: true, values: datums.map((d) => d.value) },
    },
    motion: input.animate
      ? (ctx: ChartMotionContext<BarDatum<Row>>): EnterTiming => columnTiming(input, counts, ctx)
      : false,
    render: ({ scales, color }) => {
      const sx = scaleAt(scales, 'x')
      const sy = scaleAt(scales, input.yScale)
      const nodes: Array<SceneNode> = []
      const points: Array<ChartPoint<BarDatum<Row>, string, number>> = []

      if (sx === undefined || sy === undefined) {
        return { nodes, points }
      }

      // bklit's value scale runs [innerHeight, 0], so a host shorter than its margins gives every column a negative length and no square (bar-squares.tsx:338-355);
      // the renderer floors the plot at 1px, which would leave a row of sub-pixel squares.
      if (input.live.innerHeight <= 0) {
        return { nodes, points }
      }

      for (const [index, d] of datums.entries()) {
        const projected = squareColumnFrame({
          centre: sx.map(d.category) - sx.bandwidth / 2 + input.bandWidth / 2,
          bandwidth: input.bandWidth,
          baseline: sy.map(0),
          top: sy.map(d.value),
          value: d.value,
          slot,
          slots,
          groupGap,
          squareGap: input.squareGap,
          fit: input.squareFit,
        })

        const pointKey = `${id}:${d.index}`
        const className = `${columnClass(kind, slot)} ${barIndexClass(d.index)}`
        points.push({
          key: pointKey,
          markId: id,
          group: d.series,
          groupLabel: d.series,
          datum: d,
          datumIndex: index,
          xValue: d.category,
          yValue: d.value,
          x:
            projected === null
              ? sx.map(d.category) - sx.bandwidth / 2 + input.bandWidth / 2
              : projected.x + projected.size / 2,
          y: projected?.columnTop ?? sy.map(d.value),
          color: color(d.series),
        })
        if (projected !== null && projected.size > 0) {
          const { x, size, baseline, columnTop, column: col } = projected
          const radius = size * input.squareRadius
          counts.set(String(d.index), col.count)
          const frame: ColumnFrame = { pointKey, className, x, size, radius, columnTop, baseline }
          nodes.push(
            ...(kind === 'track'
              ? [trackNode(input, frame, sy.map(sy.domain[1]))]
              : squareNodes(input, frame, col, d.index)),
          )
        }
      }

      return { nodes, points }
    },
  }))
}

export interface ExtraMarks<Row> {
  readonly marks: Array<ChartMark<BarDatum<Row>, string, number>>
  readonly hover: Array<HoverTarget>
}

function columnStagger(delay: number | undefined, fallbackMs: number): number {
  return delay === undefined ? fallbackMs : delay * 1000
}

export function buildExtraMarks<Row>(input: ExtraMarkInput<Row>): ExtraMarks<Row> {
  const { series, datums, children, animationDuration } = input

  const squares = series.flatMap((s) =>
    s.kind === 'squares' && s.squares ? [{ series: s, props: s.squares }] : [],
  )

  const out: Array<ChartMark<BarDatum<Row>, string, number>> = []

  if (input.stacked === true) {
    return { marks: out, hover: [] }
  }

  const staggerMs = (animationDuration * 0.4) / Math.max(1, input.categories.length)
  const track = children.find((child) => child.kind === 'barColumnTrack')?.props
  const slots = series.length
  const hover: Array<HoverTarget> = []

  const common = {
    bandWidth: input.bandWidth,
    uid: input.uid,
    seed: input.seed,
    clock: input.clock,
    live: input.live,
    animationDuration,
    staggerMs,
    animate: true,
  }

  if (track !== undefined) {
    for (const s of series) {
      // bklit hides the empty track on any hover.
      hover.push({ select: `.${columnClass('track', s.index)}`, keep: null, dim: 0, snap: true })
      out.push(
        columnMark({
          ...common,
          id: `track:${s.key}`,
          datums: datums.filter((d) => d.series === s.key),
          slot: s.index,
          yScale: yScaleForAxis(s.yAxisId).yScale,
          slots,
          groupGap: track.groupGap ?? 4,
          kind: 'track',
          squareGap: track.squareGap ?? SQUARE_GAP,
          squareRadius: track.squareRadius ?? SQUARE_RADIUS,
          squareFit: track.squareFit ?? false,
          fill: track.fill ?? 'var(--chart-grid)',
          opacity: track.opacity ?? 0.3,
          // An own `staggerDelay` (seconds) replaces the derived column spread (bklit bar-squares.tsx:460-462).
          staggerMs: columnStagger(track.staggerDelay, staggerMs),
        }),
      )
    }
  }

  for (const { series: s, props } of squares) {
    hover.push({
      select: `.${columnClass('squares', s.index)}`,
      keep: (index) => `.${barIndexClass(index)}`,
      dim: props.fadedOpacity ?? input.faded,
      easing: 'ease-out',
      seriesIndex: s.index,
    })

    out.push(
      columnMark({
        ...common,
        id: `squares:${s.key}`,
        animate: props.animate ?? true,
        datums: datums.filter((d) => d.series === s.key),
        slot: s.index,
        yScale: yScaleForAxis(s.yAxisId).yScale,
        slots,
        groupGap: props.groupGap ?? 4,
        kind: 'squares',
        squareGap: props.squareGap ?? SQUARE_GAP,
        squareRadius: props.squareRadius ?? SQUARE_RADIUS,
        squareFit: props.squareFit ?? false,
        fill: s.fill,
        fillOf: (rowIndex) => squareFill(input.uid, s, rowIndex),
        opacity: 1,
        // An own `staggerDelay` (seconds) replaces the derived column spread (bklit bar-squares.tsx:334-336).
        staggerMs: columnStagger(props.staggerDelay, staggerMs),
      }),
    )
  }

  return { marks: out, hover }
}
