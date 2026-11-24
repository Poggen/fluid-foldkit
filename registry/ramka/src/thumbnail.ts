/* @license Ramka bf58a38. MIT. Copyright (c) 2026 Artur Bień. */
import { inlineTrackTranslateX, readInlineScroll } from './upstream/lightbox-direction.js'
import {
  measureSlidesGeometry,
  slidesGeometryIsUniform,
  slidesScrollProgressAt,
  type SlidesGeometry,
} from './upstream/lightbox-slides-geometry.js'
import {
  getScrollTimelineConstructor,
  measureThumbTravels,
  readComputedTranslateX,
  thumbTravelAtProgress,
  thumbTravelsEqual,
  trackTransform,
  trackTransformKeyframes,
} from './upstream/lightbox-thumbnail-strip-geometry.js'

export interface ThumbnailStripState {
  scrolling: boolean
  index: number
  dir: 'ltr' | 'rtl'
  reducedMotion: boolean
  scrubOnSelect: boolean
  selectViewTransition: boolean
}

export interface ThumbnailSelectionOptions {
  source?: 'keyboard' | 'thumbnail' | 'button' | 'imperative'
  stageViewTransition?: boolean
}

export interface ThumbnailStripOptions {
  read: () => ThumbnailStripState
  /** Resolves after the canonical Model, rendered slides and scroll position agree. */
  commit: (index: number, source: NonNullable<ThumbnailSelectionOptions['source']>) => Promise<void>
  wrapSelectCommit?: (commit: () => void, slides: HTMLElement | null, index: number) => void
}

export interface ThumbnailStripResource {
  reconcile: () => void
  select: (index: number, options?: ThumbnailSelectionOptions) => void
  dispose: () => void
}

type Selection = {
  index: number
  indexSeen: boolean
  track: HTMLElement
  scrub: Animation | undefined
  called: boolean
  skipTransition: (() => void) | undefined
}

const MANAGED_STYLES = [
  'transform',
  'animation',
  'padding-inline-start',
  'padding-inline-end',
  '--lightbox-thumbnail-strip-travel',
]

