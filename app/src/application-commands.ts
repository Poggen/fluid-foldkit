import { pathFromUrl } from './route'
import { prepareDocumentation } from './documentation-runtime'
import { Url } from 'foldkit'
import { Effect, Option, Schema, Stream } from 'effect'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { ApplicationBlock, Message, PendingSettingsUrl } from './application-contract'
import { pageAt } from '../../lib/catalogue'
import { SiteEnvironment } from './environment'
import { Settings } from './settings'
import { CopySource } from './copy-feedback'
import { buildInstallBrief } from './install-brief'
import { Render } from 'foldkit'

export const PrepareRoute = ApplicationBlock.makeCommand('PrepareRoute', {
  args: {
    url: Url.Url,
    revision: Schema.Natural,
  },
  messages: [Message.PreparedUrl],
  *handler() {
    return (route) =>
      Effect.tryPromise(() => prepareDocumentation(pathFromUrl(route.url))).pipe(
        Effect.match({
          onSuccess: () => Message.PreparedUrl({ ...route, success: true }),
          onFailure: () => Message.PreparedUrl({ ...route, success: false }),
        }),
      )
  },
})

export const Navigate = ApplicationBlock.makeCommand('Navigate', {
  args: {
    href: Schema.String,
    external: Schema.Boolean,
    replace: Schema.optionalKey(Schema.Boolean),
  },
  messages: [Message.CompletedNavigate],
  *handler() {
    return ({ href, external, replace }) =>
      (external ? load(href) : replace ? replaceUrl(href) : pushUrl(href)).pipe(
        Effect.as(Message.CompletedNavigate()),
      )
  },
})
export const Apply = ApplicationBlock.makeCommand('Apply', {
  args: { settings: Settings, fontFailed: Schema.optionalKey(Schema.Boolean) },
  messages: [Message.CompletedApply],
  *handler() {
    const env = yield* SiteEnvironment
    return ({ settings, fontFailed }) =>
      env.apply(settings, fontFailed).pipe(Effect.as(Message.CompletedApply()))
  },
})
export const CopyInstall = ApplicationBlock.makeCommand('CopyInstall', {
  args: { path: Schema.String, settings: Settings, revision: Schema.Natural, source: CopySource },
  messages: [Message.CompletedCopyInstall],
  *handler() {
    const env = yield* SiteEnvironment
    return ({ path, settings, revision, source }) => {
      const text = buildInstallBrief(env.origin ?? 'http://localhost', pageAt(path), settings)
      return env
        .copy(text)
        .pipe(Effect.map((success) => Message.CompletedCopyInstall({ success, revision, source })))
    }
  },
})

export const viewportSubscriptions = ApplicationBlock.makeSubscriptions((entry) => ({
  settingsUrl: entry(
    'SettingsUrl',
    { pending: Schema.Option(PendingSettingsUrl) },
    {
      messages: [Message.SettledSettingsUrl],
      when: (model) => Option.isSome(model.pendingSettingsUrl),
      modelToDependencies: (model) => ({ pending: model.pendingSettingsUrl }),
      *handler() {
        return ({ pending }) =>
          Option.match(pending, {
            onNone: () => Stream.empty,
            onSome: ({ revision }) =>
              Stream.fromEffect(
                Effect.sleep('250 millis').pipe(
                  Effect.as(Message.SettledSettingsUrl({ revision })),
                ),
              ),
          })
      },
    },
  ),
  settingsShortcuts: entry('SettingsShortcuts', {
    messages: [Message.PressedSettingsShortcut],
    *handler() {
      const environment = yield* SiteEnvironment
      return () =>
        (environment.settingsShortcuts ?? Stream.empty).pipe(
          Stream.map((key) => Message.PressedSettingsShortcut({ key })),
        )
    },
  }),
  systemTheme: entry('SystemTheme', {
    messages: [Message.ObservedSystemTheme],
    *handler() {
      const environment = yield* SiteEnvironment
      return () =>
        (environment.systemThemeChanges ?? Stream.succeed('light')).pipe(
          Stream.map((theme) => Message.ObservedSystemTheme({ theme })),
        )
    },
  }),
  viewport: entry('Viewport', {
    messages: [Message.CapturedColumns],
    *handler() {
      const environment = yield* SiteEnvironment
      return () =>
        environment.columnsChanges.pipe(
          Stream.map((columns) => Message.CapturedColumns({ columns })),
        )
    },
  }),
}))

export const FinishThemeTransition = ApplicationBlock.makeCommand('FinishThemeTransition', {
  args: { revision: Schema.Natural },
  messages: [Message.CompletedThemeTransition],
  *handler() {
    const environment = yield* SiteEnvironment
    return ({ revision }) =>
      (environment.transitionTheme ?? Render.afterPaint).pipe(
        Effect.as(Message.CompletedThemeTransition({ revision })),
      )
  },
})

export const FinishCopyFeedback = ApplicationBlock.makeCommand('FinishCopyFeedback', {
  args: { revision: Schema.Natural, source: CopySource },
  messages: [Message.CompletedCopyFeedback],
  *handler() {
    return ({ revision, source }) =>
      Effect.sleep('2 seconds').pipe(Effect.as(Message.CompletedCopyFeedback({ revision, source })))
  },
})
