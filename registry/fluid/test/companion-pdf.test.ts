import { makeFileThumbnailResourcesLayer } from '../src/file-thumbnail-resources.js'
import { expect, vi } from 'vitest'
import { it as test } from '@effect/vitest'
import { Deferred, Effect, Exit, Fiber, Layer } from 'effect'
import { loadPdfjs, makePdfjsLoaderLayer, PdfjsLoaderLayer } from '../src/file-thumbnail-pdf.js'

import type { PdfjsModule, PdfPreviewError, PdfjsLoaderService } from '../src/file-thumbnail-pdf.js'

test.effect(
  'PDF loader Layer is SSR lazy and retains the first failed load across thumbnail requests',
  () =>
    Effect.gen(function* lazyLayer() {
      const loader = vi
        .fn<() => Promise<PdfjsModule>>()
        .mockRejectedValue(new Error('worker unavailable'))

      const layer = makePdfjsLoaderLayer(loader)
      yield* Effect.scoped(Layer.build(layer))
      expect(loader).not.toHaveBeenCalled()

      return yield* Effect.gen(function* cachedFailure() {
        const first = yield* Effect.exit(loadPdfjs())
        const second = yield* Effect.exit(loadPdfjs())
        expect(Exit.isFailure(first)).toBe(true)
        expect(Exit.isFailure(second)).toBe(true)
        expect(loader).toHaveBeenCalledTimes(1)
      }).pipe(Effect.provide(layer))
    }),
)

export const fullPdfModuleContract: Effect.Effect<
  PdfjsModule,
  PdfPreviewError,
  PdfjsLoaderService
> = loadPdfjs()

export const consumeWholePdfModule = (module: PdfjsModule): PdfjsModule => module

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
    const settled = Promise.withResolvers<PdfjsModule>()
    const started = yield* Deferred.make<boolean>()
    const loader = vi.fn<() => Promise<PdfjsModule>>().mockReturnValue(settled.promise)
    const layer = makePdfjsLoaderLayer(loader)
    yield* Effect.gen(function* waitForSharedLoad() {
      const first = yield* Effect.forkChild(
        loadPdfjs().pipe(Effect.onExit(() => Deferred.succeed(started, true))),
      )

      yield* Effect.yieldNow
      yield* Fiber.interrupt(first)
      yield* Deferred.await(started)
      const second = yield* Effect.forkChild(Effect.flip(loadPdfjs()))
      settled.reject(new Error('shared module failed'))
      const error = yield* Fiber.join(second)
      expect(error.message).toBe('shared module failed')
      expect(loader).toHaveBeenCalledTimes(1)
    }).pipe(Effect.provide(layer))
  }),
)
