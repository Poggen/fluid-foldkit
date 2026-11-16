import { ComponentPresentation } from '../settings'
import { Clock, Effect, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { MessageAssetsQuery } from './message-assets-query'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { InputMessageBlock } from '@foldkit-visuals/fluid/input-message'
import { ChatMessageBlock } from '@foldkit-visuals/fluid/chat-message'
import { QueuedStackBlock } from '@foldkit-visuals/fluid/queued-stack'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { ThinkingIndicatorBlock } from '@foldkit-visuals/fluid/thinking-indicator'
import { PreviewControlsBlock } from '../../../components/docs/preview-controls'
import { MessageAssets } from './message-assets'
export const Turn = Schema.Struct({
  key: Schema.String,
  section: Schema.String,
  text: Schema.String,
  seeded: Schema.Boolean,
  thinking: Schema.Boolean,
  queueId: Schema.NullOr(Schema.String),
})
export const Message = defineMessageUnion({
  Mounted: {},
  MeasuredComposer: { section: Schema.String, height: Schema.Finite },
  ClickedClear: { section: Schema.String },
  ClickedPlayback: {},
  CompletedDelay: { generation: Schema.Natural },
  CompletedReadPlaybackDeadline: { generation: Schema.Natural, due: Schema.Finite },
  CompletedReadRemainingPlaybackTime: { generation: Schema.Natural, remaining: Schema.Finite },
  CompletedWaitBeforeMorph: { generation: Schema.Natural },
})
const key = Symbol('AuthoredMessages')
export const AuthoredMessagesBlock = Block.make('AuthoredMessages', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    composers: Schema.Record(Schema.String, InputMessageBlock.Model),
    documentationTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
    chats: Schema.Record(Schema.String, ChatMessageBlock.Model),
    stack: QueuedStackBlock.Model,
    tooltips: DocumentTooltipBlock.Model,
    thinking: ThinkingIndicatorBlock.Model,
    turns: Schema.Array(Turn),
    sequence: Schema.Natural,
    assetsQuery: MessageAssetsQuery.Model,
    isPaused: Schema.Boolean,
    generation: Schema.Natural,
    remaining: Schema.Finite,
    due: Schema.Finite,
    reply: Schema.String,
    word: Schema.Natural,
    morphId: Schema.NullOr(Schema.String),
    revision: Schema.Natural,
  }),
  Message,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | MessageAssets
    | Block.FactsOf<typeof InputMessageBlock>['programRequirements']
    | Block.FactsOf<typeof ChatMessageBlock>['programRequirements']
    | Block.FactsOf<typeof QueuedStackBlock>['programRequirements']
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredMessagesBlock
export const Delay = Root.makeCommand('Delay', {
  args: { generation: Schema.Natural, delay: Schema.Finite },
  messages: [Root.Message.CompletedDelay],
  *handler() {
    return ({ generation, delay }) =>
      Effect.sleep(Math.max(0, delay)).pipe(Effect.as(Root.Message.CompletedDelay({ generation })))
  },
})
export const ReadPlaybackDeadline = Root.makeCommand('ReadPlaybackDeadline', {
  args: { generation: Schema.Natural, delay: Schema.Finite },
  messages: [Root.Message.CompletedReadPlaybackDeadline],
  *handler() {
    const clock = yield* Clock.Clock
    return ({ generation, delay }) =>
      Effect.sync(() =>
        Root.Message.CompletedReadPlaybackDeadline({
          generation,
          due: clock.currentTimeMillisUnsafe() + delay,
        }),
      )
  },
})
export const ReadRemainingPlaybackTime = Root.makeCommand('ReadRemainingPlaybackTime', {
  args: { generation: Schema.Natural, due: Schema.Finite },
  messages: [Root.Message.CompletedReadRemainingPlaybackTime],
  *handler() {
    const clock = yield* Clock.Clock
    return ({ generation, due }) =>
      Effect.sync(() =>
        Root.Message.CompletedReadRemainingPlaybackTime({
          generation,
          remaining: Math.max(0, due - clock.currentTimeMillisUnsafe()),
        }),
      )
  },
})
export const WaitBeforeMorph = Root.makeCommand('WaitBeforeMorph', {
  args: { generation: Schema.Natural },
  messages: [Root.Message.CompletedWaitBeforeMorph],
  *handler() {
    return ({ generation }) =>
      Effect.sleep('450 millis').pipe(
        Effect.as(Root.Message.CompletedWaitBeforeMorph({ generation })),
      )
  },
})

// The demo owns floating-composer layout; native widgets retain their interaction and motion owners.
export const ObserveTranscript = Root.makeMountStream('ObserveTranscript', {
  args: { section: Schema.String },
  messages: [Root.Message.Mounted, Root.Message.MeasuredComposer],
  *handler() {
    return ({ element, section, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live'
            ? Stream.never
            : Stream.callback<
                typeof Root.Message.Mounted.Type | typeof Root.Message.MeasuredComposer.Type
              >((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const composer = element.querySelector<HTMLElement>('[data-demo-composer]')
                    const scroll = element.querySelector<HTMLElement>('[data-demo-transcript]')
                    let previousHeight = 0
                    const measure = () => {
                      const height = composer?.offsetHeight ?? 0
                      if (height > 0 && height !== previousHeight) {
                        previousHeight = height
                        if (element instanceof HTMLElement)
                          element.style.setProperty('--composer-height', `${height}px`)
                        Queue.offerUnsafe(queue, Root.Message.MeasuredComposer({ section, height }))
                      }
                      if (scroll) scroll.scrollTop = scroll.scrollHeight
                    }
                    const resize = new ResizeObserver(measure)
                    if (composer) resize.observe(composer)
                    if (scroll?.firstElementChild) resize.observe(scroll.firstElementChild)
                    measure()
                    Queue.offerUnsafe(queue, Root.Message.Mounted())
                    return () => resize.disconnect()
                  }),
                  (release) => Effect.sync(release),
                ),
              ),
        ),
      )
  },
})
