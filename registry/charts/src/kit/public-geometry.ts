// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
import { Match, SchemaGetter } from 'effect'
import { projectionDateExtents, projectionValueExtents } from './projection-extents'
import type { ProjectionLineConfig } from '../cartesian/overlay-options'
import type {
  ReferenceAreaIfOverflow,
  ReferenceAreaRect,
} from '../cartesian/reference-area-options'

// This public Effect interop primitive preserves Source Date construction, including other realms.
const dateForScale = Match.value(SchemaGetter.Date<Date | number>()).pipe(
  Match.tag('Transform', (getter) => getter.transform),
  Match.orElse(() => {
    throw new Error('Effect Date conversion requires a synchronous Transform')
  }),
)

/**
 * Widen a y domain by the extent of the projection lines on `yAxisId`; the result is not re-niced.
 * @internal
 */
export function mergeProjectionYDomain(
  domain: [number, number],
  configs: Array<ProjectionLineConfig>,
  yAxisId: string,
): [number, number] {
  // Preserve Source's two passes: every axis getter runs before any selected data getter.
  const matching = configs.filter((config) => config.yAxisId === yAxisId)
  const paths = matching.map((config) => config.data)
  const extents = projectionValueExtents(paths)

  if (!extents) {
    return domain
  }

  const [min, max] = domain
  const nextMin = Math.min(min, extents.minValue)
  const nextMax = Math.max(max, extents.maxValue)

  if (nextMin >= 0 && min >= 0) {
    return [0, nextMax <= 0 ? 100 : nextMax * 1.1]
  }

  const padding = (nextMax - nextMin) * 0.05 || 1

  return [nextMin - padding, nextMax + padding]
}

/**
 * The later of `maxTime` and the last date of any projection line.
 * @internal
 */
export function mergeProjectionXDomainMax(
  maxTime: number,
  configs: Array<ProjectionLineConfig>,
): number {
  const extents = projectionDateExtents(configs.map((config) => config.data))

  return extents ? Math.max(maxTime, extents.maxTime) : maxTime
}

export interface ComputeReferenceAreaRectOptions {
  /** Plot width in px. */
  innerWidth: number
  /** Plot height in px. */
  innerHeight: number
  /** Starting x data coordinate. Defaults to the plot left. */
  x1?: Date | number
  /** Ending x data coordinate. Defaults to the plot right. */
  x2?: Date | number
  /** Lower y data bound. Defaults to the plot top. */
  y1?: number
  /** Upper y data bound. Defaults to the plot bottom. */
  y2?: number
  /**
   * How to treat a band that extends past the plot.
   * @default "hidden"
   */
  ifOverflow?: ReferenceAreaIfOverflow
  /** Maps a date to a plot x pixel. */
  xScale: (value: Date) => number
  /** Maps a value to a plot y pixel. */
  yScale: (value: number) => number
}

function clampRectToPlot(
  rect: ReferenceAreaRect,
  innerWidth: number,
  innerHeight: number,
): ReferenceAreaRect | null {
  const x1 = Math.max(0, rect.x)
  const y1 = Math.max(0, rect.y)
  const x2 = Math.min(innerWidth, rect.x + rect.width)
  const y2 = Math.min(innerHeight, rect.y + rect.height)
  const width = x2 - x1
  const height = y2 - y1

  return width <= 0 || height <= 0 ? null : { x: x1, y: y1, width, height }
}

/**
 * Map a reference area's data bounds to plot pixels; `null` when nothing is left to draw.
 * @internal
 */
export function computeReferenceAreaRect(
  options: ComputeReferenceAreaRectOptions,
): ReferenceAreaRect | null {
  const { innerWidth, innerHeight, x1, x2, y1, y2, ifOverflow = 'hidden', xScale, yScale } = options

  if (innerWidth <= 0 || innerHeight <= 0) {
    return null
  }

  const toX = (value: Date | number | undefined, fallback: number) =>
    value === undefined || value === null
      ? fallback
      : xScale(value instanceof Date ? value : dateForScale(value))

  const toY = (value: number | undefined, fallback: number) =>
    value === undefined || value === null ? fallback : yScale(value)

  const left = toX(x1, 0)
  const right = toX(x2, innerWidth)
  const top = toY(y1, 0)
  const bottom = toY(y2, innerHeight)
  const width = Math.abs(right - left)
  const height = Math.abs(bottom - top)

  if (width <= 0 || height <= 0) {
    return null
  }

  const rect: ReferenceAreaRect = {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width,
    height,
  }

  if (ifOverflow === 'visible') {
    return rect
  }

  if (ifOverflow === 'discard') {
    const inside =
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.x + rect.width <= innerWidth &&
      rect.y + rect.height <= innerHeight

    return inside ? rect : null
  }

  return clampRectToPlot(rect, innerWidth, innerHeight)
}
