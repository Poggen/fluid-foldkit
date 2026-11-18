import type { ChoroplethFeature } from './types'
/* @license Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT. */

import { geoCentroid, geoClipRectangle, geoPath } from 'd3-geo'
import type { GeoPermissibleObjects, GeoProjection } from 'd3-geo'
import type { ChartFocusStrategy, ChartPoint } from '@tanstack/charts'

interface ZoomTransformState {
  k: number
  x: number
  y: number
}

interface ProjectionHolder {
  projection: GeoProjection | undefined
  /** Chart area and options the projection was built for. */
  projectionKey?: string
  /** Chart area of the last projection build (scene px), the visible window the zoom transform maps into. */
  chart?: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  transform: ZoomTransformState
  /** Points of the last rendered scene (set in onRender): the settled geoShape points, which the presented points lack while the fade enters. */
  renderedPoints?: ReadonlyArray<ChartPoint<ChoroplethFeature, number, number>>
}

const STROKE_HIT_WIDTH = 0.5

/** Axis-aligned box `[x0, y0, x1, y1]` in base (unzoomed) projection space. */
type Box = readonly [number, number, number, number]

const centroidOf: (datum: GeoPermissibleObjects) => readonly [number, number] = (
  datum: GeoPermissibleObjects,
) => {
  return geoCentroid(datum)
}

const westToEast: (left: GeoPermissibleObjects, right: GeoPermissibleObjects) => number = (
  left: GeoPermissibleObjects,
  right: GeoPermissibleObjects,
) => {
  const [leftLon, leftLat] = centroidOf(left)
  const [rightLon, rightLat] = centroidOf(right)

  return leftLon - rightLon || rightLat - leftLat
}

const MIN_VISIBLE_PX = 2

const overlaps: (ring: Box, area: Box, min: number) => boolean = (
  ring: Box,
  area: Box,
  min: number,
) =>
  Math.min(ring[2], area[2]) - Math.max(ring[0], area[0]) >= min &&
  Math.min(ring[3], area[3]) - Math.max(ring[1], area[1]) >= min

interface BoxContext {
  readonly beginPath: () => void
  readonly arc: () => void
  readonly closePath: () => void
  readonly lineTo: (x: number, y: number) => void
  readonly moveTo: (x: number, y: number) => void
}

const boxContext: (boxes: Array<[number, number, number, number]>) => BoxContext = (
  boxes: Array<[number, number, number, number]>,
) => {
  let box: [number, number, number, number] | undefined = undefined

  return {
    beginPath: () => undefined satisfies void,
    arc: () => undefined satisfies void,
    closePath: () => undefined satisfies void,
    lineTo: (x: number, y: number) => {
      if (box === undefined) {
        return
      }

      box[0] = Math.min(box[0], x)
      box[1] = Math.min(box[1], y)
      box[2] = Math.max(box[2], x)
      box[3] = Math.max(box[3], y)
    },
    moveTo: (x: number, y: number) => {
      box = [x, y, x, y]
      boxes.push(box)
    },
  }
}

const projectOnce: (
  projection: GeoProjection,
  datum: GeoPermissibleObjects,
) => { readonly path: Path2D | null; readonly rings: Array<Box> } = (
  projection: GeoProjection,
  datum: GeoPermissibleObjects,
) => {
  const boxes: Array<[number, number, number, number]> = []

  const path = typeof Path2D === 'undefined' ? null : new Path2D()
  const rings = boxContext(boxes)
  geoPath(projection, {
    beginPath: () => undefined satisfies void,
    arc: (x: number, y: number, r: number, start: number, end: number) => {
      path?.arc(x, y, r, start, end)
    },
    closePath: () => {
      path?.closePath()
    },
    lineTo: (x: number, y: number) => {
      path?.lineTo(x, y)
      rings.lineTo(x, y)
    },
    moveTo: (x: number, y: number) => {
      path?.moveTo(x, y)
      rings.moveTo(x, y)
    },
  })(datum)

  return {
    path: boxes.length === 0 ? null : path,
    rings: boxes.filter((ring) => ring.every(Number.isFinite)),
  }
}

