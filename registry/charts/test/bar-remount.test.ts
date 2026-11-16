import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { DateTime, Effect, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { BarChart } from '../src/bar/root'
import { Bar } from '../src/bar/carriers'
import { ComposedChart } from '../src/composed/root'
import { SeriesBar } from '../src/composed/options'

const Row = Schema.Struct({ name: Schema.String, value: Schema.Finite })

const recipe = BarChart({ name: 'bar-remount-contract', Row })

export const BarRemountKey = Symbol('Cartesian')

const chart = Block.make(recipe.namespace, { key: BarRemountKey, ...recipe.contract })

const subject = {
  block: chart,
  layer: chart.makeLayer(recipe.plans<typeof BarRemountKey>(chart)),
}

const data = [Row.make({ name: 'A', value: 20 })]

for (const duration of [1100, 0]) {
  it.effect(`does not restart a mounted occurrence on repeated preparation (${duration}ms)`, () => {
    const configuration = recipe.configuration({
      animationDuration: duration,
      children: [Bar({ dataKey: 'value' })],
    })

    return Story.story(
      subject,
      Story.init('bar-remount', data, configuration),
      Story.message(chart.Message.CompletedPrepare()),
      Story.messageWith((model) => chart.Message.CompletedReveal({ generation: model.generation })),
      Story.models(
        Story.steps(Story.message(chart.Message.CompletedPrepare())),
        (before, after) => {
          expect(after.generation).toBe(before.generation)
          expect(after.revealReady).toBe(true)
        },
      ),
      Story.Command.expectNone(),
    )
  })
}

for (const duration of [1100, 0]) {
  it.effect(`retires before reacquisition and rejects the previous reveal (${duration}ms)`, () =>
    Effect.gen(function* () {
      const configuration = recipe.configuration({
        animationDuration: duration,
        children: [Bar({ dataKey: 'value' })],
      })
      const settled = yield* Story.story(
        subject,
        Story.init('bar-retirement', data, configuration),
        Story.message(chart.Message.CompletedPrepare()),
        Story.messageWith((model) =>
          chart.Message.CompletedReveal({ generation: model.generation }),
        ),
        Story.message(
          chart.Message.ObservedDomains({
            current: { left: [0, 20] },
            target: { left: [0, 20] },
          }),
        ),
      )
      const retired = yield* Story.story(
        subject,
        Story.given(settled),
        Story.message(chart.Message.Unmounted()),
        Story.model((model) => {
          expect(model.isMounted).toBe(false)
          expect(model.generation).toBe(settled.generation + 1)
          expect(model.revealReady).toBe(duration === 0)
          expect(model.phaseClockReady).toBe(false)
          expect(model.data).toBe(settled.data)
          expect(model.configuration).toEqual(configuration)
          expect(model.domains).toEqual({ left: [0, 20] })
        }),
      )
      yield* Story.story(
        subject,
        Story.given(retired),
        Story.message(chart.Message.Unmounted()),
        Story.model((model) => expect(model).toBe(retired)),
        Story.message(chart.Message.CompletedReveal({ generation: settled.generation })),
        Story.model((model) => expect(model).toBe(retired)),
        Story.message(chart.Message.CompletedPrepare()),
        Story.model((model) => {
          expect(model.isMounted).toBe(true)
          expect(model.generation).toBe(retired.generation)
          expect(model.revealReady).toBe(duration === 0)
        }),
        Story.Command.expectNone(),
      )
    }),
  )
}

const DatedRow = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const composedRecipe = ComposedChart({ name: 'composed-remount-contract', Row: DatedRow })

export const ComposedRemountKey = Symbol('ComposedRemount')

const composed = Block.make(composedRecipe.namespace, {
  key: ComposedRemountKey,
  ...composedRecipe.contract,
})

const composedSubject = {
  block: composed,
  layer: composed.makeLayer(composedRecipe.plans(composed)),
}

const composedData = [
  DatedRow.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe('2025-01-01')), value: 20 }),
]

for (const duration of [1100, 0]) {
  it.effect(`restarts the Composed reveal on physical remount (${duration}ms)`, () =>
    Effect.gen(function* () {
      const configuration = composedRecipe.configuration({
        animationDuration: duration,
        children: [SeriesBar({ dataKey: 'value' })],
      })
      const settled = yield* Story.story(
        composedSubject,
        Story.init('composed-retirement', composedData, configuration),
        Story.message(composed.Message.CompletedPrepare()),
        Story.messageWith((model) =>
          composed.Message.CompletedReveal({ generation: model.generation }),
        ),
      )
      yield* Story.story(
        composedSubject,
        Story.given(settled),
        Story.message(composed.Message.Unmounted()),
        Story.message(composed.Message.CompletedPrepare()),
        Story.message(composed.Message.CompletedReveal({ generation: settled.generation })),
        Story.model((model) => {
          expect(model.isMounted).toBe(true)
          expect(model.generation).toBe(settled.generation + 1)
          expect(model.revealReady).toBe(duration === 0)
          expect(model.phaseClockReady).toBe(false)
          expect(model.data).toEqual(composedData)
        }),
        Story.Command.expectNone(),
      )
    }),
  )
}
