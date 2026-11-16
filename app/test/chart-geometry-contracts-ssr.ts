import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import {
  Background,
  Bar,
  BarChart,
  BarPulse,
  BarSquares,
  BarXAxis,
  Candlestick,
  CandlestickChart,
  ComposedChart,
  Line,
  PatternCircles,
  PatternLines,
  Scatter,
  ScatterChart,
  YAxis,
} from '../../registry/charts/src/index'

const Row = Schema.Struct({
  name: Schema.String,
  date: Schema.DateFromString,
  value: Schema.Finite,
  other: Schema.Finite,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
})
const rows = [
  Row.make({
    name: 'A',
    date: new Date(0),
    value: 20,
    other: 2000,
    open: 10,
    high: 30,
    low: 0,
    close: 21,
  }),
  Row.make({
    name: 'B',
    date: new Date(86_400_000),
    value: 40,
    other: 4000,
    open: 12,
    high: 31,
    low: 2,
    close: 25,
  }),
]
const bar = BarChart({ name: 'geometry-ssr-bar', Row })
const scatter = ScatterChart({ name: 'geometry-ssr-scatter', Row })
const candle = CandlestickChart({ name: 'geometry-ssr-candle', Row })
const composed = ComposedChart({ name: 'geometry-ssr-composed', Row })
const barKey = Symbol('SsrBar')
const scatterKey = Symbol('SsrScatter')
const candleKey = Symbol('SsrCandle')
const composedKey = Symbol('SsrComposed')
const BarBlock = Block.make(bar.namespace, { key: barKey, ...bar.contract })
const ScatterBlock = Block.make(scatter.namespace, { key: scatterKey, ...scatter.contract })
const CandleBlock = Block.make(candle.namespace, { key: candleKey, ...candle.contract })
const ComposedBlock = Block.make(composed.namespace, { key: composedKey, ...composed.contract })
const paint = { '--custom-ink': '#d14e83', color: 'rebeccapurple', colorInterpolation: 'linearRGB' }
const pattern = PatternCircles({ id: 'ink', width: 8, height: 8, fill: 'var(--custom-ink)' })
const barProps = (width: number) => ({
  width: 400,
  height: 400,
  animationDuration: 0,
  barGap: 0,
  barWidth: width,
  margin: { top: 20, bottom: 30, left: 0, right: 0 },
  style: { ...paint, width: 999, position: 'fixed', transform: 'scale(3)' },
  children: [
    Bar({ dataKey: 'value', fill: 'var(--custom-ink)' }),
    BarPulse({ dataKey: 'value', activeIndex: 0 }),
    BarXAxis(),
    YAxis({
      yAxisId: 'right',
      orientation: 'right',
      numTicks: 3,
      formatValue: (value: number) => `<b>${value}</b>`,
    }),
    BarSquares({
      dataKey: 'other',
      yAxisId: 'right',
      useGradient: true,
      animate: false,
      gradientStops: [
        { offset: 0, color: 'var(--custom-ink)' },
        { offset: 100, color: 'currentColor' },
      ],
    }),
  ],
})
const common = {
  width: 640,
  height: 321,
  animationDuration: 1100,
  style: { ...paint, width: 999, height: 777, display: 'block' },
}
const scatterProps = {
  ...common,
  children: [
    pattern,
    Scatter({
      dataKey: 'value',
      outlineWidth: 1,
      yGradient: { from: 'var(--custom-ink)', to: 'currentColor' },
    }),
    YAxis(),
  ],
}
const candleProps = {
  ...common,
  children: [
    PatternLines({ id: 'body', width: 4, height: 4, stroke: 'white' }),
    Candlestick({ bodyPatternPositive: 'url(#body)', insideStrokeWidth: 0.5 }),
    YAxis({ formatValue: (value: number) => `<b>&"${value}</b>` }),
  ],
}
const composedProps = {
  ...common,
  children: [
    pattern,
    Background({ pattern: 'dots', fadeHorizontalLength: 60, fadeVertical: false }),
    Line({ dataKey: 'value' }),
  ],
}
const parentKey = Symbol('GeometrySsrParent')
const effects = Block.makeEffectsContract<
  never,
  | Block.FactsOf<typeof BarBlock>['programRequirements']
  | Block.FactsOf<typeof ScatterBlock>['programRequirements']
  | Block.FactsOf<typeof CandleBlock>['programRequirements']
  | Block.FactsOf<typeof ComposedBlock>['programRequirements']
