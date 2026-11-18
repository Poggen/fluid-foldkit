import type { ChartMotionDefinition, ChartMotionTiming } from '@tanstack/charts'

const MS_PER_SECOND = 1000

import { cubicBezier } from '../kit/motion/easing'
import type { EnterTransition } from '../kit/motion/phase'
import { resumeEnter, type EnterPlan } from '../kit/motion/resume-enter'

type HeatmapRevealMode = 'enter' | 'fromLoading' | null

/** Enter transition. `duration` is in seconds (bklit/motion convention); `ease` is a cubic-bezier tuple. */
type HeatmapEnterTransition = EnterTransition

const HEATMAP_DEFAULT_ENTER_DURATION_MS = 1600

const HEATMAP_DEFAULT_ENTER_EASE = [0.85, 0, 0.916, 0.282] satisfies readonly [
  number,
  number,
  number,
  number,
]

const HEATMAP_DEFAULT_ENTER_TRANSITION: HeatmapEnterTransition = {
  duration: 1.6,
  ease: HEATMAP_DEFAULT_ENTER_EASE,
  type: 'tween',
}

const HEATMAP_LOADING_CHART_OPACITY = 1

const HEATMAP_DEFAULT_LOADING_CELL_MAX_OPACITY = 0.85

const HEATMAP_DEFAULT_LOADING_CELL_RANDOMNESS = 1

const HEATMAP_LOADING_CONCEAL_MS = 450

const HEATMAP_ENTER_STAGGER_SPREAD = 0.6

const HEATMAP_HOVER_TRANSITION_MS = 220

const HEATMAP_RESTART_MS = 340

const SETTLED_OPACITY = 0.999

const HEATMAP_READY_EASE = cubicBezier(0.4, 0, 0.2, 1)

const PARK_MILLER_MODULUS = 2_147_483_647

const PARK_MILLER_MODULUS_MINUS_ONE = 2_147_483_646

const PARK_MILLER_MULTIPLIER = 16_807

