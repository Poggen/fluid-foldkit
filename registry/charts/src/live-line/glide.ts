import { REST_PX, springOf } from '../kit/motion/spring-curve'
import { CROSSHAIR_SPRING } from '../kit/motion/springs'
import type { Frame, RollClock } from './live-frame'
import { rollEase, rollYAt } from './live-frame'

/** bklit's crosshair spring: rule, dot and time pill follow the pointer on a `useSpring` of `tooltipSpring` 300/30 (chart-config-context.tsx:20; tooltip-indicator.tsx:110-118, tooltip-dot.tsx:58-62, live-x-axis.tsx:12,92),
 * velocity-carrying, rest thresholds motion's for px (motion-dom 12.27.0 spring/defaults.mjs). The renderer's guide motion cannot carry it: each roll frame restarts its tween at elapsed 0 (charts-core motion.ts:1088-1104, 3990), UPSTREAM-GAPS #43. */
const CROSSHAIR_GLIDE = springOf(CROSSHAIR_SPRING, REST_PX)

interface GlideAxis {
  from: number
  to: number
  velocity: number
  start: number
}

function glideAt(a: GlideAxis, time: number): ReturnType<typeof CROSSHAIR_GLIDE.sample> {
  return CROSSHAIR_GLIDE.sample(time - a.start, { from: a.from, to: a.to, velocity: a.velocity })
}

function retarget(a: GlideAxis, to: number, time: number): void {
  const now = glideAt(a, time)
  a.from = now.value
  a.velocity = now.velocity
  a.to = to
  a.start = time
}

/** The drawn line's y at plot x (svg px) at frame time `time`, the target bklit's dot springs to (live-line-chart.tsx:229-269): the frame's rows at rest moved by what is left of the roll's transform (Frame.roll).
 * It is the chord between samples, used only as a difference: the marker's offset is the spring's lag behind it, 0 on the renderer's own marker. */
function lineYAt(
  f: Frame,
  r: RollClock | null,
  time: number,
  layout: { left: number; x0: number; pxPerMs: number },
  top: number,
  height: number,
  x: number,
): number {
  const e = rollEase(r, time)
  const tAt = layout.x0 + (x - (r ? r.x * (1 - e) : 0) - layout.left) / (layout.pxPerMs || 1)
  const pts = f.rows.filter((row) => !row.pad)

  if (f.tip) {
    pts.push({ key: 'tip', t: f.tip.t, v: f.tip.v, pad: false })
  }

  let v = pts[0]?.v ?? 0
  let lo = 0
  let hi = pts.length - 1

  if (pts.length > 1 && tAt > (pts[0]?.t ?? 0)) {
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2)

      if ((pts[mid]?.t ?? 0) <= tAt) {
        lo = mid
      } else {
        hi = mid
      }
    }

    const a = pts.at(lo)
    const b = pts.at(hi)

    if (a !== undefined && b !== undefined) {
      v = tAt >= b.t ? b.v : a.v + ((b.v - a.v) * (tAt - a.t)) / (b.t - a.t || 1)
    }
  }

  const [y0, y1] = f.yDomain
  const ry = rollYAt(r, time)

  return ry.s * (top + ((y1 - v) * height) / (y1 - y0 || 1)) + ry.t
}

export interface GlideGeometry {
  readonly frame: Frame | null
  readonly roll: RollClock | null
  readonly left: number
  readonly x0: number
  readonly pxPerMs: number
  readonly top: number
  readonly height: number
}

export function createCrosshairGlide(
  element: HTMLElement,
  read: () => GlideGeometry,
  clock: () => number,
) {
  let current: { x: GlideAxis; y: GlideAxis; raf: number } | null = null

  const clear = () => {
    element.removeAttribute('data-bkm-pglide')
    element.style.removeProperty('--bkm-pgx')
    element.style.removeProperty('--bkm-pgy')
  }

  const stop = () => {
    if (current !== null) cancelAnimationFrame(current.raf)
    current = null
    clear()
  }

  const glideTo = (x: number) => {
    const view = read(),
      time = clock()

    if (view.frame === null) return
    const y = lineYAt(view.frame, view.roll, time, view, view.top, view.height, x)

    if (current === null) {
      current = {
        x: { from: x, to: x, velocity: 0, start: time },
        y: { from: y, to: y, velocity: 0, start: time },
        raf: 0,
      }

      return
    }

    const g = current
    retarget(g.x, x, time)
    retarget(g.y, y, time)
    element.style.setProperty('--bkm-pgx', (g.x.from - x).toFixed(2))
    element.style.setProperty('--bkm-pgy', (g.y.from - y).toFixed(2))
    element.dataset.bkmPglide = ''

    if (g.raf) return

    const step = (time: number) => {
      const now = current

      if (now === null) return

      const x = glideAt(now.x, time),
        y = glideAt(now.y, time)

      if (x.done && y.done) {
        now.x = { from: now.x.to, to: now.x.to, velocity: 0, start: time }
        now.y = { from: now.y.to, to: now.y.to, velocity: 0, start: time }
        now.raf = 0
        clear()

        return
      }

      element.style.setProperty('--bkm-pgx', (x.value - now.x.to).toFixed(2))
      element.style.setProperty('--bkm-pgy', (y.value - now.y.to).toFixed(2))
      element.dataset.bkmPglide = ''
      now.raf = requestAnimationFrame(step)
    }

    g.raf = requestAnimationFrame(step)
  }

  return { glideTo, stop, destroy: stop }
}
