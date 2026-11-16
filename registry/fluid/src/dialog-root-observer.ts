// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Queue, Schema, Stream } from 'effect'
import { DialogObservation, DIALOG_MOTION_COMPLETE } from './dialog-observation.js'
import type { DialogResourceOptions, DialogCallbacks } from './dialog-resource-contract.js'
import { dialogFocusable, dialogLifecycleEvent, dialogInitialFocus } from './dialog-focus.js'
import { exitFallbackMs, spring } from './lib/springs.js'

export interface DialogOccurrence {
  readonly id: string
  readonly host: HTMLElement
  readonly parentId: () => string | undefined
  readonly panel: () => HTMLElement | null
  readonly open: () => boolean
  readonly visible: () => boolean
  readonly modal: () => boolean
  readonly callbacks: () => ReturnType<NonNullable<DialogResourceOptions['callbacks']>>
  readonly requestClose: () => void
  interactedOutside: boolean
  pointerOutside: boolean
  lastFocused: HTMLElement | undefined
}

interface DialogLifetime {
  readonly reconcile: () => void
  readonly restoreFocus: (destination: HTMLElement) => void
  readonly mount: (root: DialogOccurrence) => void
  readonly activate: (root: DialogOccurrence) => void
  readonly parentOf: (id: string) => string | undefined
  readonly unmount: (root: DialogOccurrence) => void
}

export const observeDialogRoot =
  (document: Document, options: DialogResourceOptions, lifetime: DialogLifetime) =>
  (element: Element, id: string) =>
    Stream.callback<DialogObservation>((queue) => {
      const emit = (message: DialogObservation): void => {
        Queue.offerUnsafe(queue, message)
      }

      return Effect.acquireRelease(
        Effect.sync(() => {
          const window = element.ownerDocument.defaultView

          if (window === null || !(element instanceof window.HTMLElement)) {
            throw new Error('Dialog requires its physical host')
          }

          const host = element

          const root: DialogOccurrence = {
            id,
            host,
            parentId: () => {
              const explicit = host.dataset.parentDialog

              return explicit === undefined || explicit === '' ? lifetime.parentOf(id) : explicit
            },
            panel: () => host.querySelector<HTMLElement>('[data-fluid-dialog-panel]'),
            open: () => host.dataset.state === 'open',
            visible: () => host.dataset.dialogPhase !== 'Closed',
            modal: () => host.dataset.dialogModal === 'true',
            callbacks: () => options.callbacks?.(id, host.dataset.callbacksId) ?? {},
            requestClose: () => {
              emit(DialogObservation.ObservedOpenIntent({ open: false }))
            },
            interactedOutside: false,
            pointerOutside: false,
            lastFocused: undefined,
          }

          let content: HTMLElement | null = null
          let focusScope: HTMLElement | null = null
          let contentRef: DialogCallbacks['contentRef']

          const synchronizeContent = () => {
            const panel = root.panel()
            const nextRef = root.callbacks().contentRef

            if (content === panel && contentRef === nextRef) {
              return
            }

            if (content !== null) {
              contentRef?.(null)
            }

            content = panel
            contentRef = nextRef

            if (content !== null) {
              focusScope = content
              contentRef?.(content)
            }
          }

          let active = false
          let previousFocus: HTMLElement | undefined
          let timeout: number | undefined
          let frame: number | undefined
          let closingGeneration: number | undefined

          const clear = () => {
            if (timeout !== undefined) {
              window.clearTimeout(timeout)
            }

            if (frame !== undefined) {
              window.cancelAnimationFrame(frame)
            }

            timeout = undefined
            frame = undefined
            closingGeneration = undefined
          }

          const release = () => {
            clear()

            if (!active) {
              return
            }

            active = false
            lifetime.reconcile()

            if (content !== null) {
              contentRef?.(null)
            }

            content = null
            contentRef = undefined
            const event = dialogLifecycleEvent('focusScope.autoFocusOnUnmount', null, focusScope)
            root.callbacks().onCloseAutoFocus?.(event)
            focusScope = null

            if (!event.defaultPrevented && (root.modal() || !root.interactedOutside)) {
              const selector = host.dataset.returnFocusSelector

              const destination =
                selector !== undefined && selector !== ''
                  ? document.querySelector<HTMLElement>(selector)
                  : (document.querySelector<HTMLElement>(
                      `[data-fluid-dialog-trigger="${CSS.escape(root.id)}"]`,
                    ) ?? previousFocus)

              if (destination?.isConnected === true) {
                lifetime.restoreFocus(destination)
              }
            }
          }

          const update = () => {
            const generation = Number(host.dataset.dialogGeneration ?? 0)

            if (root.visible()) {
              synchronizeContent()

              if (!active) {
                active = true
                lifetime.activate(root)
                previousFocus =
                  document.activeElement instanceof window.HTMLElement
                    ? document.activeElement
                    : undefined
                root.interactedOutside = false
                root.pointerOutside = false
                lifetime.reconcile()
                const panel = root.panel()
                const event = dialogLifecycleEvent('focusScope.autoFocusOnMount', null, panel)
                root.callbacks().onOpenAutoFocus?.(event)

                if (!event.defaultPrevented && panel !== null) {
                  const requested = dialogInitialFocus(panel, host.dataset.focusSelector)

                  const destination = requested ?? dialogFocusable(panel)[0] ?? panel
                  destination.focus({ preventScroll: true })
                  root.lastFocused = destination
                }
              }

              if (root.open() && closingGeneration !== undefined) {
                clear()
              }

              if (host.dataset.dialogPhase === 'Opening' && frame === undefined) {
                frame = window.requestAnimationFrame(() => {
                  frame = undefined
                  emit(DialogObservation.Entered({ generation }))
                })
              }

              if (host.dataset.dialogPhase === 'Closing' && closingGeneration !== generation) {
                clear()
                closingGeneration = generation
                timeout = window.setTimeout(() => {
                  emit(DialogObservation.CompletedExit({ generation }))
                }, exitFallbackMs(spring.slow))
              }
            } else if (active) {
              release()
              emit(DialogObservation.Released({ generation }))
            }

            lifetime.reconcile()
          }

          const motionComplete = (event: Event) => {
            if (
              event.target instanceof window.HTMLElement &&
              (Object.hasOwn(event.target.dataset, 'fluidDialogPanel') ||
                (root.panel() === null &&
                  Object.hasOwn(event.target.dataset, 'fluidDialogBackdrop'))) &&
              event.target.closest('dialog') === host &&
              event instanceof window.CustomEvent &&
              Schema.is(Schema.Natural)(event.detail)
            ) {
              const generation: unknown = event.detail

              if (Schema.is(Schema.Natural)(generation)) {
                emit(DialogObservation.CompletedExit({ generation }))
              }
            }
          }

          lifetime.mount(root)
          const observer = new window.MutationObserver(update)
          observer.observe(host, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: [
              'data-state',
              'data-dialog-phase',
              'data-dialog-generation',
              'data-dialog-modal',
              'data-callbacks-id',
            ],
          })
          host.addEventListener(DIALOG_MOTION_COMPLETE, motionComplete)
          update()

          return () => {
            observer.disconnect()
            host.removeEventListener(DIALOG_MOTION_COMPLETE, motionComplete)
            lifetime.unmount(root)
            release()
            lifetime.reconcile()
          }
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.flatMap(() => Effect.never))
    })
