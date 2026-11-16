// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { askKeyAction } from './ask-user-questions-key-policy.js'
import type { InMessage } from './ask-user-questions-contract.js'
import {
  AskUserQuestionsBlock,
  Message,
  OutMessage,
  NativeRadio,
} from './ask-user-questions-contract.js'

import { Effect, Match, Option, Schema, Number } from 'effect'
import { Update } from 'foldkit'
import * as Render from 'foldkit/render'
import { HoverBlock } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import { SelectionBackgroundsBlock } from './selection-backgrounds.js'
import { AskUserQuestionsEnvironment } from './ask-user-questions-environment.js'
import { observeAsk } from './ask-user-questions-observer.js'
import {
  askQuestions,
  askBack,
  askContinue,
  askCurrent,
  askInitial,
  askSafeIndex,
  askSelect,
  askSelected,
  askSkip,
  askSubmitText,
  askText,
} from './ask-user-questions-state.js'
import type { AskResult, AskUserQuestionsConfig } from './ask-user-questions-state.js'
import { askChrome } from './ask-user-questions-presence.js'

export const Observe = AskUserQuestionsBlock.makeMountStream('Observe', {
  messages: [
    Message.CapturedPlatform,
    Message.CapturedFocus,
    Message.CapturedBlur,
    Message.CapturedText,
    Message.CapturedClick,
    Message.CapturedKey,
    Message.CapturedMeasure,
  ],
  *handler() {
    const environment = yield* AskUserQuestionsEnvironment

    return ({ element, viewStateChanges }) => observeAsk(element, viewStateChanges, environment)
  },
})

export const Validate = AskUserQuestionsBlock.makeCommand('Validate', {
  args: {
    id: Schema.String,
    questionId: Schema.String,
    index: Schema.Int,
    text: Schema.String,
    generation: Schema.Natural,
    revision: Schema.Natural,
  },
  messages: [Message.CompletedValidation],
  *handler() {
    const environment = yield* AskUserQuestionsEnvironment

    return ({ id, questionId, text, generation, revision }) =>
      environment.validate(id, questionId, text).pipe(
        Effect.map((error) =>
          Message.CompletedValidation({
            generation,
            revision,
            error: Option.fromNullishOr(error),
          }),
        ),
      )
  },
})

export const FocusRow = AskUserQuestionsBlock.makeCommand('FocusRow', {
  args: { id: Schema.String, index: Schema.Int },
  messages: [Message.CompletedFocus],
  *handler() {
    const environment = yield* AskUserQuestionsEnvironment

    return ({ id, index }) =>
      Render.afterCommit.pipe(
        Effect.andThen(
          Effect.sync(() => {
            const root = environment.document?.getElementById(id)
            const row = root?.querySelector<HTMLElement>(`[data-fluid-hover-index="${index}"]`)

            const text =
              index < 0
                ? root?.querySelector<HTMLTextAreaElement>('textarea')
                : row?.querySelector<HTMLTextAreaElement>('textarea')

            if (text) {
              text.focus({ preventScroll: true })
            } else {
              row?.focus()
            }

            return Message.CompletedFocus()
          }),
        ),
      )
  },
})

export const Highlight = AskUserQuestionsBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: AskUserQuestionsConfig) => [
      {
        id: `${config.id}-highlight`,
        mode: config.hoverMode ?? 'fluid',
      },
    ],
  },
})

export const Selection = AskUserQuestionsBlock.makeRequiredFieldBinding(SelectionBackgroundsBlock, {
  field: 'selection',
  init: {
    contextToArgs: (config: AskUserQuestionsConfig) => [
      {
        id: `${config.id}-selection`,
        indices: askSelected(askInitial(config)),
        radius: config.radius ?? 8,
      },
    ],
  },
})

