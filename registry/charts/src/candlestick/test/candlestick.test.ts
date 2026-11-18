import { DateTime, Effect, Schema } from 'effect'
import { expect } from 'vitest'
import { it as effectIt } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import type { CartesianSnapshot } from '../../cartesian/definition'
import {
  CandlestickChart,
  Candlestick,
  Grid,
  XAxis,
  YAxis,
  PatternLines,
} from '@foldkit-visuals/charts/candlestick'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
  name: Schema.String,
})

const data = [
  { open: 10, close: 20, high: 25, low: 5, name: 'gain' },
  { open: 20, close: 10, high: 30, low: 0, name: 'loss' },
  { open: 15, close: 15, high: 18, low: 12, name: 'flat' },
].map((values, index) =>
  Row.make({ ...values, date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)) }),
)

const root = CandlestickChart({ name: 'candle-contract', Row })

export const CandlestickContractKey = Symbol('CandlestickContract')

const Chart = Block.make(root.namespace, { key: CandlestickContractKey, ...root.contract })

const subject = { block: Chart, layer: Chart.makeLayer(root.plans(Chart)) }

const flatten: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((node) => (node.kind === 'group' ? [node, ...flatten(node.children)] : [node]))

effectIt.effect(
  'keeps Source grid tick sets decorative and leaves plot cropping to the mask content rectangle',
  () =>
    Story.withBlock(subject, (chart) => {
      const props = {
        animationDuration: 0,
        margin: { top: 17, right: 23, bottom: 31, left: 43 },
        children: [
          Candlestick(),
          Grid({
            rowTickValues: [5, 20, 100],
            highlightRowValues: [15],
            vertical: true,
            fadeVertical: true,
          }),
          YAxis({ numTicks: 2 }),
        ],
      }

      const model = chart.init('source-grid', data, root.configuration(props)).model
      let snapshot: CartesianSnapshot<typeof Row.Type> | undefined

      const definition = root.inputs('source-grid', props).resourceDefinition?.(
        data,
        model,
        (value) => {
          snapshot = value
        },
        () => 0,
      )

      if (definition === undefined) {
        throw new Error('Candle must compile the ordinary public grid consumer')
      }

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        for (const [width, height, plotWidth, plotHeight] of [
          [640, 320, 574, 272],
          [40, 30, 1, 1],
        ] satisfies ReadonlyArray<readonly [number, number, number, number]>) {
          const scene = runtime.render(definition, { width, height })
          const nodes = flatten(scene.nodes)
          const rows = nodes.find((node) => node.key === 'source-grid-rows')
          const columns = nodes.find((node) => node.key === 'source-grid-columns')

          if (rows?.kind !== 'group' || columns?.kind !== 'group') {
            throw new Error('Source rows and columns must retain their public mark roots')
          }

          const bounds = { x: 43, y: 17, width: plotWidth, height: plotHeight }
          expect(rows.clip).toBeUndefined()
          expect(columns.clip).toBeUndefined()
          expect(rows.children).toHaveLength(3)
          expect(rows.children.some((node) => node.kind === 'rule' && node.y1 < bounds.y)).toBe(
            true,
          )
          expect(snapshot?.sourceGrid?.map((mask) => mask.bounds)).toEqual([bounds, bounds])
          const highlighted = nodes.find((node) => node.key === 'grid-highlight-rows')
          expect(highlighted?.kind === 'group' ? highlighted.clip : 'missing').toBeUndefined()
          expect(scene.points).toHaveLength(data.length)
          expect(
            nodes
              .filter((node) => node.kind === 'rule')
              .every((node) => node.interaction === undefined && node.pointOwner === undefined),
          ).toBe(true)
        }
      } finally {
        runtime.destroy()
      }
    }),
)

