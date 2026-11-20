/* @license Ramka bf58a38. MIT. Copyright (c) 2026 Artur Bień. */

/** Reading direction of the text. Mirrors the HTML `dir` attribute. */
export type TextDirection = 'ltr' | 'rtl'

/**
 * Scroll position as a distance from the inline-start edge (never negative).
 *
 * The `|| 0` normalizes the `-0` that negating zero yields. A scroller treats
 * the two identically, but `-0` leaks into `Object.is` comparisons and
 * serialized state, so keep it out of the inline space entirely.
 */
export function readInlineScroll(viewport: HTMLElement, dir: TextDirection) {
  return dir === 'rtl' ? -viewport.scrollLeft || 0 : viewport.scrollLeft
}

/** Scroll to an inline-start distance. */
export function writeInlineScroll(viewport: HTMLElement, dir: TextDirection, inline: number) {
  viewport.scrollLeft = dir === 'rtl' ? -inline || 0 : inline
}

/**
 * Distance from a reference box's inline-start edge, given a physical `left`
 * offset measured from that box's *left* edge.
 *
 * RTL mirrors the axis around `referenceWidth`, so the caller has to pass the
 * box `left` is actually relative to. For `offsetLeft` inside a scroller that is
 * the client box, not the scroll box: RTL content packs against the right edge
 * of the client box and overflows leftward, giving later children negative
 * offsets. Mirroring around `scrollWidth` instead shifts every result by the
 * overflow — a bug that unit tests will happily agree with, since the fixture
 * and the implementation share the assumption.
 *
 * `referenceWidth` is ignored in LTR, where `left` is already the inline offset.
 */
export function toInlineOffset(
  left: number,
  width: number,
  referenceWidth: number,
  dir: TextDirection,
) {
  return dir === 'rtl' ? referenceWidth - (left + width) : left
}

/**
 * Index step for a navigation arrow key, or `0` for keys that don't navigate.
 * Vertical keys follow document order; horizontal keys mirror under RTL so
 * `ArrowLeft` advances an RTL carousel.
 */
export function arrowKeyIndexDelta(key: string, dir: TextDirection) {
  let delta = 0
  switch (key) {
    case 'ArrowRight':
      delta = dir === 'rtl' ? -1 : 1
      break
    case 'ArrowLeft':
      delta = dir === 'rtl' ? 1 : -1
      break
    case 'ArrowDown':
      delta = 1
      break
    case 'ArrowUp':
      delta = -1
      break
  }
  return delta
}

/**
 * Sign mapping a physical x delta onto the inline axis: `+1` in LTR, `-1` in
 * RTL. Lets a caller turn measured physical distances into inline ones without
 * knowing the width of the box they sit in — the box origin cancels out of any
 * delta between two positions inside it.
 */
export function inlineAxisSign(dir: TextDirection) {
  return dir === 'rtl' ? -1 : 1
}

/**
 * Physical `translateX` that brings an inline travel distance onto the midline.
 * A track slides opposite its travel, so the sign flips with direction.
 */
export function inlineTrackTranslateX(travel: number, dir: TextDirection) {
  return -travel * inlineAxisSign(dir)
}
