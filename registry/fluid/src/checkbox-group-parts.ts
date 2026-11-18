import { selectionBorder, selectionMarker } from './selection-group-style.js'
import { checkboxRowLabelId } from './checkbox-group-control.js'
import type { RenderCheckboxRow } from './checkbox-group-control.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { fontWeights } from './lib/font-weight.js'
import { hoverItemAttributes } from './hover.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { preserveCheckboxReset } from './checkbox-group-input.js'
import { keepSwitchInputDefault } from './switch-input.js'
import type { CheckboxValue, CheckboxMark } from './checkbox-group-state.js'
import type { TargetMotionOptions } from './motion-target.js'

export const CheckboxItem: <Message, Requirements>(
  props: NoInfer<CheckboxItemProps<Message, Requirements>>,
  context: NoInfer<CheckboxContext<RowMountAttribute<Message, Requirements>>>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CheckboxItem<Message, Requirements>(
  props: NoInfer<CheckboxItemProps<Message, Requirements>>,
  context: NoInfer<CheckboxContext<RowMountAttribute<Message, Requirements>>>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { size, shape, reducedMotion } = resolvePresentation(context)
  const compact = size.variant === 'compact'
  const active = context.activeIndex === props.index
  const checked = context.checkedItems.find((item) => item.index === props.index)?.checked ?? false
  const mark = context.marks.find((slot) => slot.index === props.index)

  const marker = selectionMarker(checked)
  const state = [h.DataAttribute(marker.name, marker.value)]

  const square = h.span

  return context.checkbox({ index: props.index, label: props.label, checked }, (attributes) =>
    h.div(
      [
        ...attributes,
        ...context.itemMount,
        h.DataAttribute('fluid-hover-index', String(props.index)),
        ...hoverItemAttributes(props.index, false, context.activeIndex),
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
        square(
          [
            h.Tabindex(-1),
            h.Role('checkbox'),
            h.AriaChecked(checked),
            h.AriaHidden(true),
            ...state,
            h.Class(
              cn(
                'relative shrink-0 appearance-none bg-transparent p-0 border-0 outline-none cursor-pointer',
                compact ? 'w-[14px] h-[14px]' : 'w-[16px] h-[16px]',
              ),
            ),
          ],
          [
            h.div([
              h.Class(
                cn(
                  'absolute inset-0 border-solid transition-[border-color] duration-80',
                  shape.variant === 'sharp'
                    ? 'rounded-none'
                    : compact
                      ? 'rounded-[4px]'
                      : 'rounded-[5px]',
                  selectionBorder(checked, active),
                ),
              ),
            ]),
            mark
              ? h.svg(
                  [
                    h.Width(compact ? '16' : '18'),
                    h.Height(compact ? '16' : '18'),
                    h.ViewBox('0 0 24 24'),
                    h.Fill('none'),
                    h.Stroke('currentColor'),
                    h.StrokeWidth('2'),
                    h.StrokeLinecap('round'),
                    h.StrokeLinejoin('round'),
                    h.Class(
                      'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground',
                    ),
                  ],
                  [
                    context.animate(h.path([h.D('M6 12L10 16L18 8'), ...mark.completion]), {
                      initial: mark.initial ? { pathLength: 0 } : false,
                      present: mark.present,
                      animate: { pathLength: 1, transition: { duration: 0.08, ease: 'easeOut' } },
                      exit: { pathLength: 0, transition: { duration: 0.04, ease: 'easeIn' } },
                      reducedMotion,
                    }),
                  ],
                )
              : null,
          ],
        ),
        preserveCheckboxReset(
          keepSwitchInputDefault(
            h.input([
              h.Type('checkbox'),
              h.Tabindex(-1),
              h.AriaHidden(true),
              h.Checked(checked),
              h.Class(
                '[clip-path:inset(50%)] overflow-hidden whitespace-nowrap [border:0] p-0 w-px h-px m-0 fixed top-0 left-0',
              ),
            ]),
            context.initialChecked.find((item) => item.index === props.index)?.checked ?? false,
          ),
          checked,
          true,
        ),
        h.span(
          [
            h.Id(checkboxRowLabelId(context.id, props.index)),
            h.Class(cn('inline-grid min-w-0 [overflow-wrap:anywhere]', size.text)),
          ],
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
                    checked || active ? 'text-foreground' : 'text-muted-foreground',
                  ),
                ),
                h.Style({
                  fontVariationSettings: checked ? fontWeights.semibold : fontWeights.normal,
                }),
              ],
              [props.label],
            ),
          ],
        ),
      ],
    ),
  ) satisfies Html
}

type RowMountAttribute<Message, Requirements> = Extract<
  NonNullable<Parameters<HtmlBuilder<Message, Requirements>['div']>[0]>[number],
  { readonly __childAttribute: true }
>

export interface CheckboxContext<MountAttribute = ChildAttribute> extends Presentation {
  readonly checkbox: RenderCheckboxRow
  readonly id: string
  readonly checkedIndices: ReadonlyArray<number>
  readonly checkedItems: ReadonlyArray<CheckboxValue>
  readonly initialChecked: ReadonlyArray<CheckboxValue>
  readonly hasForm: boolean
  readonly marks: ReadonlyArray<
    CheckboxMark & { readonly completion: ReadonlyArray<ChildAttribute> }
  >
  readonly activeIndex: number | null
  readonly itemMount: ReadonlyArray<MountAttribute>
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
}

export interface CheckboxItemProps<Message, Requirements = never> {
  readonly label: string
  readonly index: number
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message, Requirements>>
}
