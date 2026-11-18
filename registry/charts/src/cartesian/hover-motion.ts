import type { Spring } from '../kit/motion/springs'
import { Glide, Ticker } from './glide'
import { SourceFollow } from './hover-follow'
import type { HoverGlide } from './hover-follow'

export type { HoverGlide } from './hover-follow'

/** Line/Area use Original's public follow engine; other families retain their existing owner. */
export class HoverMotion {
  readonly #ticker = new Ticker()
  readonly #source = new Set<SourceFollow>()

  create(
    element: HTMLElement | SVGElement,
    spring: Spring,
    count: number,
    css: (values: ReadonlyArray<number>) => string,
    clock: () => number,
    source: boolean,
    property: 'transform' | 'left' = 'transform',
  ) {
    if (!source) {
      return new Glide(element, spring, count, css, this.#ticker, clock) satisfies HoverGlide
    }

    const follow = new SourceFollow(element, spring, count, css, property)
    this.#source.add(follow)

    return follow satisfies HoverGlide
  }

  stopSource() {
    for (const follow of this.#source) {
      follow.stop()
    }
  }

  clear() {
    this.#ticker.clear()

    for (const follow of this.#source) {
      follow.destroy()
    }

    this.#source.clear()
  }
}
