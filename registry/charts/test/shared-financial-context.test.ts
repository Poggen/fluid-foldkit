import { DateTime, Effect, Layer, Option, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { resolveFocusPresentation } from '@tanstack/charts'
import type { SceneNode } from '@tanstack/charts'
import type { CartesianSnapshot } from '../src/cartesian/definition'
import { PatternLines } from '@foldkit-visuals/charts/candlestick'
import { CandlestickChart } from '../src/candlestick/root'
import { ScatterChart } from '../src/scatter/root'
import { Candlestick, Scatter } from '../src/cartesian/layers'

const FinancialRow = Schema.Struct({
  date: Schema.DateFromString,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
  value: Schema.Finite,
})

const financialRow = FinancialRow.make({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(0)),
  open: 10,
  high: 25,
  low: 5,
  close: 20,
  value: 8,
})

const financialRows = [financialRow]

const familyCases = [
  {
    kind: 'candlestick',
    root: CandlestickChart({ name: 'shared-candle-context', Row: FinancialRow }),
    props: { candleWidth: 12, animationDuration: 0, children: [Candlestick()] },
    expectedX: [-43_200_000, 43_200_000],
    expectedY: [4, 26],
    expectedWidth: 12,
    expectedLine: 'close/var(--chart-line-primary)/2',
  },
  {
    kind: 'scatter',
    root: ScatterChart({ name: 'shared-scatter-context', Row: FinancialRow }),
    props: { animationDuration: 0, children: [Scatter({ dataKey: 'value', fill: 'orange' })] },
    expectedX: [-1, 1],
    expectedY: [0, 9],
    expectedWidth: undefined,
    expectedLine: 'value/orange/0',
  },
] as const

const [candleEntry, scatterEntry] = familyCases

export const CandleContextKey = Symbol('CandleContext')

const CandleBlock = Block.make(candleEntry.root.namespace, {
  key: CandleContextKey,
  ...candleEntry.root.contract,
})

const candleSubject = {
  block: CandleBlock,
  layer: CandleBlock.makeLayer(candleEntry.root.plans(CandleBlock)),
}

export const CandleParentKey = Symbol('SharedCandleContextParent')

{
  const entry = candleEntry
  const { root, props } = entry
  const ChartBlock = CandleBlock

  const observed: Array<{
    readonly x: ReadonlyArray<number>
    readonly y: ReadonlyArray<number> | undefined
    readonly bandWidth: number | undefined
    readonly line: string
    readonly loaded: boolean
    readonly action: typeof ChartBlock.Message.Type
  }> = []

  const Model = Schema.Struct({ chart: ChartBlock.Model })

  const FamilyParent = Block.make('SharedCandleContextParent', {
    key: CandleParentKey,
    Model,
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Document' },
  })

  const FamilyBinding = FamilyParent.makeRequiredFieldBinding(ChartBlock, {
    field: 'chart',
    init: { contextToArgs: () => [entry.kind, financialRows, root.configuration(props)] },
  })

  const FamilyComposition = FamilyParent.makeComposition({ bindings: [FamilyBinding] })

  it.effect(
    `the checked ${entry.kind} context retains pre-measure Source domains and owner-bound intent`,
    () =>
      Effect.gen(function* familyContextContract() {
        const inputs = root.inputs(entry.kind, {
          ...props,
          renderContext: (context, h) => {
            const requested = context.hover.setHoveredCandleIndex?.(0)

            if (!Schema.is(ChartBlock.Message)(requested)) {
              throw new Error('Family context did not return its owner message')
            }

            observed.push({
              x: context.stable.xScale.domain().map(Number),
              y: context.stable.yDomainTargetByAxis.left,
              bandWidth: context.stable.bandWidth,
              loaded: context.stable.isLoaded,
              action: requested,
              line: context.stable.lines
                .map((line) => `${line.dataKey}/${line.stroke}/${line.strokeWidth}`)
                .join(','),
            })

            return h.output([], ['family context'])
          },
        })

        const layer = FamilyParent.makeLayer({
          init: FamilyComposition.makeInit(() => ({ model: {} })),
          update: FamilyComposition.makeUpdate({}),
          view: FamilyComposition.makeView((model, h) => ({
            title: 'Family context',
            body: h.div(
              [],
              [
                h.block(
                  FamilyBinding.embedView({
                    slotId: 'chart',
                    model: model.chart,
                    viewInputs: inputs,
                  }),
                ),
              ],
            ),
          })),
        }).pipe(Layer.provide(candleSubject.layer))

        observed.length = 0

        const { html } = yield* renderToString(
          { block: FamilyParent, layer },
          {},
          { isHydratable: false },
        )

        expect(html).toContain('family context')
        const focused = yield* Effect.forEach(observed, (observation) =>
          Story.story(
            candleSubject,
            Story.init(entry.kind, financialRows, root.configuration(props)),
            Story.message(observation.action),
          ),
        )
        expect(focused.map((model) => Option.getOrNull(model.focusedIndex))).toEqual([0])
        expect(observed.map(({ action: _action, ...facts }) => facts)).toEqual([
          {
            x: entry.expectedX,
            y: entry.expectedY,
            bandWidth: entry.expectedWidth,
            loaded: false,
            line: entry.expectedLine,
          },
        ])
      }),
  )
}

