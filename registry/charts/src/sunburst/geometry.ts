/* @license Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT. */

import { arc as d3Arc } from 'd3-shape'

/** [startAngle, endAngle, innerRadius, outerRadius] of one sector, angles clockwise from 12 o'clock. */
export type ArcValues = readonly [start: number, end: number, inner: number, outer: number]

const TURN = 2 * Math.PI

const DEG = 180 / Math.PI

const QUARTER_TURN_DEG = 90

const PIN_RATIO = 0.12

const MIN_ARC_LENGTH_PX = 26

const MIN_RING_THICKNESS_PX = 16

export interface SectorLayout {
  /** Angular extent of the view's root: a node's share of the circle is its extent over this. */
  readonly rootStart: number
  readonly rootEnd: number
  readonly startAngle: number
  readonly endAngle: number
  readonly inner: number
  readonly outer: number
  /** Rings below the view's root (the native `ringCount`). */
  readonly rings: number
}

/** The native sunburst's partition: the node's share of the root's span, on ring `depth` (1 = first ring below the root). */
export const sectorArc: (
  layout: Readonly<SectorLayout>,
  a0: number,
  a1: number,
  depth: number,
) => ArcValues = (layout: Readonly<SectorLayout>, a0: number, a1: number, depth: number) => {
  const span = layout.endAngle - layout.startAngle
  const rootSpan = layout.rootEnd - layout.rootStart
  const ring = (layout.outer - layout.inner) / layout.rings
  const inner = layout.inner + (depth - 1) * ring

  return [
    layout.startAngle + ((a0 - layout.rootStart) / rootSpan) * span,
    layout.startAngle + ((a1 - layout.rootStart) / rootSpan) * span,
    inner,
    inner + ring,
  ]
}

export const collapsedArc: (argument0: ArcValues) => ArcValues = ([
  start,
  end,
  inner,
  outer,
]: ArcValues) => {
  const mid = (start + end) / 2
  const pin = Math.max(0, Math.min(((inner + outer) / 2) * PIN_RATIO, inner))

  return [mid, mid, pin, pin] satisfies ArcValues
}

export const lerpArc: (from: ArcValues, to: ArcValues, t: number) => ArcValues = (
  from: ArcValues,
  to: ArcValues,
  t: number,
) => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
  from[3] + (to[3] - from[3]) * t,
]

export const sameArc: (a: ArcValues, b: ArcValues) => boolean = (a: ArcValues, b: ArcValues) =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]

export const unwrapArc: (to: ArcValues, from: ArcValues) => ArcValues = (
  to: ArcValues,
  from: ArcValues,
) => {
  const turns = Math.round(((from[0] + from[1]) / 2 - (to[0] + to[1]) / 2) / TURN)

  return turns === 0 ? to : [to[0] + turns * TURN, to[1] + turns * TURN, to[2], to[3]]
}

export const labelFits: (argument0: ArcValues, scale: number) => boolean = (
  [start, end, inner, outer]: ArcValues,
  scale: number,
) =>
  (((end - start) * ((inner + outer) / 2)) / scale >= MIN_ARC_LENGTH_PX &&
    (outer - inner) / scale >= MIN_RING_THICKNESS_PX) satisfies boolean

export interface LabelPose {
  readonly x: number
  readonly y: number
  readonly rotate: number
}

export const poseOf: (argument0: ArcValues) => LabelPose = ([
  start,
  end,
  inner,
  outer,
]: ArcValues) => {
  const mid = (start + end) / 2
  const radius = (inner + outer) / 2
  let rotate = (((mid % TURN) + TURN) % TURN) * DEG - QUARTER_TURN_DEG

  if (rotate > QUARTER_TURN_DEG) {
    rotate -= 2 * QUARTER_TURN_DEG
  }

  if (rotate < -QUARTER_TURN_DEG) {
    rotate += 2 * QUARTER_TURN_DEG
  }

  return { rotate, x: Math.sin(mid) * radius, y: -Math.cos(mid) * radius } satisfies LabelPose
}

const generator = d3Arc<ArcValues>()
  .startAngle((values) => values[0])
  .endAngle((values) => values[1])
  .innerRadius((values) => values[2])
  .outerRadius((values) => values[3])
  .cornerRadius(0)

/** The sector path the native sunburst draws (same d3 arc, no corner radius). */
export const sectorPath: (values: ArcValues) => string = (values: ArcValues) =>
  generator(values) ?? ''

/** Original applyHoverGrow: preserve circular arcs while growing each ancestor ring radially. */
export const hoverArc: (
  arc: ArcValues,
  id: string | undefined,
  growth: ReadonlyMap<string, number>,
) => ArcValues = (arc: ArcValues, id: string | undefined, growth: ReadonlyMap<string, number>) => {
  if (id === undefined || growth.size === 0) return arc
  const parts = id.split(' / ')
  let push = 0
  for (let i = 1; i < parts.length; i += 1) push += growth.get(parts.slice(0, i).join(' / ')) ?? 0
  return [arc[0], arc[1], arc[2] + push, arc[3] + push + (growth.get(id) ?? 0)]
}

const middle: (values: ReadonlyArray<number>) => number = (values: ReadonlyArray<number>) =>
  (Math.min(...values) + Math.max(...values)) / 2

interface Point {
  readonly x: number
  readonly y: number
}

/** Centre of the bounding box of an annular sector (angles clockwise from 12 o'clock), as the SVG fill-box origin sees it. */
export const sweptArcBox: (lead: number, span: number, inner: number, outer: number) => Point = (
  lead: number,
  span: number,
  inner: number,
  outer: number,
) => {
  const angles = [lead, lead + span]

  for (let k = Math.ceil(lead / (Math.PI / 2)); k * (Math.PI / 2) <= lead + span; k += 1) {
    angles.push(k * (Math.PI / 2))
  }

  const xs = angles.flatMap((a) => [inner * Math.sin(a), outer * Math.sin(a)])
  const ys = angles.flatMap((a) => [-inner * Math.cos(a), -outer * Math.cos(a)])

  return { x: middle(xs), y: middle(ys) }
}
