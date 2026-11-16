import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Option, Schema } from 'effect'
import { Story } from 'foldkit'
import { DialogResourcesServerLayer } from '../src/dialog.js'
import { MobileDrawerBlock as Drawer, mobileDrawerLayer } from '../src/mobile-drawer.js'
const subject = {
  block: Drawer,
  layer: mobileDrawerLayer.pipe(Layer.provide(DialogResourcesServerLayer)),
}

test.effect(
  'controlled dismissal reports intent and retains accepted visibility until the parent closes',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'navigation', open: false }),
      Story.inMessage(Drawer.InMessage.RequestedControlledOpen({ control: Option.some(true) })),
      Story.model((m) => {
        expect(m.dialog.isOpen).toBe(true)
      }),
      Story.inMessage(Drawer.InMessage.RequestedClose()),
      Story.expectOutMessage(Drawer.OutMessage.CloseRequested()),
      Story.model((m) => {
        expect(m.dialog.isOpen).toBe(true)
      }),
      Story.inMessage(Drawer.InMessage.RequestedControlledOpen({ control: Option.some(false) })),
      Story.model((m) => {
        expect(m.dialog.isOpen).toBe(false)
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    ),
)

test.effect(
  'public control and complete drawer state survive JSON replay without a second exit owner',
  () =>
    Effect.gen(function* () {
      const closing = yield* Story.story(
        subject,
        Story.init({ id: 'replayed-navigation' }),
        Story.inMessage(Drawer.InMessage.RequestedOpen()),
        Story.model((m) => {
          expect(m.dialog.isOpen).toBe(true)
        }),
        Story.expectOutMessage(Drawer.OutMessage.OpenChanged({ open: true })),
        Story.inMessage(Drawer.InMessage.RequestedClose()),
      )
      const codec = Schema.fromJsonString(Drawer.Model)
      const restored = yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(closing))
      const inputCodec = Schema.fromJsonString(Drawer.InMessage)
      const request = Drawer.InMessage.RequestedControlledOpen({ control: Option.some(true) })
      const decoded = yield* Schema.decodeEffect(inputCodec)(
        yield* Schema.encodeEffect(inputCodec)(request),
      )
      const live = yield* Story.story(
        subject,
        Story.given(closing),
        Story.inMessage(request),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
      )
      const replayed = yield* Story.story(
        subject,
        Story.given(restored),
        Story.inMessage(decoded),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
      )
      expect(replayed).toEqual(live)
      expect(replayed.dialog.isOpen).toBe(true)
      expect(replayed.dialog.generation).toBeGreaterThan(closing.dialog.generation)
    }),
)
