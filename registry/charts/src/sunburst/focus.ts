import { findNearestPoint } from '@tanstack/charts'
import type { ChartFocusStrategy, ChartPoint, ChartScene } from '@tanstack/charts'

interface SunburstFocusOptions<TDatum> {
  /** Last rendered scene (read at pointer time; the strategy is built with the definition). */
  readonly scene: () => ChartScene<TDatum, number, number> | null
  /** Navigation rank of a point's datum; undefined leaves it out of keyboard order. */
  readonly orderOf: (datum: TDatum) => number | undefined
  /** False while the point's sector has not yet swept to the pointer (entrance only): bklit's hit path is the growing arc (sunburst-segment.tsx:98-100). */
  readonly swept: (datum: TDatum, x: number, y: number) => boolean
  /** The sector whose exact arc contains the point. The native hit polygon cuts each arc edge with a few chords, leaving a sub-pixel sliver along the outer edge that bklit's SVG arc path covers (UPSTREAM-GAPS #67). */
  readonly exactAt: (x: number, y: number) => ChartPoint<TDatum, number, number> | null
  /** The point kept hovered when a pointer move lands off every sector (hub, gaps, corners): bklit's sectors only set the hover on pointerenter. Null for a click, a re-resolve or a pointer on a sector. */
  readonly heldAt: (x: number, y: number) => ChartPoint<TDatum, number, number> | null | undefined
}

const createSunburstFocus: <TDatum>(
  options: Readonly<SunburstFocusOptions<TDatum>>,
) => ChartFocusStrategy<TDatum, number, number> = <TDatum>(
  options: Readonly<SunburstFocusOptions<TDatum>>,
) => {
  const hittable = new WeakMap<object, ReadonlyArray<ChartPoint<TDatum, number, number>>>()

  return {
    group: (_points, context) => [context.point],
    navigation: (points) =>
      points
        .flatMap((point) => {
          const rank = options.orderOf(point.datum)

          return rank === undefined ? [] : [{ point, rank }]
        })
        .toSorted((left, right) => left.rank - right.rank)
        .map(({ point }) => point),

    resolve: (_points, { x, y, maxDistance }) => {
      const scene = options.scene()

      if (scene === null) {
        return []
      }

      const held = options.heldAt(x, y)

      if (held !== undefined) {
        return held === null ? [] : [held]
      }

      let allowed = hittable.get(scene)

      if (allowed === undefined) {
        allowed = scene.points.filter((point) => options.orderOf(point.datum) !== undefined)
        hittable.set(scene, allowed)
      }

      const point = options.exactAt(x, y) ?? findNearestPoint(scene, x, y, maxDistance, allowed)

      return point === null || !options.swept(point.datum, x, y) ? [] : [point]
    },
  } satisfies ChartFocusStrategy<TDatum, number, number>
}

export { createSunburstFocus }
