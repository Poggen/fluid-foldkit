/** Physical frame admission; progress and selection remain owned by the Block Model. */
export const observeCarouselFrames = (element: Element, emit: (elapsed: number) => void) => {
  const document = element.ownerDocument
  const view = document.defaultView
  if (view === null) throw new Error('CarouselDots clock requires a browsing context')
  let visible = false
  let disposed = false
  let frame = 0
  let previous = 0
  const tick = (now: number) => {
    frame = 0
    if (disposed || !visible || document.hidden) return
    const elapsed = now - previous
    previous = now
    emit(elapsed)
    if (!disposed) frame = view.requestAnimationFrame(tick)
  }
  const synchronize = () => {
    if (frame !== 0) view.cancelAnimationFrame(frame)
    frame = 0
    if (disposed || !visible || document.hidden) return
    previous = view.performance.now()
    frame = view.requestAnimationFrame(tick)
  }
  const observer = new view.IntersectionObserver(
    (entries) => {
      const next = entries.some((entry) => entry.isIntersecting)
      if (next === visible) return
      visible = next
      synchronize()
    },
    { rootMargin: '120px 0px' },
  )

  const target =
    view.getComputedStyle(element).display === 'contents'
      ? (element.parentElement ?? element)
      : element
  observer.observe(target)
  document.addEventListener('visibilitychange', synchronize)
  return () => {
    disposed = true
    observer.disconnect()
    document.removeEventListener('visibilitychange', synchronize)
    if (frame !== 0) view.cancelAnimationFrame(frame)
  }
}
