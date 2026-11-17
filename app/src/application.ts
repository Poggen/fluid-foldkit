import { layer as ScrollAreaLayer } from '@foldkit-visuals/fluid/scroll-area'
import { Query } from 'foldkit/experimental'
import { referenceArgs } from './reference/query'
import {
  acceptLandingAccent,
  changeSettings,
  MobileNavigation,
} from './application-settings-changes'
import { configureReferencePreview, acceptReferencePreview } from './application-galleries'
import { settledSettingsUrl } from './application-settings-url'
import {
  PreferencesRequests,
  MobilePreferencesRequests,
  FontPickerRequests,
  MaybeSystemBinding,
  MaybeLandingGalleryBinding,
  MaybeReferenceGalleryBinding,
  MaybeEmbeddedGalleryBinding,
  MaybeReferenceBinding,
  ReferenceQueryBinding,
  Search as SearchRequests,
  Navigation,
  MobileMenu,
  RightRailScroll,
} from './application-bindings'
import {
  requestFont,
  timedOutFont,
  loadedFontStylesheet,
  failedFontStylesheet,
  completedFontLoad,
} from './application-fonts'
import { initialCopyFeedback } from './copy-feedback'
import {
  copyInstall,
  clickedCopyInstall,
  completedCopyInstall,
  completedCopyFeedback,
} from './application-copy'
import { makeRenderApplication } from './application-view'
import { ApplicationBlock, Message } from './application-contract'
import { ComponentReferenceBlock } from './reference/block'
import { layer as ReferenceLayer } from './reference/layer'
import { previewOptionsFromUrl } from './playground/options'
import { mobileDrawerLayer } from '@foldkit-visuals/fluid/mobile-drawer'
import { Effect, Layer, Option, Result } from 'effect'
import { FinishShapeTransition, finishShapeTransition } from './shape-transition'
import { Update, Url } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import {
  Apply,
  CopyInstall,
  FinishCopyFeedback,
  Navigate,
  viewportSubscriptions,
  FinishThemeTransition,
} from './application-commands'
import { knownPath } from '../../lib/catalogue'
import { reconcilePageVisit, informPagePresentation, informPageViewport } from './application-pages'
import { GalleryBlock, layer as GalleryLayer } from './gallery/block'

import { CodeClipboardBlock, codeClipboardLayer } from './code-clipboard'
import { SystemPagesBlock, layer as SystemPagesLayer } from './system'
import { layer as NavigationLayer } from './navigation'
import { PreferencesBlock, layer as PreferencesLayer } from './preferences'
import { GoogleFontPickerBlock, googleFontPickerLayer } from './fonts/picker'
import { PrepareFont, WaitForFont, FontDeadline } from './fonts/commands'
import { fontWeights, nearestWeight } from './fonts/catalogue'
import { shortcutSelection, shortcutAnnouncement } from './global-shortcuts'
import { pathFromUrl } from './route'
import { SearchBlock, layer as SearchLayer } from './search'
import { Match } from 'effect'
import {
  defaults,
  applySelection,
  componentPresentation,
  settingsFromLocation,
  settingsQuery,
  resolveSettings,
} from './settings'

