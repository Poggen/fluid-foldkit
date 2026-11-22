/* @license Ramka Foldkit adaptation. MIT. Upstream copyright (c) 2026 Artur Bień. */

interface DocumentLock {
  count: number
  readonly restoreScroll: () => void
  restoreSelection?: () => void
}

const documentLocks = new WeakMap<Document, DocumentLock>()

function preserveStyle(style: CSSStyleDeclaration, property: string) {
  const value = style.getPropertyValue(property)
  const priority = style.getPropertyPriority(property)
  return () => {
    if (value) style.setProperty(property, value, priority)
    else style.removeProperty(property)
  }
}

function attachTouchContainment(host: HTMLElement) {
  const view = host.ownerDocument.defaultView
  let origin: { readonly x: number; readonly y: number } | undefined
  let decision: 'pending' | 'prevent' | 'allow' = 'pending'
  const start = (event: TouchEvent) => {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined
    origin = touch ? { x: touch.clientX, y: touch.clientY } : undefined
    decision = 'pending'
  }
  const move = (event: TouchEvent) => {
    if (!origin) return
    if (event.touches.length !== 1) {
      decision = 'allow'
      return
    }
    const touch = event.touches[0]
    if (!touch) return
    if (decision === 'pending') {
      const dx = touch.clientX - origin.x
      const dy = touch.clientY - origin.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return
      if (Math.abs(dx) > Math.abs(dy)) decision = 'allow'
      else {
        decision = 'prevent'
        let node = event.target instanceof Element ? event.target : null
        while (node && node !== host) {
          if (node instanceof HTMLElement && node.scrollHeight > node.clientHeight) {
            const overflow = view?.getComputedStyle(node).overflowY
            if (
              (overflow === 'auto' || overflow === 'scroll') &&
              (dy > 0
                ? node.scrollTop > 0
                : node.scrollTop < node.scrollHeight - node.clientHeight - 1)
            ) {
              decision = 'allow'
              break
            }
          }
          node = node.parentElement
        }
      }
    }
    if (decision === 'prevent' && event.cancelable) event.preventDefault()
  }
  const settled = (event: TouchEvent) => {
    if (event.touches.length === 0) {
      origin = undefined
      decision = 'pending'
    }
  }
  host.addEventListener('touchstart', start, { passive: true })
  host.addEventListener('touchmove', move, { passive: false })
  host.addEventListener('touchend', settled, { passive: true })
  host.addEventListener('touchcancel', settled, { passive: true })
  return () => {
    host.removeEventListener('touchstart', start)
    host.removeEventListener('touchmove', move)
    host.removeEventListener('touchend', settled)
    host.removeEventListener('touchcancel', settled)
  }
}

/** Mount guards before capture; lock at reveal, select after open completion. */
export function attachBrowserGuards(host: HTMLElement) {
  const document = host.ownerDocument
  const view = document.defaultView
  let disposed = false
  let locked = false
  let preparedScrollLock:
    | {
        body: HTMLElement
        width: number
        height: number
        scrollbarWidth: number
        padding: number
      }
    | undefined
  let pinchActive = false
  const touchStart = (event: TouchEvent) => {
    if (event.touches.length > 1) pinchActive = true
  }
  const touchMove = (event: TouchEvent) => {
    if (event.touches.length > 1 || pinchActive) event.preventDefault()
  }
  const touchEnd = (event: TouchEvent) => {
    if (event.touches.length === 0) pinchActive = false
  }
  const gesture = (event: Event) => event.preventDefault()
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey) event.preventDefault()
  }
  const safariGestures = view !== null && 'GestureEvent' in view
  document.addEventListener('touchstart', touchStart, { passive: true })
  document.addEventListener('touchmove', touchMove, { passive: false })
  document.addEventListener('touchend', touchEnd, { passive: true })
  document.addEventListener('touchcancel', touchEnd, { passive: true })
  if (safariGestures) {
    document.addEventListener('gesturestart', gesture)
    document.addEventListener('gesturechange', gesture)
  } else document.addEventListener('wheel', wheel, { passive: false })
  const releaseHost = attachTouchContainment(host)
  const backdrop = host
    .closest('[data-ramka-portal]')
    ?.querySelector<HTMLElement>('[data-ramka-backdrop]')
  const releaseBackdrop =
    backdrop && !host.contains(backdrop) ? attachTouchContainment(backdrop) : undefined

  const measureScrollLock = () => {
    if (!view) return undefined
    const body = document.body
    const width = view.innerWidth
    const height = view.innerHeight
    const scrollbarWidth = Math.max(0, width - document.documentElement.clientWidth)
    const padding =
      scrollbarWidth > 0 ? Number.parseFloat(view.getComputedStyle(body).paddingInlineEnd) || 0 : 0
    return { body, width, height, scrollbarWidth, padding }
  }
  const prepareScrollLock = () => {
    preparedScrollLock = undefined
    if (disposed || locked || documentLocks.has(document)) return undefined
    const measurement = measureScrollLock()
    preparedScrollLock = measurement
    return () => {
      if (preparedScrollLock === measurement) preparedScrollLock = undefined
    }
  }
  const lockScroll = () => {
    if (disposed || locked || !view) return
    locked = true
    const current = documentLocks.get(document)
    if (current) {
      preparedScrollLock = undefined
      current.count += 1
      return
    }
    const html = document.documentElement
    const body = document.body
    const restoreOverflow = preserveStyle(html.style, 'overflow')
    const restorePadding = preserveStyle(body.style, 'padding-inline-end')
    const prepared = preparedScrollLock
    preparedScrollLock = undefined
    const measurement =
      prepared &&
      prepared.body === body &&
      prepared.width === view.innerWidth &&
      prepared.height === view.innerHeight
        ? prepared
        : measureScrollLock()
    if (!measurement) return
    const { scrollbarWidth, padding } = measurement
    html.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingInlineEnd = `${padding + scrollbarWidth}px`
    documentLocks.set(document, {
      count: 1,
      restoreScroll: () => {
        restoreOverflow()
        restorePadding()
      },
    })
  }
  const applySelectionGuard = () => {
    if (disposed || !locked || !view || !(view.navigator.maxTouchPoints > 0)) return
    const lock = documentLocks.get(document)
    if (!lock || lock.restoreSelection) return
    const style = document.documentElement.style
    const restoreUserSelect = preserveStyle(style, 'user-select')
    const restoreWebkitUserSelect = preserveStyle(style, '-webkit-user-select')
    style.setProperty('user-select', 'none')
    style.setProperty('-webkit-user-select', 'none')
    lock.restoreSelection = () => {
      restoreUserSelect()
      restoreWebkitUserSelect()
    }
  }
  const dispose = () => {
    if (disposed) return
    disposed = true
    preparedScrollLock = undefined
    document.removeEventListener('touchstart', touchStart)
    document.removeEventListener('touchmove', touchMove)
    document.removeEventListener('touchend', touchEnd)
    document.removeEventListener('touchcancel', touchEnd)
    document.removeEventListener('gesturestart', gesture)
    document.removeEventListener('gesturechange', gesture)
    document.removeEventListener('wheel', wheel)
    releaseHost()
    releaseBackdrop?.()
    if (!locked) return
    const lock = documentLocks.get(document)
    if (!lock) return
    lock.count -= 1
    if (lock.count > 0) return
    lock.restoreSelection?.()
    lock.restoreScroll()
    documentLocks.delete(document)
  }
  return { prepareScrollLock, lockScroll, applySelectionGuard, dispose }
}
