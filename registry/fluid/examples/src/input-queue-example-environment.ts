import { Effect, Function, Queue, Schema, Stream } from 'effect'
import type * as Mount from 'foldkit/mount'

export const QueueEnvironment = Schema.Struct({
  isTouch: Schema.Boolean,
  isReducedMotion: Schema.Boolean,
})
export type QueueEnvironment = typeof QueueEnvironment.Type

export const observeQueueEnvironment = <Message>(
  element: Element,
  viewStateChanges: Stream.Stream<Mount.ViewState>,
  toMessage: (environment: QueueEnvironment) => Message,
): Stream.Stream<Message> =>
  viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<Message>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const window = element.ownerDocument.defaultView
                if (window === null) return Function.constVoid
                const touch = window.matchMedia('(hover: none)')
                const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
                const emit = () =>
                  Queue.offerUnsafe(
                    queue,
                    toMessage({
                      isTouch: touch.matches,
                      isReducedMotion: motion.matches,
                    }),
                  )
                touch.addEventListener('change', emit)
                motion.addEventListener('change', emit)
                emit()
                return () => {
                  touch.removeEventListener('change', emit)
                  motion.removeEventListener('change', emit)
                }
              }),
              (cleanup) => Effect.sync(cleanup),
            ),
          )
        : Stream.empty,
    ),
  )
