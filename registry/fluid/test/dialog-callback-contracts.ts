import { DialogResourcesLayer, type DialogCallbacks } from '../src/dialog.js'

export function sourceDialogCallbackContracts(document: Document) {
  const callbacks: DialogCallbacks = {
    onPointerDownOutside: (event) => {
      if (event.detail.originalEvent.button === 2 && event.detail.originalEvent.clientX >= 0)
        event.preventDefault()
    },
    onFocusOutside: (event) => {
      if (event.detail.originalEvent.relatedTarget === null) event.preventDefault()
      // @ts-expect-error A FocusEvent cannot supply the pointer-only source contract.
      if (event.detail.originalEvent.pointerId === 0) event.preventDefault()
    },
  }
  return DialogResourcesLayer(document, { callbacks: () => callbacks })
}
