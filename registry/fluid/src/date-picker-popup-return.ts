import { constVoid } from 'effect/Function'
import type { PopupConfig } from './date-picker-popup-definition.js'
import { popupActiveElement, popupContains, popupTabbable } from './date-picker-popup-focus.js'

interface PopupFocusReturn {
  readonly element: HTMLElement
  readonly anchor: HTMLElement
  readonly previousFocus: Element | null
  readonly config: PopupConfig
  readonly anchorAvailable: boolean
  readonly preferPreviousFocus: boolean

  readonly preventReturn: boolean
  readonly keyboardClose: boolean
  readonly registration: {
    readonly contains: (target: Node) => boolean
    readonly fallbackFocus: () => Element | null
    readonly returnFocus: (restore: () => void) => void
  }
}

function popupReturnEligible(context: PopupFocusReturn, focused: Element | null): boolean {
  return (
    !context.preventReturn &&
    (focused === context.element.ownerDocument.body ||
      popupContains(context.element, focused) ||
      (focused !== null && context.registration.contains(focused)))
  )
}

// Capture eligibility before detaching the portal; restore after its original position is recovered.
export function preparePopupFocusReturn(context: PopupFocusReturn): () => void {
  const { element, anchor, previousFocus, registration, config } = context
  const document = element.ownerDocument
  const window = document.defaultView
  const focused = popupActiveElement(document)

  const previous =
    previousFocus !== null && previousFocus.isConnected && previousFocus.localName !== 'body'
      ? previousFocus
      : null

  const reference = anchor.isConnected ? anchor : null

  const returnElement =
    (context.preferPreviousFocus ? (previous ?? reference) : (reference ?? previous)) ??
    registration.fallbackFocus()

  const returnEligible = popupReturnEligible(context, focused)

  if (
    window === null ||
    !context.anchorAvailable ||
    config.kind !== 'trigger' ||
    !(returnElement instanceof window.HTMLElement) ||
    !returnEligible
  ) {
    return constVoid
  }

  const restore = () => {
    if (!returnElement.isConnected) {
      return
    }

    const target =
      returnElement.tabIndex >= 0
        ? returnElement
        : (popupTabbable(returnElement)[0] ?? returnElement)

    const focusOptions = context.keyboardClose
      ? { preventScroll: true, focusVisible: true }
      : { preventScroll: true }

    target.focus(focusOptions)
  }

  return () => {
    registration.returnFocus(restore)
  }
}
