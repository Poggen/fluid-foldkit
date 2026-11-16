import { PreviewControlsBlock } from '../../../../components/docs/preview-controls'
import { documentationFields, documentationInMessages } from './documentation.js'
import { Clock, Effect, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { ThinkingStepsBlock, ThinkingStepDetailsBlock } from '@foldkit-visuals/fluid/thinking-steps'
import { ThinkingStepBlock } from '@foldkit-visuals/fluid/thinking-step'
import { demos } from './thinking-example-data.js'

export const Playback = Schema.Literals(['paused', 'playing', 'finished'])

export const Action = Schema.Literals(['toggle', 'enter', 'leave'])

export const Message = defineMessageUnion({
  ClickedToggle: {},
  UpdatedVisibility: { ratio: Schema.Number },
  CompletedReadPlaybackTime: { action: Action, now: Schema.Number, generation: Schema.Natural },
  CompletedWaitBeforeThinkingStep: {
    generation: Schema.Natural,
    epoch: Schema.Natural,
    now: Schema.Number,
  },
  CompletedWaitBeforeThinkingCharacters: { generation: Schema.Natural, index: Schema.Natural },
  Interrupted: {},
})

export const Model = Schema.Struct({
  ...documentationFields,
  documentationTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  id: Schema.String,
  generation: Schema.Natural,
  fired: Schema.Natural,
  epoch: Schema.Natural,
  playback: Playback,
  isManuallyPaused: Schema.Boolean,
  elapsed: Schema.Number,
  started: Schema.Number,
  characters: Schema.Natural,
  roots: Schema.Record(Schema.String, ThinkingStepsBlock.Model),
  rows: Schema.Record(Schema.String, ThinkingStepBlock.Model),
  details: Schema.Record(Schema.String, ThinkingStepDetailsBlock.Model),
})

export type Model = typeof Model.Type

export const ThinkingDemoKey = Symbol('ThinkingDemo')

const effects = Block.makeEffectsContract()

export const ThinkingDemoBlock = Block.make('ThinkingDemo', {
  key: ThinkingDemoKey,
  Model,
  Message,
  InMessage: defineInMessageUnion(documentationInMessages),
  InitArgs: Schema.Tuple([Schema.String]),
  effects,
  view: { kind: 'Element' },
})

export const getDemo = (id: string) => {
  const demo = demos.find((candidate) => candidate.id === id)

  if (demo === undefined) {
    throw new Error(`Unknown authored Thinking demo: ${id}`)
  }

  return demo
}

export const occurrence = (model: Pick<Model, 'id' | 'generation'>) =>
  `${model.id}-${model.generation}`

export const ReadPlaybackTime = ThinkingDemoBlock.makeCommand('ReadPlaybackTime', {
  args: { action: Action, generation: Schema.Natural },
  messages: [Message.CompletedReadPlaybackTime],
  *handler() {
    return ({ action, generation }) =>
      Clock.currentTimeMillis.pipe(
        Effect.map((now) => Message.CompletedReadPlaybackTime({ action, generation, now })),
      )
  },
})

export const WaitBeforeThinkingStep = ThinkingDemoBlock.makeCommand('WaitBeforeThinkingStep', {
  args: { generation: Schema.Natural, epoch: Schema.Natural, delay: Schema.Number },
  messages: [Message.CompletedWaitBeforeThinkingStep],
  interrupt: { keyFields: ['generation'], toKey: ({ generation }) => String(generation) },
  *handler() {
    return ({ generation, epoch, delay }) =>
      Effect.sleep(Math.max(0, delay)).pipe(
        Effect.andThen(Clock.currentTimeMillis),
        Effect.map((now) => Message.CompletedWaitBeforeThinkingStep({ generation, epoch, now })),
      )
  },
})

export const WaitBeforeThinkingCharacters = ThinkingDemoBlock.makeCommand(
  'WaitBeforeThinkingCharacters',
  {
    args: { generation: Schema.Natural, index: Schema.Natural },
    messages: [Message.CompletedWaitBeforeThinkingCharacters],
    interrupt: { keyFields: ['generation'], toKey: ({ generation }) => String(generation) },
    *handler() {
      return ({ generation, index }) =>
        Effect.sleep('16 millis').pipe(
          Effect.as(Message.CompletedWaitBeforeThinkingCharacters({ generation, index })),
        )
    },
  },
)

export const ObserveThinkingVisibility = ThinkingDemoBlock.makeMountStream(
  'ObserveThinkingVisibility',
  {
    messages: [Message.UpdatedVisibility],
    *handler() {
      return ({ element, viewStateChanges }) =>
        viewStateChanges.pipe(
          Stream.switchMap((state) =>
            state === 'Live'
              ? Stream.callback<typeof Message.UpdatedVisibility.Type>((queue) =>
                  Effect.acquireRelease(
                    Effect.sync(() => {
                      const observer = new IntersectionObserver(
                        (entries) => {
                          for (const entry of entries) {
                            Queue.offerUnsafe(
                              queue,
                              Message.UpdatedVisibility({ ratio: entry.intersectionRatio }),
                            )
                          }
                        },
                        { threshold: [0.1, 0.5] },
                      )

                      observer.observe(element)

                      return observer
                    }),
                    (observer) =>
                      Effect.sync(() => {
                        observer.disconnect()
                      }),
                  ).pipe(Effect.andThen(Effect.never)),
                )
              : Stream.never,
          ),
        )
    },
  },
)
