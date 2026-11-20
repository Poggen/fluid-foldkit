import { isFirefox } from './is-firefox.js'

/** Bounded, abortable preparation; no media work runs inside the VT update. */
export function untilAbort<T>(promise: PromiseLike<T>, signal: AbortSignal) {
  if (signal.aborted) return Promise.resolve<T | undefined>(undefined)
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line newPromise:off -- Bridge native Promise completion and AbortSignal cancellation without adding a capture scheduler.
  return new Promise<T | undefined>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort)
      resolve(undefined)
    }
    signal.addEventListener('abort', abort, { once: true })
    Promise.resolve(promise).then(
      (value) => {
        signal.removeEventListener('abort', abort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
  })
}

export function pendingImage(target: HTMLElement | null) {
  const image = target?.matches('img') ? target : target?.querySelector('img')
  if (
    !image ||
    !('decode' in image) ||
    typeof image.decode !== 'function' ||
    !('complete' in image) ||
    !('naturalWidth' in image)
  )
    return null
  if (image.complete && typeof image.naturalWidth === 'number' && image.naturalWidth > 0)
    return null
  const Image = image.ownerDocument.defaultView?.HTMLImageElement
  return Image && image instanceof Image ? image : null
}

// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line asyncFunction:off -- Bound native image.decode readiness before the browser View Transition snapshot.
export async function decodeImage(image: HTMLImageElement, maxWait: number, signal: AbortSignal) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await untilAbort(
      Promise.race([
        Promise.resolve()
          .then(() => image.decode())
          .catch(() => {}),
        // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
        // @effect-diagnostics-next-line newPromise:off -- Race native image.decode against its browser timeout at the same Promise boundary.
        new Promise<void>((resolve) => {
          // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
          // @effect-diagnostics-next-line globalTimers:off -- Native decode timeout is cleared in finally and bounded by the transition AbortSignal.
          timer = setTimeout(resolve, maxWait)
        }),
      ]),
      signal,
    )
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line asyncFunction:off -- Expose native requestAnimationFrame completion to the View Transition Promise callback.
export async function renderFrames(document: Document, frames: number, signal: AbortSignal) {
  const window = document.defaultView
  if (!window || signal.aborted) return
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line newPromise:off -- Bridge browser frame callbacks and synchronous AbortSignal cleanup.
  await new Promise<void>((resolve) => {
    let handle = 0
    const done = () => {
      window.cancelAnimationFrame(handle)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const tick = () => {
      if (--frames <= 0) done()
      else handle = window.requestAnimationFrame(tick)
    }
    signal.addEventListener('abort', done, { once: true })
    handle = window.requestAnimationFrame(tick)
  })
}

/** Engine signals take precedence over spoofed/reduced UA strings. */
export function isAndroidBlinkSnapshotRoot(document: Document) {
  const window = document.defaultView
  if (!window || 'GestureEvent' in window || isFirefox(document)) return false
  const navigator = window.navigator
  const data = 'userAgentData' in navigator ? navigator.userAgentData : undefined
  const mobile =
    typeof data === 'object' &&
    data !== null &&
    'mobile' in data &&
    typeof data.mobile === 'boolean'
      ? data.mobile
      : /Android/i.test(navigator.userAgent)
  return mobile && ('chrome' in window || /Chrome\//i.test(navigator.userAgent))
}

/** Upstream Android Blink snapshot-root stabilization, bounded to 1.5s. */
export function settleSnapshotRoot(document: Document, signal: AbortSignal) {
  const window = document.defaultView
  if (!window || !isAndroidBlinkSnapshotRoot(document)) return
  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line asyncFunction:off -- Sample Android visualViewport on native browser frames before starting View Transition capture.
  return (async () => {
    const started = window.performance.now()
    let previous = ''
    let stable = 0
    while (!signal.aborted) {
      const visualHeight = window.visualViewport?.height
      const aligned = visualHeight == null || Math.abs(window.innerHeight - visualHeight) <= 1
      const key = `${window.innerWidth}x${window.innerHeight}|${visualHeight}|${Math.round(window.scrollX)},${Math.round(window.scrollY)}`
      stable = key === previous && aligned ? stable + 1 : 0
      previous = key
      const elapsed = window.performance.now() - started
      if (stable >= 8 || (elapsed >= 1000 && aligned) || elapsed >= 1500) return
      await renderFrames(document, 1, signal)
    }
  })()
}

/** Held only by the document's single running morph; removed even on abort. */
export function guardTouch(document: Document) {
  let touchInFlight = false
  let released = false
  const start = () => {
    touchInFlight = true
  }
  const cancel = (event: TouchEvent) => {
    if (event.cancelable) event.preventDefault()
  }
  const detach = () => {
    document.removeEventListener('touchstart', start, { capture: true })
    document.removeEventListener('touchmove', cancel, { capture: true })
    document.removeEventListener('touchend', settled, { capture: true })
    document.removeEventListener('touchcancel', settled, { capture: true })
  }
  const settled = (event: TouchEvent) => {
    if (event.touches.length > 0) return
    touchInFlight = false
    if (released) detach()
  }
  document.addEventListener('touchstart', start, { capture: true, passive: true })
  document.addEventListener('touchmove', cancel, { capture: true, passive: false })
  document.addEventListener('touchend', settled, { capture: true, passive: true })
  document.addEventListener('touchcancel', settled, { capture: true, passive: true })
  return () => {
    released = true

    if (!touchInFlight) detach()
  }
}
