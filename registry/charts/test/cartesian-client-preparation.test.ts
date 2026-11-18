// oxlint-disable no-comments/no-comments -- Vitest needs browser class definitions before importing the native drawing host.

// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom

// oxlint-enable no-comments/no-comments -- Resume comment policy after required test metadata.

import { it } from '@effect/vitest'
import { DateTime, Effect, Layer, Option, Schema } from 'effect'
import { Block, Scene, Story } from 'foldkit'
import { expect } from 'vitest'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import { CandlestickChart, Candlestick } from '@foldkit-visuals/charts/candlestick'
import { LineChart, AreaChart } from '@foldkit-visuals/charts/line'
import { initialInteraction } from '../src/cartesian/state'
import { BarChart } from '../src/bar/root'
import { Bar, BarSquares } from '../src/bar/carriers'
import type { BarDatum } from '../src/bar/model'
import { MountCartesian, PrepareCartesian } from '../src/cartesian/lifecycle'
import { nativeObservations } from '../src/cartesian/native-resource'

const Row = Schema.Struct({ name: Schema.String, value: Schema.Finite })

const recipe = BarChart({ name: 'client-preparation-bar', Row })

export const ClientPreparationKey = Symbol('Cartesian')

const chart = Block.make(recipe.namespace, { key: ClientPreparationKey, ...recipe.contract })

const preparationProps = { width: 640, height: 320, children: [Bar({ dataKey: 'value' })] }

it.effect('keeps the client preparation view empty until the live drawing is admitted', () =>
  Scene.scene(
    {
      block: chart,
      layer: chart.makeLayer(recipe.plans<typeof ClientPreparationKey>(chart)),
      viewInputs: recipe.inputs('pending-client', preparationProps),
    },
    Scene.init(
      'pending-client',
      [{ name: 'A', value: 20 }],
      recipe.configuration(preparationProps),
    ),
    Scene.expect(Scene.selector('svg')).not.toExist(),
    Scene.expect(Scene.selector('fk-bklit-client-preparation-bar')).not.toExist(),
    Scene.Mount.resolve(PrepareCartesian, chart.Message.CompletedPrepare()),
    Scene.expect(Scene.selector('fk-bklit-client-preparation-bar')).toExist(),
    Scene.Mount.resolve(MountCartesian, chart.Message.CompletedMount()),
  ),
)

const DatedRow = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const pureLine = LineChart({ name: 'cartesian-handler-pure-line', Row: DatedRow })

const pureArea = AreaChart({ name: 'cartesian-handler-pure-area', Row: DatedRow })

export const PureCartesianLineKey = Symbol('PureCartesianLine')

export const PureCartesianAreaKey = Symbol('PureCartesianArea')

const PureLine = Block.make(pureLine.namespace, { key: PureCartesianLineKey, ...pureLine.contract })

const PureArea = Block.make(pureArea.namespace, { key: PureCartesianAreaKey, ...pureArea.contract })

const pureLayers = Layer.mergeAll(
  PureLine.makeLayer(pureLine.plans(PureLine)),
  PureArea.makeLayer(pureArea.plans(PureArea)),
)

it.effect('registers Cartesian elements at execution while graph acquisition stays passive', () =>
  Effect.gen(function* registerCartesianHandlers() {
    yield* Story.withBlock({ block: PureLine, layer: pureLayers }, (acquired) =>
      Effect.gen(function* () {
        expect(customElements.get('fk-bklit-cartesian-handler-pure-line')).toBeUndefined()
        yield* Effect.scoped(Layer.build(acquired.EffectsLayer))
        expect(customElements.get('fk-bklit-cartesian-handler-pure-line')).toBeDefined()
      }),
    )
    yield* Story.withBlock({ block: PureArea, layer: pureLayers }, (acquired) =>
      Effect.gen(function* () {
        expect(customElements.get('fk-bklit-cartesian-handler-pure-area')).toBeUndefined()
        yield* Effect.scoped(Layer.build(acquired.EffectsLayer))
        expect(customElements.get('fk-bklit-cartesian-handler-pure-area')).toBeDefined()
      }),
    )
  }),
)

const CandleRow = Schema.Struct({
  date: Schema.DateFromString,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
})

const candleRows = [
  { open: 10, close: 20, high: 30, low: 0 },
  { open: 20, close: 10, high: 30, low: 0 },
].map((values, index) =>
  CandleRow.make({
    ...values,
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)),
  }),
)

