import { TooltipStoryLayer } from './tooltip-story-services.js'
import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Story } from 'foldkit'
import { Effect, Layer } from 'effect'
import { DialogResourcesServerLayer } from '../src/dialog.js'
import { SidebarBlock as Sidebar, sidebarLayer } from '../src/sidebar.js'
const subject = {
  block: Sidebar,
  layer: sidebarLayer.pipe(
    Layer.provide(Layer.mergeAll(DialogResourcesServerLayer, TooltipStoryLayer)),
  ),
}

test.effect(
  'pinning a peek holds clipping until the matching settle and controlled intent keeps the peek',
  () =>
    Effect.gen(function* () {
      const pinned = yield* Story.story(
        subject,
        Story.init({ id: 'sidebar', defaultOpen: false, peek: 'hover' }),
        Story.message(Sidebar.Message.ChangedPeek({ open: true })),
        Story.model((m) => {
          expect(m.peekPresence.phase).toBe('Present')
        }),
        Story.inMessage(Sidebar.InMessage.RequestedOpen({ open: true })),
        Story.model((m) => {
          expect(m.pinHold).toBe(true)
          expect(m.peeking).toBe(false)
          expect(m.peekPresence.phase).toBe('Closed')
        }),
      )
      yield* Story.story(
        subject,
        Story.given(pinned),
        Story.message(Sidebar.Message.CompletedPin({ generation: pinned.pinGeneration - 1 })),
        Story.model((m) => {
          expect(m.pinHold).toBe(true)
        }),
        Story.message(Sidebar.Message.CompletedPin({ generation: pinned.pinGeneration })),
        Story.model((m) => {
          expect(m.pinHold).toBe(false)
        }),
        Story.Command.expectNone(),
      )
      yield* Story.story(
        subject,
        Story.init({ id: 'controlled', open: false, peek: 'hover' }),
        Story.message(Sidebar.Message.ChangedPeek({ open: true })),
        Story.inMessage(Sidebar.InMessage.RequestedOpen({ open: true })),
        Story.expectOutMessage(Sidebar.OutMessage.OpenChanged({ open: true, mobile: false })),
        Story.model((m) => {
          expect(m.open).toBe(false)
          expect(m.peeking).toBe(true)
        }),
        Story.inMessage(Sidebar.InMessage.RequestedControlledOpen({ open: true })),
        Story.model((m) => {
          expect(m.pinHold).toBe(true)
          expect(m.peekPresence.phase).toBe('Closed')
        }),
        Story.Command.expectNone(),
      )
    }),
)

test.effect('peek dismissal retains the overlay while reversal keeps its presence owner', () =>
  Effect.gen(function* () {
    const shown = yield* Story.story(
      subject,
      Story.init({ id: 'peek', defaultOpen: false, peek: 'click' }),
      Story.message(Sidebar.Message.ChangedPeek({ open: true })),
    )
    yield* Story.story(
      subject,
      Story.given(shown),
      Story.message(Sidebar.Message.ChangedPeek({ open: false })),
      Story.model((m) => {
        expect(m.peekPresence.phase).toBe('Exiting')
      }),
      Story.message(Sidebar.Message.ChangedPeek({ open: true })),
      Story.model((m) => {
        expect(m.peekPresence.phase).toBe('Present')
        expect(m.peekPresence.id).toBe(shown.peekPresence.id)
      }),
      Story.message(Sidebar.Message.ObservedMobile({ mobile: true })),
      Story.model((m) => {
        expect(m.peekPresence.phase).toBe('Closed')
      }),
      Story.Command.expectNone(),
    )
  }),
)

test.effect(
  'drag collapse and rescue retain the transition across pointer samples, rejecting stale settles',
  () =>
    Effect.gen(function* () {
      const collapsed = yield* Story.story(
        subject,
        Story.init({ id: 'drag' }),
        Story.message(Sidebar.Message.Resized({ width: 160, open: false, resizing: true })),
        Story.model((m) => {
          expect(m.dragFlip).toBeGreaterThan(0)
        }),
      )
      yield* Story.story(
        subject,
        Story.given(collapsed),
        Story.message(Sidebar.Message.Resized({ width: 160, open: false, resizing: true })),
        Story.model((m) => {
          expect(m.dragFlip).toBe(collapsed.dragFlip)
        }),
        Story.message(Sidebar.Message.Resized({ width: 180, open: true, resizing: true })),
        Story.model((m) => {
          expect(m.dragFlip).toBeGreaterThan(collapsed.dragFlip)
        }),
        Story.message(Sidebar.Message.CompletedDragFlip({ generation: collapsed.dragFlip })),
        Story.model((m) => {
          expect(m.dragFlip).toBeGreaterThan(0)
        }),
        Story.message(Sidebar.Message.Resized({ width: 180, open: true, resizing: false })),
        Story.model((m) => {
          expect(m.dragFlip).toBe(0)
        }),
        Story.message(Sidebar.Message.Resized({ width: 160, open: false, resizing: true })),
        Story.model((m) => {
          expect(m.dragFlip).toBeGreaterThan(collapsed.dragFlip)
        }),
        Story.Command.expectNone(),
      )
    }),
)
