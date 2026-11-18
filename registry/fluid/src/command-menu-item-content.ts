/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { popupShape } from './lib/shape.js'
import { cn } from './lib/utils.js'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import type { CommandMenuItem, CommandMenuViewInputs } from './command-menu-contracts.js'
import { CommandMenuShortcut } from './command-menu-parts.js'
import { resolvePresentation } from './presentation.js'

export const commandMenuItemContent: <Message>(
  item: CommandMenuItem,
  inputs: CommandMenuViewInputs,
  active: boolean,
  h: HtmlBuilder<Message>,
) => ReadonlyArray<Html> = function commandMenuItemContent<Message>(
  item: CommandMenuItem,
  inputs: CommandMenuViewInputs,
  active: boolean,
  h: HtmlBuilder<Message>,
) {
  const { size } = resolvePresentation(inputs)
  const icon = inputs.renderIcon === undefined ? inputs.itemIconFor?.(item) : undefined
  return [
    ...(icon === undefined
      ? []
      : [
          icon(
            {
              size: size.icon,
              strokeWidth: active ? 2 : 1.5,
              className: 'shrink-0 transition-[color,stroke-width] duration-80',
            },
            h,
          ),
        ]),
    ...(inputs.renderIcon === undefined ? [] : [inputs.renderIcon(item)]),
    ...(inputs.renderItemLabel === undefined
      ? [
          h.span(
            [h.Class('flex min-w-0 flex-1 items-baseline gap-2')],
            [
              h.span(
                [h.Class('truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1')],
                [item.label],
              ),
              ...(item.description === undefined || item.description === ''
                ? []
                : [
                    h.span(
                      [
                        h.Class(
                          'min-w-0 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1 text-muted-foreground',
                        ),
                      ],
                      [item.description],
                    ),
                  ]),
            ],
          ),
        ]
      : inputs.renderItemLabel(item)),
    ...(item.shortcut === undefined
      ? []
      : [CommandMenuShortcut({ ...inputs, keys: item.shortcut }, h)]),
  ] satisfies ReadonlyArray<Html>
}

export const commandMenuItemView: <Message>(
  props: {
    readonly item: CommandMenuItem
    readonly index: number
    readonly active: number | null
    readonly id: string
    readonly total: number
    readonly virtualized: boolean
    readonly inputs: CommandMenuViewInputs
    readonly attributes: ReadonlyArray<ChildAttribute>
    readonly select: (value: string) => Message
  },
  h: HtmlBuilder<Message>,
) => Html = function commandMenuItemView<Message>(
  props: {
    readonly item: CommandMenuItem
    readonly index: number
    readonly active: number | null
    readonly id: string
    readonly total: number
    readonly virtualized: boolean
    readonly inputs: CommandMenuViewInputs
    readonly attributes: ReadonlyArray<ChildAttribute>
    readonly select: (value: string) => Message
  },
  h: HtmlBuilder<Message>,
) {
  const { item, index, active, id, inputs } = props
  const { size, shape } = resolvePresentation(inputs)
  const view = h.div(
    [
      h.Key(item.value),
      h.Id(`${id}-item-${index}`),
      h.Role('option'),
      h.AriaSelected(active === index),
      h.AriaDisabled(item.disabled === true),
      ...(props.virtualized ? [h.AriaPosinset(index + 1), h.AriaSetsize(props.total)] : []),
      h.DataAttribute('command-value', item.value),
      h.DataAttribute('fluid-hover-index', String(index)),
      ...props.attributes,
      h.Class(
        cn(
          `relative z-10 flex shrink-0 items-center select-none outline-none ${size.control} ${size.itemPx} ${size.gap} ${size.text} ${popupShape(shape.variant).item} cursor-pointer transition-[color] duration-80`,
          active === index ? 'text-foreground' : 'text-muted-foreground',
          item.disabled === true && 'opacity-50 pointer-events-none',
        ),
      ),
      ...(item.disabled === true ? [] : [h.OnClick(props.select(item.value))]),
    ],
    inputs.renderItemContent?.(item) ?? commandMenuItemContent(item, inputs, active === index, h),
  )
  return (
    inputs.renderItem === undefined ? view : inputs.renderItem(item, index, view)
  ) satisfies Html
}
