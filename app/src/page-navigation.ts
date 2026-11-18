import type { HtmlBuilder } from 'foldkit/html'
import { documentationPages } from '../../lib/catalogue'

export const pageNavigation = <M>(path: string, h: HtmlBuilder<M>) => {
  const index = documentationPages.findIndex((page) => page.href === path)
  if (index < 0) return h.empty
  const previous = documentationPages[index - 1]
  const next = documentationPages[index + 1]
  return h.nav(
    [
      h.AriaLabel('Documentation pages'),
      h.Class('flex items-center justify-between gap-4 border-t border-border pt-6 mt-8'),
    ],
    (
      [
        ['Previous', previous],
        ['Next', next],
      ] as const
    ).map(([direction, page]) =>
      page === undefined
        ? h.span([])
        : h.a(
            [
              h.Href(page.href),
              h.Attribute('rel', direction === 'Previous' ? 'prev' : 'next'),
              h.Class(
                `flex flex-col gap-1 text-site-body text-foreground hover:text-muted-foreground ${direction === 'Next' ? 'ml-auto items-end' : ''}`,
              ),
            ],
            [
              h.span([h.Class('text-site-caption text-muted-foreground')], [direction]),
              `${direction === 'Previous' ? '← ' : ''}${page.name}${direction === 'Next' ? ' →' : ''}`,
            ],
          ),
    ),
  )
}
