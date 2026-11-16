// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Queue, Stream } from 'effect'
import type { SwitchBlock, switchMetrics } from './switch'

const stopPropagation = (event: Event) => {
  event.stopPropagation()
}

const trackClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

export const defineSwitchPointer = (block: typeof SwitchBlock, metrics: typeof switchMetrics) => {
  const { Message } = block

  return block.makeMountStream('ObservePointer', {
    messages: [
      Message.CapturedMount,
      Message.CapturedHover,
      Message.CapturedDown,
      Message.CapturedMove,
      Message.CapturedUp,
      Message.CapturedToggle,
    ],
    *handler() {
      return ({ element, viewStateChanges }) =>
        viewStateChanges.pipe(
          Stream.switchMap((state) =>
            state === 'Live'
              ? Stream.callback<
                  | typeof Message.CapturedMount.Type
                  | typeof Message.CapturedHover.Type
                  | typeof Message.CapturedDown.Type
                  | typeof Message.CapturedMove.Type
                  | typeof Message.CapturedUp.Type
                  | typeof Message.CapturedToggle.Type
                >((queue) =>
                  Effect.acquireRelease(
                    Effect.sync(() => {
                      Queue.offerUnsafe(queue, Message.CapturedMount())
                      const track = element.querySelector<HTMLElement>('[data-slot=switch-track]')
                      const input = element.querySelector<HTMLInputElement>('input[type=checkbox]')
                      const thumb = element.querySelector<HTMLElement>('[data-slot=switch-thumb]')

                      if (!(element instanceof HTMLElement) || !track || !thumb) {
                        throw new Error('Fluid Switch requires its row, track and thumb')
                      }

                      const down = (event: PointerEvent) => {
                        if (
                          track.hasAttribute('disabled') ||
                          track.getAttribute('aria-disabled') === 'true'
                        ) {
                          return
                        }

                        if (event.pointerType === 'mouse' && event.button !== 0) {
                          return
                        }

                        const { transform } = getComputedStyle(thumb)
                        const origin = transform === 'none' ? 2 : new DOMMatrix(transform).m41
                        Queue.offerUnsafe(
                          queue,
                          Message.CapturedDown({
                            id: event.pointerId,
                            start: event.clientX,
                            origin,
                            maximum:
                              track.offsetWidth === metrics.compact.trackWidth
                                ? metrics.compact.trackWidth -
                                  2 -
                                  metrics.compact.thumbSize -
                                  metrics.compact.pressExtend
                                : metrics.default.trackWidth -
                                  2 -
                                  metrics.default.thumbSize -
                                  metrics.default.pressExtend,
                          }),
                        )
                        element.setPointerCapture(event.pointerId)
                      }

                      const move = (event: PointerEvent) => {
                        Queue.offerUnsafe(
                          queue,
                          Message.CapturedMove({ id: event.pointerId, clientX: event.clientX }),
                        )
                      }

                      const up = (event: PointerEvent) => {
                        Queue.offerUnsafe(
                          queue,
                          Message.CapturedUp({
                            id: event.pointerId,
                            cancelled: event.type === 'pointercancel',
                          }),
                        )
                      }

                      const enter = (event: PointerEvent) => {
                        if (event.pointerType === 'mouse') {
                          Queue.offerUnsafe(queue, Message.CapturedHover({ hovered: true }))
                        }
                      }

                      const leave = () => {
                        Queue.offerUnsafe(queue, Message.CapturedHover({ hovered: false }))
                      }

                      const keydown = (event: KeyboardEvent) => {
                        if (event.target !== track) {
                          return
                        }

                        if (event.key === ' ' || event.key === 'Enter') {
                          event.preventDefault()
                        }

                        if (event.key === 'Enter') {
                          Queue.offerUnsafe(queue, Message.CapturedToggle())
                        }
                      }

                      const click = (event: MouseEvent) => {
                        if (
                          event.target instanceof Node &&
                          !track.contains(event.target) &&
                          !(event.target instanceof HTMLInputElement)
                        ) {
                          Queue.offerUnsafe(queue, Message.CapturedToggle())
                        }
                      }

                      const inputChange = () => {
                        Queue.offerUnsafe(queue, Message.CapturedToggle())
                      }

                      const inputFocus = () => {
                        track.focus()
                      }

                      input?.addEventListener('change', inputChange)
                      input?.addEventListener('click', stopPropagation)
                      input?.addEventListener('focus', inputFocus)

                      track.addEventListener('click', trackClick)
                      element.addEventListener('pointerdown', down)
                      element.addEventListener('pointermove', move)
                      element.addEventListener('pointerup', up)
                      element.addEventListener('pointercancel', up)
                      element.addEventListener('pointerenter', enter)
                      element.addEventListener('pointerleave', leave)
                      element.addEventListener('click', click)
                      track.addEventListener('keydown', keydown)

                      return () => {
                        input?.removeEventListener('change', inputChange)
                        input?.removeEventListener('click', stopPropagation)
                        input?.removeEventListener('focus', inputFocus)
                        track.removeEventListener('click', trackClick)
                        element.removeEventListener('pointerdown', down)
                        element.removeEventListener('pointermove', move)
                        element.removeEventListener('pointerup', up)
                        element.removeEventListener('pointercancel', up)
                        element.removeEventListener('pointerenter', enter)
                        element.removeEventListener('pointerleave', leave)
                        element.removeEventListener('click', click)
                        track.removeEventListener('keydown', keydown)
                      }
                    }),
                    (dispose) => Effect.sync(dispose),
                  ).pipe(Effect.flatMap(() => Effect.never)),
                )
              : Stream.never,
          ),
        )
    },
  })
}
