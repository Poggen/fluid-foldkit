import { Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { InputCopyBlock, layer as copyLayer } from './input-copy-core.js'
import { Config, InMessage } from './input-copy-state.js'
import type { InputCopyConfig } from './input-copy-state.js'
import type { InputCopyViewInputs } from './input-copy-view.js'
import { DocumentTooltipBlock, layer as tooltipLayer } from './tooltip-native-public.js'
import type { DocumentTooltipOccurrenceViewInputs } from './tooltip-native-public.js'
import { createTargetMotionScope } from './motion-target.js'
import { createInputCopyLayer } from './input-copy-resources.js'
import { makeTooltipDomLayer } from './tooltip-native-public.js'

export interface InputCopyControlViewInputs extends Omit<
  InputCopyViewInputs,
  'tooltip' | 'animate'
> {
  readonly reducedMotion?: 'user' | 'always' | 'never'
  readonly portalContainerId?: string
}

const Model = Schema.Struct({
  copy: InputCopyBlock.Model,
  tooltips: DocumentTooltipBlock.Model,
})
type Model = typeof Model.Type

const OutMessage = defineMessageUnion({ Copied: {} })

export const InputCopyControlKey = Symbol('InputCopyControl')

export const InputCopyControlBlock = Block.make('InputCopyControl', {
  key: InputCopyControlKey,
  Model,
  Message: defineMessageUnion({}),
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  inMessageOutputs: { RequestedConfigure: { outMessage: OutMessage } },
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputCopyControlViewInputs>() },
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof InputCopyBlock>['programRequirements']
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
})

const tooltipKey = (model: Model) => `${model.copy.id}-copy-tooltip`
const tooltipOptions = { delayDuration: 500, sideOffset: 2 }

const BaseCopyBinding = InputCopyControlBlock.makeRequiredFieldBinding(InputCopyBlock, {
  field: 'copy',
  init: { contextToArgs: (config: InputCopyConfig) => [config] },
})

const BaseTooltipsBinding = InputCopyControlBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
})

const CopyBinding = BaseCopyBinding.withOutMessagePolicy({
  fold: InputCopyControlBlock.makeOutMessageFold(InputCopyBlock, {
    Events: ({ events }) => {
      const steps = Update.combineSteps(
        events.flatMap((event) =>
          event._tag === 'Copied'
            ? []
            : [
                InputCopyControlBlock.makeStep((model) => {
                  const key = tooltipKey(model)
                  if (!event.enabled) return BaseTooltipsBinding.requestRemove({ key })
                  const options =
                    event.forceOpen === null
                      ? tooltipOptions
                      : { ...tooltipOptions, forceOpen: event.forceOpen }
                  return model.tooltips.rows[key] === undefined
                    ? BaseTooltipsBinding.requestAdd({ key, options })
                    : BaseTooltipsBinding.requestConfigure({ key, options })
                }),
              ],
        ),
      )
      return (registered: Parameters<typeof steps>[0]) =>
        Update.withOutMessage(
          steps(registered),
          events.some((event) => event._tag === 'Copied') ? OutMessage.Copied() : undefined,
        )
    },
  }),
})

const TooltipsBinding = BaseTooltipsBinding.withOutMessagePolicy({
  fold: InputCopyControlBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: ({ admissions }) =>
      Update.combineSteps(
        admissions.map(({ next }) => BaseCopyBinding.informOfTooltipVisibility({ open: next })),
      ),
  }),
})

const InputCopyControlComposition = InputCopyControlBlock.makeComposition({
  bindings: [CopyBinding, TooltipsBinding],
})

const init = InputCopyControlComposition.makeInit((config: InputCopyConfig) => ({
  childInitContext: config,
  model: {},
  steps: [
    InputCopyControlBlock.makeStep((model) =>
      model.copy.variant === 'icon'
        ? TooltipsBinding.requestAdd({ key: tooltipKey(model), options: tooltipOptions })
        : InputCopyControlBlock.makeNoopStep(),
    ),
  ],
}))

const inMessageUpdate = InputCopyControlComposition.makeInMessageUpdate({
  RequestedConfigure: InputCopyControlBlock.makeStep.fromMessage(
    (message: typeof InMessage.RequestedConfigure.Type) => CopyBinding.requestConfigure(message),
  ),
  RequestedCopy: CopyBinding.requestCopy(),
  InformedOfTooltipVisibility: InputCopyControlBlock.makeStep.fromMessage(
    (message: typeof InMessage.InformedOfTooltipVisibility.Type) =>
      CopyBinding.informOfTooltipVisibility(message),
  ),
})

/** Construction owns the motion scope; occurrence state and lifetimes stay in the children. */
export const controlLayer = InputCopyControlBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* InputCopyControlComposition.acquireChildren()
    const motion = createTargetMotionScope('fluid-input-copy')
    yield* Layer.build(motion.layer)

    return {
      children,
      init,
      update: InputCopyControlComposition.makeUpdate({}),
      inMessageUpdate,
      view: InputCopyControlComposition.makeView.withInputs<InputCopyControlViewInputs>(
        (model, inputs, h) => {
          let trigger: DocumentTooltipOccurrenceViewInputs['trigger'] | undefined
          return h.block(
            TooltipsBinding.embedView({
              slotId: 'tooltips',
              model: model.tooltips,
              viewInputs: {
                renderTrigger: (_key, context) => {
                  if (trigger === undefined) throw new Error('Missing InputCopy Tooltip trigger')
                  return trigger(context)
                },
                renderDocument: (content, popups): Html =>
                  h.div([h.Class('contents')], [content, ...popups]),
                render: ({ tooltip }) =>
                  h.block(
                    CopyBinding.embedView({
                      slotId: 'copy',
                      model: model.copy,
                      viewInputs: {
                        ...inputs,
                        animate: motion.node,
                        tooltip: (context, options) => {
                          trigger = context.trigger
                          return tooltip(tooltipKey(model), {
                            content: options.content,
                            shapeClass: options.shapeClass,
                            animate: motion.node,
                            reducedMotion: inputs.reducedMotion ?? 'user',
                            ...(inputs.portalContainerId === undefined
                              ? {}
                              : { portalContainerId: inputs.portalContainerId }),
                          })
                        },
                      },
                    }),
                  ),
              },
            }),
          )
        },
      ),
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(copyLayer, tooltipLayer)))

/** Browser authority for the ordinary control; acquire once at the application root. */
export const createInputCopyControlLayer = (
  document: Document,
  navigator: Navigator,
  window: Window,
) =>
  Layer.mergeAll(
    createInputCopyLayer(document, navigator, window),
    makeTooltipDomLayer(document, window),
  )
