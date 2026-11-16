import { Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import { BarChart, Bar, YAxis, ChartTooltip } from '../src/index'
import type { BarChartProps } from '../src/bar/options'
import type { BarDatum } from '../src/bar/model'
import type { BarSnapshot, BarValue } from '../src/bar/definition'

export const Row = Schema.Struct({ name: Schema.String, a: Schema.Finite, b: Schema.Finite })
export const data = [
  Row.make({ name: 'A', a: 20, b: 2000 }),
  Row.make({ name: 'B', a: 40, b: 4000 }),
]
export const recipe = BarChart({ name: 'bar-axis-geometry', Row })
export const BarAxisGeometryKey = Symbol('BarAxisGeometry')
export const Chart = Block.make(recipe.namespace, { key: BarAxisGeometryKey, ...recipe.contract })
export const subject = { block: Chart, layer: Chart.makeLayer(recipe.plans(Chart)) }
export const flatten = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> =>
  nodes.flatMap((node) => (node.kind === 'group' ? flatten(node.children) : [node]))

export const props: BarChartProps<typeof Row.Type> = {
  width: 400,
  height: 400,
  animationDuration: 0,
  barGap: 0,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  children: [
    Bar({ dataKey: 'a', yAxisId: '', lineCap: 'butt' }),
    Bar({ dataKey: 'b', yAxisId: 'right', lineCap: 'butt' }),
    YAxis({
      yAxisId: 'right',
      orientation: 'right',
      numTicks: 3,
      formatValue: (value) => `$${value}`,
    }),
    ChartTooltip(),
  ],
}

export const draw = (
  owner: Story.TestBlock<typeof subject>,
  options = props,
  rows: ReadonlyArray<typeof Row.Type> = data,
) => {
  const initial = owner.init('bar-axes', rows, recipe.configuration(options)).model
  const ready = owner.update(
    initial,
    owner.Message.ObservedPhaseTiming({
      generation: initial.generation,
      elapsed: null,
      at: 0,
    }),
  ).model
  const inputs = recipe.inputs('bar-axes', options)
  let snapshot: BarSnapshot<typeof Row.Type> | undefined
  const definition = inputs.resourceDefinition?.(
    rows,
    ready,
    (next) => {
      snapshot = next
    },
    () => 0,
  )
  if (definition === undefined) throw new Error('Expected public Bar drawing definition')
  const runtime = createChartRuntime<BarDatum<typeof Row.Type>, BarValue, BarValue>()
  try {
    const scene = runtime.render(definition, { width: 400, height: 400 })
    if (snapshot === undefined) throw new Error('Expected measured named Bar domains')
    return { scene, snapshot }
  } finally {
    runtime.destroy()
  }
}

export const front = (scene: ReturnType<typeof draw>['scene'], key: string) => {
  const node = flatten(scene.nodes).find((item) => item.key === key)
  if (node?.kind !== 'rect') throw new Error(`Expected painted front ${key}`)
  return node
}
