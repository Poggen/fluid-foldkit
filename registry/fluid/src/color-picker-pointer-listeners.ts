import { Effect, Function } from 'effect'
import {
  colorSquarePointer,
  colorScrubTarget,
  colorScrubMove,
} from './color-picker-pointer-events.js'
import { ColorObservation } from './color-picker-observation.js'
import { colorScrubLifetime, colorField } from './color-picker-scrub-lifetime.js'

export function colorPickerPointerListeners(
  element: HTMLElement,
  win: Window & typeof globalThis,
  send: (message: typeof ColorObservation.Type) => void,
  run: (effect: Effect.Effect<void>) => void,
) {
  const document = element.ownerDocument
  let scrubFocus = false

  const scrub = colorScrubLifetime(document, win, (event, cancelled) => {
    send(ColorObservation.ScrubUp({ pointer: event.pointerId, cancelled }))
  })

  const pointer = (event: PointerEvent, phase: 'down' | 'move' | 'up' | 'cancel') => {
    if (colorSquarePointer(element, event, phase, send)) {
      return
    }

    const target = colorScrubTarget(event, phase)

    if (target !== null) {
      const { wrapper, channel: ch } = target

      if (event.pointerType === 'mouse') {
        event.preventDefault()
        const input = wrapper.querySelector('input')

        if (input !== null) {
          scrubFocus = true

          try {
            input.setSelectionRange(input.value.length, input.value.length)
            input.focus()
          } finally {
            scrubFocus = false
          }
        }
      }

      scrub.start(event, wrapper.querySelector('input'))
      wrapper.setPointerCapture(event.pointerId)
      send(
        ColorObservation.ScrubDown({
          channel: ch,
          pointer: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          scale: win.visualViewport?.scale ?? 1,
          cursor:
            event.pointerType !== 'touch' && !win.CSS.supports('-webkit-backdrop-filter:none'),
          pointerType: event.pointerType,
        }),
      )

      if (event.pointerType !== 'touch' && !win.CSS.supports('-webkit-backdrop-filter:none')) {
        try {
          const promise = document.body.requestPointerLock()
          run(Effect.tryPromise(Function.constant(promise)).pipe(Effect.ignore))
        } catch {
          send(ColorObservation.ScrubLock({ locked: false }))
        }
      }
    } else if (phase === 'move') {
      scrub.move(event)
      send(colorScrubMove(event, document, win))
    } else if (phase === 'up' || phase === 'cancel') {
      scrub.release(event, phase === 'cancel')

      const wrapper = colorField(event)

      if (wrapper?.hasPointerCapture(event.pointerId) === true) {
        wrapper.releasePointerCapture(event.pointerId)
      }
    }
  }

  const click = (event: MouseEvent) => {
    scrubFocus = true

    try {
      const ch = scrub.click(event)

      if (ch !== null) {
        send(ColorObservation.FieldFocus({ channel: ch }))
      }
    } finally {
      scrubFocus = false
    }
  }

  const lock = () => {
    send(
      ColorObservation.ScrubLock({
        locked: document.pointerLockElement !== null,
      }),
    )
  }

  const down = (e: PointerEvent) => {
    pointer(e, 'down')
  }

  const move = (e: PointerEvent) => {
    if (Object.hasOwn(element.dataset, 'colorScrubbing')) {
      if (e.buttons % 2 === 0) {
        pointer(e, 'cancel')
      } else {
        e.preventDefault()
        pointer(e, 'move')
      }
    } else if (e.target instanceof Node && element.contains(e.target)) {
      pointer(e, 'move')
    }
  }

  const up = (e: PointerEvent) => {
    pointer(e, 'up')
  }

  const cancel = (e: PointerEvent) => {
    pointer(e, 'cancel')
  }

  return {
    down,
    move,
    up,
    cancel,
    click,
    lock,
    isScrubFocus: () => scrubFocus,
    dispose: () => scrub.dispose(),
  }
}
