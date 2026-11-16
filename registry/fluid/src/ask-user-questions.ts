import { fontWeights } from './lib/font-weight.js'
import * as RadioGroup from '@foldkit/ui/radioGroup'
import * as Checkbox from '@foldkit/ui/checkbox'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Data, Layer, Option } from 'effect'
import { layer as HoverLayer } from './hover.js'
import { layer as HighlightLayer } from './hover-highlight.js'
import { layer as SelectionLayer } from './selection-backgrounds.js'
import { childAttributes } from 'foldkit/html'
import type { Attribute } from 'foldkit/html'
import { askCurrent, askSafeIndex } from './ask-user-questions-state.js'
import { askFooter, askRow, askTextarea } from './ask-user-questions-parts.js'
import type { AskUserQuestionsViewInputs } from './ask-user-questions-parts.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import { EXIT_COMPLETE_EVENT } from './motion.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import {
  Message,
  Observe,
  Validate,
  FocusRow,
  Hover,
  Highlight,
  Selection,
  Radio,
  AskUserQuestionsBlock,
  AskUserQuestionsComposition,
  inMessageUpdate,
  init,
  update,
} from './ask-user-questions-block.js'

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

function questionBottom(footer: boolean, compact: boolean) {
  if (footer) {
    return 'pb-1'
  }

  return compact ? 'pb-2 sm:pb-2.5' : 'pb-2.5 sm:pb-3'
}

function textMinimum(multiline: boolean, compact: boolean) {
  if (multiline) {
    return 'min-h-[76px]'
  }

  return compact ? 'min-h-8' : 'min-h-10'
}