export const Hover = AskUserQuestionsBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: AskUserQuestionsConfig) => [
      {
        id: `${config.id}-rows`,
        mode: config.hoverMode ?? 'fluid',
      },
    ],
  },
}).withOutMessagePolicy({
  fold: AskUserQuestionsBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      Update.combineSteps([
        AskUserQuestionsBlock.makeStep((model) =>
          Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
        ),
        AskUserQuestionsBlock.makeStep((model) =>
          Selection.informOfGeometry({ itemRects: snapshot.itemRects, radius: model.radius }),
        ),
        AskUserQuestionsBlock.makeFieldsStep((model) => ({
          flow: () =>
            modifyFields(model.flow, {
              activeIndex: () => Option.fromNullishOr(snapshot.activeIndex),
            }),
          chrome: () => askChrome(model.flow, snapshot.itemRects, model.chrome),
        })),
      ]),
  }),
})

const syncChrome = AskUserQuestionsBlock.makeFieldsStep((model) => ({
  chrome: () => askChrome(model.flow, model.hover.itemRects, model.chrome),
}))

const apply = (result: AskResult) =>
  AskUserQuestionsBlock.makeStep((model) => {
    const combined = Update.combineSteps([
      AskUserQuestionsBlock.makeFieldsStep(() => ({ flow: () => result.flow })),
      Selection.requestSelection({ indices: askSelected(result.flow) }),
      syncChrome,
      ...(askSafeIndex(result.flow) === askSafeIndex(model.flow) ? [] : [Hover.requestClear()]),
      AskUserQuestionsBlock.makeCommandsStep(() =>
        result.focus === undefined ? [] : [FocusRow({ id: model.id, index: result.focus })],
      ),
    ])

    return (current: Parameters<typeof combined>[0]) =>
      Update.withOutMessage(
        combined(current),
        result.events.length > 0 ? OutMessage.Events({ events: result.events }) : undefined,
      )
  })

export const Radio = AskUserQuestionsBlock.makeRequiredFieldBinding(NativeRadio, {
  field: 'radio',
  init: { contextToArgs: (config: AskUserQuestionsConfig) => [{ id: `${config.id}-radio` }] },
}).withOutMessagePolicy({
  fold: AskUserQuestionsBlock.makeOutMessageFold(NativeRadio, {
    Selected: ({ index }) =>
      AskUserQuestionsBlock.makeStep((model) => apply(askSelect(model.flow, index))),
  }),
})

export const AskUserQuestionsComposition = AskUserQuestionsBlock.makeComposition({
  bindings: [Hover, Highlight, Selection, Radio],
  mounts: [Observe],
})

export const init = AskUserQuestionsComposition.makeInit((config: AskUserQuestionsConfig) => ({
  childInitContext: config,
  model: {
    id: config.id,
    flow: askInitial(config),
    radius: config.radius ?? 8,
    chrome: askChrome(askInitial(config), [], []),
  },
}))

const submit = AskUserQuestionsBlock.makeStep((model) => {
  const question = askCurrent(model.flow)

  if (!question) {
    return AskUserQuestionsBlock.makeNoopStep()
  }

  if (!question.freeText) {
    return apply(question.multiSelect ? askContinue(model.flow) : askSubmitText(model.flow, null))
  }

  const text = (model.flow.writeSnapshot[question.id]?.otherText ?? '').trim()

  return AskUserQuestionsBlock.makeCommandsStep(() =>
    text
      ? [
          Validate({
            id: model.id,
            questionId: question.id,
            index: askSafeIndex(model.flow),
            text,
            generation: model.flow.generation,
            revision: model.flow.revision,
          }),
        ]
      : [],
  )
})

