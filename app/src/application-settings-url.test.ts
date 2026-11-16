import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'
import {
  SelectionBackgroundsBlock,
  test as selectionTest,
} from '@foldkit-visuals/fluid/selection-backgrounds'
import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story, Url } from 'foldkit'
import { toParentMessageFor } from 'foldkit/test'
import { UrlRequest } from 'foldkit/navigation'
import { expect } from 'vitest'
import { application } from './application'
import { Message } from './application-contract'
import { Apply, Navigate } from './application-commands'
import { prepareApplicationFlagsFor } from './application-flags'
import { PreferencesRequests } from './application-bindings'
import { PreferencesBlock } from './preferences'
import { defaults } from './settings'

const url = (value: string) => Option.getOrThrow(Url.fromString(value))
const href = '/?accent=%23aabbcc#examples'

it.effect('settled accent persistence ignores stale completions and yields to navigation', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    yield* Story.withBlock(application, (app) => {
      const initial = {
        ...app.init(flags, url(`https://example.test${href}`)).model,
        settingsUrlRevision: 2,
        pendingSettingsUrl: Option.some({ revision: 2, href }),
      }
      const backAtDefaults = {
        ...initial,
        settings: defaults,
        pendingSettingsUrl: Option.some({ revision: 2, href: '/#examples' }),
      }
      Story.story(
        app.update,
        Story.given(backAtDefaults),
        Story.message(
          toParentMessageFor(app)(PreferencesRequests, PreferencesBlock.Message.ClickedReset()),
        ),
        Story.model((model) => {
          expect(Option.isNone(model.pendingSettingsUrl)).toBe(true)
          expect(model.settings).toBe(defaults)
        }),
        Story.Command.expectExact(Navigate({ href: '/#examples', external: false })),
        Story.Command.resolve(Navigate, Message.CompletedNavigate()),
        Story.message(Message.SettledSettingsUrl({ revision: 2 })),
        Story.Command.expectNone(),
      )
      Story.story(
        app.update,
        Story.given(initial),
        Story.models(
          Story.steps(Story.message(Message.SettledSettingsUrl({ revision: 1 }))),
          (before, after) => expect(after).toBe(before),
        ),
        Story.Command.expectNone(),
        Story.message(Message.SettledSettingsUrl({ revision: 2 })),
        Story.model((model) => {
          expect(Option.isNone(model.pendingSettingsUrl)).toBe(true)
          expect(model.settings).toBe(initial.settings)
        }),
        Story.Command.expectExact(Navigate({ href, external: false, replace: true })),
        Story.Command.resolve(Navigate, Message.CompletedNavigate()),
        Story.models(
          Story.steps(Story.message(Message.SettledSettingsUrl({ revision: 2 }))),
          (before, after) => expect(after).toBe(before),
        ),
        Story.Command.expectNone(),
      )
      Story.story(
        app.update,
        Story.given(initial),
        Story.message(
          Message.ClickedLink({
            request: UrlRequest.Internal({
              url: url('https://example.test/introduction#composition'),
            }),
          }),
        ),
        Story.model((model) => expect(Option.isNone(model.pendingSettingsUrl)).toBe(true)),
        Story.Command.expectExact(
          Navigate({ href: '/introduction?accent=%23aabbcc#composition', external: false }),
        ),
        Story.Command.resolve(Navigate, Message.CompletedNavigate()),
        Story.message(Message.SettledSettingsUrl({ revision: 2 })),
        Story.Command.expectNone(),
      )
      Story.story(
        app.update,
        Story.given(initial),
        Story.message(Message.ChangedUrl({ url: url(`https://example.test${href}`) })),
        Story.model((model) => expect(Option.isNone(model.pendingSettingsUrl)).toBe(true)),
        Story.message(Message.SettledSettingsUrl({ revision: 2 })),
        Story.Command.expectNone(),
      )
      Story.story(
        app.update,
        Story.given(initial),
        Story.message(Message.PressedSettingsShortcut({ key: 'f' })),
        Story.model((model) => {
          expect(Option.isNone(model.pendingSettingsUrl)).toBe(true)
          expect(model.settings.font).toBe('serif')
        }),
        Story.Command.resolveAll(
          [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
          [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
          [selectionTest.SynchronizeClock, SelectionBackgroundsBlock.Message.CompletedClock()],
          [selectionTest.SynchronizeClock, SelectionBackgroundsBlock.Message.CompletedClock()],
        ),
        Story.Command.expectExact(
          Apply({ settings: { ...initial.settings, font: 'serif' }, fontFailed: false }),
          Navigate({ href: '/?accent=%23aabbcc&font=serif#examples', external: false }),
        ),
        Story.Command.resolveAllExact(
          [Apply, Message.CompletedApply()],
          [Navigate, Message.CompletedNavigate()],
        ),
        Story.message(Message.SettledSettingsUrl({ revision: 2 })),
        Story.Command.expectNone(),
      )
    })
  }),
)
