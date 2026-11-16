import { Button } from '@foldkit/ui'
import { Number as EffectNumber } from 'effect'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { DateTime, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  ChartMarkers,
  ChartTooltip,
  Grid,
  Line,
  LineChart,
  LineSeriesTerminalMarker,
  ProjectionLine,
  ReferenceArea,
  XAxis,
  YAxis,
  buildProjectionPath,
} from '@foldkit-visuals/charts/line'
import { ChartLegend } from '@foldkit-visuals/charts/legend'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  revenue: Schema.Finite,
  cost: Schema.Finite,
})

const Item = Schema.Struct({
  label: Schema.String,
  value: Schema.Finite,
  maxValue: Schema.Finite,
  color: Schema.String,
})

const date = (day: number) => DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2025, 0, day)))

const rows = [120, 180, 150, 240, 210, 290, 260].map((revenue, index) =>
  Row.make({ date: date(index + 1), revenue, cost: revenue * 0.6 }),
)

const alternateRows = rows.map((row) =>
  Row.make({ ...row, revenue: row.revenue * 0.8, cost: row.cost * 1.1 }),
)

const items = (data: ReadonlyArray<typeof Row.Type>) => [
  Item.make({
    label: 'Revenue',
    value: data.at(-1)?.revenue ?? 0,
    maxValue: 400,
    color: 'var(--chart-1)',
  }),
  Item.make({
    label: 'Cost',
    value: data.at(-1)?.cost ?? 0,
    maxValue: 400,
    color: 'var(--chart-2)',
  }),
]

const chart = LineChart({ name: 'overlay-compositions', Row })

const legend = ChartLegend({ Item })

export const CompositionChartKey = Symbol('Cartesian')

export const CompositionLegendKey = Symbol('Legend')

const ChartBlock = Block.make(chart.namespace, { key: CompositionChartKey, ...chart.contract })

const LegendBlock = Block.make(legend.namespace, { key: CompositionLegendKey, ...legend.contract })

const childLayers = Layer.mergeAll(
  ChartBlock.makeLayer(chart.plans<typeof CompositionChartKey>(ChartBlock)),
  LegendBlock.makeLayer(legend.plans<typeof CompositionLegendKey>(LegendBlock)),
)

const chartProps = (data: Array<typeof Row.Type>, overlays: boolean) => ({
  width: 760,
  height: 380,
  ariaLabel: 'Revenue and cost with target range, forecast and release events',
  margin: { top: 52, right: 30, bottom: 40, left: 48 },
  children: [
    Grid({ horizontal: true }),
    ...(overlays
      ? [
          ReferenceArea({
            y1: 180,
            y2: 280,
            pattern: 'diagonal',
            patternColor: 'var(--chart-3)',
            fillOpacity: 0.3,
            showMarkers: true,
          }),
        ]
      : []),
    Line({ dataKey: 'revenue', stroke: 'var(--chart-1)', showMarkers: true }),
    Line({ dataKey: 'cost', stroke: 'var(--chart-2)' }),
    ...(overlays
      ? [
          LineSeriesTerminalMarker({ dataKey: 'revenue', stroke: 'var(--chart-1)' }),
          ProjectionLine({
            data: buildProjectionPath({
              sourceData: data,
              seriesKey: 'revenue',
              mode: 'target',
              endValue: 360,
              horizonPoints: 3,
              pathDensity: 'endpoints',
            }),
            curveKind: 'bezier',
            strokeStyle: 'gradient',
            gradientStart: 'var(--chart-1)',
            gradientEnd: 'var(--chart-3)',
            strokeDasharray: '4,4',
          }),
          ChartMarkers({
            size: 28,
            maxFanned: 3,
            items: [
              {
                date: date(2),
                icon: 'A',
                title: 'Launch',
                description: 'First release',
                href: '#launch',
                color: 'var(--chart-1)',
              },
              {
                date: date(4),
                icon: 'B',
                title: 'Billing',
                description: 'Billing improvements',
                href: '#billing',
                color: 'var(--chart-2)',
              },
              {
                date: date(4),
                icon: 'C',
                title: 'Campaign',
                description: 'Campaign started',
                href: '#campaign',
                color: 'var(--chart-3)',
              },
              {
                date: date(4),
                icon: 'D',
                title: 'Delivery',
                description: 'Delivery expanded',
                href: '#delivery',
                color: 'var(--chart-4)',
              },
            ],
          }),
        ]
      : []),
    XAxis(),
    YAxis(),
    ChartTooltip(),
  ],
})

const baseProps = chartProps(rows, true)

const presentations = [
  [
    chart.inputs('composition-chart', baseProps),
    chart.inputs('composition-chart', chartProps(rows, false)),
  ],
  [
    chart.inputs('composition-chart', chartProps(alternateRows, true)),
    chart.inputs('composition-chart', chartProps(alternateRows, false)),
  ],
]

const Model = Schema.Struct({
  chart: ChartBlock.Model,
  legend: LegendBlock.Model,
  isAlternate: Schema.Boolean,
  hasOverlays: Schema.Boolean,
  isVisible: Schema.Boolean,
  replay: Schema.Int,
})

const Message = defineMessageUnion({
  ClickedDataChanged: {},
  ClickedOverlaysToggled: {},
  ClickedVisibilityToggled: {},
  ClickedReplay: {},
  ClickedLoadingChanged: {},
  ClickedFocusLegend: {},
  ClickedClearLegend: {},
})

