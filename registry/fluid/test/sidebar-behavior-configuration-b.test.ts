import { TooltipStoryLayer } from './tooltip-story-services.js'
import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Story } from 'foldkit'
import { SidebarBlock, sidebarLayer } from '../src/sidebar'
import { DialogResourcesServerLayer } from '../src/dialog'

const subject = {
  block: SidebarBlock,
  layer: sidebarLayer.pipe(
    Layer.provide(Layer.mergeAll(DialogResourcesServerLayer, TooltipStoryLayer)),
  ),
}
test.effect(
  'changing peek behavior clears an active overlay and preserves width and controlled ownership',
  () =>
    Effect.gen(function* () {
      const before = yield* Story.story(
        subject,
        Story.init({ id: 'behavior', open: false, peek: 'hover', width: '248px' }),
        Story.message(SidebarBlock.Message.ChangedPeek({ open: true })),
        Story.model((model) => {
          expect(model.peeking).toBe(true)
          expect(model.peekPresence.phase).toBe('Present')
        }),
      )
      yield* Story.story(
        subject,
        Story.given(before),
        Story.inMessage(
          SidebarBlock.InMessage.RequestedBehavior({
            peek: 'none',
            collapsible: 'offcanvas',
            rail: true,
          }),
        ),
        Story.model((model) => {
          expect(model.peeking).toBe(false)
          expect(model.width).toBe('248px')
          expect(model.controlled).toBe(true)
          expect(model.open).toBe(false)
          expect(model.peekPresence.id).toBe(before.peekPresence.id)
        }),
        Story.message(SidebarBlock.Message.ChangedPeek({ open: true })),
        Story.model((model) => expect(model.peeking).toBe(false)),
        Story.inMessage(
          SidebarBlock.InMessage.RequestedBehavior({
            peek: 'click',
            collapsible: 'offcanvas',
            rail: true,
          }),
        ),
        Story.message(SidebarBlock.Message.ChangedPeek({ open: true })),
        Story.model((model) => {
          expect(model.peeking).toBe(true)
          expect(model.peekPresence.phase).toBe('Present')
        }),
        Story.Command.expectNone(),
      )
    }),
)
