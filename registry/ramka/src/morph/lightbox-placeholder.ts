/** @license
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
/**
 * Open-morph placeholder paint. `Lightbox.Item` owns *when* to paint and
 * restore; this module only draws the trigger thumbnail into a `<canvas>`
 * underlay on a non-replaced host (`Lightbox.Media` or an explicit `morphRef`).
 */

export interface CanvasPlaceholderArgs {
  img: HTMLImageElement | HTMLVideoElement
  source: HTMLImageElement | null
  fit: 'contain' | 'cover'
  objectPosition: string
  /**
   * Non-replaced host that already owns the morph (`Lightbox.Media` or an
   * explicit Item `morphRef`). Required — we never insert into `img.parentElement`
   * or retarget the morph to a mystery wrapper (that stretched under Zoom).
   */
  host: HTMLElement
}

/**
 * Resolve an `object-position` string into the fraction (0..1) of the free
 * space (`box - drawn`) to offset the drawn image on each axis. Mirrors CSS:
 * a single value sets the horizontal axis and centers the vertical; keywords
 * and percentages are honored, other lengths fall back to centered. Used to
 * place the canvas placeholder's letterbox rect the same way `object-position`
 * would place the live image.
 */
export function resolveObjectPosition(objectPosition: string, freeX: number, freeY: number) {
  const axisFraction = (token: string | undefined, axis: 'x' | 'y') => {
    if (!token) return 0.5
    if (token === 'center') return 0.5
    if (token === (axis === 'x' ? 'left' : 'top')) return 0
    if (token === (axis === 'x' ? 'right' : 'bottom')) return 1
    if (token.endsWith('%')) {
      const pct = Number.parseFloat(token)
      return Number.isFinite(pct) ? pct / 100 : 0.5
    }
    return 0.5
  }
  const parts = (objectPosition || '').trim().split(/\s+/)
  return {
    x: freeX * axisFraction(parts[0], 'x'),
    y: freeY * axisFraction(parts[1] ?? 'center', 'y'),
  }
}

/**
 * Paint the trigger thumbnail into a `<canvas>` placed behind the destination
 * `<img>` as the open-morph bridge, returning a restore fn — or `null` when a
 * canvas can't be used (no 2D context, no decoded source, unresolved box) so the
 * caller falls back to the CSS-background placeholder.
 *
 * A canvas is used instead of a `background-image`/`<img>` because it's a
 * pre-rasterized bitmap: `drawImage` of the already-decoded trigger thumbnail is
 * synchronous, so unlike an async image decode (which WebKit does per-draw-size
 * and often *after* it captures the view-transition "new" snapshot) the pixels
 * are guaranteed present in the snapshot and across the VT→live handoff — no
 * blank frame, no fallback to the opaque trigger snapshot, no late letterboxing.
 */
export function tryPaintCanvasPlaceholder(args: CanvasPlaceholderArgs) {
  const { img, source, fit, objectPosition, host } = args
  if (!source) return null

  const natW = source.naturalWidth
  const natH = source.naturalHeight
  if (!(source.complete && natW > 0 && natH > 0)) return null

  if (host === img) return null

  const boxW = img.clientWidth || host.clientWidth
  const boxH = img.clientHeight || host.clientHeight
  if (!(boxW > 0 && boxH > 0)) return null

  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D | null
  try {
    canvas = host.ownerDocument.createElement('canvas')
    ctx = canvas.getContext('2d')
  } catch {
    return null
  }
  if (!ctx) return null

  const dpr = Math.min(host.ownerDocument.defaultView?.devicePixelRatio || 1, 3)
  canvas.width = Math.max(1, Math.round(boxW * dpr))
  canvas.height = Math.max(1, Math.round(boxH * dpr))
  canvas.setAttribute('data-ramka-placeholder', '')
  const cstyle = canvas.style
  cstyle.position = 'absolute'
  cstyle.top = '0'
  cstyle.insetInlineStart = '0'
  cstyle.width = '100%'
  cstyle.height = '100%'
  cstyle.zIndex = '-1'
  cstyle.pointerEvents = 'none'

  const scale =
    fit === 'cover' ? Math.max(boxW / natW, boxH / natH) : Math.min(boxW / natW, boxH / natH)
  const drawW = natW * scale
  const drawH = natH * scale
  const { x: posX, y: posY } = resolveObjectPosition(objectPosition, boxW - drawW, boxH - drawH)

  try {
    ctx.scale(dpr, dpr)

    ctx.drawImage(source, posX, posY, drawW, drawH)
  } catch {
    return null
  }

  const savedPosition = host.style.position
  const savedIsolation = host.style.isolation
  const savedPositionPriority = host.style.getPropertyPriority('position')
  const savedIsolationPriority = host.style.getPropertyPriority('isolation')
  if (host.ownerDocument.defaultView?.getComputedStyle(host).position === 'static')
    host.style.position = 'relative'
  host.style.isolation = 'isolate'

  host.insertBefore(canvas, host.firstChild)

  return () => {
    canvas.remove()
    if (savedPosition) host.style.setProperty('position', savedPosition, savedPositionPriority)
    else host.style.removeProperty('position')
    if (savedIsolation) host.style.setProperty('isolation', savedIsolation, savedIsolationPriority)
    else host.style.removeProperty('isolation')
  }
}
