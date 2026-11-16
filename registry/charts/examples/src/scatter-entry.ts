import { Button } from '@foldkit/ui'
import { ReferenceArea } from '@foldkit-visuals/charts'
import type { YAxisProps } from '@foldkit-visuals/charts'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { DateTime, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  ScatterChart,
  Scatter,
  ChartTooltip,
  Grid,
  XAxis,
  YAxis,
} from '@foldkit-visuals/charts/scatter'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const axis69 = new URLSearchParams(location.search)
const axis69Count = axis69.has('ticks') ? Number(axis69.get('ticks')) : undefined
const axis69Props: YAxisProps = {
  ...(axis69Count === undefined ? {} : { numTicks: axis69Count }),
  ...(axis69.has('literal') ? { formatValue: (value: number) => `<b>&"${value}</b>` } : {}),
}
const axis69Layers = (alternate: boolean) => {
  const swap = axis69.has('swap') && alternate
  const primary = YAxis({ ...axis69Props, ...(swap ? { orientation: 'right' } : {}) })
  const secondary = YAxis({
    ...axis69Props,
    yAxisId: 'right',
    ...(swap ? { orientation: 'left' } : {}),
  })
  return [
    ...(swap ? [secondary, primary] : [primary, secondary]),
    ...(axis69.has('color')
      ? [ReferenceArea({ y1: 100, y2: 200, axisLabelColor: 'rgb(170, 0, 85)' })]
      : []),
  ]
}

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
  revenue: Schema.NullOr(Schema.Finite),
  cost: Schema.NullOr(Schema.Finite),
})

const data = [120, 180, 150, 240, 210, 290, 180].map((revenue, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2025, 0, index + 1))),
    revenue,
    cost: revenue * 6,
  }),
)

const sparseRepeatedData = data.flatMap((row, index) => {
  if (index === 0) {
    return [row, row]
  }

  if (index === 1) {
    return [Row.make({ date: row.date, revenue: null, cost: null })]
  }

  return index === 2 ? [] : [row]
})

const phaseChanged = (phase: string) => {
  document.documentElement.dataset.scatterPhases = `${document.documentElement.dataset.scatterPhases ?? ''}${phase},`
}

const root = ScatterChart({ name: 'scatter-family', Row })

export const ScatterChartKey = Symbol('ScatterChart')

const Chart = Block.make(root.namespace, { key: ScatterChartKey, ...root.contract })

const chartLayer = Chart.makeLayer(root.plans(Chart))

const props = {
  width: 640,
  height: 320,
  animationDuration: 1100,
  onPhaseChange: phaseChanged,
  children: [
    Grid(),
    Scatter({ dataKey: 'revenue' }),
    Scatter({ dataKey: 'cost', strokeWidth: 0, yAxisId: 'right' }),
    XAxis(),
    ...axis69Layers(false),
    ChartTooltip(),
  ],
}

const inputs = root.inputs('native-scatter', props)

const alternateInputs = root.inputs('native-scatter', {
  ...props,
  children: [
    Grid(),
    Scatter({
      dataKey: 'revenue',
      radius: 7,
      stroke: 'navy',
      strokeWidth: 3,
      ringGap: 1,
      outlineWidth: 2,
      yGradient: { from: 'red', to: 'rgb(30, 150, 90)' },
      fadeOnHover: false,
      showActiveHighlight: false,
    }),
    Scatter({ dataKey: 'cost', radius: 4, strokeWidth: 0, yAxisId: 'right' }),
    XAxis(),
    ...axis69Layers(true),
    ChartTooltip(),
  ],
})

const Model = Schema.Struct({
  chart: Chart.Model,
  isAlternate: Schema.Boolean,
  isSparseRepeated: Schema.Boolean,
  isMounted: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedChangeOptions: {},
  ClickedToggleSparseRows: {},
  ClickedFocus: {},
  ClickedReplay: {},
  ClickedEmpty: {},
  ClickedRestore: {},
  ClickedUnmount: {},
  ClickedRemount: {},
})

export const ScatterFixtureKey = Symbol('ScatterFixture')

const ScatterFixtureBlock = Block.make('ScatterFixture', {
  key: ScatterFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const ChartBinding = ScatterFixtureBlock.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['native-scatter', data, root.configuration(props)] },
})

const ScatterFixtureComposition = ScatterFixtureBlock.makeComposition({
  bindings: [ChartBinding],
})

const layer = ScatterFixtureBlock.makeLayer({
  init: ScatterFixtureComposition.makeInit(() => ({
    model: { isAlternate: false, isSparseRepeated: false, isMounted: true },
  })),
  update: ScatterFixtureComposition.makeUpdate({
    ClickedChangeOptions: (model) => ({
      model: modifyFields(model, { isAlternate: Boolean.not }),
    }),
    ClickedToggleSparseRows: ScatterFixtureBlock.makeStep((model) =>
      Update.combineSteps([
        ChartBinding.requestData({ data: model.isSparseRepeated ? data : sparseRepeatedData }),
        ScatterFixtureBlock.makeFieldsStep(() => ({ isSparseRepeated: Boolean.not })),
      ]),
    ),
    ClickedFocus: ChartBinding.requestFocus({ index: 6 }),
    ClickedReplay: ChartBinding.requestConfigure({
      configuration: root.configuration({ ...props, revealSignature: 'again' }),
    }),
    ClickedEmpty: ChartBinding.requestData({ data: [] }),
    ClickedRestore: Update.combineSteps([
      ChartBinding.requestData({ data }),
      ScatterFixtureBlock.makeFieldsStep(() => ({ isSparseRepeated: () => false })),
    ]),
    ClickedUnmount: Update.combineSteps([
      ChartBinding.requestFocus({ index: null }),
      ScatterFixtureBlock.makeFieldsStep(() => ({ isMounted: () => false })),
    ]),
    ClickedRemount: ScatterFixtureBlock.makeFieldsStep(() => ({ isMounted: () => true })),
  }),
  view: ScatterFixtureComposition.makeView((model, h) =>
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
          [h.Id('scatter-fixture')],
          [
            model.isMounted
              ? h.block(
                  ChartBinding.embedView({
                    slotId: 'scatter',
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
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedToggleSparseRows(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button, h.AriaPressed(String(model.isSparseRepeated))],
                    ['Sparse repeated rows'],
                  ),
              },
              h,
            ),
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(chartLayer))

Runtime.run(
  Program.makeElement({
    block: ScatterFixtureBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
