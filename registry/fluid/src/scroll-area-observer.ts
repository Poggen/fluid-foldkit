import { Effect, Queue, Stream } from 'effect'
import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { ScrollMeasurement, ScrollAxis, ScrollDrag } from './scroll-area-state.js'

export const ScrollObservation = defineMessageUnion({
  Measured: ScrollMeasurement.fields,
  Scrolled: { left: Schema.Finite, top: Schema.Finite },
  TouchChanged: { touch: Schema.Boolean },
  Hovered: { hovered: Schema.Boolean },
  PointerDown: ScrollDrag.fields,
  PointerMoved: { pointer: Schema.Int, coordinate: Schema.Finite },
  PointerReleased: { pointer: Schema.Int },
  Wheeled: { axis: ScrollAxis, delta: Schema.Finite },
})

export function observeScrollArea(element: Element, states: Stream.Stream<'Live' | 'Paused'>) {
  return states.pipe(
    Stream.switchMap((state) =>
      state !== 'Live'
        ? Stream.never
        : Stream.callback<typeof ScrollObservation.Type>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                if (!(element instanceof HTMLElement))
                  throw new Error('ScrollArea requires HTMLElement')

                const viewport = element.querySelector<HTMLElement>(
                  '[data-slot=scroll-area-viewport]',
                )

                const content =
                  element.querySelector<HTMLElement>('[data-scroll-content]') ?? viewport

                if (!viewport || !content)
                  throw new Error('ScrollArea requires viewport and content')
                const win = viewport.ownerDocument.defaultView

                if (!win) throw new Error('ScrollArea requires a browsing context')

                const send = (message: typeof ScrollObservation.Type) =>
                  Queue.offerUnsafe(queue, message)

                const bar = (axis: 'x' | 'y') =>
                  element.querySelector<HTMLElement>(`[data-scroll-axis=${axis}]`)

                const offset = (
                  node: HTMLElement | null,
                  property: 'padding' | 'margin',
                  axis: 'x' | 'y',
                ) => {
                  if (!node) return 0
                  const css = win.getComputedStyle(node)

                  return axis === 'x'
                    ? (parseFloat(css.getPropertyValue(`${property}-left`)) || 0) +
                        (parseFloat(css.getPropertyValue(`${property}-right`)) || 0)
                    : (parseFloat(css.getPropertyValue(`${property}-top`)) || 0) +
                        (parseFloat(css.getPropertyValue(`${property}-bottom`)) || 0)
                }

                const measure = () =>
                  send(
                    ScrollObservation.Measured({
                      width: viewport.clientWidth,
                      height: viewport.clientHeight,
                      scrollWidth: viewport.scrollWidth,
                      scrollHeight: viewport.scrollHeight,
                      left: viewport.scrollLeft,
                      top: viewport.scrollTop,
                      trackX: bar('x')?.clientWidth ?? viewport.clientWidth,
                      trackY: bar('y')?.clientHeight ?? viewport.clientHeight,
                      paddingX: offset(bar('x'), 'padding', 'x'),
                      paddingY: offset(bar('y'), 'padding', 'y'),
                      marginX:
                        offset(
                          bar('x')?.firstElementChild instanceof HTMLElement
                            ? (bar('x')?.querySelector<HTMLElement>(
                                '[data-slot=scroll-area-thumb]',
                              ) ?? null)
                            : null,
                          'margin',
                          'x',
                        ) || 8,
                      marginY:
                        offset(
                          bar('y')?.querySelector<HTMLElement>('[data-slot=scroll-area-thumb]') ??
                            null,
                          'margin',
                          'y',
                        ) || 8,
                    }),
                  )

                const mq = win.matchMedia('(pointer: coarse)')

                const touch = () =>
                  send(
                    ScrollObservation.TouchChanged({
                      touch:
                        ('ontouchstart' in win || win.navigator.maxTouchPoints > 0) && mq.matches,
                    }),
                  )

                const scroll = () =>
                  send(
                    ScrollObservation.Scrolled({
                      left: viewport.scrollLeft,
                      top: viewport.scrollTop,
                    }),
                  )

                const enter = () => send(ScrollObservation.Hovered({ hovered: true }))
                const leave = () => send(ScrollObservation.Hovered({ hovered: false }))

                const down = (event: PointerEvent) => {
                  if (event.button !== 0 || !(event.target instanceof Element)) return
                  const track = event.target.closest<HTMLElement>('[data-scroll-axis]')

                  if (!track || !element.contains(track)) return

                  if (element.hasAttribute('data-scroll-dragging')) return
                  const axis = track.dataset.scrollAxis === 'x' ? 'x' : 'y'
                  const rect = track.getBoundingClientRect()
                  const thumb = track.querySelector<HTMLElement>('[data-slot=scroll-area-thumb]')
                  const thumbRect = thumb?.getBoundingClientRect()
                  const onThumb = thumb?.contains(event.target) ?? false
                  event.preventDefault()
                  track.setPointerCapture(event.pointerId)
                  send(
                    ScrollObservation.PointerDown({
                      pointer: event.pointerId,
                      axis,
                      start: axis === 'x' ? event.clientX : event.clientY,
                      position: axis === 'x' ? viewport.scrollLeft : viewport.scrollTop,
                      trackStart: axis === 'x' ? rect.left : rect.top,
                      thumbOffset:
                        onThumb && thumbRect
                          ? axis === 'x'
                            ? event.clientX - thumbRect.left
                            : event.clientY - thumbRect.top
                          : 0,
                    }),
                  )
                }

                const move = (event: PointerEvent) => {
                  if (!(event.target instanceof Element)) return
                  const track = event.target.closest<HTMLElement>('[data-scroll-axis]')

                  if (!track || !track.hasPointerCapture(event.pointerId)) return

                  if (event.buttons % 2 === 0) {
                    up(event)

                    return
                  }

                  send(
                    ScrollObservation.PointerMoved({
                      pointer: event.pointerId,
                      coordinate: track.dataset.scrollAxis === 'x' ? event.clientX : event.clientY,
                    }),
                  )
                }

                const up = (event: PointerEvent) => {
                  if (
                    event.target instanceof Element &&
                    event.target.hasPointerCapture(event.pointerId)
                  )
                    event.target.releasePointerCapture(event.pointerId)
                  send(ScrollObservation.PointerReleased({ pointer: event.pointerId }))
                }

                const wheel = (event: WheelEvent) => {
                  if (event.ctrlKey || !(event.target instanceof Element)) return
                  const track = event.target.closest<HTMLElement>('[data-scroll-axis]')

                  if (!track || !element.contains(track)) return
                  const axis = track.dataset.scrollAxis === 'x' ? 'x' : 'y'
                  const delta = axis === 'x' ? event.deltaX : event.deltaY

                  if (delta === 0) return
                  const position = axis === 'x' ? viewport.scrollLeft : viewport.scrollTop

                  const maximum =
                    axis === 'x'
                      ? viewport.scrollWidth - viewport.clientWidth
                      : viewport.scrollHeight - viewport.clientHeight

                  const rtl = axis === 'x' && win.getComputedStyle(viewport).direction === 'rtl'

                  if (
                    (position <= (rtl ? -maximum : 0) && delta < 0) ||
                    (position >= (rtl ? 0 : maximum) && delta > 0)
                  )
                    return
                  event.preventDefault()
                  send(ScrollObservation.Wheeled({ axis, delta }))
                }

                const resize = new ResizeObserver(measure)

                const mutation = new MutationObserver(() => {
                  const x = bar('x'),
                    y = bar('y')

                  if (x) resize.observe(x)

                  if (y) resize.observe(y)
                  measure()
                })

                resize.observe(viewport)
                resize.observe(content)
                mutation.observe(element, { childList: true, subtree: true, characterData: true })
                viewport.addEventListener('scroll', scroll)
                element.addEventListener('pointerenter', enter)
                element.addEventListener('pointerleave', leave)
                element.addEventListener('pointerdown', down)
                element.addEventListener('pointermove', move)
                element.addEventListener('pointerup', up)
                element.addEventListener('pointercancel', up)
                element.addEventListener('lostpointercapture', up)
                element.addEventListener('wheel', wheel, { passive: false })
                win.addEventListener('pointerdown', touch)
                mq.addEventListener('change', touch)
                measure()
                touch()

                return () => {
                  resize.disconnect()
                  mutation.disconnect()
                  viewport.removeEventListener('scroll', scroll)
                  element.removeEventListener('pointerenter', enter)
                  element.removeEventListener('pointerleave', leave)
                  element.removeEventListener('pointerdown', down)
                  element.removeEventListener('pointermove', move)
                  element.removeEventListener('pointerup', up)
                  element.removeEventListener('pointercancel', up)
                  element.removeEventListener('lostpointercapture', up)
                  element.removeEventListener('wheel', wheel)
                  win.removeEventListener('pointerdown', touch)
                  mq.removeEventListener('change', touch)
                }
              }),
              (dispose) => Effect.sync(dispose),
            ).pipe(Effect.flatMap(() => Effect.never)),
          ),
    ),
  )
}
