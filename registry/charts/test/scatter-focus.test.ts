import { DateTime, Effect, Predicate, Schema } from 'effect'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Block, Story } from 'foldkit'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { ChartTooltip, Scatter, ScatterChart } from '../src/scatter/index'
import type { CartesianSnapshot } from '../src/cartesian/definition'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Union([Schema.Number, Schema.Null, Schema.String]),
})

const recipe = ScatterChart({ name: 'scatter-missing-focus', Row })

export const ScatterMissingFocusKey = Symbol('ScatterMissingFocus')

const Chart = Block.make(recipe.namespace, { key: ScatterMissingFocusKey, ...recipe.contract })

const subject = { block: Chart, layer: Chart.makeLayer(recipe.plans(Chart)) }

const props = {
  animationDuration: 0,
  children: [Scatter({ dataKey: 'value', strokeWidth: 0 }), ChartTooltip()],
}

const dates = [0, 1000, 2000].map((time) => DateTime.toDateUtc(DateTime.makeUnsafe(time)))

for (const missing of [null, Number.NaN, 'missing']) {
  it.effect(
    `keeps full-row pointer selection but excludes ${String(missing)} from keyboard candidates`,
    () =>
      Story.withBlock(subject, (chart) => {
        const data = dates.map((date, index) =>
          Row.make({ date, value: index === 1 ? missing : 20 + index }),
        )

        const initial = chart.init('missing-focus', data, recipe.configuration(props)).model

        const ready = chart.update(
          initial,
          chart.Message.ObservedPhaseTiming({
            generation: initial.generation,
            elapsed: null,
            at: 1000,
          }),
        ).model

        const inputs = recipe.inputs('missing-focus', props)
        let snapshot: CartesianSnapshot<typeof Row.Type> | undefined

        const definition = inputs.resourceDefinition?.(
          data,
          ready,
          (next) => {
            snapshot = next
          },
          () => 1000,
        )

        if (definition === undefined) {
          throw new Error('Missing Scatter definition')
        }

        const { focus } = definition

        if (focus === undefined || focus === false || Predicate.isString(focus)) {
          throw new Error('Missing Scatter focus')
        }

        const runtime = createChartRuntime<typeof Row.Type, Date, number>()

        try {
          const scene = runtime.render(definition, { width: 600, height: 350 })
          const [, date] = dates
          const scale = scene.scales.x

          if (date === undefined || scale === undefined || snapshot === undefined) {
            throw new Error('Missing real Scatter projection')
          }

          const at = { x: scale.map(date), y: scene.margin.top + 20 }
          expect(scene.points).toHaveLength(2)
          expect(inputs.pointerIndexAt(at)).toBe(1)
          expect(focus.resolve(scene.points, { ...at, maxDistance: Infinity })).toEqual([])
          expect(snapshot.rowIndices).toEqual([0, 2])
          expect(scene.points.map((point) => inputs.pointIndexOf(point))).toEqual([0, 2])
        } finally {
          runtime.destroy()
        }
      }).pipe(Effect.asVoid),
  )
}

it.effect('retains repeated Scatter occurrences and Source duplicate-date pointer ties', () =>
  Story.withBlock(subject, (chart) => {
    const shared = Row.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe(1000)), value: 10 })

    const data = [
      shared,
      shared,
      Row.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe(2000)), value: 30 }),
    ]

    const initial = chart.init('repeat-focus', data, recipe.configuration(props)).model

    const ready = chart.update(
      initial,
      chart.Message.ObservedPhaseTiming({
        generation: initial.generation,
        elapsed: null,
        at: 1000,
      }),
    ).model

    const inputs = recipe.inputs('repeat-focus', props)

    const definition = inputs.resourceDefinition?.(
      data,
      ready,
      () => {},
      () => 1000,
    )

    if (definition === undefined) {
      throw new Error('Missing Scatter definition')
    }

    const strategy = definition.focus

    if (strategy === undefined || strategy === false || Predicate.isString(strategy)) {
      throw new Error('Missing Scatter focus')
    }

    const runtime = createChartRuntime<typeof Row.Type, Date, number>()

    try {
      const scene = runtime.render(definition, { width: 600, height: 350 })
      expect(new Set(scene.points.map((point) => point.key)).size).toBe(3)
      const [first, second] = scene.points

      if (first === undefined || second === undefined) {
        throw new Error('Missing repeated points')
      }

      expect(
        strategy.resolve(scene.points, { x: first.x, y: first.y, maxDistance: Infinity })[0],
      ).toBe(first)
      expect(
        strategy.resolve(scene.points, { x: first.x + 1, y: first.y, maxDistance: Infinity })[0],
      ).toBe(second)
      expect(scene.points.map((point) => inputs.pointIndexOf(point))).toEqual([0, 1, 2])
    } finally {
      runtime.destroy()
    }
  }),
)
