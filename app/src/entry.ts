import { prepareDocumentation } from './documentation-runtime'
import { inject } from '@vercel/analytics'
import { releaseEarlyInput, cancelEarlyInput } from './early-input'
import { showStartupFailure } from './startup-failure'
import { messageAssetsLayer } from './reference/message-assets'
import { createQueuedStackFramesLayer } from '@foldkit-visuals/fluid/queued-stack'
import { questionValidators } from './reference/authored-questions'
import { showcaseFileLayer } from './file-resources'
import { motion as authoredTooltipMotion } from '../../registry/fluid/examples/src/tooltip-example-block'
import { motion as authoredCardMotion } from '../../registry/fluid/examples/src/card-example-block'
import {
  targetMotion as authoredThinkingTarget,
  motion as authoredThinkingMotion,
} from '../../registry/fluid/examples/src/thinking-example-block'
import { motion as authoredDropdownMotion } from '../../registry/fluid/examples/src/dropdown-example-block'
import {
  motion as authoredBreadcrumbMotion,
  switchMotion as authoredBreadcrumbSwitchMotion,
} from '../../registry/fluid/examples/src/breadcrumb-example-block'
import { motion as authoredFormMotion } from '../../registry/fluid/examples/src/form-docs-block'
import { motion as authoredFieldMotion } from '../../registry/fluid/examples/src/field-docs-block'
import { createAskUserQuestionsLayer } from '@foldkit-visuals/fluid/ask-user-questions'
import { CardGroupRefsDefaultLayer } from '@foldkit-visuals/fluid/card'
import { CarouselDotsResourcesDefaultLayer } from '@foldkit-visuals/fluid/carousel-dots'
import { makeTouchPrimaryLayer } from '@foldkit-visuals/fluid/chat-message'
import { createColorPickerLayer } from '@foldkit-visuals/fluid/color-picker'
import { createComboboxLayer } from '@foldkit-visuals/fluid/combobox'
import { PopupAuthorityLayer } from '@foldkit-visuals/fluid/date-picker'
import { DialogResources } from '@foldkit-visuals/fluid/dialog'
import { DialogResourcesLayer } from '@foldkit-visuals/fluid/dialog/environment'
import { DropdownResourcesLayer } from '@foldkit-visuals/fluid/dropdown/environment'
import { inputFileResourcesLayer } from '@foldkit-visuals/fluid/input'
import { createInputCopyLayer } from '@foldkit-visuals/fluid/input-copy'
import {
  createInputMessageFileRegistry,
  createInputMessageLayer,
} from '@foldkit-visuals/fluid/input-message'
import { makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import { Effect, Layer, Queue, Schema, Stream } from 'effect'
import { Program, Render, Runtime } from 'foldkit'
import { application } from './application'
import { SiteEnvironment, presentationEffects, publishRootPresentation } from './environment'
import { CalendarEnvironmentLayer } from './gallery/flags'
import { ApplicationFlags } from './application-flags'
import { bannerMotion, sliderMotion, switchMotion } from './gallery/fluid/core-bindings'
import { reorder } from './gallery/fluid/interactive-bindings'
import { motion, target } from './motion'
import { SettingsShortcut } from './global-shortcuts'
import { shouldTransitionTheme } from './theme'
import { ReferenceClientLayer } from './reference/client'
import './styles.css'
import type { createBrowserDiagnostics } from './diagnostics/browser'

const messageFiles = createInputMessageFileRegistry()
const dialogs = DialogResourcesLayer(document)
const dropdowns = Layer.unwrap(
  Effect.gen(function* () {
    const branches = yield* DialogResources
    return DropdownResourcesLayer(document, branches)
  }),
).pipe(Layer.provide(dialogs))
const presentation = presentationEffects(document, window)
const environment = Layer.succeed(SiteEnvironment, {
  ...presentation,
  origin: location.origin,
  isMac: /Mac|iPhone|iPad|iPod/u.test(navigator.platform),
  settingsShortcuts: Stream.callback<SettingsShortcut>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const listener = (event: KeyboardEvent) => {
          const key = event.key.toLowerCase()
          const target = event.target instanceof HTMLElement ? event.target : null
          if (
            event.defaultPrevented ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey ||
            !Schema.is(SettingsShortcut)(key) ||
            target?.matches('input,textarea,select') ||
            target?.isContentEditable ||
            target?.closest(
              'dialog,[role=listbox],[role=menu],[role=dialog],[role=combobox],[role=option]',
            )
          )
            return
          event.preventDefault()
          Queue.offerUnsafe(queue, key)
        }
        document.addEventListener('keydown', listener)
        return () => document.removeEventListener('keydown', listener)
      }),
      (release) => Effect.sync(release),
    ).pipe(Effect.flatMap(() => Effect.never)),
  ),
  systemThemeChanges: Stream.callback<'light' | 'dark'>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const changed = () => Queue.offerUnsafe(queue, media.matches ? 'dark' : 'light')
        media.addEventListener('change', changed)
        changed()
        return () => media.removeEventListener('change', changed)
      }),
      (release) => Effect.sync(release),
    ).pipe(Effect.flatMap(() => Effect.never)),
  ),
  loadFont: (choice) =>
    Effect.tryPromise(() =>
      document.fonts.load(`${choice.weight ?? 550} 16px "${choice.family}"`),
    ).pipe(
      Effect.as(true),
      Effect.catchCause(() => Effect.succeed(false)),
    ),
  columnsChanges: Stream.callback<1 | 2 | 3>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const medium = window.matchMedia('(min-width:768px)'),
          wide = window.matchMedia('(min-width:1280px)')
        let previous: 1 | 2 | 3 | undefined
        const changed = () => {
          const columns = wide.matches ? 3 : medium.matches ? 2 : 1
          if (columns === previous) return
          motion.captureLayout()
          previous = columns
          Queue.offerUnsafe(queue, columns)
        }
        window.addEventListener('resize', changed)
        changed()
        return () => window.removeEventListener('resize', changed)
      }),
      (release) => Effect.sync(release),
    ).pipe(Effect.flatMap(() => Effect.never)),
  ),
  apply: (settings, fontFailed) =>
    Render.afterCommit.pipe(
      Effect.andThen(
        Effect.sync(() => {
          const theme =
            settings.theme === 'system'
              ? window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
              : settings.theme
          publishRootPresentation(document.documentElement, settings, theme, fontFailed)
          releaseEarlyInput(window)
        }),
      ),
    ),
  copy: (text) =>
    Effect.tryPromise(() => navigator.clipboard.writeText(text)).pipe(
      Effect.as(true),
      Effect.catchCause(() => Effect.succeed(false)),
    ),
})
const hydrate = (diagnostics?: ReturnType<typeof createBrowserDiagnostics>) =>
  Runtime.hydrate(
    Program.make({
      block: application.block,
      Flags: ApplicationFlags,
      viewTransition: ({ previousModel, model, message }) =>
        message._tag !== 'ObservedSystemTheme' &&
        shouldTransitionTheme(
          previousModel.settings,
          model.settings,
          previousModel.systemThemeKnown,
          model.systemThemeKnown,
          previousModel.systemTheme,
          model.systemTheme,
        ) &&
        presentation.prepareNativeThemeTransition(),
      layer: application.layer,
      devTools: { dispatch: true },
      ...(diagnostics === undefined ? {} : { slow: diagnostics.slow }),
      container: document.getElementById('root'),
      routing: {
        onUrlRequest: application.block.Message.ClickedLink,
        onUrlChange: application.block.Message.ChangedUrl,
      },
    }).provide(
      Layer.mergeAll(
        diagnostics?.layer ?? Layer.empty,
        messageAssetsLayer(messageFiles),
        createQueuedStackFramesLayer(window),
        environment,
        ReferenceClientLayer,
        dialogs,
        dropdowns,
        inputFileResourcesLayer,
        motion.layer,
        reorder.layer,
        target.layer,
        authoredFormMotion.layer,
        authoredFieldMotion.layer,
        authoredDropdownMotion.layer,
        authoredCardMotion.layer,
        authoredTooltipMotion.layer,
        authoredThinkingTarget.layer,
        authoredThinkingMotion.layer,
        authoredBreadcrumbMotion.layer,
        authoredBreadcrumbSwitchMotion.layer,
        CardGroupRefsDefaultLayer,
        CarouselDotsResourcesDefaultLayer,
        sliderMotion.layer,
        switchMotion.layer,
        bannerMotion.layer,
        CalendarEnvironmentLayer,
        PopupAuthorityLayer,
        createInputCopyLayer(document, navigator, window),
        createInputMessageLayer(document, window, messageFiles),
        createAskUserQuestionsLayer({
          document,
          platform: navigator.platform,
          validators: questionValidators,
        }),
        createColorPickerLayer(document),
        createComboboxLayer(document),
        makeTooltipDomLayer(document, window),
        makeTouchPrimaryLayer(window),
        showcaseFileLayer(messageFiles),
      ),
    ),
  )

void prepareDocumentation(location.pathname).then(
  () => {
    if (import.meta.env.VITE_SHOWCASE_TRACE === '1') {
      void import('./diagnostics/browser').then((module) =>
        hydrate(module.createBrowserDiagnostics(window, document)),
      )
    } else {
      hydrate()
    }
  },
  () => {
    cancelEarlyInput(window)
    showStartupFailure(document, () => window.location.reload())
  },
)

if (import.meta.env.VITE_VERCEL_ANALYTICS === '1') inject({ mode: 'production' })
