import { Effect, Match, Option, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { BaseGrace } from './base-grace.js'
import type { InteractionViewInputs } from './interaction-view.js'
import { InteractionContext, Side } from './domain.js'
import { TransferGeometry } from './group-visual.js'
import { Observation as Message } from './observation.js'
import { exitFallbackMs, spring } from '../lib/springs.js'
import { TooltipDom } from './resources.js'

const Pending = Schema.Struct({ generation: Schema.Natural, delay: Schema.Number })

export const Model = Schema.Struct({
  id: Schema.String,
  entered: Schema.Boolean,
  nestedHover: Schema.Boolean,
  domReady: Schema.Boolean,
  blockedFocus: Schema.Boolean,
  closingFromHover: Schema.Boolean,
  generation: Schema.Natural,
  pending: Schema.Option(Pending),
  baseGrace: Schema.Option(BaseGrace),
  graceWait: Schema.Option(Schema.Natural),
  exitWait: Schema.Option(Schema.Natural),
})

export const OutMessage = defineMessageUnion({
  MeasuredTransfer: {
    generation: Schema.Natural,
    connected: Schema.Boolean,
    fromSide: Side,
    toSide: Side,
    geometry: TransferGeometry,
  },
  PlacedGroup: { generation: Schema.Natural, side: Side },
  CompletedTransfer: { generation: Schema.Natural },
  TriggerMounted: {},
  TriggerUnmounted: {},
  RequestedVisibility: { next: Schema.Boolean, reason: Schema.String },
  CompletedExit: { generation: Schema.Natural },
})

export const InMessage = defineInMessageUnion({
  RequestedCancelGraceWait: {},
  RequestedCancelWait: {},
  RequestedExitWait: { generation: Schema.Option(Schema.Natural) },
})

export const TooltipInteractionKey = Symbol('TooltipInteraction')

export const TooltipInteractionBlock = Block.make('TooltipInteraction', {
  key: TooltipInteractionKey,
  InitArgs: Schema.Tuple([Schema.Struct({ id: Schema.String })]),
  Context: Schema.Tuple([InteractionContext]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<InteractionViewInputs>() },
  effects: Block.makeEffectsContract<never, TooltipDom>(),
})

export const ObserveTrigger = TooltipInteractionBlock.makeMountStream('ObserveTrigger', {
  args: { id: Schema.String },
  messages: [
    Message.Mounted,
    Message.NestedHover,
    Message.Entered,
    Message.Moved,
    Message.Left,
    Message.Focused,
    Message.BlurStarted,
    Message.Blurred,
    Message.Pressed,
    Message.Clicked,
    Message.Escaped,
    Message.StartedBaseGrace,
    Message.MovedInBaseGrace,
    Message.WindowBlurred,
  ],
  *handler() {
    return (yield* TooltipDom).observeTrigger
  },
})

export const PopupResource = defineTaggedUnion({
  Portal: {},
  Content: { id: Schema.String },
})

export const ObservePopup = TooltipInteractionBlock.makeMountStream('ObservePopup', {
  args: { resource: PopupResource },
  messages: [
    Message.CompletedAnimation,
    Message.MeasuredTransfer,
    Message.PlacedGroup,
    Message.CompletedTransfer,
    Message.StartedBaseGrace,
    Message.MovedInBaseGrace,
    Message.Dismissed,
    Message.Escaped,
  ],
  *handler() {
    const dom = yield* TooltipDom

    return ({ element, viewStateChanges, resource }) =>
      Match.value(resource).pipe(
        Match.tag('Portal', () => dom.portal({ element, viewStateChanges })),
        Match.tag('Content', ({ id }) => dom.observePopup({ element, viewStateChanges, id })),
        Match.exhaustive,
      )
  },
})

export const subscriptions = TooltipInteractionBlock.makeSubscriptions((entry) => ({
  exitWait: entry(
    'ExitWait',
    { generation: Schema.Option(Schema.Natural) },
    {
      messages: [Message.CompletedExit],
      when: (model) => Option.isSome(model.exitWait),
      modelToDependencies: (model) => ({ generation: model.exitWait }),
      *handler() {
        const dom = yield* TooltipDom

        return ({ generation }) =>
          Option.match(generation, {
            onNone: () => Stream.empty,
            onSome: (value) =>
              Stream.fromEffect(
                dom
                  .wait(exitFallbackMs(spring.fast))
                  .pipe(Effect.as(Message.CompletedExit({ generation: value }))),
              ),
          })
      },
    },
  ),
  graceWait: entry(
    'BaseGraceWait',
    { id: Schema.String, generation: Schema.Option(Schema.Natural) },
    {
      messages: [Message.CompletedBaseGraceWait],
      when: (model) => Option.isSome(model.graceWait),
      modelToDependencies: (model) => ({ id: model.id, generation: model.graceWait }),
      *handler() {
        const dom = yield* TooltipDom

        return ({ id, generation }) =>
          Option.match(generation, {
            onNone: () => Stream.empty,
            onSome: (value) =>
              Stream.fromEffect(
                dom.wait(40).pipe(
                  Effect.andThen(dom.hasOpenChild(id)),
                  Effect.map((hasOpenChild) =>
                    Message.CompletedBaseGraceWait({ generation: value, hasOpenChild }),
                  ),
                ),
              ),
          })
      },
    },
  ),
  wait: entry(
    'HoverWait',
    { pending: Schema.Option(Pending) },
    {
      messages: [Message.CompletedWait],
      when: (model) => Option.isSome(model.pending),
      modelToDependencies: (model) => ({ pending: model.pending }),
      *handler() {
        const dom = yield* TooltipDom

        return ({ pending }) =>
          Option.match(pending, {
            onNone: () => Stream.empty,
            onSome: ({ delay, generation }) =>
              Stream.fromEffect(
                dom.wait(delay).pipe(Effect.as(Message.CompletedWait({ generation }))),
              ),
          })
      },
    },
  ),
}))

export const TooltipInteractionComposition = TooltipInteractionBlock.makeComposition({
  mounts: [ObserveTrigger, ObservePopup],
})
