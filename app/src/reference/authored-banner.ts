import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
// Derived from Fluid Functionalism cc276ca0 Banner docs and MockPage. MIT.
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { childAttributes } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  BannerBlock,
  layer as BannerLayer,
  BannerTitle,
  BannerDescription,
  BannerActions,
  BannerAction,
} from '@foldkit-visuals/fluid/banner'
import type { BannerStatus } from '@foldkit-visuals/fluid/banner'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { DocumentTooltipBlock, layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { target } from '../motion'
import { bannerMotion } from '../gallery/fluid/core-bindings'
import { ComponentPresentation, presentation } from '../settings'
import { documentationRuntime } from '../documentation-runtime'
const statuses: ReadonlyArray<BannerStatus> = ['default', 'info', 'success', 'warning', 'error']
const bannerKeys = [
  ...statuses.flatMap((status) => [`low-${status}`, `high-${status}`]),
  'action-short',
  'action-description',
  'fixed',
  'custom',
]
const documentationTabsFor = (
  models: Readonly<Record<string, typeof PreviewControlsBlock.Model.Type>>,
  section: string,
) => {
  const child = models[section]
  if (child === undefined) throw new Error(`Missing documentation tabs ${section}`)
  return child
}
const key = Symbol('AuthoredBanner')
export const AuthoredBannerBlock = Block.make('AuthoredBanner', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    banners: Schema.Record(Schema.String, BannerBlock.Model),
    documentationTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
    tooltips: DocumentTooltipBlock.Model,
  }),
  Message: defineMessageUnion({
    Replayed: { key: Schema.String },
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredBannerBlock
const Tooltips = Root.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DocumentTooltipBlock, { Transaction: Root.makeNoopStep }),
})
const Banners = Root.makeRecordBinding(BannerBlock, { field: 'banners' }).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(BannerBlock, {
    Dismissed: Root.makeNoopStep,
    Exited: Root.makeNoopStep,
  }),
})
const DocumentationTabs = Root.makeRecordBinding(PreviewControlsBlock, {
  field: 'documentationTabs',
})
const documentationTabsHover = (mode: 'fluid' | 'standard') =>
  Root.makeStep((model) =>
    Update.combineSteps(
      Object.entries(model.documentationTabs).flatMap(([section, child]) =>
        tabsHoverModeOf(child) === mode
          ? []
          : [DocumentationTabs.requestHoverMode(section, { mode: mode })],
      ),
    ),
  )