const boundsOf: (rings: ReadonlyArray<Box>) => Box = (rings: ReadonlyArray<Box>) => {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]

  for (const ring of rings) {
    x0 = Math.min(x0, ring[0])
    y0 = Math.min(y0, ring[1])
    x1 = Math.max(x1, ring[2])
    y1 = Math.max(y1, ring[3])
  }

  return [x0, y0, x1, y1]
}

const clippedBoxes: (
  projection: GeoProjection,
  area: Box,
  datum: GeoPermissibleObjects,
) => Array<Box> = (projection: GeoProjection, area: Box, datum: GeoPermissibleObjects) => {
  const clip = geoClipRectangle(area[0], area[1], area[2], area[3])
  const boxes: Array<[number, number, number, number]> = []
  geoPath({ stream: (output) => projection.stream(clip(output)) }, boxContext(boxes))(datum)

  return boxes.filter((ring) => ring.every(Number.isFinite))
}

interface FeatureGeometry {
  readonly bounds: Box
  readonly rings: ReadonlyArray<Box>
  /** The projected outline as a canvas path for hit tests (null when the feature projects to nothing). */
  readonly path: Path2D | null
}

/** Per-feature projected geometry, computed once per base projection (rebuilt on resize, never on pan/zoom or keypress); shared by the focus strategy and the tooltip anchor. */
interface GeoGeometry {
  /** Feature geometry in base projection space, or undefined before the first projection build. */
  readonly of: (datum: GeoPermissibleObjects) => FeatureGeometry | undefined
  /** Computes every feature's geometry for the current projection, so the first hover sweep does no lazy per-feature work. */
  readonly warm: (data: ReadonlyArray<GeoPermissibleObjects>) => void
  /** Visible chart area mapped back into base projection space (the whole chart area when unzoomed). */
  readonly view: () => Box | undefined
  /** Whether the feature's drawn shape, clipped to the visible area, spans at least MIN_VISIBLE_PX screen px each way. */
  readonly visible: (datum: GeoPermissibleObjects) => boolean
  /** Centre of the box of the feature's largest visible piece (its shape clipped to the visible area), in base projection space. */
  readonly visibleCenter: (datum: GeoPermissibleObjects) => readonly [number, number] | undefined
}

const createGeoGeometry: (holder: Readonly<ProjectionHolder>) => GeoGeometry = (
  holder: Readonly<ProjectionHolder>,
) => {
  let cachedFor: GeoProjection | undefined = undefined
  const cache = new Map<GeoPermissibleObjects, FeatureGeometry>()

  const of: (datum: GeoPermissibleObjects) => FeatureGeometry | undefined = (
    datum: GeoPermissibleObjects,
  ) => {
    const { projection } = holder

    if (!projection) {
      return undefined
    }

    if (cachedFor !== projection) {
      cache.clear()
      cachedFor = projection
    }

    let found = cache.get(datum)

    if (found === undefined) {
      const { path, rings } = projectOnce(projection, datum)
      found = { bounds: boundsOf(rings), path, rings }
      cache.set(datum, found)
    }

    return found
  }

  const view: () => Box | undefined = () => {
    const {
      chart,
      transform: { k, x, y },
    } = holder

    if (!chart) {
      return undefined
    }

    return [
      (chart.x - x) / k,
      (chart.y - y) / k,
      (chart.x + chart.width - x) / k,
      (chart.y + chart.height - y) / k,
    ]
  }

  let piecesFor = ''
  let piecesProjection: GeoProjection | undefined = undefined
  const pieceCache = new Map<GeoPermissibleObjects, ReadonlyArray<Box>>()

  const pieces: (datum: GeoPermissibleObjects) => ReadonlyArray<Box> = (
    datum: GeoPermissibleObjects,
  ) => {
    const geometry = of(datum)
    const area = view()

    const {
      projection,
      transform: { k },
    } = holder

    if (!geometry || !area || !projection) {
      return []
    }

    const key = area.join(',')

    if (piecesFor !== key || piecesProjection !== projection) {
      pieceCache.clear()
      piecesFor = key
      piecesProjection = projection
    }

    let found = pieceCache.get(datum)

    if (found === undefined) {
      const min = MIN_VISIBLE_PX / k
      found = geometry.rings.some((ring) => overlaps(ring, area, min))
        ? clippedBoxes(projection, area, datum).filter(
            (piece) => piece[2] - piece[0] >= min && piece[3] - piece[1] >= min,
          )
        : []
      pieceCache.set(datum, found)
    }

    return found
  }

  const visible: (datum: GeoPermissibleObjects) => boolean = (datum: GeoPermissibleObjects) =>
    pieces(datum).length > 0

  const visibleCenter: (datum: GeoPermissibleObjects) => readonly [number, number] | undefined = (
    datum: GeoPermissibleObjects,
  ) => {
    let best: readonly [number, number] | undefined = undefined
    let bestArea = -1

    for (const [x0, y0, x1, y1] of pieces(datum)) {
      const size = (x1 - x0) * (y1 - y0)

      if (size > bestArea) {
        bestArea = size
        best = [(x0 + x1) / 2, (y0 + y1) / 2]
      }
    }

    return best
  }

  const warm: (data: ReadonlyArray<GeoPermissibleObjects>) => void = (
    data: ReadonlyArray<GeoPermissibleObjects>,
  ) => {
    for (const datum of data) {
      of(datum)
    }
  }

  return { of, view, visible, visibleCenter, warm }
}

