import { Effect, FiberSet, Queue, Stream } from 'effect'
import type { ColorNumberEnvironment } from './color-number-locale.js'
import { ColorObservation } from './color-picker-observation.js'
import { colorPickerPointerListeners } from './color-picker-pointer-listeners.js'
import { colorPickerFieldListeners } from './color-picker-field-listeners.js'

export function observeColorPicker(
  element: Element,
  changes: Stream.Stream<'Live' | 'Paused'>,
  numbers: ColorNumberEnvironment,
) {
  return changes.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<typeof ColorObservation.Type>((queue) => {
            const send = (message: typeof ColorObservation.Type) => {
              Queue.offerUnsafe(queue, message)
            }

            return FiberSet.makeRuntime().pipe(
              Effect.flatMap((run) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    if (!(element instanceof HTMLElement)) {
                      throw new Error('ColorPicker requires HTMLElement')
                    }

                    const document = element.ownerDocument
                    const win = document.defaultView

                    if (!win) {
                      throw new Error('ColorPicker requires browsing context')
                    }

                    const pointer = colorPickerPointerListeners(element, win, send, run)
                    const fields = colorPickerFieldListeners(numbers, send, pointer.isScrubFocus)

                    const square = element.querySelector<HTMLElement>('[data-color-square]')

                    const enter = () => {
                      send(ColorObservation.SquareHover({ hovered: true }))
                    }

                    const leave = () => {
                      send(ColorObservation.SquareHover({ hovered: false }))
                    }

                    let pressed = false
                    const press = (e: MouseEvent) => {
                      if (e.button === 0 && !pressed) {
                        pressed = true
                        send(ColorObservation.Pressed({ pressed: true }))
                      }
                    }

                    const release = () => {
                      if (!pressed) return
                      pressed = false
                      send(ColorObservation.Pressed({ pressed: false }))
                    }

                    square?.addEventListener('pointerenter', enter)
                    square?.addEventListener('pointerleave', leave)
                    document.addEventListener('pointerlockchange', pointer.lock)
                    document.addEventListener('pointerlockerror', pointer.lock)
                    element.addEventListener('pointerdown', pointer.down)
                    element.addEventListener('click', pointer.click)
                    win.addEventListener('pointermove', pointer.move, { passive: false })
                    win.addEventListener('pointerup', pointer.up)
                    win.addEventListener('pointercancel', pointer.cancel)
                    element.addEventListener('input', fields.input)
                    element.addEventListener('paste', fields.paste)
                    element.addEventListener('focusin', fields.focus)
                    element.addEventListener('focusout', fields.blur)
                    element.addEventListener('keydown', fields.key)
                    element.addEventListener('change', fields.change)
                    element.addEventListener('mousedown', press)
                    win.addEventListener('mouseup', release)
                    send(
                      ColorObservation.Mounted({
                        supported: 'EyeDropper' in win,
                        numberDisplay: numbers.display,
                      }),
                    )

                    return () => {
                      square?.removeEventListener('pointerenter', enter)
                      square?.removeEventListener('pointerleave', leave)
                      document.removeEventListener('pointerlockchange', pointer.lock)
                      document.removeEventListener('pointerlockerror', pointer.lock)
                      element.removeEventListener('pointerdown', pointer.down)
                      element.removeEventListener('click', pointer.click)
                      pointer.dispose()
                      win.removeEventListener('pointermove', pointer.move)
                      win.removeEventListener('pointerup', pointer.up)
                      win.removeEventListener('pointercancel', pointer.cancel)
                      element.removeEventListener('input', fields.input)
                      element.removeEventListener('paste', fields.paste)
                      element.removeEventListener('focusin', fields.focus)
                      element.removeEventListener('focusout', fields.blur)
                      element.removeEventListener('keydown', fields.key)
                      element.removeEventListener('change', fields.change)
                      element.removeEventListener('mousedown', press)
                      win.removeEventListener('mouseup', release)

                      if (
                        Object.hasOwn(element.dataset, 'colorScrubbing') &&
                        document.pointerLockElement
                      ) {
                        document.exitPointerLock()
                      }
                    }
                  }),
                  (dispose) => Effect.sync(dispose),
                ).pipe(Effect.flatMap(() => Effect.never)),
              ),
            )
          })
        : Stream.never,
    ),
  )
}