export const update = AskUserQuestionsComposition.makeUpdate({
  CapturedNativeSelection: AskUserQuestionsBlock.makeStep((model, { index }) =>
    apply(askSelect(model.flow, index)),
  ),
  CompletedValidation: AskUserQuestionsBlock.makeStep(
    (model, { generation, revision, error }: typeof Message.CompletedValidation.Type) =>
      generation === model.flow.generation && revision === model.flow.revision
        ? apply(askSubmitText(model.flow, Option.getOrNull(error)))
        : AskUserQuestionsBlock.makeNoopStep(),
  ),
  CapturedPlatform: (model, { isMac }) => {
    const changed = {
      model: modifyFields(model, {
        flow: (currentFlow) => modifyFields(currentFlow, { isMac: () => isMac }),
      }),
    }

    return askCurrent(model.flow)?.freeText === true
      ? { ...changed, commands: [FocusRow({ id: model.id, index: -1 })] }
      : changed
  },
  CapturedFocus: AskUserQuestionsBlock.makeStep(
    (model, { index, visible }: typeof Message.CapturedFocus.Type) =>
      Update.combineSteps([
        AskUserQuestionsBlock.makeFieldsStep(() => ({
          flow: () =>
            modifyFields(model.flow, {
              focusedIndex: () => (visible ? Option.some(index) : Option.none()),
            }),
        })),
        Hover.requestHighlight({ index }),
        syncChrome,
      ]),
  ),
  CapturedBlur: AskUserQuestionsBlock.makeStep((model) =>
    Update.combineSteps([
      AskUserQuestionsBlock.makeFieldsStep(() => ({
        flow: () => modifyFields(model.flow, { focusedIndex: () => Option.none() }),
      })),
      Hover.requestClear(),
      syncChrome,
    ]),
  ),
  CapturedText: AskUserQuestionsBlock.makeStep(
    (model, { value }: typeof Message.CapturedText.Type) => apply(askText(model.flow, value)),
  ),
  CapturedMeasure: (model, { height, scrollHeight, lineHeight }) => ({
    model: modifyFields(model, {
      flow: (currentFlow) =>
        modifyFields(currentFlow, {
          multiline: () => scrollHeight > lineHeight * 1.5,
          contentHeight: () => Option.some(height),
        }),
    }),
  }),
  CapturedClick: AskUserQuestionsBlock.makeStep(
    (model, { index, action }: typeof Message.CapturedClick.Type) => {
      if (action === 'focus-text') {
        return AskUserQuestionsBlock.makeCommandsStep(() => [FocusRow({ id: model.id, index: -1 })])
      }

      if (action === 'submit' || action === 'submit-text') {
        return submit
      }

      if (action === 'back') {
        return apply(askBack(model.flow))
      }

      if (action === 'skip') {
        return apply(askSkip(model.flow))
      }

      const question = askCurrent(model.flow)

      return index === question?.options.length && question.allowOther
        ? AskUserQuestionsBlock.makeCommandsStep(() => [FocusRow({ id: model.id, index })])
        : apply(askSelect(model.flow, index))
    },
  ),
  CapturedKey: AskUserQuestionsBlock.makeStep((model, event: typeof Message.CapturedKey.Type) =>
    Match.value(askKeyAction(model.flow, event)).pipe(
      Match.tagsExhaustive({
        Ignore: () => AskUserQuestionsBlock.makeNoopStep(),
        Submit: () => submit,
        Back: () => apply(askBack(model.flow)),
        Skip: () => apply(askSkip(model.flow)),
        Select: ({ index }) => apply(askSelect(model.flow, index)),
        Focus: ({ index }) =>
          AskUserQuestionsBlock.makeCommandsStep(() => [FocusRow({ id: model.id, index })]),
        Navigate: ({ index }) =>
          Update.combineSteps([
            Hover.requestHighlight({ index }),
            AskUserQuestionsBlock.makeCommandsStep(() => [FocusRow({ id: model.id, index })]),
          ]),
      }),
    ),
  ),
  CompletedFocus: (model) => ({ model }),
  CompletedChromeExit: (model, { key, generation }) => ({
    model: modifyFields(model, {
      chrome: (currentChrome) =>
        currentChrome.filter(
          (slot) => slot.key !== key || slot.generation !== generation || slot.present,
        ),
    }),
  }),
  Unmounted: (model) => ({
    model: modifyFields(model, {
      flow: (currentFlow) =>
        modifyFields(currentFlow, {
          generation: Number.increment,
          focusedIndex: () => Option.none(),
          activeIndex: () => Option.none(),
          error: () => Option.none(),
        }),
    }),
  }),
})

