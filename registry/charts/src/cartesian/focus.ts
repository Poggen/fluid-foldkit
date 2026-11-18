import { focusGroupX } from '@tanstack/charts/focus'
import type {
  ChartFocusGroupContext,
  ChartFocusResolveContext,
  ChartPoint,
  ChartValue,
} from '@tanstack/charts'
import type { Margin } from './context-types'

/** Keep keyboard navigation at the hovered x column when several series share it. */
export const navigationPrimary: <Point extends { readonly y: number }>(
  resolved: ReadonlyArray<Point>,
  universe: ReadonlyArray<Point>,
) => ReadonlyArray<Point> = function navigationPrimary<Point extends { readonly y: number }>(
  resolved: ReadonlyArray<Point>,
  universe: ReadonlyArray<Point>,
) {
  const first = resolved[0]

  if (first === undefined || resolved.length < 2) return resolved satisfies ReadonlyArray<Point>
  let representative = first

  for (const point of resolved) {
    if (
      point.y < representative.y ||
      (point.y === representative.y && universe.indexOf(point) < universe.indexOf(representative))
    )
      representative = point
  }

  return (
    representative === first
      ? resolved
      : [representative, ...resolved.filter((point) => point !== representative)]
  ) satisfies ReadonlyArray<Point>
}

export const keyboardIndex: (
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'Escape',
  current: number | null,
  count: number,
) => number | null = function keyboardIndex(
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'Escape',
  current: number | null,
  count: number,
) {
  if (key === 'Escape' || count === 0) return null

  if (key === 'Home') return 0

  if (key === 'End') return count - 1
  const backwards = key === 'ArrowLeft' || key === 'ArrowUp'

  return Math.max(
    0,
    Math.min(count - 1, (current ?? (backwards ? count : -1)) + (backwards ? -1 : 1)),
  )
}

export const keyboardCandidateIndex: (
  key: Parameters<typeof keyboardIndex>[0],
  current: number | null,
  candidates: ReadonlyArray<number>,
) => number | null = function keyboardCandidateIndex(
  key: Parameters<typeof keyboardIndex>[0],
  current: number | null,
  candidates: ReadonlyArray<number>,
) {
  const position = current === null ? null : candidates.indexOf(current)
  const index = keyboardIndex(key, position === -1 ? null : position, candidates.length)

  return index === null ? null : (candidates[index] ?? null)
}

/** Source group-x focus, plot-only hit area and lower-x tie-break without heterogeneous datum erasure. */
export function cartesianFocus(
  margin: Margin,
  size: () => { readonly innerWidth: number; readonly innerHeight: number },
) {
  const group: <Datum, X extends ChartValue, Y extends ChartValue>(
    this: void,
    points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
    context: ChartFocusGroupContext<Datum, X, Y>,
  ) => Array<ChartPoint<Datum, X, Y>> = <Datum, X extends ChartValue, Y extends ChartValue>(
    points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
    context: ChartFocusGroupContext<Datum, X, Y>,
  ) => {
    return focusGroupX.group(points, context) satisfies Array<ChartPoint<Datum, X, Y>>
  }

  const navigationCallback: <Datum, X extends ChartValue, Y extends ChartValue>(
    this: void,
    points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
  ) => Array<ChartPoint<Datum, X, Y>> = <Datum, X extends ChartValue, Y extends ChartValue>(
    points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
  ) => {
    return focusGroupX.navigation(points) satisfies Array<ChartPoint<Datum, X, Y>>
  }

  const resolve: <Datum, X extends ChartValue, Y extends ChartValue>(
    points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
    context: ChartFocusResolveContext,
  ) => ReadonlyArray<ChartPoint<Datum, X, Y>> = <Datum, X extends ChartValue, Y extends ChartValue>(
    points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
    context: ChartFocusResolveContext,
  ) => {
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
      return [] satisfies ReadonlyArray<ChartPoint<Datum, X, Y>>
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
      ) satisfies ReadonlyArray<ChartPoint<Datum, X, Y>>
    }

    return navigationPrimary(focusGroupX.resolve(points, context), points) satisfies ReadonlyArray<
      ChartPoint<Datum, X, Y>
    >
  }

  return {
    group,
    navigation: navigationCallback,
    resolve,
  }
}
