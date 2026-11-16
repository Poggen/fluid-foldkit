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

export function listenCalendarKeyboard(
  element: HTMLElement,
  autoFocus: boolean,
  emit: () => void,
): () => void {
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
    // This listener runs at the root after the target day handler,
    // matching DayPicker's day fact followed by Fluid's Escape undo.

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
