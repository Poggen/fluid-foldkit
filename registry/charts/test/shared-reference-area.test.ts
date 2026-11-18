import { constVoid } from 'effect/Function'
import { DateTime, Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect, test } from 'vitest'
import type { SceneNode } from '@tanstack/charts'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { Candlestick, ChartTooltip, Line, ReferenceArea } from '../src/cartesian/layers'
import { buildTimeSeriesDefinition } from '../src/cartesian/definition'
import type { CartesianSnapshot } from '../src/cartesian/definition'
import { referenceAreaResources } from '../src/cartesian/reference-area'
import { patternResourceView } from '../src/kit/pattern/resources'
import { LineChart } from '../src/cartesian/root'
import { CandlestickChart } from '../src/candlestick/root'
import type { TimeSeriesProps } from '../src/cartesian/root-options'

const descendants: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((node) => [node, ...(node.kind === 'group' ? descendants(node.children) : [])])

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const data = [1, 2].map((value, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
    value,
  }),
)

test('reference bands extend the domain, retain declaration depth and never own focus', () => {
  const runtime = createChartRuntime<typeof Row.Type, Date, number>()
  let snapshot: CartesianSnapshot<typeof Row.Type> | undefined

  try {
    const scene = runtime.render(
      buildTimeSeriesDefinition(data, {
        id: 'reference-order',
        x: (row) => row.date,
        children: [
          ReferenceArea({ y1: 0, y2: 10, fill: 'red', fillOpacity: 0.4, showMarkers: true }),
          Line({ dataKey: 'value', stroke: 'purple' }),
          ReferenceArea({ y1: 1, y2: 2, fill: 'green', fadeEdges: false }),
          ChartTooltip(),
        ],
        onBuilt: (value) => {
          snapshot = value
        },
      }),
      { width: 320, height: 180 },
    )

    const nodes = descendants(scene.nodes)
    const before = nodes.findIndex((node) => node.kind === 'rect' && node.style?.fill === 'red')

    const line = nodes.findIndex(
      (node) => node.kind === 'polyline' && node.style?.stroke === 'purple',
    )

    const after = nodes.findIndex((node) => node.kind === 'rect' && node.style?.fill === 'green')
    expect(before).toBeGreaterThanOrEqual(0)
    expect(line).toBeGreaterThan(before)
    expect(after).toBeGreaterThan(line)
    expect(snapshot?.targetY.left).toEqual([0, 11])
    expect(
      nodes.filter((node) => node.kind === 'area' && node.key.startsWith('refarea-marker:')),
    ).toHaveLength(2)
    expect(scene.points.length).toBeGreaterThan(0)
    expect(scene.points.every((point) => !point.markId.startsWith('refarea'))).toBe(true)
  } finally {
    runtime.destroy()
  }
})

test('zero remains a bound and negative reference bounds extend the plot domain', () => {
  const runtime = createChartRuntime<typeof Row.Type, Date, number>()
  let snapshot: CartesianSnapshot<typeof Row.Type> | undefined

  try {
    const scene = runtime.render(
      buildTimeSeriesDefinition(data, {
        id: 'negative-reference',
        x: (row) => row.date,
        children: [Line({ dataKey: 'value' }), ReferenceArea({ y1: -4, y2: 0, fill: 'green' })],
        onBuilt: (value) => {
          snapshot = value
        },
      }),
      { width: 320, height: 180 },
    )

    const band = descendants(scene.nodes).find(
      (node) => node.kind === 'rect' && node.style?.fill === 'green',
    )

    if (band?.kind !== 'rect' || snapshot === undefined) {
      throw new Error('Reference band did not render')
    }

    expect(snapshot.targetY.left?.[0]).toBeLessThanOrEqual(-4)
    expect(snapshot.targetY.left?.[1]).toBeGreaterThanOrEqual(2)
    expect(band.height).toBeGreaterThan(0)
    expect(band.height).toBeLessThan(100)
    expect(band.y).toBeGreaterThan(40)
  } finally {
    runtime.destroy()
  }
})

const chart = LineChart({ name: 'reference-context', Row })

export const ReferenceLineKey = Symbol('ReferenceLineKey')

const ReferenceLineBlock = Block.make(chart.namespace, { key: ReferenceLineKey, ...chart.contract })

const childLayer = ReferenceLineBlock.makeLayer(chart.plans(ReferenceLineBlock))

const reference = ReferenceArea({
  yAxisId: 'left',
  y1: 2,
  y2: 8,
  axisLabelColor: 'orange',
  pattern: 'circles',
  patternScale: 2,
  patternComplement: true,
  patternColor: 'blue',
})

