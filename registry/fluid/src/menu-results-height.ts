/** Keep the last visible result area while a filter has no matches. */
export function observeMenuResultsHeight(
  root: HTMLElement,
  rowSelector: string,
  source: 'list' | 'surface' = 'list',
): () => void {
  const window = root.ownerDocument.defaultView
  if (!window) return () => {}
  let height = 0
  let retainedList: HTMLElement | null = null
  const surface = root.querySelector<HTMLElement>('[data-combo-surface]')
  const measure = () => {
    const first = root.querySelector<HTMLElement>(rowSelector)
    const empty = root.querySelector<HTMLElement>('[data-fluid-empty-results]')
    const list = (first ?? empty)?.closest<HTMLElement>('[data-fluid-hover-root]')
    if (!list) return
    retainedList = list
    if (empty) {
      if (height > 0) {
        list.classList.add('[min-height:var(--menu-retained-height)]')
        list.style.setProperty('--menu-retained-height', `${height}px`)
        empty.classList.add('min-h-0', 'flex-1')
        if (source === 'surface' && surface) {
          surface.classList.add('[min-height:var(--menu-retained-height)]')
          surface.style.setProperty('--menu-retained-height', `${height}px`)
        }
      }
      return
    }
    list.style.removeProperty('--menu-retained-height')
    list.classList.remove('[min-height:var(--menu-retained-height)]')
    if (surface) {
      surface.style.removeProperty('--menu-retained-height')
      surface.classList.remove('[min-height:var(--menu-retained-height)]')
    }
    const viewport = list.closest<HTMLElement>('[data-slot=scroll-area-viewport]')
    height =
      source === 'surface' && surface
        ? surface.offsetHeight
        : Math.min(list.offsetHeight, viewport?.clientHeight ?? Infinity)
  }
  const resize = new window.ResizeObserver(measure)
  resize.observe(root)
  const mutation = new window.MutationObserver(measure)
  mutation.observe(root, { subtree: true, childList: true })
  measure()
  return () => {
    resize.disconnect()
    mutation.disconnect()
    if (retainedList) {
      retainedList.style.removeProperty('--menu-retained-height')
      retainedList.classList.remove('[min-height:var(--menu-retained-height)]')
    }
    if (surface) {
      surface.style.removeProperty('--menu-retained-height')
      surface.classList.remove('[min-height:var(--menu-retained-height)]')
    }
  }
}
