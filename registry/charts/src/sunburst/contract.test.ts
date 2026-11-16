import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Schema, Effect, Layer } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { buildArcs, buildEnterDelays, ringOptions, sumValues } from './arcs'
import { sectorArc, sectorPath, poseOf, hoverArc } from './geometry'
import { SunburstChart } from './index'
import { Block, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { SunburstCenter, SunburstLabels, SunburstHint, SunburstSegment } from './index'
import { SankeyChart, SankeyTooltip, SankeyNode, SankeyLink } from '../sankey'
import { ChoroplethChart, ChoroplethFeatureComponent } from '../choropleth'
const data = {
  name: 'Root',
  children: [
    {
      name: 'Alpha',
      children: [
        { name: 'A', value: 30 },
        { name: 'B', value: 10 },
      ],
    },
    { name: 'Beta', value: 60 },
  ],
}
it('preserves pinned source hierarchy order, angular partition, drill rings and SVG geometry', () => {
  const model = buildArcs(data)
  expect(
    model.arcs.map((arc) => [arc.id, arc.a0, arc.a1, arc.arcIndex, arc.categoryIndex]),
  ).toEqual([
    ['Root / Alpha', -1.5707963267948966, 0.9424777960769379, 0, 0],
    ['Root / Alpha / A', -1.5707963267948966, 0.31415926535897953, 1, 0],
    ['Root / Alpha / B', 0.31415926535897953, 0.9424777960769379, 2, 0],
    ['Root / Beta', 0.9424777960769379, 4.71238898038469, 3, 1],
  ])
  expect(ringOptions(1, 2, 220)).toEqual({ centerR: 71.5, ringWidth: 148.5 })
  expect([...buildEnterDelays(model.arcs, 1).delays]).toEqual([
    ['Root / Alpha', 0],
    ['Root / Beta', 80],
    ['Root / Alpha / A', 120],
    ['Root / Alpha / B', 200],
  ])
  const arc = sectorArc(
    {
      endAngle: Math.PI * 1.5,
      startAngle: -Math.PI / 2,
      inner: 0,
      outer: 220,
      rings: 2,
      rootEnd: Math.PI * 1.5,
      rootStart: -Math.PI / 2,
    },
    -1.5707963267948966,
    0.31415926535897953,
    2,
  )
  expect(arc).toEqual([-1.5707963267948966, 0.31415926535897953, 110, 220])
  expect(poseOf(arc)).toEqual({ rotate: 54, x: -96.98456662825805, y: -133.48780407186632 })
  expect(sectorPath(arc)).toBe(
    'M-220,0A220,220,0,0,1,67.984,-209.232L33.992,-104.616A110,110,0,0,0,-110,0Z',
  )
  expect(
    sumValues({
      name: 'Empty',
      value: -1,
      children: [
        { name: 'Bad', value: NaN },
        { name: 'Negative', value: -1 },
        { name: 'Zero', value: 0 },
      ],
    }),
  ).toBe(0)
})
it('grows the visual sector radially without distorting its circle or moving the transparent base hit path', () => {
  const base = [-Math.PI / 2, Math.PI / 2, 60, 120] satisfies [number, number, number, number]
  const growth = new Map([
    ['Root / Product', 8],
    ['Root / Product / Cloud', 4],
  ])
  expect(hoverArc(base, 'Root / Product', growth)).toEqual([-Math.PI / 2, Math.PI / 2, 60, 128])
  expect(hoverArc(base, 'Root / Product / Cloud', growth)).toEqual([
    -Math.PI / 2,
    Math.PI / 2,
    68,
    132,
  ])
  expect(hoverArc(base, 'Root / Product / Cloud / Region', growth)).toEqual([
    -Math.PI / 2,
    Math.PI / 2,
    72,
    132,
  ])
  expect(hoverArc(base, 'Root / Services', growth)).toEqual(base)
  expect(base).toEqual([-Math.PI / 2, Math.PI / 2, 60, 120])
})
it.effect('keeps drill and hover replayable through explicit JSON Model and Message codecs', () => {
  const chart = SunburstChart({ name: 'sunburst-json-contract' })
  const Key = Symbol('SunburstContract')
  const Definition = Block.make(chart.namespace, { ...chart.contract, key: Key })
  return Effect.gen(function* () {
    const model = yield* Story.story(
      { block: Definition, layer: Definition.makeLayer(chart.plans<typeof Key>(Definition)) },
      Story.init('json'),
      Story.inMessage(Definition.InMessage.RequestedHover({ index: 1 })),
      Story.inMessage(Definition.InMessage.RequestedFocus({ id: 'Root / Alpha' })),
      Story.model((model) => {
        expect(model.hoveredIndex).toBeNull()
        expect(model.focusId).toBe('Root / Alpha')
      }),
      Story.models(
        Story.steps(
          Story.message(Definition.Message.ObservedControlledFocus({ id: 'Root / Beta' })),
          Story.expectOutMessage(Definition.OutMessage.FocusChanged({ id: 'Root / Beta' })),
        ),
        (before, after) => expect(after).toEqual(before),
      ),
    )
    const codec = Schema.fromJsonString(Schema.toCodecJson(Definition.Model))
    const encoded = yield* Schema.encodeEffect(codec)(model)
    expect(yield* Schema.decodeEffect(codec)(encoded)).toEqual(model)
    const message = Definition.InMessage.RequestedFocus({ id: 'Root' })
    const inputCodec = Schema.fromJsonString(Schema.toCodecJson(Definition.InMessage))
    const wire = yield* Schema.encodeEffect(inputCodec)(message)
    expect(yield* Schema.decodeEffect(inputCodec)(wire)).toEqual(message)
  })
})
it.effect(
  'server-renders the registered three-family parent with real SVG before browser resource acquisition',
  () =>
    Effect.gen(function* () {
      const sunburst = SunburstChart({ name: 'source-ssr-sunburst' }),
        sankey = SankeyChart({ name: 'source-ssr-sankey' }),
        choropleth = ChoroplethChart({ name: 'source-ssr-choro' })
      const SunburstKey = Symbol('ServerSunburst')
      const SankeyKey = Symbol('ServerSankey')
      const ChoroplethKey = Symbol('ServerChoropleth')
      const SunburstBlock = Block.make(sunburst.namespace, {
        ...sunburst.contract,
        key: SunburstKey,
      })
      const SankeyBlock = Block.make(sankey.namespace, { ...sankey.contract, key: SankeyKey })
      const ChoroplethBlock = Block.make(choropleth.namespace, {
        ...choropleth.contract,
        key: ChoroplethKey,
      })
      const Model = Schema.Struct({
        sunburst: SunburstBlock.Model,
        sankey: SankeyBlock.Model,
        choropleth: ChoroplethBlock.Model,
      })
      const Message = defineMessageUnion({ Noop: {} })
      const Key = Symbol('NativeHierarchyServer')
      const Definition = Block.make('NativeHierarchyServer', {
        key: Key,
        Model,
        Message,
        InitArgs: Schema.Tuple([]),
        view: { kind: 'Document' },
      })
      const Sunburst = Definition.makeRequiredFieldBinding(SunburstBlock, {
          field: 'sunburst',
          init: { contextToArgs: () => ['server-sunburst'] },
        }).withOutMessagePolicy({
          fold: Definition.makeOutMessageFold(SunburstBlock, {
            FocusChanged: Definition.makeNoopStep,
            HoverChanged: Definition.makeNoopStep,
          }),
        }),
        Sankey = Definition.makeRequiredFieldBinding(SankeyBlock, {
          field: 'sankey',
          init: { contextToArgs: () => ['server-sankey'] },
        }).withOutMessagePolicy({
          fold: Definition.makeOutMessageFold(SankeyBlock, {
            NodeHoverChanged: Definition.makeNoopStep,
            NodeHoverRequested: Definition.makeNoopStep,
          }),
        }),
        Choropleth = Definition.makeRequiredFieldBinding(ChoroplethBlock, {
          field: 'choropleth',
          init: { contextToArgs: () => ['server-choro'] },
        })
      const Composition = Definition.makeComposition({ bindings: [Sunburst, Sankey, Choropleth] })
      const layer = Definition.makeLayer({
        init: Composition.makeInit(() => ({ model: {} })),
        update: Composition.makeUpdate({ Noop: Definition.makeNoopStep() }),
        view: Composition.makeView((m, h) => ({
          title: 'Server hierarchy',
          body: h.div(
            [],
            [
              h.block(
                Sunburst.embedView({
                  slotId: 'sunburst',
                  model: m.sunburst,
                  viewInputs: sunburst.inputs(
                    'server-sunburst',
                    {
                      data,
                      size: 440,
                      children: [
                        ...buildArcs(data).arcs.map((arc) =>
                          SunburstSegment({ index: arc.arcIndex }),
                        ),
                        SunburstCenter(),
                        SunburstLabels(),
                        SunburstHint(),
                      ],
                    },
                    { focus: () => undefined, hover: () => undefined },
                  ),
                }),
              ),
              h.block(
                Sankey.embedView({
                  slotId: 'sankey',
                  model: m.sankey,
                  viewInputs: sankey.inputs(
                    'server-sankey',
                    {
                      data: {
                        nodes: [{ name: 'Start' }, { name: 'End' }],
                        links: [{ source: 0, target: 1, value: 12 }],
                      },
                      children: [SankeyLink(), SankeyNode(), SankeyTooltip()],
                    },
                    { focusNode: () => undefined, focusLink: () => undefined },
                  ),
                }),
              ),
              h.block(
                Choropleth.embedView({
                  slotId: 'choro',
                  model: m.choropleth,
                  viewInputs: choropleth.inputs(
                    'server-choro',
                    {
                      data: {
                        type: 'FeatureCollection',
                        features: [
                          {
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
                          },
                        ],
                      },
                      children: [ChoroplethFeatureComponent()],
                    },
                    { hover: () => undefined, transform: () => undefined },
                  ),
                }),
              ),
            ],
          ),
        })),
      }).pipe(
        Layer.provide(
          Layer.mergeAll(
            SunburstBlock.makeLayer(sunburst.plans<typeof SunburstKey>(SunburstBlock)),
            SankeyBlock.makeLayer(sankey.plans<typeof SankeyKey>(SankeyBlock)),
            ChoroplethBlock.makeLayer(choropleth.plans<typeof ChoroplethKey>(ChoroplethBlock)),
          ),
        ),
      )
      const rendered = yield* renderToString(
        { block: Definition, layer },
        {},
        { isHydratable: true, buildId: 'hierarchy-geo-contract' },
      )
      expect(rendered.html).toContain('Sunburst chart of Root')
      expect(rendered.html.includes('d="M-204,0A204')).toBe(true)
      expect(rendered.html).toContain('data-bkm-chart="sankey"')
      expect(rendered.html).toContain('data-bkm-chart="choropleth"')
      expect(rendered.html).toContain('M297.547,')
      expect(rendered.html.match(/<path/g)?.length).toBeGreaterThan(8)
      expect(rendered.html).toContain('Root')
      expect(rendered.html).toContain('x="89.93"')
      expect(rendered.html).toContain('rotate(-54')
    }),
)
