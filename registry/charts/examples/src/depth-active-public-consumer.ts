import { Button } from '@foldkit/ui'
import { DateTime, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  Bar,
  BarChart,
  BarDepthProvider,
  useActiveMarkers,
  useBarDepthEntries,
} from '@foldkit-visuals/charts/bar'

const Row = Schema.Struct({ name: Schema.String, amount: Schema.Number, date: Schema.String })

const rows = [
  Row.make({ name: 'A', amount: 8, date: '1970-01-01T00:00:00Z' }),
  Row.make({ name: 'B', amount: -4, date: '1970-01-02T00:00:00Z' }),
]

const markers = [
  { date: DateTime.toDateUtc(DateTime.makeUnsafe(0)), label: 'Opening' },
  { date: DateTime.toDateUtc(DateTime.makeUnsafe(86_400_000)), label: 'Next day' },
]

const chart = BarChart({ name: 'depth-active-public-chart', Row })

export const DepthActiveChartKey = Symbol('Cartesian')

const ChartBlock = Block.make(chart.namespace, { key: DepthActiveChartKey, ...chart.contract })

const chartLayer = ChartBlock.makeLayer(chart.plans<typeof DepthActiveChartKey>(ChartBlock))

const props = {
  animationDuration: 1.1,
  children: [BarDepthProvider({ minBarHeight: 12, children: [Bar({ dataKey: 'amount' })] })],
}

const inputs = chart.inputs('depth-active-public-chart', {
  ...props,
  renderContext: (context, h) => {
    const entries = useBarDepthEntries(
      context,
      'amount',
      context.hover.hoveredBarIndex ?? undefined,
    )

    const active = useActiveMarkers(context, markers)

    return h.g(
      [h.Attribute('data-active-marker-labels', active.map((marker) => marker.label).join(','))],
      entries.map((entry) =>
        h.circle([
          h.Cx(String(entry.bandX + entry.bandWidth / 2)),
          h.Cy(String(entry.topY)),
          h.R(entry.isActive ? '5' : '3'),
          h.Fill(entry.isNegative ? 'var(--chart-2)' : 'var(--chart-1)'),
        ]),
      ),
    )
  },
})

const Model = Schema.Struct({ chart: ChartBlock.Model })

const Message = defineMessageUnion({ ClickedFocus: { index: Schema.NullOr(Schema.Int) } })

export const DepthActivePublicConsumerKey = Symbol('DepthActivePublicConsumer')

const effects = Block.makeEffectsContract()

export const DepthActivePublicConsumerBlock = Block.make('DepthActivePublicConsumer', {
  key: DepthActivePublicConsumerKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
  Model,
  Message,
})

const Chart = DepthActivePublicConsumerBlock.makeRequiredFieldBinding(ChartBlock, {
  field: 'chart',
  init: { contextToArgs: () => ['depth-active-public-chart', rows, chart.configuration(props)] },
})

const DepthActivePublicConsumerComposition = DepthActivePublicConsumerBlock.makeComposition({
  bindings: [Chart],
})

export const DepthActivePublicConsumerLayer = DepthActivePublicConsumerBlock.makeLayer({
  init: DepthActivePublicConsumerComposition.makeInit(() => ({ model: {} })),
  update: DepthActivePublicConsumerComposition.makeUpdate({
    ClickedFocus: (model, { index }) => Chart.requestFocus({ index })(model),
  }),
  view: DepthActivePublicConsumerComposition.makeView((model, h) => ({
    title: 'Public depth and active selectors',
    body: h.div(
      [],
      [
        Button.view(
          {
            onClick: Message.ClickedFocus({ index: 0 }),
            toView: (attributes) => h.button([...attributes.button], ['Focus first']),
          },
          h,
        ),
        Button.view(
          {
            onClick: Message.ClickedFocus({ index: null }),
            toView: (attributes) => h.button([...attributes.button], ['Clear focus']),
          },
          h,
        ),
        h.block(Chart.embedView({ slotId: 'chart', model: model.chart, viewInputs: inputs })),
      ],
    ),
  })),
}).pipe(Layer.provide(chartLayer))

export const DepthActivePublicConsumer = {
  block: DepthActivePublicConsumerBlock,
  layer: DepthActivePublicConsumerLayer,
}
