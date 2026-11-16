import { REST_PX, springOf } from '../kit/motion/spring-curve'
import type { Spring } from '../kit/motion/springs'

interface Axis {
  target: number
  /** Displacement from `target` and velocity (px/s) at `t0`. */
  x0: number
  v0: number
  t0: number
}

/** One animation-frame loop for every Glide of an overlay: a single rAF callback writes each moving element's transform, as motion's frame loop does for bklit's springs (date-ticker.tsx:81-82, tooltip-dot.tsx). */
export class Ticker {
  private readonly active = new Set<Glide>()
  private frame = 0

  start(glide: Glide): void {
    this.active.add(glide)

    if (this.frame === 0) {
      this.frame = requestAnimationFrame(this.tick)
    }
  }

  stop(glide: Glide): void {
    this.active.delete(glide)
  }

  clear(): void {
    this.active.clear()
    cancelAnimationFrame(this.frame)
    this.frame = 0
  }

  private readonly tick = (now: number): void => {
    this.frame = 0

    for (const glide of this.active) {
      if (glide.step(now)) {
        this.active.delete(glide)
      }
    }

    if (this.active.size > 0) {
      this.frame = requestAnimationFrame(this.tick)
    }
  }
}

interface Sink {
  readonly el: HTMLElement | SVGElement
  readonly css: (values: ReadonlyArray<number>) => string
  last: string
}

/** An element whose `transform` follows a spring on each axis, velocity kept across retargets (motion's `useSpring`, as bklit's tooltip dots and date ticker do).
 * `onMove` receives the values on every frame they are written (and on a jump). */
export class Glide {
  public onMove: ((values: ReadonlyArray<number>) => void) | null = null
  private readonly axes: Array<Axis>
  private readonly sinks: Array<Sink> = []
  private readonly clock: () => number
  private readonly spring: Spring
  private readonly ticker: Ticker
  constructor(
    el: HTMLElement | SVGElement,
    spring: Spring,
    count: number,
    css: (values: ReadonlyArray<number>) => string,
    ticker: Ticker,
    clock: () => number,
  ) {
    this.clock = clock
    this.spring = spring
    this.ticker = ticker
    this.axes = Array.from({ length: count }, () => ({ t0: 0, target: 0, v0: 0, x0: 0 }))
    this.sinks.push({ css, el, last: '' })
  }

  private write(values: ReadonlyArray<number>): void {
    for (const sink of this.sinks) {
      const next = sink.css(values)

      // A spring settling on its target repeats the last value; an identical write still dirties the element's style.
      if (next !== sink.last) {
        sink.last = next
        sink.el.style.transform = next
      }
    }

    // Outside the dedupe: a device-px-rounded transform can stop changing before the value lands on its target.
    this.onMove?.(values)
  }

  /** Places the element at `values` with no motion. */
  jump(values: ReadonlyArray<number>): void {
    this.ticker.stop(this)
    this.axes.forEach((axis, i) => {
      axis.target = values[i] ?? 0
      axis.x0 = 0
      axis.v0 = 0
    })
    this.write(values)
  }

  /** Springs from wherever the element is (and however fast it moves) to `values`. */
  glide(values: ReadonlyArray<number>): void {
    const now = this.clock()
    const motion = springOf(this.spring, REST_PX)
    this.axes.forEach((axis, i) => {
      const live = motion.sample(now - axis.t0, { from: axis.x0, to: 0, velocity: axis.v0 })
      const target = values[i] ?? 0
      axis.x0 = axis.target + live.value - target
      axis.v0 = live.velocity
      axis.target = target
      axis.t0 = now
    })
    this.ticker.start(this)
  }

  /** Writes the position at frame time `now`; true once every axis is at rest. */
  step(now: number): boolean {
    const motion = springOf(this.spring, REST_PX)
    let rest = true

    const at = this.axes.map((axis) => {
      const s = motion.sample(Math.max(0, now - axis.t0), {
        from: axis.x0,
        to: 0,
        velocity: axis.v0,
      })

      rest &&= s.done

      return axis.target + (s.done ? 0 : s.value)
    })

    this.write(rest ? this.axes.map((axis) => axis.target) : at)

    return rest
  }
}
