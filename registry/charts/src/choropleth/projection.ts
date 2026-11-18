/* @license Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT. */
import { geoGraticule, geoMercator } from 'd3-geo'
import type { GeoProjection } from 'd3-geo'
import type { ChartBounds } from '@tanstack/charts'
import type { ChoroplethFeature, ChoroplethFeatureProps } from './types'

const FEATURES_ID = 'choropleth'

const GRATICULE_ID = 'choropleth-graticule'

const DEFAULT_COLORS = [
  'var(--chart-scale-01)',
  'var(--chart-scale-02)',
  'var(--chart-scale-03)',
  'var(--chart-scale-04)',
  'var(--chart-scale-05)',
]

const REFERENCE_WIDTH = 630

const BASE_SCALE = 100

const TRANSLATE_Y_OFFSET = 50

export { scopePatterns } from './resources'

const resolveFill: (
  feature: ChoroplethFeature,
  index: number,
  config: Readonly<ChoroplethFeatureProps> | undefined,
  idPrefix?: string,
) => string = (
  feature: ChoroplethFeature,
  index: number,
  config: Readonly<ChoroplethFeatureProps> | undefined,
  idPrefix = '',
) => {
  const patternId = config?.getFeaturePattern?.(feature, index)

  if (patternId !== undefined && patternId !== '') {
    return `url(#${idPrefix}${patternId})` satisfies string
  }

  if (config?.fill !== undefined && config.fill !== '') {
    return config.fill satisfies string
  }

  if (config?.getFeatureColor !== undefined) {
    return config.getFeatureColor(feature, index) satisfies string
  }

  return (DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? 'var(--chart-1)') satisfies string
}

const featureKey: (feature: Readonly<Pick<ChoroplethFeature, 'properties' | 'id'>>) => string = (
  feature: Readonly<Pick<ChoroplethFeature, 'properties' | 'id'>>,
) => feature.properties?.name ?? String(feature.id ?? '')

interface ProjectionOptions {
  readonly scale: number | undefined
  readonly center: [number, number]
  readonly translate: [number, number] | undefined
  readonly k: number
  readonly tx: number
  readonly ty: number
}

const makeProjection: (
  bounds: Readonly<ChartBounds>,
  o: Readonly<ProjectionOptions>,
) => GeoProjection = (bounds: Readonly<ChartBounds>, o: Readonly<ProjectionOptions>) => {
  const baseScale =
    o.scale ?? (bounds.width > 0 ? (bounds.width / REFERENCE_WIDTH) * BASE_SCALE : BASE_SCALE)

  const baseTranslate = o.translate ?? [
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2 + TRANSLATE_Y_OFFSET,
  ]

  return geoMercator()
    .center(o.center)
    .scale(baseScale * o.k)
    .translate([o.k * baseTranslate[0] + o.tx, o.k * baseTranslate[1] + o.ty])
}

const graticuleFeature: (step: [number, number] | undefined) => ChoroplethFeature = (
  step: [number, number] | undefined,
) => ({
  geometry: (step ? geoGraticule().step(step) : geoGraticule())(),
  properties: { name: 'graticule' },
  type: 'Feature',
})

export { FEATURES_ID, featureKey, GRATICULE_ID, graticuleFeature, makeProjection, resolveFill }

export type { ProjectionOptions }