const candleRecipe = CandlestickChart({ name: 'client-candle-motion-policy', Row: CandleRow })

const candleDefinition = (revealReady: boolean, candleWidth = 40, rows = candleRows) => {
  const candleProps = {
    width: 600,
    height: 400,
    candleWidth,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    children: [Candlestick()],
  }

  const definition = candleRecipe
    .inputs('client-candle-motion-policy', candleProps)
    .resourceDefinition?.(
      rows,
      { ...initialInteraction(candleRecipe.configuration(candleProps)), revealReady },
      () => {},
      () => 0,
    )

  if (definition === undefined) {
    throw new Error('Candle must provide its real drawing definition')
  }

  return definition
}

for (const behavior of ['phase replacement', 'static geometry update']) {
  it.live(
    `Candle mark policy immediately paints ${behavior} without inherited renderer morph`,
    () =>
      Effect.gen(function* candleMarkMotionPolicy() {
        const container = document.createElement('div')
        document.body.append(container)

        const renderer = motion<typeof CandleRow.Type, Date, number>({
          initial: false,
          respectReducedMotion: false,
        })

        const options = {
          definition: candleDefinition(behavior === 'static geometry update'),
          renderer,
          width: 600,
          height: 400,
          ariaLabel: 'Candle motion policy',
        }

        const host = mountChartRenderer(container, options)

        try {
          const oldGroup = container.querySelector('g.bkm-candle')
          const oldBody = oldGroup?.querySelector('rect[rx]')

          if (oldGroup === null || oldBody === null || oldBody === undefined) {
            throw new Error('The public renderer must paint a real candle group and body')
          }

          if (behavior === 'phase replacement') {
            host.update({ ...options, definition: candleDefinition(true) })
            expect(oldGroup.isConnected).toBe(false)
            expect(container.querySelectorAll('g.bkm-candle')).toHaveLength(candleRows.length)
            expect(container.querySelector('g.bkm-candle-static')?.getAttribute('opacity')).toBe(
              '1',
            )
          } else {
            const changedRows = candleRows.map((row) =>
              CandleRow.make({ ...row, open: 12, close: 24 }),
            )

            host.update({ ...options, definition: candleDefinition(true, 14, changedRows) })
            yield* Effect.callback<number>((resume) => {
              const frame = requestAnimationFrame((at) => {
                resume(Effect.succeed(at))
              })

              return Effect.sync(() => {
                cancelAnimationFrame(frame)
              })
            })
            expect(container.querySelector('g.bkm-candle')).toBe(oldGroup)
            expect(oldGroup.querySelector('rect[rx]')).toBe(oldBody)
            expect(['x', 'y', 'width', 'height'].map((name) => oldBody.getAttribute(name))).toEqual(
              ['143', '110', '14', '120'],
            )
          }
        } finally {
          host.destroy()
          container.remove()
        }
      }),
  )
}

const SquareRow = Schema.Struct({ name: Schema.String, a: Schema.Finite, b: Schema.Finite })

const squareRecipe = BarChart({ name: 'client-static-square-entrance', Row: SquareRow })

export const StaticSquareEntranceKey = Symbol('StaticSquareEntrance')

const SquareChart = Block.make(squareRecipe.namespace, {
  key: StaticSquareEntranceKey,
  ...squareRecipe.contract,
})

const squareSubject = {
  block: SquareChart,
  layer: SquareChart.makeLayer(squareRecipe.plans(SquareChart)),
}

