/* @license
MIT License

Copyright (c) 2026 Artur Bień

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// @license Adapted from Ramka bf58a38a92f8905a7014f23da38db06f41479c34.

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

export function panOffsetRange(
  contentSize: number,
  zoom: number,
  viewportStart: number,
  viewportEnd: number,
  stageCenter: number,
  minZoom = 1,
) {
  if (zoom <= 0 || contentSize <= 0) {
    const returnValue: { min: number; max: number; overflows: boolean } = {
      min: 0,
      max: 0,
      overflows: false,
    }
    return returnValue
  }

  const viewportSize = viewportEnd - viewportStart
  const viewportCenter = (viewportStart + viewportEnd) / 2
  const alignStart = (viewportStart - stageCenter) / zoom + contentSize / 2
  const alignEnd = (viewportEnd - stageCenter) / zoom - contentSize / 2

  if (contentSize * zoom <= viewportSize + 0.5) {
    const zoomFit = viewportSize / contentSize
    if (!(zoomFit > minZoom + 1e-6) || zoom <= minZoom + 1e-6) {
      const returnValue: { min: number; max: number; overflows: boolean } = {
        min: 0,
        max: 0,
        overflows: false,
      }
      return returnValue
    }
    const t = Math.min(1, Math.max(0, (zoom - minZoom) / (zoomFit - minZoom)))
    const home = t * ((viewportCenter - stageCenter) / zoomFit)
    const returnValue: { min: number; max: number; overflows: boolean } = {
      min: home,
      max: home,
      overflows: false,
    }
    return returnValue
  }

  const returnValue: { min: number; max: number; overflows: boolean } = {
    min: alignEnd,
    max: alignStart,
    overflows: true,
  }
  return returnValue
}

export function scaleZoom(value: number, delta: number, factor: number) {
  return value * Math.min(1 + Math.abs(delta / factor), 2) ** Math.sign(delta)
}

export function pinchPanOffset(
  originOffset: number,
  originFocal: number,
  originZoom: number,
  currentFocal: number,
  currentZoom: number,
) {
  if (!(originZoom > 0) || !(currentZoom > 0)) return originOffset
  return originOffset + currentFocal / currentZoom - originFocal / originZoom
}

export function doubleTapTargetZoom(
  zoom: number,
  minZoom: number,
  maxZoom: number,
  zoomStep: number,
) {
  return zoom > minZoom ? minZoom : Math.min(zoomStep, maxZoom)
}

export const PINCH_ENGAGE_SPREAD = 10

export function pinchZoom(initialZoom: number, initialDistance: number, currentDistance: number) {
  return (initialZoom / initialDistance) * currentDistance
}

/** Spread (px) that engages zoom while the fingers are clearly panning together. */
export const PINCH_ENGAGE_SPREAD_PAN = 28

/** Extra pan-mode slop as a fraction of the starting finger span. */
export const PINCH_ENGAGE_SPREAD_PAN_RATIO = 0.14

/** Cosine similarity above this → both fingers travel as a pair. */
export const PINCH_PAN_ALIGNMENT = 0.6

/** Each finger must travel this far (px) before alignment is trusted. */
export const PINCH_ALIGNMENT_MIN_TRAVEL = 10

/** Centroid travel (px) that can mark the gesture pan-dominant. */
export const PINCH_PAN_TRAVEL = 14

/** Pan travel must exceed spread by this factor to count as pan-dominant. */
export const PINCH_PAN_DOMINANCE = 1.35

/** Cosine of the two fingers' displacement vectors, or `null` if either has not moved enough. */
export function pinchFingerAlignment(
  a0x: number,
  a0y: number,
  a1x: number,
  a1y: number,
  b0x: number,
  b0y: number,
  b1x: number,
  b1y: number,
  minTravel = PINCH_ALIGNMENT_MIN_TRAVEL,
) {
  const dax = a1x - a0x
  const day = a1y - a0y
  const dbx = b1x - b0x
  const dby = b1y - b0y
  const la = Math.hypot(dax, day)
  const lb = Math.hypot(dbx, dby)
  if (la < minTravel || lb < minTravel) return null
  const returnValue: number | null = (dax * dbx + day * dby) / (la * lb)
  return returnValue
}

/** True when the fingers are sliding as a pair, not spreading. */
export function isTwoFingerPanIntent(
  spreadDelta: number,
  panTravel: number,
  alignment: number | null,
) {
  if (alignment != null && alignment >= PINCH_PAN_ALIGNMENT) return true
  return panTravel >= PINCH_PAN_TRAVEL && panTravel > spreadDelta * PINCH_PAN_DOMINANCE
}

