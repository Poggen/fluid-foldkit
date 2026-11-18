import { makeModifyFieldsFor } from 'foldkit/struct'
import { ChartViewport } from './viewport'
import { shouldTweenYDomain } from './y-domain-utils'
import { absurd, Effect, Option, Record, Schema } from 'effect'
import type { SweepObservation, PhaseTimingObservation, DragObservation } from './observations'
import { REVEAL_EASING } from '../kit/motion/easing'
import type { ChartPhase } from '../kit/motion/phase'

export const replaceInteraction: <Model extends Interaction>(
  model: Model,
  next: Interaction,
) => Model = function replaceInteraction<Model extends Interaction>(
  model: Model,
  next: Interaction,
) {
  return modifyInteraction(model, {
    sweepCycles: () => next.sweepCycles,
    dragAnchor: () => next.dragAnchor,
    focusCandidates: () => next.focusCandidates,
    domains: () => next.domains,
    viewport: () => next.viewport,
    yDomainFrom: () => next.yDomainFrom,
    updateStep: () => next.updateStep,
    configuration: () => next.configuration,
    phase: () => next.phase,
    generation: () => next.generation,
    elapsedPulseMs: () => next.elapsedPulseMs,
    phaseClockReady: () => next.phaseClockReady,
    phaseClockAt: () => next.phaseClockAt,
    yTweens: () => next.yTweens,
    revealReady: () => next.revealReady,
    selection: () => next.selection,
    brush: () => next.brush,
    hoveredLegend: () => next.hoveredLegend,
    hoveredProfitLossLegend: () => next.hoveredProfitLossLegend,
  }) satisfies Model
}

export const observeSweep: <State extends Interaction>(
  state: State,
  event: SweepObservation,
) => State = function observeSweep<State extends Interaction>(
  state: State,
  event: SweepObservation,
) {
  if (event.generation !== state.generation) {
    return state satisfies State
  }

  if (event.kind === 'mounted' && state.sweepCycles[event.seriesId] !== undefined) {
    return state satisfies State
  }

  const sweepCycles =
    event.kind === 'removed'
      ? Record.remove(state.sweepCycles, event.seriesId)
      : Record.set(
          state.sweepCycles,
          event.seriesId,
          event.kind === 'mounted' ? 0 : (state.sweepCycles[event.seriesId] ?? 0) + 1,
        )

  return modifyInteraction(state, { sweepCycles: () => sweepCycles }) satisfies State
}

export const observePhaseTiming: <State extends Interaction>(
  state: State,
  event: PhaseTimingObservation,
) => State = function observePhaseTiming<State extends Interaction>(
  state: State,
  event: PhaseTimingObservation,
) {
  return (
    event.generation !== state.generation || state.phaseClockReady
      ? state
      : modifyInteraction(state, {
          phaseClockReady: () => true,
          phaseClockAt: () => Option.some(event.at),
          elapsedPulseMs: () => Option.fromNullishOr(event.elapsed),
        })
  ) satisfies State
}

export const initialInteraction: (configuration?: Configuration) => Interaction =
  function initialInteraction(configuration: Configuration = defaultConfiguration) {
    return {
      sweepCycles: {},
      dragAnchor: Option.none(),
      focusCandidates: Option.none(),
      domains: {},
      viewport: Option.none(),
      yDomainFrom: {},
      updateStep: 'none',
      configuration,
      phase: configuration.status === 'loading' ? 'loading' : 'ready',
      generation: 0,
      elapsedPulseMs: Option.none(),
      phaseClockReady: false,
      phaseClockAt: Option.none(),
      yTweens: false,
      revealReady: configuration.status === 'ready' && configuration.animationDuration <= 0,
      selection: Option.none(),
      brush: Option.none(),
      hoveredLegend: Option.none(),
      hoveredProfitLossLegend: Option.none(),
    }
  }

export const phaseAfterStatus: (status: typeof Status.Type, phase: LoadingPhase) => LoadingPhase =
  function phaseAfterStatus(status: typeof Status.Type, phase: LoadingPhase) {
    if (status === 'loading') {
      return phase === 'loading' ? phase : 'concealing'
    }

    if (phase === 'loading' || phase === 'concealing' || phase === 'tweenLoading') {
      return 'exiting'
    }

    return phase
  }

