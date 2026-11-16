import { sourceDate } from '../src/cartesian/source-date'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { scaleBand, scaleLinear } from 'd3-scale'
import {
  BarChart,
  Bar,
  BarDepthProvider,
  useBarDepthEntries,
  useActiveMarkers,
} from '@foldkit-visuals/charts/bar'

export const DepthSelectorChartKey = Symbol('Cartesian')

export const DepthSelectorProviderParentKey = Symbol('DepthSelectorProviderParent')

const Row = Schema.Struct({ name: Schema.String, amount: Schema.Finite })

const row = Row.make({ name: 'A', amount: 8 })

const rows = [row]

const chart = BarChart({ name: 'depth-selector-provider-contract', Row })

const ChartBlock = Block.make(chart.namespace, { key: DepthSelectorChartKey, ...chart.contract })

const chartLayer = ChartBlock.makeLayer(chart.plans<typeof DepthSelectorChartKey>(ChartBlock))

const firstSegments = (_row: typeof Row.Type) => [{ value: 8 }]

const forbiddenSegments = (_row: typeof Row.Type): ReadonlyArray<{ readonly value: number }> => {
  throw new Error('A later provider must not be selected')
}

const props = {
  animationDuration: 0,
  children: [
    BarDepthProvider({
      minBarHeight: 12,
      segmentsAccessor: firstSegments,
      children: [
        Bar({ dataKey: 'amount' }),
        BarDepthProvider({ minBarHeight: 99, segmentsAccessor: forbiddenSegments }),
      ],
    }),
    BarDepthProvider({ minBarHeight: 22, segmentsAccessor: forbiddenSegments }),
  ],
}