const Search = SearchRequests.withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(SearchBlock, {
    RequestedIntent: ({ intent }) =>
      ApplicationBlock.makeStep((model) =>
        Match.value(intent).pipe(
          Match.tag('Page', ({ href }) =>
            Update.combineSteps([
              ApplicationBlock.makeFieldsStep(() => ({ pendingSettingsUrl: () => Option.none() })),
              ApplicationBlock.makeCommandsStep(() => [
                Navigate({ href: `${href}${settingsQuery(model.settings)}`, external: false }),
              ]),
            ]),
          ),
          Match.tag('Setting', ({ selection }) =>
            changeSettings(applySelection(model.settings, selection)),
          ),
          Match.tag('BrowseGoogleFonts', () =>
            FontPickerRequests.requestOpen({
              current: model.settings.customFont?.family ?? null,
              returnFocusId: model.mobileNavigation.dialog.isOpen
                ? 'site-mobile-search'
                : model.columns === 3
                  ? 'site-desktop-search'
                  : 'site-menu-button',
            }),
          ),
          Match.tag('CopyInstall', () => copyInstall('sidebar')),
          Match.tag('Reset', () => changeSettings(defaults)),
          Match.tag('OriginalSource', () =>
            ApplicationBlock.makeCommandsStep(() => [
              Navigate({
                href: 'https://github.com/mickadesign/fluid-functionalism',
                external: true,
              }),
            ]),
          ),
          Match.exhaustive,
        ),
      ),
  }),
})
const SystemPages = MaybeSystemBinding.withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(SystemPagesBlock, {
    RequestedSetting: ({ selection }) =>
      ApplicationBlock.makeStep((model) =>
        changeSettings(applySelection(model.settings, selection)),
      ),
  }),
})
const Preferences = PreferencesRequests.withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(PreferencesBlock, {
    SelectedSetting: ({ selection }) =>
      ApplicationBlock.makeStep((model) =>
        changeSettings(applySelection(model.settings, selection)),
      ),
    RequestedReset: () => changeSettings(defaults),
    RequestedFontBrowse: () =>
      ApplicationBlock.makeStep((model) =>
        FontPickerRequests.requestOpen({
          current: model.settings.customFont?.family ?? null,
          returnFocusId: 'customize-desktop-font-select-trigger',
        }),
      ),
  }),
})
const MobilePreferences = MobilePreferencesRequests.withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(PreferencesBlock, {
    SelectedSetting: ({ selection }) =>
      ApplicationBlock.makeStep((model) =>
        changeSettings(applySelection(model.settings, selection)),
      ),
    RequestedReset: () => changeSettings(defaults),
    RequestedFontBrowse: () =>
      ApplicationBlock.makeStep((model) =>
        FontPickerRequests.requestOpen({
          current: model.settings.customFont?.family ?? null,
          returnFocusId: 'customize-mobile-font-select-trigger',
        }),
      ),
  }),
})
const LandingGallery = MaybeLandingGalleryBinding.withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(GalleryBlock, {
    AdmittedChartPreviews: () =>
      ApplicationBlock.makeFieldsStep(() => ({ chartStylesActive: () => true })),
    UpdatedAccent: ({ accent }) => acceptLandingAccent(accent),
  }),
})
const ReferenceGallery = MaybeReferenceGalleryBinding.withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(GalleryBlock, {
    AdmittedChartPreviews: () =>
      ApplicationBlock.makeFieldsStep(() => ({ chartStylesActive: () => true })),
    UpdatedAccent: () => ApplicationBlock.makeNoopStep(),
  }),
})
const EmbeddedGallery = MaybeEmbeddedGalleryBinding.withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(GalleryBlock, {
    AdmittedChartPreviews: () =>
      ApplicationBlock.makeFieldsStep(() => ({ chartStylesActive: () => true })),
    UpdatedAccent: () => ApplicationBlock.makeNoopStep(),
  }),
})
const Reference = MaybeReferenceBinding.withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(ComponentReferenceBlock, {
    RequestedPreviewConfiguration: configureReferencePreview,
    RequestedReload: ({ path }) =>
      ApplicationBlock.makeStep((model) =>
        path !== model.path
          ? { model }
          : Option.match(referenceArgs(path), {
              onNone: () => ({ model }),
              onSome: (args) => ReferenceQueryBinding.requestRevalidationOrLoad(args),
            }),
      ),
  }),
})
const FontPicker = FontPickerRequests.withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(GoogleFontPickerBlock, {
    Selected: ({ font }) =>
      ApplicationBlock.makeStep((model) =>
        changeSettings({
          ...model.settings,
          font: 'custom',
          customFont: {
            family: font.name,
            weight:
              model.settings.customFont?.weight == null
                ? null
                : nearestWeight(font, model.settings.customFont.weight),
          },
        }),
      ),
  }),
})
const CodeClipboard = ApplicationBlock.makeRequiredFieldBinding(CodeClipboardBlock, {
  field: 'codeClipboard',
})
export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [
    RightRailScroll,
    ReferenceQueryBinding,
    Reference,
    SystemPages,
    FontPicker,
    CodeClipboard,
    Navigation,
    MobileMenu,
    Search,
    Preferences,
    MobilePreferences,
    LandingGallery,
    ReferenceGallery,
    EmbeddedGallery,
    MobileNavigation,
  ],
})
const init = ApplicationComposition.makeInit((flags, url) => {
  const href = Url.toString(url)
  const settings = settingsFromLocation(href)
  const path = pathFromUrl(url)
  const embed = new URL(href).searchParams.get('embed') === '1'
  return {
    model: {
      path,
      hash: new URL(href).hash,
      isEmbed: embed,
      chartStylesActive: false,
      initialGalleryFlags: flags.baseline,
      maybeLandingGallery: Option.none(),
      maybeReference: Option.none(),
      maybeReferenceGallery: Option.none(),
      maybeSystem: Option.none(),
      maybeEmbeddedGallery: Option.none(),
      settings,
      systemTheme: 'light',
      systemThemeKnown: false,
      settingsUrlRevision: 0,
      pendingSettingsUrl: Option.none(),
      themeRevision: 0,
      maybeThemeTransition: Option.none(),
      fontRevision: 0,
      fontAsset: { _tag: 'Idle' },
      copyFeedback: initialCopyFeedback(),
      settingsAnnouncement: '',
      columns: null,
      presentationRevision: 0,
      maybeShapeTransition: Option.none(),
    },
    childInitContext: {
      path,
      settings,
    },
    commands: [Apply({ settings })],
    steps: [reconcilePageVisit(previewOptionsFromUrl(href), flags.page), requestFont(settings)],
  }
})
const update = ApplicationComposition.makeUpdate.compose(
  ApplicationComposition.makeUpdate({
    PressedSettingsShortcut: ApplicationBlock.makeStep((model, { key }) => {
      const settings = applySelection(model.settings, shortcutSelection(model.settings, key))
      return Update.combineSteps([
        changeSettings(settings),
        ApplicationBlock.makeFieldsStep(() => ({
          settingsAnnouncement: () => shortcutAnnouncement(settings, key),
        })),
      ])
    }),
    TimedOutFont: timedOutFont,
    ObservedSystemTheme: ApplicationBlock.makeStep((model, { theme }) => {
      if (model.systemThemeKnown && model.systemTheme === theme) return { model }
      const settings = resolveSettings(model.settings, theme)
      const presentation = componentPresentation(settings)
      return Update.combineSteps([
        ApplicationBlock.makeFieldsStep(() => ({
          systemTheme: () => theme,
          systemThemeKnown: () => true,
        })),
        ...(model.settings.theme !== 'system'
          ? []
          : [
              informPagePresentation(presentation),
              ApplicationBlock.makeCommandsStep(() => [
                Apply({ settings: model.settings, fontFailed: model.fontAsset._tag === 'Failed' }),
              ]),
            ]),
      ])
    }),
    CompletedThemeTransition: ApplicationBlock.makeFieldsStep((model, { revision }) =>
      Option.contains(model.maybeThemeTransition, revision)
        ? { maybeThemeTransition: () => Option.none() }
        : {},
    ),
    CompletedFontPreparation: ApplicationBlock.makeStep((model, { revision, result }) =>
      revision !== model.fontRevision
        ? { model }
        : Result.isFailure(result)
          ? {
              model: { ...model, fontAsset: { _tag: 'Failed', revision, message: result.failure } },
              commands: [Apply({ settings: model.settings, fontFailed: true })],
            }
          : Update.combineSteps([
              ApplicationBlock.makeFieldsStep(() => ({
                fontAsset: () => ({ _tag: 'Stylesheet', revision, font: result.success }),
              })),
              PreferencesRequests.informOfFontWeights({ weights: fontWeights(result.success) }),
              MobilePreferencesRequests.informOfFontWeights({
                weights: fontWeights(result.success),
              }),
              ApplicationBlock.makeCommandsStep(() => [FontDeadline({ revision })]),
            ]),
    ),
    LoadedFontStylesheet: loadedFontStylesheet,
    FailedFontStylesheet: failedFontStylesheet,
    CompletedFontLoad: completedFontLoad,
    ClickedRetryFont: ApplicationBlock.makeStep((model) => requestFont(model.settings)),
    ClickedLink: ApplicationBlock.makeStep((model, { request }) =>
      Update.combineSteps([
        ApplicationBlock.makeFieldsStep(() => ({ pendingSettingsUrl: () => Option.none() })),
        ApplicationBlock.makeCommandsStep(() =>
          UrlRequest.match(request, {
            Internal: ({ url }) => {
              const target = new URL(Url.toString(url))
              const search = target.search || settingsQuery(model.settings)
              return [
                Navigate({ href: `${target.pathname}${search}${target.hash}`, external: false }),
              ]
            },
            External: ({ href }) => [Navigate({ href, external: true })],
          }),
        ),
      ]),
    ),
    ChangedUrl: ApplicationBlock.makeStep((model, { url }) => {
      const href = Url.toString(url)
      const path = pathFromUrl(url)
      const settings = settingsFromLocation(href)
      return Update.combineSteps([
        changeSettings(settings, 'none', path, new URL(href).hash),
        reconcilePageVisit(previewOptionsFromUrl(href)),
      ])
    }),
    SettledSettingsUrl: settledSettingsUrl,
    CompletedNavigate: ApplicationBlock.makeNoopStep(),
    CompletedApply: ApplicationBlock.makeNoopStep(),
    CompletedShapeTransition: finishShapeTransition,
    ClickedCopyInstall: clickedCopyInstall,
    CompletedCopyInstall: completedCopyInstall,
    CompletedCopyFeedback: completedCopyFeedback,
    ClickedNavigation: MobileNavigation.requestOpen(),
    CapturedColumns: ApplicationBlock.makeStep((model, { columns }) =>
      model.columns === columns
        ? { model }
        : Update.combineSteps([
            ApplicationBlock.makeFieldsStep(() => ({ columns: () => columns })),
            informPageViewport(columns),
            ...(columns === 3 ? [MobileNavigation.requestClose()] : []),
          ]),
    ),
  }),
  ApplicationComposition.makeUpdate.each((model, _message, { before }) =>
    acceptReferencePreview(model, before),
  ),
)
export const applicationViewBindings = {
  RightRailScroll,
  Reference,
  SystemPages,
  LandingGallery,
  ReferenceGallery,
  EmbeddedGallery,
  Navigation,
  MobileMenu,
  MobilePreferences,
  Preferences,
  CodeClipboard,
  FontPicker,
  Search,
  MobileNavigation,
}
const makeView = () => {
  const renderApplication = makeRenderApplication(applicationViewBindings)
  return ApplicationComposition.makeView((model, h) =>
    renderApplication(model, h, {
      fontLoaded: Message.LoadedFontStylesheet({ revision: model.fontRevision }),
      fontFailed: Message.FailedFontStylesheet({ revision: model.fontRevision }),
      copyHero: Message.ClickedCopyInstall({ source: 'hero' }),
      copySidebar: Message.ClickedCopyInstall({ source: 'sidebar' }),
      openNavigation: Message.ClickedNavigation(),
      retryFont: Message.ClickedRetryFont(),
    }),
  )
}

const plans = Effect.gen(function* () {
  const children = yield* ApplicationComposition.acquireChildren()
  return {
    init,
    update,
    children,
    view: makeView(),
    subscriptions: viewportSubscriptions,
    EffectsLayer: Layer.mergeAll(
      Navigate.layer,
      Apply.layer,
      CopyInstall.layer,
      FinishCopyFeedback.layer,
      FinishShapeTransition.layer,
      FinishThemeTransition.layer,
      PrepareFont.layer,
      WaitForFont.layer,
      FontDeadline.layer,
      viewportSubscriptions.layer,
    ),
  }
})

export const application = {
  block: ApplicationBlock,
  layer: ApplicationBlock.makeLayer(plans).pipe(
    Layer.provide(
      Layer.mergeAll(
        Query.layer,
        ScrollAreaLayer,
        ReferenceLayer,
        SystemPagesLayer,
        googleFontPickerLayer,
        codeClipboardLayer,
        NavigationLayer,
        SearchLayer,
        PreferencesLayer,
        GalleryLayer,
        mobileDrawerLayer,
      ),
    ),
  ),
}
export { knownPath }
