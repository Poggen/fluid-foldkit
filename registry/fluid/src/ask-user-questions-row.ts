// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { askTextarea } from './ask-user-questions-textarea.js'
import type { AskUserQuestionsViewInputs } from './ask-user-questions-parts.js'
import { askCurrent } from './ask-user-questions-state.js'
import type { AskFlow } from './ask-user-questions-state.js'
import { resolvePresentation } from './presentation.js'
import { fontWeights } from './lib/font-weight.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import { hoverItemAttributes } from './hover.js'

function chipTone(multi: boolean, selected: boolean) {
  if (multi) {
    return selected ? 'bg-foreground text-background' : 'border border-border text-muted-foreground'
  }

  return selected ? 'text-foreground' : 'text-muted-foreground'
}

function rowVertical(stacked: boolean, compact: boolean) {
  if (stacked) {
    return compact ? 'min-h-12 py-1.5' : 'min-h-14 py-2'
  }

  return compact ? 'min-h-8 py-1' : 'min-h-10 py-1.5'
}

function rowHorizontal(left: boolean, multi: boolean) {
  if (!left) {
    return 'pl-3 pr-1.5'
  }

  return multi ? 'pl-1.5 pr-3' : 'pl-1.5 pr-1.5'
}

function rowTabIndex(other: boolean, index: number, first: number) {
  if (other) {
    return -1
  }

  return index === first || (first === -1 && index === 0) ? 0 : -1
}

function arrowVisible(
  multi: boolean,
  other: boolean,
  active: boolean,
  focused: boolean,
  text: string,
) {
  return !multi && (other ? (active || focused) && text.trim().length > 0 : active)
}