export const ChartCompositionsKey = Symbol('ChartCompositions')

const ChartCompositionsBlock = Block.make('ChartCompositions', {
  key: ChartCompositionsKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const Chart = ChartCompositionsBlock.makeRequiredFieldBinding(ChartBlock, {
  field: 'chart',
  init: { contextToArgs: () => ['composition-chart', rows, chart.configuration(baseProps)] },
})

const Legend = ChartCompositionsBlock.makeRequiredFieldBinding(LegendBlock, {
  field: 'legend',
  init: { contextToArgs: () => ['composition-legend', items(rows)] },
}).withOutMessagePolicy({
  fold: ChartCompositionsBlock.makeOutMessageFold(LegendBlock, {
    HoverRequested: ({ index }) => Chart.requestLegendHover({ index: Option.fromNullishOr(index) }),
    LayoutMeasured: () => ChartCompositionsBlock.makeNoopStep(),
  }),
})

const ChartCompositionsComposition = ChartCompositionsBlock.makeComposition({
  bindings: [Chart, Legend],
})

const layer = ChartCompositionsBlock.makeLayer({
  init: ChartCompositionsComposition.makeInit(() => ({
    model: { isAlternate: false, hasOverlays: true, isVisible: true, replay: 0 },
  })),
  update: ChartCompositionsComposition.makeUpdate({
    ClickedDataChanged: (model) => {
      const data = model.isAlternate ? rows : alternateRows

      return Update.combineSteps([
        ChartCompositionsBlock.makeFieldsStep(() => ({ isAlternate: Boolean.not })),
        Chart.requestData({ data }),
        Legend.requestItems({ items: items(data) }),
      ])(model)
    },
    ClickedOverlaysToggled: (model) => ({
      model: modifyFields(model, { hasOverlays: Boolean.not }),
    }),
    ClickedVisibilityToggled: (model) => ({
      model: modifyFields(model, { isVisible: Boolean.not }),
    }),
    ClickedReplay: (model) =>
      Update.combineSteps([
        ChartCompositionsBlock.makeFieldsStep(() => ({ replay: EffectNumber.increment })),
        Chart.requestConfigure({
          configuration: {
            ...model.chart.configuration,
            status: 'ready',
            revealSignature: String(model.replay + 1),
          },
        }),
      ])(model),
    ClickedLoadingChanged: (model) =>
      Chart.requestConfigure({
        configuration: {
          ...model.chart.configuration,
          status: model.chart.configuration.status === 'loading' ? 'ready' : 'loading',
        },
      })(model),
    ClickedFocusLegend: Legend.requestFocus({ index: 0 }),
    ClickedClearLegend: Chart.requestLegendHover({ index: Option.none() }),
  }),
  view: ChartCompositionsComposition.makeView((model, h) => {
    const inputs = presentations[model.isAlternate ? 1 : 0]?.[model.hasOverlays ? 0 : 1]

    return h.main(
      [h.Class('[max-width:760px]')],
      [
        h.h1([], ['Forecast, reference bands, events and legend']),
        h.p(
          [],
          [
            'Hover or focus a legend row to isolate its series. Hover the three-event cluster to expand it; select an event to read its release note.',
          ],
        ),
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedDataChanged(),
                toView: (attributes) => h.button([...attributes.button], ['Replace data']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedOverlaysToggled(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button],
                    [model.hasOverlays ? 'Hide overlays' : 'Show overlays'],
                  ),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedReplay(),
                toView: (attributes) => h.button([...attributes.button], ['Replay entrance']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedLoadingChanged(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle loading']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedFocusLegend(),
                toView: (attributes) => h.button([...attributes.button], ['Focus revenue legend']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedClearLegend(),
                toView: (attributes) =>
                  h.button([...attributes.button], ['Clear legend highlight']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedVisibilityToggled(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button],
                    [model.isVisible ? 'Unmount chart' : 'Mount chart'],
                  ),
              },
              h,
            ),
          ],
        ),
        model.isVisible && inputs !== undefined
          ? h.block(Chart.embedView({ slotId: 'chart', model: model.chart, viewInputs: inputs }))
          : h.empty,
        h.block(
          Legend.embedView({
            slotId: 'legend',
            model: model.legend,
            viewInputs: legend.inputs(Option.getOrNull(model.chart.hoveredLegend), {
              title: 'Latest values',
              showProgress: true,
              showPercentage: true,
            }),
          }),
        ),
        h.p(
          [h.Id('composition-status'), h.Role('status')],
          [
            `${model.chart.phase}; ${model.chart.data.length} observations; highlighted series ${Option.getOrNull(model.chart.hoveredLegend) ?? 'none'}`,
          ],
        ),
        ...[
          ['launch', 'Launch', 'The first release went live.'],
          ['billing', 'Billing', 'Billing improvements shipped.'],
          ['campaign', 'Campaign', 'The new campaign started.'],
          ['delivery', 'Delivery', 'Delivery coverage expanded.'],
        ].map(([id, title, description]) =>
          h.section([h.Id(id ?? '')], [h.h2([], [title ?? '']), h.p([], [description ?? ''])]),
        ),
      ],
    )
  }),
}).pipe(Layer.provide(childLayers))

Runtime.run(
  Program.makeElement({
    block: ChartCompositionsBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
