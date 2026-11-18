// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Deferred, Effect, Fiber, Schema, Stream } from 'effect'
import { expect, vi } from 'vitest'
import { observeQueueEnvironment } from '../examples/src/input-queue-example-environment.js'

const NativeMediaWindow = Schema.Struct({
  happyDOM: Schema.Struct({
    settings: Schema.Struct({
      navigator: Schema.Struct({ maxTouchPoints: Schema.Number.pipe(Schema.mutableKey) }),
      device: Schema.Struct({
        prefersReducedMotion: Schema.Literals(['no-preference', 'reduce']).pipe(Schema.mutableKey),
      }),
    }),
  }),
})

it.live('queue preferences follow native media changes and unsubscribe on stream completion', () =>
  Effect.gen(function* () {
    const browser = document.defaultView
    if (!Schema.is(NativeMediaWindow)(browser))
      throw new Error('Native HappyDOM media settings required')
    const settings = browser.happyDOM.settings
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const previous = {
          touch: settings.navigator.maxTouchPoints,
          motion: settings.device.prefersReducedMotion,
        }
        settings.navigator.maxTouchPoints = 0
        settings.device.prefersReducedMotion = 'no-preference'
        return previous
      }),
      (previous) =>
        Effect.sync(() => {
          settings.navigator.maxTouchPoints = previous.touch
          settings.device.prefersReducedMotion = previous.motion
        }),
    )
    const media = vi.spyOn(browser, 'matchMedia')
    yield* Effect.addFinalizer(() => Effect.sync(() => media.mockRestore()))
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
    expect(media).toHaveBeenCalledTimes(2)
    const removals = media.mock.results.map((result) => {
      if (result.type !== 'return') throw new Error('Actual media query required')
      return vi.spyOn(result.value, 'removeEventListener')
    })
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const removal of removals) removal.mockRestore()
      }),
    )
    settings.navigator.maxTouchPoints = 1
    settings.device.prefersReducedMotion = 'reduce'
    browser.dispatchEvent(new browser.Event('resize'))
    expect(yield* Fiber.join(observations)).toEqual([
      { isTouch: false, isReducedMotion: false },
      { isTouch: true, isReducedMotion: true },
    ])
    for (const removal of removals) {
      expect(removal).toHaveBeenCalledExactlyOnceWith('change', expect.any(Function))
    }
  }).pipe(Effect.timeout('2 seconds')),
)