effectIt.effect(
  'renders caller-owned positive, negative and one-pixel flat bodies using source slot and OHLC arithmetic',
  () =>
    Story.withBlock(subject, (chart) => {
      const props = {
        animationDuration: 0,
        candleWidth: 40,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        children: [
          Candlestick({ positiveFill: 'green', negativeFill: 'red' }),
          Grid(),
          XAxis(),
          YAxis(),
        ],
      }

      const initial = chart.init('candle-contract', data, root.configuration(props)).model

      const model = chart.update(
        initial,
        chart.Message.CompletedReveal({ generation: initial.generation }),
      ).model

      const inputs = root.inputs('candle-contract', props)

      const definition = inputs.resourceDefinition?.(
        data,
        model,
        () => {},
        () => 0,
      )

      if (definition === undefined) {
        throw new Error('Missing native candle drawing definition')
      }

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        const scene = runtime.render(definition, { width: 600, height: 400 })

        const groups = flatten(scene.nodes).filter(
          (node) =>
            node.kind === 'group' && node.className?.split(' ').includes('bkm-candle') === true,
        )

        expect(groups).toHaveLength(3)

        for (const group of groups) {
          if (group.kind === 'group') {
            expect(flatten(group.children).filter((node) => node.kind === 'rect')).toHaveLength(2)
          }
        }

        const bodies = flatten(scene.nodes).filter(
          (node) => node.kind === 'rect' && node.key.startsWith('body:'),
        )

        expect(bodies).toHaveLength(3)
        expect(
          bodies.map((node) => (node.kind === 'rect' ? [node.x, node.y, node.width] : [])),
        ).toEqual([
          [80, 150, 40],
          [280, 150, 40],
          [480, 200, 40],
        ])
        const heights = bodies.map((node) => (node.kind === 'rect' ? node.height : 0))
        expect(heights[0]).toBe(100)
        expect(heights[1]).toBe(100)
        expect(heights[2]).toBeCloseTo(1, 12)
        expect(bodies.map((node) => node.style?.fill)).toEqual(['green', 'red', 'green'])
        expect(scene.points.map((point) => point.datum)).toEqual(data)
        expect(scene.points.map((point) => point.datumIndex)).toEqual([0, 1, 2])

        const gaps: ReadonlyArray<readonly [number, number]> = [
          [0.5, 100],
          [0, 200],
        ]

        for (const [gap, width] of gaps) {
          const gapInputs = root.inputs('candle-contract', {
            animationDuration: 0,
            candleGap: gap,
            margin: props.margin,
            children: props.children,
          })

          const gapDefinition = gapInputs.resourceDefinition?.(
            data,
            model,
            () => {},
            () => 0,
          )

          if (gapDefinition === undefined) {
            throw new Error('Missing gap drawing definition')
          }

          const gapScene = runtime.render(gapDefinition, { width: 600, height: 400 })

          const gapBodies = flatten(gapScene.nodes).filter(
            (node) => node.kind === 'rect' && node.key.startsWith('body:'),
          )

          expect(gapBodies.map((node) => (node.kind === 'rect' ? node.width : 0))).toEqual([
            width,
            width,
            width,
          ])
        }

        const defaultProps = { ...props, children: [Candlestick()] }

        const defaults = root.inputs('default-candle', defaultProps).resourceDefinition?.(
          data,
          model,
          () => {},
          () => 0,
        )

        if (defaults === undefined) {
          throw new Error('Missing default candle definition')
        }

        const defaultScene = runtime.render(defaults, { width: 600, height: 400 })

        const defaultBodies = flatten(defaultScene.nodes).filter(
          (node) => node.kind === 'rect' && node.key.startsWith('body:'),
        )

        const gradientPaints = new Set(
          defaultScene.gradients.map((gradient) => `url(#${gradient.id})`),
        )

        expect(defaultScene.gradients).toHaveLength(2)
        expect(
          defaultBodies.every(
            (node) => node.style?.fill !== undefined && gradientPaints.has(node.style.fill),
          ),
        ).toBe(true)
        expect(
          defaultScene.gradients.map((gradient) => [
            gradient.x1,
            gradient.x2,
            gradient.y1,
            gradient.y2,
            gradient.stops.map((stop) => stop.offset),
          ]),
        ).toEqual([
          [0, 0, 1, 0, [0, 1]],
          [0, 0, 1, 0, [0, 1]],
        ])

        const flippedRows = data.map((row) =>
          Row.make({ ...row, open: row.close, close: row.open }),
        )

        const flipped = inputs.resourceDefinition?.(
          flippedRows,
          model,
          () => {},
          () => 0,
        )

        if (flipped === undefined) {
          throw new Error('Missing changed-sign candle definition')
        }

        const flippedScene = runtime.render(flipped, { width: 600, height: 400 })
        expect(flippedScene.points.map((point) => point.key)).toEqual(
          scene.points.map((point) => point.key),
        )

        const flatRows = data.map((row) =>
          Row.make({
            ...row,
            high: row.open,
            low: row.open,
            close: row.open,
          }),
        )

        const flat = inputs.resourceDefinition?.(
          flatRows,
          model,
          () => {},
          () => 0,
        )

        if (flat === undefined) {
          throw new Error('Missing flat candle definition')
        }

        const flatScene = runtime.render(flat, { width: 600, height: 400 })

        const flatWicks = flatten(flatScene.nodes).filter(
          (node) => node.kind === 'rect' && node.key.startsWith('wick:'),
        )

        expect(flatWicks.map((node) => (node.kind === 'rect' ? node.height : 0))).toEqual([1, 1, 1])

        const reserveProps = { ...props, animationDuration: 1100 }

        const reserveModel = chart.init(
          'reserve-candle',
          data,
          root.configuration(reserveProps),
        ).model

        const reserve = root.inputs('reserve-candle', reserveProps).resourceDefinition?.(
          data,
          reserveModel,
          () => {},
          () => 0,
        )

        if (reserve === undefined) {
          throw new Error('Missing initial candle definition')
        }

        const reserveScene = runtime.render(reserve, { width: 600, height: 400 })

        const reservedGroups = flatten(reserveScene.nodes).filter(
          (node) =>
            node.kind === 'group' && node.className?.split(' ').includes('bkm-candle') === true,
        )

        expect(reservedGroups.map((node) => node.style?.opacity)).toEqual([0, 0, 0])

        expect(scene.scales.x?.domain).toEqual([
          DateTime.toDateUtc(DateTime.makeUnsafe(-500)),
          DateTime.toDateUtc(DateTime.makeUnsafe(2500)),
        ])
      } finally {
        runtime.destroy()
      }
    }),
)

