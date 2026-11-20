/** @license
 * Open-morph bridge lifecycle adapted from Ramka Lightbox.Item.
 * Copyright (c) 2026 Artur Bień, MIT licensed; see LICENSE and NOTICE.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 */
import { tryPaintCanvasPlaceholder } from './lightbox-placeholder.js'
import { renderFrames, untilAbort } from './readiness.js'

export interface MediaPlaceholder {
  settle(): void
  dispose(): void
}

function imageIn(element: HTMLElement | null) {
  if (!element) return null
  const Constructor = element.ownerDocument.defaultView?.HTMLImageElement
  if (Constructor && element instanceof Constructor) return element
  return element.querySelector('img')
}

function mediaIn(element: HTMLElement) {
  const window = element.ownerDocument.defaultView
  if (
    window &&
    (element instanceof window.HTMLImageElement || element instanceof window.HTMLVideoElement)
  )
    return element
  return element.querySelector<HTMLImageElement | HTMLVideoElement>('img,video')
}

/**
 * Retains the thumbnail until BOTH the open motion and full-resolution paint
 * have completed. Returning the lifecycle separately lets the physical effect
 * outlive transition settlement without retaining application state.
 */
export function createMediaPlaceholder(args: {
  source: HTMLElement | null
  destination: HTMLElement | null
  signal: AbortSignal
  onDispose: () => void
}) {
  const { source: sourceElement, destination, signal, onDispose } = args
  if (!destination || signal.aborted) return null
  const source = imageIn(sourceElement)
  const media = mediaIn(destination)
  const window = destination.ownerDocument.defaultView
  if (
    !source ||
    !media ||
    !window ||
    !source.complete ||
    source.naturalWidth <= 0 ||
    source.naturalHeight <= 0
  )
    return null
  const src = source.currentSrc || source.src
  if (!src) return null
  const video = media instanceof window.HTMLVideoElement ? media : null
  const image = media instanceof window.HTMLImageElement ? media : null
  if (image?.complete && image.naturalWidth > 0) return null
  if (video && (video.readyState >= 2 || video.getAttribute('poster'))) return null
  const css = window.getComputedStyle(media)
  const fit = css.objectFit === 'contain' ? 'contain' : 'cover'
  const replaced = /^(IMG|VIDEO|CANVAS|IFRAME|OBJECT|EMBED|INPUT)$/.test(destination.tagName)
  const host = replaced ? null : destination
  const canvasRestore = host
    ? tryPaintCanvasPlaceholder({
        img: media,
        source,
        fit,
        objectPosition: css.objectPosition,
        host,
      })
    : null
  const restores: (() => void)[] = []
  if (canvasRestore) restores.push(canvasRestore)
  else {
    const properties = [
      'background-image',
      'background-size',
      'background-position',
      'background-repeat',
    ]
    const saved = properties.map((name) => ({
      name,
      value: media.style.getPropertyValue(name),
      priority: media.style.getPropertyPriority(name),
    }))
    restores.push(() => {
      for (const { name, value, priority } of saved) {
        if (value) media.style.setProperty(name, value, priority)
        else media.style.removeProperty(name)
      }
    })

    media.style.backgroundImage = `url(${JSON.stringify(src)})`
    const boxW = media.clientWidth
    const boxH = media.clientHeight
    if (boxW > 0 && boxH > 0) {
      const scale =
        fit === 'contain'
          ? Math.min(boxW / source.naturalWidth, boxH / source.naturalHeight)
          : Math.max(boxW / source.naturalWidth, boxH / source.naturalHeight)
      media.style.backgroundSize = `${source.naturalWidth * scale}px ${source.naturalHeight * scale}px`
    } else media.style.backgroundSize = fit
    media.style.backgroundPosition = css.objectPosition || 'center'
    media.style.backgroundRepeat = 'no-repeat'
  }
  if (host?.hasAttribute('data-ramka-media')) {
    const previous = host.getAttribute('data-placeholder')
    host.setAttribute('data-placeholder', '')
    restores.push(() => {
      if (previous == null) host.removeAttribute('data-placeholder')
      else host.setAttribute('data-placeholder', previous)
    })
  }
  if (video) {
    const previous = video.getAttribute('poster')
    video.setAttribute('poster', src)
    restores.push(() => {
      if (previous == null) video.removeAttribute('poster')
      else video.setAttribute('poster', previous)
    })
  }
  const controller = new AbortController()
  let cleared = false
  let openSettled = false
  let painted = false
  let awaitingPaint = false
  const dispose = () => {
    if (cleared) return
    cleared = true
    controller.abort()
    media.removeEventListener(image ? 'load' : 'loadeddata', load)
    media.removeEventListener('error', dispose)
    signal.removeEventListener('abort', dispose)
    for (const restore of restores.reverse()) restore()
    onDispose()
  }
  const tryRestore = () => {
    if (painted && openSettled) dispose()
  }
  const load = () => {
    if (cleared || awaitingPaint) return
    awaitingPaint = true
    // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
    // @effect-diagnostics-next-line asyncFunction:off -- Native media load waits for image.decode and two browser paint frames before removing the placeholder.
    void (async () => {
      if (image && typeof image.decode === 'function') {
        await untilAbort(
          Promise.resolve()
            .then(() => image.decode())
            .catch(() => {}),
          controller.signal,
        )
      }
      if (controller.signal.aborted) return
      await renderFrames(destination.ownerDocument, 2, controller.signal)
      if (controller.signal.aborted) return
      painted = true
      tryRestore()
    })()
  }
  media.addEventListener(image ? 'load' : 'loadeddata', load)
  media.addEventListener('error', dispose, { once: true })
  signal.addEventListener('abort', dispose, { once: true })

  if ((image?.complete && image.naturalWidth > 0) || (video && video.readyState >= 2)) load()
  const placeholder: MediaPlaceholder = {
    settle() {
      openSettled = true
      tryRestore()
    },
    dispose,
  }
  return placeholder
}
