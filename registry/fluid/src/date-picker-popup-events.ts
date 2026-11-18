import { Data, Option, Schema } from 'effect'
import type { Message } from './date-picker-popup-definition.js'
/* @license Frozen Base UI event.mjs predicates (MIT); these distinguish assistive */

export const virtualClick: (
  event: MouseEvent | TouchEvent,
  window: Window & typeof globalThis,
) => boolean = function virtualClick(
  event: MouseEvent | TouchEvent,
  window: Window & typeof globalThis,
) {
  if (!(event instanceof window.MouseEvent)) {
    return false
  }

  const pointerType = event instanceof window.PointerEvent ? event.pointerType : undefined

  if (pointerType === '' && event.isTrusted) {
    return true
  }

  if (
    /Android/iu.test(window.navigator.userAgent) &&
    pointerType !== undefined &&
    pointerType !== ''
  ) {
    return event.type === 'click' && event.buttons === 1
  }

  return event.detail === 0 && (pointerType === undefined || pointerType === '')
}

export const virtualPointer: (
  event: MouseEvent | TouchEvent,
  window: Window & typeof globalThis,
) => boolean = function virtualPointer(
  event: MouseEvent | TouchEvent,
  window: Window & typeof globalThis,
) {
  if (!(event instanceof window.PointerEvent)) {
    return false
  }

  const android = /Android/iu.test(window.navigator.userAgent)

  return (
    (!android && event.width === 0 && event.height === 0) ||
    (event.type === 'pointerdown' &&
      event.width === 1 &&
      event.height === 1 &&
      event.pressure === 0 &&
      event.detail === 0 &&
      event.pointerType === 'mouse' &&
      (android || event.buttons === 0)) ||
    (event.width < 1 &&
      event.height < 1 &&
      event.pressure === 0 &&
      event.detail === 0 &&
      event.pointerType === 'touch')
  )
}

export const popupExitGeneration: (element: HTMLElement, event: Event) => number | null =
  function popupExitGeneration(element: HTMLElement, event: Event) {
    const window = element.ownerDocument.defaultView

    if (
      event.target !== element.querySelector('[data-popup-motion]') ||
      element.dataset.popupOpen === 'true' ||
      window === null ||
      !(event instanceof window.CustomEvent)
    ) {
      return null
    }

    return Option.getOrNull(Schema.decodeUnknownOption(Schema.Int)(event.detail))
  }

export type PopupObservation =
  | typeof Message.DismissRequested.Type
  | typeof Message.ExitFinished.Type

export type ResourceEvent =
  | { readonly _tag: 'Position' }
  | { readonly _tag: 'Message'; readonly message: PopupObservation }

export const ResourceEvents = Data.taggedEnum<ResourceEvent>()
