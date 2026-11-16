import { focusGroupX } from '@tanstack/charts/focus'
import type {
  ChartFocusGroupContext,
  ChartFocusResolveContext,
  ChartPoint,
  ChartValue,
} from '@tanstack/charts'
import type { Margin } from './context-types'

/** Keep keyboard navigation at the hovered x column when several series share it. */
export function navigationPrimary<Point extends { readonly y: number }>(
  resolved: ReadonlyArray<Point>,
  universe: ReadonlyArray<Point>,
): ReadonlyArray<Point> {
  const first = resolved[0]

  if (first === undefined || resolved.length < 2) return resolved
  let representative = first

  for (const point of resolved) {
    if (
      point.y < representative.y ||
      (point.y === representative.y && universe.indexOf(point) < universe.indexOf(representative))
    )
      representative = point
  }

  return representative === first
    ? resolved
    : [representative, ...resolved.filter((point) => point !== representative)]
}

/** Source group-x focus, plot-only hit area and lower-x tie-break without heterogeneous datum erasure. */
export function cartesianFocus(
  margin: Margin,
  size: () => { readonly innerWidth: number; readonly innerHeight: number },
) {
  return {
    group<Datum, X extends ChartValue, Y extends ChartValue>(
      this: void,
      points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
      context: ChartFocusGroupContext<Datum, X, Y>,
    ): Array<ChartPoint<Datum, X, Y>> {
      return focusGroupX.group(points, context)
    },
    navigation<Datum, X extends ChartValue, Y extends ChartValue>(
      this: void,
      points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
    ): Array<ChartPoint<Datum, X, Y>> {
      return focusGroupX.navigation(points)
    },
    resolve<Datum, X extends ChartValue, Y extends ChartValue>(
      points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
      context: ChartFocusResolveContext,
    ): ReadonlyArray<ChartPoint<Datum, X, Y>> {
      const { innerWidth: width, innerHeight } = size()
      const height = Math.max(0, innerHeight)

      if (
        width > 0 &&
        height > 0 &&
        !(
          context.x >= margin.left &&
          context.x <= margin.left + width &&
          context.y >= margin.top &&
          context.y <= margin.top + height
        )
      )
        return []
      const best = Math.min(...points.map((point) => Math.abs(point.x - context.x)))
      const tied = points.filter((point) => Math.abs(Math.abs(point.x - context.x) - best) <= 1e-6)
      const first = tied[0]

      if (
        first !== undefined &&
        tied.length > 1 &&
        tied.some((point) => Math.abs(point.x - first.x) > 1e-6)
      ) {
        const lowerX = Math.min(...tied.map((point) => point.x))

        return navigationPrimary(
          focusGroupX.resolve(
            tied.filter((point) => Math.abs(point.x - lowerX) <= 1e-6),
            context,
          ),
          points,
        )
      }

      return navigationPrimary(focusGroupX.resolve(points, context), points)
    },
  }
}

export function keyboardIndex(
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'Escape',
  current: number | null,
  count: number,
): number | null {
  if (key === 'Escape' || count === 0) return null

  if (key === 'Home') return 0

  if (key === 'End') return count - 1
  const backwards = key === 'ArrowLeft' || key === 'ArrowUp'

  return Math.max(
    0,
    Math.min(count - 1, (current ?? (backwards ? count : -1)) + (backwards ? -1 : 1)),
  )
}

export function keyboardCandidateIndex(
  key: Parameters<typeof keyboardIndex>[0],
  current: number | null,
  candidates: ReadonlyArray<number>,
): number | null {
  const position = current === null ? null : candidates.indexOf(current)
  const index = keyboardIndex(key, position === -1 ? null : position, candidates.length)

  return index === null ? null : (candidates[index] ?? null)
}
