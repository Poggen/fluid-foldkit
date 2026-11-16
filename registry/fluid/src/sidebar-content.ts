// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import type { Presentation } from './presentation.js'
import type { ScrollAreaProps } from './scroll-area.js'

interface SidebarContentCommonProps extends Presentation {
  readonly content: () => ReadonlyArray<Html>
  readonly contentClassName?: string
  readonly className?: string
  readonly viewportClassName?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly viewportAttributes?: ReadonlyArray<ChildAttribute>
}

export type SidebarContentProps = SidebarContentCommonProps &
  (
    | { readonly occurrence: 'desktop'; readonly scroll: (inputs: ScrollAreaProps) => Html }
    | { readonly occurrence: 'mobile'; readonly scroll?: never }
  )

// Layout only. The caller owns Scroll, its Binding and the descendant callback frame.
export function SidebarContent<Message, Requirements>(
  inputs: SidebarContentProps,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  if (inputs.occurrence === 'mobile') {
    return h.div(
      [h.Class('scroll-divider [--scroll-divider-inset:8px] flex min-h-0 w-full flex-1 flex-col')],
      [
        h.div(
          [
            h.DataAttribute('sidebar', 'content'),
            h.Class(
              `scroll-fade flex min-h-0 w-full flex-1 flex-col overflow-y-auto ${inputs.className ?? ''} ${inputs.contentClassName ?? ''}`,
            ),
            ...(inputs.attributes ?? []),
          ],
          inputs.content(),
        ),
      ],
    )
  }

  return inputs.scroll({
    ...(inputs.context === undefined ? {} : { context: inputs.context }),
    ...(inputs.shape === undefined ? {} : { shape: inputs.shape }),
    ...(inputs.size === undefined ? {} : { size: inputs.size }),
    ...(inputs.surface === undefined ? {} : { surface: inputs.surface }),
    ...(inputs.hoverMode === undefined ? {} : { hoverMode: inputs.hoverMode }),
    className: `scroll-divider min-h-0 w-full flex-1 ${inputs.className ?? ''}`,
    viewportClassName: `scroll-fade [&>div]:!block [&>div]:!min-w-0 ${inputs.viewportClassName ?? ''}`,
    viewportAttributes: inputs.viewportAttributes ?? [],
    children: [],
    content: () => [
      h.div(
        [
          h.DataAttribute('sidebar', 'content'),
          h.Class(`flex w-full min-w-0 flex-col ${inputs.contentClassName ?? ''}`),
          ...(inputs.attributes ?? []),
        ],
        inputs.content(),
      ),
    ],
  })
}
