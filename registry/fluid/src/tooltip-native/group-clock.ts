import { Effect, Option, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { TooltipDom } from './resources.js'

const Pending = Schema.Struct({ generation: Schema.Natural, delay: Schema.Number })

const Model = Schema.Struct({
  morph: Schema.Boolean,
  pending: Schema.Option(Pending),
  hold: Schema.Option(Schema.Natural),
})

const Message = defineMessageUnion({
  Completed: { generation: Schema.Natural },
  CompletedHold: { generation: Schema.Natural },
  ViewportChanged: {},
})

const OutMessage = defineMessageUnion({
  Elapsed: { generation: Schema.Natural },
  HoldElapsed: { generation: Schema.Natural },
  ViewportChanged: {},
})

export const InMessage = defineInMessageUnion({
  RequestedSchedule: Pending.fields,
  RequestedCancel: {},
  RequestedHold: { generation: Schema.Option(Schema.Natural) },
  RequestedPresentation: { morph: Schema.Boolean },
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
  viewport: entry(
    'Viewport',
    {},
    {
      messages: [Message.ViewportChanged],
      when: (model) => model.morph,
      modelToDependencies: () => ({}),
      *handler() {
        const dom = yield* TooltipDom
        return () => dom.observeViewport().pipe(Stream.map(() => Message.ViewportChanged()))
      },
    },
  ),
  hold: entry(
    'Hold',
    { generation: Schema.Option(Schema.Natural) },
    {
      messages: [Message.CompletedHold],
      when: (model) => Option.isSome(model.hold),
      modelToDependencies: (model) => ({ generation: model.hold }),
      *handler() {
        const dom = yield* TooltipDom
        return ({ generation }) =>
          Option.match(generation, {
            onNone: () => Stream.empty,
            onSome: (value) =>
              Stream.fromEffect(
                dom.wait(150).pipe(Effect.as(Message.CompletedHold({ generation: value }))),
              ),
          })
      },
    },
  ),
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

const init = TooltipGroupClockComposition.makeInit(() => ({
  model: { morph: false, pending: Option.none(), hold: Option.none() },
}))

const inMessageUpdate = TooltipGroupClockComposition.makeInMessageUpdate({
  RequestedPresentation: (model, { morph }) => ({
    model: modifyFields(model, { morph: () => morph }),
  }),
  RequestedHold: (model, { generation }) => ({
    model: modifyFields(model, { hold: () => generation }),
  }),
  RequestedSchedule: (model, { delay, generation }) => ({
    model: modifyFields(model, {
      pending: () => Option.some({ delay, generation }),
    }),
  }),
  RequestedCancel: (model) => ({ model: modifyFields(model, { pending: () => Option.none() }) }),
})

const update = TooltipGroupClockComposition.makeUpdate({
  ViewportChanged: (model) => Update.withOutMessage({ model }, OutMessage.ViewportChanged()),
  CompletedHold: (model, { generation }) =>
    Option.contains(model.hold, generation)
      ? Update.withOutMessage(
          { model: modifyFields(model, { hold: () => Option.none() }) },
          OutMessage.HoldElapsed({ generation }),
        )
      : { model },
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
