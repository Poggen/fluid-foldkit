import { modifyFields } from 'foldkit/struct'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { HoverMode } from './hover-observation.js'
import { Option, Schema } from 'effect'

export interface AskUserOption {
  readonly id?: string
  readonly title: string
  readonly description?: string
}

export interface AskUserQuestion {
  readonly id?: string
  readonly title: string
  readonly options?: ReadonlyArray<AskUserOption>
  readonly multiSelect?: boolean
  readonly allowOther?: boolean
  readonly otherPlaceholder?: string
  readonly skippable?: boolean
  readonly nextLabel?: string
  readonly layout?: 'inline' | 'stacked'
  readonly chipPosition?: 'left' | 'right'
  readonly freeText?: boolean
  readonly freeTextPlaceholder?: string
  readonly freeTextMultiline?: boolean
}

export const AskUserAnswer = Schema.Struct({
  questionId: Schema.String,
  selectedIds: Schema.Array(Schema.String),
  otherText: Schema.optionalKey(Schema.String),
  skipped: Schema.optionalKey(Schema.Boolean),
})

export type AskUserAnswer = typeof AskUserAnswer.Type

export const AskAnswers = Schema.Record(Schema.String, AskUserAnswer)

export type AskAnswers = typeof AskAnswers.Type

const QuestionOption = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
})

export const AskQuestion = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  options: Schema.Array(QuestionOption),
  multiSelect: Schema.Boolean,
  allowOther: Schema.Boolean,
  otherPlaceholder: Schema.String,
  skippable: Schema.Boolean,
  nextLabel: Schema.OptionFromNullOr(Schema.String),
  layout: Schema.Literals(['inline', 'stacked']),
  chipPosition: Schema.Literals(['left', 'right']),
  freeText: Schema.Boolean,
  freeTextPlaceholder: Schema.String,
  freeTextMultiline: Schema.Boolean,
})

export const AskFlow = Schema.Struct({
  questions: Schema.Array(AskQuestion),
  index: Schema.Int,
  internalIndex: Schema.Int,
  controlledIndex: Schema.Boolean,
  answers: AskAnswers,
  internalAnswers: AskAnswers,
  writeSnapshot: AskAnswers,
  controlledAnswers: Schema.Boolean,
  focusedIndex: Schema.OptionFromNullOr(Schema.Int),
  activeIndex: Schema.OptionFromNullOr(Schema.Int),
  error: Schema.OptionFromNullOr(Schema.String),
  generation: Schema.Natural,
  revision: Schema.Natural,
  multiline: Schema.Boolean,
  contentHeight: Schema.OptionFromNullOr(Schema.Number),
  isMac: Schema.Boolean,
})

export type AskFlow = typeof AskFlow.Type

export const AskUserQuestionInput = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  title: Schema.String,
  options: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        id: Schema.optionalKey(Schema.String),
        title: Schema.String,
        description: Schema.optionalKey(Schema.String),
      }),
    ),
  ),
  multiSelect: Schema.optionalKey(Schema.Boolean),
  allowOther: Schema.optionalKey(Schema.Boolean),
  otherPlaceholder: Schema.optionalKey(Schema.String),
  skippable: Schema.optionalKey(Schema.Boolean),
  nextLabel: Schema.optionalKey(Schema.String),
  layout: Schema.optionalKey(Schema.Literals(['inline', 'stacked'])),
  chipPosition: Schema.optionalKey(Schema.Literals(['left', 'right'])),
  freeText: Schema.optionalKey(Schema.Boolean),
  freeTextPlaceholder: Schema.optionalKey(Schema.String),
  freeTextMultiline: Schema.optionalKey(Schema.Boolean),
})

export const AskSettings = Schema.Struct({
  questions: Schema.Array(AskUserQuestionInput),
  currentIndex: Schema.optionalKey(Schema.Int),
  answers: Schema.optionalKey(AskAnswers),
})

export const AskDefaults = Schema.Struct({
  ...AskSettings.fields,
  defaultCurrentIndex: Schema.optionalKey(Schema.Int),
  defaultAnswers: Schema.optionalKey(AskAnswers),
})

