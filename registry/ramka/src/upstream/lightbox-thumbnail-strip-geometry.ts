/* @license Ramka bf58a38. MIT. Copyright (c) 2026 Artur Bień. */

import { inlineAxisSign, inlineTrackTranslateX, type TextDirection } from './lightbox-direction.js'

/**
 * Per-thumb inline travel distances so thumb `i`'s layout center sits on the
 * thumbnail-strip midline at `inlineTrackTranslateX(travels[i], dir)`.
 *
 * Uses `offsetLeft` / `offsetWidth` (layout box), not `getBoundingClientRect`.
 * Rect centers follow the axis-aligned bounding box of CSS transforms — so a
 * consumer `rotate()` on inactive thumbs would shift travel stops and leave the
 * upright active thumb off the indicator. Layout offsets ignore those transforms
 * and still include flex gap. Falls back to rects when offsets collapse (jsdom).
 *
 * Travels are deltas from thumb 0, so the track's own width cancels out and
 * mirroring is a sign flip — no content-box measurement needed.
 */
export function measureThumbTravels(thumbs: HTMLElement[], dir: TextDirection = 'ltr') {
  if (thumbs.length === 0) return { travels: [], widths: [] }

  const sign = inlineAxisSign(dir)
  const layoutWidths = thumbs.map((thumb) => thumb.offsetWidth || 0)
  const layoutCenters = thumbs.map((thumb, i) => thumb.offsetLeft + Number(layoutWidths[i]) / 2)
  const layoutOk =
    layoutWidths.some((w) => w > 0) &&
    (thumbs.length < 2 || layoutCenters.some((c, i) => i > 0 && c !== layoutCenters[0]))

  if (layoutOk) {
    const origin = Number(layoutCenters[0])
    return {
      travels: layoutCenters.map((c) => (c - origin) * sign),
      widths: layoutWidths,
    }
  }

  const widths = thumbs.map((thumb, i) => {
    return thumb.getBoundingClientRect().width || layoutWidths[i] || 0
  })
  const centers = thumbs.map((thumb, i) => {
    const rect = thumb.getBoundingClientRect()
    if (rect.width > 0) return rect.left + rect.width / 2
    return thumb.offsetLeft + Number(widths[i]) / 2
  })
  const origin = Number(centers[0])
  return {
    travels: centers.map((c) => (c - origin) * sign),
    widths,
  }
}

/** Piecewise-linear travel for index-linear scroll progress `0→1`. */
export function thumbTravelAtProgress(travels: number[], progress: number) {
  const max = Math.max(0, travels.length - 1)
  if (max <= 0) return travels[0] ?? 0
  const f = Math.min(1, Math.max(0, progress)) * max
  const i0 = Math.min(max, Math.floor(f))
  const i1 = Math.min(max, i0 + 1)
  const a = travels[i0] ?? 0
  const b = travels[i1] ?? a
  return a + (b - a) * (f - i0)
}

export function thumbTravelsAreUniform(travels: number[]) {
  if (travels.length < 2) return true
  const step = Number(travels[1])
  if (step <= 0) return true
  return travels.every((travel, i) => Math.abs(travel - i * step) < 1)
}

export function thumbTravelsEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(Number(a[i]) - Number(b[i])) > 0.5) return false
  }
  return true
}

/** Physical track transform for an inline travel distance. */
export function trackTransform(travel: number, dir: TextDirection = 'ltr') {
  return `translate3d(${inlineTrackTranslateX(travel, dir)}px, 0, 0)`
}

/**
 * ScrollTimeline / WAAPI keyframes for the track. Uniform thumbs keep the
 * historical two-stop link; variable-width thumbs get one stop per index
 * (equal offsets ↔ index-linear `slidesScrollProgressAt`).
 */
export function trackTransformKeyframes(travels: number[], dir: TextDirection = 'ltr') {
  const max = Math.max(0, travels.length - 1)
  if (max === 0) {
    const keyframes: Keyframe[] = [{ transform: 'translate3d(0px, 0, 0)' }]
    return keyframes
  }
  if (thumbTravelsAreUniform(travels)) {
    const keyframes: Keyframe[] = [
      { transform: 'translate3d(0px, 0, 0)' },
      { transform: trackTransform(travels[max] ?? 0, dir) },
    ]
    return keyframes
  }
  const keyframes: Keyframe[] = travels.map((travel, i) => ({
    offset: i / max,
    transform: trackTransform(travel, dir),
  }))
  return keyframes
}

/** Registered thumbs sorted by index (stable midline / travel measurement). */
export function orderedThumbs(map: Map<number, HTMLElement>) {
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, node]) => node)
}

interface ScrollTimelineOptions {
  source?: Element | null
  axis?: 'block' | 'inline' | 'x' | 'y'
}

type ScrollTimelineConstructor = new (options?: ScrollTimelineOptions) => AnimationTimeline

export function getScrollTimelineConstructor() {
  if (typeof window === 'undefined') return null
  const ctor: ScrollTimelineConstructor | undefined = window.ScrollTimeline
  return typeof ctor === 'function' ? ctor : null
}

/** Current computed translateX (ScrollTimeline / WAAPI / inline sync). */
export function readComputedTranslateX(el: HTMLElement) {
  const raw = getComputedStyle(el).transform
  if (!raw || raw === 'none') return 0
  try {
    return new DOMMatrixReadOnly(raw).m41
  } catch {
    const m = /matrix(?:3d)?\(([^)]+)\)/.exec(raw)
    if (!m) return 0
    const parts = (m[1] ?? '').split(',').map((v) => Number(v.trim()))
    return parts.length === 6 ? Number(parts[4]) : parts.length === 16 ? Number(parts[12]) : 0
  }
}
