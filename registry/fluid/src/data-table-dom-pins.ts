import { Schema } from 'effect'
import { HIGHLIGHT_FRAME_EVENT, HighlightBox } from './highlight-frame.js'

export function observeDataTablePinnedHighlights(root: Element): () => void {
  const frame = (event: Event) => {
    if (
      !(event instanceof CustomEvent) ||
      !Schema.is(HighlightBox)(event.detail) ||
      !(event.target instanceof HTMLElement) ||
      !event.target.classList.contains('table-row-highlight') ||
      event.target.closest('[data-fluid-data-table]') !== root
    )
      return
    const origin = event.target.offsetParent
    if (!(origin instanceof HTMLElement)) return
    const bounds = origin.getBoundingClientRect()
    const scale = bounds.height / origin.offsetHeight || 1
    const { y, height, opacity } = event.detail
    for (const mirror of root.querySelectorAll<HTMLElement>('[data-grid-pin-hover]')) {
      const cell = mirror.closest('td')
      if (!cell) continue
      const top = y - (cell.getBoundingClientRect().top - bounds.top) / scale
      mirror.style.transform = `translateY(${top}px)`
      mirror.style.height = `${height}px`
      mirror.style.opacity = String(opacity)
    }
  }
  root.addEventListener(HIGHLIGHT_FRAME_EVENT, frame)
  return () => root.removeEventListener(HIGHLIGHT_FRAME_EVENT, frame)
}