export const AskConfig = Schema.Struct({
  id: Schema.String,
  hoverMode: Schema.optionalKey(HoverMode),
  radius: Schema.optionalKey(Schema.Finite),
  ...AskDefaults.fields,
})

export interface AskUserQuestionsConfig {
  readonly radius?: number
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly questions: ReadonlyArray<AskUserQuestion>
  readonly currentIndex?: number
  readonly defaultCurrentIndex?: number
  readonly answers?: AskAnswers
  readonly defaultAnswers?: AskAnswers
}

export function askQuestions(
  questions: ReadonlyArray<AskUserQuestion>,
): ReadonlyArray<typeof AskQuestion.Type> {
  return questions.map((question, index) => ({
    id: question.id ?? `q-${index}`,
    title: question.title,
    options: (question.options ?? []).map((option, i) => ({
      id: option.id ?? `o-${i}`,
      title: option.title,
      description: option.description ?? '',
    })),
    multiSelect: question.multiSelect ?? false,
    allowOther: question.freeText !== true && (question.allowOther ?? false),
    otherPlaceholder: question.otherPlaceholder ?? 'Describe in your own words…',
    skippable: question.skippable !== false,
    nextLabel: Option.fromNullishOr(question.nextLabel),
    layout: question.layout ?? 'inline',
    chipPosition: question.chipPosition ?? 'right',
    freeText: question.freeText ?? false,
    freeTextPlaceholder: question.freeTextPlaceholder ?? 'Type your answer…',
    freeTextMultiline: question.freeTextMultiline !== false,
  }))
}

export function askInitial(config: Omit<AskUserQuestionsConfig, 'id'>): AskFlow {
  const internalIndex = config.defaultCurrentIndex ?? 0
  const internalAnswers = config.defaultAnswers ?? {}

  return {
    questions: askQuestions(config.questions),
    index: config.currentIndex ?? internalIndex,
    internalIndex,
    controlledIndex: config.currentIndex !== undefined,
    answers: config.answers ?? internalAnswers,
    internalAnswers,
    writeSnapshot: config.answers ?? internalAnswers,
    controlledAnswers: config.answers !== undefined,
    focusedIndex: Option.none(),
    activeIndex: Option.none(),
    error: Option.none(),
    generation: 0,
    revision: 0,
    multiline: false,
    contentHeight: Option.none(),
    isMac: false,
  }
}

export function askSafeIndex(flow: AskFlow): number {
  return Math.max(0, Math.min(flow.index, Math.max(0, flow.questions.length - 1)))
}

export function askCurrent(flow: AskFlow) {
  return flow.questions[askSafeIndex(flow)]
}

function preserveOtherText(
  answer: AskUserAnswer,
  existing: AskUserAnswer | undefined,
): AskUserAnswer {
  return existing?.otherText === undefined ? answer : { ...answer, otherText: existing.otherText }
}

export function askSelected(flow: AskFlow): ReadonlyArray<number> {
  const question = askCurrent(flow)

  if (!question) {
    return []
  }

  const answer = flow.answers[question.id]

  return [
    ...question.options.flatMap((option, index) =>
      answer?.selectedIds.includes(option.id) === true ? [index] : [],
    ),
    ...(question.allowOther && (answer?.otherText?.length ?? 0) > 0
      ? [question.options.length]
      : []),
  ]
}

export const AskEvent = Schema.Union([
  Schema.TaggedStruct('AnswersChanged', { answers: AskAnswers }),
  Schema.TaggedStruct('CurrentIndexChanged', { index: Schema.Int }),
  Schema.TaggedStruct('Completed', { answers: AskAnswers }),
  Schema.TaggedStruct('Skipped', { questionId: Schema.String, index: Schema.Int }),
]).pipe(Schema.toTaggedUnion('_tag'))

export type AskEvent = typeof AskEvent.Type

export interface AskResult {
  readonly flow: AskFlow
  readonly events: ReadonlyArray<AskEvent>
  readonly focus?: number
}

