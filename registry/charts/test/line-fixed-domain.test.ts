import { DateTime, Schema } from 'effect'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Block, Story } from 'foldkit'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { LineChart, Line, YAxis } from '../src/index'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Finite,
  other: Schema.Finite,
})
const recipe = LineChart({ name: 'fixed-domain-consumer', Row })
const ChartKey = Symbol('FixedDomainConsumer')
const Chart = Block.make(recipe.namespace, { key: ChartKey, ...recipe.contract })
const subject = { block: Chart, layer: Chart.makeLayer(recipe.plans(Chart)) }
const rows = [
  { date: DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-01')), value: 20, other: 2000 },
  { date: DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-02')), value: 40, other: 4000 },
]

const draw = (owner: Story.TestBlock<typeof subject>, yDomain?: readonly [number, number]) => {
  const props = {
    animationDuration: 0,
    ...(yDomain === undefined ? {} : { yDomain }),
    children: [Line({ dataKey: 'value' }), Line({ dataKey: 'other', yAxisId: 'right' }), YAxis()],
  }
  const model = owner.init('fixed-domain', rows, recipe.configuration(props)).model
  const inputs = recipe.inputs('fixed-domain', props)
  const definition = inputs.resourceDefinition?.(
    rows,
    model,
    () => {},
    () => 0,
  )
  if (definition === undefined) throw new Error('Expected the public drawing definition')
  const runtime = createChartRuntime<typeof Row.Type, Date, number>()
  try {
    return runtime.render(definition, { width: 500, height: 300 })
  } finally {
    runtime.destroy()
  }
}

it.effect('keeps percent bounds exact without changing secondary or default domains', () =>
  Story.withBlock(subject, (owner) => {
    const automatic = draw(owner)
    const fixed = draw(owner, [0, 100])
    expect(automatic.scales.y?.domain).toEqual([0, 45])
    expect(fixed.scales.y?.domain).toEqual([0, 100])
    expect(fixed.scales['y:right']?.domain).toEqual(automatic.scales['y:right']?.domain)
    expect(draw(owner, [3, 97]).scales.y?.domain).toEqual([3, 97])
  }),
)

it.effect('rejects invalid explicit bounds instead of silently reverting to data extent', () =>
  Story.withBlock(subject, (owner) => {
    expect(() => draw(owner, [100, 0])).toThrow('strictly increasing')
    expect(() => draw(owner, [0, Infinity])).toThrow('finite')
    expect(() => draw(owner, [1, 1])).toThrow('strictly increasing')
  }),
)
