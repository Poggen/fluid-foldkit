import * as ThinkingStepsConfiguration from './playground/configs/thinking-steps'
import * as InputMessageConfiguration from './playground/configs/input-message'
import { ComposerSamplesQuery } from './reference/message-assets-query'
import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story, Url } from 'foldkit'
import { expect } from 'vitest'
import { application } from './application'
import { prepareApplicationFlagsFor } from './application-flags'

const url = (href: string) => Option.getOrThrow(Url.fromString(`https://example.test${href}`))

it.effect('cold entries own only their source page subtree and initialize URL props', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    yield* Story.withBlock(application, (app) => {
      const home = app.init(flags, url('/')).model
      expect(Option.isSome(home.maybeLandingGallery)).toBe(true)
      expect(Option.isNone(home.maybeReference)).toBe(true)
      expect(Option.isNone(home.maybeReferenceGallery)).toBe(true)
      expect(Option.isNone(home.maybeSystem)).toBe(true)
      expect(Option.isNone(home.maybeEmbeddedGallery)).toBe(true)

      const props = encodeURIComponent(JSON.stringify({ value: 'Fresh URL draft' }))
      const reference = app.init(flags, url(`/components/input?props=${props}`)).model
      expect(Option.isNone(reference.maybeLandingGallery)).toBe(true)
      expect(Option.getOrThrow(reference.maybeReference).key).toBe('/components/input')
      expect(Option.getOrThrow(reference.maybeReferenceGallery).model.fluid.input.value).toBe(
        'Fresh URL draft',
      )
      expect(Option.isNone(reference.maybeSystem)).toBe(true)
      expect(Option.isNone(reference.maybeEmbeddedGallery)).toBe(true)

      const system = app.init(flags, url('/surfaces')).model
      expect(Option.isNone(system.maybeLandingGallery)).toBe(true)
      expect(Option.isNone(system.maybeReference)).toBe(true)
      expect(Option.isNone(system.maybeReferenceGallery)).toBe(true)
      expect(Option.getOrThrow(system.maybeSystem).key).toBe('/surfaces')
      expect(Option.isNone(system.maybeEmbeddedGallery)).toBe(true)

      const embedded = app.init(flags, url(`/components/input?embed=1&props=${props}`)).model
      expect(Option.isNone(embedded.maybeLandingGallery)).toBe(true)
      expect(Option.isNone(embedded.maybeReference)).toBe(true)
      expect(Option.isNone(embedded.maybeReferenceGallery)).toBe(true)
      expect(Option.isNone(embedded.maybeSystem)).toBe(true)
      expect(Option.getOrThrow(embedded.maybeEmbeddedGallery).key).toBe('/components/input')
      expect(Option.getOrThrow(embedded.maybeEmbeddedGallery).model.fluid.input.value).toBe(
        'Fresh URL draft',
      )

      for (const href of ['/introduction', '/missing-route']) {
        const page = app.init(flags, url(href)).model
        expect(Option.isNone(page.maybeLandingGallery)).toBe(true)
        expect(Option.isNone(page.maybeReference)).toBe(true)
        expect(Option.isNone(page.maybeReferenceGallery)).toBe(true)
        expect(Option.isNone(page.maybeSystem)).toBe(true)
        expect(Option.isNone(page.maybeEmbeddedGallery)).toBe(true)
      }
    })
  }),
)