/** Spread (px) required before zoom may change, given the current intent. */
export function pinchEngageSpread(initialDistance: number, panIntent: boolean) {
  if (panIntent) {
    return Math.max(PINCH_ENGAGE_SPREAD_PAN, initialDistance * PINCH_ENGAGE_SPREAD_PAN_RATIO)
  }
  return PINCH_ENGAGE_SPREAD
}

export interface ResolvePinchZoomInput {
  initialZoom: number
  /** Distance baseline — the contact span, or the slop-adjusted span after engage. */
  initialDistance: number
  currentDistance: number
  engaged: boolean
  alignment: number | null
  panTravel: number
}

export interface ResolvedPinchZoom {
  zoom: number
  engaged: boolean
  baselineDistance: number
}

/**
 * Live pinch scale with iOS-style begin slop.
 *
 * Until the gesture is clearly a pinch, zoom stays at `initialZoom` (pan
 * still runs). A two-finger slide uses a larger slop so span jitter cannot
 * scale the image. When zoom first engages during a pan, the slop is eaten
 * so scale starts at 1 relative to the engage point (no pop). A decisive
 * pinch keeps the original baseline so a fast spread is not discarded.
 */
export function resolvePinchZoom(input: ResolvePinchZoomInput) {
  const { initialZoom, initialDistance, currentDistance, engaged, alignment, panTravel } = input
  if (!(initialDistance > 0)) {
    const returnValue: ResolvedPinchZoom = {
      zoom: initialZoom,
      engaged,
      baselineDistance: Math.max(initialDistance, 1),
    }
    return returnValue
  }

  const spreadDelta = Math.abs(currentDistance - initialDistance)
  const panIntent = isTwoFingerPanIntent(spreadDelta, panTravel, alignment)
  const gate = pinchEngageSpread(initialDistance, panIntent)

  if (!engaged) {
    if (spreadDelta <= gate) {
      const returnValue: ResolvedPinchZoom = {
        zoom: initialZoom,
        engaged: false,
        baselineDistance: initialDistance,
      }
      return returnValue
    }
    const signed = currentDistance - initialDistance
    const baseline = panIntent ? initialDistance + Math.sign(signed || 1) * gate : initialDistance
    const returnValue: ResolvedPinchZoom = {
      zoom: pinchZoom(initialZoom, baseline, currentDistance),
      engaged: true,
      baselineDistance: baseline,
    }
    return returnValue
  }

  const returnValue: ResolvedPinchZoom = {
    zoom: pinchZoom(initialZoom, initialDistance, currentDistance),
    engaged: true,
    baselineDistance: initialDistance,
  }
  return returnValue
}

export function computePullVelocity(samples: readonly { y: number; t: number }[]) {
  if (samples.length < 2) return 0
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (!first || !last) return 0
  const dt = last.t - first.t
  if (dt === 0) return 0
  return ((last.y - first.y) / dt) * 1000
}

export function resolveDragAxis(deltaX: number, deltaY: number, lockDistance: number): GestureAxis
export function resolveDragAxis(deltaX: number, deltaY: number, lockDistance: number) {
  if (Math.hypot(deltaX, deltaY) < lockDistance) {
    const returnValue: GestureAxis = 'none'
    return returnValue
  }
  const returnValue: GestureAxis = Math.abs(deltaY) >= Math.abs(deltaX) ? 'vertical' : 'horizontal'
  return returnValue
}

export function shouldDismissPull(
  deltaY: number,
  velocity: number,
  dismissDistance: number,
  dismissVelocity: number,
) {
  const sameDirection = (deltaY > 0 && velocity > 0) || (deltaY < 0 && velocity < 0)
  return (
    Math.abs(deltaY) >= dismissDistance || (Math.abs(velocity) >= dismissVelocity && sameDirection)
  )
}

export function wheelAxis(deltaX: number, deltaY: number): GestureAxis
export function wheelAxis(deltaX: number, deltaY: number) {
  if (deltaX === 0 && deltaY === 0) {
    const returnValue: GestureAxis = 'none'
    return returnValue
  }
  const returnValue: GestureAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
  return returnValue
}

export type GestureAxis = 'none' | 'vertical' | 'horizontal'

export const ELASTIC_FACTOR = 0.2

