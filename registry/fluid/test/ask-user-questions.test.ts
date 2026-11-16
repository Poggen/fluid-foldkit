import { SelectionBackgroundsBlock, test as selectionTest } from '../src/selection-backgrounds.js'
import { Validate } from '../src/ask-user-questions-block.js'
import { AskEvent } from '../src/ask-user-questions-state.js'
// @vitest-environment happy-dom
import { describe, expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Option, Schedule, Schema } from 'effect'
import { Program, Runtime, Story } from 'foldkit'
import { AskValidationBlock, AskValidationLayer } from './ask-validation-parent.js'
import { AskUserQuestionsEnvironment } from '../src/ask-user-questions-environment.js'
import {
  AskUserQuestionsBlock as Ask,
  createAskUserQuestionsLayer,
  layer as AskLayer,
} from '../src/ask-user-questions.js'

const synchronizeSelection = (count: number) =>
  Story.Command.resolveAllExact(
    ...Array.from(
      { length: count },
      () =>
        [
          selectionTest.SynchronizeClock({
            id: 'ask-selection',
            plan: { deadlines: [], nextFrame: [] },
          }),
          SelectionBackgroundsBlock.Message.CompletedClock(),
        ] as const,
    ),
  )

const subject = { block: Ask, layer: AskLayer }

const questions = [
  {
    title: 'Choose',
    options: [{ title: 'Alpha' }, { id: 'beta', title: 'Beta' }],
    allowOther: true,
  },
  {
    id: 'multi',
    title: 'Several',
    options: [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ],
    multiSelect: true,
  },
  { id: 'text', title: 'Explain', freeText: true },
]

const replay = (model: typeof Ask.Model.Type) =>
  Schema.decodeSync(Schema.fromJsonString(Schema.toCodecJson(Ask.Model)))(
    Schema.encodeSync(Schema.fromJsonString(Schema.toCodecJson(Ask.Model)))(model),
  )

