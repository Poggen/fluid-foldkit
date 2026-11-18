/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { HoverMode } from './hover-observation.js'
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion } from 'foldkit/message'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import type { HoverConfig } from './hover.js'
import { cn } from './lib/utils.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation, PresentationContext } from './presentation.js'

const Model = Schema.Struct({ hover: HoverBlock.Model })

const Message = Schema.Never

export const InMessage = defineInMessageUnion({
  RequestedRemeasure: {},
  RequestedHoverMode: { mode: HoverMode },
})

const effects = Block.makeEffectsContract()

export const InputGroupKey = Symbol('InputGroup')

export const InputGroupBlock = Block.make('InputGroup', {
  key: InputGroupKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([
    Schema.Struct({ id: Schema.String, hoverMode: Schema.optionalKey(HoverMode) }),
  ]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputGroupViewInputs>() },
  effects,
})

export interface InputGroupConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
}

const Hover = InputGroupBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: InputGroupConfig) =>
      [
        {
          id: config.id,
          gapClick: false,
          ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
        },
      ] satisfies [HoverConfig],
  },
}).withOutMessagePolicy({
  fold: InputGroupBlock.makeOutMessageFold(HoverBlock, {
    Changed: () => InputGroupBlock.makeNoopStep(),
  }),
})

const InputGroupComposition = InputGroupBlock.makeComposition({ bindings: [Hover] })

const init = InputGroupComposition.makeInit((config: InputGroupConfig) => ({
  childInitContext: config,
  model: {},
}))

const update = InputGroupComposition.makeUpdate({})

const inMessageUpdate = InputGroupComposition.makeInMessageUpdate({
  RequestedHoverMode: InputGroupBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: false, gapClick: false, maxDistance: Infinity },
      }),
  ),
  RequestedRemeasure: Hover.requestRemeasure(),
})

export interface InputGroupContext {
  readonly activeIndex: number | null
  readonly context: PresentationContext
}

export interface InputGroupViewInputs extends Presentation {
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly content: (context: InputGroupContext) => ReadonlyArray<Html>
}

const view = InputGroupComposition.makeView.withInputs<InputGroupViewInputs>((model, inputs, h) => {
  const presentation = resolvePresentation(inputs)

  return h.block(
    Hover.embedView({
      slotId: model.hover.id,
      model: model.hover,
      viewInputs: {
        className: cn('relative flex flex-col gap-3 w-72 max-w-full', inputs.className),
        attributes: inputs.attributes ?? [],
        content: () =>
          inputs.content({
            activeIndex: model.hover.activeIndex,
            context: createPresentationContext({
              ...inputs,
              hasSizeProvider: inputs.size !== undefined || presentation.hasSizeProvider,
            }),
          }),
      },
    }),
  )
})

export const layer = InputGroupBlock.makeLayer({ init, update, inMessageUpdate, view }).pipe(
  Layer.provide(HoverLayer),
)

export { InputFieldBlock } from './input-group-field.js'

export type { InputFieldConfig, InputFieldViewInputs } from './input-group-field.js'

export const hoverModeOf = (model: typeof InputGroupBlock.Model.Type) => model.hover.mode