/**
 * UIScrollView rubber-band constant. Paired with {@link rubberBandDistance}:
 * `f(x, d, c) = (x · d · c) / (d + c · x)`.
 *
 * Lower = stiffer early resistance. Apple uses `0.55` for full-bleed scroll
 * views; media viewers feel better a bit tighter.
 */
export const RUBBER_BAND_CONSTANT = 0.28

/**
 * Fraction of the viewport used as the rubber-band asymptote (touch).
 * Apple scroll views use `1` (ceiling ≈ full viewport). For zoomed media that
 * reads as “pulls way off-screen”, so we use a shorter leash.
 */
export const RUBBER_BAND_DIMENSION_FACTOR = 0.16

/**
 * Mouse pan rubber-band asymptote. Pointer precision makes the touch leash
 * feel like you can yank the image too far — keep desktop tighter.
 */
export const RUBBER_BAND_DIMENSION_FACTOR_MOUSE = 0.09

/**
 * Pan rubber-band dimension in offset units: `(viewportPx * factor) / zoom`.
 * Keeps screen-space feel zoom-invariant while capping max stretch.
 */
export function rubberBandPanDimension(
  viewportPx: number,
  zoom: number,
  factor = RUBBER_BAND_DIMENSION_FACTOR,
) {
  if (viewportPx <= 0 || zoom <= 0) return 0
  return (viewportPx * factor) / zoom
}

/**
 * Apple UIScrollView rubber-band: maps unconstrained overscroll `x` (≥ 0) to a
 * resisted distance that asymptotes toward `dimension` and never reaches it.
 *
 * `dimension` must be in the **same units** as `x` (for pan offsets use
 * {@link rubberBandPanDimension}).
 */
export function rubberBandDistance(
  overscroll: number,
  dimension: number,
  constant = RUBBER_BAND_CONSTANT,
) {
  if (overscroll <= 0 || dimension <= 0 || constant <= 0) return 0
  return (overscroll * dimension * constant) / (dimension + constant * overscroll)
}

/**
 * Clamp `value` into `[min, max]` with UIScrollView-style rubber-banding past
 * the edges. In-range values pass through; outside, overshoot is compressed by
 * {@link rubberBandDistance} against `dimension`.
 */
export function rubberBandClamp(
  value: number,
  min: number,
  max: number,
  dimension: number,
  constant = RUBBER_BAND_CONSTANT,
) {
  if (value < min) return min - rubberBandDistance(min - value, dimension, constant)
  if (value > max) return max + rubberBandDistance(value - max, dimension, constant)
  return value
}

/**
 * Linear rubber-band clamp: values inside `[min, max]` pass through; outside
 * are scaled by `factor`. Used for pinch zoom overshoot (not pan — pan uses
 * {@link rubberBandClamp}).
 */
export function elasticClamp(value: number, min: number, max: number, factor = ELASTIC_FACTOR) {
  if (value < min) return min - (min - value) * factor
  if (value > max) return max + (value - max) * factor
  return value
}

/**
 * Inverse of {@link elasticClamp}. A snap-back pose is already the compressed
 * displayed zoom — treating it as unconstrained and clamping again yanks the
 * image toward the bound (jitter when a new pinch takes over mid-snap).
 */
export function invertElasticClamp(
  displayed: number,
  min: number,
  max: number,
  factor = ELASTIC_FACTOR,
) {
  if (factor <= 0) return displayed < min ? min : displayed > max ? max : displayed
  if (displayed < min) return min - (min - displayed) / factor
  if (displayed > max) return max + (displayed - max) / factor
  return displayed
}

export const PAN_PHYSICS_FRICTION = 3.2

/**
 * Coast friction for keyboard pan steps — same pure ease-out shape as a
 * flick (max velocity on the keydown frame, exponential decay), tuned
 * between two failure modes. A flick's λ=3.2 drags a 50px step out to
 * ~830ms — a laggy, floaty response to a discrete keypress. λ=12 settles in
 * ~330ms, but then each step stops dead before the next press starts and a
 * sequence of presses reads as notchy stop-start. λ=5 lands 63% of the
 * travel in the first ~200ms (crisp attack) while keeping ~600ms of
 * decelerating tail, so presses at a natural rhythm — and OS key repeat,
 * which retargets the coast each event — blend into one continuous glide.
 */
export const KEYBOARD_PAN_FRICTION = 5

export interface PanPhysicsSpring {
  stiffness: number
  damping: number
}

