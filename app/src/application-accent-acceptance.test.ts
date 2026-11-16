import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'
import {
  SelectionBackgroundsBlock,
  test as selectionTest,
} from '@foldkit-visuals/fluid/selection-backgrounds'
import { colorValueOf } from '@foldkit-visuals/fluid/color-picker'
import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story, Url } from 'foldkit'
import { expect } from 'vitest'
import { application } from './application'
import { Message } from './application-contract'
import { prepareApplicationFlagsFor } from './application-flags'
import { accentColor } from './settings'

const url = (value: string) => Option.getOrThrow(Url.fromString(value))
const settleAccentControls = Story.Command.resolveAll(
  [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
  [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
  [selectionTest.SynchronizeClock, SelectionBackgroundsBlock.Message.CompletedClock()],
  [selectionTest.SynchronizeClock, SelectionBackgroundsBlock.Message.CompletedClock()],
)

it.effect(
  'external accent history still configures the picker and supersedes pending persistence',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareApplicationFlagsFor('https://example.test/')
      yield* Story.withBlock(application, (app) => {
        const initial = app.init(
          flags,
          url('https://example.test/?accent=%2312abef#examples'),
        ).model
        const pending = {
          ...initial,
          settingsUrlRevision: 7,
          pendingSettingsUrl: Option.some({ revision: 7, href: '/?accent=%2312abef#examples' }),
        }
        const changed = Story.story(
          app.update,
          Story.given(pending),
          Story.message(
            Message.ChangedUrl({ url: url('https://example.test/?accent=red#examples') }),
          ),
          settleAccentControls,
          Story.model((model) => {
            const landing = Option.getOrUndefined(model.maybeLandingGallery)
            if (landing === undefined) throw new Error('Expected the landing Gallery')
            expect(model.settings.accent).toBe('red')
            expect(colorValueOf(landing.fluid.color).toLowerCase()).toBe(
              accentColor('red').toLowerCase(),
            )
            expect(model.preferences.accent.value).toBe('red')
            expect(model.mobilePreferences.accent.value).toBe('red')
            expect(model.hash).toBe('#examples')
            expect(Option.isNone(model.pendingSettingsUrl)).toBe(true)
            expect(Option.isNone(model.maybeReferenceGallery)).toBe(true)
          }),
          Story.message(Message.SettledSettingsUrl({ revision: 7 })),
          Story.Command.expectNone(),
        )
        Story.story(
          app.update,
          Story.given(changed),
          Story.models(
            Story.steps(
              Story.message(
                Message.ChangedUrl({ url: url('https://example.test/?accent=red#examples') }),
              ),
            ),
            (before, after) => {
              expect(after.settings).toBe(before.settings)
              expect(after.maybeLandingGallery).toBe(before.maybeLandingGallery)
            },
          ),
          Story.Command.expectNone(),
        )
        const props = encodeURIComponent(JSON.stringify({ value: 'Embedded accepted draft' }))
        const embedded = app.init(
          flags,
          url(`https://example.test/components/input?embed=1&props=${props}`),
        ).model
        Story.story(
          app.update,
          Story.given(embedded),
          Story.message(
            Message.ChangedUrl({
              url: url(`https://example.test/components/input?embed=1&props=${props}&accent=red`),
            }),
          ),
          settleAccentControls,
          Story.model((model) => {
            expect(model.isEmbed).toBe(true)
            expect(model.settings.accent).toBe('red')
            expect(Option.getOrThrow(model.maybeEmbeddedGallery).model.fluid.input.value).toBe(
              'Embedded accepted draft',
            )
            expect(Option.isNone(model.maybeReference)).toBe(true)
          }),
          Story.Command.expectNone(),
        )
      })
    }),
)