describe('AskUserQuestions checked public Block', () => {
  test.effect(
    'single selection writes the keyed answer before index change, retaining other drafts',
    () =>
      Effect.gen(function* () {
        const draft = yield* Story.story(
          subject,
          Story.init({ id: 'ask', questions }),
          Story.inMessage(Ask.InMessage.RequestedText({ value: 'own idea' })),
          synchronizeSelection(1),
          Story.Command.expectNone(),
        )
        const answer = {
          questionId: 'q-0',
          selectedIds: ['beta'],
          otherText: 'own idea',
          skipped: false,
        }
        yield* Story.story(
          subject,
          Story.given(replay(draft)),
          Story.inMessage(Ask.InMessage.RequestedSelect({ index: 1 })),
          Story.model((model) => {
            expect(model.flow.index).toBe(1)
            expect(model.flow.answers['q-0']).toEqual(answer)
          }),
          Story.expectOutMessage(
            Ask.OutMessage.Events({
              events: [
                AskEvent.cases.AnswersChanged.make({ answers: { 'q-0': answer } }),
                AskEvent.cases.CurrentIndexChanged.make({ index: 1 }),
              ],
            }),
          ),
          Story.inMessage(Ask.InMessage.RequestedBack()),
          Story.model((model) => expect(model.flow.index).toBe(0)),
          synchronizeSelection(2),
          Story.Command.expectNone(),
        )
      }),
  )
  test.effect('unchanged textarea observations do not publish extra answer callbacks', () =>
    Effect.gen(function* () {
      const edited = yield* Story.story(
        subject,
        Story.init({ id: 'ask', questions }),
        Story.inMessage(Ask.InMessage.RequestedText({ value: '' })),
        Story.expectNoOutMessage(),
        Story.inMessage(Ask.InMessage.RequestedText({ value: 'draft' })),
        synchronizeSelection(1),
        Story.Command.expectNone(),
      )
      yield* Story.story(
        subject,
        Story.given(edited),
        Story.inMessage(Ask.InMessage.RequestedText({ value: 'draft' })),
        Story.expectNoOutMessage(),
        Story.model((model) => expect(model.flow.revision).toBe(edited.flow.revision)),
        Story.Command.expectNone(),
      )
    }),
  )
  test.effect(
    'multi-toggle ordering survives replay and Continue uses the displayed answer snapshot',
    () =>
      Effect.gen(function* () {
        const selected = yield* Story.story(
          subject,
          Story.init({ id: 'ask', questions, defaultCurrentIndex: 1 }),
          Story.inMessage(Ask.InMessage.RequestedSelect({ index: 1 })),
          synchronizeSelection(1),
          Story.Command.expectNone(),
        )
        yield* Story.story(
          subject,
          Story.given(replay(selected)),
          Story.inMessage(Ask.InMessage.RequestedSelect({ index: 0 })),
          Story.model((model) => expect(model.flow.answers.multi?.selectedIds).toEqual(['b', 'a'])),
          Story.inMessage(Ask.InMessage.RequestedSelect({ index: 1 })),
          Story.model((model) => expect(model.flow.answers.multi?.selectedIds).toEqual(['a'])),
          Story.inMessage(Ask.InMessage.RequestedSubmit()),
          Story.model((model) => expect(model.flow.index).toBe(2)),
          synchronizeSelection(3),
          Story.Command.expectNone(),
        )
      }),
  )
  test.effect(
    'controlled index and answers stay parent-owned while same-tick writes retain the latest snapshot',
    () =>
      Story.story(
        subject,
        Story.init({ id: 'ask', questions, currentIndex: 1, answers: {} }),
        Story.inMessage(Ask.InMessage.RequestedSelect({ index: 0 })),
        Story.model((model) => {
          expect(model.flow.answers).toEqual({})
          expect(model.flow.writeSnapshot.multi?.selectedIds).toEqual(['a'])
        }),
        Story.inMessage(Ask.InMessage.RequestedSelect({ index: 1 })),
        Story.model((model) =>
          expect(model.flow.writeSnapshot.multi?.selectedIds).toEqual(['a', 'b']),
        ),
        Story.inMessage(Ask.InMessage.RequestedSubmit()),
        Story.model((model) => expect(model.flow.index).toBe(1)),
        Story.expectOutMessage(
          Ask.OutMessage.Events({
            events: [AskEvent.cases.CurrentIndexChanged.make({ index: 2 })],
          }),
        ),
        Story.inMessage(
          Ask.InMessage.RequestedConfigure({
            config: {
              questions,
              currentIndex: 0,
              answers: { 'q-0': { questionId: 'q-0', selectedIds: ['o-0'] } },
            },
          }),
        ),
        Story.model((model) => expect(model.flow.index).toBe(0)),
        Story.inMessage(Ask.InMessage.RequestedConfigure({ config: { questions } })),
        Story.model((model) => expect(model.flow.index).toBe(0)),
        synchronizeSelection(2),
        Story.Command.expectNone(),
      ),
  )
  test.effect(
    'skip preserves answers, emits callbacks in order and completion receives the written snapshot',
    () => {
      const answer = { questionId: 'q-0', selectedIds: [], otherText: 'retained', skipped: true }
      const answers = { 'q-0': answer }
      return Story.story(
        subject,
        Story.init({ id: 'ask', questions: [questions[0] ?? { title: '' }] }),
        Story.inMessage(Ask.InMessage.RequestedText({ value: 'retained' })),
        Story.inMessage(Ask.InMessage.RequestedSkip()),
        Story.expectOutMessage(
          Ask.OutMessage.Events({
            events: [
              AskEvent.cases.AnswersChanged.make({ answers }),
              AskEvent.cases.Skipped.make({ questionId: 'q-0', index: 0 }),
              AskEvent.cases.Completed.make({ answers }),
            ],
          }),
        ),
        Story.model((model) => expect(model.flow.answers['q-0']).toEqual(answer)),
        synchronizeSelection(1),
        Story.Command.expectNone(),
      )
    },
  )
})

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('10 millis') }))

