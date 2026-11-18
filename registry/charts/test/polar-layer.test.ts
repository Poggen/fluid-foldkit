// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect, vi } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Block, Story } from 'foldkit'
import { PieChart, PieData } from '../src/pie'
import { RingChart, RingData, Ring as RingPart } from '../src/ring'
import { RadarChart, RadarArea } from '../src/radar'
import { constUndefined } from 'effect/Function'
import { SunburstChart, SunburstSegment } from '../src/sunburst'
import { SankeyChart } from '../src/sankey'
import { ChoroplethChart } from '../src/choropleth'

const pie = PieChart({ name: 'polar-layer-pure-pie', Row: PieData })

const ring = RingChart({ name: 'polar-layer-pure-ring', Row: RingData })

export const PurePieKey = Symbol('PurePie')

export const PureRingKey = Symbol('PureRing')

const Pie = Block.make(pie.namespace, { ...pie.contract, key: PurePieKey })

const Ring = Block.make(ring.namespace, { ...ring.contract, key: PureRingKey })

const sunburst = SunburstChart({ name: 'layer-pure-sunburst' })

const sankey = SankeyChart({ name: 'layer-pure-sankey' })

const choropleth = ChoroplethChart({ name: 'layer-pure-choropleth' })

export const PureSunburstKey = Symbol('PureSunburst')

export const PureSankeyKey = Symbol('PureSankey')

export const PureChoroplethKey = Symbol('PureChoropleth')

const Sunburst = Block.make(sunburst.namespace, { ...sunburst.contract, key: PureSunburstKey })

const Sankey = Block.make(sankey.namespace, { ...sankey.contract, key: PureSankeyKey })

const Choropleth = Block.make(choropleth.namespace, {
  ...choropleth.contract,
  key: PureChoroplethKey,
})

const layer = Layer.mergeAll(
  Pie.makeLayer(pie.plans<typeof PurePieKey>(Pie)),
  Ring.makeLayer(ring.plans<typeof PureRingKey>(Ring)),
  Sunburst.makeLayer(sunburst.plans<typeof PureSunburstKey>(Sunburst)),
  Sankey.makeLayer(sankey.plans<typeof PureSankeyKey>(Sankey)),
  Choropleth.makeLayer(choropleth.plans<typeof PureChoroplethKey>(Choropleth)),
)

const acquireHandlers = <R>(tag: string, handlers: Layer.Layer<R>) =>
  Effect.gen(function* () {
    expect(customElements.get(tag)).toBeUndefined()
    yield* Effect.scoped(Layer.build(handlers))
    expect(customElements.get(tag)).toBeDefined()
    expect(document.querySelector(tag)).toBeNull()
  })

it.effect(
  'keeps Polar and hierarchy graphs passive and registers drawings when handlers are acquired',
  () =>
    Effect.gen(function* buildChartHandlers() {
      const define = vi.spyOn(customElements, 'define')
      const createElement = vi.spyOn(document, 'createElement')

      try {
        yield* Story.withBlock({ block: Pie, layer }, (acquired) =>
          acquireHandlers('fk-polar-polar-layer-pure-pie', acquired.EffectsLayer),
        )
        yield* Story.withBlock({ block: Ring, layer }, (acquired) =>
          acquireHandlers('fk-polar-polar-layer-pure-ring', acquired.EffectsLayer),
        )
        yield* Story.withBlock({ block: Sunburst, layer }, (acquired) =>
          acquireHandlers('fk-sunburst-layer-pure-sunburst', acquired.EffectsLayer),
        )
        yield* Story.withBlock({ block: Sankey, layer }, (acquired) =>
          acquireHandlers('fk-sankey-layer-pure-sankey', acquired.EffectsLayer),
        )
        yield* Story.withBlock({ block: Choropleth, layer }, (acquired) =>
          acquireHandlers('fk-choropleth-layer-pure-choropleth', acquired.EffectsLayer),
        )

        expect(define).toHaveBeenCalledTimes(5)
        expect(createElement).not.toHaveBeenCalled()
      } finally {
        define.mockRestore()
        createElement.mockRestore()
      }
    }),
)

