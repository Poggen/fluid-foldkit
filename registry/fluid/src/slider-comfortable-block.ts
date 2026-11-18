import { Layer, Predicate, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { SliderBlock, layer as sliderLayer, sliderSettings } from './slider.js'
import type { SliderViewInputs } from './slider.js'

const Config = Schema.Struct({
  id: Schema.String,
  value: Schema.Number,
  min: Schema.optionalKey(Schema.Number),
  max: Schema.optionalKey(Schema.Number),
  step: Schema.optionalKey(Schema.Number),
  variant: Schema.optionalKey(Schema.Literals(['pips', 'scrubber'])),
  disabled: Schema.optionalKey(Schema.Boolean),
})

export type SliderComfortableConfig = typeof Config.Type

const Model = Schema.Struct({ slider: SliderBlock.Model })

export const InMessage = defineInMessageUnion({
  RequestedConfigure: {
    value: Schema.Number,
    min: Schema.Number,
    max: Schema.Number,
    step: Schema.Number,
    variant: Schema.Literals(['pips', 'scrubber']),
    disabled: Schema.Boolean,
  },
})

const OutMessage = defineMessageUnion({ Changed: { value: Schema.Number } })

export const SliderComfortableKey = Symbol('SliderComfortable')

const effects = Block.makeEffectsContract()

export const SliderComfortableBlock = Block.make('SliderComfortable', {
  key: SliderComfortableKey,
  InitArgs: Schema.Tuple([Config]),
  Model,
  Message: defineMessageUnion({}),
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<SliderViewInputs>() },
  effects,
})

const Slider = SliderComfortableBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'slider',
  init: {
    contextToArgs: (config: SliderComfortableConfig) =>
      [config] satisfies [SliderComfortableConfig],
  },
}).withOutMessagePolicy({
  forward: SliderComfortableBlock.makeOutMessageForward(SliderBlock, {
    Changed: ({ value }) => (Predicate.isNumber(value) ? OutMessage.Changed({ value }) : undefined),
  }),
})

const SliderComfortableComposition = SliderComfortableBlock.makeComposition({
  bindings: [Slider],
})

const init = SliderComfortableComposition.makeInit((config: SliderComfortableConfig) => ({
  childInitContext: config,
  model: {},
}))

const inMessageUpdate = SliderComfortableComposition.makeInMessageUpdate({
  RequestedConfigure: SliderComfortableBlock.makeStep(
    (model, config: typeof InMessage.RequestedConfigure.Type) =>
      Slider.requestSettings({ settings: sliderSettings({ id: model.slider.id, ...config }) }),
  ),
})

const view = SliderComfortableComposition.makeView.withInputs<SliderViewInputs>(
  (model, inputs, h) =>
    h.block(Slider.embedView({ slotId: model.slider.id, model: model.slider, viewInputs: inputs })),
)

export const layer = SliderComfortableBlock.makeLayer({
  init,
  update: SliderComfortableComposition.makeUpdate({}),
  inMessageUpdate,
  view,
}).pipe(Layer.provide(sliderLayer))
