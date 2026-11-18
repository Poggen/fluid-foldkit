import { DateTime, Effect, Option, Predicate, Schema } from 'effect'
import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { LineChart } from '../root'
import { Line } from '../layers'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode, ChartMotionContext } from '@tanstack/charts'
import { timeSeriesChartPhase } from '../state'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const recipe = LineChart({ name: 'state-contract-line', Row })

export const StateChartKey = Symbol('Cartesian')

const chart = Block.make(recipe.namespace, { key: StateChartKey, ...recipe.contract })

const layer = chart.makeLayer(recipe.plans<typeof StateChartKey>(chart))

const subject = { block: chart, layer }

const configuration = recipe.configuration({ children: [Line({ dataKey: 'value' })] })

const data = [10, 20, 30].map((value, index) =>
  Row.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2025, 0, index + 1))), value }),
)

const windowRecipe = LineChart({ name: 'window-contract-line', Row })

export const WindowChartKey = Symbol('Cartesian')

const windowChart = Block.make(windowRecipe.namespace, {
  key: WindowChartKey,
  ...windowRecipe.contract,
})

const windowSubject = {
  block: windowChart,
  layer: windowChart.makeLayer(windowRecipe.plans<typeof WindowChartKey>(windowChart)),
}

const wipeRecipe = LineChart({ name: 'ready-wipe-policy', Row })

export const WipeChartKey = Symbol('Cartesian')

const wipeChart = Block.make(wipeRecipe.namespace, { key: WipeChartKey, ...wipeRecipe.contract })

const wipeSubject = {
  block: wipeChart,
  layer: wipeChart.makeLayer(wipeRecipe.plans<typeof WipeChartKey>(wipeChart)),
}

const completeReveal = Story.messageWith((model: typeof chart.Model.Type) =>
  chart.Message.CompletedReveal({ generation: model.generation }),
)

const advance = Story.messageWith((model: typeof chart.Model.Type) =>
  chart.Message.ObservedPhaseDeadline({ generation: model.generation }),
)

describe('checked Line root operations', () => {
  it.effect('rejects stale loading deadlines after an interrupted conceal', () =>
    Effect.gen(function* () {
      const concealed = yield* Story.story(
        subject,
        Story.init('state-contract', data),
        Story.inMessage(
          chart.InMessage.RequestedConfigure({
            configuration: { ...configuration, status: 'loading' },
          }),
        ),
        Story.model((model) => expect(model.phase).toBe('concealing')),
      )
      yield* Story.story(
        subject,
        Story.given(concealed),
        Story.inMessage(chart.InMessage.RequestedConfigure({ configuration })),
        Story.model((model) => expect(model.phase).toBe('exiting')),
        Story.models(
          Story.steps(
            Story.message(
              chart.Message.ObservedPhaseDeadline({ generation: concealed.generation }),
            ),
          ),
          (before, after) => expect(after).toBe(before),
        ),
        advance,
        Story.model((model) => expect(model.phase).toBe('swap')),
        Story.Command.expectNone(),
      )
    }),
  )

  it.effect(
    'clamps caller data and synchronously round-trips Date and Option through its codec',
    () =>
      Story.story(
        subject,
        Story.init('state-codec', data),
        Story.inMessage(chart.InMessage.RequestedFocus({ index: 2 })),
        Story.inMessage(chart.InMessage.RequestedData({ data: data.slice(0, 1) })),
        Story.model((model) => {
          expect(Option.getOrNull(model.focusedIndex)).toBe(0)
          const codec = Schema.toCodecJson(chart.Model)
          const wire = structuredClone(Schema.encodeSync(codec)(model))
          const decoded = Schema.decodeSync(codec)(wire)
          expect(decoded.data[0]?.date).toBeInstanceOf(Date)
          expect(decoded.data[0]?.date.getTime()).toBe(Date.UTC(2025, 0, 1))
          expect(decoded).toEqual(model)
        }),
        Story.inMessage(chart.InMessage.RequestedData({ data: [] })),
        Story.model((model) => {
          expect(Option.getOrNull(model.focusedIndex)).toBeNull()
        }),
        Story.Command.expectNone(),
      ),
  )
})

it.effect('renders the accepted public brush range with the caller rows', () =>
  Story.story(
    windowSubject,
    Story.init('window-contract', data),
    Story.inMessage(
      windowChart.InMessage.RequestedBrush({
        range: Option.some({ start: Date.UTC(2025, 0, 2), end: Date.UTC(2025, 0, 3) }),
      }),
    ),
    Story.model((model) => {
      const inputs = windowRecipe.inputs('window-contract', {
        width: 640,
        height: 320,
        children: [Line({ dataKey: 'value' })],
      })

      let domain: readonly [Date, Date] | undefined

      const definition = inputs.resourceDefinition?.(
        data,
        model,
        (snapshot) => {
          domain = snapshot.domains.x
        },
        () => 0,
      )

      if (definition === undefined) {
        throw new Error('The Line requires its drawing definition')
      }

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        runtime.render(definition, { width: 640, height: 320 })
        expect(domain?.map(Number)).toEqual([Date.UTC(2025, 0, 2), Date.UTC(2025, 0, 3)])
      } finally {
        runtime.destroy()
      }
    }),
  ),
)

