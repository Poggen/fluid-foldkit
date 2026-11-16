import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Layer } from 'effect'
import { Story } from 'foldkit'
import { ChatMessageBlock as Chat, layer, TouchPrimaryServerLayer } from '../src/chat-message.js'
import { FileThumbnailResourcesServerLayer } from '../src/file-thumbnail-resources.js'

const subject = {
  block: Chat,
  layer: layer.pipe(
    Layer.provide(Layer.merge(TouchPrimaryServerLayer, FileThumbnailResourcesServerLayer)),
  ),
}
const file = { id: 'first', name: 'first.png', type: 'image/png', size: 10, lastModified: 0 }
const second = { ...file, id: 'second', name: 'second.png' }

it.effect('message attachments acquire their previews from an empty record and when replaced', () =>
  Story.story(
    subject,
    Story.init({ id: 'message', from: 'user', files: [file] }),
    Story.model((model) => {
      expect(Object.values(model.thumbnails).map((thumbnail) => thumbnail.file.name)).toEqual([
        'first.png',
      ])
    }),
    Story.inMessage(
      Chat.InMessage.RequestedConfigure({ from: 'user', files: [second], thumbnailSize: 32 }),
    ),
    Story.model((model) => {
      expect(Object.values(model.thumbnails).map((thumbnail) => thumbnail.file.name)).toEqual([
        'second.png',
      ])
    }),
    Story.Command.expectNone(),
  ),
)