export const phasePlan: (
  state: Interaction,
  sweep: boolean,
) => {
  readonly next: LoadingPhase
  readonly delay: number
  readonly onFrame: boolean
  readonly exit?: ReturnType<typeof pulseExitFrom>
} | null = function phasePlan(state: Interaction, sweep: boolean) {
  const yMs =
    state.configuration.yDomainTween && state.yTweens
      ? Math.max(0, state.configuration.yDomainTweenDuration)
      : 0

  switch (state.phase) {
    case 'swap': {
      return { next: 'tween', delay: 0, onFrame: true }
    }

    case 'exiting': {
      if (sweep) {
        return { next: 'swap', delay: 450, onFrame: false }
      }

      const exit = pulseExitFrom(Option.getOrUndefined(state.elapsedPulseMs))

      return { next: 'swap', delay: exit.growMs + exit.shrinkMs, onFrame: false, exit }
    }

    case 'tween': {
      return { next: 'ready', delay: yMs, onFrame: false }
    }

    case 'concealing': {
      return {
        next: 'tweenLoading',
        delay: Math.max(0, state.configuration.animationDuration),
        onFrame: false,
      }
    }

    case 'tweenLoading': {
      return { next: 'loading', delay: yMs, onFrame: false }
    }

    case 'loading':
    case 'ready': {
      return null
    }

    default: {
      return absurd(state.phase)
    }
  }
}

export const configureInteraction: (
  state: Interaction,
  configuration: Configuration,
) => Interaction = function configureInteraction(state: Interaction, configuration: Configuration) {
  const replay = state.configuration.revealSignature !== configuration.revealSignature

  if (replay) {
    return modifyInteraction(initialInteraction(configuration), {
      generation: () => state.generation + 1,
    })
  }

  const phase = phaseAfterStatus(configuration.status, state.phase)
  const next = modifyInteraction(state, {
    configuration: () => configuration,
    phase: () => phase,
  })

  if (phase === state.phase) {
    return next
  }

  return modifyInteraction(next, {
    generation: (generation) => generation + 1,
    phaseClockReady: () => false,
    phaseClockAt: () => Option.none(),
    elapsedPulseMs: () => Option.none(),
    revealReady: () => phase === 'ready' && configuration.animationDuration <= 0,
    selection: () => Option.none(),
  })
}

/** Public phases distinguish the real reveal/domain lifecycle from requested data status. */
export const timeSeriesChartPhase: (state: Interaction) => ChartPhase =
  function timeSeriesChartPhase(state: Interaction) {
    if (state.phase === 'ready') {
      return state.revealReady ? 'ready' : 'revealing'
    }

    return publicPhases[state.phase]
  }

export const yDomainsTween: (from: Domains, to: Domains) => boolean = function yDomainsTween(
  from: Domains,
  to: Domains,
) {
  return Object.entries(to).some(([id, next]) => {
    const previous = from[id] ?? next

    return shouldTweenYDomain(previous, next)
  })
}

export const drawingStateChanged: (previous: Interaction, next: Interaction) => boolean =
  function drawingStateChanged(previous: Interaction, next: Interaction) {
    return (
      previous.configuration !== next.configuration ||
      previous.revealReady !== next.revealReady ||
      previous.phase !== next.phase ||
      previous.brush !== next.brush ||
      previous.updateStep !== next.updateStep ||
      previous.yDomainFrom !== next.yDomainFrom
    )
  }

export const observeDrag: (
  state: Interaction,
  event: DragObservation,
  selectionHover?: 'anchor' | 'clear',
) => Partial<Interaction> & {
  readonly focusedIndex?: Option.Option<number>
  readonly focusSource?: 'pointer'
} = function observeDrag(
  state: Interaction,
  event: DragObservation,
  selectionHover: 'anchor' | 'clear' = 'anchor',
) {
  if (event.kind === 'start') {
    return {
      dragAnchor: Option.some({ x: event.x, index: event.index }),
      selection: Option.none(),
      focusedIndex: Option.none(),
      focusSource: 'pointer',
    }
  }

  const anchor = Option.getOrUndefined(state.dragAnchor)

  if (anchor === undefined) {
    return {}
  }

  if (event.kind === 'end') {
    const released = { dragAnchor: Option.none(), selection: Option.none() }
    return selectionHover === 'clear'
      ? { ...released, focusedIndex: Option.none(), focusSource: 'pointer' }
      : released
  }

  return {
    selection: Option.some({
      startX: Math.min(anchor.x, event.x),
      endX: Math.max(anchor.x, event.x),
      startIndex: Math.min(anchor.index, event.index),
      endIndex: Math.max(anchor.index, event.index),
      active: true,
    }),
    focusedIndex: selectionHover === 'clear' ? Option.none() : Option.some(anchor.index),
    focusSource: 'pointer',
  }
}

export const advanceInteraction: (state: Interaction, next: LoadingPhase) => Interaction =
  function advanceInteraction(state: Interaction, next: LoadingPhase) {
    const before = loadingFlags(state.phase)
    const after = loadingFlags(next)
    const changed = before.skeletonRows !== after.skeletonRows

    const reset =
      before.chartLoading !== after.chartLoading || before.gridLoading !== after.gridLoading

    const advanced = modifyInteraction(state, {
      phase: () => next,
      generation: (generation) => generation + 1,
      phaseClockReady: () => false,
      phaseClockAt: () => Option.none(),
      elapsedPulseMs: () => Option.none(),
    })

    if (changed) {
      return modifyInteraction(advanced, {
        updateStep: () => 'snap',
        yDomainFrom: () => state.domains,
      })
    }

    if (reset) {
      return modifyInteraction(advanced, { updateStep: () => 'none', yDomainFrom: () => ({}) })
    }

    return advanced
  }

