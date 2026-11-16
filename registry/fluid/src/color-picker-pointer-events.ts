import { ColorObservation } from './color-picker-observation.js'
import { colorField, colorFieldChannel } from './color-picker-scrub-lifetime.js'
import type { Channel } from './color-picker-state.js'

type PointerPhase = 'down' | 'move' | 'up' | 'cancel'

export function colorSquarePointer(
  element: Element,
  event: PointerEvent,
  phase: PointerPhase,
  send: (message: typeof ColorObservation.Type) => void,
) {
  const square =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-color-square]')
      : null

  if (square === null || !element.contains(square)) {
    return false
  }

  if (phase === 'down') {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return true
    }

    event.preventDefault()
    square.setPointerCapture(event.pointerId)
  }

  const rect = square.getBoundingClientRect()
  send(
    ColorObservation.SquarePointer({
      phase,
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }),
  )

  return true
}

export function colorScrubTarget(event: PointerEvent, phase: PointerPhase) {
  const wrapper = colorField(event)
  const channel = colorFieldChannel(event)

  if (
    phase !== 'down' ||
    wrapper === null ||
    channel === undefined ||
    channel === 'hex' ||
    event.button !== 0 ||
    wrapper.dataset.editing === 'true' ||
    event.defaultPrevented
  ) {
    return null
  }

  return { wrapper, channel }
}

export function colorScrubMove(event: PointerEvent, document: Document, win: Window) {
  return ColorObservation.ScrubMove({
    pointer: event.pointerId,
    x: event.clientX,
    movement: event.movementX,
    locked: document.pointerLockElement !== null,
    shift: event.shiftKey,
    alt: event.altKey,
    movementY: event.movementY,
    left: win.visualViewport?.offsetLeft ?? 0,
    top: win.visualViewport?.offsetTop ?? 0,
    right:
      (win.visualViewport?.offsetLeft ?? 0) +
      (win.visualViewport?.width ?? document.documentElement.clientWidth),
    bottom:
      (win.visualViewport?.offsetTop ?? 0) +
      (win.visualViewport?.height ?? document.documentElement.clientHeight),
    scale: win.visualViewport?.scale ?? 1,
  })
}

export const colorFieldStepKey = (channel: Channel, key: string) =>
  channel !== 'hex' &&
  (['ArrowUp', 'ArrowDown'].includes(key) ||
    (!['hSL', 'H'].includes(channel) && ['Home', 'End'].includes(key)))