function move(flow: AskFlow, index: number): AskResult {
  const events: ReadonlyArray<AskEvent> = [AskEvent.cases.CurrentIndexChanged.make({ index })]

  if (flow.controlledIndex) {
    return { flow, events }
  }

  const moved = {
    flow: modifyFields(flow, {
      index: () => index,
      internalIndex: () => index,
      activeIndex: () => Option.none(),
      focusedIndex: () => Option.none(),
      error: () => Option.none(),
      multiline: () => false,
      generation: () => flow.generation + 1,
    }),
    events,
  }

  return Option.isSome(flow.focusedIndex) ? { ...moved, focus: 0 } : moved
}

function advanceQuestion(flow: AskFlow, snapshot: AskAnswers): AskResult {
  return askSafeIndex(flow) >= flow.questions.length - 1
    ? { flow, events: [AskEvent.cases.Completed.make({ answers: snapshot })] }
    : move(flow, askSafeIndex(flow) + 1)
}

function write(flow: AskFlow, answer: AskUserAnswer): AskResult {
  const answers = { ...flow.writeSnapshot, [answer.questionId]: answer }

  const updated = modifyFields(flow, {
    writeSnapshot: () => answers,
    revision: () => flow.revision + 1,
  })

  return {
    flow: flow.controlledAnswers
      ? updated
      : modifyFields(updated, { answers: () => answers, internalAnswers: () => answers }),
    events: [AskEvent.cases.AnswersChanged.make({ answers })],
  }
}

function finish(result: AskResult): AskResult {
  const advanced = advanceQuestion(result.flow, result.flow.writeSnapshot)

  return { ...advanced, events: [...result.events, ...advanced.events] }
}

export function askSelect(flow: AskFlow, index: number): AskResult {
  const question = askCurrent(flow)
  const option = question?.options[index]

  if (!question || !option || question.freeText) {
    return { flow, events: [] }
  }

  const existing = flow.writeSnapshot[question.id]
  const selected = new Set(existing?.selectedIds)

  if (question.multiSelect) {
    if (selected.has(option.id)) {
      selected.delete(option.id)
    } else {
      selected.add(option.id)
    }
  }

  const result = write(
    flow,
    preserveOtherText(
      {
        questionId: question.id,
        selectedIds: question.multiSelect ? [...selected] : [option.id],
        skipped: false,
      },
      existing,
    ),
  )

  return question.multiSelect ? result : finish(result)
}

export function askText(flow: AskFlow, text: string): AskResult {
  const question = askCurrent(flow)

  if (!question) {
    return { flow, events: [] }
  }

  const existing = flow.writeSnapshot[question.id]

  if (text === (existing?.otherText ?? '')) {
    return { flow, events: [] }
  }

  return write(modifyFields(flow, { error: () => Option.none() }), {
    questionId: question.id,
    selectedIds: existing?.selectedIds ?? [],
    otherText: text,
    skipped: false,
  })
}

export function askSubmitText(flow: AskFlow, error: string | null): AskResult {
  const question = askCurrent(flow)

  if (!question) {
    return { flow, events: [] }
  }

  const existing = flow.writeSnapshot[question.id]
  const text = (existing?.otherText ?? '').trim()

  if (!text) {
    return { flow, events: [] }
  }

  if (error !== null && error !== undefined && error !== '') {
    return { flow: modifyFields(flow, { error: () => Option.some(error) }), events: [] }
  }

  return finish(
    write(modifyFields(flow, { error: () => Option.none() }), {
      questionId: question.id,
      selectedIds: existing?.selectedIds ?? [],
      otherText: text,
      skipped: false,
    }),
  )
}

export function askSkip(flow: AskFlow): AskResult {
  const question = askCurrent(flow)

  if (!question) {
    return { flow, events: [] }
  }

  const existing = flow.writeSnapshot[question.id]

  const result = write(
    flow,
    preserveOtherText(
      {
        questionId: question.id,
        selectedIds: existing?.selectedIds ?? [],
        skipped: true,
      },
      existing,
    ),
  )

  return finish({
    ...result,
    events: [
      ...result.events,
      AskEvent.cases.Skipped.make({ questionId: question.id, index: askSafeIndex(flow) }),
    ],
  })
}

export function askContinue(flow: AskFlow): AskResult {
  return advanceQuestion(flow, flow.answers)
}

export function askBack(flow: AskFlow): AskResult {
  return askSafeIndex(flow) > 0 ? move(flow, askSafeIndex(flow) - 1) : { flow, events: [] }
}
