import type { ChartValue } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'

export interface CartesianMotionOptions {
  readonly initial?: boolean | 'always'
  readonly duration?: number | 'configuration'
}

export class CartesianMotionRenderer<
  Row,
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
> {
  #key = 'null'
  #renderer = motion<Row, XValue, YValue>({ respectReducedMotion: true })
  get(options: CartesianMotionOptions | undefined, configuredDuration: number) {
    const duration = options?.duration === 'configuration' ? configuredDuration : options?.duration
    const key = JSON.stringify([options?.initial, duration])

    if (this.#key !== key) {
      this.#key = key
      this.#renderer = motion<Row, XValue, YValue>({
        respectReducedMotion: true,
        ...(options?.initial === undefined ? {} : { initial: options.initial }),
        ...(duration === undefined ? {} : { transition: { type: 'tween', duration } }),
      })
    }

    return this.#renderer
  }
}
