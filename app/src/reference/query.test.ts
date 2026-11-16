import { it } from '@effect/vitest'
import { Effect, Option, Result } from 'effect'
import { AsyncData, Story, Url } from 'foldkit'
import { toParentMessageFor } from 'foldkit/test'
import { expect } from 'vitest'
import { application } from '../application'
import { prepareApplicationFlagsFor } from '../application-flags'
import { ReferenceQueryBinding } from '../application-bindings'
import { ReferenceQuery, readReference } from './query'

const url = (path: string) => Option.getOrThrow(Url.fromString(`https://example.test${path}`))
const path = '/components/breadcrumb'
const data = {
  family: 'fluid',
  name: 'Breadcrumb',
  entry: 'breadcrumb.ts',
  files: [],
  contracts: [
    {
      name: 'Breadcrumb',
      props: [
        { name: 'items', type: 'Array', optional: false, description: '', defaultValue: null },
      ],
    },
  ],
}

it.effect(
  'reference data survives page-owner replacement and warm navigation does not refetch',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareApplicationFlagsFor(`https://example.test${path}`)
      yield* Story.withBlock(application, (app) => {
        const initial = app.init(flags, url(path))
        const request = (initial.commands ?? []).flatMap((command) =>
          Option.toArray(Story.Command.argsOf(ReferenceQuery.Fetch)(command)),
        )[0]
        if (request === undefined) throw new Error('Expected a cold reference request')
        const loaded = Story.story(
          app.update,
          Story.given(initial.model),
          Story.message(
            toParentMessageFor(app)(
              ReferenceQueryBinding,
              ReferenceQuery.Message.CompletedFetch({ ...request, result: Result.succeed(data) }),
            ),
          ),
          Story.model((model) => {
            expect(AsyncData.getData(readReference(model.referenceQuery, path))).toEqual(
              Option.some(data),
            )
            expect(Option.getOrThrow(model.maybeReference).model.apiScrolls).toHaveLength(1)
          }),
        )
        const away = app.update(
          loaded,
          application.block.Message.ChangedUrl({ url: url('/components/button') }),
        ).model
        const returned = app.update(away, application.block.Message.ChangedUrl({ url: url(path) }))
        expect(Option.getOrThrow(returned.model.maybeReference).model).not.toBe(
          Option.getOrThrow(loaded.maybeReference).model,
        )
        expect(AsyncData.getData(readReference(returned.model.referenceQuery, path))).toEqual(
          Option.some(data),
        )
        expect(Option.getOrThrow(returned.model.maybeReference).model.apiScrolls).toHaveLength(1)
        expect(
          (returned.commands ?? []).flatMap((command) =>
            Option.toArray(Story.Command.argsOf(ReferenceQuery.Fetch)(command)),
          ),
        ).toEqual([])
      })
    }),
)

it.effect(
  'navigation cancels an old request and its late completion cannot initialize the next page',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareApplicationFlagsFor(`https://example.test${path}`)
      yield* Story.withBlock(application, (app) => {
        const initial = app.init(flags, url(path))
        const request = (initial.commands ?? []).flatMap((command) =>
          Option.toArray(Story.Command.argsOf(ReferenceQuery.Fetch)(command)),
        )[0]
        if (request === undefined) throw new Error('Expected a cold reference request')
        const next = app.update(
          initial.model,
          application.block.Message.ChangedUrl({ url: url('/components/button') }),
        ).model
        Story.story(
          app.update,
          Story.given(next),
          Story.message(
            toParentMessageFor(app)(
              ReferenceQueryBinding,
              ReferenceQuery.Message.CompletedFetch({ ...request, result: Result.succeed(data) }),
            ),
          ),
          Story.model((model) => {
            expect(AsyncData.getData(readReference(model.referenceQuery, path))).toEqual(
              Option.none(),
            )
            expect(Option.getOrThrow(model.maybeReference).key).toBe('/components/button')
            expect(Option.getOrThrow(model.maybeReference).model.apiScrolls).toHaveLength(0)
          }),
        )
      })
    }),
)
