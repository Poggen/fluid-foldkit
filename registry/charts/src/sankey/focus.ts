// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
// Pointer-in-shape focus for sankey: nodes first (last painted wins), then flows (topmost wins), by exact containment; keyboard order is the
// laid-out reading order, nodes column by column then flows by source column and y (the default nearest-segment pick mis-picks across bends).
import type { ChartFocusStrategy, ChartPoint } from '@tanstack/charts'
import { isRecord } from '../kit/guards'
import { Predicate } from 'effect'
import type { TooltipBodyPoint } from './private/native-tooltip'

const SANKEY_NODE_POINT_MARK_ID = 'sankey:sankey-node-'

const SANKEY_LINK_POINT_MARK_ID = 'sankey:flow'

export function sankeyTooltipKey({ markId, datum, datumIndex }: TooltipBodyPoint): string {
  if (!isRecord(datum)) return 'none'
  if (markId.startsWith(SANKEY_NODE_POINT_MARK_ID) && Predicate.isNumber(datum.key))
    return `node:${datum.key}`
  if (markId.startsWith(SANKEY_LINK_POINT_MARK_ID))
    return `link:${Predicate.isNumber(datum.sourceIndex) ? datum.sourceIndex : datumIndex}`
  return 'none'
}

interface NodeBox {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
  readonly labelBoxes: ReadonlyArray<NodeBox>
  readonly radius: number
}

interface FlowBox {
  readonly x1: number
  readonly x2: number
  readonly y1: number
  readonly y2: number
  readonly width: number
}

const num = (value: unknown): number => (typeof value === 'number' ? value : Number.NaN)

const readNode = (datum: unknown): NodeBox | null => {
  if (!isRecord(datum)) {
    return null
  }

  const labelBoxes = Array.isArray(datum.labelBoxes)
    ? datum.labelBoxes.map(readNode).filter((box): box is NodeBox => box !== null)
    : []

  return {
    labelBoxes,
    radius: Number.isFinite(num(datum.radius)) ? num(datum.radius) : 0,
    x0: num(datum.x0),
    x1: num(datum.x1),
    y0: num(datum.y0),
    y1: num(datum.y1),
  }
}

const readFlow = (datum: unknown): FlowBox | null => {
  if (!isRecord(datum)) {
    return null
  }

  return {
    width: num(datum.width),
    x1: num(datum.x1),
    x2: num(datum.x2),
    y1: num(datum.y1),
    y2: num(datum.y2),
  }
}

// curveBumpX centreline x(t) = x1 + dx*(1.5t(1-t) + t^3), y(t) = y1 + dy*(3t^2 - 2t^3), hit by true point-to-segment distance (SVG butt caps).
const CURVE_SEGMENTS = 48

interface Centre {
  readonly x: number
  readonly y: number
}

const centreAt = (flow: FlowBox, t: number): Centre => ({
  x: flow.x1 + (flow.x2 - flow.x1) * (1.5 * t * (1 - t) + t ** 3),
  y: flow.y1 + (flow.y2 - flow.y1) * (3 * t * t - 2 * t ** 3),
})

const distanceToCentre = (flow: FlowBox, px: number, py: number): number => {
  let best = Number.POSITIVE_INFINITY
  let prev = centreAt(flow, 0)

  for (let step = 1; step <= CURVE_SEGMENTS; step += 1) {
    const next = centreAt(flow, step / CURVE_SEGMENTS)
    const sx = next.x - prev.x
    const sy = next.y - prev.y
    const len2 = sx * sx + sy * sy
    const u = len2 === 0 ? 0 : ((px - prev.x) * sx + (py - prev.y) * sy) / len2
    const outsideCap = (step === 1 && u < 0) || (step === CURVE_SEGMENTS && u > 1)

    if (!outsideCap) {
      const k = Math.min(1, Math.max(0, u))
      best = Math.min(best, Math.hypot(px - (prev.x + sx * k), py - (prev.y + sy * k)))
    }

    prev = next
  }

  return best
}

const inBox = (box: NodeBox, x: number, y: number): boolean =>
  x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1