effectIt.effect(
  'replaces only the entrance group and renders scoped Source pattern and static inset layers',
  () =>
    Story.withBlock(subject, (chart) => {
      const patternedProps = {
        animationDuration: 1100,
        candleWidth: 40,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        children: [
          PatternLines({ id: 'body-lines', width: 4, height: 4, stroke: 'white' }),
          Candlestick({
            positiveFill: 'purple',
            negativeFill: 'blue',
            bodyPatternPositive: 'url(#body-lines)',
            bodyPatternNegative: 'url(#body-lines)',
            insideStrokeWidth: 0.5,
          }),
        ],
      }

      const reserveModel = chart.init(
        'patterned-candle',
        data,
        root.configuration(patternedProps),
      ).model

      const model = chart.update(
        reserveModel,
        chart.Message.CompletedReveal({ generation: reserveModel.generation }),
      ).model

      const runtime = createChartRuntime<typeof Row.Type, Date, number>()

      try {
        const drawPatterned = (state: typeof model) => {
          const patternedDefinition = root
            .inputs('patterned-candle', patternedProps)
            .resourceDefinition?.(
              data,
              state,
              () => {},
              () => 0,
            )

          if (patternedDefinition === undefined) {
            throw new Error('Missing patterned candle definition')
          }

          return runtime.render(patternedDefinition, { width: 600, height: 400 })
        }

        const enteringPattern = drawPatterned(reserveModel)
        const staticPattern = drawPatterned(model)

        const candleGroups = (projectedScene: typeof staticPattern) =>
          flatten(projectedScene.nodes).filter(
            (node) =>
              node.kind === 'group' && node.className?.split(' ').includes('bkm-candle') === true,
          )

        const enteringKeys = candleGroups(enteringPattern).map((node) => node.key)
        const staticKeys = candleGroups(staticPattern).map((node) => node.key)
        expect(enteringKeys).not.toEqual(staticKeys)
        expect(candleGroups(drawPatterned(model)).map((node) => node.key)).toEqual(staticKeys)
        expect(enteringPattern.points.map((point) => point.key)).toEqual(
          staticPattern.points.map((point) => point.key),
        )
        expect(
          flatten(enteringPattern.nodes).filter(
            (node) => node.kind === 'rect' && node.key.startsWith('inset:'),
          ),
        ).toHaveLength(0)

        for (const group of candleGroups(staticPattern)) {
          if (group.kind !== 'group') {
            throw new Error('Expected candle group')
          }

          expect(group.children).toHaveLength(4)
          const [wick, body, pattern, inset] = group.children

          if (
            wick?.kind !== 'rect' ||
            body?.kind !== 'rect' ||
            pattern?.kind !== 'rect' ||
            inset?.kind !== 'rect'
          ) {
            throw new Error('Expected complete source candle layers')
          }

          expect(wick.style?.fill).toBe(body.style?.fill)
          expect(body.style?.fill).toContain('var(--color-')
          expect(pattern.style?.fill).toBe('url(#patterned-candle-body-lines)')
          expect([pattern.x, pattern.y, pattern.width, pattern.height]).toEqual([
            body.x,
            body.y,
            body.width,
            body.height,
          ])
          expect([inset.x, inset.y, inset.width, inset.height]).toEqual([
            body.x + 0.25,
            body.y + 0.25,
            body.width - 0.5,
            body.height - 0.5,
          ])
          expect(inset.style).toEqual({ fill: 'none', stroke: body.style?.fill, strokeWidth: 0.5 })
        }
      } finally {
        runtime.destroy()
      }
    }),
)

for (const duration of [1100, 0]) {
  effectIt.effect(`retires the candlestick reveal before physical remount (${duration}ms)`, () =>
    Effect.gen(function* () {
      const configuration = root.configuration({
        animationDuration: duration,
        children: [Candlestick()],
      })
      const settled = yield* Story.story(
        subject,
        Story.init('candlestick-remount', data, configuration),
        Story.message(Chart.Message.CompletedPrepare()),
        Story.messageWith((model) =>
          Chart.Message.CompletedReveal({ generation: model.generation }),
        ),
      )
      yield* Story.story(
        subject,
        Story.given(settled),
        Story.message(Chart.Message.Unmounted()),
        Story.message(Chart.Message.CompletedPrepare()),
        Story.message(Chart.Message.CompletedReveal({ generation: settled.generation })),
        Story.model((model) => {
          expect(model.isMounted).toBe(true)
          expect(model.generation).toBe(settled.generation + 1)
          expect(model.revealReady).toBe(duration === 0)
          expect(model.phaseClockReady).toBe(false)
          expect(model.data).toEqual(data)
        }),
        Story.Command.expectNone(),
      )
    }),
  )
}
