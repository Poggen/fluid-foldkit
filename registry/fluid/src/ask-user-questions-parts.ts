import type { ButtonProps } from './button.js'
import { Option } from 'effect'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { askPopLayout } from './ask-user-questions-layout.js'
import type { AskChromeSlot } from './ask-user-questions-presence.js'
import { Button } from './button.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import type { MotionOptions } from './motion.js'
import { resolvePresentation } from './presentation.js'
import type { Icon, Presentation } from './presentation.js'
import { askCurrent } from './ask-user-questions-state.js'
import type { AskFlow } from './ask-user-questions-state.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import type { SelectionBackgroundsViewInputs } from './selection-backgrounds.js'

export interface AskUserQuestionsViewInputs extends Presentation {
  readonly className?: string
  readonly skipLabel?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly animateHighlight: HoverHighlightViewInputs['animate']
  readonly animateSelection: SelectionBackgroundsViewInputs['animate']
}

export { askTextarea } from './ask-user-questions-textarea.js'

export { askRow } from './ask-user-questions-row.js'

function footerButtonPadding(action: string, primary: boolean) {
  if (action === 'back') {
    return 'pl-3 sm:pl-2'
  }

  return primary ? 'pr-3 sm:pr-2' : ''
}

export function askFooter<M>(
  flow: AskFlow,
  inputs: AskUserQuestionsViewInputs,
  id: string,
  chrome: ReadonlyArray<AskChromeSlot & { readonly completion: ReadonlyArray<ChildAttribute> }>,
  h: HtmlBuilder<M>,
): Html {
  const question = askCurrent(flow)

  if (!question) {
    return null
  }

  const { shape, size, icons, reducedMotion } = resolvePresentation(inputs)
  const compact = size.variant === 'compact'
  const backSlot = chrome.find((slot) => slot.key === 'back')
  const skipSlot = chrome.find((slot) => slot.key === 'skip')
  const submitSlot = chrome.find((slot) => slot.key === 'submit')
  const showBack = backSlot !== undefined
  const showSkip = skipSlot !== undefined
  const showSubmit = submitSlot !== undefined

  if (!showBack && !showSkip && !showSubmit) {
    return null
  }

  const answer = flow.answers[question.id]
  const error = Option.getOrNull(flow.error)

  const chip = (content: string, inverted = false) =>
    h.kbd(
      [
        h.AriaHidden(true),
        h.Class(
          cn(
            'inline-flex items-center justify-center gap-0.5 px-1 min-w-[18px] h-[18px] text-[length:var(--fs-micro,11px)] leading-none font-sans',
            inverted
              ? 'bg-background/15 text-background'
              : 'bg-foreground/10 text-muted-foreground',
            shape.bg,
          ),
        ),
      ],
      [content],
    )

  const keyboardIcon =
    (icon: Icon): Icon =>
    (options, builder) =>
      icon({ ...options, className: cn(options.className, 'hidden sm:block') }, builder)

  const button = (
    action: string,
    label: string,
    primary: boolean,
    attributes: ReadonlyArray<Attribute<M>> = [],
  ) => {
    const slot = chrome.find((candidate) => candidate.key === action)

    const options = {
      ...inputs,
      children: [
        h.span(
          [h.Class('inline-flex items-center gap-1.5')],
          [
            label,
            primary
              ? h.span([h.Class('hidden sm:contents')], [chip(`${flow.isMac ? '⌘' : '⌃'}↵`, true)])
              : null,
          ],
        ),
      ],
      variant: primary ? 'primary' : 'ghost',
      buttonSize: 'sm',
      disabled:
        primary &&
        (answer?.selectedIds.length ?? 0) === 0 &&
        (answer?.otherText?.trim().length ?? 0) === 0,
      className: footerButtonPadding(action, primary),
      attributes: [h.DataAttribute('ask-action', action), ...attributes],
    } satisfies ButtonProps<M>

    const withLeading =
      action === 'back' ? { ...options, leadingIcon: keyboardIcon(icons['arrow-left']) } : options

    const buttonProps =
      action === 'skip'
        ? { ...withLeading, trailingIcon: keyboardIcon(icons['arrow-right']) }
        : withLeading

    return inputs.animate(
      askPopLayout(
        h.keyed('div')(action, [...(slot?.completion ?? [])], [Button(buttonProps, h)]),
        slot?.present ?? true,
      ),
      {
        initial: { opacity: 0, scale: 0.85 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.85 },
        present: slot?.present ?? true,
        transition: { ...spring.fast, opacity: { duration: 0.1 } },
        layout: 'position',
        reducedMotion,
      },
    )
  }

  return h.div(
    [h.Class(cn('pt-1', compact ? 'px-3.5 sm:px-4 pb-1.5' : 'px-4 sm:px-5 pb-2'))],
    [
      h.div(
        [h.Class('flex items-center justify-between gap-2 -mx-2 sm:-mx-3')],
        [
          h.div(
            [h.Class('relative flex flex-1 min-w-0 items-center gap-2')],
            [
              showBack ? button('back', 'Back', false) : null,
              error !== null && error !== ''
                ? inputs.animate(
                    h.p(
                      [
                        h.Id(`${id}-error`),
                        h.Role('alert'),
                        h.Class(
                          'min-w-0 px-2 sm:px-3 text-left text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] text-destructive',
                        ),
                      ],
                      [error],
                    ),
                    {
                      initial: { opacity: 0, y: -2 },
                      animate: { opacity: 1, y: 0 },
                      transition: { ...spring.fast, opacity: { duration: 0.12 } },
                      reducedMotion,
                    },
                  )
                : null,
            ],
          ),
          h.div(
            [h.Class('relative flex items-center gap-2')],
            [
              showSkip ? button('skip', inputs.skipLabel ?? 'Skip', false) : null,
              showSubmit ? button('submit', submitSlot?.label ?? 'Continue', true) : null,
            ],
          ),
        ],
      ),
    ],
  )
}
