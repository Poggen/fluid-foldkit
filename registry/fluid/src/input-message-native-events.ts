import { Option, Schema } from 'effect'
import { messageKeyIntent } from './input-message-domain.js'
import type { MessageKeyState } from './input-message-domain.js'
import { InputMessageObservation } from './input-message-state.js'
import type { InputMessageResourceObservation } from './input-message-state.js'

const KeyState = Schema.Struct({
  value: Schema.String,
  history: Schema.Array(Schema.String),
  historyIndex: Schema.NullOr(Schema.Natural),
  draftBeforeHistory: Schema.String,
  suggestions: Schema.Array(Schema.String),
  activeSuggestion: Schema.NullOr(Schema.Natural),
  placeholderSuggestion: Schema.NullOr(Schema.String),
})
const Json = Schema.fromJsonString(KeyState)
const encode = Schema.encodeSync(Json)
const decode = Schema.decodeUnknownOption(Json)

export const encodeMessageKeyState = (state: MessageKeyState) =>
  encode({
    value: state.value,
    history: state.history,
    historyIndex: state.historyIndex,
    draftBeforeHistory: state.draftBeforeHistory,
    suggestions: state.suggestions,
    activeSuggestion: state.activeSuggestion,
    placeholderSuggestion: state.placeholderSuggestion,
  })

/** The existing composer mount owns these listeners, not the Tooltip trigger mount. */
export function observeInputMessageNativeEvents(
  composer: Element,
  window: Window & typeof globalThis,
  emit: (observation: InputMessageResourceObservation) => void,
) {
  const releases = new Map<Element, () => void>()
  const overriddenInputs = new Set<HTMLInputElement>()
  let live = true
  const belongs = (element: Element) => element.closest('[data-im-composer]') === composer
  const refresh = () => {
    const elements = new Set(
      Array.from(
        composer.querySelectorAll(
          '[data-im-textarea], [data-im-file-picker], [data-im-stop-pointer]',
        ),
      ).filter(belongs),
    )
    for (const [element, release] of releases) {
      if (!elements.has(element)) {
        release()
        releases.delete(element)
      }
    }
    for (const element of elements) {
      if (releases.has(element)) continue
      const keydown = (event: Event) => {
        if (
          !(event instanceof window.KeyboardEvent) ||
          !(element instanceof window.HTMLTextAreaElement)
        )
          return
        const state = decode(composer.getAttribute('data-im-key-state'))
        if (Option.isNone(state)) return
        const key = {
          key: event.key,
          composing: event.isComposing,
          shift: event.shiftKey,
          alt: event.altKey,
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          selectionStart: element.selectionStart,
          selectionEnd: element.selectionEnd,
        }

        if (messageKeyIntent(state.value, key).kind !== 'Native') event.preventDefault()
        emit(InputMessageObservation.CapturedKey(key))
      }
      const focus = () => {
        if (element instanceof window.HTMLTextAreaElement) {
          emit(
            InputMessageObservation.CapturedFocus({ visible: element.matches(':focus-visible') }),
          )
        }
      }
      const pointerdown = (event: Event) => {
        if (element.hasAttribute('data-im-stop-pointer')) event.stopPropagation()
      }
      const click = () => {
        if (!element.hasAttribute('data-im-file-picker')) return
        const input = composer.querySelector('input[type=file]')
        if (!(input instanceof window.HTMLInputElement)) return
        const override = element.getAttribute('data-im-file-accept')
        const overridden = override !== null && override !== ''
        if (overridden) {
          input.accept = override
          overriddenInputs.add(input)
        }

        input.click()
        if (overridden) {
          window.queueMicrotask(() => {
            if (!live) return
            overriddenInputs.delete(input)
            if (!composer.contains(input)) return
            const accepted = composer.getAttribute('data-im-accept')
            if (accepted !== null) input.accept = accepted
          })
        }
      }
      element.addEventListener('keydown', keydown)
      element.addEventListener('focus', focus)
      element.addEventListener('pointerdown', pointerdown)
      element.addEventListener('click', click)
      releases.set(element, () => {
        element.removeEventListener('keydown', keydown)
        element.removeEventListener('focus', focus)
        element.removeEventListener('pointerdown', pointerdown)
        element.removeEventListener('click', click)
      })
    }
  }
  refresh()
  return {
    refresh,
    dispose: () => {
      live = false
      const accepted = composer.getAttribute('data-im-accept')
      if (accepted !== null) {
        for (const input of overriddenInputs) input.accept = accepted
      }
      overriddenInputs.clear()
      for (const release of releases.values()) release()
      releases.clear()
    },
  }
}
