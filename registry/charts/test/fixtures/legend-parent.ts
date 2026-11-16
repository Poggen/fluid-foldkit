import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { LineChart, Line } from '../../src/cartesian/index'
import { ChartLegend, ProfitLossLegend } from '../../src/legend/index'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const Item = Schema.Struct({
  label: Schema.String,
  value: Schema.Finite,
  color: Schema.String,
  maxValue: Schema.optionalKey(Schema.Finite),
  description: Schema.String,
})

const chartRoot = LineChart({ name: 'shared-legend-line', Row })

const legendRoot = ChartLegend({ Item })

const profitLossRoot = ProfitLossLegend()

export const SharedLegendChartKey = Symbol('Cartesian')

export const SharedLegendKey = Symbol('Legend')

export const SharedProfitLossKey = Symbol('Legend')

const Chart = Block.make(chartRoot.namespace, { key: SharedLegendChartKey, ...chartRoot.contract })

const Legend = Block.make(legendRoot.namespace, { key: SharedLegendKey, ...legendRoot.contract })

const ProfitLoss = Block.make(profitLossRoot.namespace, {
  key: SharedProfitLossKey,
  ...profitLossRoot.contract,
})

const childLayers = Layer.mergeAll(
  Chart.makeLayer(chartRoot.plans<typeof SharedLegendChartKey>(Chart)),
  Legend.makeLayer(legendRoot.plans<typeof SharedLegendKey>(Legend)),
  ProfitLoss.makeLayer(profitLossRoot.plans<typeof SharedProfitLossKey>(ProfitLoss)),
)

const Model = Schema.Struct({
  chart: Chart.Model,
  legend: Legend.Model,
  profitLoss: ProfitLoss.Model,
})

const Message = defineMessageUnion({
  RequestedHover: { index: Schema.NullOr(Schema.Int) },
  RequestedStatus: { status: Schema.Literals(['loading', 'ready']) },
  RequestedLegendIntent: { index: Schema.NullOr(Schema.Int) },
  RequestedProfitLossHover: { index: Schema.NullOr(Schema.Int) },
  RequestedProfitLossIntent: { index: Schema.NullOr(Schema.Int) },
  CompletedHoverNotification: {},
  CompletedProfitLossNotification: {},
})

const InitContext = Schema.Struct({
  id: Schema.String,
  rows: Schema.Array(Row),
  items: Schema.Array(Item),
})

type InitContext = typeof InitContext.Type

interface ViewInputs {
  readonly chart: () => ReturnType<typeof chartRoot.inputs>
}

export const SharedLegendExampleKey = Symbol('SharedLegendExample')

const effects = Block.makeEffectsContract()

const SharedLegendExampleBlock = Block.make('SharedLegendExample', {
  key: SharedLegendExampleKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([Schema.String, Schema.Array(Row), Schema.Array(Item)]),
  ChildInitContext: InitContext,
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  effects,
})

interface LegendNotifications {
  readonly onHover?: (index: number | null) => Effect.Effect<void>
  readonly onProfitLossHover?: (index: number | null) => Effect.Effect<void>
}

const LegendNotifications = Context.Reference<LegendNotifications>('SharedLegendNotifications', {
  defaultValue: () => ({}),
})

const HoverArgs = Schema.Struct({ index: Schema.NullOr(Schema.Int) })

const NotifyHover = SharedLegendExampleBlock.makeCommand('NotifyLegendHover', {
  args: HoverArgs.fields,
  messages: [Message.CompletedHoverNotification],
  *handler() {
    const options = yield* LegendNotifications

    return yield* Effect.succeed(({ index }: typeof HoverArgs.Type) =>
      (options.onHover?.(index) ?? Effect.void).pipe(
        Effect.as(Message.CompletedHoverNotification()),
      ),
    )
  },
})

const NotifyProfitLoss = SharedLegendExampleBlock.makeCommand('NotifyProfitLossHover', {
  args: HoverArgs.fields,
  messages: [Message.CompletedProfitLossNotification],
  *handler() {
    const options = yield* LegendNotifications

    return yield* Effect.succeed(({ index }: typeof HoverArgs.Type) =>
      (options.onProfitLossHover?.(index) ?? Effect.void).pipe(
        Effect.as(Message.CompletedProfitLossNotification()),
      ),
    )
  },
})

