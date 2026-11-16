// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
import { clockwiseFraction } from './arcs'
import type { ArcDatum } from './arcs'

/**
 * Progress of a staggered animation: 0 until `delay`, then linear over `duration`.
 * @internal
 */
export function localProgress(progress: number, delay: number, duration: number): number {
  if (progress <= delay) {
    return 0
  }

  if (duration <= 0) {
    return 1
  }

  return Math.min(1, (progress - delay) / duration)
}

/**
 * Enter delay (seconds) of one sunburst segment.
 * @internal
 */
export interface SunburstSegmentEnterDelays {
  delay: number
}

/** @internal */
export interface SunburstEnterTiming {
  segmentDelays: Map<string, SunburstSegmentEnterDelays>
  maxDelay: number
}

/**
 * Per-segment enter delays: each ring starts later than the one inside it and segments follow clockwise.
 * @internal
 */
export function buildSunburstEnterTiming(
  arcs: Array<ArcDatum>,
  staggerScale = 1,
): SunburstEnterTiming {
  const scale = Math.max(0.25, staggerScale)
  const byDepth = new Map<number, Array<ArcDatum>>()

  for (const arc of arcs) {
    const list = byDepth.get(arc.depth) ?? []
    list.push(arc)
    byDepth.set(arc.depth, list)
  }

  const segmentDelays = new Map<string, SunburstSegmentEnterDelays>()
  let maxDelay = 0

  for (const [, ringArcs] of byDepth) {
    const sorted = ringArcs.toSorted((a, b) => clockwiseFraction(a.a0) - clockwiseFraction(b.a0))
    const ringIndex = (sorted[0]?.depth ?? 1) - 1

    for (const [index, arc] of sorted.entries()) {
      const delay = (ringIndex * 0.12 + index * 0.08) * scale
      segmentDelays.set(arc.id, { delay })
      maxDelay = Math.max(maxDelay, delay)
    }
  }

  return { segmentDelays, maxDelay }
}

/**
 * Legacy Source compatibility API; prefer buildSunburstEnterTiming.
 * @internal
 */
export interface SunburstRevealSchedule {
  ringStarts: Map<number, number>
  ringDuration: number
  segmentsCompleteAt: number
  labelsStart: number
  labelDuration: number
}

/**
 * Legacy Source compatibility API; prefer buildSunburstEnterTiming.
 * @internal
 */
export function buildRevealSchedule(
  arcs: Array<ArcDatum>,
  staggerScale = 1,
): SunburstRevealSchedule {
  const timing = buildSunburstEnterTiming(arcs, staggerScale)
  const ringStarts = new Map<number, number>()

  for (const arc of arcs) {
    const delays = timing.segmentDelays.get(arc.id)

    if (delays) {
      ringStarts.set(arc.depth, delays.delay)
    }
  }

  return {
    ringDuration: 0.6,
    ringStarts,
    segmentsCompleteAt: timing.maxDelay,
    labelsStart: timing.maxDelay + 0.12,
    labelDuration: 0.2,
  }
}

/**
 * Legacy Source ring-sweep API; prefer buildSunburstEnterTiming.
 * @internal
 */
export function segmentRevealFromRingSweep(ringProgress: number, a0: number, a1: number) {
  const radial = Math.min(1, Math.max(0, ringProgress))
  const startF = clockwiseFraction(a0)
  const endF = clockwiseFraction(a1)

  if (ringProgress <= startF) {
    return { angular: 0, radial }
  }

  if (ringProgress >= endF) {
    return { angular: 1, radial }
  }

  return { angular: (ringProgress - startF) / Math.max(endF - startF, 1e-9), radial }
}

/**
 * Legacy Source compatibility API; prefer buildSunburstEnterTiming.
 * @internal
 */
export function buildRevealDelays(arcs: Array<ArcDatum>): Map<string, number> {
  const timing = buildSunburstEnterTiming(arcs)

  return new Map(arcs.map((arc) => [arc.id, timing.segmentDelays.get(arc.id)?.delay ?? 0]))
}
