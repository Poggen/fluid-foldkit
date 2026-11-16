import { REVEAL_EASING } from '../kit/motion/easing'
import { shouldTweenYDomain } from './y-domain-utils'
import type { Domains, Interaction } from './state'
import type { TimeSeriesProps } from './root-options'

/** The source interpolates domain endpoints, then reprojects every mark.
 * A tween between final SVG coordinates has a different velocity profile.
 */
export class TimeSeriesDomainFrame<Row> {
  readonly #clock: () => number
  readonly #props: () => TimeSeriesProps<Row>
  readonly #state: () => Interaction | undefined
  readonly #reduced: () => boolean
  #target: Domains | undefined
  #current: Domains | undefined
  #from: Domains = {}
  #started = 0
  #duration = 500
  #active = false

  constructor(
    clock: () => number,
    props: () => TimeSeriesProps<Row>,
    state: () => Interaction | undefined,
    reduced: () => boolean,
  ) {
    this.#clock = clock
    this.#props = props
    this.#state = state
    this.#reduced = reduced
  }

  get active(): boolean {
    return this.#active
  }

  #sample(now: number): Domains | undefined {
    if (this.#target === undefined) {
      return this.#current
    }

    const elapsed = now - this.#started
    const progress = this.#active ? REVEAL_EASING(Math.min(1, elapsed / this.#duration)) : 1
    this.#current = Object.fromEntries(
      Object.entries(this.#target).map(([id, to]) => {
        const from = this.#from[id] ?? to

        return [
          id,
          shouldTweenYDomain(from, to)
            ? [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress]
            : to,
        ]
      }),
    )
    this.#active &&= elapsed < this.#duration

    return this.#current
  }

  #canAnimate(state: Interaction | undefined, props: TimeSeriesProps<Row>): boolean {
    const phase = state?.phase

    const livePhase =
      (phase === 'ready' && state?.revealReady === true) ||
      phase === 'tween' ||
      phase === 'tweenLoading'

    const enabled = state?.configuration.yDomainTween ?? props.yDomainTween !== false

    return livePhase && enabled && !this.#reduced()
  }

  resolve(target: Domains): Map<string, readonly [number, number]> {
    const now = this.#clock()
    this.#sample(now)
    const props = this.#props()
    const state = this.#state()
    const canAnimate = this.#canAnimate(state, props)

    if (JSON.stringify(this.#target) !== JSON.stringify(target)) {
      this.#from = this.#current ?? target
      this.#target = target
      this.#started = now
      this.#duration =
        state?.configuration.yDomainTweenDuration ?? props.yDomainTweenDuration ?? 500
      this.#active =
        this.#current !== undefined &&
        canAnimate &&
        this.#duration > 0 &&
        Object.entries(target).some(([id, to]) => shouldTweenYDomain(this.#from[id] ?? to, to))
    }

    if (!canAnimate) {
      this.#active = false
    }

    return new Map(Object.entries(this.#sample(now) ?? target))
  }
}
