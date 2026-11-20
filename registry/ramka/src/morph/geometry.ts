/** @license
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
import { isFirefox } from './is-firefox.js'

function splitCssList(value: string) {
  const tokens: string[] = []
  let current = ''
  let depth = 0
  for (const ch of value) {
    if (ch === '(') depth += 1
    else if (ch === ')') depth = Math.max(0, depth - 1)

    if (/\s/.test(ch) && depth === 0) {
      if (current) tokens.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current) tokens.push(current)
  return tokens
}

const NON_FINITE_RADIUS_PX = 1e9

function borderRadiusTokenToPx(token: string, el: HTMLElement, percentBasis: number) {
  const t = token.trim().toLowerCase()
  if (!t) return 0

  if (/infinity/i.test(t)) return NON_FINITE_RADIUS_PX

  if (t.endsWith('%')) {
    const pct = Number.parseFloat(t)
    if (!Number.isFinite(pct)) return NON_FINITE_RADIUS_PX
    return Math.max(0, (percentBasis * pct) / 100)
  }

  const n = Number.parseFloat(t)

  if (!Number.isFinite(n)) return NON_FINITE_RADIUS_PX

  if (t.endsWith('rem')) {
    const rootFs =
      Number.parseFloat(
        el.ownerDocument.defaultView?.getComputedStyle(el.ownerDocument.documentElement).fontSize ??
          '',
      ) || 16
    return Math.max(0, n * rootFs)
  }
  if (t.endsWith('em')) {
    const fs =
      Number.parseFloat(el.ownerDocument.defaultView?.getComputedStyle(el).fontSize ?? '') || 16
    return Math.max(0, n * fs)
  }

  return Math.max(0, n)
}

function roundRadiusPx(v: number) {
  return Math.round(v * 100) / 100
}

/**
 * Resolve an element's border-radius into the **used** px values the VT group
 * can interpolate — matching what the browser actually renders.
 *
 * Tailwind v4 `rounded-full` is `border-radius: calc(infinity * 1px)`. CSS
 * cannot interpolate `infinity` → `8px`, so the morph group's radius animation
 * would stick or jump. Percentages, `rem`/`em`, and the old `9999px` full-pill
 * trick have the same problem relative to a fixed px destination.
 *
 * Corner radii are resolved per the CSS corner-overlap rule
 * (css-backgrounds-3 §5.5): when the sum of adjacent radii overflows an edge,
 * ALL radii are multiplied by the same factor
 * `f = min(1, edge / sum-of-adjacent-radii)` taken over all four edges.
 * Capping each corner independently at half the shorter side (the used pill
 * radius) is only equivalent for uniform radii — for asymmetric radii like
 * `16px 16px 160px 160px` on a wide box it undershoots the large corners, so
 * the close morph would animate toward a flatter shape than the live trigger
 * and visibly snap on the last frame.
 *
 * Note: `getComputedStyle` usually already returns px for `rem`/`em`; we still
 * resolve those units for engines that leave them as specified.
 */
export function resolveMorphBorderRadius(el: HTMLElement) {
  const raw = el.ownerDocument.defaultView?.getComputedStyle(el).borderRadius.trim()
  if (!raw) return '0px'

  const { width, height } = el.getBoundingClientRect()
  if (!(width > 0 && height > 0)) return '0px'

  const horizontal = (raw.split('/')[0] ?? '').trim()
  const tokens = splitCssList(horizontal)
  if (tokens.length === 0) return '0px'

  const [a = '', b = a, c = a, d = b] = tokens
  const tl = borderRadiusTokenToPx(a, el, width)
  const tr = borderRadiusTokenToPx(b, el, width)
  const br = borderRadiusTokenToPx(c, el, width)
  const bl = borderRadiusTokenToPx(d, el, width)

  const f = Math.min(
    1,
    width / (tl + tr),
    width / (bl + br),
    height / (tr + br),
    height / (tl + bl),
  )

  const utl = roundRadiusPx(tl * f)
  const utr = roundRadiusPx(tr * f)
  const ubr = roundRadiusPx(br * f)
  const ubl = roundRadiusPx(bl * f)
  let list: number[]
  if (ubl === utr) {
    if (ubr === utl) {
      list = utr === utl ? [utl] : [utl, utr]
    } else {
      list = [utl, utr, ubr]
    }
  } else {
    list = [utl, utr, ubr, ubl]
  }
  return list.map((v) => `${v}px`).join(' ')
}

const FULL_BLEED_EPS_PX = 0.5

const FIREFOX_FULL_BLEED_CAPTURE_INSET_PX = 1

function getFullBleedAxes(el: HTMLElement) {
  const w = el.offsetWidth
  const h = el.offsetHeight
  if (!(w > 0 && h > 0)) {
    return { horizontal: false, vertical: false }
  }
  const viewportW = el.ownerDocument.documentElement.clientWidth
  const viewportH = el.ownerDocument.documentElement.clientHeight
  return {
    horizontal: w >= viewportW - FULL_BLEED_EPS_PX,
    vertical: h >= viewportH - FULL_BLEED_EPS_PX,
  }
}

type CaptureInsetRestore = () => void

/**
 * Firefox-only capture workaround when the morph target is full-bleed on X
 * and/or Y (both edges of that axis flush with the viewport).
 *
 * Why pad the Slide (not the morph target): Media sizes with `cqw`/`cqh`
 * against Zoom, and Zoom fills the Slide content box. Shrinking Media alone
 * leaves that size container viewport-flush — the same geometry Firefox
 * mishandles. Padding the Slide (what manually fixes the bug) shrinks the
 * content box → Zoom → fit-box Media as one coherent layout, so the named
 * snapshot is no longer edge-to-edge on the affected axis.
 *
 * Close: call before `startViewTransition` (old snapshot).  
 * Open: call inside the VT callback after reveal + naming (new snapshot).
 */
function applyFirefoxFullBleedCaptureInset(morphTarget: HTMLElement) {
  if (!isFirefox(morphTarget.ownerDocument)) return null
  const axes = getFullBleedAxes(morphTarget)
  if (!axes.horizontal && !axes.vertical) return null

  const slide = morphTarget.closest<HTMLElement>('[data-ramka-slide]') ?? morphTarget

  const prevPaddingLeft = slide.style.paddingLeft
  const prevPaddingRight = slide.style.paddingRight
  const prevPaddingTop = slide.style.paddingTop
  const prevPaddingBottom = slide.style.paddingBottom
  const cs = morphTarget.ownerDocument.defaultView?.getComputedStyle(slide)
  if (!cs) return null
  const inset = FIREFOX_FULL_BLEED_CAPTURE_INSET_PX

  if (axes.horizontal) {
    slide.style.paddingLeft = `${(parseFloat(cs.paddingLeft) || 0) + inset}px`
    slide.style.paddingRight = `${(parseFloat(cs.paddingRight) || 0) + inset}px`
  }
  if (axes.vertical) {
    slide.style.paddingTop = `${(parseFloat(cs.paddingTop) || 0) + inset}px`
    slide.style.paddingBottom = `${(parseFloat(cs.paddingBottom) || 0) + inset}px`
  }

  void morphTarget.offsetWidth

  const restore: CaptureInsetRestore = () => {
    slide.style.paddingLeft = prevPaddingLeft
    slide.style.paddingRight = prevPaddingRight
    slide.style.paddingTop = prevPaddingTop
    slide.style.paddingBottom = prevPaddingBottom
  }
  return restore
}

export { applyFirefoxFullBleedCaptureInset }