export const inMessageUpdate = AskUserQuestionsComposition.makeInMessageUpdate({
  RequestedRadius: AskUserQuestionsBlock.makeStep(
    (model, { radius }: typeof InMessage.RequestedRadius.Type) =>
      Update.combineSteps([
        AskUserQuestionsBlock.makeFieldsStep(() => ({ radius: () => radius })),
        Selection.informOfGeometry({ itemRects: model.hover.itemRects, radius }),
      ]),
  ),
  RequestedHoverMode: AskUserQuestionsBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: false, gapClick: true, maxDistance: Infinity },
      }),
  ),
  RequestedReset: AskUserQuestionsBlock.makeStep(
    (model, { config }: typeof InMessage.RequestedReset.Type) => {
      const flow = askInitial(config)
      const next = modifyFields(flow, {
        isMac: () => model.flow.isMac,
        generation: () => model.flow.generation + 1,
      })

      return Update.combineSteps([
        AskUserQuestionsBlock.makeFieldsStep(() => ({
          flow: () => next,
          chrome: () => askChrome(next, [], []),
        })),
        Hover.requestClear(),
        Selection.requestSelection({ indices: askSelected(next) }),
        Selection.informOfGeometry({ itemRects: [], radius: model.radius }),
      ])
    },
  ),
  RequestedConfigure: AskUserQuestionsBlock.makeStep(
    (model, { config: input }: typeof InMessage.RequestedConfigure.Type) => {
      const config = {
        questions: askQuestions(input.questions),
        index: Option.fromUndefinedOr(input.currentIndex),
        answers: Option.fromUndefinedOr(input.answers),
      }

      const previous = model.flow
      const index = Option.getOrElse(config.index, () => previous.internalIndex)
      const answers = Option.getOrElse(config.answers, () => previous.internalAnswers)

      const flow = modifyFields(previous, {
        questions: () => config.questions,
        index: () => index,
        answers: () => answers,
        writeSnapshot: () => answers,
        controlledIndex: () => Option.isSome(config.index),
        controlledAnswers: () => Option.isSome(config.answers),
      })

      const changed =
        askSafeIndex(flow) !== askSafeIndex(previous) ||
        askCurrent(flow)?.id !== askCurrent(previous)?.id

      const next = changed
        ? modifyFields(flow, {
            focusedIndex: () => Option.none(),
            activeIndex: () => Option.none(),
            error: () => Option.none(),
            multiline: () => false,
            generation: () => previous.generation + 1,
          })
        : flow

      return Update.combineSteps([
        AskUserQuestionsBlock.makeFieldsStep(() => ({ flow: () => next })),
        Selection.requestSelection({ indices: askSelected(next) }),
        syncChrome,
        ...(changed ? [Hover.requestClear()] : []),
        AskUserQuestionsBlock.makeCommandsStep(() =>
          changed && askCurrent(next)?.freeText === true
            ? [FocusRow({ id: model.id, index: -1 })]
            : [],
        ),
      ])
    },
  ),
  RequestedSelect: AskUserQuestionsBlock.makeStep(
    (model, { index }: typeof InMessage.RequestedSelect.Type) =>
      apply(askSelect(model.flow, index)),
  ),
  RequestedText: AskUserQuestionsBlock.makeStep(
    (model, { value }: typeof InMessage.RequestedText.Type) => apply(askText(model.flow, value)),
  ),
  RequestedSubmit: submit,
  RequestedSkip: AskUserQuestionsBlock.makeStep((model) => apply(askSkip(model.flow))),
  RequestedBack: AskUserQuestionsBlock.makeStep((model) => apply(askBack(model.flow))),
})

export {
  AskUserQuestionsBlock,
  AskUserQuestionsKey,
  Model,
  Message,
  InMessage,
} from './ask-user-questions-contract.js'
