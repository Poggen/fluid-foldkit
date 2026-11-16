import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'
import {
  SelectionBackgroundsBlock,
  test as selectionTest,
} from '@foldkit-visuals/fluid/selection-backgrounds'
import { it } from '@effect/vitest'
import { Effect, Option, Result } from 'effect'
import { Story, Url } from 'foldkit'
import { expect } from 'vitest'
import { application } from './application'
import { Message } from './application-contract'
import { Apply, Navigate, FinishThemeTransition } from './application-commands'
import { FinishShapeTransition } from './shape-transition'
import { PrepareFont } from './fonts/commands'
import { prepareApplicationFlagsFor } from './application-flags'

const url = (value: string) => Option.getOrThrow(Url.fromString(value))
const settlePreferences = Story.steps(
  Story.Command.resolveAll(
    [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
    [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
    [selectionTest.SynchronizeClock, SelectionBackgroundsBlock.Message.CompletedClock()],
    [selectionTest.SynchronizeClock, SelectionBackgroundsBlock.Message.CompletedClock()],
  ),
)

it.effect(
  'publishes root typography only for font and size, and theme transitions only for theme',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareApplicationFlagsFor('https://example.test/')
      yield* Story.withBlock(application, (app) => {
        const initial = app.init(flags, url('https://example.test/introduction')).model
        for (const key of ['f', 's'] as const) {
          Story.story(
            app.update,
            Story.given(initial),
            Story.message(Message.PressedSettingsShortcut({ key })),
            settlePreferences,
            Story.Command.expectExact(Apply, Navigate),
            Story.Command.resolveAllExact(
              [Apply, Message.CompletedApply()],
              [Navigate, Message.CompletedNavigate()],
            ),
          )
        }
        for (const key of ['r', 'h'] as const) {
          Story.story(
            app.update,
            Story.given(initial),
            Story.message(Message.PressedSettingsShortcut({ key })),
            settlePreferences,
            Story.Command.resolveAll([
              FinishShapeTransition,
              Message.CompletedShapeTransition({ revision: 1 }),
            ]),
            Story.Command.expectExact(Navigate),
            Story.Command.resolve(Navigate, Message.CompletedNavigate()),
          )
        }
        Story.story(
          app.update,
          Story.given(initial),
          Story.message(
            Message.ChangedUrl({ url: url('https://example.test/introduction?accent=%2312abef') }),
          ),
          Story.model((model) => expect(model.settings.accent).toBe('#12abef')),
          settlePreferences,
          Story.Command.expectNone(),
        )
        const fixedTheme = Story.story(
          app.update,
          Story.given(initial),
          Story.message(Message.PressedSettingsShortcut({ key: 't' })),
          settlePreferences,
          Story.Command.expectExact(Apply, Navigate, FinishThemeTransition),
          Story.Command.resolveAllExact(
            [Apply, Message.CompletedApply()],
            [Navigate, Message.CompletedNavigate()],
            [FinishThemeTransition, Message.CompletedThemeTransition({ revision: 1 })],
          ),
        )
        Story.story(
          app.update,
          Story.given(initial),
          Story.message(Message.ObservedSystemTheme({ theme: 'dark' })),
          Story.model((model) => expect(model.systemTheme).toBe('dark')),
          Story.Command.expectExact(Apply),
          Story.Command.resolve(Apply, Message.CompletedApply()),
        )
        Story.story(
          app.update,
          Story.given(fixedTheme),
          Story.message(Message.ObservedSystemTheme({ theme: 'dark' })),
          Story.Command.expectNone(),
        )
      })
    }),
)

it.effect('publishes accepted font failure and retry outcomes while ignoring stale loads', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    yield* Story.withBlock(application, (app) => {
      const initial = app.init(
        flags,
        url('https://example.test/introduction?font=custom&family=Inter'),
      ).model
      const font = {
        name: 'Inter',
        category: 'sans-serif' as const,
        weights: [400, 550, 700],
        italicOnly: false,
        weightAxis: null,
        opticalAxis: null,
      }
      const loading: typeof initial = {
        ...initial,
        fontAsset: { _tag: 'Loading', revision: initial.fontRevision, font },
      }
      const failed = Story.story(
        app.update,
        Story.given(loading),
        Story.message(
          Message.CompletedFontLoad({ revision: loading.fontRevision, success: false }),
        ),
        Story.model((model) => {
          expect(model.fontAsset._tag).toBe('Failed')
          expect(model.settings.font).toBe('custom')
        }),
        Story.Command.expectExact(Apply),
        Story.Command.resolve(Apply, Message.CompletedApply()),
      )
      const retried = Story.story(
        app.update,
        Story.given(failed),
        Story.message(Message.ClickedRetryFont()),
        Story.Command.expectExact(PrepareFont),
        Story.Command.resolve(
          PrepareFont,
          Message.CompletedFontPreparation({
            revision: failed.fontRevision + 1,
            result: Result.fail('Font catalogue unavailable'),
          }),
        ),
        Story.Command.expectExact(Apply),
        Story.Command.resolve(Apply, Message.CompletedApply()),
      )
      const fresh: typeof initial = {
        ...retried,
        fontAsset: { _tag: 'Loading', revision: retried.fontRevision, font },
      }
      Story.story(
        app.update,
        Story.given(fresh),
        Story.message(Message.CompletedFontLoad({ revision: loading.fontRevision, success: true })),
        Story.Command.expectNone(),
        Story.message(Message.CompletedFontLoad({ revision: fresh.fontRevision, success: true })),
        Story.model((model) => expect(model.fontAsset._tag).toBe('Ready')),
        Story.Command.expectExact(Apply),
        Story.Command.resolve(Apply, Message.CompletedApply()),
      )
    })
  }),
)
