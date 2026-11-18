import { fontWeights } from './lib/font-weight.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { AskUserQuestionsViewInputs } from './ask-user-questions-parts.js'
import type { AskFlow, AskQuestion } from './ask-user-questions-state.js'
import { resolvePresentation } from './presentation.js'
import { cn } from './lib/utils.js'

export const askTextarea: <M, R>(
  flow: AskFlow,
  inputs: AskUserQuestionsViewInputs,
  id: string,
  question: typeof AskQuestion.Type,
  free: boolean,
  h: HtmlBuilder<M, R>,
) => Html = function askTextarea<M, R>(
  flow: AskFlow,
  inputs: AskUserQuestionsViewInputs,
  id: string,
  question: typeof AskQuestion.Type,
  free: boolean,
  h: HtmlBuilder<M, R>,
) {
  const { size } = resolvePresentation(inputs)
  const error = Option.getOrNull(flow.error)

  return h.textarea([
    h.Class(
      cn(
        free
          ? 'block w-full bg-transparent border-0 p-0 m-0 outline-none resize-none overflow-hidden text-foreground placeholder:text-muted-foreground'
          : 'col-start-1 row-start-1 block w-full bg-transparent border-0 p-0 m-0 outline-none resize-none overflow-hidden text-foreground placeholder:text-muted-foreground',
        size.field,
        'pointer-coarse:py-px pointer-coarse:-my-px',
      ),
    ),
    h.Rows(1),
    h.Value(flow.answers[question.id]?.otherText ?? ''),
    h.DataAttribute(
      'ask-plain-submit',
      String(free ? !question.freeTextMultiline : !question.multiSelect),
    ),
    ...(free
      ? [h.DataAttribute('ask-free-text', ''), h.AriaLabelledBy(`${id}-${question.id}-title`)]
      : [h.AriaLabel(question.otherPlaceholder.replace(/…$/u, ''))]),
    h.Placeholder(free ? question.freeTextPlaceholder : question.otherPlaceholder),
    h.AriaInvalid(error !== null),
    ...(error !== null && error !== '' ? [h.AriaDescribedBy(`${id}-error`)] : []),
    h.Style({ fontVariationSettings: fontWeights.normal }),
  ]) satisfies Html
}
