import { it } from '@effect/vitest'
import { Layer } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { ContextMenuBlock as block, layer } from '../src/context-menu.js'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'
const subject = { block, layer: layer.pipe(Layer.provide(DropdownResourcesServerLayer)) }
it.effect('opens the shared menu at the requested point and publishes visibility', () =>
  Story.story(
    subject,
    Story.init({ id: 'context' }),
    Story.message(block.Message.OpenedAt({ x: 217, y: 123 })),
    Story.model((model) => {
      expect(model.point).toEqual({ x: 217, y: 123 })
      expect(model.menu.controller.phase).toBe('open')
    }),
    Story.expectOutMessage(
      block.OutMessage.Events({ events: [{ _tag: 'OpenChanged', open: true }] }),
    ),
    Story.Command.expectNone(),
  ),
)
it.effect('disabled areas reject context opening', () =>
  Story.story(
    subject,
    Story.init({ id: 'disabled', disabled: true }),
    Story.message(block.Message.OpenedAt({ x: 217, y: 123 })),
    Story.model((model) => {
      expect(model.menu.controller.phase).toBe('absent')
    }),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
  ),
)
