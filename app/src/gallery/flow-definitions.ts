import type { ChoroplethChartProps } from '@foldkit-visuals/charts/choropleth'
import {
  ChoroplethChart,
  ChoroplethFeatureComponent,
  ChoroplethGraticule,
  ChoroplethTooltip,
} from '@foldkit-visuals/charts/choropleth'
import type { SankeyChartProps } from '@foldkit-visuals/charts/sankey'
import { SankeyChart, SankeyLink, SankeyNode, SankeyTooltip } from '@foldkit-visuals/charts/sankey'
import type { SunburstChartProps } from '@foldkit-visuals/charts/sunburst'
import {
  buildArcs,
  SunburstCenter,
  SunburstChart,
  SunburstHint,
  SunburstLabels,
  SunburstSegment,
} from '@foldkit-visuals/charts/sunburst'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import world from './world.json' with { type: 'json' }
export const hierarchy = {
  name: 'Studio',
  children: [
    {
      name: 'Product',
      children: [
        { name: 'Web', value: 28 },
        { name: 'Mobile', value: 22 },
      ],
    },
    {
      name: 'Design',
      children: [
        { name: 'Brand', value: 18 },
        { name: 'Systems', value: 20 },
      ],
    },
    { name: 'Research', children: [{ name: 'Discovery', value: 12 }] },
  ],
}
export const flowData: SankeyChartProps['data'] = {
  nodes: [{ name: 'Visits' }, { name: 'New' }, { name: 'Returning' }],
  links: [
    { source: 0, target: 1, value: 70 },
    { source: 0, target: 2, value: 30 },
  ],
}
const Position = Schema.Array(Schema.Finite)
const Geometry = Schema.Union([
  Schema.Struct({
    type: Schema.Literals(['Polygon']),
    coordinates: Schema.Array(Schema.Array(Position)),
  }),
  Schema.Struct({
    type: Schema.Literals(['MultiPolygon']),
    coordinates: Schema.Array(Schema.Array(Schema.Array(Position))),
  }),
])
const World = Schema.Struct({
  type: Schema.Literals(['FeatureCollection']),
  features: Schema.Array(
    Schema.Struct({
      type: Schema.Literals(['Feature']),
      properties: Schema.Struct({ name: Schema.String, value: Schema.Finite }),
      geometry: Geometry,
    }),
  ),
})
const collection = Schema.decodeUnknownSync(World)(world)
export const geography: ChoroplethChartProps['data'] = {
  type: 'FeatureCollection',
  features: collection.features.map((feature) => ({
    ...feature,
    geometry:
      feature.geometry.type === 'Polygon'
        ? {
            type: 'Polygon',
            coordinates: feature.geometry.coordinates.map((ring) =>
              ring.map((position) => [...position]),
            ),
          }
        : {
            type: 'MultiPolygon',
            coordinates: feature.geometry.coordinates.map((polygon) =>
              polygon.map((ring) => ring.map((position) => [...position])),
            ),
          },
  })),
}

export const sunburst = SunburstChart({ name: 'showcase-sunburst' }),
  sankey = SankeyChart({ name: 'showcase-sankey' }),
  map = ChoroplethChart({ name: 'showcase-map' })
const sunKey = Symbol('ShowcaseSunburst'),
  sankeyKey = Symbol('ShowcaseSankey'),
  mapKey = Symbol('ShowcaseMap')
export const SunburstBlock = Block.make(sunburst.namespace, { ...sunburst.contract, key: sunKey }),
  SankeyBlock = Block.make(sankey.namespace, { ...sankey.contract, key: sankeyKey }),
  MapBlock = Block.make(map.namespace, { ...map.contract, key: mapKey })
export const sunProps = {
  data: hierarchy,
  size: 260,
  children: [
    ...buildArcs(hierarchy).arcs.map((arc) => SunburstSegment({ index: arc.arcIndex })),
    SunburstCenter(),
    SunburstLabels(),
    SunburstHint(),
  ],
} satisfies SunburstChartProps
export const sankeyProps = {
  data: flowData,
  aspectRatio: '2 / 1',
  margin: { top: 12, right: 75, bottom: 16, left: 60 },
  children: [SankeyNode({ formatValue: String }), SankeyLink(), SankeyTooltip()],
} satisfies SankeyChartProps
export const mapProps = {
  data: geography,
  scale: 50,
  zoomEnabled: true,
  children: [
    ChoroplethFeatureComponent(),
    ChoroplethGraticule({ stroke: 'var(--border)' }),
    ChoroplethTooltip({ getFeatureValue: (feature) => Number(feature.properties?.value) }),
  ],
} satisfies ChoroplethChartProps
export const SunLayer = SunburstBlock.makeLayer(sunburst.plans(SunburstBlock)),
  SankeyLayer = SankeyBlock.makeLayer(sankey.plans(SankeyBlock)),
  MapLayer = MapBlock.makeLayer(map.plans(MapBlock))