const initDocumentationTabs = Root.makeStep(() =>
  Update.combineSteps(
    ['Statuses', 'Actions', 'Fixed', 'Custom icon'].map((section) =>
      Root.makeStep((model) =>
        initAndInsert(DocumentationTabs, model, {
          key: section,
          args: [
            {
              id: previewCodeTabId('banner', section),
              idPrefix: previewCodeTabId('banner', section),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
  ),
)
const Composition = Root.makeComposition({ bindings: [DocumentationTabs, Banners, Tooltips] })
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { banners: {}, documentationTabs: {} },
    steps: [
      Tooltips.requestAdd({ key: 'docs-banner-replay', options: { side: 'top' } }),
      initDocumentationTabs,
      ...bannerKeys.map((key) =>
        Root.makeStep((model) =>
          initAndInsert(Banners, model, {
            key,
            args: [{ id: `docs-banner-${key}`, reduceMotion: false }],
          }),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({
    Replayed: Root.makeStep.fromMessage(({ key }) => Banners.requestReset(key)),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep.fromMessage(({ presentation: settings }) =>
      documentationTabsHover(settings.hover),
    ),
  }),
  view: Composition.makeView.withInputs((model, { settings, ready }, h) => {
    if (!ready) return h.empty
    const context = presentation(settings)
    const banner = (
      key: string,
      status: BannerStatus,
      title: string,
      contrast: 'low' | 'high' = 'low',
    ) => {
      const child = model.banners[key]
      return child === undefined
        ? h.empty
        : h.block(
            Banners.embedView({
              key,
              slotId: child.id,
              model: child,
              viewInputs: {
                context,
                status,
                contrast,
                animate: bannerMotion.node,
                variant: key === 'fixed' ? 'fixed' : 'inline',
                dismissible: key === 'fixed',
                ...(key === 'custom' ? { icon: defaultIcons.bell } : {}),
                children: (appearance) => [
                  BannerTitle({ ...appearance, children: [title] }, h),
                  key === 'action-description'
                    ? BannerDescription(
                        {
                          ...appearance,
                          children: ['Run the install command again to pull the latest versions.'],
                        },
                        h,
                      )
                    : null,
                  key.startsWith('action-') || key === 'fixed'
                    ? BannerActions(
                        {
                          ...appearance,
                          children: (key === 'fixed'
                            ? ['Details']
                            : key === 'action-short'
                              ? ['Star on GitHub', 'Share', 'Later']
                              : ['Copy command', "What's new", 'Later']
                          ).map((label, index) =>
                            BannerAction(
                              {
                                ...appearance,
                                variant:
                                  key === 'fixed' || index === 1
                                    ? 'secondary'
                                    : index === 0
                                      ? 'primary'
                                      : 'ghost',
                                children: [label],
                              },
                              h,
                            ),
                          ),
                        },
                        h,
                      )
                    : null,
                ],
              },
            }),
          )
    }
    const section = (
      title: string,
      children: ReadonlyArray<ReturnType<typeof h.div>>,
      description: string,
      className: string,
    ) =>
      docSection(h, {
        title,
        children,
        description,
        className,
        source: documentationRuntime().sources['authored-banner'],
        presentation: { context },
        pane: model.documentationTabs[title]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
        tabsId: previewCodeTabId('banner', title),
        tabs: h.block(
          DocumentationTabs.embedView({
            key: title,
            slotId: previewCodeTabId('banner', title),
            model: documentationTabsFor(model.documentationTabs, title),
            viewInputs: previewCodeTabsViewInputs(h, {
              context,
              animate: target.node,
              ariaLabel: `${title} example view`,
            }),
          }),
        ),
        ...(title === 'Fixed'
          ? {
              actions: [
                h.block(
                  Tooltips.embedView({
                    slotId: 'docs-banner-tooltips',
                    model: model.tooltips,
                    viewInputs: {
                      renderDocument: (content, popups) =>
                        h.div([h.Class('contents')], [content, ...popups]),
                      renderTrigger: (_key, { button }) =>
                        Button(
                          {
                            context,
                            variant: 'ghost',
                            buttonSize: 'icon',
                            children: [
                              defaultIcons['rotate-ccw']({ size: 16, strokeWidth: 1.5 }, h),
                            ],
                            attributes: [
                              h.AriaLabel('Replay'),
                              h.OnClick(Root.Message.Replayed({ key: 'fixed' })),
                            ],
                            render: (attributes, children) =>
                              button(
                                attributes.flatMap((attribute) =>
                                  '__childAttribute' in attribute
                                    ? [attribute]
                                    : childAttributes([attribute]),
                                ),
                                children,
                              ),
                          },
                          h,
                        ),
                      render: ({ tooltip }) =>
                        tooltip('docs-banner-replay', {
                          content: 'Replay animation',
                          shapeClass: settings.shape === 'sharp' ? 'rounded-none' : 'rounded-lg',
                          animate: target.node,
                          reducedMotion: 'user',
                        }),
                    },
                  }),
                ),
              ],
            }
          : {}),
      })
    const fixed = h.div(
      [
        h.Class(
          'flex h-[300px] w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background',
        ),
      ],
      [
        h.div(
          [
            h.Class('flex h-11 shrink-0 items-center gap-4 border-b border-border/60 px-4'),
            h.AriaHidden(true),
          ],
          [
            h.div([h.Class('size-5 rounded-md bg-muted')]),
            h.div(
              [h.Class('flex items-center gap-3')],
              ['w-10', 'w-12', 'w-9'].map((width) =>
                h.div([h.Class(`h-2.5 ${width} rounded-full bg-muted`)]),
              ),
            ),
            h.div([h.Class('ml-auto size-6 rounded-full bg-muted')]),
          ],
        ),
        banner('fixed', 'warning', 'Registry maintenance tonight at 22:00 UTC'),
        h.div(
          [h.Class('min-h-0 flex-1 overflow-y-auto')],
          [
            h.div(
              [h.Class('flex flex-col gap-3 p-5'), h.AriaHidden(true)],
              [
                h.div([h.Class('h-3 w-1/3 rounded-full bg-muted')]),
                ...[92, 84, 88, 60, 95, 78, 86, 70, 50, 90, 82, 94, 66, 88, 74, 58].map((width) =>
                  h.div([h.Class('h-2.5 rounded-full bg-muted'), h.Style({ width: `${width}%` })]),
                ),
              ],
            ),
          ],
        ),
      ],
    )
    return h.div(
      [],
      [
        section(
          'Statuses',
          [
            h.div(
              [h.Class('grid w-full max-w-[560px] grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2')],
              (['low', 'high'] as const).map((contrast) =>
                h.div(
                  [h.Class('flex flex-col gap-2')],
                  [
                    h.span(
                      [h.Class('px-1 text-site-caption text-muted-foreground')],
                      [contrast === 'low' ? 'Low contrast' : 'High contrast'],
                    ),
                    ...statuses.map((status) =>
                      banner(
                        `${contrast}-${status}`,
                        status,
                        status.charAt(0).toUpperCase() + status.slice(1),
                        contrast,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          '5 statuses, each in a low-contrast and high-contrast treatment.',
          'w-full max-w-[560px]',
        ),
        section(
          'Actions',
          [
            banner('action-short', 'info', 'Enjoying Fluid Functionalism?'),
            banner('action-description', 'info', 'The registry has new components'),
          ],
          'Actions wrap naturally alongside a title and optional description.',
          'flex w-full max-w-[560px] flex-col gap-4',
        ),
        section(
          'Fixed',
          [fixed],
          'A fixed banner sits across the top of its scrolling page. Dismiss it, then replay its entrance.',
          'w-full max-w-[560px]',
        ),
        section(
          'Custom icon',
          [banner('custom', 'default', '3 new components since your last visit')],
          'Replace the status icon with any icon from the current set.',
          'w-full max-w-[520px]',
        ),
      ],
    )
  }),
}).pipe(Layer.provide(Layer.mergeAll(BannerLayer, PreviewControlsLayer, TooltipLayer)))
