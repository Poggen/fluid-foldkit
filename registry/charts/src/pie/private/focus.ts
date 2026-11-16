import type { ChartFocusStrategy, ChartPoint } from '@tanstack/charts'

const TAU = Math.PI * 2

// Annulus focus: the nearest-point resolution drops focus for thin rings or pop-outs, so the static sectors are hit-tested instead.
interface AnnulusTarget {
  readonly index: number
  readonly innerRadius: number
  readonly outerRadius: number
  readonly startAngle: number
  readonly endAngle: number
}

interface AnnularFocusOptions<TDatum> {
  readonly center: number
  readonly targets: ReadonlyArray<AnnulusTarget>
  readonly indexOf: (datum: TDatum) => number
  /** Points that take part in focus (excludes underlay marks). */
  readonly focusable: (point: ChartPoint<TDatum, number, number>) => boolean
  /** Points keyboard navigation steps through (one per index). */
  readonly navigable: (point: ChartPoint<TDatum, number, number>) => boolean
  /** Hover-scale of a target while `hovered` is the focused index (the painted ring scales about the centre, so its hit area does too). */
  readonly scaleOf?: (index: number, hovered: number | null) => number
  readonly hovered?: () => number | null
}

const EDGE_EPSILON = 1e-9

const insideSector = (target: Readonly<AnnulusTarget>, radius: number, angle: number): boolean => {
  if (radius < target.innerRadius || radius > target.outerRadius) {
    return false
  }

  // The apex belongs to every sector (each painted path runs through it); the angle there is undefined.
  if (radius < EDGE_EPSILON) {
    return true
  }

  const sweep = target.endAngle - target.startAngle

  if (sweep >= TAU) {
    return true
  }

  const wrapped = (((angle - target.startAngle) % TAU) + TAU) % TAU
  // A pointer on a shared edge counts as inside both neighbours (SVG fill hit-testing is edge-inclusive); float noise must not decide.
  const offset = wrapped > TAU - EDGE_EPSILON ? 0 : wrapped

  return offset <= sweep + EDGE_EPSILON
}

const createAnnularFocus = <TDatum>(
  options: Readonly<AnnularFocusOptions<TDatum>>,
): ChartFocusStrategy<TDatum, number, number> => {
  const { center, targets, indexOf, focusable, navigable, scaleOf, hovered } = options

  type Point = ChartPoint<TDatum, number, number>

  // The engine passes the same `points` array until the scene changes: bucket once per array, so a move does not filter every point.
  let bucketed: ReadonlyArray<Point> | null = null
  let buckets = new Map<number, Array<Point>>()

  const ofIndex = (points: ReadonlyArray<Point>, index: number): Array<Point> => {
    if (bucketed !== points) {
      buckets = new Map()

      for (const point of points) {
        if (!focusable(point)) {
          continue
        }

        const key = indexOf(point.datum)
        const bucket = buckets.get(key)

        if (bucket) {
          bucket.push(point)
        } else {
          buckets.set(key, [point])
        }
      }

      bucketed = points
    }

    return buckets.get(index)?.slice() ?? []
  }

  // Later targets paint on top; test them first.
  const reversed = targets.toReversed()

  return {
    group: (points, { point }) => ofIndex(points, indexOf(point.datum)),
    navigation: (points) =>
      points
        .filter(navigable)
        .filter(
          (point, index, all) =>
            all.findIndex((candidate) => indexOf(candidate.datum) === indexOf(point.datum)) ===
            index,
        )
        .toSorted((left, right) => indexOf(left.datum) - indexOf(right.datum)),
    resolve: (points, { x, y }) => {
      const dx = x - center
      const dy = y - center
      const radius = Math.hypot(dx, dy)
      const angle = Math.atan2(dx, -dy)
      const current = hovered?.() ?? null

      for (const target of reversed) {
        const scale = scaleOf ? scaleOf(target.index, current) : 1

        const scaled =
          scale === 1
            ? target
            : {
                ...target,
                innerRadius: target.innerRadius * scale,
                outerRadius: target.outerRadius * scale,
              }

        if (insideSector(scaled, radius, angle)) {
          return ofIndex(points, target.index)
        }
      }

      return []
    },
  }
}

export { createAnnularFocus, insideSector }

export type { AnnulusTarget }
