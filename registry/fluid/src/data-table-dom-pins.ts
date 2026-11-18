import { Schema } from 'effect'
import { HIGHLIGHT_FRAME_EVENT, HighlightBox } from './highlight-frame.js'

export function observeDataTablePinnedHighlights(root: Element): () => void {
  const frame = (event: Event) => {
    if (
      !(event instanceof CustomEvent) ||
      !Schema.is(HighlightBox)(event.detail) ||
      !(event.target instanceof Element) ||
      !event.target.classList.contains('table-row-highlight')
    )
      return
    const origin = event.target.parentElement?.getBoundingClientRect()
    if (!origin) return
    const { y, height, opacity } = event.detail
    for (const mirror of root.querySelectorAll<HTMLElement>('[data-grid-pin-hover]')) {
      const cell = mirror.closest('td')
      if (!cell) continue
      const top = y - (cell.getBoundingClientRect().top - origin.top)
      mirror.style.transform = `translateY(${top}px)`
      mirror.style.height = `${height}px`
      mirror.style.opacity = String(opacity)
    }
  }
  root.addEventListener(HIGHLIGHT_FRAME_EVENT, frame)
  return () => root.removeEventListener(HIGHLIGHT_FRAME_EVENT, frame)
}
