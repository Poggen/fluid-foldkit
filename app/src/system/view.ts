import { pageNavigation } from '../page-navigation'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ResolvedSettings } from '../settings'
import { narrative } from './narrative'
import type { SystemPage } from '../../../lib/system'
import { codeBlock } from '../../../components/docs/code-block'
import { presentation } from '../settings'
import { shapeMap } from '@foldkit-visuals/fluid/tokens'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'

export interface PageInputs {
  readonly settings: ResolvedSettings
}
export const headingId = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const section = <M>(
  h: HtmlBuilder<M>,
  title: string,
  children: ReadonlyArray<Html | string>,
  id = headingId(title),
) =>
  h.section(
    [h.Id(id), h.Class('flex flex-col gap-4 pt-6')],
    [h.h2([h.Class('-mb-2 text-site-title text-foreground leading-none')], [title]), ...children],
  )
export const copy = <M>(h: HtmlBuilder<M>, page: SystemPage, title: string) => {
  const source = narrative[page].sections.find((value) => value.title === title)
  return source === undefined
    ? []
    : [
        ...source.paragraphs.map((text) =>
          h.p([h.Class('text-site-body text-muted-foreground')], [text]),
        ),
        ...(source.items.length === 0
          ? []
          : [
              h.ul(
                [h.Class('flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground')],
                source.items.map((text) =>
                  h.li([h.Class('pl-1 text-site-body text-muted-foreground')], [text]),
                ),
              ),
            ]),
      ]
}
export const example = <M>(
  h: HtmlBuilder<M>,
  label: string,
  children: ReadonlyArray<Html | string>,
  settings: ResolvedSettings,
) =>
  h.div(
    [
      h.Class(
        `relative isolate flex flex-col gap-0 w-full border border-border/60 transition-[border-color] duration-150 ease-out focus-within:border-foreground/40 ${resolvePresentation({ context: presentation(settings) }).shape.container} not-typeset`,
      ),
      h.AriaLabel(label),
    ],
    [
      h.div(
        [
          h.Class(
            'relative flex outline-none items-center justify-center min-h-[120px] bg-background px-4 py-12 sm:px-8',
          ),
        ],
        [h.div([h.Class('w-full')], children)],
      ),
    ],
  )
export const snippet = <M>(h: HtmlBuilder<M>, settings: ResolvedSettings, code: string) =>
  codeBlock({ code, filename: 'native-example.ts', context: presentation(settings) }, h)
export const page = <M>(
  h: HtmlBuilder<M>,
  slug: SystemPage,
  settings: Pick<ResolvedSettings, 'shape'>,
  children: ReadonlyArray<Html | string>,
  style: Parameters<HtmlBuilder<M>['Style']>[0] = {},
) => {
  const text = narrative[slug]
  return h.article(
    [
      h.Class(
        'py-20 sm:py-28 w-full max-w-[680px] mx-auto mt-12 lg:mt-0 flex flex-col gap-8 px-6 system-docs typeset',
      ),
      h.DataAttribute('system-page', slug),
      h.Style({
        '--system-frame-radius': `${shapeMap[settings.shape].containerRadius}px`,
        '--system-item-radius': `${shapeMap[settings.shape].bgRadius}px`,
        ...style,
      }),
    ],
    [
      h.header(
        [h.Class('')],
        [
          h.h1([h.Class('text-site-display text-foreground leading-none')], [text.title]),
          h.p([h.Class('mt-2 text-site-body text-muted-foreground')], [text.lead]),
          ...(text.intro ? [h.p([], [text.intro])] : []),
        ],
      ),
      ...children,
      pageNavigation(`/${slug}`, h),
      h.footer(
        [
          h.Class(
            '[.system-docs_&]:[margin-block-start:4rem] [.system-docs_&]:py-6 [.system-docs_&]:[border-block-start:1px_solid_var(--border)] [.system-docs_&]:text-muted-foreground ',
          ),
        ],
        [
          'Adapted from ',
          h.a([h.Href(`https://www.fluidfunctionalism.com/docs/${slug}`)], ['Fluid Functionalism']),
          ' by Micka Touillaud. ',
          h.a(
            [
              h.Href(
                `https://github.com/mickadesign/fluid-functionalism/blob/cc276ca0f40e5ede8cf71d96bff2c0fddf80ea96/app/docs/${slug}/page.tsx`,
              ),
            ],
            ['Original source'],
          ),
          ' · MIT license.',
        ],
      ),
    ],
  )
}
