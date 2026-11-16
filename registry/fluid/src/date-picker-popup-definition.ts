import { Effect, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { PopupViewInputs } from './date-picker-popup.js'
import type { PopupAuthority } from './date-picker-popup-authority.js'
import { exitFallbackMs, spring } from './lib/springs.js'

export const PopupConfig = Schema.Struct({
  id: Schema.String,
  anchorId: Schema.String,

  kind: Schema.Literals(['trigger', 'anchor']),
  align: Schema.Literals(['start', 'center', 'end']),
})

export type PopupConfig = typeof PopupConfig.Type

export const OpeningInteraction = Schema.NullOr(
  Schema.Literals(['mouse', 'touch', 'pen', 'keyboard']),
)

export const Model = Schema.Struct({
  config: PopupConfig,
  open: Schema.Boolean,
  retained: Schema.Boolean,
  openingInteraction: OpeningInteraction,
  escapeBlocked: Schema.Boolean,
  generation: Schema.Int,
})

export const Message = defineMessageUnion({
  DismissRequested: { reason: Schema.Literals(['escape', 'pointer', 'focus', 'anchor']) },
  ExitFinished: { generation: Schema.Int },
  Disposed: {},
})

export const OutMessage = defineMessageUnion({
  DismissRequested: { reason: Schema.Literals(['escape', 'pointer', 'focus', 'anchor']) },
  Released: {},
})

export const InMessage = defineInMessageUnion({
  RequestedConfigure: { config: PopupConfig },
  RequestedOpeningInteraction: { interaction: OpeningInteraction },
  RequestedVisibility: { open: Schema.Boolean, escapeBlocked: Schema.Boolean },
  RequestedReset: {},
})

export const PopupKey = Symbol('Popup')

export const PopupBlock = Block.make('Popup', {
  key: PopupKey,
  InitArgs: Schema.Tuple([PopupConfig, Schema.Boolean, Schema.Boolean]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<PopupViewInputs>() },
  effects: Block.makeEffectsContract<never, PopupAuthority>(),
})

export const subscriptions = PopupBlock.makeSubscriptions((entry) => ({
  exitFallback: entry(
    'ExitFallback',
    { generation: Schema.Int },
    {
      messages: [Message.ExitFinished],
      when: (model) => model.retained && !model.open,
      modelToDependencies: (model) => ({ generation: model.generation }),
      *handler() {
        return ({ generation }) =>
          Stream.fromEffect(
            Effect.sleep(exitFallbackMs(spring.fast)).pipe(
              Effect.as(Message.ExitFinished({ generation })),
            ),
          )
      },
    },
  ),
}))
