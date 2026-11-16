import type { LiveLineChartProps } from './options'
import type { LogicalProps } from './model-schema'
import { plannerRows } from './input'
import type { Frame, FrameState, StepPick } from './live-frame'
import { initialLiveState, planLiveFrame } from './planner'
import { livePlot, parseHeight } from './geometry'
import { yTickValues } from './live-yaxis'
import { pickStep, stepRaw, shownDomain, rollYAt } from './live-frame'

export class LiveConfiguration {
  readonly props: LogicalProps
  readonly sourceData: LiveLineChartProps['data']
  constructor(props: LiveLineChartProps) {
    this.sourceData = props.data
    const yAxis = props.children.find((child) => child.kind === 'liveYAxis')?.props
    const line = props.children.find((child) => child.kind === 'liveLine')?.props
    this.props = {
      data: plannerRows(props.data),
      value: props.value,
      dataKey: line?.dataKey ?? props.dataKey ?? 'value',
      window: props.window ?? 30,
      numXTicks: props.numXTicks ?? 5,
      nowOffsetUnits: props.nowOffsetUnits ?? 0,
      exaggerate: props.exaggerate ?? false,
      lerpSpeed: props.lerpSpeed ?? 0.08,
      paused: props.paused ?? false,
      margin: { top: 24, right: 16, bottom: 32, left: 16, ...props.margin },
      style: { height: parseHeight(props.style?.height) },
      children: [
        {
          kind: 'liveYAxis',
          props: {
            minGap: yAxis?.minGap ?? 36,
            position: yAxis?.position ?? 'left',
            allowDecimals: yAxis?.allowDecimals ?? true,
          },
        },
      ],
    }
  }
}

export class LiveState {
  readonly state: FrameState
  readonly pick: StepPick
  readonly frame: Frame | null
  readonly revision: number
  readonly width: number
  readonly introStarted: boolean
  readonly follow: boolean
  readonly labelDomain: readonly [number, number]
  readonly labelValues: ReadonlyArray<number>
  readonly leavingLabels: ReadonlyArray<number>
  readonly labelInterval: number
  readonly clockActive: boolean
  readonly timeOrigin: number | null
  constructor(
    state: FrameState = initialLiveState(),
    pick: StepPick = { range: 0, interval: 0, commit: 0, raw: null },
    frame: Frame | null = null,
    revision = -1,
    width = 0,
    introStarted = false,
    follow = false,
    labelDomain: readonly [number, number] = [0, 100],
    labelInterval = 0,
    labelValues: ReadonlyArray<number> = [],
    leavingLabels: ReadonlyArray<number> = [],
    clockActive = true,
    timeOrigin: number | null = null,
  ) {
    this.timeOrigin = timeOrigin
    this.clockActive = clockActive
    this.state = state
    this.pick = pick
    this.frame = frame
    this.revision = revision
    this.width = width
    this.introStarted = introStarted
    this.follow = follow
    this.labelDomain = labelDomain
    this.labelInterval = labelInterval
    this.labelValues = labelValues
    this.leavingLabels = leavingLabels
  }
}

export interface LiveClock {
  readonly timeOrigin: number
  readonly now: number
  readonly wallNow: number
  readonly timelineNow: number
  readonly displayFrameMs: number
}

export function liveMetrics(props: LiveLineChartProps, width: number, state: FrameState) {
  const margin = { top: 24, right: 16, bottom: 32, left: 16, ...props.margin }
  const yAxis = props.children.find((c) => c.kind === 'liveYAxis')?.props
  const height = parseHeight(props.style?.height)

  const plot = livePlot(
    {
      width,
      data: props.data,
      windowSecs: props.window ?? 30,
      numXTicks: props.numXTicks ?? 5,
      nowOffsetUnits: props.nowOffsetUnits ?? 0,
      margin,
      rightAxis: yAxis?.position === 'right',
    },
    state.windowSecs === (props.window ?? 30) ? state.interval : 0,
  )

  return {
    margin,
    height,
    innerHeight: Math.max(0, height - margin.top - margin.bottom),
    plot,
    yAxis,
  }
}

export function rebaseLiveClock(previous: LiveState, timeOrigin: number): LiveState {
  if (previous.timeOrigin === timeOrigin) return previous

  if (previous.timeOrigin === null) {
    const { ...retained } = previous

    return { ...retained, timeOrigin }
  }

  const offset = previous.timeOrigin - timeOrigin
  const { ...retained } = previous

  return {
    ...retained,
    timeOrigin,
    state: {
      ...previous.state,
      stamp: previous.state.stamp + offset,
      dispStamp: previous.state.dispStamp + offset,
      roll:
        previous.state.roll === null
          ? null
          : {
              ...previous.state.roll,
              at: previous.state.roll.at === null ? null : previous.state.roll.at + offset,
            },
    },
    pick: { ...previous.pick, commit: previous.pick.commit + offset },
  }
}