>()
const Parent = Block.make('GeometrySsrParent', {
  key: parentKey,
  Model: Schema.Struct({
    bar: BarBlock.Model,
    scatter: ScatterBlock.Model,
    candle: CandleBlock.Model,
    composed: ComposedBlock.Model,
  }),
  InitArgs: Schema.Tuple([]),
  Message: Schema.Never,
  view: { kind: 'Document' },
  effects,
})
const BarBinding = Parent.makeRequiredFieldBinding(BarBlock, {
  field: 'bar',
  init: { contextToArgs: () => ['geometry-bar-ssr', rows, bar.configuration(barProps(18.25))] },
})
const ScatterBinding = Parent.makeRequiredFieldBinding(ScatterBlock, {
  field: 'scatter',
  init: {
    contextToArgs: () => ['geometry-scatter-ssr', rows, scatter.configuration(scatterProps)],
  },
})
const CandleBinding = Parent.makeRequiredFieldBinding(CandleBlock, {
  field: 'candle',
  init: {
    contextToArgs: () => [
      'geometry-candle-ssr',
      rows.slice(0, 1),
      candle.configuration(candleProps),
    ],
  },
})
const ComposedBinding = Parent.makeRequiredFieldBinding(ComposedBlock, {
  field: 'composed',
  init: {
    contextToArgs: () => ['geometry-composed-ssr', rows, composed.configuration(composedProps)],
  },
})
const Composition = Parent.makeComposition({
  bindings: [BarBinding, ScatterBinding, CandleBinding, ComposedBinding],
})
export const renderGeometrySsr = (width = 18.25, focused = false) =>
  renderToString(
    {
      block: Parent,
      layer: Parent.makeLayer({
        init: Composition.makeInit(() => ({
          model: {},
          steps: focused ? [BarBinding.requestFocus({ index: 0 })] : [],
        })),
        update: Composition.makeUpdate({}),
        view: Composition.makeView((model, h) => ({
          title: 'Geometry SSR contracts',
          body: h.main(
            [],
            [
              h.block(
                BarBinding.embedView({
                  slotId: 'bar',
                  model: model.bar,
                  viewInputs: bar.inputs('geometry-bar-ssr', barProps(width)),
                }),
              ),
              h.block(
                ScatterBinding.embedView({
                  slotId: 'scatter',
                  model: model.scatter,
                  viewInputs: scatter.inputs('geometry-scatter-ssr', scatterProps),
                }),
              ),
              h.block(
                CandleBinding.embedView({
                  slotId: 'candle',
                  model: model.candle,
                  viewInputs: candle.inputs('geometry-candle-ssr', candleProps),
                }),
              ),
              h.block(
                ComposedBinding.embedView({
                  slotId: 'composed',
                  model: model.composed,
                  viewInputs: composed.inputs('geometry-composed-ssr', composedProps),
                }),
              ),
            ],
          ),
        })),
      }).pipe(
        Layer.provide(
          Layer.mergeAll(
            BarBlock.makeLayer(bar.plans(BarBlock)),
            ScatterBlock.makeLayer(scatter.plans(ScatterBlock)),
            CandleBlock.makeLayer(candle.plans(CandleBlock)),
            ComposedBlock.makeLayer(composed.plans(ComposedBlock)),
          ),
        ),
      ),
    },
    {},
    { isHydratable: false },
  )