export const ScatterContextKey = Symbol('ScatterContext')

const ScatterBlock = Block.make(scatterEntry.root.namespace, {
  key: ScatterContextKey,
  ...scatterEntry.root.contract,
})

const scatterSubject = {
  block: ScatterBlock,
  layer: ScatterBlock.makeLayer(scatterEntry.root.plans(ScatterBlock)),
}

export const ScatterParentKey = Symbol('SharedScatterContextParent')

{
  const entry = scatterEntry
  const { root, props } = entry
  const ChartBlock = ScatterBlock

  const observed: Array<{
    readonly x: ReadonlyArray<number>
    readonly y: ReadonlyArray<number> | undefined
    readonly bandWidth: number | undefined
    readonly line: string
    readonly loaded: boolean
    readonly action: typeof ChartBlock.Message.Type
  }> = []

  const Model = Schema.Struct({ chart: ChartBlock.Model })

  const FamilyParent = Block.make('SharedScatterContextParent', {
    key: ScatterParentKey,
    Model,
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Document' },
  })

  const FamilyBinding = FamilyParent.makeRequiredFieldBinding(ChartBlock, {
    field: 'chart',
    init: { contextToArgs: () => [entry.kind, financialRows, root.configuration(props)] },
  })

  const FamilyComposition = FamilyParent.makeComposition({ bindings: [FamilyBinding] })

  it.effect(
    `the checked ${entry.kind} context retains pre-measure Source domains and owner-bound intent`,
    () =>
      Effect.gen(function* familyContextContract() {
        const inputs = root.inputs(entry.kind, {
          ...props,
          renderContext: (context, h) => {
            const requested = context.hover.setTooltipData({
              point: financialRow,
              index: 0,
              x: 0,
              yPositions: {},
            })

            if (!Schema.is(ChartBlock.Message)(requested)) {
              throw new Error('Family context did not return its owner message')
            }

            observed.push({
              x: context.stable.xScale.domain().map(Number),
              y: context.stable.yDomainTargetByAxis.left,
              bandWidth: context.stable.bandWidth,
              loaded: context.stable.isLoaded,
              action: requested,
              line: context.stable.lines
                .map((line) => `${line.dataKey}/${line.stroke}/${line.strokeWidth}`)
                .join(','),
            })

            return h.output([], ['family context'])
          },
        })

        const layer = FamilyParent.makeLayer({
          init: FamilyComposition.makeInit(() => ({ model: {} })),
          update: FamilyComposition.makeUpdate({}),
          view: FamilyComposition.makeView((model, h) => ({
            title: 'Family context',
            body: h.div(
              [],
              [
                h.block(
                  FamilyBinding.embedView({
                    slotId: 'chart',
                    model: model.chart,
                    viewInputs: inputs,
                  }),
                ),
              ],
            ),
          })),
        }).pipe(Layer.provide(scatterSubject.layer))

        observed.length = 0

        const { html } = yield* renderToString(
          { block: FamilyParent, layer },
          {},
          { isHydratable: false },
        )

        expect(html).toContain('family context')
        const focused = yield* Effect.forEach(observed, (observation) =>
          Story.story(
            scatterSubject,
            Story.init(entry.kind, financialRows, root.configuration(props)),
            Story.message(observation.action),
          ),
        )
        expect(focused.map((model) => Option.getOrNull(model.focusedIndex))).toEqual([0])
        expect(observed.map(({ action: _action, ...facts }) => facts)).toEqual([
          {
            x: entry.expectedX,
            y: entry.expectedY,
            bandWidth: entry.expectedWidth,
            loaded: false,
            line: entry.expectedLine,
          },
        ])
      }),
  )
}

const financialFlatten: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) =>
  nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...financialFlatten(node.children)] : [node],
  )

