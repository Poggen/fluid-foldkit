// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
// Public helper paths retain Source arithmetic, thresholds and serialization, independently of the D3 renderer.
import { ID_SEP, ringOptions } from './arcs'
import type { ArcDatum, Focus } from './arcs'

const TOP = -Math.PI / 2

const TWO_PI = 2 * Math.PI

/**
 * Angles (radians, 0 at 12 o'clock minus a quarter turn) and radii of one sunburst arc.
 * @internal
 */
export interface ArcGeometry {
  a0: number
  a1: number
  innerR: number
  outerR: number
}

/**
 * Where `arc` sits when `focus` is the zoomed node; `null` when it is outside that subtree.
 * @internal
 */
export function geometryFor(
  arc: ArcDatum,
  focus: Focus,
  maxDepth: number,
  radius: number,
): ArcGeometry | null {
  if (arc.depth <= focus.depth) {
    return null
  }

  if (arc.id !== focus.id && !arc.id.startsWith(`${focus.id}${ID_SEP}`)) {
    return null
  }

  const { centerR, ringWidth } = ringOptions(focus.depth, maxDepth, radius)
  const relativeDepth = arc.depth - focus.depth
  const focusSpan = focus.a1 - focus.a0

  const mapAngle = (angle: number) =>
    focusSpan <= 1e-9 ? TOP : TOP + ((angle - focus.a0) / focusSpan) * TWO_PI

  return {
    a0: mapAngle(arc.a0),
    a1: mapAngle(arc.a1),
    innerR: centerR + (relativeDepth - 1) * ringWidth,
    outerR: centerR + relativeDepth * ringWidth,
  }
}

function lerpAngle(from: number, to: number, progress: number): number {
  let delta = to - from

  while (delta > Math.PI) {
    delta -= TWO_PI
  }

  while (delta < -Math.PI) {
    delta += TWO_PI
  }

  return from + delta * progress
}

/**
 * Interpolate two arcs, turning the short way round.
 * @internal
 */
export function lerpGeometry(from: ArcGeometry, to: ArcGeometry, progress: number): ArcGeometry {
  const t = Math.min(1, Math.max(0, progress))
  const mid = lerpAngle((from.a0 + from.a1) / 2, (to.a0 + to.a1) / 2, t)
  const fromHalf = (from.a1 - from.a0) / 2
  const half = fromHalf + ((to.a1 - to.a0) / 2 - fromHalf) * t

  return {
    a0: mid - half,
    a1: mid + half,
    innerR: from.innerR + (to.innerR - from.innerR) * t,
    outerR: from.outerR + (to.outerR - from.outerR) * t,
  }
}

function pointGeometry(source: ArcGeometry): ArcGeometry {
  const mid = (source.a0 + source.a1) / 2
  const radius = (source.innerR + source.outerR) / 2
  const pin = Math.max(0, Math.min(radius * 0.12, source.innerR))

  return { a0: mid, a1: mid, innerR: pin, outerR: pin }
}

/**
 * Zoom morph: matching arcs interpolate, entering and exiting arcs collapse to a point.
 * @internal
 */
export function transitionGeometry(
  arc: ArcDatum,
  fromFocus: Focus,
  toFocus: Focus,
  maxDepth: number,
  radius: number,
  progress: number,
): ArcGeometry | null {
  const from = geometryFor(arc, fromFocus, maxDepth, radius)
  const to = geometryFor(arc, toFocus, maxDepth, radius)

  if (from && to) {
    return lerpGeometry(from, to, progress)
  }

  if (from) {
    return lerpGeometry(from, pointGeometry(from), progress)
  }

  if (to) {
    return lerpGeometry(pointGeometry(to), to, progress)
  }

  return null
}

function arcPathFromRadii(
  currentA0: number,
  currentA1: number,
  currentInner: number,
  currentOuter: number,
): string | null {
  if (currentOuter - currentInner < 0.5 || currentA1 - currentA0 < 0.001) {
    return null
  }

  const largeArc = currentA1 - currentA0 > Math.PI ? 1 : 0
  const outerX0 = Math.sin(currentA0) * currentOuter
  const outerY0 = -Math.cos(currentA0) * currentOuter
  const outerX1 = Math.sin(currentA1) * currentOuter
  const outerY1 = -Math.cos(currentA1) * currentOuter

  if (currentInner < 1) {
    return `M 0 0 L ${outerX0} ${outerY0} A ${currentOuter} ${currentOuter} 0 ${largeArc} 1 ${outerX1} ${outerY1} Z`
  }

  const innerX1 = Math.sin(currentA1) * currentInner
  const innerY1 = -Math.cos(currentA1) * currentInner
  const innerX0 = Math.sin(currentA0) * currentInner
  const innerY0 = -Math.cos(currentA0) * currentInner

  return `M ${outerX0} ${outerY0} A ${currentOuter} ${currentOuter} 0 ${largeArc} 1 ${outerX1} ${outerY1} L ${innerX1} ${innerY1} A ${currentInner} ${currentInner} 0 ${largeArc} 0 ${innerX0} ${innerY0} Z`
}

/**
 * SVG path of an arc swept in clockwise by `progress` and grown outward by `radialProgress`; `null` when too small to draw.
 * @internal
 */
export function arcPath(
  geometry: ArcGeometry,
  progress: number,
  radialProgress = progress,
): string | null {
  if (progress <= 0 && radialProgress <= 0) {
    return null
  }

  const p = Math.min(1, Math.max(0, progress))
  const radialP = Math.min(1, Math.max(0, radialProgress))
  const { a0, a1, innerR, outerR } = geometry

  if (p >= 1 && radialP >= 1) {
    return arcPathFromRadii(a0, a1, innerR, outerR)
  }

  const currentInner = innerR < 1 ? 0 : innerR
  const currentOuter = innerR < 1 ? outerR * radialP : innerR + (outerR - innerR) * radialP

  return arcPathFromRadii(a0, a0 + (a1 - a0) * p, currentInner, currentOuter)
}

/** @internal */
export function centroidAngle(arc: ArcDatum): number {
  return (arc.a0 + arc.a1) / 2
}

/** @internal */
export function geomCentroidAngle(geometry: ArcGeometry): number {
  return (geometry.a0 + geometry.a1) / 2
}

/** @internal */
export function geomCentroidRadius(geometry: ArcGeometry): number {
  return (geometry.innerR + geometry.outerR) / 2
}
