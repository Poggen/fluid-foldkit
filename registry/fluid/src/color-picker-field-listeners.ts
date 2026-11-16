import { validNumberInput, allowNumberKey, spliceNumberPaste } from './color-number-input.js'
import type { ColorNumberEnvironment } from './color-number-locale.js'
import { colorFieldStepKey } from './color-picker-pointer-events.js'
import { ColorObservation } from './color-picker-observation.js'
import { colorFieldChannel } from './color-picker-scrub-lifetime.js'

export function colorPickerFieldListeners(
  numbers: ColorNumberEnvironment,
  send: (message: typeof ColorObservation.Type) => void,
  isScrubFocus: () => boolean,
) {
  const input = (e: Event) => {
    if (e.defaultPrevented) {
      return
    }

    const ch = colorFieldChannel(e)

    if (ch && e.target instanceof HTMLInputElement && e.target.type !== 'number') {
      if (
        ch !== 'hex' &&
        !validNumberInput(
          e.target.value,
          numbers.allowed(ch === 'alphaPercent', ch === 'hSL' || ch === 'H'),
        )
      ) {
        e.target.value = e.target.dataset.colorDraft ?? ''

        return
      }

      send(ColorObservation.FieldDraft({ channel: ch, value: e.target.value }))
    }
  }

  const focus = (e: FocusEvent) => {
    if (e.target instanceof HTMLElement && Object.hasOwn(e.target.dataset, 'colorSquare')) {
      send(
        ColorObservation.SquareFocus({
          focused: e.target.matches(':focus-visible'),
        }),
      )
    }

    const ch = colorFieldChannel(e)

    if (ch && e.target instanceof HTMLInputElement && !isScrubFocus()) {
      e.target.select()
      send(ColorObservation.FieldFocus({ channel: ch }))
    }
  }

  const blur = (e: FocusEvent) => {
    if (e.target instanceof HTMLElement && Object.hasOwn(e.target.dataset, 'colorSquare')) {
      send(ColorObservation.SquareFocus({ focused: false }))
    }

    const ch = colorFieldChannel(e)

    if (ch && e.target instanceof HTMLInputElement) {
      send(
        ColorObservation.FieldBlur({
          channel: ch,
          value:
            ch === 'hex'
              ? e.target.value
              : String(
                  numbers.round(
                    numbers.parse(e.target.value, ch === 'alphaPercent') ?? Number.NaN,
                    ch === 'C' ? 2 : 0,
                  ),
                ),
        }),
      )
    }
  }

  const key = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && Object.hasOwn(e.target.dataset, 'colorSquare')) {
      if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        send(ColorObservation.SquareKey({ key: e.key, shift: e.shiftKey }))
      }

      return
    }

    const ch = colorFieldChannel(e)

    if (!ch) {
      return
    }

    if (e.key === 'Enter' || e.key === 'Escape') {
      send(
        ColorObservation.FieldKey({
          channel: ch,
          key: e.key,
          shift: e.shiftKey,
          alt: e.altKey,
        }),
      )

      return
    }

    if (
      e.defaultPrevented ||
      // eslint-disable-next-line typescript/no-deprecated -- Pinned Base UI uses which229 because Safari does not report isComposing for this IME path.
      e.which === 229 ||
      e.ctrlKey ||
      e.metaKey ||
      (e.altKey && !['ArrowUp', 'ArrowDown'].includes(e.key))
    ) {
      return
    }

    if (colorFieldStepKey(ch, e.key)) {
      e.preventDefault()
      send(
        ColorObservation.FieldKey({
          channel: ch,
          key: e.key,
          numeric:
            e.target instanceof HTMLInputElement
              ? (numbers.parse(e.target.value, ch === 'alphaPercent') ?? undefined)
              : undefined,
          shift: e.shiftKey,
          alt: e.altKey,
        }),
      )
    } else if (
      ch !== 'hex' &&
      e.target instanceof HTMLInputElement &&
      !allowNumberKey(
        e.key,
        e.target.value,
        e.target.selectionStart,
        e.target.selectionEnd,
        numbers.allowed(ch === 'alphaPercent', ch === 'hSL' || ch === 'H'),
        numbers.locales.default.decimal,
      )
    ) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const paste = (e: ClipboardEvent) => {
    const ch = colorFieldChannel(e)

    if (!ch || ch === 'hex' || e.defaultPrevented || !(e.target instanceof HTMLInputElement)) {
      return
    }

    let text: string

    try {
      text = e.clipboardData?.getData('text/plain') ?? ''
    } catch {
      return
    }

    e.preventDefault()

    const next = spliceNumberPaste(
      e.target.value,
      text,
      e.target.selectionStart,
      e.target.selectionEnd,
    )

    if (numbers.parse(next.value, ch === 'alphaPercent') === null) {
      return
    }

    e.target.value = next.value
    send(ColorObservation.FieldDraft({ channel: ch, value: next.value }))
    e.target.setSelectionRange(next.caret, next.caret)
  }

  const change = (e: Event) => {
    const ch = colorFieldChannel(e)

    if (
      !e.defaultPrevented &&
      ch &&
      e.target instanceof HTMLInputElement &&
      e.target.type === 'number' &&
      Number.isFinite(e.target.valueAsNumber)
    ) {
      send(
        ColorObservation.FieldAutofill({
          channel: ch,
          value: String(numbers.round(e.target.valueAsNumber, ch === 'C' ? 2 : 0)),
        }),
      )
    }
  }

  return { input, focus, blur, key, paste, change }
}