it.effect('owns sweep seeds and rejects observations from old generations', () =>
  Effect.gen(function* () {
    const cycled = yield* Story.story(
      subject,
      Story.init('sweep-contract', data),
      Story.messageWith((model) =>
        chart.Message.ObservedSweepCycle({
          kind: 'mounted',
          generation: model.generation,
          seriesId: 'line:value',
        }),
      ),
      Story.model((model) => expect(model.sweepCycles['line:value']).toBe(0)),
      Story.messageWith((model) =>
        chart.Message.ObservedSweepCycle({
          kind: 'cycle',
          generation: model.generation,
          seriesId: 'line:value',
        }),
      ),
      Story.messageWith((model) =>
        chart.Message.ObservedSweepCycle({
          kind: 'cycle',
          generation: model.generation,
          seriesId: 'line:value',
        }),
      ),
      Story.model((model) => expect(model.sweepCycles['line:value']).toBe(2)),
    )
    yield* Story.story(
      subject,
      Story.given(cycled),
      Story.models(
        Story.steps(
          Story.messageWith((model: typeof chart.Model.Type) =>
            chart.Message.ObservedSweepCycle({
              kind: 'mounted',
              generation: model.generation,
              seriesId: 'line:value',
            }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.messageWith((model) =>
        chart.Message.ObservedSweepCycle({
          kind: 'removed',
          generation: model.generation,
          seriesId: 'line:value',
        }),
      ),
      Story.model((model) => expect(model.sweepCycles).toEqual({})),
      Story.inMessage(
        chart.InMessage.RequestedConfigure({
          configuration: { ...configuration, revealSignature: 'new' },
        }),
      ),
      Story.model((model) => expect(model.sweepCycles).toEqual({})),
      Story.models(
        Story.steps(
          Story.message(
            chart.Message.ObservedSweepCycle({
              kind: 'cycle',
              generation: cycled.generation,
              seriesId: 'line:value',
            }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
    )
  }),
)

it.effect('keeps ready additions immediate and preserves the unmanaged reveal fallback', () =>
  Effect.gen(function* () {
    const props = {
      animationDuration: 1100,
      children: [Line({ dataKey: 'value', showMarkers: true })],
    }

    const initialProps = wipeRecipe.configuration(props)
    const initial = yield* Story.story(
      wipeSubject,
      Story.init('ready-wipe-policy', data.slice(0, 2), initialProps),
    )
    yield* Story.story(
      wipeSubject,
      Story.given(initial),
      Story.messageWith((model) =>
        wipeChart.Message.CompletedReveal({ generation: model.generation }),
      ),
      Story.inMessage(wipeChart.InMessage.RequestedData({ data })),
      Story.model((model) => {
        const compile = wipeRecipe.inputs('ready-wipe-policy', props).resourceDefinition

        if (compile === undefined) {
          throw new Error('Missing Line definition')
        }

        const runtime = createChartRuntime<typeof Row.Type, Date, number>()
        const groups: Array<SceneNode> = []

        const visit = (nodes: ReadonlyArray<SceneNode>) => {
          for (const node of nodes) {
            if (node.kind === 'group') {
              groups.push(node)
              visit(node.children)
            }
          }
        }

        const context: (key: string) => ChartMotionContext<typeof Row.Type> = (key: string) => ({
          key,
          phase: 'enter',
          role: 'mark',
          seriesKey: key,
          seriesIndex: 0,
          datumIndex: 0,
          datumCount: model.data.length,
          datum: undefined,
          point: undefined,
        })

        try {
          const definition = compile(
            data,
            model,
            () => {},
            () => 0,
          )

          visit(runtime.render(definition, { width: 640, height: 320 }).nodes)
          expect(groups.length).toBeGreaterThan(0)

          for (const group of groups) {
            const timing = Predicate.isFunction(definition.motion)
              ? definition.motion(context(group.key))
              : definition.motion

            expect(
              timing === false ||
                (timing?.transition?.type === 'tween' && timing.transition.duration === 0),
            ).toBe(true)
          }

          const revealing = compile(
            data.slice(0, 2),
            initial,
            () => {},
            () => 0,
          )

          groups.length = 0
          visit(runtime.render(revealing, { width: 640, height: 320 }).nodes)
          expect(
            groups.map((group) => {
              const timing = Predicate.isFunction(revealing.motion)
                ? revealing.motion(context(group.key))
                : revealing.motion

              return timing !== false && timing?.transition?.type === 'tween'
                ? timing.transition.duration
                : 0
            }),
          ).toContain(1100)
        } finally {
          runtime.destroy()
        }
      }),
    )
  }),
)

it.effect('reports the checked reveal, conceal and grid cycle', () => {
  const phase = (expected: string) =>
    Story.model((model: typeof chart.Model.Type) => {
      expect(timeSeriesChartPhase(model)).toBe(expected)
    })
  return Story.story(
    subject,
    Story.init('phase-contract', data),
    phase('revealing'),
    completeReveal,
    phase('ready'),
    Story.inMessage(
      chart.InMessage.RequestedConfigure({
        configuration: { ...configuration, status: 'loading' },
      }),
    ),
    phase('exitingReady'),
    advance,
    phase('gridTweenLoading'),
    advance,
    phase('loading'),
    Story.inMessage(chart.InMessage.RequestedConfigure({ configuration })),
    phase('exiting'),
    advance,
    phase('gridTweenReady'),
    advance,
    phase('gridTweenReady'),
    advance,
    phase('revealing'),
    completeReveal,
    phase('ready'),
  )
})

it.effect('keeps pointer hover cleared through selection and release', () =>
  Story.story(
    subject,
    Story.init('selection-hover', data),
    completeReveal,
    Story.inMessage(chart.InMessage.RequestedFocus({ index: 2 })),
    Story.message(chart.Message.ObservedDrag({ kind: 'start', x: 40, index: 0 })),
    Story.model((model) => {
      expect(Option.isNone(model.focusedIndex)).toBe(true)
    }),
    Story.message(chart.Message.ObservedDrag({ kind: 'move', x: 180, index: 2 })),
    Story.model((model) => {
      expect(Option.isNone(model.focusedIndex)).toBe(true)
      expect(Option.isSome(model.selection)).toBe(true)
    }),
    Story.message(chart.Message.ObservedDrag({ kind: 'end', x: 0, index: 0 })),
    Story.model((model) => {
      expect(Option.isNone(model.focusedIndex)).toBe(true)
      expect(Option.isNone(model.selection)).toBe(true)
    }),
    Story.inMessage(chart.InMessage.RequestedFocus({ index: 1 })),
    Story.model((model) => {
      expect(model.focusedIndex).toEqual(Option.some(1))
    }),
  ),
)

for (const duration of [1100, 0]) {
  it.effect(`retires the Line reveal before its physical remount (${duration}ms)`, () =>
    Effect.gen(function* () {
      const remountConfiguration = recipe.configuration({
        animationDuration: duration,
        children: [Line({ dataKey: 'value' })],
      })
      const settled = yield* Story.story(
        subject,
        Story.init('line-retirement', data, remountConfiguration),
        Story.message(chart.Message.CompletedPrepare()),
        completeReveal,
      )
      yield* Story.story(
        subject,
        Story.given(settled),
        Story.message(chart.Message.Unmounted()),
        Story.model((model) => {
          expect(model.isMounted).toBe(false)
          expect(model.revealReady).toBe(duration === 0)
          expect(model.generation).toBe(settled.generation + 1)
        }),
        Story.message(chart.Message.CompletedPrepare()),
        Story.message(chart.Message.CompletedReveal({ generation: settled.generation })),
        Story.model((model) => {
          expect(model.isMounted).toBe(true)
          expect(model.revealReady).toBe(duration === 0)
          expect(model.generation).toBe(settled.generation + 1)
        }),
        Story.Command.expectNone(),
      )
    }),
  )
}

it.effect('deduplicates pointer focus and navigates from the newest accepted focus', () => {
  return Story.story(
    subject,
    Story.init('pointer-dedupe', data),
    Story.message(chart.Message.ObservedFocus({ index: 0 })),
    Story.models(
      Story.steps(Story.message(chart.Message.ObservedFocus({ index: 0 }))),
      (before, after) => expect(after).toBe(before),
    ),
    Story.message(chart.Message.ObservedFocus({ index: 1 })),
    Story.message(chart.Message.ObservedKey({ key: 'ArrowRight' })),
    Story.model((model) => {
      expect(model.focusSource).toBe('keyboard')
      expect(Option.getOrNull(model.focusedIndex)).toBe(2)
    }),
    Story.message(chart.Message.ObservedFocus({ index: 2 })),
    Story.model((model) => {
      expect(model.focusSource).toBe('pointer')
    }),
    Story.message(chart.Message.ObservedPointerLeave()),
    Story.model((model) => {
      expect(Option.isNone(model.focusedIndex)).toBe(true)
    }),
    Story.message(chart.Message.ObservedFocus({ index: 2 })),
    Story.model((model) => {
      expect(Option.getOrNull(model.focusedIndex)).toBe(2)
    }),
    Story.inMessage(chart.InMessage.RequestedFocus({ index: 2 })),
    Story.message(chart.Message.ObservedFocus({ index: 2 })),
    Story.model((model) => {
      expect(model.focusSource).toBe('pointer')
    }),
  )
})
