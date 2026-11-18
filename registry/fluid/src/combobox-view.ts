import { comboboxInput } from './combobox-view-input.js'
import { presentedComboboxOptions } from './combobox-options.js'
import { comboboxChips } from './combobox-view-chips.js'
import { Array, Option } from 'effect'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html } from 'foldkit/html'
import {
  Composition,
  Message,
  Popup,
  Hover,
  Highlight,
  Selection,
  Scroll,
  ObserveField,
} from './combobox-definition.js'
import type { SelectOption } from './select.js'
import { SelectItem } from './select-item.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Icon, Presentation, PresentationContext } from './presentation.js'
import type { MotionOptions } from './motion.js'
import { dropdownHighlightMotion, dropdownSelectionMotion } from './dropdown-motion.js'
import { popupScrollAreaClass, popupViewportClass } from './lib/popup.js'
import { spring } from './lib/springs.js'
import { popupShape } from './lib/shape.js'
import { cn } from './lib/utils.js'
export interface ComboboxViewInputs extends Presentation {
  readonly placeholder?: string
  readonly ariaLabel?: string
  readonly name?: string
  readonly form?: string
  readonly required?: boolean
  readonly invalid?: boolean
  readonly error?: string
  readonly clearable?: boolean
  readonly variant?: 'bordered' | 'borderless'
  /** Typed field icon; explicit leading HTML takes precedence. */
  readonly icon?: Icon
  readonly leading?: Html
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly createLabel?: (query: string) => string
  readonly filter?: (item: SelectOption, query: string) => boolean
  /** Typed popup icons; raw renderIcon overrides these. */
  readonly itemIconFor?: (item: SelectOption) => Icon | undefined
  readonly renderIcon?: (item: SelectOption) => Html
  readonly emptyText?: string
  readonly allSelectedText?: string
  readonly animate: (node: Html, options: MotionOptions) => Html
}
export const view = Composition.makeView.withInputs<ComboboxViewInputs>((model, inputs, h) => {
  const { size, shape } = resolvePresentation(inputs)
  const inputIcon =
    inputs.leading === undefined && inputs.icon !== undefined
      ? inputs.icon(
          {
            size: size.icon,
            strokeWidth: 1.5,
            className:
              'shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80 group-focus-within:text-foreground group-focus-within:stroke-[2]',
          },
          h,
        )
      : undefined
  const leading =
    inputs.leading !== undefined
      ? inputs.leading
      : inputIcon === undefined
        ? undefined
        : model.multiple
          ? h.span(
              [
                h.Class(
                  cn('flex shrink-0 items-center', size.variant === 'compact' ? 'h-5' : 'h-6'),
                ),
              ],
              [inputIcon],
            )
          : inputIcon
  const { presented, query } = presentedComboboxOptions(model, inputs)
  const activeIndex = Option.getOrNull(model.activeIndex)
  const fieldHeight = Option.getOrNull(model.fieldHeight)
  const active = activeIndex === null ? undefined : presented[activeIndex]
  const invalid = inputs.invalid === true || Boolean(inputs.error)
  const fieldButton = cn(
    'flex shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-80 hover:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
    size.variant === 'compact' ? 'size-5' : 'size-6',
    shape.variant === 'sharp'
      ? 'rounded-[1px]'
      : shape.variant === 'pill'
        ? 'rounded-full'
        : 'rounded-md',
  )
  const listId = `${model.id}-list`
  let fieldControl = size.control
  if (model.multiple) {
    fieldControl =
      size.variant === 'compact' ? '!items-start min-h-7 py-1' : '!items-start min-h-9 py-1.5'
  }
  const icon = (path: string, stroke = '1.5') =>
    h.svg(
      [
        h.Width(String(size.icon)),
        h.Height(String(size.icon)),
        h.ViewBox('0 0 24 24'),
        h.Fill('none'),
        h.Stroke('currentColor'),
        h.StrokeWidth(stroke),
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
        h.Class('shrink-0'),
      ],
      [h.path([h.D(path)])],
    )
  const chips = comboboxChips(model, inputs, h)
  const input = comboboxInput(model, inputs, h, active !== undefined)
  const rows = (context: PresentationContext) =>
    h.block(
      Hover.embedView({
        slotId: model.hover.id,
        model: model.hover,
        viewInputs: {
          className: 'relative flex flex-col p-1 outline-none data-[empty]:p-0',
          attributes: childAttributes([
            h.Id(listId),
            h.Role('listbox'),
            h.AriaMultiSelectable(model.multiple),
            ...(presented.length === 0 ? [h.DataAttribute('empty', '')] : []),
          ]),
          content: () => [
            ...(model.open
              ? [
                  h.block(
                    Selection.embedView({
                      slotId: model.selection.id,
                      model: model.selection,
                      viewInputs: { animate: dropdownSelectionMotion(inputs.animate) },
                    }),
                  ),
                  h.block(
                    Highlight.embedView({
                      slotId: model.highlight.id,
                      model: model.highlight,
                      viewInputs: {
                        className: popupShape(shape.variant).bg,
                        mode: model.hover.mode,
                        animate: dropdownHighlightMotion(inputs.animate, 'hover', null),
                      },
                    }),
                  ),
                ]
              : []),
            ...Array.match(presented, {
              onEmpty: () => [
                h.div(
                  [
                    h.Class(
                      cn(
                        `my-auto px-3 text-center text-muted-foreground [&:not(:empty)]:py-6 ${size.text}`,
                        'min-h-(--fluid-results-height,64px)',
                      ),
                    ),
                    h.DataAttribute('fluid-empty-results', ''),
                  ],
                  [
                    Array.match(model.items, {
                      onEmpty: () => inputs.emptyText ?? 'No results found.',
                      onNonEmpty: () =>
                        model.hideSelected && model.multiple && query === ''
                          ? (inputs.allSelectedText ?? 'All selected')
                          : (inputs.emptyText ?? 'No results found.'),
                    }),
                  ],
                ),
              ],
              onNonEmpty: () => [],
            }),
            ...presented.flatMap((item, index) => {
              const itemIcon =
                inputs.renderIcon === undefined ? inputs.itemIconFor?.(item) : undefined
              const itemProps = {
                ...(itemIcon === undefined ? {} : { icon: itemIcon }),
                id: `${model.id}-item-${index}`,
                index,
                label: item.label,
                disabled: item.disabled ?? false,
                checked: model.values.includes(item.value),
                animate: inputs.animate,
                attributes: childAttributes([
                  h.DataAttribute('combo-value', item.value),
                  ...(item.disabled === true
                    ? []
                    : [h.OnClick(Message.Committed({ value: item.value }))]),
                ]),
              }
              return [
                ...(item.group !== undefined && item.group !== presented[index - 1]?.group
                  ? [
                      h.div(
                        [
                          h.Class(`${size.itemPx} py-1 text-muted-foreground ${size.type.caption}`),
                          h.Role('presentation'),
                        ],
                        [item.group],
                      ),
                    ]
                  : []),
                SelectItem(
                  inputs.renderIcon === undefined
                    ? itemProps
                    : { ...itemProps, leading: inputs.renderIcon(item) },
                  {
                    id: model.id,
                    activeIndex,
                    multiple: model.multiple,
                    inMenu: true,
                    context,
                  },
                  h,
                ),
              ]
            }),
          ],
        },
      }),
    )
  const clearControls = () =>
    inputs.clearable === true
      ? [
          h.span(
            [
              h.Key('clear-slot'),
              h.Class(
                cn(
                  'flex shrink-0 items-center justify-center',
                  size.variant === 'compact' ? 'size-5' : 'size-6',
                ),
              ),
            ],
            Array.match(model.values, {
              onEmpty: () => model.query === '',
              onNonEmpty: () => false,
            })
              ? []
              : [
                  h.button(
                    [
                      h.Key('clear'),
                      h.Type('button'),
                      h.DataAttribute('combo-clear', ''),
                      h.AriaLabel('Clear selection'),
                      h.OnClick(Message.Cleared()),
                      h.Class(
                        cn(
                          fieldButton,
                          'relative before:absolute before:-inset-x-0.5 hover:bg-hover active:bg-active transition-[color,background-color]',
                          size.variant === 'compact' ? 'before:-inset-y-1' : 'before:-inset-y-1.5',
                          shape.variant === 'pill' && 'rounded-full',
                        ),
                      ),
                    ],
                    [icon('M6 6l12 12M6 18L18 6')],
                  ),
                ],
          ),
        ]
      : []
  const fieldContents = () =>
    model.multiple
      ? [
          h.div(
            [
              h.Key('chip-rows'),
              h.DataAttribute('combo-chip-rows', ''),
              h.Class(
                cn(
                  'relative flex min-w-0 flex-1 flex-wrap items-center gap-1',
                  Array.match(model.values, {
                    onEmpty: () => '',
                    onNonEmpty: () => (leading === undefined ? '-ml-1' : ''),
                  }),
                ),
              ),
            ],
            [...chips, h.span([h.Key('input-slot'), h.Class('flex min-w-6 flex-auto')], [input])],
          ),
        ]
      : [input]
  return h.div(
    [
      h.Id(model.id),
      h.OnMount(ObserveField({ id: model.id })),
      h.Class(cn('relative flex flex-col gap-1', inputs.className)),
      ...(inputs.attributes ?? []),
    ],
    [
      ...model.values.map((value) =>
        h.input([
          h.Key(`form:${value}`),
          h.Type('hidden'),
          h.Value(value),
          ...(inputs.name === undefined ? [] : [h.Name(inputs.name)]),
          ...(inputs.form === undefined ? [] : [h.FormAttr(inputs.form)]),
        ]),
      ),
      inputs.animate(
        h.div(
          [
            h.Key('field'),
            h.Id(`${model.id}-field`),
            h.DataAttribute('combo-field', ''),
            h.DataAttribute('combo-pad-y', size.variant === 'compact' ? '8' : '12'),
            h.Class(
              cn(
                'group flex items-center ring-1 cursor-text',
                'transition-[color,background-color,border-radius,box-shadow,opacity] duration-80',
                'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
                inputs.variant === 'borderless'
                  ? 'ring-transparent bg-transparent hover:bg-muted/50 hover:ring-border focus-within:bg-card focus-within:ring-border'
                  : 'ring-border bg-transparent hover:bg-muted/50 focus-within:bg-card',
                shape.input,
                size.gap,
                size.variant === 'compact' ? 'px-2 min-w-[128px]' : 'px-2.5 min-w-[160px]',
                fieldControl,
                model.disabled && 'opacity-50 pointer-events-none',
                invalid &&
                  'ring-destructive/50 hover:ring-destructive/50 focus-within:ring-destructive/50',
              ),
            ),
          ],
          [
            h.button([
              h.Key('dismiss'),
              h.Type('button'),
              h.Tabindex(-1),
              h.AriaLabel('Dismiss'),
              h.DataAttribute('combo-dismiss', ''),
              h.Class('sr-only'),
              h.Hidden(!model.open),
              h.OnClick(Message.ClosedByField()),
            ]),
            ...(leading === undefined ? [] : [leading]),
            ...fieldContents(),
            ...clearControls(),
            h.button(
              [
                h.Key('toggle'),
                h.Type('button'),
                h.Tabindex(-1),
                h.DataAttribute('combo-toggle', ''),
                h.AriaLabel('Toggle options'),
                h.AriaExpanded(model.open),
                h.AriaControls(listId),
                h.OnClick(model.open ? Message.ClosedByField() : Message.OpenedByField()),
                h.Class(fieldButton),
              ],
              [icon('M6 9l6 6 6-6', '2')],
            ),
          ],
        ),
        {
          initial: false,
          animate: model.multiple && fieldHeight !== null ? { height: fieldHeight } : {},

          reducedMotion: 'never',
          transition: spring.fast,
        },
      ),
      ...(inputs.error !== undefined && inputs.error !== ''
        ? [
            h.span(
              [
                h.Id(`${model.id}-error`),
                h.Role('alert'),
                h.Class(
                  'text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] text-destructive pl-3',
                ),
              ],
              [inputs.error],
            ),
          ]
        : []),
      h.block(
        Popup.embedView({
          slotId: model.popup.id,
          model: model.popup,
          viewInputs: {
            animate: inputs.animate,
            context: createPresentationContext(inputs),
            content: (context) => [
              h.block(
                Scroll.embedView({
                  slotId: model.scroll.id,
                  model: model.scroll,
                  viewInputs: {
                    className: cn(popupScrollAreaClass, '[&:not(:has([role=option]))]:flex-none'),
                    viewportClassName: cn(
                      popupViewportClass,
                      'scroll-fade max-h-[min(300px,var(--available-height))]',
                    ),
                    children: [],
                    content: () => [rows(context)],
                  },
                }),
              ),
            ],
          },
        }),
      ),
    ],
  )
})