const createGeoContainmentFocus: (
  markId: string,
  holder: Readonly<ProjectionHolder>,
  geometry: GeoGeometry,
) => ChartFocusStrategy<ChoroplethFeature, number, number> = (
  markId: string,
  holder: Readonly<ProjectionHolder>,
  geometry: GeoGeometry,
) => {
  const probe =
    typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')

  const owned = new WeakMap<object, Array<ChartPoint<ChoroplethFeature, number, number>>>()

  const own: (
    points: ReadonlyArray<ChartPoint<ChoroplethFeature, number, number>>,
  ) => Array<ChartPoint<ChoroplethFeature, number, number>> = (
    points: ReadonlyArray<ChartPoint<ChoroplethFeature, number, number>>,
  ) => {
    let found = owned.get(points)

    if (found === undefined) {
      found = points.filter((point) => point.markId === markId)
      owned.set(points, found)
    }

    return found
  }

  return {
    group: (_points, context) => [context.point],

    navigation: (points) =>
      own(points)
        .filter((point) => geometry.visible(point.datum))
        .toSorted((left, right) => westToEast(left.datum, right.datum)),
    resolve: (points, position) => {
      const { projection, transform } = holder
      const x = (position.x - transform.x) / transform.k
      const y = (position.y - transform.y) / transform.k
      const lonLat = projection?.invert?.([x, y])

      if (!projection || !lonLat || !Number.isFinite(lonLat[0]) || !Number.isFinite(lonLat[1])) {
        return []
      }

      // WARNING: SAFETY: renderedPoints is the renderer's presented list of this chart's own points.
      const rendered: () =>
        | ReadonlyArray<ChartPoint<ChoroplethFeature, number, number>>
        | undefined = () => holder.renderedPoints

      const hits: (point: ChartPoint<ChoroplethFeature, number, number>) => boolean = (
        point: ChartPoint<ChoroplethFeature, number, number>,
      ) => {
        const feature = geometry.of(point.datum)

        if (feature === undefined) {
          return false
        }

        const [x0, y0, x1, y1] = feature.bounds

        if (x < x0 || x > x1 || y < y0 || y > y1) {
          return false
        }

        const { path } = feature

        if (path === null || probe === null) {
          return false
        }

        probe.lineWidth = STROKE_HIT_WIDTH

        return probe.isPointInPath(path, x, y) || probe.isPointInStroke(path, x, y)
      }

      const hit = own(rendered() ?? points).findLast(hits)

      return hit === undefined ? [] : [hit]
    },
  }
}

export { centroidOf, createGeoContainmentFocus, createGeoGeometry }

export type { GeoGeometry, ProjectionHolder }
