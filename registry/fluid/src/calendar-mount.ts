export const listenCalendarKeyboard: (
  element: HTMLElement,
  autoFocus: boolean,
  emit: () => void,
) => () => void = function listenCalendarKeyboard(
  element: HTMLElement,
  autoFocus: boolean,
  emit: () => void,
) {
  const window = element.ownerDocument.defaultView

  const keydown = (event: Event) => {
    if (window === null || !(event instanceof window.KeyboardEvent)) {
      return
    }
    const { target } = event

    if (
      target instanceof window.Element &&
      target.closest('[data-calendar-button]') !== null &&
      navigationKeys.has(event.key)
    ) {
      event.preventDefault()
    }

    if (
      event.key === 'Escape' &&
      element instanceof window.HTMLElement &&
      element.dataset.calendarPicking === 'true'
    ) {
      event.stopPropagation()
      emit()
    }
  }

  element.addEventListener('keydown', keydown)

  if (autoFocus) {
    element.querySelector<HTMLElement>('[data-calendar-button][tabindex="0"]')?.focus()
  }

  return () => {
    element.removeEventListener('keydown', keydown)
  }
}

const navigationKeys = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
])
