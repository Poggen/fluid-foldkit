/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { ScrollAreaBlock } from './scroll-area.js'
import { HoverBlock, HoverMode } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import { observeCommandMenu } from './command-menu-dom.js'
import { CommandMenuItem, CommandMenuConfig } from './command-menu-contracts.js'
import type { CommandMenuViewInputs } from './command-menu-contracts.js'

import { CommandResultsBlock } from './command-menu-virtual.js'

const Model = Schema.Struct({
  id: Schema.String,
  virtualized: Schema.Boolean,
  virtualLists: Schema.Record(Schema.String, CommandResultsBlock.Model),
  items: Schema.Array(CommandMenuItem),
  query: Schema.String,
  defaultQuery: Schema.String,
  controlled: Schema.Boolean,
  suggestions: Schema.Array(Schema.String),
  suggestionsLabel: Schema.String,
  activeIndex: Schema.OptionFromNullOr(Schema.Int),
  height: Schema.OptionFromNullOr(Schema.Finite),
  mac: Schema.Boolean,
  scroll: ScrollAreaBlock.Model,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
})

const Message = defineMessageUnion({
  RequestedQuery: { query: Schema.String },
  RequestedMove: { direction: Schema.Literals(['next', 'previous', 'first', 'last']) },
  RequestedSelect: { value: Schema.String },
  Entered: {},
  ObservedHeight: { height: Schema.Finite },
  ObservedPlatform: { mac: Schema.Boolean },
})

const OutMessage = defineMessageUnion({
  Selected: { item: CommandMenuItem },
  QueryChanged: { query: Schema.String },
})

const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedRetire: {},
  RequestedConfigure: {
    items: Schema.Array(CommandMenuItem),
    query: Schema.OptionFromNullOr(Schema.String),
  },
})

const effects = Block.makeEffectsContract()

export const CommandMenuNamespace = Block.makeNamespace('CommandMenu')

export const Observe = CommandMenuNamespace.makeMountStream('ObserveCommandMenu', {
  messages: [
    Message.ObservedHeight,
    Message.ObservedPlatform,
    Message.RequestedMove,
    Message.Entered,
    Message.RequestedQuery,
  ],
})

export const ObserveLayer = Observe.toLayer(
  Effect.succeed(({ element, viewStateChanges }) =>
    viewStateChanges.pipe(
      Stream.switchMap((state) =>
        state === 'Live'
          ? Stream.callback<
              | typeof Message.ObservedHeight.Type
              | typeof Message.ObservedPlatform.Type
              | typeof Message.RequestedMove.Type
              | typeof Message.Entered.Type
              | typeof Message.RequestedQuery.Type
            >((queue) =>
              Effect.acquireRelease(
                Effect.sync(() =>
                  observeCommandMenu(element, {
                    platform: (mac) => {
                      Queue.offerUnsafe(queue, Message.ObservedPlatform({ mac }))
                    },
                    height: (height) => {
                      Queue.offerUnsafe(queue, Message.ObservedHeight({ height }))
                    },
                    move: (direction) => {
                      Queue.offerUnsafe(queue, Message.RequestedMove({ direction }))
                    },
                    enter: () => {
                      Queue.offerUnsafe(queue, Message.Entered())
                    },
                    query: (query) => {
                      Queue.offerUnsafe(queue, Message.RequestedQuery({ query }))
                    },
                  }),
                ),
                (release) => Effect.sync(release),
              ),
            )
          : Stream.never,
      ),
    ),
  ),
)

export const commandMenuContract = {
  Model,
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([CommandMenuConfig]),
  ChildInitContext: CommandMenuConfig,
  view: { kind: 'Element', Inputs: Block.makeInputContract<CommandMenuViewInputs>() } satisfies {
    readonly kind: 'Element'
    readonly Inputs: unknown
  },
  effects,
}