/**
 * Mouse overscroll snap — snappy (~150–180ms). Touch uses a softer spring;
 * the same k on a phone feels harsh.
 */
export const PAN_PHYSICS_SPRING_MOUSE: PanPhysicsSpring = {
  stiffness: 480,
  damping: 44,
}

/** Touch overscroll snap / wall bounce — gentler iOS-like return. */
export const PAN_PHYSICS_SPRING_TOUCH: PanPhysicsSpring = {
  stiffness: 210,
  damping: 30,
}

/**
 * Zoom bound snap-back spring (rAF-stepped, in zoom units). Runs as a *value*
 * animation on zoom that composes with a live pan on the surviving finger —
 * never a WAAPI transform racing the pointer. Stiffer than the touch pan
 * spring: iOS's pinch rubber-band return is brisk (~200ms) even while the
 * remaining finger keeps panning.
 *
 * The snap seeds its initial velocity at -ω·x₀ (see zoomSnapSeedVelocity),
 * which turns the critically damped response into pure exponential decay
 * x(t) = x₀·e^(-ωt) — an ease-OUT: fastest exactly at release, asymptotic
 * landing, and overshoot is impossible (velocity never changes sign). From
 * rest the same spring is an ease-in-out — velocity peaks only at t = 1/ω
 * (~40ms), a visible hesitation right at release that reads as lazy.
 */
export const ZOOM_SNAP_SPRING: PanPhysicsSpring = {
  stiffness: 600,
  damping: 49,
}

/**
 * Initial zoom velocity (zoom units/s) for the bound snap-back, given the
 * overshoot displacement `from - target`. Exactly -ω·x₀ for the critically
 * damped ZOOM_SNAP_SPRING, collapsing it to pure exponential decay — the
 * iOS rubber-band return character (see ZOOM_SNAP_SPRING).
 */
export function zoomSnapSeedVelocity(from: number, target: number) {
  return (target - from) * Math.sqrt(ZOOM_SNAP_SPRING.stiffness)
}
/**
 * Zoom-axis settle thresholds. Keep the distance tight: forcing the last
 * sample onto the bound used to jump ~0.01 zoom units in one frame, which on
 * a typical image edge is a visible 2–4px hitch. Pan can run concurrently
 * with the live rAF snap, so a slightly longer spring tail is fine.
 */
export const ZOOM_SNAP_STOP_SPEED = 0.08
/** Settle when within this distance of the bound (zoom units). */
export const ZOOM_SNAP_STOP_DISTANCE = 0.001

/** Fixed integration step for baked settle trajectories (seconds). */

export const SETTLE_BAKE_DT = 1 / 60

const SETTLE_BAKE_MAX_FRAMES = 720

const SETTLE_BAKE_MAX_KEYFRAMES = 64

export interface SettlePose {
  zoom: number
  offsetX: number
  offsetY: number
}

export interface SettleAxisGeometry {
  min: number
  max: number
  overflows: boolean
}

export interface BakeSettleInput {
  zoom: number
  minZoom: number
  maxZoom: number
  /**
   * Zoom-axis velocity carried from an interrupted live snap (zoom units/s).
   * When omitted and zoom is out of bounds, the exponential-decay seed is
   * used (see zoomSnapSeedVelocity).
   */
  vz?: number
  offsetX: number
  offsetY: number
  /** Release velocities in offset-space px/s. */
  vx: number
  vy: number
  panSpring: PanPhysicsSpring
  /** Coast friction for the pan axes (default PAN_PHYSICS_FRICTION). */
  panFriction?: number
  /** Pan ranges at a given zoom — pure math over cached layout rects. */
  geometryAt: (zoom: number) => { x: SettleAxisGeometry; y: SettleAxisGeometry } | null
  /** Clamped rest offsets at a given zoom (viewport-aware). */
  restOffsetsAt: (zoom: number, x: number, y: number) => { x: number; y: number }
  /**
   * Last pinch/wheel focal (px from stage center). Zoom snap-back keeps this
   * screen point glued — without it the scale returns about the origin and
   * the image slides toward center, more the farther the cursor was.
   */
  focalX?: number
  focalY?: number
}

