// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it as test } from '@effect/vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect } from 'vitest'
import {
  AskUserQuestionsBlock as Ask,
  AskUserQuestionsEnvironment,
  createAskUserQuestionsLayer,
  layer as AskLayer,
} from '../src/ask-user-questions.js'
import { hoverHighlightAnimation } from '../src/hover-highlight.js'
import { createMotionScope } from '../src/motion.js'
import { createPresentationContext } from '../src/presentation.js'
import { selectionBackgroundAnimation } from '../src/selection-backgrounds.js'

const Message = defineMessageUnion({ ClickedToggle: {} })
const Model = Schema.Struct({ ask: Ask.Model, visible: Schema.Boolean })
const AskLifecycleKey = Symbol('AskLifecycle')
const Root = Block.make('AskLifecycle', {
  key: AskLifecycleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  effects: Block.makeEffectsContract<never, AskUserQuestionsEnvironment>(),
  view: { kind: 'Element' },
})
const AskBinding = Root.makeRequiredFieldBinding(Ask, {
  field: 'ask',
  init: {
    contextToArgs: () => [
      {
        id: 'ask-lifecycle',
        questions: [{ id: 'text', title: 'Your goal', freeText: true }],
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(Ask, { Events: Root.makeNoopStep }),
})
const Composition = Root.makeComposition({ bindings: [AskBinding] })
const codec = Schema.fromJsonString(Schema.toCodecJson(Model))
const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('10 millis') }))

test.live(
  'Ask DOM removal releases observation and invalidates its retained draft generation',
  () =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
          if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
            throw new Error('Ask lifecycle test requires scoped WAAPI capability removal')
          }
          return descriptor
        }),
        (descriptor) =>
          Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
      )
      const environment = yield* AskUserQuestionsEnvironment
      const motion = createMotionScope('ask-lifecycle')
      const layer = Root.makeLayer({
        init: Composition.makeInit(() => ({ model: { visible: true } })),
        update: Composition.makeUpdate({
          ClickedToggle: (model) => ({ model: { ...model, visible: !model.visible } }),
        }),
        view: Composition.makeView((model, h) =>
          h.div(
            [],
            [
              h.button([h.Id('toggle-ask'), h.OnClick(Message.ClickedToggle())], ['Toggle']),
              h.pre([h.Id('ask-state')], [Schema.encodeSync(codec)(model)]),
              model.visible
                ? h.block(
                    AskBinding.embedView({
                      slotId: model.ask.id,
                      model: model.ask,
                      viewInputs: {
                        animate: motion.node,
                        animateHighlight: hoverHighlightAnimation(motion),
                        animateSelection: selectionBackgroundAnimation(motion),
                        context: createPresentationContext({ reducedMotion: 'always' }),
                      },
                    }),
                  )
                : null,
            ],
          ),
        ),
      }).pipe(Layer.provide(AskLayer))
      const host = document.createElement('div')
      const container = document.createElement('div')
      container.id = 'ask-lifecycle-root'
      host.append(container)
      document.body.append(host)
      const program = Runtime.embed(
        Program.makeElement({ block: Root, layer, container }).provide(
          Layer.merge(motion.layer, Layer.succeed(AskUserQuestionsEnvironment, environment)),
        ),
      )
      const snapshot = () =>
        Schema.decodeSync(codec)(host.querySelector('#ask-state')?.textContent ?? '')
      const toggle = () => {
        const button = host.querySelector<HTMLButtonElement>('#toggle-ask')
        if (button === null) throw new Error('Missing Ask toggle')
        button.click()
      }
      try {
        yield* eventually(() => expect(environment.instances.size).toBe(1))
        const original = host.querySelector<HTMLTextAreaElement>('textarea')
        if (original === null) throw new Error('Missing Ask textarea')
        original.value = 'Retained draft'
        original.dispatchEvent(new Event('input', { bubbles: true }))
        yield* eventually(() =>
          expect(snapshot().ask.flow.answers.text?.otherText).toBe('Retained draft'),
        )
        const generation = snapshot().ask.flow.generation
        toggle()
        yield* eventually(() => {
          expect(host.querySelector('textarea')).toBeNull()
          expect(environment.instances.size).toBe(0)
          expect(snapshot().ask.flow.generation).toBe(generation + 1)
        })
        original.value = 'Detached edit'
        original.dispatchEvent(new Event('input', { bubbles: true }))
        toggle()
        yield* eventually(() => {
          expect(environment.instances.size).toBe(1)
          expect(host.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Retained draft')
          expect(snapshot().ask.flow.answers.text?.otherText).toBe('Retained draft')
        })
        expect(host.querySelector('textarea')).not.toBe(original)
      } finally {
        yield* Effect.promise(program.dispose)
        host.remove()
      }
      expect(environment.instances.size).toBe(0)
    }).pipe(
      Effect.scoped,
      Effect.provide(createAskUserQuestionsLayer({ document, platform: '', validators: {} })),
    ),
)
