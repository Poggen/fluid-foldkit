import { Button } from '@foldkit/ui'
import { ReferenceArea } from '@foldkit-visuals/charts'
import type { YAxisProps } from '@foldkit-visuals/charts'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { DateTime, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  CandlestickChart,
  Candlestick,
  ChartTooltip,
  Grid,
  XAxis,
  YAxis,
  PatternLines,
} from '@foldkit-visuals/charts/candlestick'
import type { CandlestickChartProps } from '@foldkit-visuals/charts/candlestick'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const axis69 = new URLSearchParams(location.search)
if (axis69.has('zero')) document.body.classList.add('[padding-left:240px]')
const axis69Count = axis69.has('ticks') ? Number(axis69.get('ticks')) : undefined
const axis70Margin = axis69.has('zero') ? { top: 0, right: 0, bottom: 0, left: 0 } : undefined
const axis69Props: YAxisProps = {
  ...(axis69.has('right') ? { orientation: 'right' } : {}),
  ...(axis69Count === undefined ? {} : { numTicks: axis69Count }),
  ...(axis69.has('literal')
    ? { formatValue: (value: number) => `<b>&"long label ${value}</b>` }
    : {}),
}
const axis69Layers = [
  YAxis(axis69Props),
  ...(axis69.has('color')
    ? [ReferenceArea({ y1: -2000, y2: 0, axisLabelColor: 'rgb(170, 0, 85)' })]
    : []),
]

for (const [name, value] of Object.entries({
  '--background': '#fff',
  '--foreground': '#171717',
  '--chart-1': 'oklch(0.646 0.222 41.116)',
  '--chart-2': 'oklch(0.6 0.118 184.704)',
  '--chart-3': 'oklch(0.398 0.07 227.392)',
  '--chart-4': 'oklch(0.828 0.189 84.429)',
  '--chart-5': 'oklch(0.769 0.188 70.08)',
})) {
  document.documentElement.style.setProperty(name, value)
}

document.body.classList.add('[background:#fff]')

document.body.classList.add('[color:#171717]')

document.body.classList.add('[font-family:Geist,_sans-serif]')

document.body.classList.add('[font-size:16px]')

const Row = Schema.Struct({
  date: Schema.DateFromString,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
})

const data = [
  { open: 120, high: 160, low: 100, close: 150 },
  { open: 150, high: 180, low: 125, close: 135 },
  { open: 135, high: 150, low: 110, close: 135 },
  { open: 135, high: 190, low: 130, close: 175 },
  { open: 175, high: 200, low: 150, close: 160 },
  { open: 160, high: 210, low: 155, close: 195 },
  { open: 195, high: 205, low: 165, close: 180 },
].map((values, index) =>
  Row.make({
    ...values,
    ...(axis69.has('negative') ? { low: -2000, high: 2000 } : {}),
    date: DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2025, 0, index + 1))),
  }),
)

const root = CandlestickChart({ name: 'candlestick-family', Row })

export const CandlestickChartKey = Symbol('CandlestickChart')

const Chart = Block.make(root.namespace, { key: CandlestickChartKey, ...root.contract })

const chartLayer = Chart.makeLayer(root.plans(Chart))

const parameters = new URLSearchParams(window.location.search)

const enterTransition: CandlestickChartProps<typeof Row.Type>['enterTransition'] =
  parameters.get('entrance') === 'linear'
    ? { type: 'tween', duration: 0.6, ease: 'linear' }
    : undefined

const patterned = parameters.get('details') === 'pattern'

const detailPaint = patterned
  ? {
      bodyPatternPositive: 'url(#body-lines)',
      bodyPatternNegative: 'url(#body-lines)',
      insideStrokeWidth: 0.5,
    }
  : {}

const candleOptions = {
  ...detailPaint,
  animate: parameters.get('animate') !== 'false',
  showHoverFade: parameters.get('fade') !== 'false',
}

const detailLayers = patterned
  ? [PatternLines({ id: 'body-lines', width: 4, height: 4, stroke: 'white' })]
  : []

const baseProps = {
  width: axis69.has('zero') ? 400 : 640,
  ...(axis70Margin === undefined ? {} : { margin: axis70Margin }),
  height: axis69.has('zero') ? 240 : 320,
  animationDuration: 1100,
  children: [
    ...detailLayers,
    Grid(),
    Candlestick(candleOptions),
    XAxis(),
    ...axis69Layers,
    ChartTooltip(),
  ],
}

const props = enterTransition === undefined ? baseProps : { ...baseProps, enterTransition }

const inputs = root.inputs('native-candlestick', props)

