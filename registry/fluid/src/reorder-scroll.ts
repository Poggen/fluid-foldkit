/* @license Derived from Motion 14.1.0 Reorder auto-scroll. MIT, copyright Framer B.V. */
import type { ReorderAxis } from './reorder-order.js'

export function createReorderScroll() {
  const limits = new Map<HTMLElement, number>()
  const edges = new Map<HTMLElement, 'start' | 'end'>()
  return {
    reset() {
      limits.clear()
      edges.clear()
    },
    move(group: HTMLElement, pointer: number, axis: ReorderAxis, velocity: number) {
      const window = group.ownerDocument.defaultView
      if (!window) return
      const document = group.ownerDocument
      let ancestor = group.parentElement
      while (ancestor) {
        const style = window.getComputedStyle(ancestor)
        const overflow = axis === 'x' ? style.overflowX : style.overflowY
        if (
          ['auto', 'scroll'].includes(overflow) ||
          ancestor === document.body ||
          ancestor === document.documentElement
        )
          break
        ancestor = ancestor.parentElement
      }
      if (!ancestor) return
      const rect = ancestor.getBoundingClientRect()
      const position = pointer - (axis === 'x' ? window.scrollX : window.scrollY)
      const start = axis === 'x' ? Math.max(0, rect.left) : Math.max(0, rect.top)
      const end =
        axis === 'x'
          ? Math.min(window.innerWidth, rect.right)
          : Math.min(window.innerHeight, rect.bottom)
      const fromStart = position - start
      const fromEnd = end - position
      const edge = fromStart < 50 ? 'start' : fromEnd < 50 ? 'end' : null
      if (!edge) {
        limits.delete(ancestor)
        edges.delete(ancestor)
        return
      }
      const intensity = 1 - (edge === 'start' ? fromStart : fromEnd) / 50
      const amount = (edge === 'start' ? -25 : 25) * intensity * intensity
      const documentScroll = ancestor === document.body || ancestor === document.documentElement
      if (edges.get(ancestor) !== edge) {
        if (!(edge === 'start' ? velocity < 0 : velocity > 0)) return
        edges.set(ancestor, edge)
        limits.set(
          ancestor,
          axis === 'x'
            ? ancestor.scrollWidth - (documentScroll ? window.innerWidth : ancestor.clientWidth)
            : ancestor.scrollHeight - (documentScroll ? window.innerHeight : ancestor.clientHeight),
        )
      }
      const current =
        axis === 'x'
          ? documentScroll
            ? window.scrollX
            : ancestor.scrollLeft
          : documentScroll
            ? window.scrollY
            : ancestor.scrollTop
      const limit = limits.get(ancestor)
      if (amount > 0 && limit !== undefined && current >= limit) return
      if (axis === 'x') {
        if (documentScroll) window.scrollBy({ left: amount })
        else ancestor.scrollLeft += amount
      } else {
        if (documentScroll) window.scrollBy({ top: amount })
        else ancestor.scrollTop += amount
      }
    },
  }
}
