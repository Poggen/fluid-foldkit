import { virtualClick } from './date-picker-popup-events.js'

// The frozen nonmodal popup requires intentional mouse clicks but tolerates touch drift.
export function installPopupDismissal(options: {
  readonly document: Document

  readonly live: () => boolean
  readonly inside: (target: EventTarget | null) => boolean
  readonly now: () => number
  readonly dismiss: (event: MouseEvent | TouchEvent) => void
}): () => void {
  const { document, live, inside, now, dismiss } = options
  const window = document.defaultView

  if (!window) return () => {}

  const listeners = new Set<() => void>()
  let pointerType = ''
  let sawPress = false
  let startedInside = false
  let preventedInside = false
  let suppressClick = false
  let suppressTimer = 0

  let touch: {
    readonly at: number
    readonly x: number
    readonly y: number
    dismissAtEnd: boolean
  } | null = null

  const atTarget = (event: Event, action: () => void) => {
    const target = event.target

    if (!target) return

    const release = () => {
      target.removeEventListener(event.type, listener)
      listeners.delete(release)
    }

    const listener = () => {
      release()
      action()
    }

    listeners.add(release)
    target.addEventListener(event.type, listener)
  }

  const scrollbar = (event: MouseEvent) => {
    const element = event.target

    if (!(element instanceof window.HTMLElement)) return false
    const styles = window.getComputedStyle(element)
    const root = element === document.body || element === document.documentElement

    const x =
      (root || /auto|scroll/.test(styles.overflowX)) &&
      element.clientWidth > 0 &&
      element.scrollWidth > element.clientWidth

    const y =
      (root || /auto|scroll/.test(styles.overflowY)) &&
      element.clientHeight > 0 &&
      element.scrollHeight > element.clientHeight

    return (
      (y &&
        (styles.direction === 'rtl'
          ? event.offsetX <= element.offsetWidth - element.clientWidth
          : event.offsetX > element.clientWidth)) ||
      (x && event.offsetY > element.clientHeight)
    )
  }

  const outside = (event: Event) => {
    if (!live() || inside(event.target)) return false

    return !(event instanceof window.MouseEvent) || !scrollbar(event)
  }

  const pointerDown = (event: PointerEvent) => {
    if (!live()) return

    pointerType = event.pointerType

    if (event.button === 0) sawPress = true
    atTarget(event, () => {
      startedInside = inside(event.target)
      preventedInside = startedInside && event.defaultPrevented

      if (!startedInside) {
        suppressClick = false
        window.clearTimeout(suppressTimer)
      }
    })
  }

  const pointerEnd = (event: PointerEvent) => {
    if (event.type === 'pointercancel') sawPress = false

    if (!startedInside) return
    const prevented = preventedInside
    startedInside = false
    preventedInside = false

    if (pointerType === 'touch' || inside(event.target)) return

    if (prevented) {
      suppressClick = true
      window.clearTimeout(suppressTimer)
      suppressTimer = window.setTimeout(() => {
        suppressClick = false
      }, 0)
    } else if (event.type !== 'pointercancel') suppressClick = true
  }

  const click = (event: MouseEvent) => {
    if (pointerType === 'touch') return
    atTarget(event, () => {
      if (!outside(event)) return
      const virtual = virtualClick(event, window)

      if (!virtual && !sawPress) return

      if (suppressClick) {
        suppressClick = false
        window.clearTimeout(suppressTimer)

        return
      }

      dismiss(event)
    })
  }

  const touchStart = (event: TouchEvent) => {
    if (!live()) return
    pointerType = 'touch'
    atTarget(event, () => {
      if (inside(event.target)) return
      const first = event.touches[0]

      if (first) touch = { at: now(), x: first.clientX, y: first.clientY, dismissAtEnd: false }
    })
  }

  const touchMove = (event: TouchEvent) => {
    atTarget(event, () => {
      if (!touch || !outside(event)) return
      const first = event.touches[0]

      if (!first) return
      const distance = Math.hypot(first.clientX - touch.x, first.clientY - touch.y)

      if (distance > 5 && now() - touch.at < 1000) touch.dismissAtEnd = true

      if (distance > 10) {
        dismiss(event)
        touch = null
      }
    })
  }

  const touchEnd = (event: TouchEvent) => {
    atTarget(event, () => {
      if (touch && outside(event) && touch.dismissAtEnd && now() - touch.at < 1000) dismiss(event)
      touch = null
    })
  }

  const mouseDown = (event: MouseEvent) => {
    if (pointerType !== 'touch') return
    atTarget(event, () => {
      if (touch && now() - touch.at >= 1000) return

      if (outside(event)) dismiss(event)
    })
  }

  document.addEventListener('pointerdown', pointerDown, true)
  document.addEventListener('pointerup', pointerEnd, true)
  document.addEventListener('pointercancel', pointerEnd, true)
  document.addEventListener('click', click, true)
  document.addEventListener('mousedown', mouseDown, true)
  document.addEventListener('touchstart', touchStart, { capture: true, passive: true })
  document.addEventListener('touchmove', touchMove, { capture: true, passive: true })
  document.addEventListener('touchend', touchEnd, { capture: true, passive: true })

  return () => {
    document.removeEventListener('pointerdown', pointerDown, true)
    document.removeEventListener('pointerup', pointerEnd, true)
    document.removeEventListener('pointercancel', pointerEnd, true)
    document.removeEventListener('click', click, true)
    document.removeEventListener('mousedown', mouseDown, true)
    document.removeEventListener('touchstart', touchStart, true)
    document.removeEventListener('touchmove', touchMove, true)
    document.removeEventListener('touchend', touchEnd, true)

    window.clearTimeout(suppressTimer)

    for (const release of listeners) release()
    touch = null
  }
}
