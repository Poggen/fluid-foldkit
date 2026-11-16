import { DateTime, Effect, Layer, Predicate, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import {
  CandlestickChart,
  Candlestick,
  ScatterChart,
  Scatter,
  Grid,
  XAxis,
  YAxis,
} from '../src/index'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
})

const data = [
  { open: 10, high: 25, low: 5, close: 20 },
  { open: 20, high: 30, low: 0, close: 10 },
  { open: 15, high: 18, low: 12, close: 15 },
].map((values, index) =>
  Row.make({ ...values, date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)) }),
)

const candles = CandlestickChart({ name: 'ssr-candles', Row })

const scatter = ScatterChart({ name: 'ssr-scatter', Row })

const candleProps = {
  width: 640,
  height: 320,
  animationDuration: 1100,
  children: [Grid(), Candlestick(), XAxis(), YAxis()],
}

const scatterProps = {
  width: 640,
  height: 320,
  animationDuration: 1100,
  children: [Grid(), Scatter({ dataKey: 'close' }), XAxis(), YAxis()],
}

export const CandleChartKey = Symbol('CandleChartKey')

const CandleChartBlock = Block.make(candles.namespace, { key: CandleChartKey, ...candles.contract })

export const ScatterChartKey = Symbol('ScatterChartKey')

const ScatterChartBlock = Block.make(scatter.namespace, {
  key: ScatterChartKey,
  ...scatter.contract,
})

const Model = Schema.Struct({ candles: CandleChartBlock.Model, scatter: ScatterChartBlock.Model })

export const FinancialServerProbeKey = Symbol('FinancialServerProbe')

const Probe = Block.make('FinancialServerProbe', {
  key: FinancialServerProbeKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const CandleBinding = Probe.makeRequiredFieldBinding(CandleChartBlock, {
  field: 'candles',
  init: { contextToArgs: () => ['source-candle', data, candles.configuration(candleProps)] },
})

const ScatterBinding = Probe.makeRequiredFieldBinding(ScatterChartBlock, {
  field: 'scatter',
  init: { contextToArgs: () => ['source-scatter', data, scatter.configuration(scatterProps)] },
})

const FinancialServerProbeComposition = Probe.makeComposition({
  bindings: [CandleBinding, ScatterBinding],
})

const layer = Probe.makeLayer({
  init: FinancialServerProbeComposition.makeInit(() => ({ model: {} })),
  update: FinancialServerProbeComposition.makeUpdate({}),
  view: FinancialServerProbeComposition.makeView((model, h) => ({
    title: 'Financial server probe',
    body: h.div(
      [],
      [
        h.section(
          [h.Id('candlestick-fixture')],
          [
            h.block(
              CandleBinding.embedView({
                slotId: 'candles',
                model: model.candles,
                viewInputs: candles.inputs('source-candle', candleProps),
              }),
            ),
          ],
        ),
        h.section(
          [h.Id('scatter-fixture')],
          [
            h.block(
              ScatterBinding.embedView({
                slotId: 'scatter',
                model: model.scatter,
                viewInputs: scatter.inputs('source-scatter', scatterProps),
              }),
            ),
          ],
        ),
      ],
    ),
  })),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      CandleChartBlock.makeLayer(candles.plans(CandleChartBlock)),
      ScatterChartBlock.makeLayer(scatter.plans(ScatterChartBlock)),
    ),
  ),
)

const rendered = await Effect.runPromise(
  renderToString({ block: Probe, layer }, {}, { isHydratable: false }),
)

await Effect.runPromise(
  Effect.sync(() =>
    process.stdout.write(
      `${JSON.stringify({
        globals: {
          document: Predicate.isUndefined(globalThis.document) ? 'undefined' : 'present',
          window: Predicate.isUndefined(globalThis.window) ? 'undefined' : 'present',
          HTMLElement: Predicate.isUndefined(globalThis.HTMLElement) ? 'undefined' : 'present',
          customElements: Predicate.isUndefined(globalThis.customElements)
            ? 'undefined'
            : 'present',
          requestAnimationFrame: Predicate.isUndefined(globalThis.requestAnimationFrame)
            ? 'undefined'
            : 'present',
        },
        html: rendered.html,
      })}\n`,
    ),
  ),
)