it.effect(
  'same-key embedded URI props use the public configuration operation without reinitializing the owner',
  () =>
    Effect.gen(function* () {
      const href = (props: Record<string, string>) =>
        '/components/input?embed=1&accent=green&props=' + encodeURIComponent(JSON.stringify(props))
      const first = href({ value: 'URI A', placeholder: 'First' })
      const flags = yield* prepareApplicationFlagsFor('https://example.test' + first)
      yield* Story.withBlock(application, (app) => {
        const initial = app.init(flags, url(first)).model
        const before = Option.getOrThrow(initial.maybeEmbeddedGallery)
        const next = Story.story(
          app.update,
          Story.given(initial),
          Story.message(
            application.block.Message.ChangedUrl({
              url: url(href({ value: 'URI B', placeholder: 'Second' })),
            }),
          ),
          Story.model((model) => {
            const embedded = Option.getOrThrow(model.maybeEmbeddedGallery)
            expect(embedded.key).toBe(before.key)
            expect(embedded.model.fluid.input.value).toBe('URI B')
            expect(Option.getOrThrow(embedded.model.embeddedConfiguration)).toMatchObject({
              _tag: 'input',
              value: 'URI B',
              placeholder: 'Second',
            })
            expect(embedded.model.fluid.textarea).toBe(before.model.fluid.textarea)
            expect(embedded.model.isReady).toBe(before.model.isReady)
            expect(model.navigation).toBe(initial.navigation)
            expect(model.settings.accent).toBe('green')
          }),
          Story.Command.expectNone(),
        )
        Story.story(
          app.update,
          Story.given(next),
          Story.message(
            application.block.Message.ChangedUrl({ url: url(href({ placeholder: 'Second' })) }),
          ),
          Story.model((model) => {
            const embedded = Option.getOrThrow(model.maybeEmbeddedGallery)
            expect(embedded.key).toBe(before.key)
            expect(embedded.model.fluid.input.value).toBe('')
            expect(Option.getOrThrow(embedded.model.embeddedConfiguration)).toMatchObject({
              _tag: 'input',
              value: '',
              placeholder: 'Second',
            })
          }),
          Story.Command.expectNone(),
        )
      })
    }),
)

it.effect('fresh embedded ThinkingSteps initializes its real child open and disabled state', () =>
  Effect.gen(function* () {
    const href =
      '/components/thinking-steps?embed=1&props=' +
      encodeURIComponent(
        JSON.stringify(
          ThinkingStepsConfiguration.Configuration.make({
            ...ThinkingStepsConfiguration.defaults,
            open: false,
            disabled: true,
          }),
        ),
      )
    const flags = yield* prepareApplicationFlagsFor('https://example.test' + href)
    yield* Story.withBlock(application, (app) => {
      const initialized = app.init(flags, url(href))
      const embedded = Option.getOrThrow(initialized.model.maybeEmbeddedGallery).model
      expect(Option.getOrThrow(embedded.embeddedConfiguration)).toMatchObject({
        _tag: 'thinking-steps',
        open: false,
        disabled: true,
      })
      expect(embedded.fluid.steps.open).toBe(false)
      expect(embedded.fluid.steps.disabled).toBe(true)
    })
  }),
)

it.effect('fresh embedded InputMessage retains the real attachment-loading init Command', () =>
  Effect.gen(function* () {
    const href =
      '/components/input-message?embed=1&props=' +
      encodeURIComponent(
        JSON.stringify(
          InputMessageConfiguration.Configuration.make({
            ...InputMessageConfiguration.defaults,
            attachments: true,
          }),
        ),
      )
    const flags = yield* prepareApplicationFlagsFor('https://example.test' + href)
    yield* Story.withBlock(application, (app) => {
      const initialized = app.init(flags, url(href))
      const embedded = Option.getOrThrow(initialized.model.maybeEmbeddedGallery).model
      const requests = (initialized.commands ?? []).flatMap((command) =>
        Option.toArray(Story.Command.argsOf(ComposerSamplesQuery.Fetch)(command)),
      )
      expect(Option.getOrThrow(embedded.embeddedConfiguration)).toMatchObject({
        _tag: 'input-message',
        attachments: true,
      })
      expect(embedded.fluid.composer.supportsFiles).toBe(true)
      expect(requests).toHaveLength(1)
      expect(requests[0]?.generation).toBe(embedded.composerSamples.generation)
    })
  }),
)
