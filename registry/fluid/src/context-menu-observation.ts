import { Effect, Queue, Stream } from 'effect'

export interface ContextMenuObservationInput {
  readonly id: string
  readonly element: Element
  readonly viewStateChanges: Stream.Stream<'Live' | 'Paused'>
}
export interface ContextMenuOpening {
  readonly _tag: 'OpenedAt'
  readonly x: number
  readonly y: number
}
const editable = 'input, textarea, select, [contenteditable]:not([contenteditable=false])'

/** Native resources retain DOM focus handles; the Block owns visibility and position. */
export function observeContextMenu(
  input: ContextMenuObservationInput,
): Stream.Stream<ContextMenuOpening> {
  return input.viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Paused'
        ? Stream.never
        : Stream.callback<ContextMenuOpening>((queue) =>
            Effect.gen(function* () {
              const document = input.element.ownerDocument
              const area = document.getElementById(`${input.id}-area`)
              const anchor = document.getElementById(`${input.id}-menu-trigger`)
              if (!(area instanceof HTMLElement) || !(anchor instanceof HTMLElement))
                return yield* Effect.never
              const window = document.defaultView
              let returnTo: HTMLElement | null = null
              let timer: number | undefined
              let restoreFrame: number | undefined
              let touchPoint: { x: number; y: number } | undefined
              let longPressed = false
              const allowed = (target: EventTarget | null, prevented: boolean) => {
                if (
                  prevented ||
                  input.element.getAttribute('data-context-menu-disabled') === 'true' ||
                  !(target instanceof Element) ||
                  target.closest(editable)
                )
                  return false
                const filter = input.element.getAttribute('data-context-menu-filter')
                return !filter || target.matches(filter)
              }
              const open = (x: number, y: number) => {
                const active = document.activeElement
                if (anchor.getAttribute('aria-expanded') !== 'true') {
                  returnTo =
                    active instanceof HTMLElement && active !== document.body ? active : area
                }
                // Keep the point in viewport coordinates, outside transformed and scrolled ancestors.
                ;(area.closest('dialog[open]') ?? document.body).append(anchor)
                anchor.style.left = `${x}px`
                anchor.style.top = `${y}px`
                Queue.offerUnsafe(queue, { _tag: 'OpenedAt', x, y })
              }
              const contextmenu = (event: MouseEvent) => {
                if (!allowed(event.target, event.defaultPrevented)) return
                event.preventDefault()
                if (!longPressed) open(event.clientX, event.clientY)
              }
              const keydown = (event: KeyboardEvent) => {
                if (
                  !(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) ||
                  !allowed(event.target, event.defaultPrevented)
                )
                  return
                event.preventDefault()
                if (!(event.target instanceof Element)) return
                const rect = event.target.getBoundingClientRect()
                open(rect.left + 8, rect.bottom)
              }
              const cancel = () => {
                if (timer !== undefined) window?.clearTimeout(timer)
                timer = undefined
                touchPoint = undefined
              }
              const pointerdown = (event: PointerEvent) => {
                cancel()
                longPressed = false
                if (event.pointerType !== 'touch' || !allowed(event.target, event.defaultPrevented))
                  return
                touchPoint = { x: event.clientX, y: event.clientY }
                timer = window?.setTimeout(() => {
                  if (touchPoint === undefined || !allowed(event.target, false)) return
                  longPressed = true
                  open(touchPoint.x, touchPoint.y)
                }, 700)
              }
              const pointermove = (event: PointerEvent) => {
                if (
                  touchPoint &&
                  Math.hypot(event.clientX - touchPoint.x, event.clientY - touchPoint.y) > 10
                )
                  cancel()
              }
              const click = (event: MouseEvent) => {
                if (longPressed) {
                  event.preventDefault()
                  event.stopPropagation()
                  longPressed = false
                  return
                }
                const selector = input.element.getAttribute('data-context-menu-click-target')
                const button =
                  selector && event.target instanceof Element
                    ? event.target.closest(selector)
                    : null
                if (!button || !allowed(event.target, event.defaultPrevented)) return
                event.preventDefault()
                const rect = button.getBoundingClientRect()
                open(rect.left, rect.bottom)
              }
              yield* Effect.acquireRelease(
                Effect.sync(() => {
                  const anchorParent = anchor.parentNode
                  const anchorSibling = anchor.nextSibling
                  const restoreFocus = () => {
                    if (anchor.getAttribute('aria-expanded') === 'true' || returnTo === null) return
                    const target = returnTo
                    const active = document.activeElement
                    if (
                      target.isConnected &&
                      (!active || active === document.body || active === anchor)
                    ) {
                      returnTo = null
                      target.focus({ preventScroll: true })
                    }
                  }
                  const observer = new MutationObserver(() => {
                    if (anchor.getAttribute('aria-expanded') === 'true' || returnTo === null) return
                    restoreFrame = window?.requestAnimationFrame(restoreFocus)
                  })
                  // Dropdown restores its trigger after exit; retain the origin until that handoff.
                  anchor.addEventListener('focus', restoreFocus)
                  observer.observe(anchor, { attributes: true, attributeFilter: ['aria-expanded'] })
                  area.addEventListener('contextmenu', contextmenu)
                  area.addEventListener('keydown', keydown)
                  area.addEventListener('pointerdown', pointerdown)
                  area.addEventListener('pointermove', pointermove)
                  area.addEventListener('pointerup', cancel)
                  area.addEventListener('pointercancel', cancel)
                  area.addEventListener('click', click, true)
                  return () => {
                    cancel()
                    if (restoreFrame !== undefined) window?.cancelAnimationFrame(restoreFrame)
                    observer.disconnect()
                    anchor.removeEventListener('focus', restoreFocus)
                    area.removeEventListener('contextmenu', contextmenu)
                    area.removeEventListener('keydown', keydown)
                    area.removeEventListener('pointerdown', pointerdown)
                    area.removeEventListener('pointermove', pointermove)
                    area.removeEventListener('pointerup', cancel)
                    area.removeEventListener('pointercancel', cancel)
                    area.removeEventListener('click', click, true)
                    if (anchorParent && anchor.isConnected) {
                      if (anchorSibling?.parentNode === anchorParent) anchorSibling.before(anchor)
                      else anchorParent.appendChild(anchor)
                    }
                  }
                }),
                (release) => Effect.sync(release),
              )
              return yield* Effect.never
            }),
          ),
    ),
  )
}
