import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { Effect, Schema } from 'effect'
import { geoPath } from 'd3-geo'
import { makeProjection } from './projection'
import { ChoroplethChart } from './index'
import { choroplethZoom } from './root'
import { scopePatterns } from './resources'
import type { ChoroplethFeature } from './types'
const feature: ChoroplethFeature = {
  type: 'Feature',
  properties: { name: 'Square' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-10, 0],
        [-10, 10],
        [0, 10],
        [0, 0],
        [-10, 0],
      ],
    ],
  },
}
it('preserves literal pinned Mercator projection geometry and scoped pattern resources', () => {
  const projection = makeProjection(
    { x: 0, y: 0, width: 630, height: 350 },
    { center: [0, 20], scale: undefined, translate: undefined, k: 1, tx: 0, ty: 0 },
  )
  expect(projection([0, 20])).toEqual([315, 225])
  expect(projection([20, -10])).toEqual([349.9065850398866, 278.18043343762685])
  expect(geoPath(projection)(feature)).toBe(
    'M297.547,260.638L297.547,243.095L315,243.095L315,260.638Z',
  )
  expect(
    scopePatterns(
      [
        {
          tag: 'pattern',
          attributes: { id: 'one' },
          children: [{ tag: 'circle', attributes: { r: 3 } }],
        },
      ],
      'map-',
    )[0]?.attributes.id,
  ).toBe('map-one')
})
it.effect(
  'routes every public zoom facade through encoded transform operations with fixed-point anchoring',
  () => {
    const chart = ChoroplethChart({ name: 'choro-json-contract' })
    const Key = Symbol('ChoroplethContract')
    const Definition = Block.make(chart.namespace, { ...chart.contract, key: Key })
    return Effect.gen(function* () {
      const model = yield* Story.story(
        { block: Definition, layer: Definition.makeLayer(chart.plans<typeof Key>(Definition)) },
        Story.init('map', { scale: 2, translateX: 10, translateY: 20 }),
        Story.message(Definition.Message.ObservedSize({ width: 630, height: 350 })),
        Story.model((state) => {
          const { zoom } = choroplethZoom<
            { index: number | null } | { scale: number; x: number; y: number }
          >(
            {
              data: {
                type: 'FeatureCollection',
                features: [{ ...feature, properties: feature.properties ?? {} }],
              },
              children: [],
              zoomEnabled: true,
            },
            state,
            { hover: (index) => ({ index }), transform: (scale, x, y) => ({ scale, x, y }) },
          )
          expect(zoom).not.toBeNull()
          if (zoom === null) throw new Error('enabled zoom missing')
          expect(zoom.scale({ scaleX: 2, point: { x: 100, y: 100 } })).toEqual({
            scale: 4,
            x: -80,
            y: -60,
          })
          expect(zoom.translate({ translateX: 5, translateY: -10 })).toEqual({
            scale: 2,
            x: 15,
            y: 10,
          })
          expect(zoom.applyInverseToPoint(zoom.applyToPoint({ x: 5, y: 7 }))).toEqual({
            x: 5,
            y: 7,
          })
          expect(zoom.reset()).toEqual({ scale: 1, x: 0, y: 0 })
        }),
        Story.inMessage(Definition.InMessage.RequestedHover({ index: 0 })),
        Story.message(
          Definition.Message.ObservedTransform({ scale: 4, x: -80, y: -60, dragging: true }),
        ),
        Story.model((model) => {
          expect(model.scale).toBe(4)
          expect(model.hoverRevision).toBe(1)
        }),
      )
      const codec = Schema.fromJsonString(Schema.toCodecJson(Definition.Model))
      const wire = yield* Schema.encodeEffect(codec)(model)
      expect(yield* Schema.decodeEffect(codec)(wire)).toEqual(model)
    })
  },
)