it.live(
  'disabled square entrances snap resized geometry while enabled siblings keep their tween',
  () =>
    Story.withBlock(squareSubject, (owner) =>
      Effect.gen(function* staticSquareClientMotion() {
        const rows = [
          SquareRow.make({ name: 'A', a: 20, b: 20 }),
          SquareRow.make({ name: 'B', a: 40, b: 40 }),
        ]

        const props = {
          animationDuration: 10_000,
          barGap: 0,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          children: [
            BarSquares({ dataKey: 'a', fill: 'red', animate: false, squareGap: 0, groupGap: 0 }),
            BarSquares({ dataKey: 'b', fill: 'blue', animate: true, squareGap: 0, groupGap: 0 }),
          ],
        }

        const inputs = squareRecipe.inputs('static-square-client', props)

        const initial = owner.init(
          'static-square-client',
          rows,
          squareRecipe.configuration(props),
        ).model

        const definitionFor = (model: typeof SquareChart.Model.Type) => {
          const definition = inputs.resourceDefinition?.(
            model.data,
            model,
            () => {},
            () => performance.now(),
          )

          if (definition === undefined) {
            throw new Error('Bar must provide its real drawing definition')
          }

          return definition
        }

        const container = document.createElement('div')
        document.body.append(container)

        const options = {
          definition: definitionFor(initial),
          renderer: motion<BarDatum<typeof SquareRow.Type>, string | number, string | number>({
            initial: false,
            respectReducedMotion: false,
            resize: true,
          }),
          width: 400,
          height: 400,
          ariaLabel: 'Static and animated square entrances',
        }

        const host = mountChartRenderer(container, options)

        try {
          const disabled = container.querySelector<SVGRectElement>('rect[fill="red"]')
          const enabled = container.querySelector<SVGRectElement>('rect[fill="blue"]')

          if (disabled === null || enabled === null) {
            throw new Error('Both square series must render')
          }

          expect(disabled.getAttribute('height')).toBe('100')
          expect(enabled.getAttribute('height')).toBe('0')

          const clocked = owner.update(
            initial,
            owner.Message.ObservedPhaseTiming({
              generation: initial.generation,
              elapsed: null,
              at: performance.now(),
            }),
          ).model

          host.update({ ...options, definition: definitionFor(clocked) })
          host.update({ ...options, definition: definitionFor(clocked), width: 200 })
          yield* Effect.callback<number>((resume) => {
            const frame = requestAnimationFrame((at) => {
              resume(Effect.succeed(at))
            })

            return Effect.sync(() => {
              cancelAnimationFrame(frame)
            })
          })

          expect(container.querySelector('rect[fill="red"]')).toBe(disabled)
          expect(disabled.getAttribute('height')).toBe('50')
          expect(disabled.getAttribute('width')).toBe('50')
          expect(disabled.getAttribute('y')).toBe('350')
          expect(Number(enabled.getAttribute('height'))).toBeLessThan(50)
        } finally {
          host.destroy()
          container.remove()
        }
      }),
    ),
)

it.live('square paints report real viewport changes without a caller context renderer', () =>
  Story.withBlock(squareSubject, (owner) =>
    Effect.gen(function* squarePaintViewport() {
      const rows = [SquareRow.make({ name: 'A', a: 20, b: 40 })]

      const props = {
        children: [BarSquares({ dataKey: 'a', fill: 'teal', useGradient: true, animate: false })],
      }

      const inputs = squareRecipe.inputs('square-measurements', props)
      let { model } = owner.init('square-measurements', rows, squareRecipe.configuration(props))

      if (inputs.createResource === undefined || inputs.resourceDefinition === undefined) {
        throw new Error('Square paints require the real Bar resource and definition')
      }

      const { resourceDefinition: compile } = inputs
      const container = document.createElement('div')
      document.body.append(container)

      const resource = inputs.createResource(
        container,
        {
          ...nativeObservations(container),
          domains: (current, target, viewport) => {
            if (viewport === undefined) {
              throw new Error('Square paint observations require a measured viewport')
            }

            ;({ model } = owner.update(
              model,
              owner.Message.ObservedDomains({ current, target, viewport }),
            ))
          },
        },
        () => performance.now(),
      )

      const definition = () => compile(rows, model, resource.draw, () => performance.now())

      const options = {
        definition: definition(),
        width: 400,
        height: 300,
        renderer: motion<BarDatum<typeof SquareRow.Type>, string | number, string | number>({
          initial: false,
        }),
        ariaLabel: 'Measured square paints',
      }

      const host = mountChartRenderer(container, options)

      const flushObservation = Effect.callback((resume) => {
        queueMicrotask(() => {
          resume(Effect.void)
        })
      }).pipe(Effect.asVoid)

      try {
        resource.attach(host)
        yield* flushObservation
        expect(Option.getOrUndefined(model.viewport)?.width).toBe(400)
        expect(Option.getOrUndefined(model.viewport)?.height).toBe(300)
        host.update({ ...options, definition: definition(), width: 240, height: 180 })
        yield* flushObservation
        expect(Option.getOrUndefined(model.viewport)?.width).toBe(240)
        expect(Option.getOrUndefined(model.viewport)?.height).toBe(180)
      } finally {
        resource.destroy()
        host.destroy()
        container.remove()
      }
    }),
  ),
)
