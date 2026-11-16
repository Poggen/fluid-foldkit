// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Deferred, Effect, Fiber, Stream } from 'effect'
import { expect } from 'vitest'
import { observeQueueEnvironment } from '../examples/src/input-queue-example-environment.js'

it.live('queue preferences follow media changes and stop observing when the view stream ends', () =>
  Effect.gen(function* () {
    const original = window.matchMedia
    const touch = original.call(window, '(hover: none)')
    const motion = original.call(window, '(prefers-reduced-motion: reduce)')
    let isTouch = false
    let isReducedMotion = false
    let reads = 0
    Object.defineProperty(touch, 'matches', {
      get: () => {
        reads += 1
        return isTouch
      },
    })
    Object.defineProperty(motion, 'matches', {
      get: () => {
        reads += 1
        return isReducedMotion
      },
    })
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        window.matchMedia = (query) => (query === '(hover: none)' ? touch : motion)
      }),
      () =>
        Effect.sync(() => {
          window.matchMedia = original
        }),
    )
    const ready = yield* Deferred.make<void>()
    const observations = yield* observeQueueEnvironment(
      document.createElement('div'),
      Stream.make('Live'),
      (environment) => environment,
    ).pipe(
      Stream.tap(() => Deferred.succeed(ready, undefined)),
      Stream.take(2),
      Stream.runCollect,
      Effect.forkScoped,
    )
    yield* Deferred.await(ready)
    isTouch = true
    isReducedMotion = true
    touch.dispatchEvent(new Event('change'))
    expect(yield* Fiber.join(observations)).toEqual([
      { isTouch: false, isReducedMotion: false },
      { isTouch: true, isReducedMotion: true },
    ])
    const completedReads = reads
    motion.dispatchEvent(new Event('change'))
    expect(reads).toBe(completedReads)
  }).pipe(Effect.timeout('2 seconds')),
)
