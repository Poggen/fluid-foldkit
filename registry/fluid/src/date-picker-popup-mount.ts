import { acquireDefaultPortalHost } from './default-portal-host.js'
import { constVoid } from 'effect/Function'
import { PopupAuthority } from './date-picker-popup-authority.js'
import { Clock, Effect, Option, Queue, Schema, Stream } from 'effect'
import { autoUpdate } from '@floating-ui/dom'
import { PopupBlock, Message, PopupConfig } from './date-picker-popup-definition.js'
import { ResourceEvents, popupExitGeneration } from './date-picker-popup-events.js'
import type { PopupObservation, ResourceEvent } from './date-picker-popup-events.js'
import { installPopupDismissal } from './date-picker-popup-dismiss.js'
import { installPopupFocusGuards } from './date-picker-popup-focus.js'
import { findPopupAnchor, mountPopupPortal } from './date-picker-popup-portal.js'
import { preparePopupFocusReturn } from './date-picker-popup-return.js'
import { popupFocusHandlers } from './date-picker-popup-focus-handlers.js'
import {
  positionPopup,
  popupPositionPolicy,
  samePopupPositionConfig,
} from './date-picker-popup-position.js'

export const PopupResource = PopupBlock.makeMountStream('Popup', {
  args: { config: PopupConfig },
  messages: [Message.DismissRequested, Message.ExitFinished],
  *handler() {
    const authority = yield* PopupAuthority
    const clock = yield* Clock.Clock
    const hosts = new Map<Document, ReturnType<typeof acquireDefaultPortalHost>>()

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const host of hosts.values()) {
          host.release()
        }

        hosts.clear()
      }),
    )

    return ({ element, viewStateChanges, config: initialConfig }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) => {
          if (state !== 'Live') {
            return Stream.never
          }

          const ownerWindow = element.ownerDocument.defaultView

          if (ownerWindow === null) {
            return Stream.never
          }

          if (!(element instanceof ownerWindow.HTMLElement)) {
            throw new Error('DatePicker popup mount requires an HTML element')
          }

          let active = false
          let anchorAvailable = true
          const projected = element.dataset.popupConfig ?? null
          const decoded: unknown = projected === null ? initialConfig : JSON.parse(projected)
          let config = Schema.decodeUnknownSync(PopupConfig)(decoded)
          let positionGeneration = 0

          const document = element.ownerDocument

          const findAnchor = (current = config) => findPopupAnchor(document, current)

          const makePolicy = () => {
            const generation = positionGeneration
            const reference = findAnchor()

            return popupPositionPolicy(
              element,
              () =>
                active &&
                anchorAvailable &&
                generation === positionGeneration &&
                reference !== null &&
                findAnchor() === reference,
            )
          }

          let policy = makePolicy()

          return Stream.callback<ResourceEvent>((queue) => {
            const emit = (message: PopupObservation) =>
              Queue.offerUnsafe(queue, ResourceEvents.Message({ message }))

            return Effect.acquireRelease(
              Effect.sync(() => {
                const window = document.defaultView

                if (window === null) {
                  return constVoid
                }

                // Keep the document lease across popup exits until the handler Layer disposes.
                let host = hosts.get(document)

                if (host === undefined) {
                  host = acquireDefaultPortalHost(document)
                  hosts.set(document, host)
                }

                const destination = host.element
                const previousVisibility = element.style.visibility
                let releaseOccurrence: (() => void) | undefined
                let refreshCurrent: (() => void) | undefined
                let initialMissingReported = false

                const startOccurrence = (initialAnchor: HTMLElement) => {
                  let anchor = initialAnchor

                  element.style.visibility = previousVisibility
                  element.dataset.popupAnchorState = 'available'
                  active = true

                  const { portal, restore: restorePortal } = mountPopupPortal(
                    element,
                    config,
                    destination,
                  )

                  const registration = authority.register(element, anchor)
                  const { previousFocus } = registration

                  const preferPreviousFocus =
                    (element.dataset.popupOpeningInteraction ?? null) === 'programmatic'

                  const focusHandlers = popupFocusHandlers({
                    element,
                    window,
                    getAnchor: () => anchor,
                    getConfig: () => config,
                    isActive: () => active,
                    isAnchorAvailable: () => anchorAvailable,
                    registration,
                    dismiss: (reason) => emit(Message.DismissRequested({ reason })),
                  })

                  const complete = (event: Event) => {
                    const generation = popupExitGeneration(element, event)

                    if (generation !== null) {
                      emit(Message.ExitFinished({ generation }))
                    }
                  }

                  const installGuards = () =>
                    installPopupFocusGuards(anchor, element, portal, config.id, () => {
                      focusHandlers.preventReturn()
                      emit(Message.DismissRequested({ reason: 'focus' }))
                    })

                  let releaseGuards = installGuards()

                  const releaseDismissal = installPopupDismissal({
                    document,

                    live: () =>
                      active &&
                      anchorAvailable &&
                      anchor.isConnected &&
                      (element.dataset.popupOpen ?? null) === 'true',
                    inside: focusHandlers.inside,
                    now: () => clock.currentTimeMillisUnsafe(),
                    dismiss: focusHandlers.pointerDismissal,
                  })

                  element.addEventListener('focusout', focusHandlers.lostFocus)
                  document.addEventListener('focusin', focusHandlers.focus)
                  document.addEventListener('keydown', focusHandlers.key, false)

                  {
                    element.addEventListener('keydown', focusHandlers.key)

                    if (config.kind === 'trigger') {
                      anchor.addEventListener('keydown', focusHandlers.key)
                    }
                  }

                  document.addEventListener('compositionstart', focusHandlers.compositionStart)
                  document.addEventListener('compositionend', focusHandlers.compositionEnd)
                  element.addEventListener('fluid-date-picker-exit', complete)

                  let stopPosition = autoUpdate(anchor, element, () => {
                    Queue.offerUnsafe(queue, ResourceEvents.Position())
                  })

                  refreshCurrent = () => {
                    const encoded = element.dataset.popupConfig ?? null

                    if (encoded === null) {
                      return
                    }

                    const updated: unknown = JSON.parse(encoded)
                    const next = Schema.decodeUnknownSync(PopupConfig)(updated)

                    const oldAnchor = anchor
                    const { id: oldId, kind: oldKind } = config
                    const nextAnchor = findAnchor(next)

                    if (nextAnchor === null) {
                      if (anchorAvailable) {
                        anchorAvailable = false
                        positionGeneration += 1
                        stopPosition()
                        releaseGuards()
                        oldAnchor.removeEventListener('keydown', focusHandlers.key)
                        element.style.visibility = 'hidden'
                        element.dataset.popupAnchorState = 'missing'
                        emit(Message.DismissRequested({ reason: 'anchor' }))
                      }

                      return
                    }

                    const recovering = !anchorAvailable

                    if (
                      !recovering &&
                      oldAnchor === nextAnchor &&
                      samePopupPositionConfig(config, next)
                    ) {
                      return
                    }

                    anchorAvailable = true
                    element.style.visibility = previousVisibility
                    element.dataset.popupAnchorState = 'available'
                    config = next
                    anchor = nextAnchor
                    positionGeneration += 1
                    policy = makePolicy()
                    portal.dataset.datePickerPortal = config.id

                    if (oldAnchor !== anchor || recovering) {
                      stopPosition()
                      registration.rebindAnchor(anchor)
                      stopPosition = autoUpdate(anchor, element, () => {
                        Queue.offerUnsafe(queue, ResourceEvents.Position())
                      })
                    }

                    if (oldAnchor !== anchor || oldKind !== config.kind || recovering) {
                      oldAnchor.removeEventListener('keydown', focusHandlers.key)

                      if (config.kind === 'trigger') {
                        anchor.addEventListener('keydown', focusHandlers.key)
                      }
                    }

                    if (oldAnchor !== anchor || oldId !== config.id || recovering) {
                      releaseGuards()
                      releaseGuards = installGuards()
                    }

                    Queue.offerUnsafe(queue, ResourceEvents.Position())
                  }

                  return () => {
                    active = false
                    stopPosition()
                    registration.release()
                    releaseGuards()
                    releaseDismissal()
                    focusHandlers.cancelRestoreFrame()
                    element.removeEventListener('focusout', focusHandlers.lostFocus)
                    document.removeEventListener('focusin', focusHandlers.focus)
                    document.removeEventListener('keydown', focusHandlers.key, false)
                    element.removeEventListener('keydown', focusHandlers.key)
                    anchor.removeEventListener('keydown', focusHandlers.key)
                    document.removeEventListener('compositionstart', focusHandlers.compositionStart)
                    document.removeEventListener('compositionend', focusHandlers.compositionEnd)
                    focusHandlers.clearCompositionTimer()
                    element.removeEventListener('fluid-date-picker-exit', complete)

                    const restoreFocus = preparePopupFocusReturn({
                      element,
                      anchor,
                      previousFocus,
                      registration,
                      config,
                      anchorAvailable,
                      preferPreviousFocus,

                      ...focusHandlers.returnPolicy(),
                    })

                    restorePortal()
                    restoreFocus()
                  }
                }

                const reconcileAnchor = () => {
                  if (refreshCurrent !== undefined) {
                    refreshCurrent()

                    return
                  }

                  const encoded = element.dataset.popupConfig ?? null
                  const latest: unknown = encoded === null ? initialConfig : JSON.parse(encoded)
                  config = Schema.decodeUnknownSync(PopupConfig)(latest)
                  const anchor = findAnchor()

                  if (anchor === null) {
                    anchorAvailable = false
                    element.style.visibility = 'hidden'
                    element.dataset.popupAnchorState = 'missing'

                    if (!initialMissingReported) {
                      initialMissingReported = true
                      Queue.offerUnsafe(
                        queue,
                        ResourceEvents.Message({
                          message: Message.DismissRequested({ reason: 'anchor' }),
                        }),
                      )
                    }

                    return
                  }

                  anchorAvailable = true
                  policy = makePolicy()
                  releaseOccurrence = startOccurrence(anchor)
                }
                // One owned observer covers initial absence, live loss/replacement, and config updates.

                const references = new window.MutationObserver(reconcileAnchor)
                references.observe(document.body, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['id', 'data-date-picker-anchor', 'data-popup-config'],
                })
                reconcileAnchor()

                return () => {
                  references.disconnect()
                  releaseOccurrence?.()
                  element.style.visibility = previousVisibility
                }
              }),
              (release) => Effect.sync(release),
            ).pipe(Effect.flatMap(() => Effect.never))
          }).pipe(
            Stream.mapEffect((event) => {
              if (ResourceEvents.$is('Message')(event)) {
                return Effect.succeed(Option.some(event.message))
              }

              const anchor = findAnchor()

              if (!anchorAvailable || anchor === null) {
                return Effect.succeed(Option.none())
              }

              const generation = positionGeneration

              return positionPopup(
                element,
                anchor,
                config,
                policy,
                () =>
                  active &&
                  anchorAvailable &&
                  generation === positionGeneration &&
                  findAnchor() === anchor,
              ).pipe(Effect.as(Option.none()))
            }),
            Stream.filter(Option.isSome),
            Stream.map((message) => message.value),
          )
        }),
      )
  },
})
