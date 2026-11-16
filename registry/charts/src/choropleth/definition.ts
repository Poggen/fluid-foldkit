// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
import { defineChart } from '@tanstack/charts/scene'
import { geoShape } from '@tanstack/charts/geo'
import type { ChartBounds, DomChartDefinition } from '@tanstack/charts'

import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoProjection } from 'd3-geo'
import { nativeTooltip } from './private/native-tooltip'

const TOOLTIP_MOTION = {
  type: 'spring',
  stiffness: 100,
  damping: 20,
  mass: 1,
  restSpeed: 2,
  restDelta: 0.5,
} satisfies import('@tanstack/charts').ChartMotionTransition

const TOOLTIP_OFFSET = 16

import { createGeoContainmentFocus } from './focus'
import type { GeoGeometry, ProjectionHolder } from './focus'
import {
  FEATURES_ID,
  featureKey,
  GRATICULE_ID,
  graticuleFeature,
  makeProjection,
  resolveFill,
} from './projection'
import type { ProjectionOptions } from './projection'
import { tooltipAnchor } from './tooltip'
import type {
  ChoroplethFeature,
  ChoroplethFeatureProperties,
  ChoroplethFeatureProps,
  ChoroplethGraticuleProps,
  ChoroplethTooltipProps,
  Margin,
} from './types'

interface DefinitionInput {
  readonly tooltipId: string
  readonly data: FeatureCollection<Geometry, ChoroplethFeatureProperties>
  readonly margin: Margin
  readonly center: [number, number]
  readonly scale: number | undefined
  readonly translate: [number, number] | undefined
  readonly holder: ProjectionHolder
  readonly geometry: GeoGeometry
  readonly patternPrefix: string
  readonly featureConfig: ChoroplethFeatureProps | undefined
  readonly graticuleConfig: ChoroplethGraticuleProps | undefined
  readonly tooltipConfig: ChoroplethTooltipProps | undefined
}

/** The chart definition: features geoShape, optional graticule layer, and the built-in tooltip (the hovered-feature highlight is an owned svg, highlight.ts). */
export const createDefinition = (
  input: DefinitionInput,
): DomChartDefinition<ChoroplethFeature, number, number> => {
  const {
    data,
    margin,
    center,
    scale,
    translate,
    holder,
    geometry,
    patternPrefix,
    featureConfig,
    graticuleConfig,
    tooltipConfig,
  } = input

  const projectionOptions: ProjectionOptions = { center, k: 1, scale, translate, tx: 0, ty: 0 }

  const projection = (context: { chart: ChartBounds }): GeoProjection => {
    // The same chart area and options keep the projection and its per-feature geometry.
    const { x, y, width, height } = context.chart
    const key = [x, y, width, height, center.join(), scale, translate?.join()].join('|')

    if (holder.projection !== undefined && holder.projectionKey === key) {
      return holder.projection
    }

    holder.projection = makeProjection(context.chart, projectionOptions)
    holder.projectionKey = key
    holder.chart = context.chart
    // Hit-test geometry is built with the projection (load), not on the first hover moves.
    geometry.warm(data.features)

    return holder.projection
  }

  const stroke = featureConfig?.stroke ?? 'var(--bkm-background)'

  const features = geoShape(data.features, {
    // Documented geo `className` hook (reference/marks/geo.md): the CSS selects the group by class.
    className: 'bkm-choro-features',
    fill: (feature, context) => resolveFill(feature, context.index, featureConfig, patternPrefix),
    id: FEATURES_ID,
    key: featureKey,
    // Source changes projected path props directly; only the feature-layer opacity enters.
    motion: false,
    projection,
    stroke,
    strokeWidth: featureConfig?.strokeWidth ?? 0.5,
  })

  const graticule = graticuleConfig
    ? [
        geoShape([graticuleFeature(graticuleConfig.step)], {
          className: 'bkm-choro-graticule',
          fill: 'none',
          id: GRATICULE_ID,
          key: () => GRATICULE_ID,
          motion: false,
          projection,
          stroke: graticuleConfig.stroke ?? 'rgba(255,255,255,0.1)',
          strokeWidth: graticuleConfig.strokeWidth ?? 0.5,
        }),
      ]
    : []

  return defineChart({
    focus: createGeoContainmentFocus(FEATURES_ID, holder, geometry),
    focusRing: false,
    guides: false,
    margin,
    marks: [features, ...graticule],
    maxFocusDistance: 0,
    scales: { x: null, y: null },
    // `portal`: the native placement without the per-paint size read (gap #21, kit/tooltip/sized-tooltip-placement.ts).
    tooltip: tooltipConfig
      ? {
          anchor: tooltipAnchor(holder, geometry),
          className: 'bkm-choro-tooltip',
          motion: TOOLTIP_MOTION,
          offset: TOOLTIP_OFFSET,
          placement: ['right', 'left'],
          sticky: false,
          use: nativeTooltip(input.tooltipId),
        }
      : false,
  })
}
