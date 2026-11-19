import { Context, Layer } from 'effect'
import { popupActiveElement, popupContains } from './date-picker-popup-focus.js'

interface PopupOccurrence {
  readonly element: HTMLElement

  parent: PopupOccurrence | undefined
}

export class PopupAuthority extends Context.Service<
  PopupAuthority,
  {
    readonly register: (
      element: HTMLElement,
      anchor: HTMLElement,
    ) => {
      readonly rebindAnchor: (anchor: HTMLElement) => void
      readonly dismissalEligible: () => boolean
      readonly contains: (target: Node) => boolean
      readonly previousFocus: Element | null
      readonly fallbackFocus: () => Element | null
      readonly returnFocus: (restore: () => void) => void
      readonly release: () => void
    }
  }
>()('FluidDatePickerPopupAuthority') {}

export const PopupAuthorityLayer = Layer.sync(PopupAuthority, () => {
  const documents = new WeakMap<Document, Array<PopupOccurrence>>()
  const histories = new WeakMap<Document, Array<WeakRef<Element>>>()
  const pendingReturns = new WeakMap<HTMLElement, object>()

  return PopupAuthority.of({
    register: (element, anchor) => {
      const document = element.ownerDocument
      let returnAnchor = anchor
      pendingReturns.delete(anchor)
      const active = popupActiveElement(document)
      const previousFocus = active && popupContains(element, active) ? null : active
      const history = (histories.get(document) ?? []).filter((entry) => entry.deref()?.isConnected)

      if (previousFocus && previousFocus.localName !== 'body')
        history.push(new WeakRef(previousFocus))
      histories.set(document, history.slice(-20))
      const entries = documents.get(document) ?? []

      const occurrence: PopupOccurrence = {
        element,
        parent: entries.findLast((entry) => popupContains(entry.element, anchor)),
      }

      entries.push(occurrence)
      documents.set(document, entries)

      return {
        previousFocus,
        rebindAnchor: (nextAnchor) => {
          pendingReturns.delete(returnAnchor)
          returnAnchor = nextAnchor
          pendingReturns.delete(returnAnchor)
          occurrence.parent = entries.findLast((entry) => {
            if (entry === occurrence || !popupContains(entry.element, nextAnchor)) return false

            for (let owner: PopupOccurrence | undefined = entry; owner; owner = owner.parent)
              if (owner === occurrence) return false

            return true
          })
        },
        fallbackFocus: () => {
          const retained = (histories.get(document) ?? []).filter(
            (entry) => entry.deref()?.isConnected,
          )

          histories.set(document, retained)

          return retained.at(-1)?.deref() ?? null
        },
        returnFocus: (restore) => {
          const job = {}
          const targetAnchor = returnAnchor
          pendingReturns.set(targetAnchor, job)
          document.defaultView?.queueMicrotask(() => {
            if (pendingReturns.get(targetAnchor) !== job) return
            pendingReturns.delete(targetAnchor)
            restore()
          })
        },
        dismissalEligible: () =>
          element.getAttribute('data-popup-anchor-state') !== 'missing' &&
          !entries.some((entry) => {
            if (
              entry === occurrence ||
              entry.element.getAttribute('data-popup-anchor-state') === 'missing' ||
              entry.element.getAttribute('data-popup-open') !== 'true'
            )
              return false

            for (let owner = entry.parent; owner; owner = owner.parent)
              if (owner === occurrence) return true

            return false
          }),
        contains: (target) =>
          entries.some((entry) => {
            if (!popupContains(entry.element, target)) return false

            for (let owner: PopupOccurrence | undefined = entry; owner; owner = owner.parent)
              if (owner === occurrence) return true

            return false
          }),
        release: () => {
          const index = entries.indexOf(occurrence)

          if (index !== -1) entries.splice(index, 1)
        },
      }
    },
  })
})
