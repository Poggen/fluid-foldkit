import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { GaugeBlock, GaugeLayer, GaugeConfiguration } from '../src/gauge'

export const GaugeServerProbeKey = Symbol('GaugeServerProbe')

const Model = Schema.Struct({ gauge: GaugeBlock.Model })
const Definition = Block.make('GaugeServerProbe', {
  key: GaugeServerProbeKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
const Binding = Definition.makeRequiredFieldBinding(GaugeBlock, {
  field: 'gauge',
  init: {
    contextToArgs: () => [
      GaugeConfiguration.make({ value: 65, centerValue: 845, width: 200 }),
      'ssr-gauge',
    ],
  },
})
const Composition = Definition.makeComposition({ bindings: [Binding] })
const layer = Definition.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Gauge SSR observation',
    body: h.div(
      [],
      [h.block(Binding.embedView({ slotId: 'gauge', model: model.gauge, viewInputs: {} }))],
    ),
  })),
}).pipe(Layer.provide(GaugeLayer))
const rendered = await Effect.runPromise(
  renderToString({ block: Definition, layer }, {}, { isHydratable: false }),
)
await Effect.runPromise(
  Effect.sync(() =>
    process.stdout.write(
      JSON.stringify({
        meaning:
          'Observed typed server reserve; compare geometry, first paint and real hydration separately.',
        html: rendered.html,
        svgCount: (rendered.html.match(/<svg\b/g) ?? []).length,
        pathCount: (rendered.html.match(/<path\b/g) ?? []).length,
      }) + '\n',
    ),
  ),
)
