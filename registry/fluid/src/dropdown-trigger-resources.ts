// Derived from Fluid Functionalism 200b4534 and its pinned Radix/Base primitives. MIT.
import { Effect, Queue, Stream } from 'effect'
import { DropdownObservation } from './dropdown-observation.js'
import type { DropdownTriggerObservation } from './dropdown-observation.js'
import type { DropdownResourceOptions } from './dropdown-resources.js'
const virtualMousePress = (event: PointerEvent, android: boolean) =>
  (!android && event.width === 0 && event.height === 0) ||
  (event.width === 1 &&
    event.height === 1 &&
    event.pressure === 0 &&
    event.detail === 0 &&
    event.pointerType === 'mouse' &&
    (android || event.buttons === 0))
export interface DropdownTriggerInput {
  readonly id: string
  readonly sub: boolean
  readonly direction: 'ltr' | 'rtl'
  readonly element: Element
  readonly viewStateChanges: Stream.Stream<'Live' | 'Paused'>
}
export function observeDropdownTrigger(
  document: Document,
  options: DropdownResourceOptions,
  input: DropdownTriggerInput,
): Stream.Stream<DropdownTriggerObservation> {
  return input.viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Paused'
        ? Stream.never
        : Stream.callback<DropdownTriggerObservation>((queue) =>
            Effect.gen(function* () {
              if (!input.element.isConnected) {
                return yield* Effect.die(new Error('Dropdown root must be connected'))
              }
              Queue.offerUnsafe(queue, DropdownObservation.Mounted())
              const trigger = document.querySelector(`[id="${CSS.escape(`${input.id}-trigger`)}"]`)
              if (!(trigger instanceof HTMLElement) || !input.element.contains(trigger)) {
                return yield* Effect.never
              }
              const disabled = () =>
                trigger.hasAttribute('disabled') || trigger.getAttribute('aria-disabled') === 'true'
              const send = (message: DropdownTriggerObservation) =>
                Queue.offerUnsafe(queue, message)
              let hoverOpenedAt: number | undefined

              const pointermove = (event: PointerEvent) => {
                if (
                  (input.sub || trigger.dataset.openOnHover === 'true') &&
                  !disabled() &&
                  !event.defaultPrevented &&
                  event.pointerType === 'mouse'
                ) {
                  if (!input.sub && trigger.getAttribute('aria-expanded') !== 'true') {
                    hoverOpenedAt = event.timeStamp
                  }
                  send(
                    DropdownObservation.HoveredTrigger({
                      over: true,
                      openOnHover: trigger.dataset.openOnHover === 'true',
                    }),
                  )
                }
              }
              const pointerleave = (event: PointerEvent) => {
                if (
                  (input.sub || trigger.dataset.openOnHover === 'true') &&
                  event.pointerType === 'mouse'
                ) {
                  send(
                    DropdownObservation.HoveredTrigger({
                      over: false,
                      openOnHover: trigger.dataset.openOnHover === 'true',
                    }),
                  )
                }
              }
              yield* Effect.acquireRelease(
                Effect.sync(() => {
                  const window = document.defaultView
                  let pointerType: string | undefined
                  let pressFrame: number | undefined
                  let releaseTimer: number | undefined
                  let releaseOutside: ((event: MouseEvent) => void) | undefined
                  const opensOnMouseDown = () =>
                    !input.sub && trigger.dataset.triggerPressEvent === 'mousedown'
                  const cancelRelease = () => {
                    if (releaseTimer !== undefined) {
                      window?.clearTimeout(releaseTimer)
                    }
                    if (releaseOutside !== undefined) {
                      document.removeEventListener('mouseup', releaseOutside)
                    }
                    releaseTimer = undefined
                    releaseOutside = undefined
                  }
                  const pointerdown = (event: PointerEvent) => {
                    if (opensOnMouseDown()) {
                      const android = /Android/iu.test(window?.navigator.userAgent ?? '')
                      const virtual = virtualMousePress(event, android)
                      pointerType =
                        (event.pointerType === 'mouse' || event.pointerType === 'pen') && virtual
                          ? 'virtual'
                          : event.pointerType
                    }
                    return
                  }
                  const mousedown = (event: MouseEvent) => {
                    if (
                      !opensOnMouseDown() ||
                      disabled() ||
                      event.defaultPrevented ||
                      event.button !== 0
                    ) {
                      return
                    }
                    const nextOpen = trigger.getAttribute('aria-expanded') !== 'true'
                    const publish = () => {
                      pressFrame = undefined
                      if (trigger.isConnected && !disabled()) {
                        send(DropdownObservation.RequestedOpen({ open: nextOpen }))
                      }
                    }
                    // Base Select waits for the browser's mousedown focus before opening.
                    // Virtual screen-reader presses must publish before its focus resync.
                    if (pressFrame !== undefined) {
                      window?.cancelAnimationFrame(pressFrame)
                    }
                    if (pointerType === 'virtual') {
                      publish()
                    } else {
                      pressFrame = window?.requestAnimationFrame(publish)
                    }
                    cancelRelease()
                    if (!nextOpen) {
                      return
                    }
                    releaseOutside = (release) => {
                      const { target } = release
                      const popup = document.querySelector(`[id="${CSS.escape(input.id)}"]`)
                      const rect = trigger.getBoundingClientRect()
                      if (
                        (target instanceof Node &&
                          (trigger.contains(target) || popup?.contains(target) === true)) ||
                        (release.clientX >= rect.left &&
                          release.clientX <= rect.right &&
                          release.clientY >= rect.top &&
                          release.clientY <= rect.bottom)
                      ) {
                        cancelRelease()
                        return
                      }
                      cancelRelease()
                      if (pressFrame !== undefined) {
                        window?.cancelAnimationFrame(pressFrame)
                      }
                      pressFrame = undefined
                      send(DropdownObservation.RequestedOpen({ open: false }))
                    }
                    const listener = releaseOutside
                    releaseTimer = window?.setTimeout(() => {
                      releaseTimer = undefined
                      document.addEventListener('mouseup', listener, { once: true })
                    }, 0)
                  }
                  const click = (event: MouseEvent) => {
                    if (disabled() || event.defaultPrevented) {
                      return
                    }
                    if (input.sub) {
                      options.callbacks?.(input.id).onActivate?.(trigger.id, event)
                      if (!event.defaultPrevented) {
                        send(DropdownObservation.ClickedSubTrigger())
                      }
                    } else {
                      if (opensOnMouseDown() && pointerType !== undefined && pointerType !== '') {
                        pointerType = undefined
                        return
                      }
                      send(
                        event.detail === 0 && trigger.getAttribute('aria-expanded') !== 'true'
                          ? DropdownObservation.PressedOpeningKey({ key: 'Enter' })
                          : DropdownObservation.ClickedTrigger({
                              // The controller may open on hover before its DOM commit.
                              withinHoverAdmission:
                                event.detail > 0 &&
                                trigger.dataset.openOnHover === 'true' &&
                                hoverOpenedAt !== undefined &&
                                event.timeStamp - hoverOpenedAt < 500,
                            }),
                      )
                    }
                  }
                  const keydown = (event: KeyboardEvent) => {
                    pointerType = undefined
                    if (disabled() || event.defaultPrevented) {
                      return
                    }
                    const direction = trigger.dataset.direction ?? input.direction
                    if (input.sub) {
                      if (event.key === (direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight')) {
                        event.preventDefault()
                        send(DropdownObservation.PressedOpeningKey({ key: 'ArrowDown' }))
                      } else if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        trigger.click()
                      }
                    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault()
                      send(DropdownObservation.PressedOpeningKey({ key: event.key }))
                    }
                  }
                  trigger.addEventListener('pointermove', pointermove)
                  trigger.addEventListener('pointerleave', pointerleave)
                  trigger.addEventListener('pointerdown', pointerdown)
                  trigger.addEventListener('mousedown', mousedown)
                  trigger.addEventListener('click', click)
                  trigger.addEventListener('keydown', keydown)
                  return () => {
                    trigger.removeEventListener('pointermove', pointermove)
                    trigger.removeEventListener('pointerleave', pointerleave)
                    trigger.removeEventListener('pointerdown', pointerdown)
                    trigger.removeEventListener('mousedown', mousedown)
                    trigger.removeEventListener('click', click)
                    if (pressFrame !== undefined) {
                      window?.cancelAnimationFrame(pressFrame)
                    }
                    cancelRelease()
                    trigger.removeEventListener('keydown', keydown)
                    options.callbacks?.(input.id).triggerRef?.(null)
                  }
                }),
                (release) => Effect.sync(release),
              )
              yield* Effect.sync(() => options.callbacks?.(input.id).triggerRef?.(trigger))
              return yield* Effect.never
            }),
          ),
    ),
  )
}
