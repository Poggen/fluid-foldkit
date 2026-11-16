// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Context, Effect, Layer, Queue, Schema, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const stackObservationFields = {
  ObservedTouch: { touch: Schema.Boolean },
  PointerStarted: { id: Schema.String, y: Schema.Finite },
  PointerMoved: { y: Schema.Finite, bottom: Schema.Finite },
  PointerEnded: {},
}

const Observation = defineMessageUnion(stackObservationFields)

export function observeQueuedStack(element: Element, states: Stream.Stream<'Live' | 'Paused'>) {
  return states.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<typeof Observation.Type>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                if (!(element instanceof HTMLElement)) {
                  throw new Error('QueuedStack requires HTMLElement')
                }

                const window = element.ownerDocument.defaultView

                if (!window) {
                  throw new Error('QueuedStack requires a live document')
                }

                const media = window.matchMedia('(hover: none)')

                const touch = () => {
                  Queue.offerUnsafe(queue, Observation.ObservedTouch({ touch: media.matches }))
                }

                const move = (event: PointerEvent) => {
                  const root = element.querySelector<HTMLElement>('[data-queued-stack]')

                  if (root) {
                    Queue.offerUnsafe(
                      queue,
                      Observation.PointerMoved({
                        y: event.clientY,
                        bottom: root.getBoundingClientRect().bottom,
                      }),
                    )
                  }
                }

                const pointer = {
                  stop: () => {
                    window.removeEventListener('pointermove', move)
                    window.removeEventListener('pointerup', pointer.up)
                    window.removeEventListener('pointercancel', pointer.up)
                  },
                  up: () => {
                    pointer.stop()
                    Queue.offerUnsafe(queue, Observation.PointerEnded())
                  },
                }

                const down = (event: PointerEvent) => {
                  const root = element.querySelector<HTMLElement>('[data-queued-stack]')

                  const action =
                    event.target instanceof Element
                      ? event.target.closest('button[data-queued-stack-action]')
                      : null

                  // Tooltip owns the button's mount. Stop at this stack's existing boundary
                  // after same-element listeners, before starting a row drag or bubbling out.
                  if (root && action?.closest('[data-queued-stack]') === root) {
                    event.stopPropagation()

                    return
                  }

                  if (
                    event.button !== 0 ||
                    root?.dataset.stackExpanded !== 'true' ||
                    !(event.target instanceof Element)
                  ) {
                    return
                  }

                  const row = event.target.closest<HTMLElement>('[data-stack-item]')
                  const id = row?.dataset.stackItem

                  if (
                    id === undefined ||
                    id === '' ||
                    !row ||
                    row.closest('[data-queued-stack]') !== root
                  ) {
                    return
                  }

                  pointer.stop()
                  Queue.offerUnsafe(queue, Observation.PointerStarted({ id, y: event.clientY }))
                  window.addEventListener('pointermove', move)
                  window.addEventListener('pointerup', pointer.up)
                  window.addEventListener('pointercancel', pointer.up)
                }

                element.addEventListener('pointerdown', down)
                media.addEventListener('change', touch)
                touch()

                return () => {
                  pointer.stop()
                  media.removeEventListener('change', touch)
                  element.removeEventListener('pointerdown', down)
                }
              }),
              (release) => Effect.sync(release),
            ).pipe(Effect.flatMap(() => Effect.never)),
          )
        : Stream.never,
    ),
  )
}

export class QueuedStackFrames extends Context.Service<
  QueuedStackFrames,
  { readonly next: Effect.Effect<void> }
>()('FluidQueuedStackFrames') {}

export const createQueuedStackFramesLayer = (window: Window) =>
  Layer.succeed(
    QueuedStackFrames,
    QueuedStackFrames.of({
      next: Effect.callback((resume) => {
        const frame = window.requestAnimationFrame(() => {
          resume(Effect.void)
        })

        return Effect.sync(() => {
          window.cancelAnimationFrame(frame)
        })
      }),
    }),
  )