it.effect(
  'retargets and releases instant Ring, Radar and Sunburst entrances using the supported JS fallback',
  () =>
    Effect.gen(function* instantPolarLifecycle() {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

          if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
            throw new Error('Polar lifecycle test requires scoped WAAPI capability removal')
          }

          return descriptor
        }),
        (descriptor) =>
          Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
      )

      const container = yield* Effect.acquireRelease(
        Effect.sync(() => {
          const element = document.createElement('div')
          document.body.append(element)

          return element
        }),
        (element) =>
          Effect.sync(() => {
            element.remove()
          }),
      )

      const ringData = [
        { label: 'First', value: 20, maxValue: 50 },
        { label: 'Second', value: 30, maxValue: 50 },
      ]

      const ringProps = {
        data: ringData,
        size: 320,
        enterTransition: { duration: 0 },
        enterStaggerScale: 0,
        children: [RingPart({ index: 0 })],
      }

      const radar = RadarChart({ name: 'polar-instant-radar' })
      const radarData = [{ label: 'Series', values: { a: 30, b: 60, c: 80 } }]

      const radarProps = {
        data: radarData,
        metrics: [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
          { key: 'c', label: 'C' },
        ],
        size: 320,
        enterDurationMs: 0,
        enterTransition: { duration: 0 },
        children: [RadarArea({ index: 0 })],
      }

      yield* Effect.scoped(
        Effect.gen(function* mountedInstantCharts() {
          const ringHost = yield* Effect.acquireRelease(
            Effect.sync(() =>
              ring
                .inputs('instant-ring', ringProps)
                .mount(
                  container,
                  ringData,
                  null,
                  constUndefined,
                  () => performance.now(),
                  constUndefined,
                ),
            ),
            (host) =>
              Effect.sync(() => {
                host.destroy()
              }),
          )

          expect(container.querySelector('path')?.getAttribute('d')).toBeTruthy()
          ring
            .inputs('instant-ring', { ...ringProps, children: [RingPart({ index: 1 })] })
            .configure(ringHost)

          const radarHost = yield* Effect.acquireRelease(
            Effect.sync(() =>
              radar
                .inputs('instant-radar', radarProps)
                .mount(
                  container,
                  radarData,
                  null,
                  constUndefined,
                  () => performance.now(),
                  constUndefined,
                ),
            ),
            (host) =>
              Effect.sync(() => {
                host.destroy()
              }),
          )

          radar
            .inputs('instant-radar', { ...radarProps, motionReplayKey: 'retargeted' })
            .configure(radarHost)

          const sunburstState = yield* Story.story(
            { block: Sunburst, layer },
            Story.init('instant-sunburst'),
          )

          const sunburstProps = {
            data: { name: 'Root', children: [{ name: 'First', value: 30 }] },
            size: 320,
            enterTransition: { duration: 0 },
            enterStaggerScale: 0,
            children: [SunburstSegment({ index: 0 })],
          }

          const actions = { focus: constUndefined, hover: constUndefined }

          const sunburstHost = yield* Effect.acquireRelease(
            Effect.sync(() =>
              sunburst
                .inputs('instant-sunburst', sunburstProps, actions)
                .mount(
                  container,
                  { ...sunburstState, width: 320, height: 320 },
                  constUndefined,
                  () => performance.now(),
                ),
            ),
            (host) =>
              Effect.sync(() => {
                host.destroy()
              }),
          )

          sunburst
            .inputs('instant-sunburst', { ...sunburstProps, playKey: 1 }, actions)
            .configure(sunburstHost)
          expect(container.querySelectorAll('svg').length).toBeGreaterThan(2)
        }),
      )
      expect(container.childElementCount).toBe(0)
    }),
)
