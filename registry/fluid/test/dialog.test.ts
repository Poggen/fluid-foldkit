import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Option, Schema } from 'effect'
import { Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import {
  DialogBlock as Dialog,
  DialogLayer,
  DialogResourcesServerLayer,
  isDialogOpen,
} from '../src/dialog.js'
import { DialogFixture, DialogFixtureLayer } from './dialog-parent.js'

const subject = {
  block: Dialog,
  layer: DialogLayer.pipe(Layer.provide(DialogResourcesServerLayer)),
}
const fixture = { block: DialogFixture, layer: DialogFixtureLayer }

test.effect('public toggle preserves accepted visibility and schema replay', () =>
  Effect.gen(function* () {
    const closed = yield* Story.story(
      subject,
      Story.init({ id: 'dialog' }),
      Story.message(Dialog.Message.Mounted({ scoped: false })),
      Story.model((m) => {
        expect(isDialogOpen(m)).toBe(false)
      }),
      Story.inMessage(Dialog.InMessage.RequestedToggle()),
      Story.expectOutMessage(Dialog.OutMessage.OpenChanged({ open: true })),
      Story.model((m) => {
        expect(isDialogOpen(m)).toBe(true)
      }),
      Story.inMessage(Dialog.InMessage.RequestedToggle()),
      Story.expectOutMessage(Dialog.OutMessage.OpenChanged({ open: false })),
      Story.model((m) => {
        expect(isDialogOpen(m)).toBe(false)
      }),
    )
    const codec = Schema.fromJsonString(Dialog.Model)
    const restored = yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(closed))
    yield* Story.story(
      subject,
      Story.given(restored),
      Story.inMessage(Dialog.InMessage.RequestedOpen()),
      Story.model((m) => {
        expect(isDialogOpen(m)).toBe(true)
      }),
      Story.Command.expectNone(),
    )
  }),
)

test.effect('live modality preserves visibility and does not emit an open request', () =>
  Story.story(
    subject,
    Story.init({ id: 'mode', modal: false }),
    Story.message(Dialog.Message.Mounted({ scoped: false })),
    Story.inMessage(Dialog.InMessage.RequestedControlledOpen({ control: Option.some(true) })),
    Story.inMessage(Dialog.InMessage.RequestedModal({ modal: true })),
    Story.model((m) => {
      expect(m.modal).toBe(true)
      expect(isDialogOpen(m)).toBe(true)
    }),
    Story.expectNoOutMessage(),
    Story.inMessage(Dialog.InMessage.RequestedModal({ modal: false })),
    Story.model((m) => {
      expect(m.modal).toBe(false)
    }),
    Story.Command.expectNone(),
  ),
)

test.effect('stale exit and release cannot close a reopened lifetime', () =>
  Effect.gen(function* () {
    const closed = yield* Story.story(
      subject,
      Story.init({ id: 'interrupted', defaultOpen: true }),
      Story.message(Dialog.Message.Mounted({ scoped: false })),
      Story.inMessage(Dialog.InMessage.RequestedClose()),
    )
    const reopened = yield* Story.story(
      subject,
      Story.given(closed),
      Story.inMessage(Dialog.InMessage.RequestedOpen()),
    )
    yield* Story.story(
      subject,
      Story.given(reopened),
      Story.message(Dialog.Message.CompletedExit({ generation: closed.generation })),
      Story.message(Dialog.Message.Released({ generation: closed.generation })),
      Story.model((m) => {
        expect(m).toEqual(reopened)
        expect(m.phase).toBe('Opening')
      }),
      Story.expectNoOutMessage(),
      Story.inMessage(Dialog.InMessage.RequestedModal({ modal: false })),
      Story.model((m) => {
        expect(m.generation).toBe(reopened.generation)
        expect(m.phase).toBe(reopened.phase)
      }),
      Story.Command.expectNone(),
    )
  }),
)

test.effect(
  'controlled requests preserve accepted visibility and uncontrolled default shadow',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'controlled', open: false }),
      Story.message(Dialog.Message.Mounted({ scoped: false })),
      Story.inMessage(Dialog.InMessage.RequestedOpen()),
      Story.expectOutMessage(Dialog.OutMessage.OpenChanged({ open: true })),
      Story.model((m) => {
        expect(isDialogOpen(m)).toBe(false)
      }),
      Story.Command.expectNone(),
      Story.inMessage(Dialog.InMessage.RequestedControlledOpen({ control: Option.none() })),
      Story.model((m) => {
        expect(isDialogOpen(m)).toBe(false)
      }),
      Story.inMessage(Dialog.InMessage.RequestedControlledOpen({ control: Option.some(true) })),
      Story.model((m) => {
        expect(isDialogOpen(m)).toBe(true)
      }),
      Story.expectNoOutMessage(),
      Story.inMessage(Dialog.InMessage.RequestedClose()),
      Story.model((m) => {
        expect(isDialogOpen(m)).toBe(true)
      }),
      Story.Command.expectNone(),
    ),
)

test.effect('server render retains a native closed host without acquiring a visible portal', () =>
  Effect.gen(function* () {
    const rendered = yield* renderToString(
      fixture,
      {},
      { isHydratable: true, buildId: 'dialog-fixture' },
    )
    expect(rendered.html).toContain('aria-expanded="false"')
    expect(rendered.html).toContain('<dialog')
    expect(rendered.html).not.toContain('Peer explanation')
    yield* Story.story(
      fixture,
      Story.init(),
      Story.model((m) => {
        expect(m.peer.mounted).toBe(false)
      }),
      Story.Command.expectNone(),
    )
  }),
)

test.effect(
  'registered parent operations fold native requests and replay the complete child state',
  () =>
    Effect.gen(function* () {
      const closed = yield* Story.story(
        fixture,
        Story.init(),
        Story.message(DialogFixture.Message.Open()),
        Story.model((m) => {
          expect(isDialogOpen(m.primary)).toBe(true)
          expect(m.notifications).toBe(1)
        }),
        Story.message(DialogFixture.Message.Close()),
        Story.model((m) => {
          expect(isDialogOpen(m.primary)).toBe(false)
          expect(m.notifications).toBe(2)
        }),
        Story.Command.expectNone(),
      )
      const codec = Schema.fromJsonString(DialogFixture.Model)
      expect(yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(closed))).toEqual(
        closed,
      )
    }),
)