const rectanglePaint = (nodes: ReadonlyArray<SceneNode>) =>
  financialFlatten(nodes).flatMap((node) =>
    node.kind === 'rect'
      ? [
          {
            x: node.x,
            className: node.className,
            y: node.y,
            width: node.width,
            height: node.height,
            radius: node.radius,
            style: node.style,
          },
        ]
      : [],
  )

for (const scenario of [
  { name: 'animated entrance', animate: true, ready: false, hasCopy: false },
  { name: 'ready static body', animate: true, ready: true, hasCopy: true },
  { name: 'animate=false before global readiness', animate: false, ready: false, hasCopy: true },
]) {
  it.effect(
    `paints Source hover copy for ${scenario.name} without changing interaction points`,
    () =>
      Story.withBlock(candleSubject, (chart) => {
        const rows = [0, 1, 2].map((index) =>
          index === 0
            ? financialRow
            : FinancialRow.make({
                ...financialRow,
                date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
              }),
        )

        const props = {
          animationDuration: 1100,
          candleWidth: 40,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          children: [
            PatternLines({ id: 'hover-lines', width: 4, height: 4, stroke: 'white' }),
            Candlestick({
              animate: scenario.animate,
              showHoverFade: false,
              bodyPatternPositive: 'url(#hover-lines)',
              bodyPatternNegative: 'url(#hover-lines)',
              insideStrokeWidth: 0.5,
            }),
          ],
        }

        const initial = chart.init(
          'hover-candle',
          rows,
          candleEntry.root.configuration(props),
        ).model

        const model = scenario.ready
          ? chart.update(initial, chart.Message.CompletedReveal({ generation: initial.generation }))
              .model
          : initial

        let published = 0
        let geometryCss = ''
        let centers: ReadonlyArray<number> = []

        const onBuilt = (snapshot: CartesianSnapshot<typeof FinancialRow.Type>) => {
          published += 1
          geometryCss = snapshot.candleGeometry?.css ?? ''
          centers = snapshot.candleGeometry?.centers ?? []
        }

        const inputs = candleEntry.root.inputs('hover-candle', props)
        const definition = inputs.resourceDefinition?.(rows, model, onBuilt, () => 0)

        if (definition === undefined) {
          throw new Error('Missing real Candle definition')
        }

        const runtime = createChartRuntime<typeof FinancialRow.Type, Date, number>()

        try {
          const scene = runtime.render(definition, { width: 601, height: 401 })
          const [point] = scene.points

          const base = financialFlatten(scene.nodes).find(
            (node) =>
              node.kind === 'group' && node.className?.split(' ').includes('bkm-candle') === true,
          )

          if (point === undefined || base?.kind !== 'group') {
            throw new Error('Missing original candle')
          }

          expect(point.datum).toBe(financialRow)
          expect(published).toBe(1)
          expect(centers).toEqual(scene.points.map((item) => item.x))
          expect(point.x).not.toBe(Math.round(point.x * 100) / 100)
          const bodyRule = geometryCss.split('}').find((rule) => rule.includes('-body{'))
          const height = Number(/height:(?<height>[^p]+)px/u.exec(bodyRule ?? '')?.groups?.height)
          expect(height).toBeCloseTo((401 * 10) / 22, 12)
          expect(height).not.toBe(Math.round(height * 100) / 100)
          expect(scene.points.map((item) => item.datum)).toEqual(rows)
          expect(scene.points.map((item) => item.datumIndex)).toEqual([0, 1, 2])

          const paint = resolveFocusPresentation(
            scene,
            {
              primary: point,
              group: [point],
              source: 'pointer',
              pinned: false,
            },
            null,
          )

          expect(paint.over).toHaveLength(scenario.hasCopy ? 1 : 0)

          if (scenario.hasCopy) {
            expect(rectanglePaint(paint.over)).toEqual(rectanglePaint(base.children))
            expect(rectanglePaint(paint.over)).toHaveLength(4)
            expect(
              financialFlatten(paint.over).every(
                (node) => node.kind !== 'rect' || node.interaction === undefined,
              ),
            ).toBe(true)
          }

          expect(resolveFocusPresentation(scene, null, null).over).toHaveLength(0)
          expect(scene.points).toHaveLength(rows.length)

          if (scenario.ready) {
            const empty = inputs.resourceDefinition?.([], model, onBuilt, () => 0)

            if (empty === undefined) {
              throw new Error('Empty Candle must publish its replacement presentation')
            }

            runtime.render(empty, { width: 601, height: 401 })
            expect(published).toBe(2)
            expect(geometryCss).toBe('')
            expect(centers).toEqual([])
          }
        } finally {
          runtime.destroy()
        }
      }),
  )
}
