/* @license Ramka bf58a38. MIT. Copyright (c) 2026 Artur Bień. */

import { toInlineOffset, type TextDirection } from './lightbox-direction.js'

function slideOffsetLeftInViewport(slide: HTMLElement, viewport: HTMLElement) {
  if (slide.offsetParent === viewport) {
    return slide.offsetLeft
  }

  if (slide.offsetParent === viewport.offsetParent) {
    return slide.offsetLeft - viewport.offsetLeft
  }

  return (
    slide.getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft
  )
}

export const SLIDE_SELECTOR = '[data-ramka-slide]'

export interface SlidesGeometry {
  /**
   * Inline scroll position that centers each slide (length = `count`). Prefer
   * this over `base + index * step` when slide widths can differ.
   */
  offsets: number[]
  /** Inline position that centers slide 0 (`offsets[0]`). */
  base: number
  /**
   * Stride between slide 0 and 1 when the track is uniform. Kept for callers
   * that only need a representative step; navigation should use `offsets`.
   */
  step: number
  /** Number of slide boxes measured. */
  count: number
}

/**
 * Measure per-slide snap offsets from layout values, as inline positions.
 */
export function measureSlidesGeometry(viewport: HTMLElement, dir: TextDirection = 'ltr') {
  const slides = viewport.querySelectorAll<HTMLElement>(SLIDE_SELECTOR)
  const count = slides.length
  const clientWidth = viewport.clientWidth || 1
  if (count === 0) {
    const empty: SlidesGeometry = { offsets: [], base: 0, step: clientWidth, count: 0 }
    return empty
  }

  const referenceWidth = dir === 'rtl' ? clientWidth : 0

  const offsets = Array.from(slides, (slide) => {
    const width = slide.offsetWidth || clientWidth
    const left = toInlineOffset(
      slideOffsetLeftInViewport(slide, viewport),
      width,
      referenceWidth,
      dir,
    )

    return left + width / 2 - clientWidth / 2
  })
  const base = offsets[0] ?? 0
  const rawStep = count > 1 ? Number(offsets[1]) - Number(offsets[0]) : clientWidth
  const step = rawStep > 0 ? rawStep : clientWidth
  const geometry: SlidesGeometry = { offsets, base, step, count }
  return geometry
}

/** True when two measurements describe the same snap offsets. */
export function slidesGeometryEqual(a: SlidesGeometry, b: SlidesGeometry) {
  return (
    a.base === b.base &&
    a.step === b.step &&
    a.count === b.count &&
    a.offsets.length === b.offsets.length &&
    a.offsets.every((offset, i) => offset === b.offsets[i])
  )
}

/** True when snap offsets match a uniform `base + i * step` track. */
export function slidesGeometryIsUniform(geometry: SlidesGeometry) {
  const { offsets, count, base, step } = geometry
  if (count < 2 || offsets.length !== count) return true
  return offsets.every((offset, i) => Math.abs(offset - (base + i * step)) < 1)
}

/** Inline position that centers `index`, clamped to the measured range. */
export function slideInlinePositionForIndex(index: number, geometry: SlidesGeometry) {
  const { offsets, count, base, step } = geometry
  if (count <= 0) return 0
  const i = Math.min(Math.max(0, index), count - 1)
  return offsets[i] ?? base + i * step
}

/** Nearest slide index for an inline scroll position. */
export function slideIndexFromInlinePosition(inline: number, geometry: SlidesGeometry) {
  const { offsets, count, base, step } = geometry
  if (count <= 0) return 0
  if (count === 1 || offsets.length === 0) return 0

  if (slidesGeometryIsUniform(geometry) && step > 0) {
    return Math.min(count - 1, Math.max(0, Math.round((inline - base) / step)))
  }

  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < offsets.length; i++) {
    const dist = Math.abs(inline - Number(offsets[i]))
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

/**
 * Logical scroll progress 0→1 over the index range, from an inline position.
 * Piecewise-linear across per-slide snap offsets so variable-width tracks stay
 * aligned with equal-offset thumbnail-strip keyframes (one stop per index).
 */
export function slidesScrollProgressAt(inline: number, geometry: SlidesGeometry) {
  const { offsets, count, base, step } = geometry
  if (count <= 1) return 0

  if (offsets.length === count) {
    const first = Number(offsets[0])
    const last = Number(offsets[count - 1])
    if (inline <= first) return 0
    if (inline >= last) return 1
    for (let i = 0; i < count - 1; i++) {
      const a = Number(offsets[i])
      const b = Number(offsets[i + 1])
      if (inline <= b) {
        const t = (inline - a) / (b - a || 1)
        return (i + t) / (count - 1)
      }
    }
    return 1
  }

  const logicalMax = Math.max(0, count - 1) * step
  if (logicalMax <= 0) return 0
  return Math.min(1, Math.max(0, (inline - base) / logicalMax))
}
