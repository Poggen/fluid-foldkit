import { fontWeights } from './lib/font-weight.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import { modifyFields } from 'foldkit/struct'
import { Data, Effect, Option, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import type { SizeVariant } from './lib/size.js'
import { typeClass } from './lib/type-scale.js'
import { cn } from './lib/utils.js'
import { EXIT_COMPLETE_EVENT } from './motion-target.js'
import type { TargetMotionScope } from './motion-target.js'

const circleA =
  'M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z'

const infinity =
  'M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z'

const circleB =
  'M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z'

const Word = Schema.Literals(['Thinking', 'Moonwalking', 'Planning', 'Refining'])

const nextWord: Record<typeof Word.Type, typeof Word.Type> = {
  Thinking: 'Moonwalking',
  Moonwalking: 'Planning',
  Planning: 'Refining',
  Refining: 'Thinking',
}

const Slot = Schema.Struct({ word: Word, present: Schema.Boolean, initial: Schema.Boolean })

const Model = Schema.Struct({
  id: Schema.String,
  word: Word,
  reduceMotion: Schema.Boolean,
  slots: Schema.Array(Slot),
})

const Message = defineMessageUnion({
  Advanced: {},
  ObservedReducedMotion: { value: Schema.Boolean },
  CompletedExit: { word: Word },
  Unmounted: {},
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

export const ThinkingIndicatorKey = Symbol('FluidThinkingIndicator')

const effects = Block.makeEffectsContract()

export const ThinkingIndicatorBlock = Block.make('ThinkingIndicator', {
  key: ThinkingIndicatorKey,
  InitArgs: Schema.Tuple([Schema.Struct({ id: Schema.String, reduceMotion: Schema.Boolean })]),
  effects,
  Model,
  Message,
  view: { kind: 'Element', Inputs: Block.makeInputContract<ThinkingIndicatorViewInputs>() },
})

const ObserveThinking = ThinkingIndicatorBlock.makeMountStream('ObserveThinking', {
  messages: [Message.Advanced, Message.ObservedReducedMotion],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<
                typeof Message.Advanced.Type | typeof Message.ObservedReducedMotion.Type
              >((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const window = element.ownerDocument.defaultView

                    if (window === null) {
                      throw new Error('Thinking indicator requires a live document')
                    }

                    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
                    let interval: number | undefined

                    const synchronize = () => {
                      if (interval !== undefined) {
                        window.clearInterval(interval)
                      }

                      interval = undefined
                      Queue.offerUnsafe(
                        queue,
                        Message.ObservedReducedMotion({ value: query.matches }),
                      )

                      if (!query.matches) {
                        interval = window.setInterval(() => {
                          Queue.offerUnsafe(queue, Message.Advanced())
                        }, 4000)
                      }
                    }

                    query.addEventListener('change', synchronize)
                    synchronize()

                    return () => {
                      if (interval !== undefined) {
                        window.clearInterval(interval)
                      }

                      query.removeEventListener('change', synchronize)
                    }
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})

const ThinkingIndicatorComposition = ThinkingIndicatorBlock.makeComposition({
  mounts: [ObserveThinking],
})

const init = ThinkingIndicatorComposition.makeInit(
  (config: { readonly id: string; readonly reduceMotion: boolean }) => ({
    model: Model.make({
      id: config.id,
      word: 'Thinking',
      reduceMotion: config.reduceMotion,
      slots: [{ word: 'Thinking', present: true, initial: false }],
    }),
  }),
)

const update = ThinkingIndicatorComposition.makeUpdate({
  Advanced: (model) => {
    if (model.reduceMotion) {
      return { model }
    }

    const word = nextWord[model.word]

    return {
      model: modifyFields(model, {
        word: () => word,
        slots: (currentSlots) => [
          ...currentSlots
            .filter((slot) => slot.word !== word)
            .map((slot) => modifyFields(slot, { present: () => false })),
          { word, present: true, initial: true },
        ],
      }),
    }
  },
  ObservedReducedMotion: (model, { value }) => {
    const restored = model.reduceMotion
      ? [{ word: model.word, present: true, initial: false }]
      : model.slots

    return {
      model: modifyFields(model, {
        reduceMotion: () => value,
        slots: () => (value ? [] : restored),
      }),
    }
  },
  CompletedExit: (model, { word }) => ({
    model: modifyFields(model, {
      slots: (currentSlots) => currentSlots.filter((slot) => slot.word !== word || slot.present),
    }),
  }),
  Unmounted: (model) => ({
    model: modifyFields(model, {
      word: () => 'Thinking',
      slots: () => [{ word: 'Thinking', present: true, initial: false }],
    }),
  }),
})

export interface ThinkingIndicatorViewInputs {
  readonly labelAnimation: (node: Html, present: boolean, initial: boolean) => Html
  readonly glyphAnimation: (node: Html) => Html
  readonly showIcon?: boolean
  readonly size?: SizeVariant
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const view = ThinkingIndicatorComposition.makeView.withInputs<ThinkingIndicatorViewInputs>(
  (model, inputs, h) => {
    const compact = inputs.size === 'compact'

    return h.div(
      [
        h.Id(model.id),
        h.Role('status'),
        h.Class(cn('flex items-center gap-2 px-3 py-2', inputs.className)),
        h.OnMount(ObserveThinking()),
        h.OnUnmount(Message.Unmounted()),
        ...(inputs.attributes ?? []),
      ],
      [
        h.span([h.Class('sr-only')], ['Thinking…']),
        inputs.showIcon === false
          ? h.empty
          : h.svg(
              [
                h.AriaHidden(true),
                h.Width(compact ? '18' : '20'),
                h.Height(compact ? '18' : '20'),
                h.ViewBox('0 0 24 24'),
                h.Fill('none'),
                h.Stroke('currentColor'),
                h.StrokeWidth('1.5'),
                h.StrokeLinecap('round'),
                h.StrokeLinejoin('round'),
                h.Class('text-muted-foreground shrink-0'),
              ],
              [
                model.reduceMotion
                  ? h.keyed('path')('static', [h.D(infinity)])
                  : inputs.glyphAnimation(h.keyed('path')('morph', [h.D(circleA)])),
              ],
            ),
        h.span(
          [
            h.Class(
              cn('inline-grid overflow-hidden', typeClass('body', compact ? 'compact' : 'default')),
            ),
            h.AriaHidden(true),
            h.Style({ fontVariationSettings: fontWeights.normal }),
          ],
          [
            h.span([h.Class('col-start-1 row-start-1 invisible shimmer-text')], ['Moonwalking']),
            ...(model.reduceMotion
              ? [h.span([h.Class('col-start-1 row-start-1 shimmer-text')], ['Thinking'])]
              : model.slots.map((slot) => {
                  const completed = Events.OnCustomEvent({
                    name: EXIT_COMPLETE_EVENT,
                    f: () => Option.some(Message.CompletedExit({ word: slot.word })),
                  })

                  return inputs.labelAnimation(
                    h.keyed('span')(
                      slot.word,
                      [h.Class('col-start-1 row-start-1 shimmer-text'), completed],
                      [slot.word],
                    ),
                    slot.present,
                    slot.initial,
                  )
                })),
          ],
        ),
      ],
    )
  },
)

export const layer = ThinkingIndicatorBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: ObserveThinking.layer,
})

export const thinkingIndicatorAnimations = (
  motion: TargetMotionScope,
): Pick<ThinkingIndicatorViewInputs, 'labelAnimation' | 'glyphAnimation'> => ({
  labelAnimation: (node, present, initial) =>
    motion.node(node, {
      initial: initial ? { y: '80%', opacity: 0 } : false,
      animate: { y: 0, opacity: 1, transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } },
      exit: { y: '-80%', opacity: 0, transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] } },
      present,
    }),
  glyphAnimation: (node) =>
    motion.node(node, {
      initial: { d: circleA },
      animate: { d: [circleA, infinity, circleB, infinity, circleA] },
      transition: {
        d: { duration: 6, ease: 'easeInOut', repeat: Infinity, times: [0, 0.25, 0.5, 0.75, 1] },
      },
    }),
})