const acquireValidationProgram = Effect.gen(function* validationProgram() {
  const environment = yield* AskUserQuestionsEnvironment
  const host = document.createElement('div')
  const container = document.createElement('div')
  container.id = 'ask-validation-root'
  host.append(container)
  document.body.append(host)

  const program = Runtime.embed(
    Program.makeElement({
      block: AskValidationBlock,
      layer: AskValidationLayer,
      container,
    }).provide(Layer.succeed(AskUserQuestionsEnvironment, environment)),
  )

  yield* Effect.addFinalizer(() =>
    Effect.promise(program.dispose).pipe(
      Effect.andThen(() =>
        Effect.sync(() => {
          host.remove()
        }),
      ),
    ),
  )

  const click = (id: string) => {
    const button = host.querySelector<HTMLButtonElement>(`#${id}`)

    if (button === null) {
      throw new Error(`Missing ${id}`)
    }

    button.click()
  }

  const snapshot = () =>
    Schema.decodeSync(Schema.fromJsonString(Schema.toCodecJson(AskValidationBlock.Model)))(
      host.querySelector('#ask-snapshot')?.textContent ?? '',
    )

  yield* eventually(() => {
    expect(host.querySelector('#ask-submit')).not.toBeNull()
  })

  return { click, snapshot }
})

test.live(
  'validation is captured in the handler Layer, blocks submission, clears on edit and rejects stale results',
  () => {
    const calls: Array<string> = []

    return Effect.gen(function* validationFlow() {
      const { click, snapshot } = yield* acquireValidationProgram
      click('ask-short')
      yield* eventually(() => {
        expect(snapshot().ask.flow.answers.text?.otherText).toBe(' ab ')
      })
      click('ask-submit')
      yield* eventually(() => {
        expect(Option.getOrNull(snapshot().ask.flow.error)).toBe('Too short')
      })
      const invalid = snapshot().ask
      click('ask-long')
      yield* eventually(() => {
        expect(Option.isNone(snapshot().ask.flow.error)).toBe(true)
      })
      const edited = snapshot().ask
      yield* Story.story(
        subject,
        Story.given(edited),
        Story.message(
          Ask.Message.CompletedValidation({
            generation: invalid.flow.generation,
            revision: invalid.flow.revision,
            error: Option.some('stale'),
          }),
        ),
        Story.expectNoOutMessage(),
        Story.model((model) => expect(Option.isNone(model.flow.error)).toBe(true)),
        Story.Command.expectNone(),
      )
      click('ask-submit')
      yield* eventually(() => {
        expect(snapshot().events.at(-1)?._tag).toBe('Completed')
      })
      expect(snapshot().ask.flow.answers.text?.otherText).toBe('enough')
      expect(
        snapshot()
          .events.slice(-2)
          .map((event) => event._tag),
      ).toEqual(['AnswersChanged', 'Completed'])
      expect(calls).toEqual(['text:ab', 'text:enough'])
    }).pipe(
      Effect.scoped,
      Effect.provide(
        createAskUserQuestionsLayer({
          document: undefined,
          platform: 'MacIntel',
          validators: {
            ask: {
              text: (value) => {
                calls.push(`text:${value}`)

                return value.length < 4 ? 'Too short' : null
              },
            },
          },
        }),
      ),
    )
  },
)

test.live(
  'replacing identity-keyed validators changes subsequent validation without resetting answers',
  () =>
    Effect.gen(function* replacedValidation() {
      const environment = yield* AskUserQuestionsEnvironment
      const { click, snapshot } = yield* acquireValidationProgram
      click('ask-draft')
      yield* eventually(() => {
        expect(snapshot().ask.flow.answers.text?.otherText).toBe('Preserved draft')
      })
      click('ask-submit')
      yield* eventually(() => {
        expect(Option.getOrNull(snapshot().ask.flow.error)).toBe('Before replacement')
      })
      yield* environment.replaceValidators({ ask: { text: () => null } })
      click('ask-submit')
      yield* eventually(() => {
        expect(snapshot().events.at(-1)?._tag).toBe('Completed')
      })
      expect(snapshot().ask.flow.answers.text?.otherText).toBe('Preserved draft')
    }).pipe(
      Effect.scoped,
      Effect.provide(
        createAskUserQuestionsLayer({
          document: undefined,
          platform: '',
          validators: { ask: { text: () => 'Before replacement' } },
        }),
      ),
    ),
)

