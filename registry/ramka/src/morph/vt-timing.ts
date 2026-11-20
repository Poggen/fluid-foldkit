/** @license
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
import { LightboxDocumentDataAttributes } from './lightbox-data-attributes.js'

type EasingFn = (t: number) => number

function cubicBezierEasing(x1: number, y1: number, x2: number, y2: number) {
  const sample = (t: number, p1: number, p2: number) =>
    (1 - 3 * p2 + 3 * p1) * t * t * t + (3 * p2 - 6 * p1) * t * t + 3 * p1 * t
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    let t = x
    for (let i = 0; i < 32; i++) {
      const cx = sample(t, x1, x2)
      if (Math.abs(cx - x) < 1e-6) break
      if (cx < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return sample(t, y1, y2)
  }
}

function protectedSpring(zeta: number, a: number, q: number) {
  const z = Math.min(Math.max(zeta, 0.2), 1)

  const vSeg = ((2 * q) / a) * (1 - a)
  const v = vSeg / (1 - q)
  let seg: (u: number) => number
  if (z >= 1) {
    const A = 9.2
    const C = A - v
    const f = (u: number) => Math.exp(-A * u) * (1 + C * u)
    const end = 1 - f(1)
    seg = (u) => (1 - f(u)) / end
  } else {
    const alpha = 6.9
    const omega = alpha / z
    const wd = omega * Math.sqrt(1 - z * z)
    const B = (alpha - v) / wd
    const f = (u: number) => Math.exp(-alpha * u) * (Math.cos(wd * u) + B * Math.sin(wd * u))
    const end = 1 - f(1)
    seg = (u) => (1 - f(u)) / end
  }
  return (p: number) => {
    if (p <= 0) return 0
    if (p >= 1) return 1
    if (p < a) return q * Math.pow(p / a, 2)
    return q + (1 - q) * seg((p - a) / (1 - a))
  }
}

/** Names a consumer can pass as `viewTransition` on `Lightbox.Root`. */
type LightboxViewTransitionPreset = 'default' | 'snappy' | 'relaxed' | 'spring'

interface ViewTransitionTimingSpec {
  /** Total morph duration in ms — also drives the crossfade and root fade. */
  duration: number
  /** Exact numeric curve sampled by the composited morph. */
  ease: EasingFn
  /**
   * CSS equivalent (or nearest bezier approximation for springs) for tracks
   * the composited morph does not drive: the stock `::view-transition-group`
   * fallback and the *open* trigger↔item crossfade dissolve.
   */
  cssEasing: string
  /**
   * Close snapshot dissolve. Not the morph ease-out (that reveals a
   * stretched trigger in the first frames) and not a strong ease-in (that
   * holds the item through the shrink). Modest ease-out on a shorter
   * complementary window so the mix finishes before the size settle without
   * a see-through gap.
   */
  cssCrossfadeCloseEasing: string
  /** CSS easing for the root snapshot fade (`::view-transition-old/new(root)`). */
  cssRootEasing: string
}

const ROOT_FADE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'

const CROSSFADE_CLOSE_EASING = 'cubic-bezier(0.22, 0, 0.35, 1)'

const bezierSpec = (duration: number, x1: number, y1: number, x2: number, y2: number) => {
  const cssEasing = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`
  return {
    duration,
    ease: cubicBezierEasing(x1, y1, x2, y2),
    cssEasing,
    cssCrossfadeCloseEasing: CROSSFADE_CLOSE_EASING,
    cssRootEasing: ROOT_FADE_EASING,
  }
}

/**
 * The curated timing presets. Every entry was A/B tested on-device (iPhone
 * incl. Low Power Mode, Android Firefox) against the pre-composited-morph
 * timing (340ms sheet curve, cubic-bezier(.32,.72,0,1)). All are "skip-safe":
 * enough travel is moved out of WebKit's swallowed first ~100ms (see the
 * WebKit branch in vt-composited-morph's `upgrade`) that the start doesn't
 * teleport, while keeping a fast middle and long settle.
 *
 * This table is the reason timing is a preset, not free-form CSS: arbitrary
 * curves (anything with a hot launch) teleport on iOS and there is no
 * runtime workaround.
 */
const VIEW_TRANSITION_PRESETS: Record<LightboxViewTransitionPreset, ViewTransitionTimingSpec> = {
  /** The sheet-curve family with a tamed launch — the shipped default. */
  default: bezierSpec(360, 0.44, 0.58, 0, 1),
  /** Same family, hotter launch and standard length — reads quicker. */
  snappy: bezierSpec(340, 0.38, 0.66, 0, 1),
  /** Softer launch and longer settle — calmer, editorial feel. */
  relaxed: bezierSpec(400, 0.48, 0.5, 0, 1),
  /** Critically damped spring with a protected launch — Photos-style settle. */
  spring: {
    duration: 450,
    ease: protectedSpring(1, 0.22, 0.08),

    cssEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    cssCrossfadeCloseEasing: CROSSFADE_CLOSE_EASING,
    cssRootEasing: ROOT_FADE_EASING,
  },
}

function isViewTransitionPreset(value: unknown): value is LightboxViewTransitionPreset {
  return typeof value === 'string' && value in VIEW_TRANSITION_PRESETS
}

/**
 * Resolve a `viewTransition` prop value to its timing spec. `true` (and any
 * unknown string, defensively) maps to the default preset.
 */
function resolveViewTransitionTiming(preset: boolean | LightboxViewTransitionPreset | undefined) {
  return isViewTransitionPreset(preset)
    ? VIEW_TRANSITION_PRESETS[preset]
    : VIEW_TRANSITION_PRESETS.default
}

/**
 * The morph's active timing, identical in every browser: the Root's
 * `viewTransition` preset, published on `documentElement` as
 * `data-ramka-vt-preset` for the duration of the transition, falling back to
 * the `default` preset.
 */
function morphTiming(document: Document) {
  const presetAttr =
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute(LightboxDocumentDataAttributes.viewTransitionPreset)
      : null
  const { duration, ease } = resolveViewTransitionTiming(
    isViewTransitionPreset(presetAttr) ? presetAttr : undefined,
  )
  return { duration, ease }
}

export { morphTiming, resolveViewTransitionTiming, isViewTransitionPreset, VIEW_TRANSITION_PRESETS }
export type { LightboxViewTransitionPreset, ViewTransitionTimingSpec, EasingFn }
