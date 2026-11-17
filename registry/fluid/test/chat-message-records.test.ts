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

const remote = { url: 'https://example.test/image.png', mediaType: 'image', filename: 'Remote' }

it.effect(
  'mixed attachments retain local keys and remote URL occurrences while metadata configures in place',
  () =>
    Story.story(
      subject,
      Story.init({
        id: 'mixed',
        from: 'user',
        files: [file, remote, { ...remote, filename: 'Duplicate' }],
      }),
      Story.model((model) => {
        expect(Object.keys(model.thumbnails)).toEqual([
          'first.png-10-0-0',
          `remote:${remote.url}:1`,
          `remote:${remote.url}:2`,
        ])
        expect(Object.values(model.thumbnails).map((thumbnail) => thumbnail.file.name)).toEqual([
          'first.png',
          'Remote',
          'Duplicate',
        ])
      }),
      Story.inMessage(
        Chat.InMessage.RequestedConfigure({
          from: 'assistant',
          files: [file, { ...remote, filename: 'Renamed', mediaType: 'application/pdf' }],
          thumbnailSize: 96,
        }),
      ),
      Story.model((model) => {
        expect(Object.keys(model.thumbnails)).toEqual([
          'first.png-10-0-0',
          `remote:${remote.url}:1`,
        ])
        expect(model.thumbnails[`remote:${remote.url}:1`]?.file.name).toBe('Renamed')
        expect(model.thumbnails[`remote:${remote.url}:1`]?.generation).toBe(0)
      }),
      Story.inMessage(
        Chat.InMessage.RequestedConfigure({
          from: 'user',
          files: [remote, file],
          thumbnailSize: 64,
        }),
      ),
      Story.model((model) =>
        expect(Object.keys(model.thumbnails)).toEqual([
          `remote:${remote.url}:0`,
          'first.png-10-0-1',
        ]),
      ),
      Story.inMessage(
        Chat.InMessage.RequestedConfigure({
          from: 'user',
          files: [{ ...remote, url: 'https://example.test/replacement.png' }, file],
          thumbnailSize: 64,
        }),
      ),
      Story.model((model) => {
        expect(model.thumbnails[`remote:${remote.url}:0`]).toBeUndefined()
        expect(
          Object.values(model.thumbnails).every((thumbnail) => thumbnail.generation === 0),
        ).toBe(true)
      }),
      Story.Command.expectNone(),
    ),
)

it.effect('remote keys cannot collide with a local filename that resembles a URL namespace', () =>
  Story.story(
    subject,
    Story.init({
      id: 'collision',
      from: 'user',
      files: [{ ...file, name: 'remote:https://example.test/image' }],
    }),
    Story.inMessage(
      Chat.InMessage.RequestedConfigure({
        from: 'user',
        files: [{ url: 'https://example.test/image-10-0', mediaType: 'image' }],
        thumbnailSize: 64,
      }),
    ),
    Story.model((model) => {
      expect(Object.keys(model.thumbnails)).toEqual(['remote:https://example.test/image-10-0:0'])
      expect(Object.values(model.thumbnails)[0]?.generation).toBe(0)
    }),
  ),
)
