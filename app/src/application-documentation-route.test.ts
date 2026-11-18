import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story, Url } from 'foldkit'
import { expect } from 'vitest'
import { application } from './application'
import { Message } from './application-contract'
import { Navigate, PrepareRoute } from './application-commands'
import { prepareApplicationFlagsFor } from './application-flags'

const url = (path: string) => Option.getOrThrow(Url.fromString(`https://example.test${path}`))
const destination = url('/components/input?accent=red')

it.effect('keeps the painted gallery until the requested documentation can render', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    yield* Story.withBlock(application, (app) => {
      const waiting = app.update(
        app.init(flags, url('/')).model,
        Message.ChangedUrl({ url: destination }),
      )
      expect(waiting.model.path).toBe('/')
      expect(waiting.model.documentation).toBe('loading')
      expect(Option.isSome(waiting.model.maybeLandingGallery)).toBe(true)
      expect(Option.isNone(waiting.model.maybeReference)).toBe(true)
      expect(
        waiting.commands?.flatMap((command) =>
          Option.toArray(Story.Command.argsOf(PrepareRoute)(command)),
        ),
      ).toEqual([{ url: destination, revision: 1 }])
      const accepted = app.update(
        waiting.model,
        Message.PreparedUrl({ url: destination, revision: 1, success: true }),
      ).model
      expect(accepted.path).toBe('/components/input')
      expect(accepted.documentation).toBe('ready')
      expect(accepted.settings.accent).toBe('red')
      expect(Option.isSome(accepted.maybeReference)).toBe(true)
      expect(Option.isNone(accepted.maybeLandingGallery)).toBe(true)
    })
  }),
)

it.effect('ignores completed or failed documentation loads after newer navigation', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    yield* Story.withBlock(application, (app) => {
      const start = app.init(flags, url('/')).model
      const leaving = app.update(start, Message.ChangedUrl({ url: destination })).model
      const returned = app.update(leaving, Message.ChangedUrl({ url: url('/') })).model
      expect(returned.path).toBe('/')
      expect(returned.documentation).toBe('unloaded')
      expect(Option.getOrThrow(returned.maybeLandingGallery)).not.toBe(
        Option.getOrThrow(start.maybeLandingGallery),
      )
      expect(Option.isSome(returned.maybeLandingGallery)).toBe(true)
      for (const success of [true, false]) {
        const stale = app.update(
          returned,
          Message.PreparedUrl({ url: destination, revision: 1, success }),
        )
        expect(stale.model).toBe(returned)
        expect(stale.commands ?? []).toHaveLength(0)
      }
    })
  }),
)

it.effect('falls back to document navigation only for the current failed route', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    yield* Story.withBlock(application, (app) => {
      const start = app.init(flags, url('/')).model
      const leaving = app.update(start, Message.ChangedUrl({ url: destination })).model
      Story.story(
        app.update,
        Story.given(leaving),
        Story.message(Message.PreparedUrl({ url: destination, revision: 1, success: false })),
        Story.Command.expectExact(Navigate({ href: Url.toString(destination), external: true })),
        Story.Command.resolve(Navigate, Message.CompletedNavigate()),
      )
    })
  }),
)
