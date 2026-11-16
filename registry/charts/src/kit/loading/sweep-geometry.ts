import { area as d3Area, line as d3Line } from 'd3-shape'
import type { CurveFactory } from 'd3-shape'
import { getSkeletonHeights } from './skeleton-heights'
import type { BarLoadingSkeletonProps } from './sweep-options'

interface SkeletonPoint {
  readonly index: number
  readonly value: number
}

export function lineSweepPaths(
  curve: CurveFactory,
  width: number,
  height: number,
  pointCount: number,
  tick: number,
) {
  const heights = getSkeletonHeights(pointCount, tick)

  if (width <= 0 || height <= 0 || heights.length < 2) {
    return null
  }

  const x = (index: number) => (index / (heights.length - 1)) * width
  const y = (value: number) => height - (value / 100) * height
  const points = heights.map((value, index) => ({ index, value }))

  return {
    line:
      d3Line<SkeletonPoint>()
        .curve(curve)
        .x((point) => x(point.index))
        .y((point) => y(point.value))(points) ?? '',
    area:
      d3Area<SkeletonPoint>()
        .curve(curve)
        .x((point) => x(point.index))
        .y0(height)
        .y1((point) => y(point.value))(points) ?? '',
  }
}

export function barSkeletonRects(
  {
    innerWidth,
    innerHeight,
    barCount = 12,
    baseline = 'bottom',
    barFraction = 0.7,
  }: BarLoadingSkeletonProps,
  tick: number,
) {
  const heights = getSkeletonHeights(barCount, tick)

  const signs = Array.from({ length: barCount }, (_, index) => {
    const x = Math.sin((index + 1) * 78.233 + tick) * 43_758.5453

    return x - Math.floor(x) < 0.5 ? -1 : 1
  })

  if (innerWidth <= 0 || innerHeight <= 0) {
    return null
  }

  const bandWidth = innerWidth / heights.length
  const width = bandWidth * barFraction
  const xOffset = (bandWidth * (1 - barFraction)) / 2
  const isCenter = baseline === 'center'
  const baselineY = isCenter ? innerHeight / 2 : innerHeight
  const halfBarH = isCenter ? innerHeight / 2 : innerHeight

  return heights.map((value, index) => {
    const sign = isCenter ? (signs[index] ?? 1) : 1
    const height = Math.max(1, halfBarH * (value / 100))
    const x = index * bandWidth + xOffset

    return {
      key: `${x.toFixed(2)}-${value}`,
      width,
      height,
      x,
      y: sign === 1 ? baselineY - height : baselineY,
    }
  })
}
