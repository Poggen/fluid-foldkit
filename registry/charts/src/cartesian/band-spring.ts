import { restOf, springOf } from '../kit/motion/spring-curve'
import { HIGHLIGHT_SPRING } from '../kit/motion/springs'

interface Axis {
  target: number
  x0: number
  v0: number
  t0: number
}

export function bandSpring(rect: SVGRectElement, clock: () => number) {
  const x: Axis = { target: 0, x0: 0, v0: 0, t0: 0 }
  const width: Axis = { target: 0, x0: 0, v0: 0, t0: 0 }
  let frame = 0
  let initialized = false

  const read = (axis: Axis, now: number) => {
    const sample = springOf(HIGHLIGHT_SPRING, restOf(axis.x0)).sample(now - axis.t0, {
      from: axis.x0,
      to: 0,
      velocity: axis.v0,
    })

    return { rest: sample.done, value: axis.target + sample.value, velocity: sample.velocity }
  }

  const retarget = (axis: Axis, target: number, now: number, jump: boolean) => {
    const live = jump ? { value: target, velocity: 0 } : read(axis, now)
    axis.x0 = live.value - target
    axis.v0 = live.velocity
    axis.target = target
    axis.t0 = now
  }

  const write = (left: number, right: number) => {
    rect.setAttribute('x', left.toFixed(2))
    rect.setAttribute('width', (right - left).toFixed(2))
  }

  const tick = (now: number) => {
    frame = 0

    if (!rect.isConnected) return
    const a = read(x, now)
    const b = read(width, now)

    if (a.rest && b.rest) {
      write(x.target, x.target + width.target)

      return
    }

    write(a.value, a.value + b.value)
    frame = requestAnimationFrame(tick)
  }

  return {
    set: (lo: number, hi: number, jumpRequested: boolean) => {
      const jump = jumpRequested || !initialized
      initialized = true

      if (!jump && x.target === lo && width.target === hi - lo) return
      const now = clock()
      retarget(x, lo, now, jump)
      retarget(width, hi - lo, now, jump)

      if (jump) {
        cancelAnimationFrame(frame)
        frame = 0
        write(lo, hi)
      } else if (frame === 0) frame = requestAnimationFrame(tick)
    },
    destroy: () => {
      cancelAnimationFrame(frame)
      frame = 0
    },
  }
}
