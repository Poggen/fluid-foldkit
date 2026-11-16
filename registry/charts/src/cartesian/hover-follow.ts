import { attachFollow, cancelFrame, frame, motionValue } from 'motion-dom'
import type { MotionValue } from 'motion-dom'
import type { Spring } from '../kit/motion/springs'

export interface HoverGlide {
  onMove: ((values: ReadonlyArray<number>) => void) | null
  readonly jump: (values: ReadonlyArray<number>) => void
  readonly glide: (values: ReadonlyArray<number>) => void
}

export class SourceFollow implements HoverGlide {
  onMove: ((values: ReadonlyArray<number>) => void) | null = null
  readonly #values: ReadonlyArray<MotionValue<number>>
  readonly #detach: ReadonlyArray<() => void>
  readonly #unsubscribe: ReadonlyArray<() => void>
  readonly #element: HTMLElement | SVGElement
  readonly #css: (values: ReadonlyArray<number>) => string
  readonly #property: 'transform' | 'left'
  #last = ''
  #disposed = false

  constructor(
    element: HTMLElement | SVGElement,
    spring: Spring,
    count: number,
    css: (values: ReadonlyArray<number>) => string,
    property: 'transform' | 'left',
  ) {
    this.#element = element
    this.#css = css
    this.#property = property
    this.#values = Array.from({ length: count }, () => motionValue(0))
    this.#detach = this.#values.map((value) => attachFollow(value, 0, spring))
    this.#unsubscribe = this.#values.map((value) => value.on('change', this.#schedule))
  }

  readonly #schedule = () => {
    if (!this.#disposed) {
      frame.render(this.#paint, false, true)
    }
  }

  readonly #paint = () => {
    if (this.#disposed) {
      return
    }

    const values = this.#values.map((value) => value.get())
    const next = this.#css(values)

    if (next !== this.#last) {
      this.#last = next
      this.#element.style[this.#property] = next
    }

    this.onMove?.(values)
  }

  jump(values: ReadonlyArray<number>): void {
    for (const [index, value] of this.#values.entries()) {
      const next = values[index] ?? 0
      // Update the pending follow target too, so an already queued postRender
      // cannot revive a previous target after the immediate placement.
      value.set(next)
      value.jump(next)
    }

    this.#paint()
  }

  glide(values: ReadonlyArray<number>): void {
    for (const [index, value] of this.#values.entries()) {
      value.set(values[index] ?? 0)
    }
  }

  stop(): void {
    this.jump(this.#values.map((value) => value.get()))
    cancelFrame(this.#paint)
  }

  destroy(): void {
    this.stop()
    this.#disposed = true

    for (const unsubscribe of this.#unsubscribe) {
      unsubscribe()
    }

    for (const detach of this.#detach) {
      detach()
    }

    for (const value of this.#values) {
      value.destroy()
    }

    this.onMove = null
  }
}
