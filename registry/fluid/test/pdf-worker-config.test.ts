// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Stream } from 'effect'
import { loadPdfjs, makePdfjsLoaderLayer } from '../src/file-thumbnail-pdf.js'
import {
  FileThumbnailResources,
  makeFileThumbnailResourcesLayer,
  setPdfWorkerSrc,
} from '../src/file-thumbnail.js'

it.effect(
  'public thumbnail setter configures its own lazy resource loader and retargets that loaded module',
  () =>
    Effect.gen(function* () {
      const module = yield* Effect.promise(() => import('pdfjs-dist'))
      module.GlobalWorkerOptions.workerSrc = ''
      const element = document.createElement('div')
      document.body.append(element)
      const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' })
      yield* Effect.gen(function* () {
        yield* setPdfWorkerSrc('/assets/pdf.worker.min.mjs')
        expect(module.GlobalWorkerOptions.workerSrc).toBe('')
        const resources = yield* FileThumbnailResources
        const observed = yield* resources
          .observe({
            element,
            fileId: 'document',
            size: 80,
            generation: 0,
            states: Stream.make('Live' as const),
          })
          .pipe(Stream.runCollect)
        expect(observed.map((result) => result._tag)).toEqual(['Failed'])
        expect(module.GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.min.mjs')
        yield* setPdfWorkerSrc('/v2/pdf.worker.min.mjs')
        expect(module.GlobalWorkerOptions.workerSrc).toBe('/v2/pdf.worker.min.mjs')
      }).pipe(
        Effect.provide(makeFileThumbnailResourcesLayer({ file: () => file })),
        Effect.ensuring(Effect.sync(() => element.remove())),
      )
    }),
)

it.effect('preserves the version-matched CDN default when no worker override is supplied', () =>
  Effect.gen(function* () {
    const module = yield* Effect.promise(() => import('pdfjs-dist'))
    module.GlobalWorkerOptions.workerSrc = ''
    yield* Effect.gen(function* () {
      const loaded = yield* loadPdfjs()
      expect(loaded.GlobalWorkerOptions.workerSrc).toBe(
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${module.version}/build/pdf.worker.min.mjs`,
      )
    }).pipe(Effect.provide(makePdfjsLoaderLayer(() => Promise.resolve(module))))
  }),
)
