export function observeCommandMenuTabs(
  element: Element,
  inputId: string,
  move: (direction: 'left' | 'right') => void,
) {
  const window = element.ownerDocument.defaultView
  if (!window) return () => {}
  const keydown = (event: KeyboardEvent) => {
    if (
      !(event.target instanceof window.HTMLElement) ||
      event.target.id !== inputId ||
      event.isComposing ||
      event.keyCode === 229 ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    move(event.key === 'ArrowLeft' ? 'left' : 'right')
  }
  element.ownerDocument.addEventListener('keydown', keydown)
  return () => {
    element.ownerDocument.removeEventListener('keydown', keydown)
  }
}
