import type { ChartMotionDefinition, ChartMotionTiming } from '@tanstack/charts'
import { REVEAL_EASING } from '../kit/motion/easing'
import { wipeWrap, wipeMotion, WIPE_KEY } from './reveal'
import type { WipeConfig } from './reveal'
import type { CartesianCompilationOptions } from './definition'
import type { SeriesMark } from './build-state'
import type { Margin } from './context-types'

type MotionOptions = Pick<
  CartesianCompilationOptions<never>,
  | 'wipe'
  | 'clock'
  | 'animationDuration'
  | 'updateStep'
  | 'wipePadding'
  | 'wipeArmedAt'
  | 'physicalReveal'
> & { readonly domainFrame?: { readonly active: boolean } }

const glide: ChartMotionTiming = {
  transition: { type: 'tween', duration: 500, easing: REVEAL_EASING },
}

const instant: ChartMotionTiming = { transition: { type: 'tween', duration: 0 } }

const update: ChartMotionTiming = {
  transition: { type: 'tween', duration: 200, easing: 'ease-in-out' },
}

export function createTimeSeriesWrap(
  options: MotionOptions,
  plot: { readonly innerWidth: number; readonly innerHeight: number },
  margin: Margin,
) {
  let sequence = 0

  return <Datum>(mark: SeriesMark<Datum>, prefix: string): SeriesMark<Datum> => {
    const { wipe } = options

    if (wipe === undefined) {
      return mark
    }

    let config: WipeConfig = {
      progress:
        options.physicalReveal === true
          ? 1
          : wipe.conceal === true
            ? 2 + margin.left / Math.max(1, plot.innerWidth)
            : wipe.progress,
      physical: options.physicalReveal === true,
      duration: wipe.duration,
      width: plot.innerWidth,
      height: plot.innerHeight,
      clock: options.clock ?? (() => 0),
    }

    if (options.wipePadding !== undefined) {
      config = { ...config, padding: options.wipePadding(plot.innerWidth) }
    }

    if (options.wipeArmedAt !== undefined) {
      config = { ...config, armedAt: { current: options.wipeArmedAt } }
    }

    const tag = `${prefix}${sequence}`

    sequence += 1

    return wipeWrap(mark, tag, config, margin)
  }
}

function revealMotion(options: MotionOptions): ChartMotionTiming | false {
  if (options.physicalReveal === true || options.wipe?.duration === 0) {
    return false
  }

  return wipeMotion(
    options.wipe?.duration ?? options.animationDuration ?? 1100,
    options.wipeArmedAt === undefined ? undefined : { current: options.wipeArmedAt },
    options.clock?.() ?? 0,
  )
}

export function timeSeriesMotion<Datum>(options: MotionOptions): ChartMotionDefinition<Datum> {
  return (context) => {
    if (context.key.startsWith(WIPE_KEY)) {
      return revealMotion(options)
    }

    if (options.domainFrame !== undefined) {
      return false
    }

    if (options.updateStep === 'window') {
      const moves =
        context.axis === 'y' ||
        context.role === 'line' ||
        context.role === 'area' ||
        context.markId === 'grid-rows' ||
        context.markId === 'grid-highlight-rows'

      return context.phase === 'update' && moves ? glide : false
    }

    if (context.phase === 'enter') {
      return instant
    }

    if (options.updateStep === 'snap') {
      return false
    }

    return options.updateStep === 'glide' ? glide : update
  }
}
