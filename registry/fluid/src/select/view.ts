import { Select } from '@foldkit/ui'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Option } from 'effect'
import { childAttributes } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import { SelectComposition, Menu } from './composition.js'
import { Message } from './block.js'
import type { SelectViewInputs } from './block.js'
import { ObserveForm } from './form.js'
import { SelectItem } from '../select-item.js'
import { resolvePresentation } from '../presentation.js'
import { cn } from '../lib/utils.js'

export const selectView = SelectComposition.makeView.withInputs<SelectViewInputs>(
  (model, inputs, h) => {
    const { size, shape } = resolvePresentation(inputs)

    const selected = model.items.find((item) => item.value === model.value)
    let leading: ReadonlyArray<Html> = []

    if (inputs.leading !== undefined) {
      leading = [inputs.leading]
    } else if (inputs.icon !== undefined) {
      leading = [
        inputs.icon(
          {
            size: size.icon,
            strokeWidth: 1.5,
            className:
              'shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80 group-hover:text-foreground group-hover:stroke-[2]',
          },
          h,
        ),
      ]
    } else if (selected !== undefined && inputs.renderIcon !== undefined) {
      leading = [inputs.renderIcon(selected)]
    }

    const invalid = inputs.invalid === true || Boolean(inputs.error)

    return h.div(
      [h.Id(model.id), h.Class('flex flex-col gap-1'), h.OnMount(ObserveForm())],
      [
        Select.view(
          {
            id: `${model.id}-native`,
            value: model.value,
            isDisabled: model.disabled,
            onChange: (value) => Message.NativeSelected({ value }),
            toView: ({ select }) =>
              h.select(
                [
                  ...select,
                  h.Tabindex(-1),
                  h.AriaHidden(true),
                  h.Required(inputs.required ?? false),
                  h.Class('absolute w-px h-px opacity-[0] pointer-events-none'),
                  ...(inputs.name === undefined ? [] : [h.Name(inputs.name)]),
                  ...(inputs.form === undefined ? [] : [h.FormAttr(inputs.form)]),
                ],
                [
                  h.option([h.Value('')], ['']),
                  ...model.items.map((item) =>
                    h.option(
                      [
                        h.Value(item.value),
                        h.Disabled(item.disabled ?? false),
                        h.Selected(model.value === item.value),
                      ],
                      [item.label],
                    ),
                  ),
                ],
              ),
          },
          h,
        ),
        h.block(
          Menu.embedView({
            slotId: model.menu.controller.id,
            model: model.menu,
            viewInputs: {
              ...inputs,
              triggerPressEvent: 'mousedown',
              contentClassName: cn(
                'w-auto',
                `flex flex-col min-w-[var(--anchor-width)] max-h-[min(300px,var(--available-height))] overflow-hidden ${shape.container} select-none outline-none`,
                inputs.contentClassName,
              ),
              contentAttributes: childAttributes([
                h.Role('listbox'),
                h.DataAttribute('fluid-select-modal', 'false'),
                h.AriaLabel(inputs.ariaLabel ?? 'Options'),
              ]),
              trigger: (attributes) =>
                h.button(
                  [
                    ...attributes,
                    h.AriaHasPopup('listbox'),
                    h.Role('combobox'),
                    h.OnKeyDownPreventDefault((key, modifiers) =>
                      model.menu.controller.phase !== 'open' &&
                      key.length === 1 &&
                      key !== ' ' &&
                      !modifiers.ctrlKey &&
                      !modifiers.metaKey &&
                      !modifiers.altKey
                        ? Option.some(Message.TypedCharacter({ character: key }))
                        : Option.none(),
                    ),
                    h.AriaLabel(
                      inputs.ariaLabel ?? selected?.label ?? inputs.placeholder ?? 'Select',
                    ),
                    h.AriaInvalid(invalid),
                    ...(inputs.required === true ? [h.AriaRequired(true)] : []),
                    ...(inputs.error ? [h.AriaDescribedBy(`${model.id}-error`)] : []),
                    h.Class(
                      cn(
                        'group inline-flex items-center justify-between outline-none cursor-pointer transition-[color,background-color,border-radius,box-shadow,opacity] duration-80 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                        inputs.variant === 'borderless'
                          ? 'border border-transparent bg-transparent text-foreground hover:bg-hover'
                          : 'border border-border bg-transparent text-foreground hover:bg-hover',
                        size.control,
                        size.text,
                        size.px,
                        size.gap,
                        shape.input,
                        size.variant === 'compact' ? 'min-w-[128px]' : 'min-w-[160px]',
                        invalid && 'border-destructive/50 hover:border-destructive/50',
                        inputs.className,
                        inputs.triggerClassName,
                      ),
                    ),
                  ],
                  [
                    h.span(
                      [h.Class(cn('flex items-center min-w-0 flex-1', size.gap))],
                      [
                        ...leading,
                        h.span(
                          [
                            ...(selected === undefined ? [h.DataAttribute('placeholder', '')] : []),
                            h.Class(
                              cn(
                                'min-w-0 flex-1 text-left truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1 data-[placeholder]:text-muted-foreground',
                              ),
                            ),
                          ],
                          [selected?.label ?? inputs.placeholder ?? 'Select…'],
                        ),
                      ],
                    ),
                    h.svg(
                      [
                        h.Width(String(size.icon)),
                        h.Height(String(size.icon)),
                        h.ViewBox('0 0 24 24'),
                        h.Fill('none'),
                        h.Stroke('currentColor'),
                        h.StrokeWidth('2'),
                        h.StrokeLinecap('round'),
                        h.StrokeLinejoin('round'),
                        h.Class(
                          'shrink-0 text-muted-foreground transition-colors duration-80 group-hover:text-foreground',
                        ),
                      ],
                      [h.path([h.D('M6 9l6 6 6-6')])],
                    ),
                  ],
                ),
              content: (context) =>
                model.items.flatMap((item, index) => {
                  const itemIcon =
                    inputs.renderIcon === undefined ? inputs.itemIconFor?.(item) : undefined
                  const itemProps = {
                    ...(itemIcon === undefined ? {} : { icon: itemIcon }),
                    index,
                    label: item.label,
                    disabled: item.disabled ?? false,
                    checked: item.value === model.value,
                    animate: inputs.animate,
                    attributes: childAttributes([h.DataAttribute('value', item.value)]),
                  }

                  return [
                    ...(item.group !== undefined && item.group !== model.items[index - 1]?.group
                      ? [
                          h.div(
                            [
                              h.Class(
                                `${size.itemPx} py-1 ${size.type.caption} text-muted-foreground`,
                              ),
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
                      context,
                      h,
                    ),
                  ]
                }),
            },
          }),
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
      ],
    )
  },
)
