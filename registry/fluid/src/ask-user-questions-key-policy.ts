// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Data, Match, Option } from 'effect'
import type { AskObservation } from './ask-user-questions-observer.js'
import { askCurrent } from './ask-user-questions-state.js'
import type { AskFlow, AskQuestion } from './ask-user-questions-state.js'

type Key = typeof AskObservation.CapturedKey.Type

type Question = typeof AskQuestion.Type

export type AskKeyAction =
  | { readonly _tag: 'Ignore' }
  | { readonly _tag: 'Select'; readonly index: number }
  | { readonly _tag: 'Focus'; readonly index: number }
  | { readonly _tag: 'Navigate'; readonly index: number }
  | { readonly _tag: 'Submit' }
  | { readonly _tag: 'Back' }
  | { readonly _tag: 'Skip' }

const Action = Data.taggedEnum<AskKeyAction>()

function globalSelection(question: Question, event: Key): AskKeyAction {
  if (event.meta || event.ctrl || event.alt || event.text) {
    return Action.Ignore()
  }

  const index = Number(event.key) - 1

  return index === question.options.length && question.allowOther
    ? Action.Focus({ index })
    : Action.Select({ index })
}

function modifiedSubmit(
  flow: AskFlow,
  question: Question,
  event: Key,
): Option.Option<AskKeyAction> {
  if (
    event.key !== 'Enter' ||
    !(flow.isMac ? event.meta : event.ctrl) ||
    !(question.multiSelect || question.freeText)
  ) {
    return Option.none()
  }

  const answer = flow.answers[question.id]

  return Option.some(
    (answer?.selectedIds.length ?? 0) > 0 || (answer?.otherText?.trim().length ?? 0) > 0
      ? Action.Submit()
      : Action.Ignore(),
  )
}

function textSubmission(question: Question, event: Key): Option.Option<AskKeyAction> {
  if (!event.text) {
    return Option.none()
  }

  if (
    event.key === 'Enter' &&
    !event.shift &&
    !event.meta &&
    !event.ctrl &&
    (question.freeText ? !question.freeTextMultiline : !question.multiSelect)
  ) {
    return Option.some(Action.Submit())
  }

  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return Option.some(Action.Ignore())
  }

  if (
    (event.key === 'ArrowUp' && event.start > 0) ||
    (event.key === 'ArrowDown' && event.end < event.length)
  ) {
    return Option.some(Action.Ignore())
  }

  return Option.none()
}

function rowAction(flow: AskFlow, question: Question, event: Key): Option.Option<AskKeyAction> {
  if (event.text) {
    return Option.none()
  }

  if ((event.key === 'Enter' || event.key === ' ') && !event.meta && !event.ctrl) {
    return Option.some(Action.Select({ index: event.index }))
  }

  if (event.key === 'ArrowLeft') {
    return Option.some(Action.Back())
  }

  if (event.key === 'ArrowRight') {
    return Option.some(
      question.skippable && flow.questions.length > 1 ? Action.Skip() : Action.Ignore(),
    )
  }

  return Option.none()
}

function navigation(flow: AskFlow, question: Question, event: Key): AskKeyAction {
  const count = question.options.length + (question.allowOther ? 1 : 0)

  if (count === 0 || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    return Action.Ignore()
  }

  const base = event.text ? question.options.length : Option.getOrElse(flow.activeIndex, () => -1)

  const index = Match.value(event.key).pipe(
    Match.when('Home', () => 0),
    Match.when('End', () => count - 1),
    Match.orElse(() => (base + (event.key === 'ArrowDown' ? 1 : -1) + count) % count),
  )

  return Action.Navigate({ index })
}

export function askKeyAction(flow: AskFlow, event: Key): AskKeyAction {
  const question = askCurrent(flow)

  if (question === undefined) {
    return Action.Ignore()
  }

  if (event.global) {
    return globalSelection(question, event)
  }

  const modified = modifiedSubmit(flow, question, event)

  if (Option.isSome(modified)) {
    return modified.value
  }

  const text = textSubmission(question, event)

  if (Option.isSome(text)) {
    return text.value
  }

  const row = rowAction(flow, question, event)

  return Option.isSome(row) ? row.value : navigation(flow, question, event)
}
