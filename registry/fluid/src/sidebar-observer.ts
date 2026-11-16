import { Effect, Queue, Stream } from 'effect'
import type * as Mount from 'foldkit/mount'
import { exitFallbackMs, spring } from './lib/springs.js'
import {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_COLLAPSE_SLOP,
} from './sidebar-state.js'

const providers = new WeakMap<Document, Set<HTMLElement>>()
export function observeSidebar<A>(
  element: Element,
  changes: Stream.Stream<Mount.ViewState>,
  config: {
    readonly breakpoint: number
    readonly shortcut: string | null
    readonly side: 'left' | 'right'
    readonly persist: boolean
  },
  messages: {
    readonly pinComplete: (generation: number) => A
    readonly dragComplete: (generation: number) => A
    readonly toggle: () => A
    readonly mobile: (mobile: boolean) => ReadonlyArray<A>
    readonly peek: (open: boolean) => A
    readonly resized: (width: number, open: boolean, resizing: boolean) => A
  },
): Stream.Stream<A> {
  return changes.pipe(
    Stream.switchMap((state) =>
      state !== 'Live'
        ? Stream.never
        : Stream.callback<A>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const document = element.ownerDocument
                const window = document.defaultView
                if (!window || !(element instanceof window.HTMLElement)) return () => {}
                let roots = providers.get(document)
                if (!roots) {
                  roots = new Set()
                  providers.set(document, roots)
                }
                roots.add(element)
                const emit = (message: A) => Queue.offerUnsafe(queue, message)
                const mobile = window.matchMedia(`(max-width: ${config.breakpoint - 0.02}px)`)
                const onMobile = () => {
                  for (const message of messages.mobile(mobile.matches)) emit(message)
                }
                onMobile()
                mobile.addEventListener('change', onMobile)
                const key = (event: KeyboardEvent) => {
                  const target = event.target
                  if (!(target instanceof window.HTMLElement)) return
                  if (
                    event.key === 'Escape' &&
                    element.getAttribute('data-sidebar-peeking') === 'true'
                  ) {
                    emit(messages.peek(false))
                    return
                  }
                  if (
                    !config.shortcut ||
                    event.key.toLowerCase() !== config.shortcut.toLowerCase() ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.altKey ||
                    target.isContentEditable ||
                    target.closest('input,textarea,select')
                  )
                    return
                  const all = Array.from(providers.get(document) ?? [])
                  const containing = all.filter((root) => root.contains(target))
                  const wrapped = all.filter((root) => target.contains(root))
                  const owner = wrapped.length
                    ? wrapped.find(
                        (root) => !wrapped.some((other) => root !== other && other.contains(root)),
                      )
                    : containing.length
                      ? containing.find(
                          (root) =>
                            !containing.some((other) => root !== other && root.contains(other)),
                        )
                      : all.find(
                          (root) => !all.some((other) => root !== other && other.contains(root)),
                        )
                  if (owner !== element) return
                  event.preventDefault()
                  emit(messages.toggle())
                }
                window.addEventListener('keydown', key)
                let timer = 0
                const cancelTimer = () => {
                  window.clearTimeout(timer)
                  timer = 0
                }
                const schedule = (open: boolean) => {
                  cancelTimer()
                  timer = window.setTimeout(
                    () => {
                      timer = 0
                      emit(messages.peek(open))
                    },
                    open ? 150 : 250,
                  )
                }
                const mode = () => element.getAttribute('data-sidebar-peek')
                const ownedTarget = (target: EventTarget | null, selector: string) => {
                  if (!(target instanceof window.Element)) return null
                  const match = target.closest<HTMLElement>(selector)
                  return match?.closest('[data-slot="sidebar-wrapper"]') === element ? match : null
                }
                const onPointerMove = (event: PointerEvent) => {
                  if (
                    mobile.matches ||
                    mode() !== 'hover' ||
                    element.getAttribute('data-sidebar-open') === 'true'
                  )
                    return
                  const panel = element.querySelector<HTMLElement>('[data-sidebar-panel]')
                  const strip = ownedTarget(event.target, '[data-sidebar-peek-strip]')
                  const trigger = ownedTarget(event.target, '[data-sidebar="trigger"]')
                  const ownedTrigger =
                    trigger?.getAttribute('data-sidebar-owner') ===
                    element.getAttribute('data-sidebar-owner')
                      ? trigger
                      : null
                  const peeking = element.getAttribute('data-sidebar-peeking') === 'true'
                  if ((strip || ownedTrigger) && event.pointerType === 'mouse') {
                    if (peeking) cancelTimer()
                    else if (!timer) schedule(true)
                    return
                  }
                  if (!peeking) {
                    cancelTimer()
                    return
                  }
                  if (!panel) return
                  const rect = panel.getBoundingClientRect()
                  const inside =
                    event.clientX >= rect.left - 8 &&
                    event.clientX <= rect.right + 8 &&
                    event.clientY >= rect.top - 8 &&
                    event.clientY <= rect.bottom + 8
                  if (inside) cancelTimer()
                  else if (!timer) schedule(false)
                }
                const outside = (event: PointerEvent) => {
                  if (element.getAttribute('data-sidebar-peeking') !== 'true') return
                  if (
                    event.target instanceof window.Node &&
                    !element.querySelector('[data-slot="sidebar"]')?.contains(event.target)
                  )
                    emit(messages.peek(false))
                }
                document.addEventListener('pointermove', onPointerMove)
                document.addEventListener('pointerdown', outside)
                let drag:
                  | {
                      pointer: number
                      startX: number
                      startWidth: number
                      moved: boolean
                      rail: HTMLElement
                      width: number
                      open: boolean
                    }
                  | undefined
                const down = (event: PointerEvent) => {
                  if (!(event.target instanceof window.HTMLElement)) return
                  const rail = event.target.closest<HTMLElement>('[data-sidebar-rail]')
                  if (!rail || event.button !== 0) return
                  const panel = rail.closest<HTMLElement>('[data-slot="sidebar"]')
                  if (
                    !panel ||
                    rail.closest('[data-slot="sidebar-wrapper"]') !== element ||
                    panel.closest('[data-slot="sidebar-wrapper"]') !== element
                  )
                    return
                  // Source uses the owning outer shell, including a legitimate collapsed width of zero.
                  const width = panel.offsetWidth
                  drag = {
                    pointer: event.pointerId,
                    startX: event.clientX,
                    startWidth: width,
                    moved: false,
                    rail,
                    width,
                    open: true,
                  }
                  rail.setPointerCapture(event.pointerId)
                }
                const move = (event: PointerEvent) => {
                  if (!drag || drag.pointer !== event.pointerId) return
                  const dx = event.clientX - drag.startX
                  if (!drag.moved && Math.abs(dx) < 4) return
                  drag.moved = true
                  const raw = drag.startWidth + (config.side === 'left' ? dx : -dx)
                  drag.open = raw >= SIDEBAR_MIN_WIDTH - SIDEBAR_COLLAPSE_SLOP
                  drag.width = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, raw))
                  emit(messages.resized(drag.width, drag.open, true))
                }
                const up = (event: PointerEvent) => {
                  if (!drag || drag.pointer !== event.pointerId) return
                  const held = drag
                  drag = undefined
                  if (held.rail.hasPointerCapture(event.pointerId))
                    held.rail.releasePointerCapture(event.pointerId)
                  if (held.moved) emit(messages.resized(held.width, held.open, false))
                  else emit(messages.toggle())
                }
                const cancel = () => {
                  if (!drag) return
                  const held = drag
                  drag = undefined
                  if (held.moved) emit(messages.resized(held.width, held.open, false))
                }
                element.addEventListener('pointerdown', down)
                element.addEventListener('pointermove', move)
                element.addEventListener('pointerup', up)
                element.addEventListener('pointercancel', cancel)
                element.addEventListener('lostpointercapture', cancel)
                let pinTimer = 0
                let dragTimer = 0
                let pin = ''
                let flip = '0'
                const updateHolds = () => {
                  const nextPin = element.getAttribute('data-sidebar-pin-hold') ?? ''
                  const nextFlip = element.getAttribute('data-sidebar-drag-flip') ?? '0'
                  if (pin !== nextPin) {
                    window.clearTimeout(pinTimer)
                    pin = nextPin
                    if (pin !== '')
                      pinTimer = window.setTimeout(
                        () => emit(messages.pinComplete(Number(nextPin))),
                        exitFallbackMs(spring.slow),
                      )
                  }
                  if (flip !== nextFlip) {
                    window.clearTimeout(dragTimer)
                    flip = nextFlip
                    if (flip !== '0')
                      dragTimer = window.setTimeout(
                        () => emit(messages.dragComplete(Number(nextFlip))),
                        exitFallbackMs(spring.moderate),
                      )
                  }
                }
                const persist = new window.MutationObserver(() => {
                  updateHolds()
                  const value = element.getAttribute('data-sidebar-persist-value')
                  if (config.persist && value !== null)
                    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
                  if (element.getAttribute('data-sidebar-open') === 'true') cancelTimer()
                })
                persist.observe(element, {
                  attributes: true,
                  attributeFilter: [
                    'data-sidebar-persist-value',
                    'data-sidebar-open',
                    'data-sidebar-pin-hold',
                    'data-sidebar-drag-flip',
                  ],
                })
                updateHolds()
                return () => {
                  cancelTimer()
                  window.clearTimeout(pinTimer)
                  window.clearTimeout(dragTimer)
                  roots.delete(element)
                  cancel()
                  mobile.removeEventListener('change', onMobile)
                  window.removeEventListener('keydown', key)
                  document.removeEventListener('pointermove', onPointerMove)
                  document.removeEventListener('pointerdown', outside)
                  element.removeEventListener('pointerdown', down)
                  element.removeEventListener('pointermove', move)
                  element.removeEventListener('pointerup', up)
                  element.removeEventListener('pointercancel', cancel)
                  element.removeEventListener('lostpointercapture', cancel)
                  persist.disconnect()
                }
              }),
              (release) => Effect.sync(release),
            ).pipe(Effect.flatMap(() => Effect.never)),
          ),
    ),
  )
}
