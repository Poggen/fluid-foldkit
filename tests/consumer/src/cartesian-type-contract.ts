import { Layer, Schema } from 'effect'
import { Block, Program } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  GaugeBlock,
  GaugeLayer,
  GaugeConfiguration,
  LineChart,
  CandlestickChart,
  Candlestick,
  ScatterChart,
  Scatter,
  Line,
} from '@/ui/charts/index.js'
import type { CartesianViewInputs } from '@/ui/charts/index.js'
const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
const line = LineChart({ name: 'external-consumer', Row })
const ChartKey = Symbol('ExternalLine')
const Chart = Block.make(line.namespace, { key: ChartKey, ...line.contract })
const CandleRow = Schema.Struct({
  date: Schema.DateFromString,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
})
const candles = CandlestickChart({ name: 'external-candles', Row: CandleRow })
const CandleKey = Symbol('ExternalCandles')
const Candles = Block.make(candles.namespace, { key: CandleKey, ...candles.contract })
const scatter = ScatterChart({ name: 'external-scatter', Row })
const ScatterKey = Symbol('ExternalScatter')
const Scatters = Block.make(scatter.namespace, { key: ScatterKey, ...scatter.contract })
const lineProps = {
  ariaLabel: 'External checked Cartesian consumer',
  children: [Line({ dataKey: 'value' })],
}
const candleProps = { children: [Candlestick()] }
const scatterProps = { children: [Scatter({ dataKey: 'value' })] }
const Model = Schema.Struct({
  gauge: GaugeBlock.Model,
  chart: Chart.Model,
  candles: Candles.Model,
  scatter: Scatters.Model,
})
const Message = defineMessageUnion({ ClearedFocus: {} })
const ConsumerKey = Symbol('Consumer')
const Consumer = Block.make('Consumer', {
  key: ConsumerKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const GaugeBinding = Consumer.makeRequiredFieldBinding(GaugeBlock, {
  field: 'gauge',
  init: {
    contextToArgs: () => [
      GaugeConfiguration.make({ value: 65, orientation: 'linear' }),
      'consumer-gauge',
    ],
  },
})
const ChartBinding = Consumer.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['consumer-chart', [], line.configuration(lineProps)] },
})
const CandleBinding = Consumer.makeRequiredFieldBinding(Candles, {
  field: 'candles',
  init: { contextToArgs: () => ['consumer-candle', [], candles.configuration(candleProps)] },
})
const ScatterBinding = Consumer.makeRequiredFieldBinding(Scatters, {
  field: 'scatter',
  init: { contextToArgs: () => ['consumer-scatter', [], scatter.configuration(scatterProps)] },
})
const candleInputs = candles.inputs('consumer-candle', candleProps)
const scatterInputs = scatter.inputs('consumer-scatter', scatterProps)
const inputs: CartesianViewInputs<typeof Row.Type> = line.inputs('consumer-chart', lineProps)
const Composition = Consumer.makeComposition({
  bindings: [GaugeBinding, ChartBinding, CandleBinding, ScatterBinding],
})
const layer = Consumer.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({ ClearedFocus: ChartBinding.requestFocus({ index: null }) }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.block(
          GaugeBinding.embedView({ slotId: 'consumer-gauge', model: model.gauge, viewInputs: {} }),
        ),
        h.block(
          ChartBinding.embedView({
            slotId: 'consumer-chart',
            model: model.chart,
            viewInputs: inputs,
          }),
        ),
        h.block(
          CandleBinding.embedView({
            slotId: 'consumer-candle',
            model: model.candles,
            viewInputs: candleInputs,
          }),
        ),
        h.block(
          ScatterBinding.embedView({
            slotId: 'consumer-scatter',
            model: model.scatter,
            viewInputs: scatterInputs,
          }),
        ),
      ],
    ),
  ),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      GaugeLayer,
      Chart.makeLayer(line.plans(Chart)),
      Candles.makeLayer(candles.plans(Candles)),
      Scatters.makeLayer(scatter.plans(Scatters)),
    ),
  ),
)
export const program = Program.makeElement({ block: Consumer, layer, container: null })
export const dataOperation = ChartBinding.requestData({ data: [{ date: new Date(0), value: 1 }] })
