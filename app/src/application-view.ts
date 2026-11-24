import { readReference } from './reference/query'
import chartStyles from '@foldkit-visuals/charts/styles.css?inline'
import { applicationClasses } from './application-classes'
import { ObserveGalleryLayout } from './application-gallery-layout'
import { previewLayoutKey } from './gallery/geometry'
import { makeRenderRightRail } from './application-right-rail'
import { createLazy } from 'foldkit/html'
import type { GalleryBlock } from './gallery/definition'
import type { PlaygroundConfiguration } from './playground/configuration'
import type { ResolvedSettings } from './settings'
import type { Settings } from './settings'
import type { Block } from 'foldkit'
import { Option } from 'effect'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { Reveal } from '@foldkit-visuals/fluid/reveal'
import type { ApplicationComposition, applicationViewBindings } from './application'
import { ApplicationBlock } from './application-contract'
import type { Message } from './application-contract'
import { pageAt } from '../../lib/catalogue'
import { documentationRuntime } from './documentation-runtime'
import { systemAt } from './system'
import { hero } from './hero'
import { motion } from './motion'
import { showcaseRouter } from './route'
import { resolveSettings, headingFontPresentation, presentation, accentColor } from './settings'
import { fontAssetFamily } from './fonts/asset-state'
import { fontStylesheet } from './fonts/catalogue'
import { themeClass } from './theme'
import { fontWeights } from '@foldkit-visuals/fluid/tokens'

