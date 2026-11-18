import { Observation } from './observation.js'
import type { TriggerObservation } from './observation.js'

const activeElement: (document: Document) => Element | null = (document: Document) => {
  let element = document.activeElement
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement
  return element
}
export function observeTooltipFocus(
  document: Document,
  window: Window,
  element: HTMLElement,
  id: string,
  send: (message: TriggerObservation) => void,
) {
  let keyboardModality = true
  let blurTimer: number | undefined
  const platform = window.navigator.platform.toLowerCase()
  const ios =
    /^i(os$|p)/.test(platform) || (platform === 'macintel' && window.navigator.maxTouchPoints > 1)
  const macSafari =
    !ios && platform.startsWith('mac') && CSS.supports('-webkit-backdrop-filter:none')
  const key = () => {
    keyboardModality = true
  }
  const pointer = () => {
    keyboardModality = false
  }
  const focus = (event: FocusEvent) => {
    if (event.defaultPrevented || element.hasAttribute('disabled')) return
    const target = event.composedPath()[0] instanceof Element ? event.composedPath()[0] : element
    if (!(target instanceof Element)) return
    const visible =
      macSafari && event.relatedTarget === null
        ? keyboardModality ||
          target.matches('input,textarea,[contenteditable]:not([contenteditable="false"])')
        : target.matches(':focus-visible')
    send(Observation.Focused({ focusVisible: visible }))
  }
  const blur = (event: FocusEvent) => {
    if (event.defaultPrevented) return
    send(Observation.BlurStarted())
    if (blurTimer !== undefined) window.clearTimeout(blurTimer)

    const related = event.relatedTarget
    const guard =
      related instanceof Element &&
      related.hasAttribute('data-base-ui-focus-guard') &&
      related.getAttribute('data-type') === 'outside'
    blurTimer = window.setTimeout(() => {
      const active = activeElement(document)
      const popup = document.getElementById(`${id}-popup`)
      const within =
        active !== null && (element.contains(active) || popup?.contains(active) === true)
      send(
        Observation.Blurred({
          remainsInBranch: guard || within || (related === null && active === element),
        }),
      )
    }, 0)
  }
  const windowBlur = () => {
    if (activeElement(document) === element && element.dataset.state === 'closed')
      send(Observation.WindowBlurred())
  }
  element.addEventListener('focusin', focus)
  element.addEventListener('focusout', blur)
  window.addEventListener('blur', windowBlur)
  if (macSafari) {
    window.addEventListener('keydown', key, true)
    window.addEventListener('pointerdown', pointer, true)
  }
  return () => {
    if (blurTimer !== undefined) window.clearTimeout(blurTimer)
    element.removeEventListener('focusin', focus)
    element.removeEventListener('focusout', blur)
    window.removeEventListener('blur', windowBlur)
    window.removeEventListener('keydown', key, true)
    window.removeEventListener('pointerdown', pointer, true)
  }
}
