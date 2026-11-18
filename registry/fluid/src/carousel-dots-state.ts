import type { HoverMode } from './hover-observation.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Predicate, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'

export const carouselClock: (config: CarouselDotsConfig) => CarouselClock = function carouselClock(
  config: CarouselDotsConfig,
) {
  const options =
    config.autoplay === undefined || Predicate.isBoolean(config.autoplay) ? {} : config.autoplay

  const autoplay =
    Boolean(config.autoplay) && config.progress === undefined && config.externalProgress !== true

  return {
    resourceIdentity: config.resourceIdentity ?? 'default',
    count: config.count,
    value: config.value,
    autoplay,
    duration: options.duration ?? 3000,
    paused: options.paused ?? false,
    loop: options.loop ?? true,
    externalProgress: config.externalProgress ?? false,
    progress: config.progress ?? (autoplay ? 0 : 1),
    waiting: false,
    reducedMotion: config.reducedMotion ?? false,
  }
}

export interface CarouselDotsAutoplay {
  readonly duration?: number
  readonly paused?: boolean
  readonly loop?: boolean
}

export interface CarouselDotsConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly resourceIdentity?: string
  readonly count: number
  readonly value: number
  readonly autoplay?: boolean | CarouselDotsAutoplay
  readonly progress?: number
  readonly externalProgress?: boolean
  readonly reducedMotion?: boolean
}

export const CarouselClock = Schema.Struct({
  resourceIdentity: Schema.String,
  count: Schema.NumberFromString,
  value: Schema.NumberFromString,
  autoplay: Schema.Boolean,
  duration: Schema.NumberFromString,
  paused: Schema.Boolean,
  loop: Schema.Boolean,
  externalProgress: Schema.Boolean,
  progress: Schema.NumberFromString,
  waiting: Schema.Boolean,
  reducedMotion: Schema.Boolean,
})

export type CarouselClock = typeof CarouselClock.Type

export const carouselFillAt = (progress: number) =>
  `translateX(calc(${Math.min(Math.max(progress, 0), 1) - 1} * (100% - 6px)))`

export function advanceCarousel(clock: CarouselClock, elapsed: number) {
  if (
    !clock.autoplay ||
    clock.reducedMotion ||
    clock.paused ||
    clock.waiting ||
    elapsed >= 100 ||
    clock.count <= 0 ||
    !Number.isSafeInteger(clock.count) ||
    !Number.isSafeInteger(clock.value) ||
    clock.value < 0 ||
    clock.value >= clock.count
  ) {
    return { clock, requested: null }
  }

  const progress = clock.progress + elapsed / clock.duration

  if (progress < 1) {
    return { clock: modifyFields(clock, { progress: () => progress }), requested: null }
  }

  const nextIndex = (clock.value + 1) % clock.count
  const request = nextIndex !== clock.value && (clock.loop || clock.value < clock.count - 1)

  return {
    clock: modifyFields(clock, { progress: () => 1, waiting: () => request }),
    requested: request ? nextIndex : null,
  }
}