// bklit's node is a rounded <rect> (sankey-node.tsx:240-251): SVG hit-testing excludes the corners and the right edge, where the link starts (sankey-link.tsx).
const inRoundedRect = (box: NodeBox, x: number, y: number): boolean => {
  if (x < box.x0 || x >= box.x1 || y < box.y0 || y > box.y1) {
    return false
  }

  const r = Math.min(box.radius, (box.x1 - box.x0) / 2, (box.y1 - box.y0) / 2)
  const dx = Math.max(box.x0 + r - x, x - (box.x1 - r), 0)
  const dy = Math.max(box.y0 + r - y, y - (box.y1 - r), 0)

  return dx * dx + dy * dy <= r * r
}

const hitNode = (box: NodeBox | null, x: number, y: number): boolean =>
  box !== null && (inRoundedRect(box, x, y) || box.labelBoxes.some((label) => inBox(label, x, y)))

const hitFlow = (flow: FlowBox | null, x: number, y: number): boolean => {
  if (flow === null || x < Math.min(flow.x1, flow.x2) || x > Math.max(flow.x1, flow.x2)) {
    return false
  }

  return distanceToCentre(flow, x, y) <= Math.max(1, flow.width) / 2
}

const midY = (box: NodeBox): number => (box.y0 + box.y1) / 2

const nodeOrder = (left: NodeBox | null, right: NodeBox | null): number => {
  if (left === null || right === null) {
    return 0
  }

  return left.x0 - right.x0 || midY(left) - midY(right)
}

const flowOrder = (left: FlowBox | null, right: FlowBox | null): number => {
  if (left === null || right === null) {
    return 0
  }

  return left.x1 - right.x1 || left.y1 - right.y1 || left.y2 - right.y2
}

const createSankeyFocus = <TDatum>(
  presented?: (markId: string, datumIndex: number, x: number, y: number) => boolean | null,
): ChartFocusStrategy<TDatum, number, number> => {
  const nodesOf = (
    points: ReadonlyArray<ChartPoint<TDatum, number, number>>,
  ): Array<ChartPoint<TDatum, number, number>> =>
    points.filter((point) => point.markId.startsWith(SANKEY_NODE_POINT_MARK_ID))

  const linksOf = (
    points: ReadonlyArray<ChartPoint<TDatum, number, number>>,
  ): Array<ChartPoint<TDatum, number, number>> =>
    points.filter((point) => point.markId.startsWith(SANKEY_LINK_POINT_MARK_ID))

  const semantic = (points: ReadonlyArray<ChartPoint<TDatum, number, number>>) => {
    const owned = new Map<string, ChartPoint<TDatum, number, number>>()
    for (const point of points) {
      const key = isRecord(point.datum) ? point.datum.key : point.key
      owned.set(String(key), point)
    }
    return [...owned.values()]
  }

  return {
    group: (_points, context) => [context.point],
    navigation: (points) => [
      ...semantic(nodesOf(points)).toSorted((left, right) =>
        nodeOrder(readNode(left.datum), readNode(right.datum)),
      ),
      ...semantic(linksOf(points)).toSorted((left, right) =>
        flowOrder(readFlow(left.datum), readFlow(right.datum)),
      ),
    ],
    resolve: (points, { x, y }) => {
      // SVG hit testing gives the last authored carrier precedence, including labels on repeated node roles.
      for (const point of points.toReversed()) {
        const hit = presented?.(point.markId, point.datumIndex, x, y)
        if (hit === true) return [point]
        if (hit === false) continue
        if (
          point.markId.startsWith(SANKEY_NODE_POINT_MARK_ID) &&
          hitNode(readNode(point.datum), x, y)
        )
          return [point]
        if (
          point.markId.startsWith(SANKEY_LINK_POINT_MARK_ID) &&
          hitFlow(readFlow(point.datum), x, y)
        )
          return [point]
      }

      return []
    },
  }
}

export { createSankeyFocus, SANKEY_LINK_POINT_MARK_ID, SANKEY_NODE_POINT_MARK_ID }