export interface BakedSettle {
  /**
   * Intermediate poses (final rest pose excluded), decimated to at most
   * SETTLE_BAKE_MAX_KEYFRAMES. Aligned 1:1 with `offsets`.
   */
  path: SettlePose[]
  /** Fractional keyframe time (0..1, exclusive) for each pose in `path`. */
  offsets: number[]
  /** Total trajectory duration in milliseconds. */
  durationMs: number
  /** Exact rest pose to commit as state / final keyframe. */
  zoom: number
  offsetX: number
  offsetY: number
}

/**
 * Integrate the full release-settle trajectory — zoom bound snap-back, offset
 * glide, friction coast, and edge bounce, all composed exactly like the live
 * rAF steppers — into a keyframe path for compositor playback.
 *
 * Returns `null` when there is nothing to animate (pose at rest, no speed).
 */
export function bakeSettlePath(input: BakeSettleInput) {
  const { minZoom, maxZoom, panSpring, geometryAt, restOffsetsAt } = input

  let z = input.zoom
  const bound = clamp(z, minZoom, maxZoom)
  let zoomActive = Math.abs(z - bound) > 1e-6
  let vz = input.vz ?? (zoomActive ? zoomSnapSeedVelocity(z, bound) : 0)
  if (!zoomActive) vz = 0

  let x = input.offsetX
  let y = input.offsetY
  let vx = input.vx
  let vy = input.vy

  const geo = geometryAt(z)
  if (!geo) return null
  const outX = x < geo.x.min || x > geo.x.max
  const outY = y < geo.y.min || y > geo.y.max
  if (!geo.x.overflows && !outX) vx = 0
  if (!geo.y.overflows && !outY) vy = 0
  let panActive = outX || outY || Math.hypot(vx, vy) >= PAN_PHYSICS_STOP_SPEED

  if (!zoomActive && !panActive) return null

  const gBound = geometryAt(bound)

  const focalX = input.focalX
  const focalY = input.focalY
  const glueX = focalX != null && gBound?.x.overflows === true
  const glueY = focalY != null && gBound?.y.overflows === true

  const path: SettlePose[] = []
  let frames = 0
  while ((zoomActive || panActive) && frames < SETTLE_BAKE_MAX_FRAMES) {
    frames += 1
    const zPrev = z

    if (zoomActive) {
      const step = stepPanPhysicsAxis(
        { position: z, velocity: vz, min: bound, max: bound, canCoast: false },
        SETTLE_BAKE_DT,
        PAN_PHYSICS_FRICTION,
        ZOOM_SNAP_SPRING.stiffness,
        ZOOM_SNAP_SPRING.damping,
        ZOOM_SNAP_STOP_SPEED,
        ZOOM_SNAP_STOP_DISTANCE,
      )
      vz = step.velocity

      z = step.position
      if (step.settled) {
        zoomActive = false
        vz = 0
      }
    }

    if (zPrev !== z && (glueX || glueY)) {
      if (glueX) x = focalOffset(x, focalX, zPrev, z)
      if (glueY) y = focalOffset(y, focalY, zPrev, z)
    }

    if (panActive) {
      const g = geometryAt(z)
      if (!g) break
      const next = stepPanPhysics2D(
        { x, y, vx, vy },
        g.x,
        g.y,
        g.x.overflows,
        g.y.overflows,
        SETTLE_BAKE_DT,
        panSpring,
        input.panFriction,
      )
      x = next.x
      y = next.y
      vx = next.vx
      vy = next.vy
      if (next.settled) {
        panActive = false
      }
    } else if (zPrev !== z) {
      const rest = restOffsetsAt(bound, x, y)
      if (rest.x !== x || rest.y !== y) {
        const denom = zPrev - bound
        const f = denom !== 0 ? Math.min(1, Math.max(0, (zPrev - z) / denom)) : 1
        x += (rest.x - x) * f
        y += (rest.y - y) * f
      }
    }

    path.push({ zoom: z, offsetX: x, offsetY: y })
  }

  if (z !== bound && (glueX || glueY)) {
    if (glueX) x = focalOffset(x, focalX, z, bound)
    if (glueY) y = focalOffset(y, focalY, z, bound)
  }
  const rest = restOffsetsAt(bound, x, y)

  const total = path.length + 1
  const durationMs = total * SETTLE_BAKE_DT * 1000

  let keptPath = path
  let offsets: number[]
  if (path.length > SETTLE_BAKE_MAX_KEYFRAMES) {
    const stride = Math.ceil(path.length / SETTLE_BAKE_MAX_KEYFRAMES)
    keptPath = []
    offsets = []
    for (let i = stride - 1; i < path.length - 1; i += stride) {
      const point = path[i]
      if (point) {
        keptPath.push(point)
        offsets.push((i + 1) / total)
      }
    }
    const lastPoint = path.at(-1)
    if (lastPoint) {
      keptPath.push(lastPoint)
      offsets.push(path.length / total)
    }
  } else {
    offsets = path.map((_, i) => (i + 1) / total)
  }

  const returnValue: BakedSettle | null = {
    path: keptPath,
    offsets,
    durationMs,
    zoom: bound,
    offsetX: rest.x,
    offsetY: rest.y,
  }
  return returnValue
}