export const defineSharedLegendExample = (options: LegendNotifications) => {
  const props = { x: (row: typeof Row.Type) => row.date, children: [Line({ dataKey: 'value' })] }

  const ChartBinding = SharedLegendExampleBlock.makeRequiredFieldBinding(Chart, {
    field: 'chart',
    init: {
      contextToArgs: ({ id, rows }: InitContext) => [
        `${id}-chart`,
        rows,
        chartRoot.configuration(props),
      ],
    },
  })

  const LegendBinding = SharedLegendExampleBlock.makeRequiredFieldBinding(Legend, {
    field: 'legend',
    init: { contextToArgs: ({ id, items }: InitContext) => [`${id}-legend`, items] },
  }).withOutMessagePolicy({
    fold: SharedLegendExampleBlock.makeOutMessageFold(Legend, {
      HoverRequested: ({ index }) =>
        Update.combineSteps([
          ChartBinding.requestLegendHover({ index: Option.fromNullishOr(index) }),
          SharedLegendExampleBlock.makeCommandsStep(() =>
            options.onHover === undefined ? [] : [NotifyHover({ index })],
          ),
        ]),
      LayoutMeasured: () => SharedLegendExampleBlock.makeNoopStep(),
    }),
  })

  const ProfitLossBinding = SharedLegendExampleBlock.makeRequiredFieldBinding(ProfitLoss, {
    field: 'profitLoss',
    init: { contextToArgs: ({ id }: InitContext) => [`${id}-profit-loss`, profitLossRoot.items] },
  }).withOutMessagePolicy({
    fold: SharedLegendExampleBlock.makeOutMessageFold(ProfitLoss, {
      HoverRequested: ({ index }) =>
        Update.combineSteps([
          ChartBinding.requestProfitLossLegendHover({ index: Option.fromNullishOr(index) }),
          SharedLegendExampleBlock.makeCommandsStep(() =>
            options.onProfitLossHover === undefined ? [] : [NotifyProfitLoss({ index })],
          ),
        ]),
      LayoutMeasured: () => SharedLegendExampleBlock.makeNoopStep(),
    }),
  })

  const Composition = SharedLegendExampleBlock.makeComposition({
    bindings: [ChartBinding, LegendBinding, ProfitLossBinding],
  })

  const layer = SharedLegendExampleBlock.makeLayer({
    init: Composition.makeInit(
      (
        id: string,
        rows: ReadonlyArray<typeof Row.Type>,
        items: ReadonlyArray<typeof Item.Type>,
      ) => ({
        model: {},
        childInitContext: { id, rows, items },
      }),
    ),
    update: Composition.makeUpdate({
      RequestedHover: (model, { index }) =>
        ChartBinding.requestLegendHover({ index: Option.fromNullishOr(index) })(model),
      RequestedProfitLossHover: (model, { index }) =>
        ChartBinding.requestProfitLossLegendHover({ index: Option.fromNullishOr(index) })(model),
      RequestedLegendIntent: (model, { index }) => LegendBinding.requestHover({ index })(model),
      RequestedProfitLossIntent: (model, { index }) =>
        ProfitLossBinding.requestHover({ index })(model),
      RequestedStatus: (model, { status }) =>
        ChartBinding.requestConfigure({
          configuration: { ...model.chart.configuration, status },
        })(model),
      CompletedHoverNotification: SharedLegendExampleBlock.makeNoopStep(),
      CompletedProfitLossNotification: SharedLegendExampleBlock.makeNoopStep(),
    }),
    view: Composition.makeView.withInputs<{
      readonly chart: () => ReturnType<typeof chartRoot.inputs>
    }>((model, inputs, h) =>
      h.div(
        [],
        [
          h.block(
            ChartBinding.embedView({
              slotId: 'chart',
              model: model.chart,
              viewInputs: inputs.chart(),
            }),
          ),
          h.block(
            LegendBinding.embedView({
              slotId: 'legend',
              model: model.legend,
              viewInputs: legendRoot.inputs(Option.getOrNull(model.chart.hoveredLegend), {
                showProgress: true,
                showPercentage: true,
              }),
            }),
          ),
          h.block(
            ProfitLossBinding.embedView({
              slotId: 'profit-loss',
              model: model.profitLoss,
              viewInputs: profitLossRoot.inputs(
                Option.getOrNull(model.chart.hoveredProfitLossLegend),
              ),
            }),
          ),
        ],
      ),
    ),
    EffectsLayer: Layer.mergeAll(NotifyHover.layer, NotifyProfitLoss.layer).pipe(
      Layer.provide(Layer.succeed(LegendNotifications, options)),
      Layer.fresh,
    ),
  }).pipe(Layer.provide(childLayers))

  const Parent = { block: SharedLegendExampleBlock, layer }

  return {
    Parent,
    Chart,
    Legend,
    ChartBinding,
    LegendBinding,
    ProfitLossBinding,
    Row,
    Item,
    inputs: (id: string) => {
      const chart = chartRoot.inputs(`${id}-chart`, props)

      return { chart: () => chart }
    },
  }
}
