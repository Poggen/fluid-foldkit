import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Block, Story } from 'foldkit'
import { inertHtml as h } from 'foldkit/html'
import { ChartTooltip } from '../cartesian/layers'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { LiveLineChart, LiveLine, LiveXAxis, LiveYAxis } from './index'
import { LiveConfiguration, LiveState, advanceLive, liveMetrics } from './state'
import { liveBuilt } from './built'
import type { LiveLineChartProps, LiveLineTooltipDatum } from './options'
import type { LiveRow } from './definition'
import { ResolveInput } from './lifecycle'
import { plannerRows } from './input'

const chart = LiveLineChart({ name: 'live-contract' })

export const LiveContractKey = Symbol('live-contract')

const LiveBlock = Block.make(chart.namespace, { ...chart.contract, key: LiveContractKey })

const subject = {
  block: LiveBlock,
  layer: LiveBlock.makeLayer(chart.plans<typeof LiveContractKey>(LiveBlock)),
}

const props: LiveLineChartProps = {
  data: [
    { time: 100, value: 1, price: 40 },
    { time: 101, value: 2, price: 50 },
    { time: 102, value: 3, price: 60 },
  ],
  value: 60,
  window: 10,
  style: { height: 240 },
  children: [LiveLine({ dataKey: 'price' }), LiveXAxis(), LiveYAxis()],
}

const clock = (now: number) => ({
  timeOrigin: 1_000_000,
  now,
  wallNow: 102_000 + now,
  timelineNow: now,
  displayFrameMs: 1000 / 60,
})

it('rolls keyed custom-field samples without mutating prior frames, and freezes then empties the window', () => {
  const initial = new LiveState()
  const seed = advanceLive(initial, props, 0, 400, clock(100))
  const intro = advanceLive(seed, props, 0, 400, clock(116))
  expect(seed.frame?.seed).toBe(true)
  expect(seed.frame?.rows.filter((row) => !row.pad).map((row) => row.v)).toEqual([40, 50])
  expect(intro.frame?.rows.filter((row) => !row.pad).map((row) => row.v)).toEqual([40, 50, 60])
  expect(initial.state.slots).toBe(0)
  expect(seed.state.roll).toBeNull()

  const paused = advanceLive(
    intro,
    { ...props, paused: true, data: [...props.data, { time: 103, value: 4, price: 80 }] },
    1,
    400,
    clock(132),
  )

  expect(paused.frame).toBe(intro.frame)
  const empty = advanceLive(paused, { ...props, data: [] }, 2, 400, clock(148))
  expect(empty.frame).toBeNull()
  const restored = advanceLive(empty, props, 3, 400, clock(164))
  expect(restored.frame?.intro).toBe(true)
})

