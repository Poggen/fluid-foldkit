import type { MarkRenderContext, ResolvedScale } from '@tanstack/charts'
import type { Margin } from '../cartesian/context-types'

export interface ScatterPointerPosition {
  readonly x: number
  readonly y: number
}

export const emptyScatterPointer = (): null => null

export function scatterPointer(
  times: ReadonlyArray<number>,
  margin: Margin,
  size: { readonly innerWidth: number; readonly innerHeight: number },
) {
  let invertX: ResolvedScale['invert']

  return {
    project: (context: MarkRenderContext) => {
      invertX = context.scales.x?.invert
    },
    resolve: (point: ScatterPointerPosition): number | null => {
      if (
        point.x < margin.left ||
        point.x > margin.left + size.innerWidth ||
        point.y < margin.top ||
        point.y > margin.top + size.innerHeight
      ) {
        return null
      }

      const value = invertX?.(point.x)

      if (!(value instanceof Date) || times.length === 0) {
        return null
      }

      const time = value.getTime()
      let upper = 1

      while (upper < times.length && (times[upper] ?? Infinity) < time) {
        upper += 1
      }

      const left = times[upper - 1]
      const right = times[upper]

      if (left === undefined) {
        return null
      }

      return right !== undefined && time - left > right - time ? upper : upper - 1
    },
  }
}
