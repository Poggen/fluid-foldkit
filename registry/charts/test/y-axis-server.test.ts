import { DateTime, Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Window } from 'happy-dom'
import {
  CandlestickChart,
  Candlestick,
  YAxis,
  Grid,
  PatternLines,
} from '@foldkit-visuals/charts/candlestick'
import { Scatter, ScatterChart } from '@foldkit-visuals/charts/scatter'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
})

const recipe = CandlestickChart({ name: 'source-y-axis-server-chart', Row })

export const SourceYAxisChartKey = Symbol('SourceYAxisChart')

const Chart = Block.make(recipe.namespace, { key: SourceYAxisChartKey, ...recipe.contract })

const scatterRecipe = ScatterChart({ name: 'source-scatter-gradient-server', Row })

export const SourceScatterPaintKey = Symbol('SourceScatterPaint')

const ScatterBlock = Block.make(scatterRecipe.namespace, {
  key: SourceScatterPaintKey,
  ...scatterRecipe.contract,
})

const paintStyle = {
  '--server-ink': 'red',
  '--server-from': 'var(--server-ink)',
  '--color-emerald-500': 'var(--server-ink)',
  color: 'rgb(12, 34, 56)',
  colorInterpolation: 'linearRGB',
}

const props = {
  width: 640,
  height: 321,
  animationDuration: 1100,
  style: paintStyle,
  children: [
    PatternLines({ id: 'server-body', width: 4, height: 4, stroke: 'white' }),
    Candlestick({ bodyPatternPositive: 'url(#server-body)', insideStrokeWidth: 0.5 }),
    Grid({ vertical: true, fadeVertical: true, highlightRowValues: [10] }),
    YAxis({ formatValue: (value) => `<b>&"${value}</b>` }),
  ],
}

const scatterProps = {
  ...props,
  children: [
    Scatter({
      dataKey: 'close',
      outlineWidth: 1,
      yGradient: { from: 'var(--server-from)', to: 'currentColor' },
    }),
    YAxis(),
  ],
}

const data = [
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(0)),
    open: 10,
    high: 30,
    low: 0,
    close: 21,
  }),
]

export const SourceYAxisServerKey = Symbol('SourceYAxisServer')

