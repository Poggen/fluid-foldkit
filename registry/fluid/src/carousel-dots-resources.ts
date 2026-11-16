import { observeCarouselFrames } from './carousel-dots-clock.js'
import { CarouselPresentation, createCarouselProgress } from './carousel-dots-progress.js'
import type { CarouselPresentationFacet } from './carousel-dots-progress.js'
import { Context, Effect, Layer, Predicate, Queue, Schema, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const CarouselObservation = defineMessageUnion({
  Frame: { elapsed: Schema.Finite },
  Reduced: { value: Schema.Boolean },
  Progress: { value: Schema.NumberFromString },
})

export interface CarouselProgress {
  readonly get: () => number
  readonly on: (event: 'change', listener: (value: number) => void) => () => void
}

export interface CarouselCapabilities {
  readonly onValueChange?: (value: number) => void
  readonly progress?: CarouselProgress
  readonly ref?: ((element: HTMLDivElement | null) => void) | { current: HTMLDivElement | null }
}

export class CarouselDotsResources extends Context.Service<
  CarouselDotsResources,
  {
    readonly [CarouselPresentation]: CarouselPresentationFacet
    readonly preference: (
      element: Element,
      states: Stream.Stream<'Live' | 'Paused'>,
    ) => Stream.Stream<typeof CarouselObservation.Reduced.Type>
    readonly observe: (
      id: string,
      identity: string,
      element: Element,
      states: Stream.Stream<'Live' | 'Paused'>,
    ) => Stream.Stream<typeof CarouselObservation.Progress.Type>
    readonly clock: (
      element: Element,
      states: Stream.Stream<'Live' | 'Paused'>,
    ) => Stream.Stream<typeof CarouselObservation.Frame.Type>
    readonly notify: (id: string, identity: string, index: number) => Effect.Effect<void>
  }
>()('FluidCarouselDotsResources') {}

export function makeCarouselDotsResourcesLayer(
  capabilities: (id: string, identity: string) => CarouselCapabilities,
) {
  return Layer.effect(
    CarouselDotsResources,
    Effect.gen(function* () {
      const progress = yield* Effect.acquireRelease(Effect.sync(createCarouselProgress), (scope) =>
        Effect.sync(scope.dispose),
      )
      return CarouselDotsResources.of({
        [CarouselPresentation]: {
          paint: (snapshot) => Effect.sync(() => progress.paint(snapshot)),
          resource: progress.resource,
        },
        notify: (id, identity, index) =>
          Effect.sync(() => capabilities(id, identity).onValueChange?.(index)),
        clock: (element, states) =>
          states.pipe(
            Stream.switchMap((state) =>
              state === 'Live'
                ? Stream.callback<typeof CarouselObservation.Frame.Type>((queue) =>
                    Effect.acquireRelease(
                      Effect.sync(() => {
                        return observeCarouselFrames(element, (elapsed) => {
                          Queue.offerUnsafe(queue, CarouselObservation.Frame({ elapsed }))
                        })
                      }),
                      (release) => Effect.sync(release),
                    ).pipe(Effect.flatMap(() => Effect.never)),
                  )
                : Stream.never,
            ),
          ),
        preference: (element, states) =>
          states.pipe(
            Stream.filter((state) => state === 'Live'),
            Stream.take(1),
            Stream.map(() =>
              CarouselObservation.Reduced({
                value:
                  element.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)')
                    .matches ?? false,
              }),
            ),
          ),
        observe: (id, identity, element, states) =>
          states.pipe(
            Stream.switchMap((state) =>
              state === 'Live'
                ? Stream.callback<typeof CarouselObservation.Progress.Type>((queue) =>
                    Effect.acquireRelease(
                      Effect.sync(() => {
                        const window = element.ownerDocument.defaultView

                        if (window === null || !(element instanceof HTMLDivElement)) {
                          throw new Error('CarouselDots requires a live HTML root')
                        }

                        const captured = capabilities(id, identity)
                        const capturedRef = captured.ref

                        if (Predicate.isFunction(capturedRef)) {
                          capturedRef(element)
                        } else if (capturedRef !== undefined) {
                          capturedRef.current = element
                        }

                        const { progress } = captured

                        const releaseProgress = progress?.on('change', (value) => {
                          Queue.offerUnsafe(queue, CarouselObservation.Progress({ value }))
                        })

                        if (progress) {
                          Queue.offerUnsafe(
                            queue,
                            CarouselObservation.Progress({ value: progress.get() }),
                          )
                        }

                        return () => {
                          releaseProgress?.()

                          if (Predicate.isFunction(capturedRef)) {
                            capturedRef(null)
                          } else if (capturedRef !== undefined) {
                            capturedRef.current = null
                          }
                        }
                      }),
                      (release) => Effect.sync(release),
                    ).pipe(Effect.flatMap(() => Effect.never)),
                  )
                : Stream.never,
            ),
          ),
      })
    }),
  )
}

export const CarouselDotsResourcesServerLayer = Layer.succeed(
  CarouselDotsResources,
  CarouselDotsResources.of({
    [CarouselPresentation]: {
      paint: () => Effect.void,
      resource: (snapshot) => ({ key: snapshot, mount: () => () => {} }),
    },
    preference: () => Stream.never,
    observe: () => Stream.never,
    clock: () => Stream.never,
    notify: () => Effect.void,
  }),
)

export const CarouselDotsResourcesDefaultLayer = makeCarouselDotsResourcesLayer(() => ({}))