export const Status = Schema.Literals(['loading', 'ready'])

export const LoadingPhase = Schema.Literals([
  'loading',
  'exiting',
  'swap',
  'tween',
  'ready',
  'concealing',
  'tweenLoading',
])

export type LoadingPhase = typeof LoadingPhase.Type

export const Configuration = Schema.Struct({
  status: Status,
  animationDuration: Schema.Finite,
  yDomainTween: Schema.Boolean,
  yDomainTweenDuration: Schema.Finite.pipe(Schema.withDecodingDefaultTypeKey(Effect.succeed(500))),
  revealSignature: Schema.String,
})

export type Configuration = typeof Configuration.Type

export const Selection = Schema.Struct({
  startX: Schema.Finite,
  endX: Schema.Finite,
  startIndex: Schema.Int,
  endIndex: Schema.Int,
  active: Schema.Boolean,
})

export const BrushRange = Schema.Struct({ start: Schema.Finite, end: Schema.Finite })

export const Domains = Schema.Record(Schema.String, Schema.Tuple([Schema.Finite, Schema.Finite]))

export type Domains = typeof Domains.Type

export const DragAnchor = Schema.Struct({ x: Schema.Finite, index: Schema.Int })

export const InteractionFields = {
  sweepCycles: Schema.Record(Schema.String, Schema.Int),
  dragAnchor: Schema.Option(DragAnchor),
  focusCandidates: Schema.Option(Schema.Array(Schema.Int)),
  domains: Domains,
  viewport: Schema.Option(ChartViewport).pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed(Option.none<ChartViewport>())),
  ),
  yDomainFrom: Domains,
  updateStep: Schema.Literals(['none', 'snap', 'glide', 'window']),
  configuration: Configuration,
  phase: LoadingPhase,
  generation: Schema.Int,
  elapsedPulseMs: Schema.Option(Schema.Finite),
  phaseClockReady: Schema.Boolean,
  phaseClockAt: Schema.Option(Schema.Finite),
  yTweens: Schema.Boolean,
  revealReady: Schema.Boolean,
  selection: Schema.Option(Selection),
  brush: Schema.Option(BrushRange),
  hoveredLegend: Schema.Option(Schema.Int),
  hoveredProfitLossLegend: Schema.Option(Schema.Int).pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed(Option.none<number>())),
  ),
}

export const Interaction = Schema.Struct(InteractionFields)

export type Interaction = typeof Interaction.Type

const modifyInteraction = makeModifyFieldsFor<Interaction>()

export const defaultConfiguration: Configuration = {
  status: 'ready',
  animationDuration: 1100,
  yDomainTween: true,
  yDomainTweenDuration: 500,
  revealSignature: '',
}

export function pulseExitFrom(elapsedMs: number | undefined) {
  const progress = elapsedMs === undefined ? 0 : REVEAL_EASING(Math.min(1, elapsedMs / 2200))

  return progress < 0.5
    ? {
        from: progress,
        mid: 0.5,
        growMs: Math.max(10, (1100 * (0.5 - progress)) / 0.5),
        shrinkMs: 1100,
      }
    : {
        from: progress,
        mid: progress,
        growMs: 0,
        shrinkMs: Math.max(10, (1100 * (1 - progress)) / 0.5),
      }
}

const publicPhases = {
  loading: 'loading',
  exiting: 'exiting',
  swap: 'gridTweenReady',
  tween: 'gridTweenReady',
  concealing: 'exitingReady',
  tweenLoading: 'gridTweenLoading',
} satisfies Record<Exclude<LoadingPhase, 'ready'>, ChartPhase>

export function loadingFlags(phase: LoadingPhase) {
  const chartLoading = phase === 'loading' || phase === 'exiting'

  return {
    chartLoading,
    skeletonRows: chartLoading || phase === 'swap' || phase === 'tweenLoading',
    gridLoading: chartLoading || phase === 'tweenLoading',
  }
}

export function loadingWipe(phase: LoadingPhase, animationDuration: number) {
  if (phase === 'loading' || phase === 'exiting') {
    return { progress: 1, duration: 0, conceal: false }
  }

  if (phase === 'swap') {
    return { progress: 0, duration: 0, conceal: false }
  }

  if (phase === 'tween') {
    return { progress: 0, duration: animationDuration, conceal: false }
  }

  if (phase === 'concealing' || phase === 'tweenLoading') {
    return { progress: 0, duration: phase === 'concealing' ? animationDuration : 0, conceal: true }
  }

  return { progress: 1, duration: animationDuration, conceal: false }
}
