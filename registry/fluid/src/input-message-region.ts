import { modifyFields } from 'foldkit/struct'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { MessageFile, QueuedMessage } from './input-message-domain.js'
import { PresenceBlock, layer as PresenceLayer } from './presence.js'
import { spring } from './lib/springs.js'
import type { MotionOptions } from './motion.js'

export const Payload = Schema.Union([
  Schema.TaggedStruct('Files', { items: Schema.Array(MessageFile) }),
  Schema.TaggedStruct('Queue', { items: Schema.Array(QueuedMessage) }),
  Schema.TaggedStruct('Suggestions', { items: Schema.Array(Schema.String) }),
]).pipe(Schema.toTaggedUnion('_tag'))

export type InputMessageRegionPayload = Schema.Schema.Type<typeof Payload>

const Model = Schema.Struct({
  payload: Payload,
  height: Schema.OptionFromNullOr(Schema.Finite),
  initial: Schema.Boolean,
  suppressNextEnter: Schema.Boolean,
  presence: PresenceBlock.Model,
})

const Message = defineMessageUnion({})

const InMessage = defineInMessageUnion({
  RequestedReset: {},
  RequestedConfigure: {
    payload: Payload,
    height: Schema.NullOr(Schema.Finite),
    open: Schema.Boolean,
  },
})

const OutMessage = defineMessageUnion({ Exited: {} })

const effects = Block.makeEffectsContract()

export const InputMessageRegionKey = Symbol('FluidInputMessageRegion')

export const InputMessageRegionBlock = Block.make('InputMessageRegion', {
  key: InputMessageRegionKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      payload: Payload,
      open: Schema.Boolean,
      mounted: Schema.optionalKey(Schema.Boolean),
    }),
  ]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputMessageRegionViewInputs>() },
  effects,
  inMessageOutputs: { RequestedConfigure: { outMessage: OutMessage.Exited } },
})

export interface InputMessageRegionConfig {
  readonly id: string
  readonly payload: InputMessageRegionPayload
  readonly open: boolean
  readonly mounted?: boolean
}

const Presence = InputMessageRegionBlock.makeRequiredFieldBinding(PresenceBlock, {
  field: 'presence',
  init: {
    contextToArgs: (config: InputMessageRegionConfig) => [{ id: config.id, open: config.open }],
  },
}).withOutMessagePolicy({
  fold: InputMessageRegionBlock.makeOutMessageFold(PresenceBlock, {
    Entered: InputMessageRegionBlock.makeNoopStep,
    StartedExit: InputMessageRegionBlock.makeNoopStep,
    Exited: () => InputMessageRegionBlock.makeOutMessageStep(() => OutMessage.Exited()),
  }),
})

const InputMessageRegionComposition = InputMessageRegionBlock.makeComposition({
  bindings: [Presence],
})

const init = InputMessageRegionComposition.makeInit((config: InputMessageRegionConfig) => ({
  model: {
    payload: config.payload,
    height: Option.none(),
    initial: !config.open && config.mounted !== false,
    suppressNextEnter: config.mounted === false,
  },
  childInitContext: config,
}))

const inMessageUpdate = InputMessageRegionComposition.makeInMessageUpdate({
  RequestedReset: (model) =>
    Presence.requestReset()(
      modifyFields(model, { suppressNextEnter: () => true, initial: () => false }),
    ),
  RequestedConfigure: (model, { payload, height, open }) => {
    const next = modifyFields(model, {
      payload: () => (open ? payload : model.payload),
      initial: () =>
        open && model.presence.phase === 'Closed' ? !model.suppressNextEnter : model.initial,
      suppressNextEnter: () => (open ? false : model.suppressNextEnter),
      height: () => (height === null ? model.height : Option.some(height)),
    })

    return (open ? Presence.requestShow() : Presence.requestHide())(next)
  },
})

export interface InputMessageRegionViewInputs {
  readonly animate: (node: Html, options: MotionOptions) => Html
  /** Must render the actual content element, including Reorder.Group for Queue. */
  readonly content: (
    payload: InputMessageRegionPayload,
    attributes: ReadonlyArray<ChildAttribute>,
  ) => Html
}

const view = InputMessageRegionComposition.makeView.withInputs<InputMessageRegionViewInputs>(
  (model, inputs, h) => {
    const kind = Payload.match(model.payload, {
      Suggestions: (): 'suggestions' => 'suggestions',
      Files: (): 'files' => 'files',
      Queue: (): 'queue' => 'queue',
    })

    const suggestions = kind === 'suggestions'

    const attributesByKind = {
      files: [h.Class('flex flex-wrap gap-2 pb-1')],
      queue: [h.DataAttribute('im-queue', ''), h.Class('flex flex-col gap-1 pb-1')],
      suggestions: [h.Class('relative mt-2 flex flex-col border-t border-border/60 px-1.5 pt-1.5')],
    }

    return h.block(
      Presence.embedView({
        slotId: model.presence.id,
        model: model.presence,
        viewInputs: {
          className: suggestions ? '-mx-2 -mt-1 overflow-hidden' : 'overflow-hidden',
          animate: (node, present) =>
            inputs.animate(node, {
              initial: model.initial ? { height: 0, opacity: 0 } : false,
              animate: { height: Option.getOrElse(model.height, () => 0), opacity: 1 },
              exit: suggestions ? { height: 0 } : { height: 0, opacity: 0 },
              present,
              transition: { ...spring.moderate, bounce: 0 },
            }),
          content: () =>
            inputs.content(
              model.payload,
              childAttributes([h.DataAttribute('im-region', kind), ...attributesByKind[kind]]),
            ),
        },
      }),
    )
  },
)

export const layer = InputMessageRegionBlock.makeLayer({
  init,
  update: InputMessageRegionComposition.makeUpdate({}),
  inMessageUpdate,
  view,
}).pipe(Layer.provide(PresenceLayer))
