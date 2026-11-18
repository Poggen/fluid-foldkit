import { tooltipTrigger } from './elements.js'
import { observeTooltipFocus } from './focus-resource.js'
import { observeTooltipDismissal } from './dismiss-resource.js'
import { Context, Effect, Layer, Option, Queue, Schema, Stream } from 'effect'
import { positionTooltip } from './position-resource.js'
import { observeGroupMotion, GROUP_COMMIT_ATTRIBUTE } from './group-motion.js'
import { POPUP_PRESENTATION_ATTRIBUTE, readPopupPresentation } from './popup-presentation.js'
import { observeBaseGrace, hasOpenTooltipChild } from './base-grace-observation.js'
import { Observation } from './observation.js'
import type { TriggerObservation, PopupObservation } from './observation.js'

export interface TriggerInput {
  readonly element: Element
  readonly id: string
  readonly viewStateChanges: Stream.Stream<'Live' | 'Paused'>
}
export type PopupInput = TriggerInput
const AnimationCompletion = Schema.Struct({ generation: Schema.Natural })
export const TOOLTIP_ANIMATION_COMPLETE = 'fluid-tooltip-animation-complete'

export class TooltipDom extends Context.Service<
  TooltipDom,
  {
    readonly observeViewport: () => Stream.Stream<void>
    readonly hasOpenChild: (id: string) => Effect.Effect<boolean>
    readonly wait: (delay: number) => Effect.Effect<void>
    readonly portal: (input: {
      readonly element: Element
      readonly viewStateChanges: Stream.Stream<'Live' | 'Paused'>
    }) => Stream.Stream<never>
    readonly observeTrigger: (input: TriggerInput) => Stream.Stream<TriggerObservation>
    readonly observePopup: (input: PopupInput) => Stream.Stream<PopupObservation>
  }
>()('FluidDocumentTooltipDom') {}