const Document = Block.make('SourceYAxisServer', {
  key: SourceYAxisServerKey,
  Model: Schema.Struct({ chart: Chart.Model, scatter: ScatterBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Binding = Document.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['source-y-axis-server', data, recipe.configuration(props)] },
})

const ScatterBinding = Document.makeRequiredFieldBinding(ScatterBlock, {
  field: 'scatter',
  init: {
    contextToArgs: () => [
      'source-scatter-gradient-server',
      data,
      scatterRecipe.configuration(scatterProps),
    ],
  },
})

const Composition = Document.makeComposition({ bindings: [Binding, ScatterBinding] })

const serverLayer = (
  observe: (model: typeof ScatterBlock.Model.Type) => typeof ScatterBlock.Model.Type = (model) =>
    model,
) =>
  Document.makeLayer({
    init: Composition.makeInit(() => ({ model: {} })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((model, h) => ({
      title: 'Source Y axis server',
      body: h.main(
        [],
        [
          h.block(
            Binding.embedView({
              slotId: 'chart',
              model: model.chart,
              viewInputs: recipe.inputs('source-y-axis-server', props),
            }),
          ),
          h.block(
            ScatterBinding.embedView({
              slotId: 'scatter',
              model: observe(model.scatter),
              viewInputs: scatterRecipe.inputs('source-scatter-gradient-server', scatterProps),
            }),
          ),
        ],
      ),
    })),
  }).pipe(
    Layer.provide(
      Layer.mergeAll(
        Chart.makeLayer(recipe.plans(Chart)),
        ScatterBlock.makeLayer(scatterRecipe.plans(ScatterBlock)),
      ),
    ),
  )

const layer = serverLayer()

it.effect(
  'server-renders the real SVG axis with escaped formatter text and hidden Candle startup groups without browser globals',
  () =>
    Effect.gen(function* sourceYAxisServerContract() {
      expect(globalThis).not.toHaveProperty('HTMLElement')
      expect(globalThis).not.toHaveProperty('document')

      const { html } = yield* renderToString(
        { block: Document, layer },
        {},
        { isHydratable: false },
      )

      expect(html).not.toContain('bkm-y-axes')
      expect(html).toContain('dominant-baseline="middle"')
      expect(html).toContain('&lt;b&gt;&amp;"20&lt;/b&gt;')
      expect(html).not.toContain('<b>&"20</b>')
      expect(html).toContain('y-tick-label:')
      expect(html).toContain('opacity="0"')
      expect(html).toContain('<pattern')
      expect(html).toContain('server-body')
      expect(html).toContain('bkm-candle-enter')
      expect(html).not.toContain('inset:candle:')
      expect(html).not.toContain('NaN')
      const browser = new Window()
      browser.document.body.innerHTML = html
      const masks = [...browser.document.querySelectorAll('mask')]
      expect(masks).toHaveLength(2)

      for (const mask of masks) {
        expect(mask.getAttribute('maskUnits')).toBe('objectBoundingBox')
        expect(mask.getAttribute('maskContentUnits')).toBe('userSpaceOnUse')
        expect(['x', 'y', 'width', 'height'].every((name) => !mask.hasAttribute(name))).toBe(true)
        expect(mask.querySelector('rect')?.getAttribute('x')).toBe('40')
        expect(mask.querySelector('rect')?.getAttribute('height')).toBe('241')
        expect(html).toContain(`mask:url(#${mask.id})`)
      }

      expect(browser.document.querySelectorAll('.bkm-source-grid')).toHaveLength(2)
      expect(
        [...browser.document.querySelectorAll('.bkm-source-grid')].every(
          (group) => !group.hasAttribute('clip-path'),
        ),
      ).toBe(true)
      expect(
        browser.document
          .querySelector('[data-ts-key="grid-highlight-rows"]')
          ?.hasAttribute('clip-path'),
      ).toBe(false)
      expect(browser.document.querySelector('[data-bkm-kit]')).toBeNull()

      const styles = [...browser.document.querySelectorAll('style')]
        .map((style) => style.textContent)
        .join('')

      const bodyRule = styles.split('}').find((rule) => rule.includes('-body{'))
      const height = Number(/height:(?<height>[^p]+)px/u.exec(bodyRule ?? '')?.groups?.height)
      expect(height).toBeCloseTo(66.275, 12)
      expect(height).not.toBe(Math.round(height * 100) / 100)
      expect(browser.document.querySelector('rect[class$="-body"]')?.getAttribute('height')).toBe(
        '66.28',
      )
      const hosts = [...browser.document.querySelectorAll('[data-bkm-server-reserve]')]

      expect(hosts).toHaveLength(2)
      const candleSurface = hosts[0]?.querySelector('.ts-chart-surface')
      const scatterSurface = hosts[1]?.querySelector('.ts-chart-surface')

      if (
        candleSurface === null ||
        candleSurface === undefined ||
        scatterSurface === null ||
        scatterSurface === undefined
      ) {
        throw new Error('SSR requires both real drawing surfaces')
      }

      const candleAxes = hosts[0]?.querySelector('[data-ts-key$=":source-y-axes"]')

      if (candleAxes === undefined || candleAxes === null) {
        throw new Error('The real Candle axes must share the engine SVG')
      }

      expect(candleSurface.contains(candleAxes)).toBe(true)
      expect(candleAxes.namespaceURI).toBe('http://www.w3.org/2000/svg')
      expect(candleAxes.closest('[clip-path]')).toBeNull()
      expect(candleAxes.querySelector('b')).toBeNull()
      expect(
        [...candleAxes.querySelectorAll('text')].some(
          (label) => label.textContent === '<b>&"20</b>',
        ),
      ).toBe(true)

      for (const host of hosts) {
        if (!(host instanceof browser.HTMLElement)) {
          throw new Error('SSR paint context requires its real host element')
        }

        const root = host.closest('[data-bkm-family-root]')
        if (!(root instanceof browser.HTMLElement)) {
          throw new Error('SSR paint belongs to the checked family root')
        }
        expect(root.style.getPropertyValue('--server-from')).toBe('var(--server-ink)')
        expect(root.style.getPropertyValue('color-interpolation').toLowerCase()).toBe('linearrgb')
        expect(host.style.getPropertyValue('--server-from')).toBe('')
        expect(host.style.getPropertyValue('color-interpolation')).toBe('')
        expect(host.style.getPropertyValue('--bkm-server-width')).toBe('640px')
        expect(host.querySelector('svg.ts-chart')?.closest('[data-bkm-server-reserve]')).toBe(host)
      }

      expect(hosts[1]?.querySelector('[role="img"][tabindex="0"]')?.tagName).toBe('DIV')
      expect(hosts[1]?.querySelector('svg.bkm-scatter-island circle')).toBeNull()
      expect(hosts[1]?.querySelector('canvas')).toBeNull()
      const ready = yield* Story.withBlock(
        { block: ScatterBlock, layer: ScatterBlock.makeLayer(scatterRecipe.plans(ScatterBlock)) },
        (owner) =>
          renderToString(
            {
              block: Document,
              layer: serverLayer(
                (model) =>
                  owner.update(
                    model,
                    owner.Message.ObservedPhaseTiming({
                      generation: model.generation,
                      elapsed: null,
                      at: 1000,
                    }),
                  ).model,
              ),
            },
            {},
            { isHydratable: false },
          ),
      )
      const readyBrowser = new Window()
      readyBrowser.document.body.innerHTML = ready.html
      expect(readyBrowser.document.querySelectorAll('svg.bkm-scatter-island circle')).toHaveLength(
        3,
      )
      expect(readyBrowser.document.querySelector('canvas')).toBeNull()

      const gradients = [...browser.document.querySelectorAll('linearGradient[id^="bkm-scatter-"]')]
      expect(gradients).toHaveLength(3)

      for (const gradient of gradients) {
        expect(gradient.closest('[data-bkm-server-reserve]')).toBe(hosts[1])
        expect(Number(gradient.getAttribute('y1'))).toBeGreaterThan(1)
        expect(
          [...gradient.querySelectorAll('stop')].map((stop) => stop.getAttribute('stop-color')),
        ).toEqual(['var(--server-from)', 'currentColor'])
      }

      browser.close()
    }),
)