const inputs = chart.inputs('depth-selector-provider', {
  ...props,
  renderContext: (context, h) => {
    expect(context.depthConfig.segmentsAccessor).toBe(firstSegments)
    expect(context.depthConfig.minBarHeight).toBe(12)
    expect(context.stable.data).toBe(rows)
    const entries = useBarDepthEntries(context, 'amount')
    expect(entries).toEqual([])

    const plotted = {
      ...context,
      stable: {
        ...context.stable,
        innerWidth: 100,
        innerHeight: 100,
        bandWidth: 20,
        barScale: scaleBand().domain(['A']).range([40, 60]),
        yScale: scaleLinear().domain([0, 100]).range([100, 0]),
        barXAccessor: (datum: typeof Row.Type) => datum.name,
      },
    }

    const depth = useBarDepthEntries(plotted, 'amount', 0)
    expect(depth).toHaveLength(1)
    expect(depth[0]?.datum).toBe(row)
    expect(depth[0]).toMatchObject({
      label: 'A',
      dataIndex: 0,
      isActive: true,
      isNegative: false,
      baselineY: 100,
      bandX: 40,
      bandWidth: 20,
      topY: 88,
      bottomY: 100,
      barHeight: 12,
      naturalHeight: 12,
      topYTrim: 0,
      depth: 0,
      perspectiveRise: 0,
      isRightOfCenter: false,
    })
    expect(
      useBarDepthEntries({ ...plotted, stable: { ...plotted.stable, bandWidth: 0 } }, 'amount'),
    ).toEqual([])

    const negativeRow = { ...row, amount: -20 }

    const negative = useBarDepthEntries(
      {
        ...plotted,
        depthConfig: { minBarHeight: 99 },
        stable: { ...plotted.stable, data: [negativeRow] },
      },
      'amount',
    )

    expect(negative[0]).toMatchObject({
      topY: 100,
      bottomY: 120,
      barHeight: 20,
      isNegative: true,
    })
    expect(
      useBarDepthEntries(
        {
          ...plotted,
          depthConfig: {},
          stable: { ...plotted.stable, data: [{ ...row, amount: 0 }] },
        },
        'amount',
      ),
    ).toEqual([])

    const trace: Array<string> = []

    const tracedRow = {
      name: 'A',
      get amount() {
        trace.push('raw')

        return 999
      },
    }

    const bottom = {
      get value() {
        trace.push('bottom')

        return 20
      },
    }

    const discarded = {
      get value() {
        trace.push('discarded')

        return -8
      },
    }

    const top = {
      get value() {
        trace.push('top')

        return 30
      },
    }

    const segmented = useBarDepthEntries(
      {
        ...plotted,
        depthConfig: {
          segmentsAccessor: (datum: typeof Row.Type) => {
            expect(datum).toBe(tracedRow)
            trace.push('segments')

            return [bottom, discarded, top]
          },
        },
        stable: {
          ...plotted.stable,
          data: [tracedRow],
          barXAccessor: (datum: typeof Row.Type) => {
            trace.push('label')

            return datum.name
          },
        },
      },
      'amount',
    )

    expect(segmented[0]?.datum).toBe(tracedRow)
    expect(segmented[0]).toMatchObject({ topY: 50, bottomY: 100, naturalHeight: 50 })
    expect(trace).toEqual([
      'segments',
      'bottom',
      'discarded',
      'top',
      'bottom',
      'top',
      'raw',
      'label',
      'top',
    ])

    const first = { date: sourceDate('2024-01-10T01:00:00'), metadata: Symbol('first') }
    const last = { date: sourceDate('2024-01-10T23:00:00'), metadata: () => 'retained' }
    const invalid = { date: sourceDate(Number.NaN), metadata: 'invalid' }

    const markers = [
      first,
      { date: sourceDate('2024-01-11T00:00:00'), metadata: 'other' },
      last,
      invalid,
    ]

    expect(useActiveMarkers(context, markers)).toEqual([])

    const focused = (date?: Date | { [Symbol.toPrimitive]: () => never }) => ({
      ...context,
      hover: {
        ...context.hover,
        tooltipData: { point: { ...row, date }, index: 0, x: 0, yPositions: {} },
      },
    })

    const active = useActiveMarkers(focused(sourceDate('2024-01-10T12:00:00')), markers)
    expect(active).toEqual([first, last])
    expect(active[0]).toBe(first)
    expect(active[1]).toBe(last)
    expect(useActiveMarkers(focused(), markers)).toEqual([invalid])
    const failure = new Error('native date coercion')

    const throws = {
      [Symbol.toPrimitive]: () => {
        throw failure
      },
    }

    expect(() => useActiveMarkers(focused(throws), markers)).toThrow(failure)

    return h.output([], [`depth:${context.depthConfig.minBarHeight}:${entries.length}`])
  },
})

const Model = Schema.Struct({ chart: ChartBlock.Model })

const effects = Block.makeEffectsContract()

const DepthSelectorProviderParentBlock = Block.make('DepthSelectorProviderParent', {
  key: DepthSelectorProviderParentKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
  Model,
  Message: Schema.Never,
})

const Binding = DepthSelectorProviderParentBlock.makeRequiredFieldBinding(ChartBlock, {
  field: 'chart',
  init: {
    contextToArgs: () => ['depth-selector-provider', rows, chart.configuration(props)],
  },
})

const DepthSelectorProviderParentComposition = DepthSelectorProviderParentBlock.makeComposition({
  bindings: [Binding],
})

const layer = DepthSelectorProviderParentBlock.makeLayer({
  init: DepthSelectorProviderParentComposition.makeInit(() => ({ model: {} })),
  update: DepthSelectorProviderParentComposition.makeUpdate({}),
  view: DepthSelectorProviderParentComposition.makeView((model, h) => ({
    title: 'Depth selector',
    body: h.div(
      [],
      [
        h.block(
          Binding.embedView({
            slotId: 'chart',
            model: model.chart,
            viewInputs: inputs,
          }),
        ),
      ],
    ),
  })),
}).pipe(Layer.provide(chartLayer))

it.effect('real BarChart custom content receives the first flattened depth provider', () =>
  Effect.gen(function* depthSelectorProviderContract() {
    const { html } = yield* renderToString(
      { block: DepthSelectorProviderParentBlock, layer },
      {},
      { isHydratable: false },
    )

    expect(html).toContain('depth:12:0')
  }),
)