/** Native scroll-linked projection; the Foldkit Model remains the index authority. */
export function attachThumbnailStrip(
  slides: HTMLElement,
  root: HTMLElement,
  options: ThumbnailStripOptions,
) {
  const win = root.ownerDocument.defaultView
  if (!win) {
    const returnValue: ThumbnailStripResource = {
      reconcile: () => {},
      select: () => {},
      dispose: () => {},
    }
    return returnValue
  }
  let track: HTMLElement | undefined
  let restoreTrack: (() => void) | undefined
  let travels: number[] = []
  let link: Animation | undefined
  let selection: Selection | undefined
  let disposed = false
  let frame = 0
  let handoffFrame = 0
  let scrollIdle = 0
  let nativeScrolling = false
  let lastIndex = options.read().index
  let lastDirection = options.read().dir
  let lastX = 0
  let linkDirection = lastDirection
  const observed = new Set<Element>()
  const originalPositioned = root.getAttribute('data-positioned')
  const originalScrubbing = root.getAttribute('data-scrubbing')
  const dialog = slides.closest('[data-ramka-content]') ?? slides.closest('dialog')

  const restoreAttribute = (name: string, value: string | null) => {
    if (value === null) root.removeAttribute(name)
    else root.setAttribute(name, value)
  }

  const stopLink = () => {
    link?.cancel()
    link = undefined
  }

  const clearSelection = (pin = true) => {
    const previous = selection
    selection = undefined
    if (!previous) return
    if (pin)
      previous.track.style.transform = `translate3d(${readComputedTranslateX(previous.track)}px, 0, 0)`
    previous.skipTransition?.()
    previous.scrub?.cancel()
    if (handoffFrame) win.cancelAnimationFrame(handoffFrame)
    handoffFrame = 0
    root.removeAttribute('data-scrubbing')
  }

  const measure = () => {
    const current =
      root.querySelector<HTMLElement>('[data-ramka-thumbnail-strip-track]') ?? undefined
    if (current !== track) {
      clearSelection(false)
      stopLink()
      restoreTrack?.()
      track = current
      travels = []
      if (track) {
        const savedTrack = track
        const saved = MANAGED_STYLES.map((property) => ({
          property,
          value: savedTrack.style.getPropertyValue(property),
          priority: savedTrack.style.getPropertyPriority(property),
        }))
        restoreTrack = () => {
          for (const { property, value, priority } of saved) {
            if (value) savedTrack.style.setProperty(property, value, priority)
            else savedTrack.style.removeProperty(property)
          }
        }
      } else restoreTrack = undefined
    }
    if (!track) return undefined
    const thumbs = [...track.querySelectorAll<HTMLElement>('[data-ramka-thumbnail]')].sort(
      (a, b) => Number(a.getAttribute('data-index')) - Number(b.getAttribute('data-index')),
    )
    const elements = new Set<Element>([
      root,
      slides,
      track,
      ...thumbs,
      ...slides.querySelectorAll('[data-ramka-slide]'),
    ])
    for (const element of observed) {
      if (!elements.has(element)) {
        resizeObserver?.unobserve(element)
        observed.delete(element)
      }
    }
    for (const element of elements) {
      if (!observed.has(element)) {
        resizeObserver?.observe(element)
        observed.add(element)
      }
    }
    const state = options.read()
    const measured = measureThumbTravels(thumbs, state.dir)
    const changed = !thumbTravelsEqual(travels, measured.travels)
    travels = measured.travels
    const first = measured.widths[0] ?? 0
    const last = measured.widths.at(-1) ?? first
    if (!thumbs.length || first <= 0) return undefined
    const width = root.clientWidth
    const geometry = measureSlidesGeometry(slides, state.dir)
    const paddingStart = `${Math.max(0, (width - first) / 2)}px`
    const paddingEnd = `${Math.max(0, (width - last) / 2)}px`
    const travel = `${inlineTrackTranslateX(travels.at(-1) ?? 0, state.dir)}px`
    if (track.style.paddingInlineStart !== paddingStart)
      track.style.paddingInlineStart = paddingStart
    if (track.style.paddingInlineEnd !== paddingEnd) track.style.paddingInlineEnd = paddingEnd
    if (track.style.getPropertyValue('--lightbox-thumbnail-strip-travel') !== travel)
      track.style.setProperty('--lightbox-thumbnail-strip-travel', travel)
    return { track, changed, state, geometry }
  }

  const syncFromScroll = (geometry?: SlidesGeometry) => {
    if (!track || selection?.scrub) return
    const state = options.read()
    const currentGeometry = geometry ?? measureSlidesGeometry(slides, state.dir)
    const progress = slidesScrollProgressAt(readInlineScroll(slides, state.dir), currentGeometry)
    track.style.transform = trackTransform(thumbTravelAtProgress(travels, progress), state.dir)
    lastX = readComputedTranslateX(track)
  }

  const startLink = (force: boolean, geometry: SlidesGeometry) => {
    const ScrollTimeline = getScrollTimelineConstructor()
    const state = options.read()

    if (
      !track ||
      !travels.length ||
      !ScrollTimeline ||
      dialog?.hasAttribute('data-zoomed') ||
      !slidesGeometryIsUniform(geometry)
    )
      return false
    if (!force && link && link.playState !== 'idle' && linkDirection === state.dir) return true
    const pinned = readComputedTranslateX(track)
    track.style.transform = `translate3d(${pinned}px, 0, 0)`
    stopLink()
    track.style.removeProperty('animation')
    try {
      const timeline = new ScrollTimeline({ source: slides, axis: 'inline' })
      const effect = new KeyframeEffect(track, trackTransformKeyframes(travels, state.dir), {
        duration: 1,
        fill: 'both',
        easing: 'linear',
      })
      link = new Animation(effect, timeline)
      link.play()
      linkDirection = state.dir
      return true
    } catch {
      stopLink()
      return false
    }
  }

  const position = (force = false) => {
    if (disposed || selection?.scrub || slides.hasAttribute('data-ssr-shift')) return
    const result = measure()
    if (!result) return
    if (!startLink(force || result.changed, result.geometry)) {
      stopLink()
      syncFromScroll(result.geometry)
    }
    root.setAttribute('data-positioned', '')
  }

  const release = (current: Selection) => {
    if (disposed || selection !== current) return
    const animation = current.scrub
    if (!animation) {
      selection = undefined
      position()
      return
    }
    try {
      animation.commitStyles()
    } catch {}

    const result = measure()
    if (!result || selection !== current) return
    const armed = startLink(true, result.geometry)
    const liveLink = link
    const drop = () => {
      handoffFrame = 0
      if (disposed || selection !== current) return
      selection = undefined
      animation.cancel()
      root.removeAttribute('data-scrubbing')
      if (armed && link === liveLink) current.track.style.removeProperty('transform')
      else {
        stopLink()
        syncFromScroll()
      }
      lastX = readComputedTranslateX(current.track)
      root.setAttribute('data-positioned', '')
    }
    if (armed && liveLink) {
      void liveLink.ready.then(() => {
        if (disposed || selection !== current) return
        handoffFrame = win.requestAnimationFrame(() => {
          handoffFrame = win.requestAnimationFrame(drop)
        })
      }, drop)
    } else drop()
  }

  const createSelection = (index: number, fromX: number) => {
    const result = measure()
    if (!result) return undefined
    clearSelection()
    const current: Selection = {
      index,
      indexSeen: options.read().index === index,
      track: result.track,
      scrub: undefined,
      called: false,
      skipTransition: undefined,
    }
    selection = current
    const toX = inlineTrackTranslateX(travels[index] ?? 0, result.state.dir)
    if (
      result.state.scrubOnSelect &&
      !result.state.reducedMotion &&
      typeof result.track.animate === 'function' &&
      Math.abs(fromX - toX) >= 0.5
    ) {
      result.track.style.transform = `translate3d(${fromX}px, 0, 0)`
      void result.track.offsetWidth
      stopLink()
      try {
        const animation = result.track.animate(
          [
            { transform: `translate3d(${fromX}px, 0, 0)` },
            { transform: `translate3d(${toX}px, 0, 0)` },
          ],
          { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
        )
        animation.pause()
        animation.currentTime = 0
        current.scrub = animation
        void animation.finished.then(
          () => release(current),
          () => {
            if (selection !== current || disposed) return
            selection = undefined
            root.removeAttribute('data-scrubbing')
            position(true)
          },
        )
      } catch {
        current.scrub = undefined
      }
    }
    const returnValue: Selection | undefined = current
    return returnValue
  }

  const reconcile = () => {
    if (disposed) return
    const state = options.read()
    if (state.dir !== lastDirection) {
      clearSelection()
      stopLink()
      lastDirection = state.dir
    }
    if (selection) {
      if (state.index === selection.index) selection.indexSeen = true
      else if (selection.indexSeen || state.index !== lastIndex) clearSelection()
      if (selection) {
        lastIndex = state.index
        return
      }
    }
    const changed = state.index !== lastIndex
    lastIndex = state.index
    if (changed && !state.scrolling && !nativeScrolling && track) {
      const current = createSelection(state.index, lastX)
      if (current?.scrub) {
        current.called = true
        root.setAttribute('data-scrubbing', '')
        current.scrub.play()
        return
      }
      selection = undefined
    }
    position()
    if (track) lastX = readComputedTranslateX(track)
  }

  const schedule = () => {
    if (disposed || frame) return
    frame = win.requestAnimationFrame(() => {
      frame = 0
      reconcile()
    })
  }
  const resizeObserver =
    typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
  resizeObserver?.observe(root)
  observed.add(root)
  const mutationObserver = new MutationObserver(schedule)
  mutationObserver.observe(root, { childList: true, subtree: true })
  const zoomObserver = new MutationObserver(schedule)
  if (dialog) zoomObserver.observe(dialog, { attributes: true, attributeFilter: ['data-zoomed'] })

  const onNativeInput = () => {
    nativeScrolling = true
    const interrupted = selection !== undefined
    clearSelection()
    if (interrupted) position(true)
    if (scrollIdle) win.clearTimeout(scrollIdle)
    scrollIdle = win.setTimeout(() => {
      nativeScrolling = false
      scrollIdle = 0
    }, 180)
  }
  const onScroll = () => {
    if (nativeScrolling) onNativeInput()
    schedule()
  }
  slides.addEventListener('wheel', onNativeInput, { passive: true })
  slides.addEventListener('pointerdown', onNativeInput, { passive: true })
  slides.addEventListener('scroll', onScroll, { passive: true })
  win.addEventListener('resize', schedule)

  const watchTransition = (transition: unknown, current: Selection) => {
    if (typeof transition !== 'object' || transition === null) return
    if ('skipTransition' in transition && typeof transition.skipTransition === 'function') {
      const skip = transition.skipTransition
      current.skipTransition = () => skip.call(transition)
    }
    if ('ready' in transition && transition.ready instanceof Promise)
      void transition.ready.catch(() => {})
    if ('finished' in transition && transition.finished instanceof Promise)
      void transition.finished.catch(() => {})
    if ('updateCallbackDone' in transition && transition.updateCallbackDone instanceof Promise)
      void transition.updateCallbackDone.catch(() => {})
  }

  const select = (index: number, selectionOptions: ThumbnailSelectionOptions = {}) => {
    if (
      disposed ||
      options.read().scrolling ||
      !Number.isInteger(index) ||
      index < 0 ||
      index === options.read().index
    )
      return
    const result = measure()
    if (!result || index >= travels.length) return
    const fromX = readComputedTranslateX(result.track)
    const current = createSelection(index, fromX)
    if (!current) return
    // oxlint-disable-next-line landmines-style/no-comments
    // @effect-diagnostics-next-line asyncFunction:off -- Native element View Transition commit requires a Promise.
    const apply = async () => {
      if (disposed || selection !== current) return
      try {
        await options.commit(index, selectionOptions.source ?? 'thumbnail')
        if (disposed || selection !== current) return
        current.indexSeen = options.read().index === index
        lastIndex = options.read().index
        if (current.scrub) {
          root.setAttribute('data-scrubbing', '')
          current.scrub.play()
        } else {
          selection = undefined
          position(true)
        }
      } catch {
        if (selection === current) {
          clearSelection()
          position(true)
        }
      }
    }
    const commit = () => {
      if (disposed || selection !== current || current.called) return
      current.called = true
      const state = options.read()
      if (
        (selectionOptions.stageViewTransition ?? true) &&
        state.selectViewTransition &&
        !state.reducedMotion &&
        'startViewTransition' in slides &&
        typeof slides.startViewTransition === 'function'
      ) {
        try {
          watchTransition(
            slides.startViewTransition(() => apply()),
            current,
          )
          return
        } catch {}
      }
      void apply()
    }
    try {
      if (options.wrapSelectCommit) options.wrapSelectCommit(commit, slides, index)
      else commit()
    } catch (error) {
      if (selection === current) {
        clearSelection()
        position(true)
      }
      throw error
    }
  }

  reconcile()
  const returnValue: ThumbnailStripResource = {
    reconcile,
    select,
    dispose: () => {
      if (disposed) return
      disposed = true
      clearSelection(false)
      stopLink()
      if (frame) win.cancelAnimationFrame(frame)
      if (handoffFrame) win.cancelAnimationFrame(handoffFrame)
      if (scrollIdle) win.clearTimeout(scrollIdle)
      resizeObserver?.disconnect()
      mutationObserver.disconnect()
      zoomObserver.disconnect()
      slides.removeEventListener('wheel', onNativeInput)
      slides.removeEventListener('pointerdown', onNativeInput)
      slides.removeEventListener('scroll', onScroll)
      win.removeEventListener('resize', schedule)
      restoreTrack?.()
      restoreAttribute('data-positioned', originalPositioned)
      restoreAttribute('data-scrubbing', originalScrubbing)
    },
  }
  return returnValue
}
