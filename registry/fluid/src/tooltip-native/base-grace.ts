/* @license Geometry derived from the pinned Base UI safePolygon implementation; MIT. */
import { Option, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { Side } from './domain.js'
export const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number })
export const Rect = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  top: Schema.Number,
  right: Schema.Number,
  bottom: Schema.Number,
  left: Schema.Number,
})
export type Rect = typeof Rect.Type
export const BaseGrace = Schema.Struct({
  origin: Point,
  side: Side,
  hasLanded: Schema.Boolean,
  last: Schema.Option(Schema.Struct({ point: Point, time: Schema.Number })),
  generation: Schema.Natural,
})
export type BaseGrace = typeof BaseGrace.Type
export const GraceObservation = Schema.Struct({
  point: Point,
  reference: Rect,
  floating: Rect,
  overReference: Schema.Boolean,
  overFloating: Schema.Boolean,
  isLeave: Schema.Boolean,
  relatedFloating: Schema.Boolean,
  hasOpenChild: Schema.Boolean,
  time: Schema.Number,
})
export type GraceObservation = typeof GraceObservation.Type
const POLYGON_BUFFER = 0.5
const hasIntersectingEdge = (
  x: number,
  y: number,
  xi: number,
  yi: number,
  xj: number,
  yj: number,
) => yi >= y !== yj >= y && x <= ((xj - xi) * (y - yi)) / (yj - yi) + xi
const isPointInQuadrilateral = (
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
) =>
  [
    hasIntersectingEdge(x, y, x1, y1, x2, y2),
    hasIntersectingEdge(x, y, x2, y2, x3, y3),
    hasIntersectingEdge(x, y, x3, y3, x4, y4),
    hasIntersectingEdge(x, y, x4, y4, x1, y1),
  ].filter(Boolean).length %
    2 ===
  1
const isInsideAxisAlignedRect = (
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) =>
  x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)
const isInsideRect = (x: number, y: number, rect: Rect) =>
  x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