const seededRandom: (seed: number) => () => number = (seed: number) => {
  let state = seed % PARK_MILLER_MODULUS

  if (state <= 0) {
    state += PARK_MILLER_MODULUS_MINUS_ONE
  }

  return () => {
    state = (state * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS

    return (state - 1) / PARK_MILLER_MODULUS_MINUS_ONE
  }
}

const HEATMAP_SEED_COLUMN_FACTOR = 1009

const HEATMAP_SEED_ROW_FACTOR = 9176

const HEATMAP_REVEAL_EPOCH_SALT = 524_287

const HEATMAP_MIN_ENTER_STAGGER_SCALE = 0.25

const HEATMAP_MAX_ENTER_FADE_SEC = 0.45

const HEATMAP_FADE_DURATION_FRACTION = 0.3

const heatmapCellSeed: (column: number, row: number) => number = (column: number, row: number) =>
  column * HEATMAP_SEED_COLUMN_FACTOR + row * HEATMAP_SEED_ROW_FACTOR

interface ComputeHeatmapEnterFadeDelayParams {
  readonly column: number
  readonly row: number
  readonly revealEpoch: number
  readonly animationDurationMs: number
  readonly enterStaggerScale: number
  readonly fadeDurationSec: number
}

const computeHeatmapEnterFadeDelayMs: (
  params: Readonly<ComputeHeatmapEnterFadeDelayParams>,
) => number = (params: Readonly<ComputeHeatmapEnterFadeDelayParams>) => {
  const seed =
    heatmapCellSeed(params.column, params.row) + params.revealEpoch * HEATMAP_REVEAL_EPOCH_SALT

  const random = seededRandom(seed)
  const fadeMs = params.fadeDurationSec * MS_PER_SECOND
  const maxDelayMs = Math.max(0, params.animationDurationMs - fadeMs)

  const spreadMs =
    maxDelayMs *
    HEATMAP_ENTER_STAGGER_SPREAD *
    Math.max(params.enterStaggerScale, HEATMAP_MIN_ENTER_STAGGER_SCALE)

  return random() * spreadMs
}

const resolveHeatmapEnterFadeDurationSec: (
  enterTransition: Readonly<HeatmapEnterTransition> | undefined,
  animationDurationMs: number,
) => number = (
  enterTransition: Readonly<HeatmapEnterTransition> | undefined,
  animationDurationMs: number,
) => {
  if (enterTransition?.duration !== undefined) {
    return enterTransition.duration
  }

  return Math.min(
    HEATMAP_MAX_ENTER_FADE_SEC,
    (animationDurationMs / MS_PER_SECOND) * HEATMAP_FADE_DURATION_FRACTION,
  )
}

const isBezierTuple = (ease: unknown): ease is readonly [number, number, number, number] =>
  Array.isArray(ease) && ease.length === 4 && ease.every((point) => Number.isFinite(point))

interface HeatmapCellMotionParams {
  readonly animate: boolean
  readonly animationDuration: number
  readonly enterTransition: Readonly<HeatmapEnterTransition> | undefined
  readonly enterStaggerScale: number
  readonly revealEpoch: number
  /** First-enter clock, owned by the chart (the definition is rebuilt on layout changes; the schedule must outlive it). */
  readonly clock: HeatmapEnterClock
}

interface HeatmapEnterClock {
  at: number | null
  /** The render that mounted the svg, where bklit's enter clock starts (null on a replay); read once at the first enter. */
  readonly origin: () => number | null
  readonly now: () => number
}

const cellEnterCurve: (
  enter: (t: number) => number,
  delayMs: number,
  durationMs: number,
  cutMs: number,
) => (t: number) => number = (
  enter: (t: number) => number,
  delayMs: number,
  durationMs: number,
  cutMs: number,
) => {
  const total = cutMs + HEATMAP_HOVER_TRANSITION_MS
  const restarts = HEATMAP_RESTART_MS < cutMs
  const atRestart = enter(Math.max(0, HEATMAP_RESTART_MS - delayMs) / durationMs)

  const valueAtCut = restarts
    ? atRestart +
      (1 - atRestart) * enter(Math.max(0, cutMs - HEATMAP_RESTART_MS - delayMs) / durationMs)
    : enter(Math.max(0, cutMs - delayMs) / durationMs)

  const at: (t: number) => number = (t: number) => {
    const ms = t * total

    if (ms >= cutMs) {
      return (
        valueAtCut +
        (1 - valueAtCut) * HEATMAP_READY_EASE((ms - cutMs) / HEATMAP_HOVER_TRANSITION_MS)
      )
    }

    if (!restarts || ms < HEATMAP_RESTART_MS) {
      return enter(Math.max(0, ms - delayMs) / durationMs)
    }

    return (
      atRestart +
      (1 - atRestart) * enter(Math.max(0, ms - HEATMAP_RESTART_MS - delayMs) / durationMs)
    )
  }

  return (t) => {
    const v = at(t)

    return v >= SETTLED_OPACITY ? 1 : v
  }
}

const createHeatmapCellMotion: <Datum extends { readonly column: number; readonly row: number }>(
  params: Readonly<HeatmapCellMotionParams>,
) => ChartMotionDefinition<Datum> | false = <
  Datum extends { readonly column: number; readonly row: number },
>(
  params: Readonly<HeatmapCellMotionParams>,
) => {
  if (!params.animate || params.animationDuration <= 0) {
    return false satisfies ChartMotionDefinition<Datum> | false
  }

  const fadeDurationSec = resolveHeatmapEnterFadeDurationSec(
    params.enterTransition,
    params.animationDuration,
  )

  const durationMs = fadeDurationSec * MS_PER_SECOND
  const ease = params.enterTransition?.ease
  const easing = cubicBezier(...(isBezierTuple(ease) ? ease : HEATMAP_DEFAULT_ENTER_EASE))

  const { clock } = params

  const delayOf: (datum: Datum) => number = (datum: Datum) =>
    computeHeatmapEnterFadeDelayMs({
      animationDurationMs: params.animationDuration,
      column: datum.column,
      enterStaggerScale: params.enterStaggerScale,
      fadeDurationSec,
      revealEpoch: params.revealEpoch,
      row: datum.row,
    })

  const cutMs = Math.max(params.animationDuration, durationMs)

  const planOf: (datum: Datum) => EnterPlan = (datum: Datum) => ({
    delay: 0,
    duration: cutMs + HEATMAP_HOVER_TRANSITION_MS,
    easing: cellEnterCurve(easing, delayOf(datum), durationMs, cutMs),
  })

  return ((context) => {
    if (context.phase === 'exit') {
      return {
        transition: { duration: HEATMAP_LOADING_CONCEAL_MS, easing: 'ease-in-out', type: 'tween' },
      } satisfies false | ChartMotionTiming<Datum> | undefined
    }

    const { datum } = context

    if (context.phase === 'update') {
      return (
        datum === undefined ? false : resumeEnter(planOf(datum), clock.at, clock.now())
      ) satisfies false | ChartMotionTiming<Datum> | undefined
    }

    if (datum === undefined) {
      return undefined satisfies false | ChartMotionTiming<Datum> | undefined
    }

    clock.at ??= clock.origin() ?? clock.now()

    return resumeEnter(planOf(datum), clock.at, clock.now()) satisfies
      | false
      | ChartMotionTiming<Datum>
      | undefined
  }) satisfies ChartMotionDefinition<Datum> | false
}

export {
  HEATMAP_DEFAULT_ENTER_DURATION_MS,
  HEATMAP_DEFAULT_ENTER_TRANSITION,
  HEATMAP_DEFAULT_LOADING_CELL_MAX_OPACITY,
  HEATMAP_DEFAULT_LOADING_CELL_RANDOMNESS,
  HEATMAP_HOVER_TRANSITION_MS,
  HEATMAP_LOADING_CHART_OPACITY,
  createHeatmapCellMotion,
  heatmapCellSeed,
  seededRandom,
}

export type { HeatmapEnterClock, HeatmapEnterTransition, HeatmapRevealMode }
