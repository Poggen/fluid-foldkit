import { it } from '@effect/vitest'
import { Effect, Option, Result } from 'effect'
import { Story, Url } from 'foldkit'
import { expect } from 'vitest'
import { application } from './application'
import { Message } from './application-contract'
import { Navigate } from './application-commands'
import { prepareApplicationFlagsFor } from './application-flags'
import { FontCatalogue } from './fonts/catalogue'
import { Schema } from 'effect'
import rawCatalogue from './fonts/catalogue.json'
const inter = Schema.decodeUnknownSync(FontCatalogue)(rawCatalogue).fonts.find(
  (font) => font.name === 'Inter',
)
const url = (value: string) => Option.getOrThrow(Url.fromString(value))

it.effect('preserves document anchors and ignores stale font loads across failure and retry', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    yield* Story.withBlock(application, (app) => {
      if (inter === undefined) throw new Error('Inter missing from catalogue')
      const initial = app.init(
        flags,
        url('https://example.test/introduction?font=custom&family=Inter#composition'),
      ).model
      const changed = app.update(initial, Message.PressedSettingsShortcut({ key: 't' }))
      const navigation = changed.commands?.find((command) => command.name === Navigate.name)
      expect(navigation?.args?.href).toContain('#composition')
      const revision = initial.fontRevision
      const prepared = app.update(
        initial,
        Message.CompletedFontPreparation({ revision, result: Result.succeed(inter) }),
      ).model
      expect(prepared.fontAsset._tag).toBe('Stylesheet')
      const loading = app.update(prepared, Message.LoadedFontStylesheet({ revision })).model
      const failed = app.update(
        loading,
        Message.CompletedFontLoad({ revision, success: false }),
      ).model
      expect(failed.fontAsset._tag).toBe('Failed')
      expect(failed.settings.customFont?.family).toBe('Inter')
      const retry = app.update(failed, Message.ClickedRetryFont()).model
      expect(retry.fontAsset._tag).toBe('Preparing')
      expect(app.update(retry, Message.CompletedFontLoad({ revision, success: true })).model).toBe(
        retry,
      )
      const fresh = retry.fontRevision
      const readyCss = app.update(
        retry,
        Message.CompletedFontPreparation({ revision: fresh, result: Result.succeed(inter) }),
      ).model
      const readyFace = app.update(
        readyCss,
        Message.LoadedFontStylesheet({ revision: fresh }),
      ).model
      expect(
        app.update(readyFace, Message.CompletedFontLoad({ revision: fresh, success: true })).model
          .fontAsset._tag,
      ).toBe('Ready')
    })
  }),
)