export function advanceLive(
  retained: LiveState,
  props: LiveLineChartProps,
  revision: number,
  width: number,
  clock: LiveClock,
  dataIdentity = 'initial',
): LiveState {
  const previous = rebaseLiveClock(retained, clock.timeOrigin)

  if (width === 0) return previous
  const { margin, innerHeight, plot, yAxis } = liveMetrics(props, width, previous.state)
  const line = props.children.find((c) => c.kind === 'liveLine')?.props
  const lerpSpeed = props.lerpSpeed ?? 0.08
  const minGap = yAxis?.minGap ?? 36

  const changed =
    previous.revision !== revision ||
    previous.width !== width ||
    ((previous.frame?.seed ?? false) && !props.paused)

  if (!changed && !previous.clockActive) return previous

  const planned = changed
    ? planLiveFrame(
        {
          width,
          data: props.data,
          dataIdentity,
          value: props.value,
          dataKey: line?.dataKey ?? props.dataKey ?? 'value',
          top: margin.top,
          windowSecs: props.window ?? 30,
          exaggerate: props.exaggerate ?? false,
          lerpSpeed,
          paused: props.paused ?? false,
          pxPerMs: plot.pxPerMs,
          plotWidth: plot.plotWidth,
          stepSecs: plot.stepSecs,
          innerHeight,
          minGap,
          plotRight: plot.plotRight,
          rollEdge: plot.rollEdge,
          introRun: previous.introStarted,
          ...clock,
        },
        previous.state,
        previous.pick,
      )
    : {
        state: {
          ...previous.state,
          roll: previous.state.roll === null ? null : { ...previous.state.roll },
        },
        pick: {
          ...previous.pick,
          raw:
            previous.pick.raw === null
              ? null
              : ([previous.pick.raw[0], previous.pick.raw[1]] satisfies [number, number]),
        },
        frame: previous.frame,
      }

  const { state, pick } = planned

  const frame =
    planned.frame !== null && props.paused && previous.frame !== null
      ? previous.frame
      : planned.frame

  if (frame === null)
    return new LiveState(
      state,
      pick,
      null,
      revision,
      width,
      previous.introStarted,
      false,
      previous.labelDomain,
      previous.labelInterval,
      [],
      [],
      false,
      clock.timeOrigin,
    )

  if (frame === previous.frame && !previous.clockActive)
    return new LiveState(
      state,
      pick,
      frame,
      revision,
      width,
      previous.introStarted,
      previous.follow,
      previous.labelDomain,
      previous.labelInterval,
      previous.labelValues,
      previous.leavingLabels,
      false,
      clock.timeOrigin,
    )

  if (state.roll !== null && state.roll.at === null) state.roll.at = clock.timelineNow
  const raw = stepRaw(pick, frame.yTarget, lerpSpeed)
  const frameChanged = frame !== previous.frame
  let clockActive = !props.paused && (frameChanged || previous.clockActive)
  let domain = frameChanged ? frame.yDomain : previous.labelDomain
  let interval = frameChanged ? frame.interval : previous.labelInterval
  const follow = frameChanged ? frame.intro || (previous.frame?.intro ?? false) : previous.follow

  if (clock.now - pick.commit >= 32) {
    pick.commit = clock.now
    interval = pickStep(pick, raw, innerHeight, minGap)

    if (
      !frame.seed &&
      (state.roll === null ||
        (state.roll.at !== null && clock.timelineNow - state.roll.at >= state.roll.dur))
    )
      clockActive = false

    if (!frame.seed && follow)
      domain = shownDomain(
        frame.yDomain,
        rollYAt(state.roll, clock.timelineNow),
        margin.top,
        innerHeight,
      )
  }

  if (domain[0] === previous.labelDomain[0] && domain[1] === previous.labelDomain[1])
    domain = previous.labelDomain
  const values = yTickValues(domain, interval, innerHeight, yAxis?.allowDecimals !== false)
  const was = !frameChanged || follow ? [...previous.labelValues, ...previous.leavingLabels] : []
  const currentValues = new Set(values)
  const leaving = [...new Set(was.filter((value) => !currentValues.has(value)))]

  return new LiveState(
    state,
    pick,
    frame,
    revision,
    width,
    true,
    follow,
    domain,
    interval,
    values,
    leaving,
    clockActive,
    clock.timeOrigin,
  )
}
