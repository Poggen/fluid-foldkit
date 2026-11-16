import { it } from '@effect/vitest'
import { Effect, Layer, Option, Schema } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { FileThumbnailBlock, layer } from '../src/file-thumbnail.js'
import { FileThumbnailResourcesServerLayer } from '../src/file-thumbnail-resources.js'

const subject = {
  block: FileThumbnailBlock,
  layer: layer.pipe(Layer.provide(FileThumbnailResourcesServerLayer)),
}

const pdf = { id: 'pdf', name: 'contract.pdf', type: 'application/pdf' }

const image = { id: 'image', name: 'photo.png', type: 'image/png' }

it.effect('retains completed PDF through resize and rejects superseded completions', () =>
  Effect.gen(function* previewResize() {
    const model = yield* Story.story(
      subject,
      Story.init({ id: 'thumb', file: pdf, size: 80 }),
      Story.message(
        FileThumbnailBlock.Message.Loaded({ generation: 0, url: 'data:image/png;base64,first' }),
      ),
      Story.inMessage(
        FileThumbnailBlock.InMessage.RequestedConfigure({
          file: { ...pdf, name: 'renamed.pdf' },
          size: 160,
        }),
      ),
      Story.message(FileThumbnailBlock.Message.Loaded({ generation: 0, url: 'stale' })),
      Story.message(FileThumbnailBlock.Message.Failed({ generation: 1 })),
      Story.model((current) => {
        expect(Option.getOrNull(current.url)).toBe('data:image/png;base64,first')
        expect(current.failed).toBe(true)
        expect(current.file.name).toBe('renamed.pdf')
      }),
      Story.inMessage(
        FileThumbnailBlock.InMessage.RequestedConfigure({
          file: { id: 'text', name: 'notes.txt', type: 'text/plain' },
          size: 80,
        }),
      ),
      Story.model((current) => {
        expect(Option.isNone(current.url)).toBe(true)
        expect(current.failed).toBe(false)
      }),
    )

    const codec = Schema.fromJsonString(FileThumbnailBlock.Model)
    const json = yield* Schema.encodeEffect(codec)(model)
    expect(yield* Schema.decodeEffect(codec)(json)).toEqual(model)
  }),
)

it.effect('keeps the acquired image URL when only preview size changes', () =>
  Story.story(
    subject,
    Story.init({ id: 'image-thumb', file: image, size: 64 }),
    Story.message(FileThumbnailBlock.Message.Loaded({ generation: 0, url: 'blob:original' })),
    Story.inMessage(FileThumbnailBlock.InMessage.RequestedConfigure({ file: image, size: 128 })),
    Story.model((model) => {
      expect(model.size).toBe(128)
      expect(model.generation).toBe(0)
      expect(Option.getOrNull(model.url)).toBe('blob:original')
    }),
  ),
)

it.effect('retires serialized URLs on unmount and rejects the retired completion', () =>
  Story.story(
    subject,
    Story.init({ id: 'thumb', file: image, size: 64 }),
    Story.message(FileThumbnailBlock.Message.Loaded({ generation: 0, url: 'blob:retired' })),
    Story.message(FileThumbnailBlock.Message.Unmounted()),
    Story.message(FileThumbnailBlock.Message.Loaded({ generation: 0, url: 'blob:retired' })),
    Story.model((model) => {
      expect(Option.isNone(model.url)).toBe(true)
    }),
  ),
)

for (const outcome of ['loaded', 'failed']) {
  it.effect(`clears a previous file preview while a replacement PDF is ${outcome}`, () =>
    Story.story(
      subject,
      Story.init({ id: 'replacement-thumb', file: pdf, size: 80 }),
      Story.message(
        FileThumbnailBlock.Message.Loaded({ generation: 0, url: 'data:image/png;base64,first' }),
      ),
      Story.inMessage(
        FileThumbnailBlock.InMessage.RequestedConfigure({
          file: { ...pdf, id: 'replacement-pdf' },
          size: 80,
        }),
      ),
      Story.model((model) => {
        expect(model.file.id).toBe('replacement-pdf')
        expect(Option.isNone(model.url)).toBe(true)
      }),
      Story.message(
        FileThumbnailBlock.Message.Loaded({ generation: 0, url: 'data:image/png;base64,stale' }),
      ),
      Story.model((model) => {
        expect(Option.isNone(model.url)).toBe(true)
      }),
      Story.message(
        outcome === 'loaded'
          ? FileThumbnailBlock.Message.Loaded({ generation: 1, url: 'data:image/png;base64,new' })
          : FileThumbnailBlock.Message.Failed({ generation: 1 }),
      ),
      Story.model((model) => {
        expect(Option.getOrNull(model.url)).toBe(
          outcome === 'loaded' ? 'data:image/png;base64,new' : null,
        )
        expect(model.failed).toBe(outcome === 'failed')
      }),
    ),
  )
}

for (const scenario of [
  { type: 'application/pdf', size: 80 },
  { type: 'image/png', size: 160 },
]) {
  it.effect(`updates same-file ${scenario.type} metadata without restarting its preview`, () =>
    Story.story(
      subject,
      Story.init({
        id: 'renamed-thumb',
        file: { id: 'same-file', name: 'before', type: scenario.type },
        size: 80,
      }),
      Story.message(FileThumbnailBlock.Message.Loaded({ generation: 0, url: 'preview:retained' })),
      Story.inMessage(
        FileThumbnailBlock.InMessage.RequestedConfigure({
          file: { id: 'same-file', name: 'after', type: scenario.type },
          size: scenario.size,
        }),
      ),
      Story.model((model) => {
        expect(model.file.name).toBe('after')
        expect(model.size).toBe(scenario.size)
        expect(model.generation).toBe(0)
        expect(Option.getOrNull(model.url)).toBe('preview:retained')
      }),
      Story.Command.expectNone(),
    ),
  )
}