const props = {
  children: [
    Line({ dataKey: 'value' }),
    reference,
    ReferenceArea({}),
    ReferenceArea({ y1: -0, y2: -4 }),
  ],
  margin: { left: 24, top: 12, right: 8, bottom: 16 },
  renderContext: (context, h) =>
    h.output(
      [h.Id('references')],
      context.stable.referenceAreas.map(
        (area) => `${area.yAxisId}|${area.y1}|${area.y2}|${area.axisLabelColor}`,
      ),
    ),
} satisfies TimeSeriesProps<typeof Row.Type>

const inputs = chart.inputs('reference-context-chart', props)

const Model = Schema.Struct({ chart: ReferenceLineBlock.Model })

export const ReferenceAreaServerContractKey = Symbol('ReferenceAreaServerContract')

const Parent = Block.make('ReferenceAreaServerContract', {
  key: ReferenceAreaServerContractKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Binding = Parent.makeRequiredFieldBinding(ReferenceLineBlock, {
  field: 'chart',
  init: { contextToArgs: () => ['reference-context-chart', data, chart.configuration(props)] },
})

const Composition = Parent.makeComposition({ bindings: [Binding] })

const parentLayer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Reference areas',
    body: h.div(
      [],
      [
        h.block(Binding.embedView({ slotId: 'chart', model: model.chart, viewInputs: inputs })),
        patternResourceView('reference-seam', referenceAreaResources(props.children, props.margin)),
      ],
    ),
  })),
}).pipe(Layer.provide(childLayer))

it.effect(
  'the checked parent retains reference context, plot-origin pattern seam and scoped fill',
  () =>
    Effect.gen(function* referenceResourcesContract() {
      const { html } = yield* renderToString(
        { block: Parent, layer: parentLayer },
        {},
        { isHydratable: false },
      )

      expect(html).toContain('id="reference-seam-refarea-pattern-0"')
      expect(html).toContain('patternTransform="translate(24 12)"')
      expect(html).toContain('width="12"')
      expect(html).toContain('stroke="blue"')
      expect(html).toContain('url(#reference-context-chart-refarea-pattern-0)')
      expect(html).toContain('left|2|8|orange')
      expect(html).toContain('left|null|null|null')
      expect(html).toContain('left|0|-4|null')
    }),
)

export const ReferenceCandleKey = Symbol('ReferenceCandle')

it.effect(
  'candlestick paints reference bands after candle bodies regardless of carrier position',
  () => {
    const Candle = Schema.Struct({
      date: Schema.DateFromString,
      open: Schema.Finite,
      high: Schema.Finite,
      low: Schema.Finite,
      close: Schema.Finite,
    })

    const rows = [
      Candle.make({
        date: DateTime.toDateUtc(DateTime.makeUnsafe(0)),
        open: 10,
        high: 25,
        low: 5,
        close: 20,
      }),
    ]

    const root = CandlestickChart({ name: 'reference-candlestick', Row: Candle })

    const candleProps = {
      animationDuration: 0,
      children: [
        ReferenceArea({ y1: 6, y2: 20, fill: 'pink' }),
        Candlestick({ positiveFill: 'green' }),
      ],
    }

    const CandleBlock = Block.make(root.namespace, { key: ReferenceCandleKey, ...root.contract })

    return Story.withBlock(
      { block: CandleBlock, layer: CandleBlock.makeLayer(root.plans(CandleBlock)) },
      (owner) => {
        const initial = owner.init(
          'reference-candlestick',
          rows,
          root.configuration(candleProps),
        ).model

        const ready = owner.update(
          initial,
          owner.Message.CompletedReveal({ generation: initial.generation }),
        ).model

        const definition = root
          .inputs('reference-candlestick', candleProps)
          .resourceDefinition?.(rows, ready, constVoid, () => 0)

        if (definition === undefined) {
          throw new Error('Candlestick definition did not compile')
        }

        const runtime = createChartRuntime<typeof Candle.Type, Date, number>()

        try {
          const scene = runtime.render(definition, { width: 320, height: 180 })
          const nodes = descendants(scene.nodes)

          const candle = nodes.findIndex(
            (node) => node.kind === 'rect' && node.style?.fill === 'green',
          )

          const band = nodes.findIndex(
            (node) => node.kind === 'rect' && node.style?.fill === 'pink',
          )

          expect(candle).toBeGreaterThanOrEqual(0)
          expect(band).toBeGreaterThan(candle)
          expect(scene.points.map((point) => point.datum)).toEqual(rows)
        } finally {
          runtime.destroy()
        }
      },
    )
  },
)