export const PAN_PHYSICS_STOP_SPEED = 12
/**
 * Settle when within this distance of the bound while slow (offset-space px).
 * Kept small: at 4× zoom, 0.6 offset-px was ~2.4px on screen — the spring
 * looked smooth then jumped the last few pixels when the bake snapped to rest.
 */
export const PAN_PHYSICS_STOP_DISTANCE = 0.08

export interface PanPhysicsAxisInput {
  position: number
  velocity: number
  min: number
  max: number
  /** When false, axis won't coast — only spring back if past rest. */
  canCoast: boolean
}

export interface PanPhysicsAxisResult {
  position: number
  velocity: number
  settled: boolean
}

/**
 * One integration step of iOS-like scroll physics on a single axis:
 * friction coast inside bounds, spring+damping bounce outside.
 */
export function stepPanPhysicsAxis(
  axis: PanPhysicsAxisInput,
  dt: number,
  friction = PAN_PHYSICS_FRICTION,
  stiffness = PAN_PHYSICS_SPRING_MOUSE.stiffness,
  damping = PAN_PHYSICS_SPRING_MOUSE.damping,
  stopSpeed = PAN_PHYSICS_STOP_SPEED,
  stopDistance = PAN_PHYSICS_STOP_DISTANCE,
) {
  let { position: x, velocity: v } = axis
  const { min, max, canCoast } = axis
  if (dt <= 0) {
    const returnValue: PanPhysicsAxisResult = { position: x, velocity: v, settled: true }
    return returnValue
  }

  const out = x < min || x > max
  if (out) {
    const target = x < min ? min : max
    const a = (target - x) * stiffness - v * damping
    v += a * dt
    x += v * dt

    if (x >= min && x <= max) {
      if (!canCoast) {
        const returnValue: PanPhysicsAxisResult = {
          position: clamp(x, min, max),
          velocity: 0,
          settled: true,
        }
        return returnValue
      }
      if (Math.abs(v) < stopSpeed) {
        const returnValue: PanPhysicsAxisResult = {
          position: clamp(x, min, max),
          velocity: 0,
          settled: true,
        }
        return returnValue
      }
      const returnValue: PanPhysicsAxisResult = {
        position: clamp(x, min, max),
        velocity: v,
        settled: false,
      }
      return returnValue
    }
    const dist = Math.abs(x - target)
    if (Math.abs(v) < stopSpeed && dist < stopDistance) {
      const returnValue: PanPhysicsAxisResult = { position: x, velocity: 0, settled: true }
      return returnValue
    }
    const returnValue: PanPhysicsAxisResult = { position: x, velocity: v, settled: false }
    return returnValue
  }

  if (!canCoast) {
    const returnValue: PanPhysicsAxisResult = { position: x, velocity: 0, settled: true }
    return returnValue
  }

  v *= Math.exp(-friction * dt)
  x += v * dt

  if (x < min || x > max) {
    const returnValue: PanPhysicsAxisResult = { position: x, velocity: v, settled: false }
    return returnValue
  }
  if (Math.abs(v) < stopSpeed) {
    const returnValue: PanPhysicsAxisResult = { position: x, velocity: 0, settled: true }
    return returnValue
  }
  const returnValue: PanPhysicsAxisResult = { position: x, velocity: v, settled: false }
  return returnValue
}

export interface PanPhysicsState {
  x: number
  y: number
  vx: number
  vy: number
}

/**
 * One 2D integration step. `canCoastX/Y` gate freestyle inertia (overflowing
 * axes); non-coasting axes still spring home if past their rest bound.
 */
