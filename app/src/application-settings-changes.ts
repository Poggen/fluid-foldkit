import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import { MobileDrawerBlock } from '@foldkit-visuals/fluid/mobile-drawer'
import { ApplicationBlock } from './application-contract'
import {
  PreferencesRequests,
  MobilePreferencesRequests,
  FontPickerRequests,
  Search,
  Navigation,
  MobileMenu,
} from './application-bindings'
import { embeddedConfiguration } from './application-galleries'
import { accentValue } from './preferences'
import { Apply, FinishThemeTransition, Navigate } from './application-commands'
import { requestFont } from './application-fonts'
import { resetCopyFeedback } from './copy-feedback'
import { startShapeTransition } from './shape-transition'
import { informPagePresentation } from './application-pages'
import { configurationQuery } from './playground/configuration'
import {
  Settings,
  accentColor,
  accentName,
  componentPresentation,
  componentPresentationEqual,
  resolveSettings,
  settingsEqual,
  settingsQuery,
} from './settings'

type Model = typeof ApplicationBlock.Model.Type
type SettingsNavigation = 'push' | 'settled-replace' | 'none'

const settingsHref = (model: Model, settings: Settings, nextPath: string, nextHash: string) => {
  const configuration =
    model.isEmbed && model.path === nextPath
      ? Option.match(embeddedConfiguration(model), {
          onNone: () => '',
          onSome: configurationQuery,
        })
      : Option.match(model.maybeReference, {
          onNone: () => '',
          onSome: ({ key, model: reference }) =>
            key === nextPath ? configurationQuery(reference.configuration) : '',
        })
  const query = [
    settingsQuery(settings).replace(/^\?/, ''),
    configuration,
    model.isEmbed ? 'embed=1' : '',
  ]
    .filter(Boolean)
    .join('&')
  return `${nextPath}${query ? `?${query}` : ''}${nextHash}`
}

const commitSettings = (
  settings: Settings,
  navigation: SettingsNavigation,
  nextPath: string,
  nextHash: string,
  nextHref: string,
) =>
  ApplicationBlock.makeFieldsStep((model) => ({
    settings: () => settings,
    settingsUrlRevision: (revision) => revision + 1,
    pendingSettingsUrl: () =>
      navigation === 'settled-replace'
        ? Option.some({ revision: model.settingsUrlRevision + 1, href: nextHref })
        : Option.none(),
    path: () => nextPath,
    hash: () => nextHash,
    copyFeedback: resetCopyFeedback,
  }))

const informPreferences = (settings: Settings) =>
  Update.combineSteps([
    PreferencesRequests.informOfSelections({ settings }),
    MobilePreferencesRequests.informOfSelections({ settings }),
  ])

export const MobileNavigation = ApplicationBlock.makeRequiredFieldBinding(MobileDrawerBlock, {
  field: 'mobileNavigation',
  init: {
    contextToArgs: () => [
      {
        id: 'navigation-dialog',
        focusSelector: '#customize-mobile-theme-select-trigger',
        returnFocusSelector: '#site-menu-button',
      },
    ],
  },
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(MobileDrawerBlock, {
    OpenChanged: ApplicationBlock.makeNoopStep,
    CloseRequested: ApplicationBlock.makeNoopStep,
  }),
})
export const changeSettings = (
  settings: Settings,
  navigation: SettingsNavigation = 'push',
  path?: string,
  hash?: string,
) =>
  ApplicationBlock.makeStep((model) => {
    const nextPath = path ?? model.path
    const nextHash = hash ?? model.hash
    const nextHref = settingsHref(model, settings, nextPath, nextHash)
    const changedSettings = !settingsEqual(settings, model.settings)
    const changedRootPresentation =
      settings.theme !== model.settings.theme ||
      settings.size !== model.settings.size ||
      settings.font !== model.settings.font ||
      settings.customFont?.family !== model.settings.customFont?.family ||
      settings.customFont?.weight !== model.settings.customFont?.weight
    const changedPath = nextPath !== model.path
    if (!changedSettings && !changedPath && nextHash === model.hash)
      return navigation === 'settled-replace' || Option.isNone(model.pendingSettingsUrl)
        ? { model }
        : {
            model: { ...model, pendingSettingsUrl: Option.none() },
            commands: navigation === 'push' ? [Navigate({ href: nextHref, external: false })] : [],
          }
    const nextPresentation = componentPresentation(settings, model.systemTheme)
    const changedPresentation = !componentPresentationEqual(
      nextPresentation,
      componentPresentation(model.settings, model.systemTheme),
    )
    return Update.combineSteps([
      startShapeTransition(settings),
      ...(settings.theme === model.settings.theme
        ? []
        : [
            ApplicationBlock.makeStep((current) => ({
              model: {
                ...current,
                themeRevision: current.themeRevision + 1,
                maybeThemeTransition: Option.some(current.themeRevision + 1),
              },
              commands: [FinishThemeTransition({ revision: current.themeRevision + 1 })],
            })),
          ]),
      ...(settings.font === model.settings.font &&
      settings.customFont?.family === model.settings.customFont?.family
        ? []
        : [requestFont(settings)]),
      commitSettings(settings, navigation, nextPath, nextHash, nextHref),
      ...(changedPath
        ? [
            Search.informOfPage({ path: nextPath }),
            Navigation.informOfPage({ path: nextPath }),
            MobileMenu.informOfPage({ path: nextPath }),
            MobileNavigation.requestClose(),
          ]
        : []),
      ...(settings.hover !== model.settings.hover
        ? [
            Navigation.informOfHoverMode({ mode: settings.hover }),
            MobileMenu.informOfHoverMode({ mode: settings.hover }),
            Search.informOfHoverMode({ mode: settings.hover }),
            FontPickerRequests.informOfHoverMode({ mode: settings.hover }),
          ]
        : []),
      ...(changedPresentation && !changedPath ? [informPagePresentation(nextPresentation)] : []),
      ...(changedSettings ? [informPreferences(settings)] : []),
      ApplicationBlock.makeCommandsStep((current) => [
        ...(changedRootPresentation
          ? [Apply({ settings: current.settings, fontFailed: current.fontAsset._tag === 'Failed' })]
          : []),
        ...(navigation === 'push'
          ? [
              Navigate({
                href: nextHref,
                external: false,
              }),
            ]
          : []),
      ]),
    ])
  })

// The originating picker has already accepted this value in its controlled owner fold.
export const acceptLandingAccent = (accent: string) =>
  ApplicationBlock.makeStep((model) => {
    const theme = resolveSettings(model.settings, model.systemTheme).theme
    if (
      model.isEmbed ||
      !Schema.is(Settings.fields.accent)(accent) ||
      accent.toLowerCase() === accentColor(model.settings.accent, theme).toLowerCase()
    )
      return { model }
    const settings = { ...model.settings, accent: accentName(accent, theme) }
    return Update.combineSteps([
      commitSettings(
        settings,
        'settled-replace',
        model.path,
        model.hash,
        settingsHref(model, settings, model.path, model.hash),
      ),
      ...(accentValue(model.settings) === accentValue(settings)
        ? []
        : [informPreferences(settings)]),
    ])
  })
