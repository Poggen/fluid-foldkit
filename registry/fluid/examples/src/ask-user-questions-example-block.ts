import { Button } from '@foldkit/ui'
import {
  exampleHoverConfig,
  examplePresentation,
  exampleSelectionRadius,
} from './example-presentation.js'
import { Layer, Predicate, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { AskUserQuestionsBlock, layer as AskLayer } from '@foldkit-visuals/fluid/ask-user-questions'
import type { AskUserQuestionsEnvironment } from '@foldkit-visuals/fluid/ask-user-questions'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'
import { questions } from './ask-user-questions-example-data.js'

const Model = Schema.Struct({
  ask: AskUserQuestionsBlock.Model,
  isCompleted: Schema.Boolean,
})

const Message = defineMessageUnion({ ClickedReplay: {} })

export const AskUserQuestionsExampleKey = Symbol('AskUserQuestionsExample')

const effects = Block.makeEffectsContract<never, AskUserQuestionsEnvironment>()

export const AskUserQuestionsExampleBlock = Block.make('AskUserQuestionsExample', {
  key: AskUserQuestionsExampleKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const Ask = AskUserQuestionsExampleBlock.makeRequiredFieldBinding(AskUserQuestionsBlock, {
  field: 'ask',
  init: {
    contextToArgs: () => [
      { ...exampleHoverConfig, id: 'ask', radius: exampleSelectionRadius, questions },
    ],
  },
}).withOutMessagePolicy({
  fold: AskUserQuestionsExampleBlock.makeOutMessageFold(AskUserQuestionsBlock, {
    Events: ({ events }) =>
      AskUserQuestionsExampleBlock.makeFieldsStep(() => ({
        isCompleted: (completed) => completed || events.some(Predicate.isTagged('Completed')),
      })),
  }),
})

const AskUserQuestionsExampleComposition = AskUserQuestionsExampleBlock.makeComposition({
  bindings: [Ask],
})

const init = AskUserQuestionsExampleComposition.makeInit(() => ({ model: { isCompleted: false } }))

const update = AskUserQuestionsExampleComposition.makeUpdate({
  ClickedReplay: Update.combineSteps([
    Ask.requestReset({ config: { questions } }),
    AskUserQuestionsExampleBlock.makeFieldsStep(() => ({ isCompleted: () => false })),
  ]),
})

const motion = createMotionScope('ask-user-questions-example')

const animateHighlight = hoverHighlightAnimation(motion)

const animateSelection = selectionBackgroundAnimation(motion)

const view = AskUserQuestionsExampleComposition.makeView((model, h) => ({
  title: 'AskUserQuestions',
  body: h.main(
    [
      h.Class(
        'w-full max-w-180 m-[0_auto] p-8 [color:var(--foreground)] [background:var(--background)] [&_header]:flex [&_header]:justify-between [&_header]:items-center [&_header]:mb-4 [&_h1]:m-0 [&_h1]:text-[20px] [&_h1]:leading-[28px] [&_h1]:font-semibold [&_header_button]:[border:1px_solid_var(--border)] [&_header_button]:rounded-[6px] [&_header_button]:p-[4px_8px] [&_header_button]:[font:inherit] [&_header_button]:cursor-pointer light',
      ),
      h.DataAttribute('completed', String(model.isCompleted)),
      h.DataAttribute('question-index', String(model.ask.flow.index)),
    ],
    [
      h.header(
        [],
        [
          h.h1([], ['Multiple questions']),
          Button.view(
            {
              onClick: Message.ClickedReplay(),
              type: 'button',
              toView: (attributes) => h.button([...attributes.button, h.Id('replay')], ['Replay']),
            },
            h,
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'flex items-end justify-center min-h-140 p-4 [@media_(min-width:_640px)]:p-[48px_32px]',
          ),
        ],
        [
          h.block(
            Ask.embedView({
              slotId: 'ask',
              model: model.ask,
              viewInputs: {
                animate: motion.node,
                animateHighlight,
                animateSelection,
                ...examplePresentation,
              },
            }),
          ),
        ],
      ),
      h.output(
        [h.Id('ask-state'), h.Class('sr-only')],
        [
          JSON.stringify({
            completed: model.isCompleted,
            index: model.ask.flow.index,
            answers: model.ask.flow.answers,
          }),
        ],
      ),
    ],
  ),
}))

export const AskUserQuestionsExampleLayer = AskUserQuestionsExampleBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(AskLayer))

export const AskUserQuestionsExampleMotionLayer = motion.layer
