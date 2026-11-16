import { radioGroupInput } from './radio-group-input.js'
import { selectionBorder } from './selection-group-style.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { fontWeights } from './lib/font-weight.js'
import { spring } from './lib/springs.js'
import { hoverItemAttributes } from './hover.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import type { TargetMotionOptions } from './motion-target.js'
import type { CheckboxMark } from './checkbox-group-state.js'
import { radioItemSelected } from './radio-group-state.js'
import type { RadioSelection } from './radio-group-state.js'

type RowMountAttribute<Message, Requirements> = Extract<
  NonNullable<Parameters<HtmlBuilder<Message, Requirements>['div']>[0]>[number],
  { readonly __childAttribute: true }
>

export interface RadioContext<MountAttribute = ChildAttribute>
  extends Presentation, RadioSelection {
  readonly id: string
  readonly activeIndex: number | null
  readonly hasSelection: boolean
  readonly hasForm: boolean
  readonly initialChecked: ReadonlyArray<{ readonly index: number; readonly checked: boolean }>
  readonly itemMount: ReadonlyArray<MountAttribute>
  readonly marks: ReadonlyArray<
    CheckboxMark & { readonly completion: ReadonlyArray<ChildAttribute> }
  >
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
}

export interface RadioItemProps<Message, Requirements = never> {
  readonly index: number
  readonly label: string
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message, Requirements>>
}

export function RadioItem<Message, Requirements>(
  props: NoInfer<RadioItemProps<Message, Requirements>>,
  context: NoInfer<RadioContext<RowMountAttribute<Message, Requirements>>>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  const { shape, size, reducedMotion } = resolvePresentation(context)
  const compact = size.variant === 'compact'
  const item = context.values.find((candidate) => candidate.index === props.index)
  const selected = item !== undefined && radioItemSelected(context, item)
  const active = context.activeIndex === props.index
  const mark = context.marks.find((slot) => slot.index === props.index)

  return h.div(
    [
      ...context.itemMount,
      h.DataAttribute('fluid-hover-index', String(props.index)),
      ...hoverItemAttributes(props.index, false, context.activeIndex),
      h.Tabindex(selected || (!context.hasSelection && props.index === 0) ? 0 : -1),
      h.Role('radio'),
      h.AriaChecked(selected),
      h.AriaLabel(props.label),
      h.Class(
        cn(
          `relative z-10 flex ${compact ? 'min-h-7 py-2' : 'min-h-9 py-3'} items-center ${size.gap} ${shape.item} ${size.px} cursor-pointer outline-none`,
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    [
      h.div(
        [h.Class(cn('relative shrink-0', compact ? 'w-[14px] h-[14px]' : 'w-[16px] h-[16px]'))],
        [
          h.div([
            h.Class(
              cn(
                'absolute inset-0 rounded-full border-solid transition-[border-color] duration-80',
                selectionBorder(selected, active),
              ),
            ),
          ]),
          mark
            ? context.animate(
                h.div(
                  [
                    ...mark.completion,
                    h.Class('absolute inset-0 flex items-center justify-center'),
                  ],
                  [
                    h.div([
                      h.Class(
                        cn(
                          'rounded-full bg-foreground',
                          compact ? 'w-[7px] h-[7px]' : 'w-[8px] h-[8px]',
                        ),
                      ),
                    ]),
                  ],
                ),
                {
                  initial: mark.initial ? { opacity: 0, scale: 0.3 } : false,
                  animate: { opacity: 1, scale: 1 },
                  exit: { opacity: 0, scale: 0.3, transition: { duration: 0.04 } },
                  transition: spring.fast,
                  present: mark.present,
                  reducedMotion,
                },
              )
            : null,
        ],
      ),
      h.span(
        [h.Class(cn('inline-grid min-w-0 [overflow-wrap:anywhere]', size.text))],
        [
          h.span(
            [
              h.Class('col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic]'),
              h.AriaHidden(true),
              h.Style({ fontVariationSettings: fontWeights.semibold }),
            ],
            [props.label],
          ),
          h.span(
            [
              h.Class(
                cn(
                  'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]',
                  selected || active ? 'text-foreground' : 'text-muted-foreground',
                ),
              ),
              h.Style({
                fontVariationSettings: selected ? fontWeights.semibold : fontWeights.normal,
              }),
            ],
            [props.label],
          ),
        ],
      ),
      ...radioGroupInput(item, selected, context, h),
    ],
  )
}
