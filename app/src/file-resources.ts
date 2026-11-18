import { Effect, Layer, Stream } from 'effect'
import {
  FileThumbnailResources,
  makeFileThumbnailResourcesLayer,
} from '@foldkit-visuals/fluid/file-thumbnail'
import type { createInputMessageFileRegistry } from '@foldkit-visuals/fluid/input-message'
import portrait from '../../lib/assets/micka.png'

export const showcaseFileLayer = (files: ReturnType<typeof createInputMessageFileRegistry>) =>
  Layer.effect(
    FileThumbnailResources,
    Effect.gen(function* () {
      const uploads = yield* FileThumbnailResources
      return FileThumbnailResources.of({
        setPdfWorkerSrc: uploads.setPdfWorkerSrc,
        observe: (request) =>
          request.fileId === 'chat-portrait'
            ? request.states.pipe(
                Stream.filter((state) => state === 'Live'),
                Stream.map(() => ({
                  _tag: 'Loaded' as const,
                  generation: request.generation,
                  url: portrait,
                })),
              )
            : uploads.observe(request),
      })
    }),
  ).pipe(Layer.provide(makeFileThumbnailResourcesLayer({ file: files.file })))