it.effect(
  'renders the native rolling path and tail at finite geometry and accepts public configuration/data operations',
  () =>
    Effect.gen(function* () {
      const seed = advanceLive(new LiveState(), props, 0, 400, clock(100))
      const state = advanceLive(seed, props, 0, 400, clock(116))
      const { margin, innerHeight, plot, yAxis } = liveMetrics(props, 400, state.state)

      const { built } = liveBuilt({
        frame: state.frame,
        width: 400,
        margin,
        plotMargin: plot.plotMargin,
        innerHeight,
        windowSecs: 10,
        numXTicks: 5,
        lerpSpeed: 0.08,
        pxPerMs: plot.pxPerMs,
        uid: 'contract',
        dataKey: 'price',
        momentumStroke: 'red',
        dotColor: 'blue',
        line: props.children.find((child) => child.kind === 'liveLine')?.props,
        xAxis: {},
        yAxis,
        tooltipCfg: undefined,
        tooltipEnabled: false,
        formatValue: String,
        formatTime: String,
      })

      if (built === null) {
        throw new Error('Expected live frame')
      }

      const runtime = createChartRuntime<LiveRow, Date, number>()

      try {
        const scene = runtime.render(built.definition, { width: 400, height: 240 })
        expect(scene.points.some((point) => point.markId === 'live:line')).toBe(true)
        expect(
          scene.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
        ).toBe(true)
      } finally {
        runtime.destroy()
      }

      yield* Story.story(
        subject,
        Story.init('live', props.data, chart.configuration(props)),
        Story.Command.expectExact(ResolveInput({ id: 'live', generation: 1, data: props.data })),
        Story.Command.resolve(
          ResolveInput,
          LiveBlock.Message.CompletedInput({
            generation: 1,
            identity: 'live/1',
            data: plannerRows(props.data),
          }),
        ),
        Story.message(LiveBlock.Message.ObservedSize({ size: 400 })),
        Story.message(LiveBlock.Message.ObservedClock(clock(100))),
        Story.model((model) => expect(model.state.frame?.seed).toBe(true)),
        Story.inMessage(
          LiveBlock.InMessage.RequestedConfiguration({
            configuration: new LiveConfiguration({ ...props, paused: true }),
          }),
        ),
        Story.Command.expectExact(ResolveInput({ id: 'live', generation: 2, data: props.data })),
        Story.Command.resolve(
          ResolveInput,
          LiveBlock.Message.CompletedInput({
            generation: 2,
            identity: 'live/1',
            data: plannerRows(props.data),
          }),
        ),
        Story.model((model) => expect(model.configuration.props.paused).toBe(true)),
        Story.inMessage(LiveBlock.InMessage.RequestedData({ data: [] })),
        Story.Command.expectExact(ResolveInput({ id: 'live', generation: 3, data: [] })),
        Story.Command.resolve(
          ResolveInput,
          LiveBlock.Message.CompletedInput({ generation: 3, identity: 'live/3', data: [] }),
        ),
        Story.message(LiveBlock.Message.ObservedClock(clock(116))),
        Story.model((model) => expect(model.state.frame).toBeNull()),
      )
    }),
)

it('samples every active frame, commits after 32ms, stops after the first post-roll commit, and restarts for data', () => {
  const seed = advanceLive(new LiveState(), props, 0, 400, clock(100))
  const intro = advanceLive(seed, props, 0, 400, clock(116))
  const { roll } = intro.state

  if (roll?.at === null || roll === null) {
    throw new Error('Expected stamped roll')
  }

  const beforeCommit = advanceLive(intro, props, 0, 400, clock(124))
  expect(beforeCommit.pick.commit).toBe(seed.pick.commit)
  expect(beforeCommit.pick.raw).not.toEqual(intro.pick.raw)
  const commit = advanceLive(beforeCommit, props, 0, 400, clock(132))
  expect(commit.pick.commit).toBe(132)
  let state = commit
  let lastNow = 132

  for (let now = 148; now < roll.at + roll.dur + 80; now += 16) {
    const prior = state
    state = advanceLive(state, props, 0, 400, clock(now))

    if (!state.clockActive) {
      expect(now - state.pick.commit).toBe(0)
      expect(now - roll.at).toBeGreaterThanOrEqual(roll.dur)
      expect(prior.clockActive).toBe(true)
      lastNow = now
      break
    }
  }

  expect(state.clockActive).toBe(false)
  expect(advanceLive(state, props, 0, 400, clock(lastNow + 16))).toBe(state)
  const paused = advanceLive(state, { ...props, paused: true }, 1, 400, clock(lastNow + 16))
  expect(paused.clockActive).toBe(false)
  expect(paused.pick).toEqual(state.pick)
  expect(advanceLive(paused, { ...props, paused: true }, 1, 400, clock(lastNow + 32))).toBe(paused)

  const next = advanceLive(
    state,
    { ...props, data: [...props.data, { time: 103, value: 70, price: 70 }], value: 70 },
    1,
    400,
    clock(lastNow + 32),
  )

  expect(next.clockActive).toBe(true)
  expect(next.frame).not.toBe(state.frame)
})

