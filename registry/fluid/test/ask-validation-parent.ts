import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { AskUserQuestionsEnvironment } from '../src/ask-user-questions.js'
import { AskUserQuestionsBlock, layer as AskLayer } from '../src/ask-user-questions.js'
import { AskEvent } from '../src/ask-user-questions-state.js'

const Model = Schema.Struct({ ask: AskUserQuestionsBlock.Model, events: Schema.Array(AskEvent) })

const Message = defineMessageUnion({ Short: {}, Long: {}, Draft: {}, Submit: {} })

const AskValidationKey = Symbol('AskValidation')

const effects = Block.makeEffectsContract<never, AskUserQuestionsEnvironment>()

export const AskValidationBlock = Block.make('AskValidation', {
  key: AskValidationKey,
  Model,
  Message,
  effects,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const Ask = AskValidationBlock.makeRequiredFieldBinding(AskUserQuestionsBlock, {
  field: 'ask',
  init: {
    contextToArgs: () => [
      { id: 'ask', questions: [{ id: 'text', title: 'Name', freeText: true }] },
    ],
  },
}).withOutMessagePolicy({
  fold: AskValidationBlock.makeOutMessageFold(AskUserQuestionsBlock, {
    Events: ({ events }) =>
      AskValidationBlock.makeFieldsStep(() => ({ events: (previous) => [...previous, ...events] })),
  }),
})

const Composition = AskValidationBlock.makeComposition({ bindings: [Ask] })

const init = Composition.makeInit(() => ({ model: { events: [] }, childInitContext: undefined }))

const update = Composition.makeUpdate({
  Short: Ask.requestText({ value: ' ab ' }),
  Long: Ask.requestText({ value: ' enough ' }),
  Draft: Ask.requestText({ value: 'Preserved draft' }),
  Submit: Ask.requestSubmit(),
})

const view = Composition.makeView((_model, h) =>
  h.div(
    [],
    [
      h.button([h.Id('ask-short'), h.OnClick(Message.Short())], ['Short']),
      h.button([h.Id('ask-long'), h.OnClick(Message.Long())], ['Long']),
      h.button([h.Id('ask-draft'), h.OnClick(Message.Draft())], ['Draft']),
      h.button([h.Id('ask-submit'), h.OnClick(Message.Submit())], ['Submit']),
      h.pre(
        [h.Id('ask-snapshot')],
        [Schema.encodeSync(Schema.fromJsonString(Schema.toCodecJson(Model)))(_model)],
      ),
    ],
  ),
)

const implementation = { init, update, view }

export const AskValidationLayer = AskValidationBlock.makeLayer<typeof implementation>(
  implementation,
).pipe(Layer.provide(AskLayer))
