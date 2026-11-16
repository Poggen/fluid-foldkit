import { depthEntry, sidePoints } from './geometry'
import type { DepthEntry } from './geometry'
import type { BarDatum } from './model'
import type { BarDepthProviderProps, BarDepthSegment } from './options'

export interface DepthFrame {
  readonly bandWidth: number
  readonly bandStep: number
  readonly categoryStart: (category: string) => number
  readonly valueY: (value: number) => number
  readonly innerWidth: number
  readonly plotLeft: number
}

export interface ProjectedDepthEntry extends DepthEntry {
  readonly segments: ReadonlyArray<BarDepthSegment>
}

/** Source provider geometry is shared by every surface and its SVG silhouette. */
export function projectDepthEntry<Row>(
  datum: BarDatum<Row>,
  provider: BarDepthProviderProps<Row> | undefined,
  frame: DepthFrame,
): ProjectedDepthEntry | undefined {
  if (!frame.bandWidth) return undefined
  const bandX = frame.categoryStart(datum.category)
  if (!Number.isFinite(bandX)) return undefined
  const segments =
    provider?.segmentsAccessor?.(datum.source)?.filter((segment) => segment.value > 0) ?? []
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const top = segments.at(-1)
  const value = segments.length > 0 ? total : datum.value
  const entry = depthEntry({
    index: datum.index,
    label: datum.category,
    value,
    bandX,
    bandWidth: frame.bandWidth,
    step: frame.bandStep,
    innerWidth: frame.innerWidth,
    plotLeft: frame.plotLeft,
    baselineY: frame.valueY(0),
    valueY: frame.valueY(value),
    minBarHeight: provider?.minBarHeight ?? 0,
    ...(top === undefined || total <= 0 ? {} : { topSegmentFraction: top.value / total }),
  })
  return entry === undefined ? undefined : { ...entry, segments }
}

export function depthSidePieces(entry: ProjectedDepthEntry, baseColor: string) {
  if (entry.segments.length === 0)
    return [{ points: sidePoints(entry, entry.topY, entry.bottomY), color: baseColor }]
  const total = entry.segments.reduce((sum, segment) => sum + segment.value, 0)
  let cursor = entry.bottomY
  return entry.segments.map((segment, index) => {
    const natural = (segment.value / total) * entry.naturalHeight
    const height =
      index === entry.segments.length - 1 ? Math.max(0, natural - entry.topYTrim) : natural
    const bottom = cursor
    cursor -= height
    return { points: sidePoints(entry, cursor, bottom), color: segment.color ?? baseColor }
  })
}

export function depthSilhouette(entry: DepthEntry): string {
  const {
    bandX: x,
    bandWidth: width,
    topY: top,
    bottomY: bottom,
    depth,
    perspectiveRise: rise,
  } = entry
  const points: ReadonlyArray<readonly [number, number]> =
    depth <= 0
      ? [
          [x, top],
          [x + width, top],
          [x + width, bottom],
          [x, bottom],
        ]
      : entry.isRightOfCenter
        ? [
            [x - depth, top - rise],
            [x + width - depth, top - rise],
            [x + width, top],
            [x + width, bottom],
            [x, bottom],
            [x - depth, bottom - rise],
          ]
        : [
            [x, top],
            [x + depth, top - rise],
            [x + width + depth, top - rise],
            [x + width + depth, bottom - rise],
            [x + width, bottom],
            [x, bottom],
          ]
  return points.map(([px, py], index) => `${index === 0 ? 'M' : 'L'} ${px} ${py}`).join(' ') + ' Z'
}
