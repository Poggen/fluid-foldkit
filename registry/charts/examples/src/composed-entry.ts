import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { DateTime, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  ComposedChart,
  SeriesBar,
  Line,
  Area,
  XAxis,
  YAxis,
  ChartTooltip,
  Grid,
} from '@foldkit-visuals/charts/composed'
import type { ComposedChartProps } from '@foldkit-visuals/charts/composed'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  revenue: Schema.Finite,
  cost: Schema.Finite,
})

const data = [120, 180, 150, 240, 210, 290, 180].map((revenue, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2025, 0, index + 1))),
    revenue,
    cost: revenue * 0.6,
  }),
)

const root = ComposedChart({ name: 'composed-family', Row })

export const ComposedChartKey = Symbol('ComposedChart')

const Chart = Block.make(root.namespace, { key: ComposedChartKey, ...root.contract })

const chartLayer = Chart.makeLayer(root.plans(Chart))

const props = {
  x: (row) => row.date,
  barSize: 24,
  width: 640,
  height: 320,
  animationDuration: 1100,
  children: [
    Grid(),
    Area({ dataKey: 'cost', fill: 'rgb(30, 150, 90)', showLine: false }),
    Line({ dataKey: 'revenue', stroke: 'navy', fadeEdges: false }),
    SeriesBar({ dataKey: 'cost', fill: 'rgb(30, 150, 90)' }),
    XAxis(),
    YAxis(),
    ChartTooltip(),
  ],
} satisfies ComposedChartProps<typeof Row.Type>

const inputs = root.inputs('native-composed', props)

const alternateInputs = root.inputs('native-composed', {
  ...props,
  stacked: true,
  stackGap: 2,
  children: [
    Grid(),
    SeriesBar({ dataKey: 'revenue', fill: 'navy' }),
    SeriesBar({ dataKey: 'cost', fill: 'rgb(30, 150, 90)' }),
    XAxis(),
    YAxis(),
    ChartTooltip(),
  ],
})

const Model = Schema.Struct({
  chart: Chart.Model,
  isAlternate: Schema.Boolean,
  isMounted: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedChangeOptions: {},
  ClickedFocus: {},
  ClickedClearFocus: {},
  ClickedUnmount: {},
  ClickedRemount: {},
  ClickedReplay: {},
  ClickedEmpty: {},
  ClickedRestore: {},
  ClickedChangeData: {},
})

export const ComposedFixtureKey = Symbol('ComposedShowcase')

const ComposedShowcaseBlock = Block.make('ComposedShowcase', {
  key: ComposedFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const ChartBinding = ComposedShowcaseBlock.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['native-composed', data, root.configuration(props)] },
})

const ComposedShowcaseComposition = ComposedShowcaseBlock.makeComposition({
  bindings: [ChartBinding],
})

const layer = ComposedShowcaseBlock.makeLayer({
  init: ComposedShowcaseComposition.makeInit(() => ({
    model: { isAlternate: false, isMounted: true },
  })),
  update: ComposedShowcaseComposition.makeUpdate({
    ClickedChangeOptions: (model) => ({
      model: modifyFields(model, { isAlternate: Boolean.not }),
    }),
    ClickedFocus: ChartBinding.requestFocus({ index: 6 }),
    ClickedClearFocus: ChartBinding.requestFocus({ index: null }),
    ClickedUnmount: Update.combineSteps([
      ChartBinding.requestFocus({ index: null }),
      ComposedShowcaseBlock.makeFieldsStep(() => ({ isMounted: () => false })),
    ]),
    ClickedRemount: ComposedShowcaseBlock.makeFieldsStep(() => ({ isMounted: () => true })),
    ClickedReplay: ChartBinding.requestConfigure({
      configuration: root.configuration({ ...props, revealSignature: 'again' }),
    }),
    ClickedEmpty: ChartBinding.requestData({ data: [] }),
    ClickedRestore: ChartBinding.requestData({ data }),
    ClickedChangeData: ChartBinding.requestData({
      data: data
        .slice(1, 6)
        .map((row) => Row.make({ ...row, revenue: row.revenue * 0.8, cost: row.cost * 1.2 })),
    }),
  }),
  view: ComposedShowcaseComposition.makeView((model, h) =>
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
                onClick: Message.ClickedClearFocus(),
                toView: (attributes) => h.button([...attributes.button], ['Clear focus']),
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
                onClick: Message.ClickedChangeData(),
                toView: (attributes) => h.button([...attributes.button], ['Change data']),
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
          [h.Id('composed-fixture')],
          [
            model.isMounted
              ? h.block(
                  ChartBinding.embedView({
                    slotId: 'composed',
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
    block: ComposedShowcaseBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
