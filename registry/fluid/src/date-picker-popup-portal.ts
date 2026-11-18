import type { PopupConfig } from './date-picker-popup-definition.js'

export const findPopupAnchor: (document: Document, config: PopupConfig) => HTMLElement | null =
  function findPopupAnchor(document: Document, config: PopupConfig) {
    const window = document.defaultView

    if (window === null) {
      return null
    }

    return (
      document.querySelector<HTMLElement>(
        `[data-date-picker-anchor="${window.CSS.escape(config.anchorId)}"]`,
      ) ?? document.querySelector<HTMLElement>(`#${window.CSS.escape(config.anchorId)}`)
    )
  }

export function mountPopupPortal(
  element: HTMLElement,
  config: PopupConfig,
  destination: HTMLElement,
) {
  const document = element.ownerDocument
  const window = document.defaultView

  if (window === null) {
    throw new Error('DatePicker portal requires a live document')
  }

  const originalParent = element.parentNode
  const originalNext = element.nextSibling
  const portal = document.createElement('div')
  portal.dataset.datePickerPortal = config.id
  destination.append(portal)
  portal.append(element)
  element.classList.add(
    'left-0',
    'top-0',
    '[position:var(--popup-position,fixed)]',
    '[transform:var(--popup-transform)]',
    '[opacity:var(--popup-opacity,0)]',
    '[will-change:var(--popup-will-change,auto)]',
  )
  element.style.setProperty('--popup-position', 'fixed')

  {
    element.style.setProperty('--popup-available-height', '100vh')
    element.style.setProperty('--popup-available-width', '100vw')
  }

  element.style.setProperty('--popup-opacity', '0')

  return {
    portal,
    restore: () => {
      if (originalParent !== null && originalParent.isConnected) {
        if (originalNext !== null && originalNext.parentNode === originalParent) {
          originalNext.before(element)
        } else if (
          originalParent instanceof window.Element ||
          originalParent instanceof window.Document ||
          originalParent instanceof window.DocumentFragment
        ) {
          originalParent.append(element)
        }
      } else {
        element.remove()
      }

      portal.remove()
    },
  }
}
