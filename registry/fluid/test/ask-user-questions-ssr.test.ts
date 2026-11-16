import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Cause, Effect, Exit, Schema, Layer } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { renderToString } from 'foldkit/experimental/server'
import type { AskUserQuestionsEnvironment } from '../src/ask-user-questions.js'
import {
  AskUserQuestionsBlock as Ask,
  createAskUserQuestionsLayer,
  layer as AskLayer,
} from '../src/ask-user-questions.js'
import { createMotionScope } from '../src/motion.js'
import { hoverHighlightAnimation } from '../src/hover-highlight.js'
import { selectionBackgroundAnimation } from '../src/selection-backgrounds.js'

const questions = [
  { id: 'first', title: 'Initial question', options: [{ id: 'a', title: 'Alpha' }] },
  { id: 'text', title: 'Later question', freeText: true },
]

const Model = Schema.Struct({ ask: Ask.Model })

const Message = defineMessageUnion({ Noop: {} })

const AskServerKey = Symbol('AskServer')

const effects = Block.makeEffectsContract<never, AskUserQuestionsEnvironment>()

const AskServerBlock = Block.make('AskServer', {
  key: AskServerKey,
  Model,
  Message,
  effects,
  InitArgs: Schema.Tuple([Schema.Boolean]),
  view: { kind: 'Document' },
})

const AskBinding = AskServerBlock.makeRequiredFieldBinding(Ask, {
  field: 'ask',
  init: {
    contextToArgs: (progressed: boolean) => [
      {
        id: 'ask-reset-server',
        questions,
        defaultCurrentIndex: progressed ? 1 : 0,
        defaultAnswers: progressed
          ? { text: { questionId: 'text', selectedIds: [], otherText: 'Draft before removal' } }
          : {},
      },
    ],
  },
}).withOutMessagePolicy({
  fold: AskServerBlock.makeOutMessageFold(Ask, { Events: AskServerBlock.makeNoopStep }),
})

const Composition = AskServerBlock.makeComposition({ bindings: [AskBinding] })

const init = Composition.makeInit((progressed: boolean) => ({
  model: {},
  childInitContext: progressed,
}))

const update = Composition.makeUpdate({ Noop: AskServerBlock.makeNoopStep() })

const makeServerLayer = (motion: ReturnType<typeof createMotionScope>) => {
  const view = Composition.makeView((model, h) => ({
    title: 'Ask server snapshots',
    body: h.block(
      AskBinding.embedView({
        slotId: model.ask.id,
        model: model.ask,
        viewInputs: {
          animate: motion.node,
          animateHighlight: hoverHighlightAnimation(motion),
          animateSelection: selectionBackgroundAnimation(motion),
        },
      }),
    ),
  }))

  return AskServerBlock.makeLayer({ init, update, view }).pipe(Layer.provide(AskLayer))
}

test.effect(
  'Ask requires client rendering for initial choices and progressed free-text drafts',
  () =>
    Effect.gen(function* serverSnapshots() {
      for (const progressed of [false, true]) {
        const motion = createMotionScope('ask-reset-server')
        const layer = makeServerLayer(motion)

        const environment = Layer.merge(
          motion.layer,
          createAskUserQuestionsLayer({ document: undefined, platform: '', validators: {} }),
        )

        const result = yield* renderToString(
          { block: AskServerBlock, layer },
          { Flags: Schema.Boolean },
          { flags: progressed, isHydratable: false },
        ).pipe(Effect.provide(environment), Effect.exit)

        expect(Exit.isFailure(result)).toBe(true)

        if (Exit.isFailure(result)) {
          expect(Cause.squash(result.cause)).toMatchObject({
            cause: {
              message:
                '[foldkit] Block binding "selection" emitted before its occurrence was captured.',
            },
          })
        }
      }
    }),
)