export const makeRenderApplication = (bindings: typeof applicationViewBindings) => {
  const {
    Reference,
    SystemPages,
    LandingGallery,
    ReferenceGallery,
    EmbeddedGallery,
    Navigation,
    MobileMenu,
    MobilePreferences,
    CodeClipboard,
    FontPicker,
    Search,
    MobileNavigation,
  } = bindings

  const renderRightRail = makeRenderRightRail(bindings)
  const lazyReferencePreview = createLazy()
  const viewReferencePreview = (
    model: typeof GalleryBlock.Model.Type,
    key: string,
    settings: ResolvedSettings,
    only: string,
    configuration: PlaygroundConfiguration,
    h: Block.ViewBuilderFor<typeof ApplicationComposition>,
  ) =>
    h.block(
      ReferenceGallery.embedView({
        key,
        slotId: 'live-playground',
        model,
        viewInputs: { settings, only, configuration },
      }),
    )
  const lazyNavigation = createLazy()
  const viewNavigation = (
    model: (typeof ApplicationBlock.Model.Type)['navigation'],
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: Block.ViewBuilderFor<typeof ApplicationComposition>,
  ) =>
    h.block(
      Navigation.embedView({
        slotId: 'navigation',
        model,
        viewInputs: { settings: { shape, size, hover } },
      }),
    )

  const lazyFontPicker = createLazy()
  const viewFontPicker = (
    model: (typeof ApplicationBlock.Model.Type)['fontPicker'],
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: Block.ViewBuilderFor<typeof ApplicationComposition>,
  ) =>
    h.block(
      FontPicker.embedView({
        slotId: 'google-font-picker',
        model,
        viewInputs: { settings: { shape, size, hover } },
      }),
    )

  const lazySearch = createLazy()
  const viewSearch = (
    model: (typeof ApplicationBlock.Model.Type)['search'],
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: Block.ViewBuilderFor<typeof ApplicationComposition>,
  ) =>
    h.block(
      Search.embedView({
        slotId: 'documentation-search',
        model,
        viewInputs: { settings: { shape, size, hover } },
      }),
    )
  return (
    model: typeof ApplicationBlock.Model.Type,
    h: Block.ViewBuilderFor<typeof ApplicationComposition>,
    events: {
      readonly fontLoaded: typeof Message.Type
      readonly fontFailed: typeof Message.Type
      readonly copyHero: typeof Message.Type
      readonly copySidebar: typeof Message.Type
      readonly openNavigation: typeof Message.Type
      readonly retryFont: typeof Message.Type
    },
  ) => {
    const settings = resolveSettings(model.settings, model.systemTheme)
    const heading = headingFontPresentation(model.settings)
    const font = fontAssetFamily(model.fontAsset)
    const fontLink =
      font === undefined
        ? h.empty
        : h.link([
            h.Rel('stylesheet'),
            h.Href(fontStylesheet(font)),
            h.OnLoad(events.fontLoaded),
            h.OnError(events.fontFailed),
          ])
    const chartStyle = h.style(
      [h.DataAttribute('chart-styles', 'true')],
      [model.chartStylesActive ? chartStyles : ''],
    )
    const transitionStyles = h.empty
    const accent =
      model.settings.theme === 'system' && !model.systemThemeKnown
        ? `light-dark(${accentColor(settings.accent, 'light')},${accentColor(settings.accent, 'dark')})`
        : accentColor(settings.accent, settings.theme)
    const accentStyles = h.style(
      [h.DataAttribute('accent-styles', 'true')],
      [`:root{--fluid-accent:${accent}}`],
    )
    const context = presentation(settings)
    const page = pageAt(model.path)
    const lightboxReference = page?.href === '/ramka/lightbox'
    const landing = model.path === '/'
    const article =
      !landing && page === undefined ? documentationRuntime().articleAt(model.path) : undefined
    const reference = Option.getOrUndefined(model.maybeReference)
    const referenceGallery = Option.getOrUndefined(model.maybeReferenceGallery)
    const landingGallery = Option.getOrUndefined(model.maybeLandingGallery)
    const embeddedGallery = Option.getOrUndefined(model.maybeEmbeddedGallery)
    const system = Option.getOrUndefined(model.maybeSystem)
    const previewReady = referenceGallery?.model.isReady ?? false
    const renderPreview = () =>
      reference === undefined || referenceGallery === undefined
        ? h.empty
        : lazyReferencePreview(viewReferencePreview, [
            referenceGallery.model,
            referenceGallery.key,
            settings,
            model.path,
            reference.model.configuration,
            h,
          ])
    if (model.ramkaExample !== null && referenceGallery !== undefined)
      return {
        title: 'Photos app · Ramka',
        body: h.main(
          [
            h.Id('content'),
            h.Class(
              `min-h-svh bg-background ${themeClass(model.settings, model.systemTheme, model.systemThemeKnown)}`,
            ),
          ],
          [
            h.block(
              ReferenceGallery.embedView({
                key: referenceGallery.key,
                slotId: 'ramka-examples',
                model: referenceGallery.model,
                viewInputs: {
                  settings,
                  showRamkaExamples: true,
                  ramkaExample: model.ramkaExample,
                },
              }),
            ),
          ],
        ),
      }
    if (model.isEmbed && page !== undefined)
      return {
        title: `${page.name} preview`,
        body: motion.root(
          h.div(
            [
              h.Class(
                `${page.slug === 'sidebar' ? 'h-svh ' : ''}w-full mx-auto flex justify-center relative embedded-preview site ${themeClass(model.settings, model.systemTheme, model.systemThemeKnown)}`,
              ),
              ...(Option.isSome(model.maybeShapeTransition)
                ? [h.DataAttribute('shape-transition', 'true')]
                : []),
              h.DataAttribute('size', settings.size),
            ],
            [
              chartStyle,
              transitionStyles,
              accentStyles,
              fontLink,
              embeddedGallery === undefined
                ? h.empty
                : h.block(
                    EmbeddedGallery.embedView({
                      key: embeddedGallery.key,
                      slotId: 'gallery',
                      model: embeddedGallery.model,
                      viewInputs: { settings, only: page.href },
                    }),
                  ),
            ],
          ),
          settings.size,
        ),
      }
    const referenceHero =
      page === undefined
        ? h.empty
        : hero(page, settings, model.copyFeedback.hero.complete, events.copyHero, h)
    const main = landing
      ? [
          hero(undefined, settings, model.copyFeedback.hero.complete, events.copyHero, h),
          landingGallery === undefined
            ? h.empty
            : h.block(
                LandingGallery.embedView({
                  slotId: 'gallery',
                  model: landingGallery,
                  viewInputs: { settings: settings },
                }),
              ),
        ]
      : page !== undefined && reference !== undefined
        ? [
            h.div(
              [
                h.Class(
                  `py-20 sm:py-28 w-full ${page.family === 'ramka' ? 'max-w-6xl' : 'max-w-[680px]'} mx-auto mt-12 lg:mt-0`,
                ),
              ],
              [
                h.div(
                  [
                    h.Class(
                      page.href === '/ramka/lightbox'
                        ? applicationClasses.ramkaGalleryLayout
                        : 'flex flex-col gap-8 px-6',
                    ),
                    ...(page.href === '/ramka/lightbox'
                      ? [
                          h.OnMount(ObserveGalleryLayout()),
                          h.DataAttribute('gallery-presentation', previewLayoutKey(settings)),
                          h.DataAttribute(
                            'gallery-layout',
                            previewReady &&
                              reference.model.apiScrolls.length > 0 &&
                              reference.model.apiScrolls.every(({ model }) => model.ready)
                              ? 'measured'
                              : 'initial',
                          ),
                        ]
                      : []),
                  ],
                  [
                    lightboxReference
                      ? Reveal(
                          {
                            preset: 'reveal-landing-subtle',
                            className: 'contents',
                            children: [referenceHero],
                          },
                          h,
                        )
                      : referenceHero,
                    page.family === 'ramka' && referenceGallery !== undefined
                      ? h.block(
                          ReferenceGallery.embedView({
                            key: referenceGallery.key,
                            slotId: 'ramka-examples',
                            model: referenceGallery.model,
                            viewInputs: { settings, only: page.href, showRamkaExamples: true },
                          }),
                        )
                      : h.empty,
                    h.block(
                      Reference.embedView({
                        key: reference.key,
                        slotId: 'component-reference',
                        model: reference.model,
                        viewInputs: {
                          reference: readReference(model.referenceQuery, model.path),
                          renderPreview,
                          previewReady,
                          settings: settings,
                          inlineControls: model.columns !== 3,
                        },
                      }),
                    ),
                  ],
                ),
              ],
            ),
          ]
        : systemAt(model.path) !== undefined && system !== undefined
          ? [
              h.block(
                SystemPages.embedView({
                  key: system.key,
                  slotId: 'system-pages',
                  model: system.model,
                  viewInputs: { settings },
                }),
              ),
            ]
          : article !== undefined
            ? [documentationRuntime().articleView(model.path, settings, h)]
            : [
                h.header(
                  [h.Class(applicationClasses.pageHeading)],
                  [
                    h.h1([h.Class(applicationClasses.displayHeading)], ['A page out of place.']),
                    h.p([], ['This page could not be found.']),
                    h.a([h.Href(showcaseRouter())], ['Back to the showcase →']),
                  ],
                ),
              ]
    return {
      title: `${page?.name ?? article?.title ?? (landing ? 'Fluid × Bklit × Ramka' : 'Page not found')} · Fluid Foldkit`,
      body: motion.root(
        h.div(
          [
            h.Class(
              `${applicationClasses.root} site ${themeClass(model.settings, model.systemTheme, model.systemThemeKnown)}`,
            ),
            ...(Option.isSome(model.maybeShapeTransition)
              ? [h.DataAttribute('shape-transition', 'true')]
              : []),
            h.DataAttribute('font', settings.font),
            h.DataAttribute('shape', settings.shape),
            h.DataAttribute('size', settings.size),
            h.DataAttribute('app', 'visuals'),
            h.Style({
              colorScheme:
                model.settings.theme === 'system' && !model.systemThemeKnown
                  ? 'light dark'
                  : settings.theme,
              '--heading-family':
                model.fontAsset._tag === 'Failed' ? 'var(--font-sans)' : heading.family,
              '--heading-weight': String(heading.weight),
              '--heading-display-weight': String(heading.displayWeight),
            }),
          ],
          [
            chartStyle,
            transitionStyles,
            accentStyles,
            fontLink,
            h.a([h.Href('#content'), h.Class(applicationClasses.skipLink)], ['Skip to content']),
            h.header(
              [h.Class(applicationClasses.mobileTopbar)],
              [
                Button(
                  {
                    context,
                    variant: 'ghost',
                    buttonSize: 'icon-compact',
                    children: [
                      defaultIcons['panel-left']({ size: 14 }, h),
                      h.span([h.Class('sr-only')], ['Pages']),
                    ],
                    attributes: [
                      h.OnClick(events.openNavigation),
                      h.Id('site-menu-button'),
                      h.AriaExpanded(model.mobileNavigation.dialog.isOpen),
                      h.AriaControls('navigation-dialog'),
                    ],
                  },
                  h,
                ),
              ],
            ),
            h.aside(
              [
                h.Id('site-navigation'),
                h.AriaLabel('Documentation navigation'),
                h.Class(applicationClasses.navigation),
                h.Style({ width: '16rem' }),
              ],
              [
                lazyNavigation(viewNavigation, [
                  model.navigation,
                  settings.shape,
                  settings.size,
                  settings.hover,
                  h,
                ]),
              ],
            ),
            h.main(
              [
                h.Id('content'),
                h.AriaBusy(model.documentation === 'loading'),
                h.Class(
                  `relative flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background site-content ${page === undefined ? '' : 'detail-page'}`,
                ),
                h.Tabindex(-1),
              ],
              landing || (page !== undefined && !lightboxReference)
                ? [
                    Reveal(
                      {
                        preset: 'reveal-landing-subtle',
                        children: main,
                      },
                      h,
                    ),
                  ]
                : main,
            ),
            renderRightRail(model, h, {
              context,
              settings,
              renderPreview,
              previewReady,
              onCopyInstall: events.copySidebar,
            }),
            h.block(
              CodeClipboard.embedView({ slotId: 'code-clipboard', model: model.codeClipboard }),
            ),
            lazyFontPicker(viewFontPicker, [
              model.fontPicker,
              settings.shape,
              settings.size,
              settings.hover,
              h,
            ]),
            lazySearch(viewSearch, [
              model.search,
              settings.shape,
              settings.size,
              settings.hover,
              h,
            ]),
            h.block(
              MobileNavigation.embedView({
                slotId: 'mobile-navigation-dialog',
                model: model.mobileNavigation,
                viewInputs: {
                  context,
                  animate: motion.node,
                  label: 'Pages',
                  panelClassName:
                    'fixed inset-y-0 z-[var(--z-modal,50)] flex flex-col overflow-hidden outline-none left-0',
                  panelStyle: { width: '18rem', padding: '0' },
                  content: () => [
                    h.div(
                      [
                        h.Class('flex flex-col gap-2 px-4 pt-2 pb-4'),
                        h.DataAttribute(
                          'font-picker-return',
                          String(
                            model.fontPicker.returnFocusId ===
                              'customize-mobile-font-select-trigger',
                          ),
                        ),
                      ],
                      [
                        h.div(
                          [h.Class('flex items-center justify-between pt-2')],
                          [
                            h.h2(
                              [
                                h.Class('text-site-title text-foreground leading-none'),
                                h.Style({ fontVariationSettings: fontWeights.semibold }),
                              ],
                              ['Make them yours'],
                            ),
                          ],
                        ),
                        h.block(
                          MobilePreferences.embedView({
                            slotId: 'mobile-preferences',
                            model: model.mobilePreferences,
                            viewInputs: { settings: model.settings },
                          }),
                        ),
                      ],
                    ),
                    h.block(
                      MobileMenu.embedView({
                        slotId: 'mobile-menu',
                        model: model.mobileMenu,
                        viewInputs: { settings: settings },
                      }),
                    ),
                  ],
                },
              }),
            ),
            ...(model.fontAsset._tag === 'Failed'
              ? [
                  h.div(
                    [h.Role('status'), h.Class(applicationClasses.fontStatus)],
                    [
                      model.fontAsset.message,
                      h.button([h.Type('button'), h.OnClick(events.retryFont)], ['Retry font']),
                    ],
                  ),
                ]
              : []),
            h.div(
              [h.Role('status'), h.AriaLive('polite'), h.Class('sr-only')],
              [
                model.settingsAnnouncement ||
                  (model.copyFeedback.hero.complete ? 'Install prompt copied to clipboard' : ''),
              ],
            ),
          ],
        ),
        settings.size,
      ),
    }
  }
}
