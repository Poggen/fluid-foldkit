// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Context, Deferred, Effect, FiberSet, Layer } from 'effect'
import { constant } from 'effect/Function'
import type * as Pdfjs from 'pdfjs-dist'
import { PdfPreviewError } from './file-thumbnail-error.js'

export { PdfPreviewError } from './file-thumbnail-error.js'

export type PdfjsModule = typeof Pdfjs

export type PdfLoadingTask = ReturnType<PdfjsModule['getDocument']>

export type PdfDocument = Awaited<PdfLoadingTask['promise']>

export type PdfPage = Awaited<ReturnType<PdfDocument['getPage']>>

export type PdfViewport = ReturnType<PdfPage['getViewport']>

export type PdfRenderTask = ReturnType<PdfPage['render']>

export type PdfjsLoader = () => Promise<PdfjsModule>

const failure = (cause: unknown) =>
  new PdfPreviewError({
    message: cause instanceof Error ? cause.message : String(cause),
  })

export class PdfjsLoaderService extends Context.Service<
  PdfjsLoaderService,
  {
    readonly load: Effect.Effect<PdfjsModule, PdfPreviewError>
    readonly setPdfWorkerSrc: (src: string) => Effect.Effect<void>
  }
>()('FluidPdfjsLoader') {}

/** Each owning Layer caches the first load result, including failures, without loading during construction. */
export function makePdfjsLoaderLayer(
  loader?: PdfjsLoader,
  config?: { readonly workerSrc?: string },
) {
  return Layer.effect(
    PdfjsLoaderService,
    Effect.gen(function* pdfLoader() {
      const pending = yield* Deferred.make<PdfjsModule, PdfPreviewError>()
      const fibers = yield* FiberSet.make<boolean>()
      let started = false
      let workerSrc = config?.workerSrc
      let loaded: PdfjsModule | undefined
      const load = Effect.tryPromise({
        try: loader ?? (() => import('pdfjs-dist')),
        catch: failure,
      }).pipe(
        Effect.tap((module) =>
          Effect.sync(() => {
            loaded = module
            if (workerSrc !== undefined) {
              module.GlobalWorkerOptions.workerSrc = workerSrc
            } else if (!module.GlobalWorkerOptions.workerSrc) {
              module.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${module.version}/build/pdf.worker.min.mjs`
            }
          }),
        ),
      )

      yield* Effect.addFinalizer(() => Deferred.interrupt(pending))

      return {
        setPdfWorkerSrc: (src: string) =>
          Effect.sync(() => {
            workerSrc = src
            if (loaded !== undefined) {
              loaded.GlobalWorkerOptions.workerSrc = src
            }
          }),
        load: Effect.uninterruptibleMask((restore) =>
          Effect.gen(function* awaitModule() {
            if (!started) {
              started = true
              yield* FiberSet.run(fibers, restore(Deferred.complete(pending, load)))
            }
            return yield* restore(Deferred.await(pending))
          }),
        ),
      }
    }),
  )
}

export const PdfjsLoaderLayer = makePdfjsLoaderLayer()

export const setPdfWorkerSrc = Effect.fn('FileThumbnail.setPdfWorkerSrc')(function* (src: string) {
  const loader = yield* PdfjsLoaderService
  yield* loader.setPdfWorkerSrc(src)
})

export const loadPdfjs = Effect.fn('FileThumbnail.loadPdfjs')(function* () {
  const loader = yield* PdfjsLoaderService

  return yield* loader.load
})

export const renderPdfFirstPage = Effect.fn('FileThumbnail.renderPdfFirstPage')(function* (
  file: File,
  targetWidth: number,
  browserDocument?: Document,
) {
  const pdfjs = yield* loadPdfjs()
  const buffer = yield* Effect.tryPromise({ try: file.arrayBuffer.bind(file), catch: failure })

  const ownerDocument = yield* Effect.try({
    try: () => {
      const document = browserDocument ?? globalThis.document

      if (document === undefined) {
        throw new Error('PDF preview requires a browser document')
      }

      return document
    },
    catch: failure,
  })

  return yield* Effect.acquireUseRelease(
    Effect.try({ try: () => pdfjs.getDocument({ data: buffer }), catch: failure }),
    (loading) =>
      Effect.gen(function* () {
        const pdf = yield* Effect.tryPromise({ try: constant(loading.promise), catch: failure })
        const page = yield* Effect.tryPromise({ try: pdf.getPage.bind(pdf, 1), catch: failure })

        const viewport = yield* Effect.try({
          try: () => {
            const base = page.getViewport({ scale: 1 })

            return page.getViewport({ scale: (targetWidth * 2) / base.width })
          },
          catch: failure,
        })

        const canvas = yield* Effect.try({
          try: () => {
            const element = ownerDocument.createElement('canvas')
            element.width = viewport.width
            element.height = viewport.height

            return element
          },
          catch: failure,
        })

        yield* Effect.acquireUseRelease(
          Effect.try({ try: () => page.render({ canvas, viewport }), catch: failure }),
          (task) => Effect.tryPromise({ try: constant(task.promise), catch: failure }),
          (task) =>
            Effect.try({
              try: () => {
                task.cancel()
              },
              catch: failure,
            }),
        )

        return yield* Effect.try({ try: () => canvas.toDataURL('image/png'), catch: failure })
      }),
    (loading) => Effect.tryPromise({ try: loading.destroy.bind(loading), catch: failure }),
  )
})