export function askRow<M, R>(
  flow: AskFlow,
  inputs: AskUserQuestionsViewInputs,
  id: string,
  index: number,
  activeIndex: number | null,
  h: HtmlBuilder<M, R>,
  hiddenControl: Html = null,
): Html {
  const question = askCurrent(flow)

  if (!question) {
    return null
  }

  const { shape, size, icons, reducedMotion } = resolvePresentation(inputs)
  const compact = size.variant === 'compact'
  const option = question.options[index]
  const other = index === question.options.length
  const answer = flow.answers[question.id]

  const selected = other
    ? (answer?.otherText?.length ?? 0) > 0
    : option !== undefined && (answer?.selectedIds.includes(option.id) ?? false)

  const stacked = !other && question.layout === 'stacked'
  const topAlign = other ? flow.multiline : stacked
  const left = question.chipPosition === 'left'

  const firstSelected = question.options.findIndex(
    (candidate) => answer?.selectedIds.includes(candidate.id) === true,
  )

  const showArrow = arrowVisible(
    question.multiSelect,
    other,
    activeIndex === index,
    Option.getOrNull(flow.focusedIndex) === index,
    answer?.otherText ?? '',
  )

  const renderArrow = () =>
    inputs.animate(
      h.span(
        [
          h.AriaHidden(!other),
          ...(other ? [h.Role('button'), h.DataAttribute('ask-action', 'submit-text')] : []),
          h.Class(
            cn(
              'absolute inset-0 inline-flex items-center justify-center bg-foreground text-background',
              shape.bg,
              other && 'cursor-pointer',
            ),
          ),
        ],
        [
          icons['arrow-right'](
            {
              size: other && compact ? 12 : 14,
              strokeWidth: 2,
              className: other && compact ? 'h-3 w-3' : 'h-3.5 w-3.5',
            },
            h,
          ),
        ],
      ),
      {
        initial: { opacity: 0, scale: 0.6 },
        animate: { opacity: showArrow ? 1 : 0, scale: showArrow ? 1 : 0.6 },
        transition: {
          ...(showArrow ? spring.fast : spring.fast.exit),
          opacity: { duration: 0.08 },
        },
        reducedMotion,
      },
    )

  const slotClass = cn(
    'shrink-0 relative inline-flex items-center justify-center',
    compact ? 'w-6 h-6' : 'w-7 h-7',
    topAlign && (stacked ? '-mt-[1px]' : '-mt-[5px]'),
  )

  const renderChip = () =>
    h.span(
      [h.Class(slotClass)],
      [
        h.span(
          [
            h.Class(
              cn(
                'absolute inline-flex items-center justify-center text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] transition-[opacity,font-variation-settings] duration-80',
                compact ? 'w-[18px] h-[18px]' : 'w-5 h-5',
                question.multiSelect && shape.bg,
                chipTone(question.multiSelect, selected),
                !left && showArrow && 'opacity-0',
              ),
            ),
            h.AriaHidden(true),
            h.Style({
              fontVariationSettings: selected ? fontWeights.semibold : fontWeights.normal,
            }),
          ],
          [String(index + 1)],
        ),
        left ? null : renderArrow(),
      ],
    )

  const renderTitle = () =>
    option
      ? h.span(
          [h.Class('inline-grid')],
          [
            h.span(
              [
                h.Class('col-start-1 row-start-1 invisible'),
                h.AriaHidden(true),
                h.Style({ fontVariationSettings: fontWeights.semibold }),
              ],
              [option.title],
            ),
            h.span(
              [
                h.Class(
                  'col-start-1 row-start-1 text-foreground transition-[color,font-variation-settings] duration-80',
                ),
                h.Style({
                  fontVariationSettings: selected ? fontWeights.semibold : fontWeights.normal,
                }),
              ],
              [option.title],
            ),
          ],
        )
      : null

  const renderDescription = () =>
    option?.description !== undefined && option.description !== ''
      ? h.span(
          [h.Class(cn('text-muted-foreground', stacked && size.type.caption))],
          [option.description],
        )
      : null

  const renderBody = () => {
    if (other) {
      return [
        h.span(
          [h.Class('inline-grid w-full')],
          [askTextarea(flow, inputs, id, question, false, h)],
        ),
      ]
    }

    return stacked
      ? [renderTitle(), renderDescription()]
      : [
          h.span(
            [],
            [
              renderTitle(),
              option?.description !== undefined && option.description !== '' ? ' ' : null,
              renderDescription(),
            ],
          ),
        ]
  }

  const attributes = () => [
    ...hoverItemAttributes(index, false, activeIndex),
    h.DataAttribute('fluid-hover-index', String(index)),
    h.DataAttribute('state', selected ? 'checked' : 'unchecked'),
    h.Tabindex(rowTabIndex(other, index, firstSelected)),
    ...(other
      ? [h.AriaLabel(question.otherPlaceholder.replace(/…$/u, ''))]
      : [h.Role(question.multiSelect ? 'checkbox' : 'radio'), h.AriaChecked(selected)]),
    h.Class(
      cn(
        'relative z-10 flex cursor-pointer select-none outline-none',
        left ? 'gap-2' : 'gap-3',
        topAlign ? 'items-start' : 'items-center',
        rowVertical(stacked, compact),
        rowHorizontal(left, question.multiSelect),
        shape.item,
      ),
    ),
  ]

  const renderTrailing = () => {
    if (!left) {
      return renderChip()
    }

    if (question.multiSelect) {
      return null
    }

    return h.span(
      [
        h.Class(
          cn(
            'shrink-0 w-7 h-7 relative inline-flex items-center justify-center',
            topAlign && (stacked ? '-mt-[1px]' : '-mt-[5px]'),
          ),
        ),
      ],
      [renderArrow()],
    )
  }

  return h.div(attributes(), [
    hiddenControl,
    left ? renderChip() : null,
    h.span(
      [
        h.Class(
          cn(
            'min-w-0 flex-1',
            size.text,
            stacked ? 'flex flex-col gap-0.5' : 'inline-flex items-center gap-0',
          ),
        ),
      ],
      renderBody(),
    ),
    renderTrailing(),
  ])
}
