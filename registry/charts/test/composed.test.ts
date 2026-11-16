import { DateTime, Schema } from 'effect'
import { expect } from 'vitest'
import { it as effectIt } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import type { SceneNode } from '@tanstack/charts'
import { createChartRuntime } from '@tanstack/charts/runtime'
import {
  ComposedChart,
  SeriesBar,
  Line,
  Area,
  XAxis,
  YAxis,
} from '@foldkit-visuals/charts/composed'
import type { ComposedChartProps } from '@foldkit-visuals/charts/composed'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  actual: Schema.Finite,
  forecast: Schema.Finite,
  total: Schema.Finite,
})

const data = [10, 20, 30].map((value, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
    actual: value,
    forecast: value * 2,
    total: value * 3,
  }),
)

const root = ComposedChart({ name: 'composed-contract', Row })

export const ComposedContractKey = Symbol('ComposedContract')

const Chart = Block.make(root.namespace, { key: ComposedContractKey, ...root.contract })

const subject = { block: Chart, layer: Chart.makeLayer(root.plans(Chart)) }

const flatten = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> =>
  nodes.flatMap((node) => (node.kind === 'group' ? flatten(node.children) : [node]))

effectIt.effect(
  'renders heterogeneous line, area and grouped interval bars with actual Row focus and one shared value domain',
  () =>
    Story.withBlock(subject, (chart) => {
      const props: ComposedChartProps<typeof Row.Type> = {
        animationDuration: 0,
        barSize: 20,
        barGap: 4,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        children: [
          Area({ dataKey: 'total', fill: 'gray', showLine: false }),
          Line({ dataKey: 'forecast', stroke: 'blue' }),
          SeriesBar({ dataKey: 'actual', fill: 'red' }),
          XAxis(),
          YAxis(),
        ],
      }

      const initial = chart.init('composed-contract', data, root.configuration(props)).model

      const model = chart.update(
        initial,
        chart.Message.ObservedPhaseTiming({
          generation: initial.generation,
          at: 0,
          elapsed: null,
        }),
      ).model

      const inputs = root.inputs('composed-contract', props)

      const definition = inputs.resourceDefinition?.(
        data,
        model,
        () => {},
        () => 0,
      )

      if (definition === undefined) {
        throw new Error('Missing public Composed definition')
      }

      const runtime = createChartRuntime<Parameters<typeof inputs.sourceOf>[0], Date, number>()

      try {
        const scene = runtime.render(definition, { width: 600, height: 300 })
        const nodes = flatten(scene.nodes)

        const bars = nodes.filter(
          (node) => node.kind === 'rect' && node.key.startsWith('bar:actual:'),
        )

        expect(bars).toHaveLength(3)

        for (const bar of bars) {
          expect(bar.kind === 'rect' ? bar.width : 0).toBeCloseTo(20, 12)
        }

        expect(
          nodes.filter((node) => node.kind === 'polyline' && node.key.startsWith('line:forecast'))
            .length,
        ).toBeGreaterThan(0)
        expect(
          nodes.filter((node) => node.kind === 'area' && node.key.startsWith('area:total')).length,
        ).toBeGreaterThan(0)
        expect(scene.scales.y?.domain).toEqual([0, 100])
        const barPoints = scene.points.filter((point) => point.markId === 'bar:actual')
        expect(
          barPoints.every((point, index) => inputs.sourceOf(point.datum) === data[index]),
        ).toBe(true)

        const stackedInputs = root.inputs('composed-contract', {
          ...props,
          stacked: true,
          stackGap: 2,
          children: [SeriesBar({ dataKey: 'actual' }), SeriesBar({ dataKey: 'forecast' })],
        })

        const stackedDefinition = stackedInputs.resourceDefinition?.(
          data,
          model,
          () => {},
          () => 0,
        )

        if (stackedDefinition === undefined) {
          throw new Error('Missing stacked Composed definition')
        }

        const stacked = runtime.render(stackedDefinition, { width: 600, height: 300 })
        expect(
          flatten(stacked.nodes).filter(
            (node) => node.kind === 'rect' && node.key.startsWith('bar:'),
          ),
        ).toHaveLength(6)
        expect(
          stacked.points.every((point) => data.some((row) => row === inputs.sourceOf(point.datum))),
        ).toBe(true)
      } finally {
        runtime.destroy()
      }
    }),
)
