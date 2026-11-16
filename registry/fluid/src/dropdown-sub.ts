// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Html, HtmlBuilder } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import { DropdownItem } from './dropdown-item.js'
import type { DropdownItemContext, DropdownItemProps } from './dropdown-item.js'
import { resolvePresentation } from './presentation.js'
import { cn } from './lib/utils.js'

export type DropdownSubTriggerProps = Omit<DropdownItemProps, 'checked' | 'closeOnClick'>

export function DropdownSubTrigger<Message>(
  props: DropdownSubTriggerProps,
  context: DropdownItemContext,
  h: HtmlBuilder<Message>,
): Html {
  const { size, icons } = resolvePresentation(context)

  const lit = context.activeIndex === props.index

  return DropdownItem(
    {
      ...props,
      closeOnClick: false,
      attributes: [
        ...(props.attributes ?? []),
        ...childAttributes([h.DataAttribute('kind', 'submenu')]),
      ],
      children: [
        ...(props.children ?? []),
        h.span(
          [h.AriaHidden(true), h.Class('inline-grid shrink-0 rtl:-scale-x-100')],
          [
            icons['chevron-right'](
              {
                size: size.icon,
                strokeWidth: lit ? 2 : 1.5,
                className: cn(
                  'transition-[color,stroke-width] duration-80',
                  lit ? 'text-foreground' : 'text-muted-foreground',
                ),
              },
              h,
            ),
          ],
        ),
      ],
    },
    context,
    h,
  )
}
