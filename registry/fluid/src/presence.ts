import { modifyFields } from 'foldkit/struct'
import { Data, Option, Schema, Number } from 'effect'
import { Block } from 'foldkit'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { EXIT_COMPLETE_EVENT } from './motion-target.js'

const Phase = Schema.Literals(['Closed', 'Present', 'Exiting'])

const Model = Schema.Struct({ id: Schema.String, phase: Phase, generation: Schema.Finite })

const Message = defineMessageUnion({
  CompletedExit: { generation: Schema.Finite },
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const OutMessage = defineMessageUnion({ Entered: {}, StartedExit: {}, Exited: {} })

const effects = Block.makeEffectsContract()

export const InMessage = defineInMessageUnion({
  RequestedShow: {},
  RequestedHide: {},
  RequestedReset: {},
})

export const PresenceKey = Symbol('Presence')

export const PresenceBlock = Block.make('Presence', {
  key: PresenceKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({ id: Schema.String, open: Schema.optionalKey(Schema.Boolean) }),
  ]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<PresenceViewInputs>() },
  effects,
  inMessageOutputs: {
    RequestedShow: { outMessage: OutMessage.Entered },
    RequestedHide: { outMessage: OutMessage.StartedExit },
  },
})

const PresenceComposition = PresenceBlock.makeComposition()

const init = PresenceComposition.makeInit(
  (config: { readonly id: string; readonly open?: boolean }) => ({
    model: Model.make({
      id: config.id,
      phase: config.open === true ? 'Present' : 'Closed',
      generation: 0,
    }),
  }),
)

const inMessageUpdate = PresenceComposition.makeInMessageUpdate({
  RequestedShow: (model) =>
    model.phase === 'Present'
      ? { model }
      : {
          model: modifyFields(model, { phase: () => 'Present', generation: Number.increment }),
          outMessage: OutMessage.Entered(),
        },
  RequestedHide: (model) =>
    model.phase === 'Present'
      ? {
          model: modifyFields(model, { phase: () => 'Exiting', generation: Number.increment }),
          outMessage: OutMessage.StartedExit(),
        }
      : { model },
  RequestedReset: (model) => ({
    model: modifyFields(model, { phase: () => 'Closed', generation: Number.increment }),
  }),
})

const update = PresenceComposition.makeUpdate({
  CompletedExit: (model, { generation }) =>
    model.phase !== 'Exiting' || generation !== model.generation
      ? { model }
      : {
          model: modifyFields(model, { phase: () => 'Closed' }),
          outMessage: OutMessage.Exited(),
        },
})

export interface PresenceViewInputs {
  readonly animate: (node: Html, present: boolean) => Html
  readonly content: (present: boolean) => Html
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const view = PresenceComposition.makeView.withInputs<PresenceViewInputs>((model, inputs, h) => {
  if (model.phase === 'Closed') {
    return h.empty
  }

  const completed = Events.OnCustomEvent({
    name: EXIT_COMPLETE_EVENT,
    f: () => Option.some(Message.CompletedExit({ generation: model.generation })),
  })

  return inputs.animate(
    h.keyed('div')(
      model.id,
      [
        h.Class(inputs.className === undefined ? '' : inputs.className),
        h.Id(model.id),
        h.DataAttribute('presence', model.phase.toLowerCase()),
        ...(inputs.attributes ?? []),
        completed,
      ],
      [inputs.content(model.phase === 'Present')],
    ),
    model.phase === 'Present',
  )
})

export const layer = PresenceBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
})