function polygon(grace: BaseGrace, observation: GraceObservation) {
  const { x, y } = grace.origin
  const { x: clientX, y: clientY } = observation.point
  const side = grace.side
  const rect = observation.floating
  const refRect = observation.reference
  const cursorLeaveFromRight = x > rect.right - rect.width / 2
  const cursorLeaveFromBottom = y > rect.bottom - rect.height / 2
  const isFloatingWider = rect.width > refRect.width
  const isFloatingTaller = rect.height > refRect.height
  let isInsidePolygon = false
  switch (side) {
    case 'top': {
      const cursorXOffset = isFloatingWider ? POLYGON_BUFFER / 2 : POLYGON_BUFFER * 4
      const cursorPointOneX = isFloatingWider
        ? x + cursorXOffset
        : cursorLeaveFromRight
          ? x + cursorXOffset
          : x - cursorXOffset
      const cursorPointTwoX = isFloatingWider
        ? x - cursorXOffset
        : cursorLeaveFromRight
          ? x + cursorXOffset
          : x - cursorXOffset
      const cursorPointY = y + POLYGON_BUFFER + 1
      const commonYLeft = cursorLeaveFromRight
        ? rect.bottom - POLYGON_BUFFER
        : isFloatingWider
          ? rect.bottom - POLYGON_BUFFER
          : rect.top
      const commonYRight = cursorLeaveFromRight
        ? isFloatingWider
          ? rect.bottom - POLYGON_BUFFER
          : rect.top
        : rect.bottom - POLYGON_BUFFER
      isInsidePolygon = isPointInQuadrilateral(
        clientX,
        clientY,
        cursorPointOneX,
        cursorPointY,
        cursorPointTwoX,
        cursorPointY,
        rect.left,
        commonYLeft,
        rect.right,
        commonYRight,
      )
      break
    }
    case 'bottom': {
      const cursorXOffset = isFloatingWider ? POLYGON_BUFFER / 2 : POLYGON_BUFFER * 4
      const cursorPointOneX = isFloatingWider
        ? x + cursorXOffset
        : cursorLeaveFromRight
          ? x + cursorXOffset
          : x - cursorXOffset
      const cursorPointTwoX = isFloatingWider
        ? x - cursorXOffset
        : cursorLeaveFromRight
          ? x + cursorXOffset
          : x - cursorXOffset
      const cursorPointY = y - POLYGON_BUFFER
      const commonYLeft = cursorLeaveFromRight
        ? rect.top + POLYGON_BUFFER
        : isFloatingWider
          ? rect.top + POLYGON_BUFFER
          : rect.bottom
      const commonYRight = cursorLeaveFromRight
        ? isFloatingWider
          ? rect.top + POLYGON_BUFFER
          : rect.bottom
        : rect.top + POLYGON_BUFFER
      isInsidePolygon = isPointInQuadrilateral(
        clientX,
        clientY,
        cursorPointOneX,
        cursorPointY,
        cursorPointTwoX,
        cursorPointY,
        rect.left,
        commonYLeft,
        rect.right,
        commonYRight,
      )
      break
    }
    case 'left': {
      const cursorYOffset = isFloatingTaller ? POLYGON_BUFFER / 2 : POLYGON_BUFFER * 4
      const cursorPointOneY = isFloatingTaller
        ? y + cursorYOffset
        : cursorLeaveFromBottom
          ? y + cursorYOffset
          : y - cursorYOffset
      const cursorPointTwoY = isFloatingTaller
        ? y - cursorYOffset
        : cursorLeaveFromBottom
          ? y + cursorYOffset
          : y - cursorYOffset
      const cursorPointX = x + POLYGON_BUFFER + 1
      const commonXTop = cursorLeaveFromBottom
        ? rect.right - POLYGON_BUFFER
        : isFloatingTaller
          ? rect.right - POLYGON_BUFFER
          : rect.left
      const commonXBottom = cursorLeaveFromBottom
        ? isFloatingTaller
          ? rect.right - POLYGON_BUFFER
          : rect.left
        : rect.right - POLYGON_BUFFER
      isInsidePolygon = isPointInQuadrilateral(
        clientX,
        clientY,
        commonXTop,
        rect.top,
        commonXBottom,
        rect.bottom,
        cursorPointX,
        cursorPointOneY,
        cursorPointX,
        cursorPointTwoY,
      )
      break
    }
    case 'right': {
      const cursorYOffset = isFloatingTaller ? POLYGON_BUFFER / 2 : POLYGON_BUFFER * 4
      const cursorPointOneY = isFloatingTaller
        ? y + cursorYOffset
        : cursorLeaveFromBottom
          ? y + cursorYOffset
          : y - cursorYOffset
      const cursorPointTwoY = isFloatingTaller
        ? y - cursorYOffset
        : cursorLeaveFromBottom
          ? y + cursorYOffset
          : y - cursorYOffset
      const cursorPointX = x - POLYGON_BUFFER
      const commonXTop = cursorLeaveFromBottom
        ? rect.left + POLYGON_BUFFER
        : isFloatingTaller
          ? rect.left + POLYGON_BUFFER
          : rect.right
      const commonXBottom = cursorLeaveFromBottom
        ? isFloatingTaller
          ? rect.left + POLYGON_BUFFER
          : rect.right
        : rect.left + POLYGON_BUFFER
      isInsidePolygon = isPointInQuadrilateral(
        clientX,
        clientY,
        cursorPointX,
        cursorPointOneY,
        cursorPointX,
        cursorPointTwoY,
        commonXTop,
        rect.top,
        commonXBottom,
        rect.bottom,
      )
      break
    }
    default:
  }

  return isInsidePolygon
}
export function evaluateBaseGrace(grace: BaseGrace, observation: GraceObservation) {
  let next = modifyFields(grace, { generation: (generation) => generation + 1 })
  const result = (action: 'keep' | 'close' | 'arm') => ({ grace: next, action })
  const { point, reference: refRect, floating: rect } = observation
  const { x, y } = grace.origin
  const { x: clientX, y: clientY } = point
  const side = grace.side
  if (observation.overFloating) {
    next = modifyFields(next, { hasLanded: () => true })
    if (!observation.isLeave) return result('keep')
  }
  if (observation.overReference) {
    next = modifyFields(next, { hasLanded: () => !observation.isLeave })
    if (!observation.isLeave) return result('keep')
  }
  if ((observation.isLeave && observation.relatedFloating) || observation.hasOpenChild)
    return result('keep')
  if (
    (side === 'top' && y >= refRect.bottom - 1) ||
    (side === 'bottom' && y <= refRect.top + 1) ||
    (side === 'left' && x >= refRect.right - 1) ||
    (side === 'right' && x <= refRect.left + 1)
  )
    return result('close')
  const left = (rect.width > refRect.width ? refRect : rect).left
  const right = (rect.width > refRect.width ? refRect : rect).right
  const top = (rect.height > refRect.height ? refRect : rect).top
  const bottom = (rect.height > refRect.height ? refRect : rect).bottom
  const trough =
    side === 'top'
      ? isInsideAxisAlignedRect(clientX, clientY, left, refRect.top + 1, right, rect.bottom - 1)
      : side === 'bottom'
        ? isInsideAxisAlignedRect(clientX, clientY, left, rect.top + 1, right, refRect.bottom - 1)
        : side === 'left'
          ? isInsideAxisAlignedRect(clientX, clientY, rect.right - 1, bottom, refRect.left + 1, top)
          : isInsideAxisAlignedRect(clientX, clientY, refRect.right - 1, bottom, rect.left + 1, top)
  if (trough) return result('keep')
  if (next.hasLanded && !isInsideRect(clientX, clientY, refRect)) return result('close')
  if (!observation.isLeave) {
    const last = next.last
    next = modifyFields(next, { last: () => Option.some({ point, time: observation.time }) })
    if (Option.isSome(last)) {
      const elapsed = observation.time - last.value.time
      const distance = (clientX - last.value.point.x) ** 2 + (clientY - last.value.point.y) ** 2
      if (elapsed !== 0 && distance < elapsed * elapsed * 0.01) return result('close')
    }
  }
  return result(!polygon(next, observation) ? 'close' : next.hasLanded ? 'keep' : 'arm')
}
