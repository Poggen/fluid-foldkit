import { makeFileThumbnailResourcesLayer } from '../src/file-thumbnail-resources.js'
import { expect, vi } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Exit, Fiber, Layer } from 'effect'
import { loadPdfjs, makePdfjsLoaderLayer, PdfjsLoaderLayer } from '../src/file-thumbnail-pdf.js'

import type { PdfjsModule, PdfPreviewError, PdfjsLoaderService } from '../src/file-thumbnail-pdf.js'

test.effect(
  'PDF loader Layer is SSR lazy and retains the first failed load across thumbnail requests',
  () =>
    Effect.gen(function* lazyLayer() {
      const consumer = { load: () => import('pdfjs-dist') }
      const loader = vi.spyOn(consumer, 'load')

      const layer = makePdfjsLoaderLayer(loader)
      yield* Effect.scoped(Layer.build(layer))
      expect(loader).not.toHaveBeenCalled()

      return yield* Effect.gen(function* cachedFailure() {
        const first = yield* Effect.exit(loadPdfjs())
        const second = yield* Effect.exit(loadPdfjs())
        expect(Exit.isFailure(first)).toBe(true)
        expect(Exit.isFailure(second)).toBe(true)
        const firstError = yield* Effect.flip(loadPdfjs())
        expect(firstError.message).toContain('DOMMatrix')
        expect(loader).toHaveBeenCalledTimes(1)
      }).pipe(Effect.provide(layer))
    }),
)

export const fullPdfModuleContract: Effect.Effect<
  PdfjsModule,
  PdfPreviewError,
  PdfjsLoaderService
> = loadPdfjs()

export const consumeWholePdfModule: (module: PdfjsModule) => PdfjsModule = (module: PdfjsModule) =>
  module

test.effect('invoking the browser PDF module without DOM capabilities returns a typed error', () =>
  Effect.gen(function* browserFailure() {
    const error = yield* Effect.flip(loadPdfjs())
    expect(error._tag).toBe('PdfPreviewError')
    expect(error.message).toContain('DOMMatrix')
  }).pipe(Effect.provide(PdfjsLoaderLayer)),
)

test.effect(
  'the default FileThumbnail resource Layer is SSR lazy without a consumer PDF renderer or browser URL access',
  () =>
    Effect.gen(function* lazyResources() {
      let fileLookups = 0

      const layer = makeFileThumbnailResourcesLayer({
        file: () => {
          fileLookups += 1
          throw new Error('SSR must not observe files')
        },
      })

      yield* Effect.scoped(Layer.build(layer))
      expect(fileLookups).toBe(0)
    }),
)

test.effect('interrupting one PDF waiter does not cancel or poison the owning module load', () =>
  Effect.gen(function* independentWaiter() {
    const release = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    const consumer = {
      load: () => {
        started.resolve()
        return release.promise.then(() => import('pdfjs-dist'))
      },
    }
    const loader = vi.spyOn(consumer, 'load')
    const layer = makePdfjsLoaderLayer(loader)
    yield* Effect.gen(function* waitForSharedLoad() {
      const first = yield* Effect.forkChild(loadPdfjs())
      yield* Effect.promise(() => started.promise)
      yield* Fiber.interrupt(first)
      expect(Exit.hasInterrupts(yield* Fiber.await(first))).toBe(true)
      const second = yield* Effect.forkChild(Effect.flip(loadPdfjs()))
      release.resolve()
      const error = yield* Fiber.join(second)
      expect(error.message).toContain('DOMMatrix')
      expect(loader).toHaveBeenCalledTimes(1)
    }).pipe(Effect.provide(layer))
  }),
)