const view = AskUserQuestionsComposition.makeView.withInputs<AskUserQuestionsViewInputs>(
  (model, provided, h) => {
    const presentation = resolvePresentation(provided)

    const inputs = {
      ...provided,
      context: createPresentationContext({
        ...provided,
        hasSizeProvider: provided.size !== undefined || presentation.hasSizeProvider,
      }),
    }

    const { shape, size, reducedMotion } = presentation
    const compact = size.variant === 'compact'
    const { flow } = model
    const question = askCurrent(flow)

    const footer =
      question !== undefined &&
      ((flow.questions.length > 1 && (askSafeIndex(flow) > 0 || question.skippable)) ||
        question.multiSelect ||
        question.freeText)

    const otherText = question ? (flow.answers[question.id]?.otherText ?? '') : ''

    const chrome = model.chrome.map((slot) => ({
      ...slot,
      completion: childAttributes([
        Events.OnCustomEvent({
          name: EXIT_COMPLETE_EVENT,
          f: () =>
            Option.some(
              Message.CompletedChromeExit({ key: slot.key, generation: slot.generation }),
            ),
        }),
      ]),
    }))

    const renderRows = (radio?: RadioGroup.RenderInfo) =>
      h.block(
        Hover.embedView({
          slotId: model.hover.id,
          model: model.hover,
          viewInputs: {
            attributes: [
              ...(radio?.group ?? []),
              ...childAttributes([
                h.DataAttribute('ask-rows', ''),
                h.Role(question?.multiSelect === true ? 'group' : 'radiogroup'),
                h.AriaLabelledBy(`${model.id}-${question?.id ?? ''}-title`),
                h.Class('relative flex flex-col -mx-3'),
              ]),
            ],
            content: () => [
              h.block(
                Highlight.embedView({
                  slotId: model.highlight.id,
                  model: model.highlight,
                  viewInputs: {
                    className: shape.bg,
                    animate: inputs.animateHighlight,
                    mode: model.hover.mode,
                  },
                }),
              ),
              h.block(
                Selection.embedView({
                  slotId: model.selection.id,
                  model: model.selection,
                  viewInputs: { animate: inputs.animateSelection },
                }),
              ),
              ...chrome
                .filter((slot) => slot.key === 'focus' || slot.key === 'hint')
                .map((slot) => {
                  const rect = Option.getOrNull(slot.rect)

                  if (!rect) {
                    return null
                  }

                  const focus = slot.key === 'focus'

                  const target = {
                    top: rect.top - (focus ? 2 : 0),
                    left: rect.left - (focus ? 2 : 0),
                    width: rect.width + (focus ? 4 : 0),
                    height: rect.height + (focus ? 4 : 0),
                    opacity: 1,
                  }

                  return inputs.animate(
                    h.keyed('div')(slot.key, [
                      h.AriaHidden(true),
                      ...slot.completion,
                      h.Class(
                        focus
                          ? cn(
                              'absolute pointer-events-none border border-[color:var(--focus-ring,#6B97FF)] z-20',
                              shape.focusRing,
                            )
                          : cn(
                              'absolute pointer-events-none bg-card ring-1 ring-inset ring-border',
                              shape.bg,
                            ),
                      ),
                    ]),
                    {
                      initial: { ...target, opacity: 0 },
                      animate: target,
                      exit: { opacity: 0, transition: spring.fast.exit },
                      present: slot.present,
                      transition: { ...spring.fast, opacity: { duration: 0.08 } },
                      reducedMotion,
                    },
                  )
                }),
              ...(question?.options.map((option, index) =>
                askRow(
                  flow,
                  inputs,
                  model.id,
                  index,
                  model.hover.activeIndex,
                  h,
                  question.multiSelect
                    ? Checkbox.view(
                        {
                          id: `${model.id}-${question.id}-${index}-native`,
                          isChecked:
                            flow.answers[question.id]?.selectedIds.includes(
                              question.options[index]?.id ?? '',
                            ) ?? false,
                          name: option.id,
                          onToggle: () => Message.CapturedNativeSelection({ index }),
                          toView: ({ checkbox, hiddenInput, label }) =>
                            h.span(
                              [
                                h.Class('sr-only'),
                                h.AriaHidden(true),
                                h.DataAttribute('ask-native-control', ''),
                              ],
                              [
                                h.button([...checkbox, h.Tabindex(-1)]),
                                h.span([...label], [option.title]),
                                h.input([...hiddenInput]),
                              ],
                            ),
                        },
                        h,
                      )
                    : h.span(
                        [
                          h.Class('sr-only'),
                          h.AriaHidden(true),
                          h.DataAttribute('ask-native-control', ''),
                        ],
                        [
                          h.button([...(radio?.options[index]?.option ?? []), h.Tabindex(-1)]),
                          h.span([...(radio?.options[index]?.label ?? [])], [option.title]),
                        ],
                      ),
                ),
              ) ?? []),
              question?.allowOther === true
                ? askRow(
                    flow,
                    inputs,
                    model.id,
                    question.options.length,
                    model.hover.activeIndex,
                    h,
                  )
                : null,
            ],
          },
        }),
      )

    const rows =
      question !== undefined && !question.multiSelect && !question.freeText
        ? h.block(
            Radio.embedView({
              slotId: model.radio.id,
              model: model.radio,
              viewInputs: {
                options: question.options.map((option) => option.id),
                selectedValue: Option.fromUndefinedOr(flow.answers[question.id]?.selectedIds[0]),
                ariaLabel: question.title,
                orientation: 'Vertical',
                toView: renderRows,
              },
            }),
          )
        : renderRows()

    const renderContent = () =>
      question
        ? [
            h.div(
              [
                h.Class(
                  cn(
                    'flex items-center text-muted-foreground',
                    compact
                      ? 'px-3.5 sm:px-4 pt-2.5 sm:pt-3 pb-1.5 text-[length:var(--fs-caption-compact,11px)] leading-[var(--lh-caption-compact,14px)]'
                      : 'px-4 sm:px-5 pt-3.5 sm:pt-4 pb-2 text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]',
                  ),
                ),
              ],
              [
                h.span(
                  [],
                  [
                    'Question ',
                    String(askSafeIndex(flow) + 1),
                    ' of ',
                    String(flow.questions.length),
                  ],
                ),
              ],
            ),
            h.div(
              [h.Class('contents')],
              [
                inputs.animate(
                  h.div(
                    [h.Class('overflow-hidden')],
                    [
                      h.div(
                        [
                          h.DataAttribute('ask-content', ''),
                          h.DataAttribute('ask-question', question.id),
                          h.Class(
                            cn(
                              compact ? 'px-3.5 sm:px-4' : 'px-4 sm:px-5',
                              questionBottom(footer, compact),
                            ),
                          ),
                        ],
                        [
                          h.keyed('div')(
                            question.id,
                            [h.Class('flex flex-col gap-2')],
                            [
                              h.h3(
                                [
                                  h.Class(
                                    'text-[length:var(--fs-title,16px)] leading-[var(--lh-title,22px)] text-foreground',
                                  ),
                                  h.Id(`${model.id}-${question.id}-title`),
                                  h.Style({ fontVariationSettings: fontWeights.semibold }),
                                ],
                                [question.title],
                              ),
                              question.freeText
                                ? h.div(
                                    [
                                      h.DataAttribute('ask-action', 'focus-text'),
                                      h.Class(
                                        cn(
                                          'relative mt-1 cursor-text transition-colors',
                                          compact ? '-mx-2.5 py-2' : '-mx-3 py-2.5',
                                          size.px,
                                          textMinimum(question.freeTextMultiline, compact),
                                          shape.bg,
                                          otherText.length > 0
                                            ? 'bg-active'
                                            : 'hover:bg-hover focus-within:bg-card focus-within:ring-1 focus-within:ring-inset focus-within:ring-border',
                                        ),
                                      ),
                                    ],
                                    [askTextarea(flow, inputs, model.id, question, true, h)],
                                  )
                                : rows,
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  {
                    initial: false,
                    animate: {
                      height: Option.getOrElse(flow.contentHeight, () => 'auto' satisfies string),
                    },
                    transition: spring.slow,
                    reducedMotion,
                  },
                ),
                askFooter(flow, inputs, model.id, chrome, h),
              ],
            ),
          ]
        : [
            h.p(
              [
                h.Class(
                  'text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] text-muted-foreground',
                ),
              ],
              ['No questions.'],
            ),
          ]

    return h.div(
      [
        h.Id(model.id),
        h.OnMount(Observe()),
        h.OnUnmount(Message.Unmounted()),
        h.Class(
          cn(
            question
              ? 'relative w-full max-w-[520px] overflow-hidden bg-card border border-border'
              : 'w-full max-w-[520px] p-5 bg-card border border-border',
            shape.container,
            inputs.className,
          ),
        ),
        ...(inputs.attributes ?? []),
      ],
      renderContent(),
    )
  },
)

const implementation = {
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(Observe.layer, Validate.layer, FocusRow.layer),
}

export const layer = AskUserQuestionsBlock.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(Layer.mergeAll(HoverLayer, HighlightLayer, SelectionLayer, RadioGroup.layer)),
)

export {
  AskUserQuestionsBlock,
  AskUserQuestionsKey,
  InMessage,
} from './ask-user-questions-block.js'

export {
  createAskUserQuestionsLayer,
  AskUserQuestionsEnvironment,
} from './ask-user-questions-environment.js'

export { AskAnswers } from './ask-user-questions-state.js'

export type { AskUserQuestionsViewInputs } from './ask-user-questions-parts.js'

export type {
  AskUserOption,
  AskUserQuestion,
  AskUserAnswer,
  AskUserQuestionsConfig,
  AskEvent,
} from './ask-user-questions-state.js'

export type {
  AskUserQuestionsValidator,
  AskUserQuestionsValidators,
} from './ask-user-questions-environment.js'

export const hoverModeOf = (model: typeof AskUserQuestionsBlock.Model.Type) => model.hover.mode

export const radiusOf = (model: typeof AskUserQuestionsBlock.Model.Type) => model.radius
