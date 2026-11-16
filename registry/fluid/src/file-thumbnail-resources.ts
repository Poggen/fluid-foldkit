import { Context, Effect, Layer, Queue, Schema, Stream } from 'effect'
import {
  PdfjsLoaderService,
  makePdfjsLoaderLayer,
  renderPdfFirstPage,
} from './file-thumbnail-pdf.js'
import type { PdfPreviewError } from './file-thumbnail-pdf.js'
import { defineMessageUnion } from 'foldkit/message'

export const FilePreviewObservation = defineMessageUnion({
  Loaded: { generation: Schema.Natural, url: Schema.String },
  Failed: { generation: Schema.Natural },
})

export interface FileThumbnailCapabilities {
  readonly file: (identity: string) => File
  readonly pdfWorkerSrc?: string
  readonly renderPdf?: (file: File, size: number) => Effect.Effect<string, PdfPreviewError>
  readonly createObjectURL?: (file: File) => string
  readonly revokeObjectURL?: (url: string) => void
}

export interface FilePreviewRequest {
  readonly element: Element
  readonly fileId: string
  readonly size: number
  readonly generation: number
  readonly states: Stream.Stream<'Live' | 'Paused'>
}

export class FileThumbnailResources extends Context.Service<
  FileThumbnailResources,
  {
    readonly setPdfWorkerSrc: (src: string) => Effect.Effect<void>
    readonly observe: (
      request: FilePreviewRequest,
    ) => Stream.Stream<typeof FilePreviewObservation.Type>
  }
>()('FluidFileThumbnailResources') {}

export function makeFileThumbnailResourcesLayer(capabilities: FileThumbnailCapabilities) {
  const createObjectURL = (file: File) =>
    capabilities.createObjectURL === undefined
      ? URL.createObjectURL(file)
      : capabilities.createObjectURL(file)

  const revokeObjectURL = (url: string) => {
    if (capabilities.revokeObjectURL === undefined) {
      URL.revokeObjectURL(url)
    } else {
      capabilities.revokeObjectURL(url)
    }
  }

  return Layer.effect(
    FileThumbnailResources,
    Effect.gen(function* () {
      const loader = yield* PdfjsLoaderService

      return yield* Effect.acquireRelease(
        Effect.sync(() => {
          const objects = new Map<File, { readonly url: string; users: number }>()

          const observe = ({ element, fileId, size, generation, states }: FilePreviewRequest) =>
            states.pipe(
              Stream.switchMap((state) =>
                state === 'Live'
                  ? Stream.unwrap(
                      Effect.sync(() => {
                        if (!element.isConnected) {
                          throw new Error('FileThumbnail requires a connected preview node')
                        }

                        const file = capabilities.file(fileId)

                        if (file.type.startsWith('image/')) {
                          return Stream.callback<typeof FilePreviewObservation.Type>((queue) =>
                            Effect.acquireRelease(
                              Effect.sync(() => {
                                const entry = objects.get(file) ?? {
                                  url: createObjectURL(file),
                                  users: 0,
                                }

                                objects.set(file, entry)
                                entry.users += 1
                                Queue.offerUnsafe(
                                  queue,
                                  FilePreviewObservation.Loaded({ generation, url: entry.url }),
                                )

                                return () => {
                                  entry.users -= 1

                                  if (entry.users === 0) {
                                    revokeObjectURL(entry.url)
                                    objects.delete(file)
                                  }
                                }
                              }),
                              (release) => Effect.sync(release),
                            ).pipe(Effect.flatMap(() => Effect.never)),
                          )
                        }

                        if (file.type === 'application/pdf') {
                          return Stream.fromEffect(
                            (
                              capabilities.renderPdf?.(file, size) ??
                              renderPdfFirstPage(file, size).pipe(
                                Effect.provideService(PdfjsLoaderService, loader),
                              )
                            ).pipe(
                              Effect.match({
                                onSuccess: (url) =>
                                  FilePreviewObservation.Loaded({ generation, url }),
                                onFailure: () => FilePreviewObservation.Failed({ generation }),
                              }),
                            ),
                          )
                        }

                        return Stream.never
                      }),
                    )
                  : Stream.never,
              ),
            )

          return {
            objects,
            service: FileThumbnailResources.of({
              observe,
              setPdfWorkerSrc: loader.setPdfWorkerSrc,
            }),
          }
        }),
        ({ objects }) =>
          Effect.sync(() => {
            for (const entry of objects.values()) {
              revokeObjectURL(entry.url)
            }

            objects.clear()
          }),
      ).pipe(Effect.map(({ service }) => service))
    }),
  ).pipe(
    Layer.provide(
      makePdfjsLoaderLayer(
        undefined,
        capabilities.pdfWorkerSrc === undefined
          ? undefined
          : { workerSrc: capabilities.pdfWorkerSrc },
      ),
    ),
  )
}

export const FileThumbnailResourcesServerLayer = Layer.succeed(
  FileThumbnailResources,
  FileThumbnailResources.of({ observe: () => Stream.never, setPdfWorkerSrc: () => Effect.void }),
)

/** Configure the same loader instance that owns this thumbnail resource Layer. */
export const setPdfWorkerSrc = Effect.fn('FileThumbnailResources.setPdfWorkerSrc')(function* (
  src: string,
) {
  const resources = yield* FileThumbnailResources
  yield* resources.setPdfWorkerSrc(src)
})