it('rebases retained monotonic timestamps after a document reload without extending the roll', () => {
  const seed = advanceLive(new LiveState(), props, 0, 400, clock(10_100))
  const intro = advanceLive(seed, props, 0, 400, clock(10_116))
  const { roll } = intro.state

  if (roll === null || roll.at === null) {
    throw new Error('Expected active roll')
  }

  const newOrigin = 1_000_000 + 10_500
  const observation = { ...clock(100), timeOrigin: newOrigin, wallNow: 112_600 }
  const resumed = advanceLive(intro, props, 0, 400, observation)
  expect(resumed.state.roll?.at).toBe(roll.at - 10_500)
  expect(resumed.state.dispStamp).toBe(intro.state.dispStamp - 10_500)
  expect(resumed.timeOrigin).toBe(newOrigin)
  const end = roll.at + roll.dur - 10_500 + 64

  const finished = advanceLive(resumed, props, 0, 400, {
    ...observation,
    now: end,
    timelineNow: end,
  })

  expect(finished.clockActive).toBe(false)
  expect(intro.state.roll?.at).toBe(roll.at)
})

it('publishes synthesized Tooltip values with the default and reserved-key alias behavior', () => {
  const sample = { time: 123_000, value: 7, x: 20, y: 30, pinned: false }
  const cases = [
    { name: 'default', children: [], expectedDate: 'Date', expectedTime: 123, alias: 'value' },
    {
      name: 'date',
      dataKey: 'date',
      children: [],
      expectedDate: 'number',
      expectedTime: 123,
      alias: 'date',
    },
    {
      name: 'time',
      dataKey: 'time',
      children: [],
      expectedDate: 'Date',
      expectedTime: 7,
      alias: 'time',
    },
    {
      name: 'child override',
      dataKey: 'date',
      children: [LiveLine({ dataKey: 'price' })],
      expectedDate: 'Date',
      expectedTime: 123,
      alias: 'price',
    },
  ]

  for (const scenario of cases) {
    const received: Array<LiveLineTooltipDatum> = []
    const source = {
      data: props.data,
      value: 7,
      children: [
        ...scenario.children,
        ChartTooltip<LiveLineTooltipDatum>({
          content: ({ point }) => {
            received.push(point)
            return h.span([], [String(point.time + point.value)])
          },
        }),
      ],
    }
    const tooltipProps: LiveLineChartProps =
      scenario.dataKey === undefined ? source : { ...source, dataKey: scenario.dataKey }
    chart
      .inputs('live-tooltip-contract', tooltipProps)
      .customContent(props.data, null, 400, sample, new LiveState())
    expect(received).toHaveLength(1)
    const point = received[0]

    if (point === undefined) {
      throw new Error('Expected public synthesized Tooltip payload')
    }

    expect(point).not.toBe(props.data[0])
    expect(point.value).toBe(7)
    expect(point.time).toBe(scenario.expectedTime)
    expect(point[scenario.alias]).toBe(7)
    expect(point.unconfiguredAlias).toBeUndefined()
    if (scenario.expectedDate === 'Date') {
      expect(point.date).toBeInstanceOf(Date)
      if (!(point.date instanceof Date)) {
        throw new Error('Expected Date when the configured alias does not overwrite it')
      }
      expect(point.date.getTime()).toBe(123_000)
    } else {
      expect(point.date).toBe(7)
    }
  }
})

it('starts paused without retaining an endless seed clock, and resumes its intro', () => {
  const pausedProps = { ...props, paused: true }
  const paused = advanceLive(new LiveState(), pausedProps, 0, 400, clock(100))
  expect(paused.frame?.seed).toBe(true)
  expect(paused.clockActive).toBe(false)
  expect(advanceLive(paused, pausedProps, 0, 400, clock(116))).toBe(paused)
  const resumed = advanceLive(paused, props, 0, 400, clock(132))
  expect(resumed.clockActive).toBe(true)
  expect(resumed.frame?.intro).toBe(true)
})
