import { TooltipStoryLayer } from './tooltip-story-services.js'
import { DialogResourcesServerLayer } from '../src/dialog.js'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { SidebarBlock, sidebarLayer } from '../src/sidebar.js'

const subject = {
  block: SidebarBlock,
  layer: sidebarLayer.pipe(
    Layer.provide(Layer.mergeAll(DialogResourcesServerLayer, TooltipStoryLayer)),
  ),
}
type Model = typeof SidebarBlock.Model.Type
const rail = (model: Model) => {
  const row = model.railTooltips.rows[`${model.options.id}-rail`]
  if (row === undefined) throw new Error('Missing owned rail registration')
  return row
}

it.effect(
  'collapsed rail retains external force and side changes preserve all native options',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'rail', defaultOpen: false, peek: 'none', railTooltipOpen: true }),
      Story.model((model) => {
        expect(model.open).toBe(false)
        expect(rail(model).presentation.configuration.forceOpen).toEqual(Option.some(true))
        expect(rail(model).presentation.configuration.side).toBe('right')
      }),
      Story.inMessage(
        SidebarBlock.InMessage.RequestedPresentation({ side: 'right', variant: 'floating' }),
      ),
      Story.model((model) => {
        const options = rail(model).presentation.configuration
        expect(options.side).toBe('left')
        expect(options.sideOffset).toBe(8)
        expect(options.followCursor).toEqual(Option.some('y'))
        expect(options.forceOpen).toEqual(Option.some(true))
        expect(model.open).toBe(false)
      }),
      Story.inMessage(SidebarBlock.InMessage.RequestedRailTooltipOpen({ open: null })),
      Story.model((model) =>
        expect(rail(model).presentation.configuration.forceOpen).toEqual(Option.none()),
      ),
      Story.inMessage(SidebarBlock.InMessage.RequestedRailTooltipOpen({ open: false })),
      Story.model((model) =>
        expect(rail(model).presentation.configuration.forceOpen).toEqual(Option.some(false)),
      ),
      Story.Command.expectNone(),
    ),
)

it.effect('drag suppresses external force and release restores the latest configured mode', () =>
  Story.story(
    subject,
    Story.init({ id: 'rail', defaultOpen: true, railTooltipOpen: true }),
    Story.message(SidebarBlock.Message.Resized({ width: 220, open: true, resizing: true })),
    Story.expectOutMessage(SidebarBlock.OutMessage.WidthChanged({ width: '220px' })),
    Story.model((model) => {
      expect(model.railTooltipOpen).toEqual(Option.some(true))
      expect(rail(model).presentation.configuration.forceOpen).toEqual(Option.some(false))
    }),
    Story.inMessage(SidebarBlock.InMessage.RequestedRailTooltipOpen({ open: null })),
    Story.model((model) => {
      expect(model.railTooltipOpen).toEqual(Option.none())
      expect(rail(model).presentation.configuration.forceOpen).toEqual(Option.some(false))
    }),
    Story.message(SidebarBlock.Message.Resized({ width: 220, open: true, resizing: false })),
    Story.expectOutMessage(SidebarBlock.OutMessage.WidthChanged({ width: '220px' })),
    Story.model((model) =>
      expect(rail(model).presentation.configuration.forceOpen).toEqual(Option.none()),
    ),
    Story.Command.expectNone(),
  ),
)

it.effect('width changes and unchanged control preserve the native document owner', () =>
  Effect.gen(function* () {
    const initialized = yield* Story.story(
      subject,
      Story.init({ id: 'rail', railTooltipOpen: true }),
    )
    yield* Story.story(
      subject,
      Story.given(initialized),
      Story.models(
        Story.steps(
          Story.inMessage(SidebarBlock.InMessage.RequestedWidth({ width: '275px' })),
          Story.inMessage(SidebarBlock.InMessage.RequestedRailTooltipOpen({ open: true })),
          Story.Command.expectNone(),
        ),
        (before: Model, after) => {
          expect(after.width).toBe('275px')
          expect(after.railTooltips).toBe(before.railTooltips)
        },
      ),
    )
  }),
)
