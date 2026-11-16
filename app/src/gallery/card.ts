// Derived from Fluid Functionalism cc276ca0 app/components/bento-card.tsx.
// MIT, copyright 2026 Micka Touillaud. See registry/fluid/NOTICE
import { Badge } from '@foldkit-visuals/fluid/badge'
import { Reveal } from '@foldkit-visuals/fluid/reveal'
import { cn, spring } from '@foldkit-visuals/fluid/tokens'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { createKeyedLazy } from 'foldkit/html'
import type { ComponentPage } from '../../../lib/catalogue'
import { motion } from '../motion'
import { presentation, type ResolvedSettings as Settings } from '../settings'
import { fluidFootprints } from './footprints'
import {
  previewRevealClasses,
  tileRightClasses,
  tileSizeClasses,
  tileLargeRowClasses,
} from './card-classes'

const sourcePreviewClasses: Readonly<Record<string, string>> = {
  'input-message': 'w-full max-w-[440px]',
  card: 'w-full max-w-[520px]',
  accordion: 'w-full max-w-[420px]',
  'checkbox-group': 'w-full max-w-[220px]',
  breadcrumb: 'w-full max-w-[420px]',
  dropdown: 'w-full max-w-[280px]',
  'input-copy': 'w-full max-w-[420px] relative z-10',
  'input-group': 'w-full max-w-[320px]',
  'radio-group': 'w-full max-w-[220px]',
  select: 'w-full max-w-[280px]',
  'date-picker': 'flex w-full max-w-[280px] justify-center',
  combobox: 'w-full max-w-[280px]',
  table: 'w-full max-w-[420px]',
  banner: 'w-full max-w-[440px]',
  'ask-user-questions': 'w-full max-w-[420px] self-end',
  'thinking-steps': 'w-full max-w-[380px]',
  'chat-message': 'flex w-full max-w-[300px] flex-col gap-1',
}

const stagePadding = (page: ComponentPage) => {
  if (page.family !== 'fluid') return 'px-6 py-16'
  switch (page.slug) {
    case 'sidebar':
      return 'px-4 py-8'
    case 'table':
      return 'px-6 py-6'
    case 'card':
      return 'px-6 py-5'
    case 'command-menu':
      return 'px-6 py-8'
    case 'calendar':
      return 'px-4 py-2'
    default:
      return 'px-6 py-16'
  }
}

export const previewCard = <M>(
  page: ComponentPage,
  settings: Pick<Settings, 'shape' | 'size' | 'hover'>,
  preview: Html,
  h: HtmlBuilder<M>,
  deferred = false,
  standalone = false,
) => {
  if (standalone) return preview
  // Source TileStage admission changes its content without starting parent projection.
  const layoutDependency = settings.size
  const sharp = settings.shape === 'sharp'
  const footprint = page.family === 'fluid' ? fluidFootprints[page.slug] : undefined
  const tileClasses =
    footprint?.side === 'right' ? tileRightClasses : tileSizeClasses[footprint?.size ?? 'small']
  return Reveal(
    {
      scroll: true,
      className: `${previewRevealClasses} preview-reveal preview-${page.slug} ${tileClasses} ${footprint?.size === 'large' ? tileLargeRowClasses : ''}`,
      attributes: [h.Id(`${page.family}-${page.slug}`)],
      children: [
        motion.node(
          h.div(
            [
              h.Class(
                `relative flex flex-col border overflow-clip outline-none transition-[shadow,border-color] duration-80 bento-card-border ${sharp ? 'rounded-[1px]' : 'rounded-xl'} min-w-0 flex-1 showcase-card`,
              ),
              h.DataAttribute('component', `${page.family}/${page.slug}`),
              h.DataAttribute('preview-href', page.href),
              h.DataAttribute('deferred', String(deferred)),
            ],
            [
              motion.node(
                h.div(
                  [
                    h.Class(
                      cn(
                        'flex-1 min-h-0 flex items-center justify-center px-6 py-16',
                        stagePadding(page),
                        'preview-stage',
                      ),
                    ),
                  ],
                  [
                    Reveal(
                      {
                        scroll: true,
                        className: `reveal-scroll flex size-full min-h-0 items-center justify-center ${deferred ? 'max-md:min-h-[200px]' : ''} preview-content`,
                        children: [
                          !deferred &&
                          page.family === 'fluid' &&
                          sourcePreviewClasses[page.slug] !== undefined
                            ? h.div([h.Class(sourcePreviewClasses[page.slug] ?? '')], [preview])
                            : preview,
                        ],
                      },
                      h,
                    ),
                  ],
                ),
                {
                  layout: 'position',
                  layoutDependency,
                  animate: {},
                  transition: spring.moderate,
                  reducedMotion: 'user',
                },
              ),
              h.div(
                [h.Class(`relative shrink-0 border-t border-border/40 preview-footer`)],
                [
                  h.a(
                    [
                      h.Href(page.href),
                      h.Class(
                        `group/link flex items-center gap-2 px-4 py-3 transition-colors duration-80 hover:bg-hover outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--focus-ring,#6B97FF)] ${sharp ? 'rounded-b-[1px]' : 'rounded-b-xl'}`,
                      ),
                      h.AriaLabel(`View ${page.name} documentation`),
                    ],
                    [
                      motion.node(
                        h.div(
                          [h.Class('flex items-center gap-2')],
                          [
                            h.span(
                              [
                                h.Class(
                                  'text-site-body text-muted-foreground transition-colors duration-80 group-hover/link:text-foreground',
                                ),
                                h.Style({ fontVariationSettings: "'wght' 400, 'opsz' 14" }),
                              ],
                              [page.name],
                            ),
                            page.isNew === true
                              ? Badge(
                                  {
                                    context: presentation(settings),
                                    variant: 'dot',
                                    color: 'accent',
                                    badgeSize: 'sm',
                                    children: ['New'],
                                  },
                                  h,
                                )
                              : null,
                          ],
                        ),
                        {
                          layout: 'position',
                          layoutDependency,
                          animate: {},
                          transition: spring.moderate,
                          reducedMotion: 'user',
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          {
            layout: true,
            layoutDependency,
            animate: {},
            transition: spring.moderate,
            reducedMotion: 'user',
          },
        ),
      ],
    },
    h,
  )
}

export interface PreviewAdmission {
  readonly ready: boolean
  readonly only?: string
  readonly admitted: ReadonlyArray<string>
}
export const previewAdmitted = (page: ComponentPage, inputs: PreviewAdmission) =>
  inputs.ready && (inputs.only !== undefined || inputs.admitted.includes(page.href))
export const previewBody = <M>(
  page: ComponentPage,
  inputs: PreviewAdmission,
  render: () => Html,
  h: HtmlBuilder<M>,
) => (previewAdmitted(page, inputs) ? render() : h.empty)

const renderPreviewCard = <M>(
  page: ComponentPage,
  shape: Settings['shape'],
  size: Settings['size'],
  hover: Settings['hover'],
  preview: Html,
  h: HtmlBuilder<M>,
  deferred: boolean,
  standalone: boolean,
) => previewCard(page, { shape, size, hover }, preview, h, deferred, standalone)
export const makePreviewCard = () => {
  const lazy = createKeyedLazy()
  return <M>(
    page: ComponentPage,
    settings: Pick<Settings, 'shape' | 'size' | 'hover'>,
    preview: Html,
    h: HtmlBuilder<M>,
    deferred = false,
    standalone = false,
  ) =>
    lazy(page.href, renderPreviewCard<M>, [
      page,
      settings.shape,
      settings.size,
      settings.hover,
      preview,
      h,
      deferred,
      standalone,
    ])
}
