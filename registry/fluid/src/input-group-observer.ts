/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
export function mountInputContainer(element: Element, publish: (focused: boolean) => void) {
  const input = element.querySelector('input')
  const container = element.querySelector('[data-slot=input-container]')

  if (!(input instanceof HTMLInputElement) || container === null) {
    throw new Error('Fluid InputField requires its input and container')
  }

  const observeFocus = (event: FocusEvent) => {
    publish(event.type === 'focus')
  }

  const down = (event: Event) => {
    if (event.target !== input) {
      event.preventDefault()
      input.focus()
    }
  }

  input.addEventListener('focus', observeFocus)
  input.addEventListener('blur', observeFocus)
  container.addEventListener('mousedown', down)

  return () => {
    input.removeEventListener('focus', observeFocus)
    input.removeEventListener('blur', observeFocus)
    container.removeEventListener('mousedown', down)
  }
}