export function stepPanPhysics2D(
  state: PanPhysicsState,
  xRange: { min: number; max: number },
  yRange: { min: number; max: number },
  canCoastX: boolean,
  canCoastY: boolean,
  dt: number,
  spring: PanPhysicsSpring = PAN_PHYSICS_SPRING_MOUSE,
  friction: number = PAN_PHYSICS_FRICTION,
) {
  const xStep = stepPanPhysicsAxis(
    {
      position: state.x,
      velocity: state.vx,
      min: xRange.min,
      max: xRange.max,
      canCoast: canCoastX,
    },
    dt,
    friction,
    spring.stiffness,
    spring.damping,
  )
  const yStep = stepPanPhysicsAxis(
    {
      position: state.y,
      velocity: state.vy,
      min: yRange.min,
      max: yRange.max,
      canCoast: canCoastY,
    },
    dt,
    friction,
    spring.stiffness,
    spring.damping,
  )
  const returnValue: PanPhysicsState & { settled: boolean } = {
    x: xStep.position,
    y: yStep.position,
    vx: xStep.velocity,
    vy: yStep.velocity,
    settled: xStep.settled && yStep.settled,
  }
  return returnValue
}

export function focalOffset(
  currentOffset: number,
  focal: number,
  fromZoom: number,
  toZoom: number,
) {
  return pinchPanOffset(currentOffset, focal, fromZoom, focal, toZoom)
}

export const DISCRETE_ZOOM_EASE = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 }
/** Keyframe samples per baked discrete zoom curve. */
export const DISCRETE_ZOOM_BAKE_SAMPLES = 32
/**
 * Cap on the carried-velocity tangent (normalized progress units). Bounds the
 * Hermite overshoot when an extreme velocity is carried into a small step.
 */
export const DISCRETE_ZOOM_MAX_CARRY_TANGENT = 4

const DISCRETE_ZOOM_MIN_CARRY_TANGENT = 0.02

export interface BakeDiscreteZoomInput {
  from: SettlePose
  to: SettlePose
  /**
   * Zoom velocity carried from an interrupted animation (zoom units/s).
   * Omit / 0 when starting from rest.
   */
  vZoom?: number
  /** Curve duration in milliseconds (the discrete animation duration). */
  durationMs: number
}

export interface BakedDiscreteZoom {
  /** Intermediate poses (final target excluded), aligned 1:1 with `offsets`. */
  path: SettlePose[]
  /** Fractional keyframe time (0..1, exclusive) for each pose in `path`. */
  offsets: number[]
  /** Total trajectory duration in milliseconds. */
  durationMs: number
}

function lerpSettlePoseMatrix(a: SettlePose, b: SettlePose, t: number) {
  const z = a.zoom + (b.zoom - a.zoom) * t
  if (!(z > 0)) {
    const returnValue: SettlePose = { ...b }
    return returnValue
  }
  const e = a.zoom * a.offsetX + (b.zoom * b.offsetX - a.zoom * a.offsetX) * t
  const f = a.zoom * a.offsetY + (b.zoom * b.offsetY - a.zoom * a.offsetY) * t
  const returnValue: SettlePose = { zoom: z, offsetX: e / z, offsetY: f / z }
  return returnValue
}

/**
 * Bake a discrete zoom step into a keyframe path for compositor playback.
 * Poses ride the matrix-lerp line between `from` and `to` (the same
 * focal-stable path WAAPI matrix interpolation takes); only the progress
 * parameterization differs by case:
 *
 * - From rest: the exact CSS ease-in-out curve, sampled parametrically —
 *   keyframe offsets carry the bezier's x (time) and progress its y — so the
 *   uninterrupted feel is identical to the raw eased tween.
 * - With carried velocity: a cubic Hermite over the same duration whose
 *   initial slope matches the carried velocity and whose end slope is zero,
 *   giving the same soft landing. A large carried velocity may slightly
 *   overshoot the target mid-curve and ease back — the elastic interrupt feel.
 *
 * Returns `null` for a degenerate zero zoom delta (pure-offset moves fall
 * back to the plain 2-keyframe tween) or a non-positive duration.
 */
