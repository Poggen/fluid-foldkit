import { Effect, Option, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { TooltipDom } from './resources.js'

const Pending = Schema.Struct({ generation: Schema.Natural, delay: Schema.Number })

const Model = Schema.Struct({ pending: Schema.Option(Pending) })

const Message = defineMessageUnion({ Completed: { generation: Schema.Natural } })

const OutMessage = defineMessageUnion({ Elapsed: { generation: Schema.Natural } })

export const InMessage = defineInMessageUnion({
  RequestedSchedule: Pending.fields,
  RequestedCancel: {},
})

export const TooltipGroupClockKey = Symbol('TooltipGroupClock')

export const TooltipGroupClockBlock = Block.make('TooltipGroupClock', {
  key: TooltipGroupClockKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  InMessage,
  OutMessage,
  effects: Block.makeEffectsContract<never, TooltipDom>(),
})

const subscriptions = TooltipGroupClockBlock.makeSubscriptions((entry) => ({
  cooldown: entry(
    'Cooldown',
    { pending: Schema.Option(Pending) },
    {
      messages: [Message.Completed],
      when: (model) => Option.isSome(model.pending),
      modelToDependencies: (model) => ({ pending: model.pending }),
      *handler() {
        const dom = yield* TooltipDom

        return ({ pending }) =>
          Option.match(pending, {
            onNone: () => Stream.empty,
            onSome: ({ delay, generation }) =>
              Stream.fromEffect(dom.wait(delay).pipe(Effect.as(Message.Completed({ generation })))),
          })
      },
    },
  ),
}))

const TooltipGroupClockComposition = TooltipGroupClockBlock.makeComposition()

const init = TooltipGroupClockComposition.makeInit(() => ({ model: { pending: Option.none() } }))

const inMessageUpdate = TooltipGroupClockComposition.makeInMessageUpdate({
  RequestedSchedule: (model, { delay, generation }) => ({
    model: modifyFields(model, {
      pending: () => Option.some({ delay, generation }),
    }),
  }),
  RequestedCancel: (model) => ({ model: modifyFields(model, { pending: () => Option.none() }) }),
})

const update = TooltipGroupClockComposition.makeUpdate({
  Completed: (model, { generation }) =>
    Option.exists(model.pending, (pending) => pending.generation === generation)
      ? Update.withOutMessage(
          { model: modifyFields(model, { pending: () => Option.none() }) },
          OutMessage.Elapsed({ generation }),
        )
      : { model },
})

export const layer = TooltipGroupClockBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  subscriptions,
  EffectsLayer: subscriptions.layer,
})
