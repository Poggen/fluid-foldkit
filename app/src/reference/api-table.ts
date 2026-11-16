import type { PresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { HtmlBuilder } from 'foldkit/html'
import type { ReferenceData } from './data'
type Prop = (typeof ReferenceData.Type)['contracts'][number]['props'][number]
export const apiTable = <M>(
  props: ReadonlyArray<Prop>,
  _context: PresentationContext,
  h: HtmlBuilder<M>,
) => {
  const hasDefaults = props.some((prop) => typeof prop.defaultValue === 'string')
  const hasDescriptions = props.some((prop) => prop.description.trim().length > 0)
  return h.table(
    [
      h.Class(
        'w-full min-w-[520px] text-site-body border-collapse [&_th:first-child]:pl-0 [&_td:first-child]:pl-0',
      ),
    ],
    [
      h.thead(
        [],
        [
          h.tr(
            [h.Class('border-b border-border')],
            [
              'Prop',
              'Type',
              ...(hasDefaults ? ['Default'] : []),
              ...(hasDescriptions ? ['Description'] : []),
            ].map((label) =>
              h.th(
                [
                  h.Scope('col'),
                  h.Class('px-3 py-2 text-left text-foreground'),
                  h.Style({ fontVariationSettings: "'wght' 550, 'opsz' 18" }),
                ],
                [label],
              ),
            ),
          ),
        ],
      ),
      h.tbody(
        [],
        props.map((prop) =>
          h.tr(
            [h.Class('border-b border-border/40')],
            [
              h.td(
                [
                  h.Class(
                    'px-3 py-2 text-foreground font-mono text-site-caption whitespace-nowrap',
                  ),
                ],
                [
                  prop.name,
                  ...(prop.optional ? [] : [h.span([h.Class('sr-only')], [' (required)'])]),
                ],
              ),
              h.td(
                [
                  h.Class('px-3 py-2 text-muted-foreground font-mono text-site-caption'),
                  h.Title(prop.type),
                ],
                [prop.type.replaceAll(/import\("[^"]+"\)\./gu, '')],
              ),
              ...(hasDefaults
                ? [
                    h.td(
                      [h.Class('px-3 py-2 text-muted-foreground font-mono text-site-caption')],
                      [prop.defaultValue ?? '—'],
                    ),
                  ]
                : []),
              ...(hasDescriptions
                ? [
                    h.td(
                      [h.Class('px-3 py-2 text-muted-foreground')],
                      [prop.description.replaceAll(/\/\*\*?|\*\//gu, '').trim()],
                    ),
                  ]
                : []),
            ],
          ),
        ),
      ),
    ],
  )
}
