import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { DateTime, Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { Server } from 'foldkit/experimental'
import { LineChart } from '../src/cartesian/root'
import { Line } from '../src/cartesian/layers'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const recipe = LineChart({ name: 'server-contract-line', Row })

export const ServerLineKey = Symbol('Cartesian')

const chart = Block.make(recipe.namespace, { key: ServerLineKey, ...recipe.contract })

const props = { width: 640, height: 320, children: [Line({ dataKey: 'value' })] }

const inputs = recipe.inputs('server-line', props)

const data = [
  { date: DateTime.toDateUtc(DateTime.makeUnsafe('2025-01-01T00:00:00Z')), value: 10 },
  { date: DateTime.toDateUtc(DateTime.makeUnsafe('2025-01-02T00:00:00Z')), value: 20 },
]

export const ServerDocumentKey = Symbol('CartesianServerDocument')

const Document = Block.make('CartesianServerDocument', {
  key: ServerDocumentKey,
  Model: Schema.Struct({ chart: chart.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const ChartBinding = Document.makeRequiredFieldBinding(chart, {
  field: 'chart',
  init: { contextToArgs: () => ['server-line', data, recipe.configuration(props)] },
})

const composition = Document.makeComposition({ bindings: [ChartBinding] })

const layer = Document.makeLayer({
  init: composition.makeInit(() => ({ model: {} })),
  update: composition.makeUpdate({}),
  view: composition.makeView((model, h) => ({
    title: 'Server chart',
    body: h.main(
      [],
      [
        h.block(
          ChartBinding.embedView({
            slotId: 'server-line',
            model: model.chart,
            viewInputs: inputs,
          }),
        ),
      ],
    ),
  })),
}).pipe(Layer.provide(chart.makeLayer(recipe.plans<typeof ServerLineKey>(chart))))

it.effect('renders the real Line SVG through a stock Document Layer without browser globals', () =>
  Effect.gen(function* renderLineDocument() {
    expect(globalThis).not.toHaveProperty('HTMLElement')

    const rendered = yield* Server.renderToString(
      { block: Document, layer },
      {},
      { isHydratable: false },
    )

    expect(rendered.html).toContain('<svg')
    expect(rendered.html).toContain('<path')
    expect(rendered.html).toContain('data-bkm-native-chart="server-line"')
    expect(rendered.html).not.toContain('<fk-bklit-server-contract-line')
  }),
)

it.effect('constructs Cartesian handlers without browser globals or physical acquisition', () =>
  Story.withBlock({ block: chart, layer: chart.makeLayer(recipe.plans(chart)) }, (acquired) =>
    Effect.gen(function* constructServerHandlers() {
      expect(globalThis).not.toHaveProperty('HTMLElement')
      yield* Effect.scoped(Layer.build(acquired.EffectsLayer))
    }),
  ),
)
