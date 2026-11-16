// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { SidebarInput } from './sidebar-parts.js'
import { resolvePresentation, type Presentation } from './presentation.js'

export interface SidebarSearchFieldProps<Message> extends Presentation {
  readonly placeholder?: string
  readonly shortcut?: string | null
  readonly attributes?: ReadonlyArray<Attribute<Message>>
}
export function SidebarSearchField<Message>(
  props: SidebarSearchFieldProps<Message>,
  h: HtmlBuilder<Message>,
): Html {
  const { size, icons } = resolvePresentation(props)
  const shortcut = props.shortcut === undefined ? '⌘K' : props.shortcut
  return h.div(
    [h.Class('group/search relative')],
    [
      icons.search(
        {
          size: size.icon,
          strokeWidth: 1.5,
          className:
            'pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground',
        },
        h,
      ),
      SidebarInput(
        {
          ...props,
          placeholder: props.placeholder ?? 'Search…',
          className: 'pl-8 pr-12',
          attributes: [h.AriaLabel('Search'), ...(props.attributes ?? [])],
        },
        h,
      ),
      ...(shortcut
        ? [
            h.kbd(
              [
                h.Class(
                  'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-sans text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] text-muted-foreground opacity-0 transition-opacity duration-80 group-hover/search:opacity-100 group-focus-within/search:opacity-100',
                ),
              ],
              [shortcut],
            ),
          ]
        : []),
    ],
  )
}
