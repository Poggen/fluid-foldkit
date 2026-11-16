import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'
import { it } from '@effect/vitest'
import { Array, Effect, Option } from 'effect'
import { Story, Url } from 'foldkit'
import { expect } from 'vitest'
import { application } from './application'
import { Message } from './application-contract'
import {
  MaybeEmbeddedGalleryBinding,
  MaybeLandingGalleryBinding,
  MaybeReferenceGalleryBinding,
} from './application-bindings'
import { prepareApplicationFlagsFor } from './application-flags'
import { Message as GalleryMessage } from './gallery/definition'

const url = (href: string) => Option.getOrThrow(Url.fromString(`https://example.test${href}`))

it.effect('activates chart styles only for known chart routes during cold initialization', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    yield* Story.withBlock(application, (app) => {
      for (const href of [
        '/',
        '/components/input',
        '/components/input?embed=1',
        '/surfaces',
        '/introduction',
        '/charts/missing-chart',
      ]) {
        expect(app.init(flags, url(href)).model.chartStylesActive, href).toBe(false)
      }
      for (const href of ['/charts/gauge', '/charts/gauge?embed=1']) {
        expect(app.init(flags, url(href)).model.chartStylesActive, href).toBe(true)
      }
    })
  }),
)

it.effect('folds accepted chart admission from every Gallery relationship in the same update', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    for (const href of ['/', '/components/input', '/components/input?embed=1']) {
      const initial = yield* Story.withBlock(application, (app) => app.init(flags, url(href)).model)
      const observation = GalleryMessage.ObservedPreviews({
        hrefs: ['/charts/gauge'],
        admissionRevision: 0,
      })
      yield* Story.story(
        application,
        Story.given(initial),
        Story.model((model) => expect(model.chartStylesActive).toBe(false)),
        href === '/'
          ? Story.messageIn(MaybeLandingGalleryBinding, observation)
          : href.includes('embed=1')
            ? Story.messageIn(MaybeEmbeddedGalleryBinding, '/components/input', observation)
            : Story.messageIn(MaybeReferenceGalleryBinding, '/components/input', observation),
        Story.model((model) => {
          expect(model.chartStylesActive).toBe(true)
          const gallery =
            href === '/'
              ? Option.getOrThrow(model.maybeLandingGallery)
              : href.includes('embed=1')
                ? Option.getOrThrow(model.maybeEmbeddedGallery).model
                : Option.getOrThrow(model.maybeReferenceGallery).model
          expect(gallery.admitted).toContain('/charts/gauge')
          expect(Option.isSome(gallery.cartesian.gauge)).toBe(true)
        }),
        Story.Command.expectNone(),
      )
    }
  }),
)

it.effect('rejects stale chart observations and keeps Fluid-only admission dormant', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    const initial = yield* Story.withBlock(application, (app) => app.init(flags, url('/')).model)
    yield* Story.story(
      application,
      Story.given(initial),
      Story.messageIn(
        MaybeLandingGalleryBinding,
        GalleryMessage.ObservedPreviews({ hrefs: ['/components/input'], admissionRevision: 0 }),
      ),
      Story.model((model) => expect(model.chartStylesActive).toBe(false)),
      Story.messageIn(
        MaybeLandingGalleryBinding,
        GalleryMessage.ObservedPreviews({ hrefs: ['/charts/gauge'], admissionRevision: 1 }),
      ),
      Story.model((model) => {
        expect(model.chartStylesActive).toBe(false)
        expect(Option.getOrThrow(model.maybeLandingGallery).admitted).not.toContain('/charts/gauge')
      }),
      Story.Command.expectNone(),
    )
  }),
)

it.effect(
  'activates chart styles during initialization and retains them after page retirement',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareApplicationFlagsFor('https://example.test/charts/gauge?embed=1')
      const initial = yield* Story.withBlock(
        application,
        (app) => app.init(flags, url('/charts/gauge?embed=1')).model,
      )
      yield* Story.story(
        application,
        Story.given(initial),
        Story.model((model) => {
          expect(model.chartStylesActive).toBe(true)
          expect(Option.getOrThrow(model.maybeEmbeddedGallery).model.isReady).toBe(false)
        }),
        Story.message(Message.ChangedUrl({ url: url('/missing-route') })),
        Story.Command.resolveAllExact(
          ...Array.makeBy(
            8,
            (): [
              typeof hoverTest.ControlHover,
              ReturnType<typeof HoverBlock.Message.CompletedControl>,
            ] => [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
          ),
        ),
        Story.model((model) => {
          expect(model.chartStylesActive).toBe(true)
          expect(Option.isNone(model.maybeEmbeddedGallery)).toBe(true)
        }),
        Story.Command.expectNone(),
      )
    }),
)
