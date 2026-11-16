import type { Message, PopupConfig } from './date-picker-popup-definition.js'
import { virtualClick, virtualPointer } from './date-picker-popup-events.js'
import { popupActiveElement, popupContains, popupVisible } from './date-picker-popup-focus.js'

export function popupFocusHandlers({
  element,
  window,
  getAnchor,
  getConfig,
  isActive,
  isAnchorAvailable,
  registration,
  dismiss,
}: {
  readonly element: HTMLElement
  readonly window: Window & typeof globalThis
  readonly getAnchor: () => HTMLElement
  readonly getConfig: () => PopupConfig
  readonly isActive: () => boolean
  readonly isAnchorAvailable: () => boolean
  readonly registration: {
    readonly contains: (target: Node) => boolean
    readonly dismissalEligible: () => boolean
  }
  readonly dismiss: (reason: typeof Message.DismissRequested.Type.reason) => void
}) {
  const document = element.ownerDocument
  let preventReturn = false
  let keyboardClose = false

  let restoreFrame = 0
  let composing = false
  let compositionTimer = 0

  const inside = (target: EventTarget | null) =>
    target instanceof window.Node &&
    (registration.contains(target) ||
      popupContains(getAnchor(), target) ||
      (target instanceof window.HTMLElement &&
        (target.dataset.popupFocusGuard ?? null) === getConfig().id))

  const focus = (event: FocusEvent) => {
    if (
      !isAnchorAvailable() ||
      !getAnchor().isConnected ||
      (element.dataset.popupOpen ?? null) !== 'true' ||
      inside(event.target)
    ) {
      return
    }

    keyboardClose = false

    dismiss('focus')
  }

  const lostFocus = (event: FocusEvent) => {
    if (!isAnchorAvailable() || !getAnchor().isConnected) {
      return
    }

    const { target } = event
    window.queueMicrotask(() => {
      if (
        !isActive() ||
        !isAnchorAvailable() ||
        !getAnchor().isConnected ||
        !registration.dismissalEligible() ||
        !(target instanceof window.Element)
      ) {
        return
      }

      const invisible = !target.isConnected || !popupVisible(target)

      if (invisible && popupActiveElement(document) === document.body) {
        element.focus({ preventScroll: true })
        window.cancelAnimationFrame(restoreFrame)
        restoreFrame = window.requestAnimationFrame(() => {
          if (isActive() && isAnchorAvailable() && getAnchor().isConnected) {
            element.focus({ preventScroll: true })
          }
        })
      }
    })
  }

  const compositionStart = () => {
    window.clearTimeout(compositionTimer)
    composing = true
  }

  const compositionEnd = () => {
    composing = true
    window.clearTimeout(compositionTimer)
    compositionTimer = window.setTimeout(
      () => {
        composing = false
      },
      window.CSS?.supports?.('-webkit-backdrop-filter:none') ? 5 : 0,
    )
  }

  const key = (event: KeyboardEvent) => {
    if (
      !isAnchorAvailable() ||
      !getAnchor().isConnected ||
      event.key !== 'Escape' ||
      !registration.dismissalEligible()
    ) {
      return
    }

    if ((element.dataset.popupOpen ?? null) !== 'true') {
      return
    }

    if (composing || event.isComposing) {
      return
    }

    {
      keyboardClose = true
      event.stopPropagation()
    }

    if ((element.dataset.popupEscapeBlocked ?? null) === 'true') {
      event.preventDefault()

      return
    }

    event.preventDefault()
    dismiss('escape')
  }

  const pointerDismissal = (event: MouseEvent | TouchEvent) => {
    {
      const virtual = virtualClick(event, window) || virtualPointer(event, window)
      keyboardClose =
        event instanceof window.MouseEvent &&
        !(event instanceof window.PointerEvent && event.pointerType) &&
        event.detail === 0
      let supportsPreventScroll = false
      document.createElement('div').focus({
        get preventScroll() {
          supportsPreventScroll = true

          return false
        },
      })
      preventReturn = !virtual && !supportsPreventScroll
    }

    dismiss('pointer')
  }

  return {
    inside,
    focus,
    lostFocus,
    key,
    compositionStart,
    compositionEnd,
    pointerDismissal,
    preventReturn: () => {
      preventReturn = true
    },
    returnPolicy: () => ({ preventReturn, keyboardClose }),
    cancelRestoreFrame: () => window.cancelAnimationFrame(restoreFrame),
    clearCompositionTimer: () => window.clearTimeout(compositionTimer),
  }
}