const alternateProps = {
  width: axis69.has('zero') ? 400 : 640,
  ...(axis70Margin === undefined ? {} : { margin: axis70Margin }),
  animationDuration: 1100,
  style: { height: 240 },
  candleWidth: 14,
  candleGap: 0.7,
  children: [
    ...detailLayers,
    Grid(),
    Candlestick({
      ...candleOptions,
      positiveFill: 'rgb(0, 140, 100)',
      negativeFill: 'rgb(210, 40, 70)',
      fadedOpacity: 0.2,
    }),
    XAxis(),
    ...axis69Layers,
    ChartTooltip(),
  ],
}

const alternateInputs = root.inputs(
  'native-candlestick',
  enterTransition === undefined ? alternateProps : { ...alternateProps, enterTransition },
)

const Model = Schema.Struct({
  chart: Chart.Model,
  isAlternate: Schema.Boolean,
  isMounted: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedChangeOptions: {},
  ClickedFocus: {},
  ClickedReplay: {},
  ClickedWindow: {},
  ClickedReset: {},
  ClickedEmpty: {},
  ClickedRestore: {},
  ClickedUnmount: {},
  ClickedRemount: {},
})

export const CandlestickFixtureKey = Symbol('CandlestickFixture')

const CandlestickFixtureBlock = Block.make('CandlestickFixture', {
  key: CandlestickFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const ChartBinding = CandlestickFixtureBlock.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['native-candlestick', data, root.configuration(props)] },
})

const CandlestickFixtureComposition = CandlestickFixtureBlock.makeComposition({
  bindings: [ChartBinding],
})

const layer = CandlestickFixtureBlock.makeLayer({
  init: CandlestickFixtureComposition.makeInit(() => ({
    model: { isAlternate: false, isMounted: true },
  })),
  update: CandlestickFixtureComposition.makeUpdate({
    ClickedChangeOptions: (model) => ({
      model: modifyFields(model, { isAlternate: Boolean.not }),
    }),
    ClickedFocus: ChartBinding.requestFocus({ index: 6 }),
    ClickedReplay: ChartBinding.requestConfigure({
      configuration: root.configuration({ ...props, revealSignature: 'again' }),
    }),
    ClickedWindow: ChartBinding.requestBrush({
      range: Option.some({ start: Date.UTC(2025, 0, 2), end: Date.UTC(2025, 0, 5) }),
    }),
    ClickedReset: ChartBinding.requestBrush({ range: Option.none() }),
    ClickedEmpty: ChartBinding.requestData({ data: [] }),
    ClickedRestore: ChartBinding.requestData({ data }),
    ClickedUnmount: Update.combineSteps([
      ChartBinding.requestFocus({ index: null }),
      CandlestickFixtureBlock.makeFieldsStep(() => ({ isMounted: () => false })),
    ]),
    ClickedRemount: CandlestickFixtureBlock.makeFieldsStep(() => ({ isMounted: () => true })),
  }),
  view: CandlestickFixtureComposition.makeView((model, h) =>
    h.div(
      [],
      [
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedChangeOptions(),
                toView: (attributes) => h.button([...attributes.button], ['Change options']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedFocus(),
                toView: (attributes) => h.button([...attributes.button], ['Focus last']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedReplay(),
                toView: (attributes) => h.button([...attributes.button], ['Replay']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedWindow(),
                toView: (attributes) => h.button([...attributes.button], ['Window']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedReset(),
                toView: (attributes) => h.button([...attributes.button], ['Full range']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedEmpty(),
                toView: (attributes) => h.button([...attributes.button], ['Empty']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedRestore(),
                toView: (attributes) => h.button([...attributes.button], ['Restore']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedUnmount(),
                toView: (attributes) => h.button([...attributes.button], ['Unmount']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedRemount(),
                toView: (attributes) => h.button([...attributes.button], ['Remount']),
              },
              h,
            ),
          ],
        ),
        h.section(
          [h.Id('candlestick-fixture')],
          [
            model.isMounted
              ? h.block(
                  ChartBinding.embedView({
                    slotId: 'candlestick',
                    model: model.chart,
                    viewInputs: model.isAlternate ? alternateInputs : inputs,
                  }),
                )
              : h.empty,
          ],
        ),
        h.output(
          [h.Id('state')],
          [
            `Ready ${model.chart.revealReady}; rows ${model.chart.data.length}; focus ${Option.getOrNull(model.chart.focusedIndex) ?? 'none'}; generation ${model.chart.generation}`,
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(chartLayer))

Runtime.run(
  Program.makeElement({
    block: CandlestickFixtureBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
