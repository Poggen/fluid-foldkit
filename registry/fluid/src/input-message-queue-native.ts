import { Context, Effect, Layer, Queue, Stream } from 'effect'

export interface InputMessageQueueKey {
  readonly key: string
  readonly alt: boolean
}

export class InputMessageQueueNative extends Context.Service<
  InputMessageQueueNative,
  {
    readonly observe: (
      element: Element,
      states: Stream.Stream<'Live' | 'Paused'>,
    ) => Stream.Stream<InputMessageQueueKey>
  }
>()('FluidInputMessageQueueNative') {}

export const createInputMessageQueueNativeLayer = (window: Window & typeof globalThis) =>
  Layer.succeed(
    InputMessageQueueNative,
    InputMessageQueueNative.of({
      observe: (element, states) =>
        states.pipe(
          Stream.switchMap((state) =>
            state === 'Paused'
              ? Stream.empty
              : Stream.callback<InputMessageQueueKey>((queue) => {
                  const keydown = (event: Event) => {
                    if (!(event instanceof window.KeyboardEvent)) {
                      return
                    }

                    if (
                      event.key === 'Enter' ||
                      event.key === 'F2' ||
                      event.key === 'Delete' ||
                      event.key === 'Backspace' ||
                      (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown'))
                    ) {
                      event.preventDefault()
                      Queue.offerUnsafe(queue, { key: event.key, alt: event.altKey })
                    }
                  }

                  return Effect.acquireRelease(
                    Effect.sync(() => {
                      const row = element.closest('li')

                      row?.addEventListener('keydown', keydown)

                      return () => row?.removeEventListener('keydown', keydown)
                    }),
                    (release) => Effect.sync(release),
                  ).pipe(Effect.flatMap(() => Effect.never))
                }),
          ),
        ),
    }),
  )