export const makeTooltipDomLayer = (document: Document, window: Window) =>
  Layer.effect(
    TooltipDom,
    Effect.sync(() => {
      const follows = new WeakMap<Element, { offset: number; forced: string; axis: string }>()
      const popupPositions = new WeakMap<Element, () => void>()
      return TooltipDom.of({
        observeViewport: () =>
          Stream.callback<void>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const reset = () => Queue.offerUnsafe(queue, undefined)
                window.addEventListener('scroll', reset, { capture: true, passive: true })
                window.addEventListener('resize', reset)
                return () => {
                  window.removeEventListener('scroll', reset, { capture: true })
                  window.removeEventListener('resize', reset)
                }
              }),
              (cleanup) => Effect.sync(cleanup),
            ).pipe(Effect.andThen(Effect.never)),
          ),
        hasOpenChild: (id) => Effect.sync(() => hasOpenTooltipChild(document, id)),
        wait: (delay) =>
          Effect.callback<void>((resume) => {
            const timer = window.setTimeout(() => resume(Effect.void), delay)
            return Effect.sync(() => window.clearTimeout(timer))
          }),
        portal: (input) =>
          input.viewStateChanges.pipe(
            Stream.switchMap((state) =>
              state === 'Paused'
                ? Stream.never
                : Stream.callback<never>(() =>
                    Effect.acquireRelease(
                      Effect.sync(() => {
                        const parent = input.element.parentNode
                        const next = input.element.nextSibling
                        const moveToContainer = () => {
                          const containerId = input.element.getAttribute('data-tooltip-container')
                          if (containerId === null)
                            throw new Error('Tooltip portal has no committed container')

                          const triggerId = input.element.getAttribute('data-tooltip-popup')
                          const trigger =
                            triggerId === null ? null : tooltipTrigger(document, triggerId)
                          const container =
                            containerId === ''
                              ? (trigger?.closest('dialog[open]') ?? document.body)
                              : document.getElementById(containerId)
                          if (container === null)
                            throw new Error(`Missing Tooltip portal container ${containerId}`)
                          if (input.element.parentNode !== container) {
                            container.append(input.element)
                            popupPositions.get(input.element)?.()
                          }
                        }
                        moveToContainer()
                        const containerChanges = new MutationObserver(moveToContainer)
                        containerChanges.observe(input.element, {
                          attributes: true,
                          attributeFilter: ['data-tooltip-container'],
                        })
                        return () => {
                          containerChanges.disconnect()
                          if (parent?.isConnected)
                            parent.insertBefore(
                              input.element,
                              next?.parentNode === parent ? next : null,
                            )
                          else input.element.remove()
                        }
                      }),
                      (cleanup) => Effect.sync(cleanup),
                    ).pipe(Effect.andThen(Effect.never)),
                  ),
            ),
          ),
        observeTrigger: (input) =>
          input.viewStateChanges.pipe(
            Stream.switchMap((state) =>
              state === 'Paused'
                ? Stream.never
                : Stream.callback<TriggerObservation>((queue) =>
                    Effect.acquireRelease(
                      Effect.sync(() => {
                        const element = input.element
                        if (!(element instanceof HTMLElement))
                          throw new Error('Tooltip trigger must be an HTML element')
                        const send = (observation: TriggerObservation) =>
                          Queue.offerUnsafe(queue, observation)
                        send(Observation.Mounted())
                        const followState = {
                          offset: 0,
                          forced: element.dataset.tooltipForce ?? 'none',
                          axis: element.dataset.tooltipFollow ?? 'none',
                        }
                        follows.set(element, followState)
                        const paintFollow = () => {
                          const follow = document
                            .getElementById(`${input.id}-popup`)
                            ?.querySelector<HTMLElement>('[data-tooltip-follow]')
                          if (follow !== null && follow !== undefined)
                            follow.style.transform =
                              followState.axis === 'x'
                                ? `translateX(${followState.offset}px)`
                                : followState.axis === 'y'
                                  ? `translateY(${followState.offset}px)`
                                  : ''
                        }
                        const followConfig = new MutationObserver(() => {
                          const forced = element.dataset.tooltipForce ?? 'none'
                          const axis = element.dataset.tooltipFollow ?? 'none'
                          if (
                            forced === 'true' &&
                            axis !== 'none' &&
                            (forced !== followState.forced || axis !== followState.axis)
                          )
                            followState.offset = 0
                          followState.forced = forced
                          followState.axis = axis
                          paintFollow()
                        })
                        followConfig.observe(element, {
                          attributes: true,
                          attributeFilter: ['data-tooltip-force', 'data-tooltip-follow'],
                        })
                        const eligible = (event: Event) =>
                          !event.defaultPrevented && !element.hasAttribute('disabled')
                        const within = (target: EventTarget | null) =>
                          target instanceof Node && element.contains(target)
                        const over = (event: PointerEvent) => {
                          if (!eligible(event)) return
                          const target = event.composedPath()[0] ?? event.target
                          const nearest =
                            target instanceof Element
                              ? target.closest('[data-tooltip-trigger]:not([disabled])')
                              : null
                          send(
                            Observation.NestedHover({
                              nested:
                                nearest !== null &&
                                nearest !== element &&
                                element.contains(nearest),
                              pointerType: event.pointerType,
                            }),
                          )
                        }
                        const enter = (event: PointerEvent) => {
                          if (eligible(event))
                            send(Observation.Entered({ pointerType: event.pointerType }))
                        }
                        const move = (event: PointerEvent) => {
                          if (eligible(event) && followState.axis !== 'none') {
                            const rect = element.getBoundingClientRect()
                            followState.offset =
                              followState.axis === 'x'
                                ? event.clientX - (rect.left + rect.width / 2)
                                : event.clientY - (rect.top + rect.height / 2)
                            paintFollow()
                          }
                          if (eligible(event))
                            send(
                              Observation.Moved({
                                pointerType: event.pointerType,
                                movementSquared: event.movementX ** 2 + event.movementY ** 2,
                              }),
                            )
                        }
                        const leave = (event: PointerEvent) => {
                          if (!eligible(event)) return
                          send(Observation.Left())
                          {
                            const observed = observeBaseGrace(
                              document,
                              input.id,
                              event,
                              window.performance.now(),
                            )
                            if (observed !== undefined) send(observed)
                          }
                        }
                        const graceMove = (event: PointerEvent) => {
                          {
                            const observed = observeBaseGrace(
                              document,
                              input.id,
                              event,
                              window.performance.now(),
                            )
                            if (observed !== undefined) send(observed)
                            return
                          }
                        }
                        const stopFocus = observeTooltipFocus(
                          document,
                          window,
                          element,
                          input.id,
                          send,
                        )

                        const press = (event: PointerEvent) => {
                          if (within(event.target) && eligible(event)) send(Observation.Pressed())
                        }
                        const click = (event: MouseEvent) => {
                          if (within(event.target) && eligible(event)) send(Observation.Clicked())
                        }
                        element.addEventListener('pointerover', over)
                        element.addEventListener('pointerenter', enter)
                        element.addEventListener('pointermove', move)
                        element.addEventListener('pointerleave', leave)
                        document.addEventListener('pointermove', graceMove)
                        document.addEventListener('pointerdown', press)
                        document.addEventListener('click', click)
                        return () => {
                          element.removeEventListener('pointerover', over)
                          element.removeEventListener('pointerenter', enter)
                          element.removeEventListener('pointermove', move)
                          element.removeEventListener('pointerleave', leave)
                          stopFocus()
                          followConfig.disconnect()
                          follows.delete(element)
                          document.removeEventListener('pointermove', graceMove)
                          document.removeEventListener('pointerdown', press)
                          document.removeEventListener('click', click)
                        }
                      }),
                      (cleanup) => Effect.sync(cleanup),
                    ).pipe(Effect.andThen(Effect.never)),
                  ),
            ),
          ),
        observePopup: (input) =>
          input.viewStateChanges.pipe(
            Stream.switchMap((state) =>
              state === 'Paused'
                ? Stream.never
                : Stream.callback<PopupObservation>((queue) =>
                    Effect.acquireRelease(
                      Effect.sync(() => {
                        const element = input.element.closest('[data-tooltip-popup]')
                        const trigger = tooltipTrigger(document, input.id)
                        if (!(element instanceof HTMLElement) || !(trigger instanceof HTMLElement))
                          throw new Error(
                            'Tooltip positioning requires connected HTML trigger and popup',
                          )
                        const position = positionTooltip(window, trigger, element, () =>
                          readPopupPresentation(element),
                        )
                        popupPositions.set(element, position.refresh)
                        let grouped = element.hasAttribute(GROUP_COMMIT_ATTRIBUTE)
                        let stopGroupMotion = observeGroupMotion(window, element, (observation) =>
                          Queue.offerUnsafe(queue, observation),
                        )
                        const stopDismiss = observeTooltipDismissal(
                          document,
                          window,
                          trigger,
                          element,
                          input.id,
                          (message) => Queue.offerUnsafe(queue, message),
                        )
                        const leave = (event: Event) => {
                          if (!(event instanceof PointerEvent)) return
                          {
                            const observed = observeBaseGrace(
                              document,
                              input.id,
                              event,
                              window.performance.now(),
                            )
                            if (observed !== undefined) Queue.offerUnsafe(queue, observed)
                          }
                        }
                        const hoverElement = input.element
                        hoverElement.addEventListener('pointerleave', leave)
                        const paintFollow = () => {
                          const follow = element.querySelector<HTMLElement>('[data-tooltip-follow]')
                          const followState = follows.get(trigger)
                          const configuration = readPopupPresentation(element)
                          if (
                            follow !== null &&
                            followState !== undefined &&
                            Option.isSome(configuration)
                          )
                            follow.style.transform =
                              configuration.value.followCursor === 'x'
                                ? `translateX(${followState.offset}px)`
                                : configuration.value.followCursor === 'y'
                                  ? `translateY(${followState.offset}px)`
                                  : ''
                        }
                        paintFollow()
                        const presentationChanges = new MutationObserver(() => {
                          const nextGrouped = element.hasAttribute(GROUP_COMMIT_ATTRIBUTE)
                          if (nextGrouped !== grouped) {
                            stopGroupMotion()
                            grouped = nextGrouped
                            stopGroupMotion = observeGroupMotion(window, element, (observation) =>
                              Queue.offerUnsafe(queue, observation),
                            )
                          }
                          position.update()
                          paintFollow()
                        })
                        presentationChanges.observe(element, {
                          attributes: true,
                          attributeFilter: [
                            POPUP_PRESENTATION_ATTRIBUTE,
                            'data-tooltip-container',
                            GROUP_COMMIT_ATTRIBUTE,
                          ],
                        })
                        const complete = (event: Event) => {
                          if (!(event instanceof CustomEvent)) return
                          const detail: unknown = event.detail
                          const decoded = Schema.decodeUnknownOption(AnimationCompletion)(detail)
                          if (Option.isSome(decoded))
                            Queue.offerUnsafe(
                              queue,
                              Observation.CompletedAnimation({
                                generation: decoded.value.generation,
                              }),
                            )
                        }
                        element.addEventListener(TOOLTIP_ANIMATION_COMPLETE, complete)
                        return () => {
                          presentationChanges.disconnect()
                          popupPositions.delete(element)
                          position.dispose()
                          stopGroupMotion()
                          stopDismiss()
                          hoverElement.removeEventListener('pointerleave', leave)
                          element.removeEventListener(TOOLTIP_ANIMATION_COMPLETE, complete)
                        }
                      }),
                      (cleanup) => Effect.sync(cleanup),
                    ).pipe(Effect.andThen(Effect.never)),
                  ),
            ),
          ),
      })
    }),
  )
