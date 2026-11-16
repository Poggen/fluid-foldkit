import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'
import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story, Url } from 'foldkit'
import { toParentMessageFor } from 'foldkit/test'
import { expect } from 'vitest'
import { application } from './application'
import { Message } from './application-contract'
import { MaybeReferenceBinding } from './application-bindings'
import { ComponentReferenceBlock } from './reference/block'
import { SynchronizeConfigurationUrl } from './reference/commands'
import { prepareApplicationFlagsFor } from './application-flags'

const url = (value: string) => Option.getOrThrow(Url.fromString(value))

it.effect('page-owned previews omit Home state and synchronize reference controls and URLs', () =>
  Effect.gen(function* () {
    const flags = yield* prepareApplicationFlagsFor('https://example.test/')
    yield* Story.withBlock(application, (app) => {
      const initial = app.init(flags, url('https://example.test/components/field')).model
      expect(Option.isNone(initial.maybeLandingGallery)).toBe(true)
      expect(Option.getOrThrow(initial.maybeReferenceGallery).key).toBe('/components/field')
      const changed = Story.story(
        app.update,
        Story.given(initial),
        Story.message(
          toParentMessageFor(app)(
            MaybeReferenceBinding,
            '/components/field',
            ComponentReferenceBlock.Message.UpdatedProp({ prop: 'value', value: 'native owner' }),
          ),
        ),
        Story.Command.resolve(
          SynchronizeConfigurationUrl,
          ComponentReferenceBlock.Message.CompletedSynchronizeConfigurationUrl(),
        ),
        Story.model((model) => {
          expect(Option.getOrThrow(model.maybeReference).model.configuration).toMatchObject({
            _tag: 'field',
            value: 'native owner',
          })
          expect(Option.getOrThrow(model.maybeReferenceGallery).model.fluid.search.value).toBe(
            'native owner',
          )
          expect(Option.isNone(model.maybeLandingGallery)).toBe(true)
        }),
      )
      const reset = Story.story(
        app.update,
        Story.given(changed),
        Story.message(
          toParentMessageFor(app)(
            MaybeReferenceBinding,
            '/components/field',
            ComponentReferenceBlock.Message.RequestedReset(),
          ),
        ),
        Story.Command.resolve(
          SynchronizeConfigurationUrl,
          ComponentReferenceBlock.Message.CompletedSynchronizeConfigurationUrl(),
        ),
        Story.Command.resolveAll(
          [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
          [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
        ),
        Story.model((model) => {
          expect(Option.getOrThrow(model.maybeReferenceGallery).model.fluid.search.value).toBe(
            Option.getOrThrow(initial.maybeReferenceGallery).model.fluid.search.value,
          )
          expect(Option.isNone(model.maybeLandingGallery)).toBe(true)
        }),
      )
      Story.story(
        app.update,
        Story.given(reset),
        Story.message(
          Message.ChangedUrl({
            url: url(
              'https://example.test/components/field?props=' +
                encodeURIComponent(JSON.stringify({ value: 'URL draft' })),
            ),
          }),
        ),
        Story.model((model) => {
          expect(Option.getOrThrow(model.maybeReferenceGallery).model.fluid.search.value).toBe(
            'URL draft',
          )
          expect(Option.isNone(model.maybeLandingGallery)).toBe(true)
        }),
      )
      const embedded = app.init(
        flags,
        url(
          'https://example.test/components/input?embed=1&props=' +
            encodeURIComponent(JSON.stringify({ value: 'Embedded draft' })),
        ),
      ).model
      Story.story(
        app.update,
        Story.given(embedded),
        Story.model((model) => {
          expect(model.isEmbed).toBe(true)
          expect(Option.getOrThrow(model.maybeEmbeddedGallery).model.fluid.input.value).toBe(
            'Embedded draft',
          )
          expect(Option.isNone(model.maybeReference)).toBe(true)
          expect(Option.isNone(model.maybeReferenceGallery)).toBe(true)
        }),
      )
      for (const embeddedChart of [false, true]) {
        const chart = app.init(
          flags,
          url(
            'https://example.test/charts/gauge?' +
              (embeddedChart ? 'embed=1&' : '') +
              'props=' +
              encodeURIComponent(JSON.stringify({ value: 43 })),
          ),
        ).model
        const gallery = embeddedChart
          ? Option.getOrThrow(chart.maybeEmbeddedGallery).model
          : Option.getOrThrow(chart.maybeReferenceGallery).model
        expect(Option.getOrThrow(gallery.cartesian.gauge).configuration.value).toBe(43)
        expect(Option.isNone(gallery.cartesian.line)).toBe(true)
        expect(Option.isNone(gallery.cartesian.area)).toBe(true)
        expect(Option.isNone(gallery.cartesian.bar)).toBe(true)
        expect(Option.isNone(gallery.cartesian.composed)).toBe(true)
        expect(Option.isNone(gallery.cartesian.scatter)).toBe(true)
        expect(Option.isNone(gallery.cartesian.candle)).toBe(true)
      }
    })
  }),
)
