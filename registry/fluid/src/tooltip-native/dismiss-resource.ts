import { tooltipTrigger } from './elements.js'
import { Observation } from './observation.js'
import type { PopupObservation } from './observation.js'
import { hasOpenTooltipChild } from './base-grace-observation.js'

export function observeTooltipDismissal(
  document: Document,
  window: Window,
  trigger: HTMLElement,
  popup: HTMLElement,
  id: string,
  send: (message: PopupObservation) => void,
) {
  let composing = false
  let compositionTimer: number | undefined
  let touchTimer: number | undefined
  let touch:
    | { readonly x: number; readonly y: number; dismissOnEnd: boolean; dismissOnMouseDown: boolean }
    | undefined
  const owns = (event: Event) =>
    event.composedPath().includes(trigger) || event.composedPath().includes(popup)
  const nestedOwns = (event: Event) => {
    if (owns(event)) return true
    for (const candidate of document.querySelectorAll<HTMLElement>('[data-tooltip-popup]')) {
      const key = candidate.dataset.tooltipPopup
      const childTrigger = key === undefined ? null : tooltipTrigger(document, key)
      if (
        childTrigger !== null &&
        popup.contains(childTrigger) &&
        event.composedPath().includes(candidate)
      )
        return true
    }
    return false
  }
  const open = () => popup.dataset.state === 'open'
  const dismiss = (reason: string) => send(Observation.Dismissed({ reason }))
  const scrollbar = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return false
    const style = window.getComputedStyle(target)
    const root = target === document.body || target === document.documentElement
    const canX =
      (root || /auto|scroll/.test(style.overflowX)) &&
      target.clientWidth > 0 &&
      target.scrollWidth > target.clientWidth
    const canY =
      (root || /auto|scroll/.test(style.overflowY)) &&
      target.clientHeight > 0 &&
      target.scrollHeight > target.clientHeight
    return (
      (canY &&
        (style.direction === 'rtl'
          ? event.offsetX <= target.offsetWidth - target.clientWidth
          : event.offsetX > target.clientWidth)) ||
      (canX && event.offsetY > target.clientHeight)
    )
  }
  const outside = (event: Event) => {
    if (!open() || nestedOwns(event)) return
    const target = event.composedPath()[0] ?? event.target
    if (target instanceof Element) {
      const root = target.getRootNode()
      const markers = Array.from(
        (root instanceof ShadowRoot ? root : document).querySelectorAll('[data-base-ui-inert]'),
      )
      let ancestor = target
      while (
        ancestor.parentElement !== null &&
        ancestor.parentElement !== document.body &&
        ancestor.parentElement !== document.documentElement
      )
        ancestor = ancestor.parentElement
      if (
        markers.length > 0 &&
        target !== document.body &&
        target !== document.documentElement &&
        !target.contains(popup) &&
        markers.every((marker) => !ancestor.contains(marker))
      )
        return
    }
    if (event instanceof MouseEvent && scrollbar(event)) return
    dismiss('outside')
  }
  const pointer = (event: PointerEvent) => {
    if (owns(event)) {
      return
    }
    {
      if (event.pointerType !== 'touch') outside(event)
    }
  }
  const mouse = (event: MouseEvent) => {
    if (touch === undefined || touch.dismissOnMouseDown) outside(event)
  }
  const startTouch = (event: TouchEvent) => {
    if (!open() || nestedOwns(event)) return
    const first = event.touches[0]
    if (first === undefined) return
    if (touchTimer !== undefined) window.clearTimeout(touchTimer)
    touch = { x: first.clientX, y: first.clientY, dismissOnEnd: false, dismissOnMouseDown: true }
    touchTimer = window.setTimeout(() => {
      if (touch !== undefined) {
        touch.dismissOnEnd = false
        touch.dismissOnMouseDown = false
      }
    }, 1000)
  }
  const moveTouch = (event: TouchEvent) => {
    const first = event.touches[0]
    if (touch === undefined || first === undefined || nestedOwns(event)) return
    const distance = Math.hypot(first.clientX - touch.x, first.clientY - touch.y)
    if (distance > 5) touch.dismissOnEnd = true
    if (distance > 10) {
      outside(event)
      if (touchTimer !== undefined) window.clearTimeout(touchTimer)
      touch = undefined
    }
  }
  const endTouch = (event: TouchEvent) => {
    if (touch === undefined || nestedOwns(event)) return
    if (touch.dismissOnEnd) outside(event)
    if (touchTimer !== undefined) window.clearTimeout(touchTimer)
    touch = undefined
  }
  const compositionStart = () => {
    if (compositionTimer !== undefined) window.clearTimeout(compositionTimer)
    composing = true
  }
  const compositionEnd = () => {
    composing = true
    compositionTimer = window.setTimeout(
      () => {
        composing = false
      },
      CSS.supports('-webkit-backdrop-filter:none') ? 5 : 0,
    )
  }
  const key = (event: KeyboardEvent) => {
    if (!open() || event.key !== 'Escape' || event.defaultPrevented) return
    if (composing || event.isComposing || hasOpenTooltipChild(document, id)) return

    send(Observation.Escaped())
    event.preventDefault()
    event.stopPropagation()
  }
  document.addEventListener('pointerdown', pointer)
  document.addEventListener('mousedown', mouse)
  document.addEventListener('touchstart', startTouch, { passive: true })
  document.addEventListener('touchmove', moveTouch, { passive: true })
  document.addEventListener('touchend', endTouch, { passive: true })
  document.addEventListener('keydown', key)
  document.addEventListener('compositionstart', compositionStart)
  document.addEventListener('compositionend', compositionEnd)
  return () => {
    if (compositionTimer !== undefined) window.clearTimeout(compositionTimer)
    if (touchTimer !== undefined) window.clearTimeout(touchTimer)
    document.removeEventListener('pointerdown', pointer)
    document.removeEventListener('mousedown', mouse)
    document.removeEventListener('touchstart', startTouch)
    document.removeEventListener('touchmove', moveTouch)
    document.removeEventListener('touchend', endTouch)
    document.removeEventListener('keydown', key)
    document.removeEventListener('compositionstart', compositionStart)
    document.removeEventListener('compositionend', compositionEnd)
  }
}