test.effect(
  'public reset restores source remount defaults, clears transient state and emits no callbacks',
  () =>
    Effect.gen(function* () {
      const config = {
        questions,
        defaultCurrentIndex: 1,
        defaultAnswers: { multi: { questionId: 'multi', selectedIds: ['b'] } },
      }
      const draft = yield* Story.story(
        subject,
        Story.init({ id: 'ask', ...config }),
        Story.inMessage(Ask.InMessage.RequestedSelect({ index: 0 })),
        Story.inMessage(Ask.InMessage.RequestedSubmit()),
        Story.inMessage(Ask.InMessage.RequestedText({ value: 'changed draft' })),
        synchronizeSelection(2),
        Story.Command.expectNone(),
      )
      const invalid = yield* Story.story(
        subject,
        Story.given(draft),
        Story.inMessage(Ask.InMessage.RequestedSubmit()),
        Story.Command.expectExact(
          Validate({
            id: 'ask',
            questionId: 'text',
            index: 2,
            text: 'changed draft',
            generation: draft.flow.generation,
            revision: draft.flow.revision,
          }),
        ),
        Story.Command.resolve(
          Validate,
          Ask.Message.CompletedValidation({
            generation: draft.flow.generation,
            revision: draft.flow.revision,
            error: Option.some('Invalid'),
          }),
        ),
        Story.Command.expectNone(),
      )
      yield* Story.story(
        subject,
        Story.given(replay(invalid)),
        Story.inMessage(Ask.InMessage.RequestedReset({ config })),
        Story.model((model) => {
          expect(model.flow.index).toBe(1)
          expect(model.flow.answers).toEqual(config.defaultAnswers)
          expect(model.flow.writeSnapshot).toEqual(config.defaultAnswers)
          expect(Option.isNone(model.flow.error)).toBe(true)
          expect(Option.isNone(model.flow.focusedIndex)).toBe(true)
          expect(model.flow.generation).toBeGreaterThan(invalid.flow.generation)
        }),
        Story.expectNoOutMessage(),
        Story.message(
          Ask.Message.CompletedValidation({
            generation: invalid.flow.generation,
            revision: invalid.flow.revision,
            error: Option.some('stale'),
          }),
        ),
        Story.expectNoOutMessage(),
        Story.model((model) => expect(Option.isNone(model.flow.error)).toBe(true)),
        synchronizeSelection(1),
        Story.Command.expectNone(),
      )
    }),
)

test.effect(
  'public reset retains explicit controlled answers and index without taking their ownership',
  () => {
    const answers = {
      multi: { questionId: 'multi', selectedIds: ['a'], otherText: 'parent draft' },
    }
    return Story.story(
      subject,
      Story.init({ id: 'ask', questions }),
      Story.inMessage(
        Ask.InMessage.RequestedReset({
          config: {
            questions,
            currentIndex: 1,
            answers,
            defaultCurrentIndex: 0,
            defaultAnswers: {},
          },
        }),
      ),
      Story.model((model) => {
        expect(model.flow.index).toBe(1)
        expect(model.flow.answers).toEqual(answers)
      }),
      Story.expectNoOutMessage(),
      Story.inMessage(Ask.InMessage.RequestedSelect({ index: 1 })),
      Story.model((model) => expect(model.flow.answers).toEqual(answers)),
      Story.expectOutMessage(
        Ask.OutMessage.Events({
          events: [
            AskEvent.cases.AnswersChanged.make({
              answers: {
                multi: {
                  questionId: 'multi',
                  selectedIds: ['a', 'b'],
                  otherText: 'parent draft',
                  skipped: false,
                },
              },
            }),
          ],
        }),
      ),
      synchronizeSelection(1),
      Story.Command.expectNone(),
    )
  },
)

test.effect('selected answer geometry follows the configured and updated shape radius', () =>
  Story.story(
    subject,
    Story.init({ id: 'sharp-answers', questions, radius: 1 }),
    Story.model((model) => {
      expect(model.radius).toBe(1)
      expect(model.selection.radius).toBe(1)
    }),
    Story.inMessage(Ask.InMessage.RequestedRadius({ radius: 16 })),
    Story.model((model) => {
      expect(model.radius).toBe(16)
      expect(model.selection.radius).toBe(16)
    }),
    Story.Command.expectNone(),
  ),
)
