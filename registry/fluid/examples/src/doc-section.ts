import { codeBlock } from '../../../../components/docs/code-block'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { fontWeights } from '@foldkit-visuals/fluid/tokens'
import type { Presentation } from '@foldkit-visuals/fluid/presentation'
import type { Html, HtmlBuilder } from 'foldkit/html'

const minHeights: Readonly<Record<number, { readonly preview: string; readonly code: string }>> = {
  120: { preview: 'min-h-[120px]', code: '[&_pre]:min-h-[120px]' },
  160: { preview: 'min-h-[160px]', code: '[&_pre]:min-h-[160px]' },
  200: { preview: 'min-h-[200px]', code: '[&_pre]:min-h-[200px]' },
  220: { preview: 'min-h-[220px]', code: '[&_pre]:min-h-[220px]' },
  360: { preview: 'min-h-[360px]', code: '[&_pre]:min-h-[360px]' },
  420: { preview: 'min-h-[420px]', code: '[&_pre]:min-h-[420px]' },
}

// The body stays mounted while reading code: drafts, focus targets and springs belong to it.
export const docSection = <M>(
  h: HtmlBuilder<M>,
  options: {
    readonly title: string
    readonly children: ReadonlyArray<Html>
    readonly source: string
    readonly pane: 'preview' | 'code'
    readonly tabs: Html
    readonly tabsId: string
    readonly presentation: Presentation
    readonly className?: string
    readonly description?: string
    readonly previewMinHeight?: number
    readonly previewHeight?: number
    readonly previewPadding?: 'none' | 'compact'
    readonly hideHeader?: boolean
    readonly caption?: string
    readonly previewAlign?: 'bottom' | 'top'
    readonly actions?: ReadonlyArray<Html>
  },
) => {
  const shape = resolvePresentation(options.presentation).shape
  const minHeight = minHeights[options.previewMinHeight ?? 120]
  const frame = h.div(
    [
      h.Class(
        `relative isolate flex flex-col gap-0 w-full border border-border/60 transition-[border-color] duration-150 ease-out focus-within:border-foreground/40 ${shape.container} authored-frame`,
      ),
      h.DataAttribute('component-preview', ''),
    ],
    [
      options.hideHeader
        ? null
        : h.div(
            [
              h.Class(
                'relative z-[70] flex items-center gap-0 px-3 py-3 min-h-[52px] border-b border-border/60 bg-background reference-toolbar',
              ),
              h.Style({ borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' }),
            ],
            [
              options.tabs,
              ...(options.actions?.length
                ? [h.div([h.Class('ml-auto flex items-center gap-1')], options.actions)]
                : []),
            ],
          ),
      h.div(
        [
          h.Class('overflow-hidden'),
          h.Style(
            options.hideHeader
              ? { borderRadius: 'inherit' }
              : { borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' },
          ),
        ],
        [
          h.div(
            [
              h.Id(`${options.tabsId}-panel-0`),
              h.Role('tabpanel'),
              h.AriaLabelledBy(`${options.tabsId}-tab-0`),
              h.Tabindex(-1),
              h.Class(
                `relative flex outline-none ${
                  options.previewAlign === 'bottom'
                    ? 'items-end'
                    : options.previewAlign === 'top'
                      ? 'items-start'
                      : 'items-center'
                } justify-center ${minHeight?.preview ?? ''} bg-background ${
                  options.previewPadding === 'none'
                    ? ''
                    : options.previewPadding === 'compact'
                      ? 'px-4 py-4'
                      : 'px-4 py-12 sm:px-8'
                } authored-preview${options.pane === 'preview' ? '' : ' hidden'}`,
              ),
              h.Style({
                ...(options.previewHeight === undefined
                  ? {}
                  : { height: `${options.previewHeight}px` }),
                ...(minHeight === undefined && options.previewMinHeight !== undefined
                  ? { minHeight: `${options.previewMinHeight}px` }
                  : {}),
              }),
            ],
            options.className === undefined
              ? options.children
              : [h.div([h.Class(options.className)], options.children)],
          ),
          h.div(
            [
              h.Id(`${options.tabsId}-panel-1`),
              h.Role('tabpanel'),
              h.AriaLabelledBy(`${options.tabsId}-tab-1`),
              h.Class(
                `overflow-auto text-site-body [&_pre]:m-0 [&_pre]:p-4 ${
                  minHeight?.code ?? ''
                }${options.pane === 'code' ? '' : ' hidden'}`,
              ),
            ],
            options.pane === 'code'
              ? [
                  codeBlock(
                    {
                      code: options.source,
                      label: `${options.title} code`,
                      ...options.presentation,
                    },
                    h,
                  ),
                ]
              : [],
          ),
        ],
      ),
    ],
  )

  return h.section(
    [h.Class('flex flex-col gap-4 pt-6 reference-section'), h.AriaLabel(options.title)],
    [
      options.title
        ? h.h2(
            [
              h.Class('-mb-2 text-site-title text-foreground leading-none'),
              h.Style({ fontVariationSettings: fontWeights.semibold }),
            ],
            [options.title],
          )
        : null,
      options.description
        ? h.p(
            [h.Class('text-site-body text-muted-foreground reference-muted')],
            [options.description],
          )
        : null,
      options.caption
        ? h.div(
            [h.Class('flex flex-col gap-3')],
            [
              frame,
              h.p(
                [h.Class('pb-2 text-center text-site-caption text-muted-foreground')],
                [options.caption],
              ),
            ],
          )
        : frame,
    ],
  )
}
