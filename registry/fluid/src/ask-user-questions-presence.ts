import { modifyFields } from 'foldkit/struct'
import { normalizeGeometry, rectAt } from './lib/indexed-geometry.js'
import type { IndexedGeometry } from './lib/indexed-geometry.js'
import { Option, Schema, Number } from 'effect'
import { Rect } from './hover-observation.js'
import { askCurrent, askSafeIndex } from './ask-user-questions-state.js'
import type { AskFlow } from './ask-user-questions-state.js'

export const askChrome: (
  flow: AskFlow,
  rectangles: IndexedGeometry | ReadonlyArray<typeof Rect.Type | null>,
  previous: ReadonlyArray<AskChromeSlot>,
) => ReadonlyArray<AskChromeSlot> = function askChrome(
  flow: AskFlow,
  rectangles: IndexedGeometry | ReadonlyArray<typeof Rect.Type | null>,
  previous: ReadonlyArray<AskChromeSlot>,
) {
  const geometry = normalizeGeometry(rectangles)
  const question = askCurrent(flow)

  if (!question) {
    return []
  }

  const index = askSafeIndex(flow)
  const focus = Option.getOrNull(flow.focusedIndex)
  const other = question.options.length

  const focusRect =
    focus !== null && !(question.allowOther && focus === other) ? rectAt(geometry, focus) : null

  const hintRect =
    question.allowOther &&
    focus === other &&
    (flow.answers[question.id]?.otherText?.length ?? 0) === 0
      ? rectAt(geometry, other)
      : null

  const wanted: ReadonlyArray<AskChromeSlot> = [
    ...(focusRect
      ? [
          {
            key: 'focus' satisfies 'focus',
            generation: flow.generation,
            present: true,
            rect: Option.some(focusRect),
            label: '',
          } satisfies AskChromeSlot,
        ]
      : []),
    ...(hintRect
      ? [
          {
            key: 'hint' satisfies 'hint',
            generation: flow.generation,
            present: true,
            rect: Option.some(hintRect),
            label: '',
          } satisfies AskChromeSlot,
        ]
      : []),
    ...(flow.questions.length > 1 && index > 0
      ? [
          {
            key: 'back' satisfies 'back',
            generation: flow.generation,
            present: true,
            rect: Option.none(),
            label: 'Back',
          } satisfies AskChromeSlot,
        ]
      : []),
    ...(flow.questions.length > 1 && question.skippable
      ? [
          {
            key: 'skip' satisfies 'skip',
            generation: flow.generation,
            present: true,
            rect: Option.none(),
            label: 'Skip',
          } satisfies AskChromeSlot,
        ]
      : []),
    ...(question.multiSelect || question.freeText
      ? [
          {
            key: 'submit' satisfies 'submit',
            generation: flow.generation,
            present: true,
            rect: Option.none(),
            label: Option.getOrElse(question.nextLabel, () =>
              index >= flow.questions.length - 1 ? 'Finish' : 'Continue',
            ),
          } satisfies AskChromeSlot,
        ]
      : []),
  ]

  return [
    ...wanted.map((slot) =>
      modifyFields(slot, {
        generation: () => (previous.find((prior) => prior.key === slot.key)?.generation ?? 0) + 1,
      }),
    ),
    ...previous.flatMap((slot) =>
      wanted.some((next) => next.key === slot.key)
        ? []
        : [
            slot.present
              ? modifyFields(slot, { present: () => false, generation: Number.increment })
              : slot,
          ],
    ),
  ]
}

export const AskChromeSlot = Schema.Struct({
  key: Schema.Literals(['focus', 'hint', 'back', 'skip', 'submit']),
  generation: Schema.Natural,
  present: Schema.Boolean,
  rect: Schema.OptionFromNullOr(Rect),
  label: Schema.String,
})

export type AskChromeSlot = typeof AskChromeSlot.Type
