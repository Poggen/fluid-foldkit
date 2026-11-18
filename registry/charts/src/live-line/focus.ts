import { DateTime } from 'effect'
import type { ChartPoint } from '@tanstack/charts'
import type { LiveDefinitionInput, LiveRow } from './definition'
import { liveRowOf } from './definition'

export const liveFocus: (
  bounds: LiveDefinitionInput['hoverBounds'],
  tail: FocusTail | undefined,
) => LiveFocusStrategy = function liveFocus(
  bounds: LiveDefinitionInput['hoverBounds'],
  tail: FocusTail | undefined,
) {
  const visible: (points: ReadonlyArray<FocusPoint>) => Array<FocusPoint> = (
    points: ReadonlyArray<FocusPoint>,
  ) => line(points).filter((p) => p.x >= bounds.left && p.x <= bounds.right)

  return {
    resolve(points: ReadonlyArray<FocusPoint>, { x, y }: { x: number; y: number }) {
      if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
        return [] satisfies Array<FocusPoint>
      }

      const rows = line(points)
      const first = rows.at(0)
      const last = rows.at(-1)

      if (first === undefined || last === undefined) {
        return [] satisfies Array<FocusPoint>
      }

      if (tail && x > last.x) {
        const t = Math.min(tail.tipT, last.xValue.getTime() + (x - last.x) / tail.pxPerMs)

        const v =
          t <= tail.bT
            ? last.yValue +
              ((tail.bV - last.yValue) * (t - last.xValue.getTime())) /
                (tail.bT - last.xValue.getTime() || 1)
            : tail.bV

        const row: LiveRow = { key: CURSOR_KEY, t, v, pad: false }

        return [
          {
            ...last,
            datum: row,
            xValue: DateTime.toDateUtc(DateTime.makeUnsafe(t)),
            yValue: v,
            x,
            y: last.y - (v - last.yValue) * tail.pxPerValue,
          },
        ] satisfies Array<FocusPoint>
      }

      let from = first
      let to = first

      if (x >= last.x) {
        from = last
        to = last
      } else if (x > first.x) {
        for (const p of rows) {
          if (p.x <= x) {
            from = p
          } else {
            to = p
            break
          }
        }
      } else {
      }

      const f = to.x > from.x ? (x - from.x) / (to.x - from.x) : 0
      const t = from.xValue.getTime() + f * (to.xValue.getTime() - from.xValue.getTime())
      const v = from.yValue + f * (to.yValue - from.yValue)
      const row: LiveRow = { key: CURSOR_KEY, t, v, pad: false }

      return [
        {
          ...from,
          datum: row,
          xValue: DateTime.toDateUtc(DateTime.makeUnsafe(t)),
          yValue: v,
          x,
          y: from.y + f * (to.y - from.y),
        },
      ] satisfies Array<FocusPoint>
    },

    group: (points: ReadonlyArray<FocusPoint>, { point }: { point: FocusPoint }) => {
      if (point.x >= bounds.left && point.x <= bounds.right) {
        return [point] satisfies Array<FocusPoint>
      }

      const rows = line(points)
      const to = rows.findIndex((p) => p.x > bounds.left)
      const a = rowAt(rows, to - 1)
      const b = rowAt(rows, to)

      if (point.x < bounds.left && a !== undefined && b !== undefined) {
        const f = (bounds.left - a.x) / (b.x - a.x || 1)

        return [{ ...a, x: bounds.left, y: a.y + f * (b.y - a.y) }] satisfies Array<FocusPoint>
      }

      const first = visible(points).at(0)

      return (first === undefined ? [] : [first]) satisfies Array<FocusPoint>
    },

    navigation: visible,
  }
}

const rowAt: <T>(list: ReadonlyArray<T>, i: number) => T | undefined = <T>(
  list: ReadonlyArray<T>,
  i: number,
) => list[i] satisfies T | undefined

type FocusPoint = ChartPoint<LiveRow, Date, number>

/** bklit's hover reads the value at the pointer (price and time interpolated between the samples around the pointer x). A native focus strategy returns that point, re-resolved every
 * move and frame with no rebuild; nothing outside the plot, the tip clamps like interpolateAtTime. Keeps the row-at-or-left identity (like kit's `navigationPrimary`) so arrow keys continue from it. */
interface LiveFocusStrategy {
  readonly resolve: (
    points: ReadonlyArray<FocusPoint>,
    pointer: { x: number; y: number },
  ) => Array<FocusPoint>
  readonly group: (
    points: ReadonlyArray<FocusPoint>,
    target: { point: FocusPoint },
  ) => Array<FocusPoint>
  readonly navigation: (points: ReadonlyArray<FocusPoint>) => Array<FocusPoint>
}

const LINE_ID = 'live:line'

const CURSOR_KEY = 'live:cursor'

const line: (points: ReadonlyArray<FocusPoint>) => Array<FocusPoint> = (
  points: ReadonlyArray<FocusPoint>,
) =>
  points
    .filter((p) => {
      const d = liveRowOf(p)

      return (p.markId === LINE_ID &&
        d !== undefined &&
        d.key !== CURSOR_KEY &&
        !d.pad) satisfies boolean
    })
    .sort((a, b) => a.x - b.x)

export interface FocusTail {
  readonly tipT: number
  readonly bT: number
  readonly bV: number
  readonly pxPerMs: number
  /** Plot pixels per value unit. */
  readonly pxPerValue: number
}