export function bakeDiscreteZoomPath(input: BakeDiscreteZoomInput) {
  const { from, to, durationMs } = input
  if (!(from.zoom > 0) || !(to.zoom > 0) || !(durationMs > 0)) return null

  const zoomDelta = to.zoom - from.zoom

  if (Math.abs(zoomDelta) < 1e-9) return null

  const rawTangent = ((input.vZoom ?? 0) * (durationMs / 1000)) / zoomDelta
  const m0 = clamp(rawTangent, -DISCRETE_ZOOM_MAX_CARRY_TANGENT, DISCRETE_ZOOM_MAX_CARRY_TANGENT)

  const n = DISCRETE_ZOOM_BAKE_SAMPLES
  const path: SettlePose[] = []
  const offsets: number[] = []

  if (Math.abs(m0) < DISCRETE_ZOOM_MIN_CARRY_TANGENT) {
    const { x1, y1, x2, y2 } = DISCRETE_ZOOM_EASE
    for (let i = 1; i < n; i++) {
      const t = i / n
      const omt = 1 - t
      const b1 = 3 * omt * omt * t
      const b2 = 3 * omt * t * t
      const t3 = t * t * t
      const x = b1 * x1 + b2 * x2 + t3
      const y = b1 * y1 + b2 * y2 + t3
      offsets.push(x)
      path.push(lerpSettlePoseMatrix(from, to, y))
    }
  } else {
    for (let i = 1; i < n; i++) {
      const t = i / n
      const t2 = t * t
      const t3 = t2 * t
      const s = m0 * (t3 - 2 * t2 + t) + (3 * t2 - 2 * t3)
      offsets.push(t)
      path.push(lerpSettlePoseMatrix(from, to, s))
    }
  }

  const returnValue: BakedDiscreteZoom | null = { path, offsets, durationMs }
  return returnValue
}

/** Numeric playback of upstream's 40-stop critical spring `linear()` easing. */
export function pullReturnFraction(progress: number, normalizedVelocity: number) {
  const at = (index: number) => {
    if (index >= 39) return 1
    const p = index / 39
    const remaining = Math.exp(-7.5 * p) * (1 + (normalizedVelocity + 7.5) * p)
    return Math.min(Math.round((1 - remaining) * 10_000) / 10_000, 1)
  }
  const sample = clamp(progress, 0, 1) * 39
  const left = Math.floor(sample)
  const fraction = sample - left
  return at(left) + (at(left + 1) - at(left)) * fraction
}

export const PULL_DAMP_TRAVEL_RATIO = 1.2

/**
 * Horizontal travel flattens toward `dismissDistance * this` as a ceiling.
 * X needs its own (much shorter) leash: Y is what the gesture reads, X is
 * only follow-along liveliness — and on a trackpad a horizontal flick's
 * momentum tail can pour thousands of px into the accumulator, which under
 * proportional damping walked the image clean off the screen.
 */
export const PULL_DAMP_X_TRAVEL_RATIO = 0.5

export interface PullTransform {
  /** Damped horizontal translation (px). */
  x: number
  /** Damped vertical translation (px). */
  y: number
  /** Shrink scale (1 at rest → `minScale` at/after the threshold). */
  scale: number
  /** 0 at rest → 1 at the dismiss threshold (clamped). */
  progress: number
}

/**
 * Asymptotic damping for a pull-to-dismiss drag. Vertical travel moves ~1:1
 * near the origin then flattens toward a ceiling of
 * `dismissDistance * PULL_DAMP_TRAVEL_RATIO`. Horizontal travel is scaled by
 * the same damping factor (so the content never slides sideways faster than
 * it falls) and then leashed to its own, shorter asymptotic ceiling of
 * `dismissDistance * PULL_DAMP_X_TRAVEL_RATIO` — sideways motion is
 * follow-along liveliness, never travel, so no amount of accumulated input
 * (e.g. a trackpad flick's momentum tail) can slide the content far off-axis.
 * Neither curve ever reverses regardless of drag distance.
 */
export function computePullTransform(
  rawDeltaX: number,
  rawDeltaY: number,
  dismissDistance: number,
  minScale: number,
) {
  const absY = Math.abs(rawDeltaY)
  const maxTravel = dismissDistance * PULL_DAMP_TRAVEL_RATIO
  const dampedAbsY = maxTravel * (1 - Math.exp(-absY / maxTravel))
  const dampedY = Math.sign(rawDeltaY) * dampedAbsY
  const dampFactor = absY > 0 ? dampedAbsY / absY : 1

  const maxTravelX = dismissDistance * PULL_DAMP_X_TRAVEL_RATIO
  const dampedX =
    Math.sign(rawDeltaX) *
    maxTravelX *
    (1 - Math.exp(-(Math.abs(rawDeltaX) * dampFactor) / maxTravelX))

  const progress = Math.min(absY / dismissDistance, 1)
  const scale = 1 - progress * (1 - minScale)

  const returnValue: PullTransform = { x: dampedX, y: dampedY, scale, progress }
  return returnValue
}
