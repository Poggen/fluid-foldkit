import { PreviewHeights } from './gallery/geometry'
import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import { ReferenceQuery } from './reference/query'
import { MobileDrawerBlock } from '@foldkit-visuals/fluid/mobile-drawer'
import { Schema } from 'effect'
import { Block, Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { SiteEnvironment } from './environment'
import { GalleryBlock } from './gallery/block'
import { ApplicationFlags, PreparedGalleryBaseline } from './application-flags'
import { NavigationBlock } from './navigation'
import { PreferencesBlock } from './preferences'
import { SearchBlock } from './search'
import { Settings, ResolvedTheme } from './settings'
import { GoogleFontPickerBlock } from './fonts/picker'
import { FontAsset } from './fonts/asset-state'
import { CopyFeedback, CopySource } from './copy-feedback'
import { SettingsShortcut } from './global-shortcuts'
import { GoogleFont } from './fonts/catalogue'
import { ComponentReferenceBlock } from './reference/block'
import { CodeClipboardBlock } from './code-clipboard'
import { SystemPagesBlock } from './system'
export const PendingSettingsUrl = Schema.Struct({ revision: Schema.Natural, href: Schema.String })
export type PendingSettingsUrl = typeof PendingSettingsUrl.Type

const key = Symbol('ShowcaseApplication')
export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url.Url },
  PreparedUrl: {
    url: Url.Url,
    revision: Schema.Natural,
    success: Schema.Boolean,
  },
  CompletedNavigate: {},
  CompletedApply: {},
  ReleasedStartupInput: {},
  SettledSettingsUrl: { revision: Schema.Natural },
  ObservedSystemTheme: { theme: ResolvedTheme },
  CompletedThemeTransition: { revision: Schema.Natural },
  CompletedFontPreparation: {
    revision: Schema.Natural,
    result: Schema.Result(GoogleFont, Schema.String),
  },
  LoadedFontStylesheet: { revision: Schema.Natural },
  FailedFontStylesheet: { revision: Schema.Natural },
  CompletedFontLoad: { revision: Schema.Natural, success: Schema.Boolean },
  ClickedRetryFont: {},
  TimedOutFont: { revision: Schema.Natural },
  PressedSettingsShortcut: { key: SettingsShortcut },
  CompletedShapeTransition: { revision: Schema.Natural },
  CompletedCopyInstall: { success: Schema.Boolean, revision: Schema.Natural, source: CopySource },
  ClickedCopyInstall: { source: CopySource },
  CompletedCopyFeedback: { revision: Schema.Natural, source: CopySource },
  ClickedNavigation: {},
  CapturedColumns: { columns: Schema.Literals([1, 2, 3]) },
})
export const ApplicationBlock = Block.make('Application', {
  key,
  InitArgs: Schema.Tuple([ApplicationFlags, Url.Url]),
  ChildInitContext: Schema.Struct({
    settings: Settings,
    path: Schema.String,
  }),
  Model: Schema.Struct({
    path: Schema.String,
    routeRevision: Schema.Natural,
    documentation: Schema.Literals(['unloaded', 'loading', 'ready']),
    hash: Schema.String,
    isEmbed: Schema.Boolean,
    chartStylesActive: Schema.Boolean,
    initialGalleryFlags: PreparedGalleryBaseline,
    landingPreviewHeights: PreviewHeights,
    maybeLandingGallery: Schema.Option(GalleryBlock.Model),
    referenceQuery: ReferenceQuery.Model,
    maybeReference: Schema.Option(
      Schema.Struct({ key: Schema.String, model: ComponentReferenceBlock.Model }),
    ),
    maybeReferenceGallery: Schema.Option(
      Schema.Struct({ key: Schema.String, model: GalleryBlock.Model }),
    ),
    maybeSystem: Schema.Option(
      Schema.Struct({ key: Schema.String, model: SystemPagesBlock.Model }),
    ),
    maybeEmbeddedGallery: Schema.Option(
      Schema.Struct({ key: Schema.String, model: GalleryBlock.Model }),
    ),
    settings: Settings,
    systemTheme: ResolvedTheme,
    systemThemeKnown: Schema.Boolean,
    settingsUrlRevision: Schema.Natural,
    pendingSettingsUrl: Schema.Option(PendingSettingsUrl),
    themeRevision: Schema.Natural,
    maybeThemeTransition: Schema.OptionFromNullOr(Schema.Natural),
    fontRevision: Schema.Natural,
    fontAsset: FontAsset,
    fontPicker: GoogleFontPickerBlock.Model,
    rightRailScroll: ScrollAreaBlock.Model,
    navigation: NavigationBlock.Model,
    mobileMenu: NavigationBlock.Model,
    search: SearchBlock.Model,
    preferences: PreferencesBlock.Model,
    mobilePreferences: PreferencesBlock.Model,
    mobileNavigation: MobileDrawerBlock.Model,
    columns: Schema.NullOr(Schema.Literals([1, 2, 3])),
    copyFeedback: CopyFeedback,
    settingsAnnouncement: Schema.String,
    presentationRevision: Schema.Natural,
    maybeShapeTransition: Schema.OptionFromNullOr(Schema.Natural),
    codeClipboard: CodeClipboardBlock.Model,
  }),
  Message,
  effects: Block.makeEffectsContract<
    never,
    | SiteEnvironment
    | Block.FactsOf<typeof ReferenceQuery>['programRequirements']
    | Block.FactsOf<typeof ComponentReferenceBlock>['programRequirements']
    | Block.FactsOf<typeof SystemPagesBlock>['programRequirements']
    | Block.FactsOf<typeof SearchBlock>['programRequirements']
    | Block.FactsOf<typeof PreferencesBlock>['programRequirements']
    | Block.FactsOf<typeof GalleryBlock>['programRequirements']
  >(),
  view: { kind: 'Document' },
})
