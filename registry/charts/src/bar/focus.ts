import type { ChartFocusStrategy, ChartPoint, ChartValue } from '@tanstack/charts'

export const barFocusStrategy: <TDatum, XValue extends ChartValue, YValue extends ChartValue>(
  input: BarFocusInput,
) => ChartFocusStrategy<TDatum, XValue, YValue> = function barFocusStrategy<
  TDatum,
  XValue extends ChartValue,
  YValue extends ChartValue,
>(input: BarFocusInput) {
  type AnyPoint = ChartPoint<TDatum, XValue, YValue>

  const { categories, horizontal } = input
  const categoryOf: (point: AnyPoint) => string = (point: AnyPoint) =>
    String(horizontal ? point.yValue : point.xValue)
  const crossOf: (point: AnyPoint) => number = (point: AnyPoint) => (horizontal ? point.x : point.y)
  const along: (point: AnyPoint) => number = (point: AnyPoint) => (horizontal ? point.y : point.x)

  const byAlong: (a: AnyPoint, b: AnyPoint) => number = (a: AnyPoint, b: AnyPoint) =>
    along(a) - along(b) || crossOf(a) - crossOf(b)

  interface Column {
    readonly sorted: ReadonlyArray<AnyPoint>

    readonly resolved: ReadonlyArray<AnyPoint>
  }

  let cachedPoints: ReadonlyArray<AnyPoint> | null = null
  let columns = new Map<string, Column>()

  const columnsFor: (points: ReadonlyArray<AnyPoint>) => ReadonlyMap<string, Column> = (
    points: ReadonlyArray<AnyPoint>,
  ) => {
    if (points === cachedPoints) {
      return columns
    }

    const candidates = new Map<string, Array<AnyPoint>>()

    for (const point of points) {
      const category = categoryOf(point)
      const list = candidates.get(category)

      if (list === undefined) {
        candidates.set(category, [point])
      } else {
        list.push(point)
      }
    }

    columns = new Map()

    for (const [category, list] of candidates) {
      let primary = list[0]

      if (primary === undefined) continue
      const firstOfGroup = new Map<string, AnyPoint>()

      for (const candidate of list) {
        if (byAlong(candidate, primary) < 0) {
          primary = candidate
        }

        const key = String(candidate.group)

        if (!firstOfGroup.has(key)) {
          firstOfGroup.set(key, candidate)
        }
      }

      const sorted = [...firstOfGroup.values()].toSorted(byAlong)
      columns.set(category, {
        sorted,
        resolved: [primary, ...sorted.filter((p) => String(p.group) !== String(primary.group))],
      })
    }

    cachedPoints = points

    return columns
  }

  const group: (points: ReadonlyArray<AnyPoint>, point: AnyPoint) => ReadonlyArray<AnyPoint> = (
    points: ReadonlyArray<AnyPoint>,
    point: AnyPoint,
  ) => {
    const column = columnsFor(points).get(categoryOf(point))

    if (column === undefined) {
      return [point]
    }

    const own = String(point.group)

    return [point, ...column.sorted.filter((p) => String(p.group) !== own)]
  }

  return {
    resolve(points, { x, y }) {
      const plot = input.plot()
      const count = categories.length

      if (count === 0 || plot.width <= 0 || plot.height <= 0) {
        return []
      }

      const px = x - plot.left
      const py = y - plot.top

      if (px < 0 || py < 0 || px > plot.width || py > plot.height) {
        return []
      }

      const extent = horizontal ? plot.height : plot.width
      const pos = horizontal ? py : px
      const index = Math.max(0, Math.min(count - 1, Math.floor(pos / (extent / count))))

      return columnsFor(points).get(categories[index] ?? '')?.resolved ?? []
    },
    group: (points, { point }) => group(points, point),
    navigation(points) {
      const seen = new Map<string, AnyPoint>()

      for (const p of points.toSorted((a, b) => along(a) - along(b) || crossOf(a) - crossOf(b))) {
        const key = categoryOf(p)

        if (!seen.has(key)) {
          seen.set(key, p)
        }
      }

      return [...seen.values()]
    },
  } satisfies ChartFocusStrategy<TDatum, XValue, YValue>
}

export interface PlotRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export interface BarFocusInput {
  readonly categories: ReadonlyArray<string>
  readonly horizontal: boolean
  /** Read lazily at pointer time (host size changes must not rebuild the definition). */
  readonly plot: () => PlotRect
}
