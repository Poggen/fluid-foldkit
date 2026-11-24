/* @license Adapted from Ramka bf58a38. MIT. Copyright (c) 2026 Artur Bień. */
import { isFirefox } from './morph/is-firefox.js'
import {
  readInlineScroll,
  writeInlineScroll,
  type TextDirection,
} from './upstream/lightbox-direction.js'
import {
  measureSlidesGeometry,
  slideIndexFromInlinePosition,
  slideInlinePositionForIndex,
  slidesGeometryEqual,
  SLIDE_SELECTOR,
} from './upstream/lightbox-slides-geometry.js'

export interface SlidesState {
  readonly open: boolean
  readonly index: number
  readonly dir: TextDirection
  readonly zoom: number
}

export type SlidesFact =
  | { readonly _tag: 'Navigated'; readonly index: number; readonly source: 'scroll' }
  | { readonly _tag: 'ScrollingChanged'; readonly scrolling: boolean }

export interface SlidesResource {
  isScrolling(): boolean
  reconcile(): void
  snapToModel(instant?: boolean): void
  dispose(): void
}

/** Native scroll ownership; application selection and zoom remain in the Model. */
export function attachSlides(
  viewport: HTMLElement,
  options: { read: () => SlidesState; emit: (fact: SlidesFact) => void; onScroll?: () => void },
) {
  const document = viewport.ownerDocument
  const window = document.defaultView
  if (!window) {
    const detached: SlidesResource = {
      isScrolling: () => false,
      reconcile() {},
      snapToModel() {},
      dispose() {},
    }
    return detached
  }
  const { read, emit } = options
  const scrollendReliable = 'onscrollend' in window && !isFirefox(document)
  const frames = new Set<number>()
  let disposed = false
  let geometry = measureSlidesGeometry(viewport, read().dir)
  let measuredWidth = viewport.clientWidth
  let measuredHeight = viewport.clientHeight
  let measuredDirection = read().dir
  let programmatic = false
  let jumpTarget = 0
  let jumpGeneration = 0
  let suppressDepth = 0
  let resizing = false
  let resizeGeneration = 0
  let repaintTimer = 0
  let idleTimer = 0
  let scrollFrame = 0
  let locked = false
  let sawScrollSinceLock = false
  let pinchInterrupted = false
  let touchLiftedWhileLocked = false
  let touchStartX = 0
  let touchStartY = 0
  let sawSingleFinger = false
  let singleFingerSlid = false
  let hadMultiTouch = false
  let reconciledIndex: number | undefined
  let reconciledOpen = false
  let pendingSsrJump = false

  const frame = (callback: () => void) => {
    const id = window.requestAnimationFrame(() => {
      frames.delete(id)
      if (!disposed) callback()
    })
    frames.add(id)
    return id
  }
  const setLocked = (value: boolean) => {
    if (locked === value) return
    locked = value
    emit({ _tag: 'ScrollingChanged', scrolling: value })
  }
  const clearIdle = () => {
    window.clearTimeout(idleTimer)
    idleTimer = 0
  }
  const releaseLock = () => {
    sawScrollSinceLock = false
    pinchInterrupted = false
    touchLiftedWhileLocked = false
    clearIdle()
    setLocked(false)
  }
  const indexFromScroll = () =>
    slideIndexFromInlinePosition(readInlineScroll(viewport, read().dir), geometry)
  const publishIndex = () => {
    const index = indexFromScroll()
    if (index !== read().index) emit({ _tag: 'Navigated', index, source: 'scroll' })
  }
  const measure = () => {
    measuredWidth = viewport.clientWidth
    measuredHeight = viewport.clientHeight
    measuredDirection = read().dir
    geometry = measureSlidesGeometry(viewport, measuredDirection)
  }
  const repaintSlide = (index: number) => {
    const slide = viewport.querySelectorAll<HTMLElement>(SLIDE_SELECTOR)[index]
    if (!slide) return
    const previous = slide.style.visibility
    slide.style.visibility = 'hidden'
    void slide.offsetWidth
    slide.style.visibility = previous
  }
  const scrollToIndex = (index: number) => {
    if (disposed || !read().open || viewport.hasAttribute('data-ssr-shift')) return
    const dir = read().dir
    const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    const target = Math.max(0, Math.min(slideInlinePositionForIndex(index, geometry), maximum))
    if (Math.abs(readInlineScroll(viewport, dir) - target) < 1) return
    programmatic = true
    jumpTarget = target
    const generation = ++jumpGeneration
    if (suppressDepth === 0) viewport.style.scrollSnapType = 'none'
    suppressDepth += 1
    writeInlineScroll(viewport, dir, target)
    frame(() => {
      suppressDepth = Math.max(0, suppressDepth - 1)
      if (suppressDepth === 0) viewport.style.scrollSnapType = 'x mandatory'
      if (generation !== jumpGeneration) return
      if (Math.abs(readInlineScroll(viewport, dir) - target) >= 1) {
        programmatic = true
        jumpTarget = target
        writeInlineScroll(viewport, dir, target)
      }
      frame(() => {
        if (generation !== jumpGeneration) return
        programmatic = false
        window.clearTimeout(repaintTimer)
        repaintTimer = window.setTimeout(() => {
          if (!disposed && generation === jumpGeneration) repaintSlide(index)
        }, 120)
      })
    })
  }
  const refit = () => {
    if (disposed || !read().open) return
    const previous = geometry
    measure()
    if (slidesGeometryEqual(previous, geometry)) return
    const generation = ++resizeGeneration
    resizing = true
    releaseLock()
    options.onScroll?.()
    scrollToIndex(read().index)
    frame(() =>
      frame(() => {
        if (generation !== resizeGeneration) return

        scrollToIndex(read().index)
        resizing = false
      }),
    )
  }
  const refitIfResized = () => {
    if (
      viewport.clientWidth !== measuredWidth ||
      viewport.clientHeight !== measuredHeight ||
      read().dir !== measuredDirection
    )
      refit()
  }
  const settle = () => {
    if (disposed || !read().open) return
    if (scrollFrame !== 0) {
      window.cancelAnimationFrame(scrollFrame)
      frames.delete(scrollFrame)
      scrollFrame = 0
    }
    releaseLock()
    programmatic = false
    refitIfResized()
    if (!resizing) publishIndex()
    options.onScroll?.()
  }
  const armIdleFallback = () => {
    clearIdle()

    if (scrollendReliable && !pinchInterrupted && !touchLiftedWhileLocked) return
    idleTimer = window.setTimeout(settle, 140)
  }
  const lockUserScroll = () => {
    if (programmatic) return
    if (!locked) sawScrollSinceLock = false
    setLocked(true)
    armIdleFallback()
  }
  const parkedOnJumpTarget = () => Math.abs(readInlineScroll(viewport, read().dir) - jumpTarget) < 1
  const process = () => {
    scrollFrame = 0
    refitIfResized()
    if (programmatic || resizing || parkedOnJumpTarget()) {
      releaseLock()
      return
    }
    if (locked) publishIndex()
  }
  const onScroll = () => {
    if (disposed || !read().open) return
    refitIfResized()
    if (!programmatic && !resizing && !parkedOnJumpTarget()) {
      lockUserScroll()
      sawScrollSinceLock = true
    }
    if (scrollFrame === 0) scrollFrame = frame(process)
    options.onScroll?.()
  }
  const atRestZoom = () => read().zoom <= 1 + 1e-6
  const onTouchStart = (event: TouchEvent) => {
    if (!read().open) return
    if (event.touches.length > 1) {
      hadMultiTouch = true
      if (sawSingleFinger && singleFingerSlid && atRestZoom()) lockUserScroll()
      return
    }
    const touch = event.touches[0]
    if (touch) {
      sawSingleFinger = true
      singleFingerSlid = false
      touchStartX = touch.clientX
      touchStartY = touch.clientY
      touchLiftedWhileLocked = false
    }
  }
  const onTouchMove = (event: TouchEvent) => {
    if (
      !read().open ||
      hadMultiTouch ||
      event.touches.length !== 1 ||
      !sawSingleFinger ||
      singleFingerSlid
    )
      return
    const touch = event.touches[0]
    if (!touch) return
    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY
    if (Math.hypot(dx, dy) < 10) return
    singleFingerSlid = true
    if (atRestZoom() && Math.abs(dx) >= Math.abs(dy)) lockUserScroll()
  }
  const onTouchEnd = (event: TouchEvent) => {
    if (!read().open || event.touches.length > 0) return
    sawSingleFinger = false
    singleFingerSlid = false
    hadMultiTouch = false
    if (locked && !sawScrollSinceLock) settle()
    else if (locked) {
      touchLiftedWhileLocked = true
      armIdleFallback()
    }
  }
  const onTrackpadPinch = (event: Event) => {
    if (!locked || !read().open) return
    if (
      event.type === 'wheel' &&
      (!(event instanceof window.WheelEvent) || (!event.ctrlKey && !event.metaKey))
    )
      return
    pinchInterrupted = true
    armIdleFallback()
  }
  const observer = new window.ResizeObserver(refit)
  observer.observe(viewport)
  viewport.addEventListener('scroll', onScroll, { passive: true })
  viewport.addEventListener('scrollend', settle)
  viewport.addEventListener('wheel', onTrackpadPinch, { passive: true, capture: true })
  viewport.addEventListener('gesturestart', onTrackpadPinch, { capture: true })
  viewport.addEventListener('gesturechange', onTrackpadPinch, { capture: true })
  viewport.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
  viewport.addEventListener('touchmove', onTouchMove, { passive: true, capture: true })
  viewport.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })
  viewport.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true })

  const reconcile = (initial = false) => {
    if (disposed) return
    const state = read()
    if (!state.open) {
      reconciledOpen = false
      releaseLock()
      return
    }
    const ssrShift = viewport.hasAttribute('data-ssr-shift')
    const ssrHandoff = pendingSsrJump && !ssrShift
    pendingSsrJump = ssrShift
    const changed =
      !reconciledOpen ||
      reconciledIndex !== state.index ||
      measuredDirection !== state.dir ||
      ssrHandoff
    reconciledIndex = state.index
    reconciledOpen = true
    if (changed && !initial) refitIfResized()
    if (viewport.querySelectorAll(SLIDE_SELECTOR).length !== geometry.count) measure()

    if (changed && indexFromScroll() !== state.index) scrollToIndex(state.index)
    if (ssrHandoff) options.onScroll?.()
  }
  reconcile(true)
  const resource: SlidesResource = {
    isScrolling: () => locked,
    reconcile,

    snapToModel() {
      if (disposed || !read().open) return
      measure()
      scrollToIndex(read().index)
    },
    dispose() {
      if (disposed) return
      disposed = true
      observer.disconnect()
      for (const id of frames) window.cancelAnimationFrame(id)
      frames.clear()
      clearIdle()
      window.clearTimeout(repaintTimer)
      viewport.style.scrollSnapType = 'x mandatory'
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('scrollend', settle)
      viewport.removeEventListener('wheel', onTrackpadPinch, true)
      viewport.removeEventListener('gesturestart', onTrackpadPinch, true)
      viewport.removeEventListener('gesturechange', onTrackpadPinch, true)
      viewport.removeEventListener('touchstart', onTouchStart, true)
      viewport.removeEventListener('touchmove', onTouchMove, true)
      viewport.removeEventListener('touchend', onTouchEnd, true)
      viewport.removeEventListener('touchcancel', onTouchEnd, true)
      releaseLock()
    },
  }
  return resource
}
