import { Context, Effect, Stream } from 'effect'
import { Render } from 'foldkit'
import { suppressTransitionStyles, themeTransitionStyles } from './theme'
import { headingFontPresentation } from './settings'
import type { Settings, ResolvedTheme } from './settings'
import type { SettingsShortcut } from './global-shortcuts'
import type { FontChoice } from './fonts/catalogue'
export class SiteEnvironment extends Context.Service<
  SiteEnvironment,
  {
    readonly isMac: boolean
    readonly origin?: string
    readonly settingsShortcuts?: Stream.Stream<SettingsShortcut>
    readonly systemThemeChanges?: Stream.Stream<ResolvedTheme>
    readonly loadFont?: (choice: FontChoice) => Effect.Effect<boolean>
    readonly columnsChanges: Stream.Stream<1 | 2 | 3>
    readonly transitionShape?: Effect.Effect<void>
    readonly transitionTheme?: Effect.Effect<void>
    readonly apply: (settings: Settings, fontFailed?: boolean) => Effect.Effect<void>
    readonly copy: (text: string) => Effect.Effect<boolean>
  }
>()('SiteEnvironment') {}

export const publishRootPresentation = (
  root: HTMLElement,
  settings: Settings,
  theme: ResolvedTheme,
  fontFailed = false,
) => {
  const heading = headingFontPresentation(settings)
  const font =
    settings.font === 'serif' ? 'geist-serif' : settings.font === 'custom' ? 'custom' : 'inter'
  if (root.dataset.size !== settings.size) root.dataset.size = settings.size
  if (root.dataset.font !== font) root.dataset.font = font
  if (root.classList.contains('dark') !== (theme === 'dark'))
    root.classList.toggle('dark', theme === 'dark')
  if (root.classList.contains('light') !== (theme === 'light'))
    root.classList.toggle('light', theme === 'light')
  if (root.style.colorScheme !== theme) root.style.colorScheme = theme
  const properties = {
    '--heading-family': fontFailed ? 'var(--font-sans)' : heading.family,
    '--heading-weight': String(heading.weight),
    '--heading-display-weight': String(heading.displayWeight),
  }
  for (const [name, value] of Object.entries(properties)) {
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value)
  }
}

export const presentationEffects = (document: Document, window: Window) => {
  const shapeGuards = new Set<symbol>()
  const themeGuards = new Set<HTMLStyleElement>()
  const root = document.documentElement
  const synchronizeShapeGuard = () =>
    root.classList.toggle('transitioning', shapeGuards.size > 0 && themeGuards.size === 0)
  const nextFrame = Effect.callback<void>((resume) => {
    const frame = window.requestAnimationFrame(() => resume(Effect.void))
    return Effect.sync(() => window.cancelAnimationFrame(frame))
  })
  const acquireThemeGuard = () => {
    const style = document.createElement('style')
    style.textContent = themeTransitionStyles + suppressTransitionStyles
    document.head.appendChild(style)
    themeGuards.add(style)
    synchronizeShapeGuard()
    return () => {
      style.remove()
      themeGuards.delete(style)
      synchronizeShapeGuard()
    }
  }
  return {
    prepareNativeThemeTransition: () => {
      const release = acquireThemeGuard()
      queueMicrotask(() => {
        const transition = document.activeViewTransition
        if (transition) void transition.finished.then(release, release)
        else release()
      })
      return true
    },
    transitionShape: Effect.acquireUseRelease(
      Effect.sync(() => {
        const guard = Symbol('shape-transition')
        shapeGuards.add(guard)
        synchronizeShapeGuard()
        void root.offsetHeight
        return guard
      }),
      () => Render.afterCommit.pipe(Effect.andThen(Effect.sleep('200 millis'))),
      (guard) =>
        Effect.sync(() => {
          shapeGuards.delete(guard)
          synchronizeShapeGuard()
        }),
    ),
    transitionTheme: Effect.acquireUseRelease(
      Effect.sync(acquireThemeGuard),
      () =>
        Effect.gen(function* () {
          yield* Render.afterCommit

          yield* Effect.yieldNow
          const transition = document.activeViewTransition
          if (transition != null) {
            yield* Effect.tryPromise(() => transition.finished).pipe(Effect.ignore)
          } else {
            void window.getComputedStyle(document.body).color
            yield* nextFrame
            yield* nextFrame
          }
        }),
      (release) => Effect.sync(release),
    ),
  }
}
