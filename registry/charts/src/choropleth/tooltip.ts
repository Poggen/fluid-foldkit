import type { ChartBounds, ChartPoint } from '@tanstack/charts'
import type { ProjectionHolder, GeoGeometry } from './focus'
import { centroidOf } from './focus'
import type { ChoroplethFeature } from './types'

interface ScreenPoint {
  x: number
  y: number
}

const TOOLTIP_CLAMP = 60

const clamp: (value: number, min: number, size: number) => number = (
  value: number,
  min: number,
  size: number,
) => Math.max(min + TOOLTIP_CLAMP, Math.min(min + size - TOOLTIP_CLAMP, value))

export const baseTooltipPoint: (
  holder: Readonly<ProjectionHolder>,
  feature: ChoroplethFeature,
) => ScreenPoint | undefined = (holder: Readonly<ProjectionHolder>, feature: ChoroplethFeature) => {
  const { chart, projection } = holder
  const [lon, lat] = centroidOf(feature)
  const base = projection?.([lon, lat])

  if (!chart || !base || !Number.isFinite(base[0]) || !Number.isFinite(base[1])) {
    return undefined
  }

  return { x: clamp(base[0], chart.x, chart.width), y: clamp(base[1], chart.y, chart.height) }
}

export const tooltipAnchor =
  (holder: Readonly<ProjectionHolder>, geometry: GeoGeometry) =>
  (
    points: ReadonlyArray<ChartPoint<ChoroplethFeature>>,
    context: { focus: { source: string }; plot: ChartBounds },
  ) => {
    const first = points.at(0)

    if (first === undefined) {
      return undefined satisfies ScreenPoint | undefined
    }

    const { k, x: tx, y: ty } = holder.transform

    const zoomed: (point: Readonly<ScreenPoint>) => ScreenPoint = (
      point: Readonly<ScreenPoint>,
    ) => ({
      x: point.x * k + tx,
      y: point.y * k + ty,
    })

    const base = baseTooltipPoint(holder, first.datum)
    const anchor = base ? zoomed(base) : { x: first.x * k + tx, y: first.y * k + ty }

    if (context.focus.source !== 'keyboard') {
      return anchor satisfies ScreenPoint | undefined
    }

    const { plot } = context

    if (
      anchor.x >= plot.x &&
      anchor.x <= plot.x + plot.width &&
      anchor.y >= plot.y &&
      anchor.y <= plot.y + plot.height
    ) {
      return anchor satisfies ScreenPoint | undefined
    }

    const piece = geometry.visibleCenter(first.datum)

    return (piece ? zoomed({ x: piece[0], y: piece[1] }) : anchor) satisfies ScreenPoint | undefined
  }
