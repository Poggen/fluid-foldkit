import { Button } from '@foldkit/ui'
import { Number as EffectNumber } from 'effect'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { LiveLineChart, LiveLine, LiveXAxis, LiveYAxis } from '@foldkit-visuals/charts/live-line'
import { ChartTooltip } from '@foldkit-visuals/charts/line'

const chart = LiveLineChart({ name: 'live-model-proof' })

export const LiveModelChartKey = Symbol('LiveModelChart')

const LiveModelChartBlock = Block.make(chart.namespace, {
  ...chart.contract,
  key: LiveModelChartKey,
})

const chartLayer = LiveModelChartBlock.makeLayer(
  chart.plans<typeof LiveModelChartKey>(LiveModelChartBlock),
)

const Model = Schema.Struct({
  live: LiveModelChartBlock.Model,
  sequence: Schema.Int,
  isVisible: Schema.Boolean,
  isPaused: Schema.Boolean,
  isFormatted: Schema.Boolean,
  window: Schema.Number,
})

const Message = defineMessageUnion({
  ClickedAppend: {},
  ClickedEmpty: {},
  ClickedRestore: {},
  ClickedEqual: {},
  ClickedMount: {},
  ClickedPause: {},
  ClickedFormat: {},
  ClickedWindow: {},
})

export const LiveModelFixtureKey = Symbol('LiveModelFixture')

const LiveModelFixtureBlock = Block.make('LiveModelFixture', {
  key: LiveModelFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

export const liveModelExample = (epoch = 1_700_000_000) => {
  const data = Array.from({ length: 40 }, (_, index) => ({
    time: epoch + index,
    value: 45 + Math.sin(index / 4) * 15,
    price: 60 + index,
    metadata: { source: 'fixture' },
  }))

  const props = (formatted: boolean, window: number) => ({
    data,
    value: 99,
    window,
    style: { height: 240 },
    children: [
      LiveLine({
        dataKey: 'price',
        formatValue: (value: number) => (formatted ? `USD ${value.toFixed(1)}` : value.toFixed(2)),
      }),
      LiveXAxis(),
      LiveYAxis(),
      ChartTooltip(),
    ],
  })

  const plain30 = chart.inputs('live-model', props(false, 30))
  const plain15 = chart.inputs('live-model', props(false, 15))
  const formatted30 = chart.inputs('live-model', props(true, 30))
  const formatted15 = chart.inputs('live-model', props(true, 15))

  const formattedInputs = (window: number) => (window === 30 ? formatted30 : formatted15)
  const plainInputs = (window: number) => (window === 30 ? plain30 : plain15)

  const Live = LiveModelFixtureBlock.makeRequiredFieldBinding(LiveModelChartBlock, {
    field: 'live',
    init: { contextToArgs: () => ['live-model', data, chart.configuration(props(false, 30))] },
  })

  const LiveModelFixtureComposition = LiveModelFixtureBlock.makeComposition({
    bindings: [Live],
  })

  const layer = LiveModelFixtureBlock.makeLayer({
    init: LiveModelFixtureComposition.makeInit(() => ({
      model: { sequence: 0, isVisible: true, isPaused: false, isFormatted: false, window: 30 },
    })),
    update: LiveModelFixtureComposition.makeUpdate({
      ClickedEmpty: Live.requestData({ data: [] }),
      ClickedRestore: Live.requestData({ data }),
      ClickedEqual: LiveModelFixtureBlock.makeStep(() => Live.requestData({ data: [...data] })),
      ClickedMount: (model) => ({ model: modifyFields(model, { isVisible: Boolean.not }) }),
      ClickedAppend: LiveModelFixtureBlock.makeStep((model) =>
        Update.combineSteps([
          LiveModelFixtureBlock.makeFieldsStep(() => ({
            sequence: EffectNumber.increment,
          })),
          Live.requestData({
            data: [
              ...model.live.data,
              {
                time: epoch + 40 + model.sequence,
                value: 100 + model.sequence,
                price: 100 + model.sequence,
              },
            ],
          }),
        ]),
      ),
      ClickedPause: LiveModelFixtureBlock.makeStep((model) =>
        Update.combineSteps([
          LiveModelFixtureBlock.makeFieldsStep(() => ({ isPaused: Boolean.not })),
          Live.requestConfiguration({
            configuration: chart.configuration({
              ...props(model.isFormatted, model.window),
              data: model.live.data,
              paused: !model.isPaused,
            }),
          }),
        ]),
      ),
      ClickedFormat: (model) => ({
        model: modifyFields(model, { isFormatted: Boolean.not }),
      }),
      ClickedWindow: LiveModelFixtureBlock.makeStep((model) =>
        Update.combineSteps([
          LiveModelFixtureBlock.makeFieldsStep(() => ({
            window: (window) => (window === 30 ? 15 : 30),
          })),
          Live.requestConfiguration({
            configuration: chart.configuration({
              ...props(model.isFormatted, model.window === 30 ? 15 : 30),
              data: model.live.data,
              paused: model.isPaused,
            }),
          }),
        ]),
      ),
    }),
    view: LiveModelFixtureComposition.makeView((model, h) => ({
      title: 'LiveLine model and clock proof',
      body: h.div(
        [],
        [
          h.nav(
            [],
            [
              Button.view(
                {
                  onClick: Message.ClickedAppend(),
                  toView: (attributes) => h.button([...attributes.button], ['Append']),
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
                  onClick: Message.ClickedEqual(),
                  toView: (attributes) => h.button([...attributes.button], ['Equal array']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedMount(),
                  toView: (attributes) => h.button([...attributes.button], ['Toggle mount']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedPause(),
                  toView: (attributes) => h.button([...attributes.button], ['Pause']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedFormat(),
                  toView: (attributes) => h.button([...attributes.button], ['Format']),
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
            ],
          ),
          h.div(
            [h.Id('live-state')],
            [
              JSON.stringify({
                sequence: model.sequence,
                token: Option.getOrNull(model.live.dataIdentity),
                revision: model.live.revision,
                generation: model.live.requestedGeneration,
                active: model.live.state.clockActive,
                intro: model.live.state.frame?.intro,
                rows: model.live.data.length,
                paused: model.isPaused,
                window: model.window,
                formatted: model.isFormatted,
              }),
            ],
          ),
          h.section(
            [h.Class('[width:640px] [max-width:100%] [min-height:240px]'), h.Id('live-fixture')],
            model.isVisible
              ? [
                  h.block(
                    Live.embedView({
                      slotId: 'live',
                      model: model.live,
                      viewInputs: model.isFormatted
                        ? formattedInputs(model.window)
                        : plainInputs(model.window),
                    }),
                  ),
                ]
              : [],
          ),
        ],
      ),
    })),
  }).pipe(Layer.provide(chartLayer))

  return { block: LiveModelFixtureBlock, layer }
}
