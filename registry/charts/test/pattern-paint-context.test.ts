import { DateTime, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Window } from 'happy-dom'
import {
  Candlestick,
  CandlestickChart,
  ComposedChart,
  Line,
  PatternCircles,
  Scatter,
  ScatterChart,
} from '../src/index'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Finite,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
})

const scatter = ScatterChart({ name: 'paint-context-scatter', Row })

const candle = CandlestickChart({ name: 'paint-context-candle', Row })

const composed = ComposedChart({ name: 'paint-context-composed', Row })

const rows = [
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(0)),
    value: 2,
    open: 1,
    high: 3,
    low: 0,
    close: 2,
  }),
]

export const ScatterPaintContextKey = Symbol('ScatterPaintContext')

export const CandlePaintContextKey = Symbol('CandlePaintContext')

export const ComposedPaintContextKey = Symbol('ComposedPaintContext')

export const PaintContextParentKey = Symbol('PaintContextParent')

const ScatterBlock = Block.make(scatter.namespace, {
  key: ScatterPaintContextKey,
  ...scatter.contract,
})

const CandleBlock = Block.make(candle.namespace, {
  key: CandlePaintContextKey,
  ...candle.contract,
})

const ComposedBlock = Block.make(composed.namespace, {
  key: ComposedPaintContextKey,
  ...composed.contract,
})

const Parent = Block.make('PaintContextParent', {
  key: PaintContextParentKey,
  Model: Schema.Struct({
    scatter: ScatterBlock.Model,
    candle: CandleBlock.Model,
    composed: ComposedBlock.Model,
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const pattern = PatternCircles({ id: 'ink', width: 8, height: 8, fill: 'var(--custom-ink)' })

const common = {
  width: 320,
  height: 180,
  style: {
    '--custom-ink': '#d14e83',
    color: 'rebeccapurple',
    colorInterpolation: 'linearRGB',
    width: 999,
    height: 777,
    display: 'block',
  },
}

const scatterProps = { ...common, children: [pattern, Scatter({ dataKey: 'value' })] }

const candleProps = {
  ...common,
  children: [pattern, Candlestick({ bodyPatternPositive: 'url(#ink)' })],
}

const composedProps = { ...common, children: [pattern, Line({ dataKey: 'value' })] }

const ScatterChild = Parent.makeRequiredFieldBinding(ScatterBlock, {
  field: 'scatter',
  init: { contextToArgs: () => ['scatter-owner', rows, scatter.configuration(scatterProps)] },
})

const CandleChild = Parent.makeRequiredFieldBinding(CandleBlock, {
  field: 'candle',
  init: { contextToArgs: () => ['candle-owner', rows, candle.configuration(candleProps)] },
})

const ComposedChild = Parent.makeRequiredFieldBinding(ComposedBlock, {
  field: 'composed',
  init: { contextToArgs: () => ['composed-owner', rows, composed.configuration(composedProps)] },
})

const composition = Parent.makeComposition({ bindings: [ScatterChild, CandleChild, ComposedChild] })

const layer = Parent.makeLayer({
  init: composition.makeInit(() => ({ model: {} })),
  update: composition.makeUpdate({}),
  view: composition.makeView((model, h) => ({
    title: 'Pattern paint context',
    body: h.div(
      [],
      [
        h.block(
          ScatterChild.embedView({
            slotId: 'scatter',
            model: model.scatter,
            viewInputs: scatter.inputs('scatter-owner', scatterProps),
          }),
        ),
        h.block(
          CandleChild.embedView({
            slotId: 'candle',
            model: model.candle,
            viewInputs: candle.inputs('candle-owner', candleProps),
          }),
        ),
        h.block(
          ComposedChild.embedView({
            slotId: 'composed',
            model: model.composed,
            viewInputs: composed.inputs('composed-owner', composedProps),
          }),
        ),
      ],
    ),
  })),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      ScatterBlock.makeLayer(scatter.plans(ScatterBlock)),
      CandleBlock.makeLayer(candle.plans(CandleBlock)),
      ComposedBlock.makeLayer(composed.plans(ComposedBlock)),
    ),
  ),
)

it.effect(
  'keeps caller paint inheritance on Cartesian and Composed drawing hosts and sibling defs',
  () =>
    Effect.gen(function* paintInheritance() {
      const { html } = yield* renderToString({ block: Parent, layer }, {}, { isHydratable: false })
      const browser = new Window()

      browser.document.body.innerHTML = html

      for (const id of ['scatter-owner', 'candle-owner', 'composed-owner']) {
        const resource = browser.document.querySelector(`#${id}-resources`)

        if (!(resource instanceof browser.SVGSVGElement)) {
          throw new Error(`Missing SVG paint resource host: ${id}`)
        }

        const familyRoot = resource.closest('[data-bkm-family-root]')
        const paintOwner = familyRoot instanceof browser.HTMLElement ? familyRoot : resource
        expect(paintOwner.style.getPropertyValue('--custom-ink')).toBe('#d14e83')
        expect(paintOwner.style.color).toBe('rebeccapurple')
        expect(paintOwner.style.getPropertyValue('color-interpolation')).toBe('linearRGB')
        if (familyRoot !== null) expect(resource.style.getPropertyValue('--custom-ink')).toBe('')
        expect(resource.getAttribute('width')).toBe('0')
        expect(resource.getAttribute('height')).toBe('0')
        expect(resource.style.display).toBe('')

        const host = browser.document.querySelector(
          `[data-bkm-native-chart="${id}"] [data-bkm-server-reserve]`,
        )

        if (!(host instanceof browser.HTMLElement)) {
          throw new Error(`Missing server drawing host: ${id}`)
        }

        expect(host.querySelector('svg.ts-chart')).not.toBeNull()
        expect(host.style.getPropertyValue('--custom-ink')).toBe(
          familyRoot === null ? '#d14e83' : '',
        )
        expect(host.style.color).toBe(familyRoot === null ? 'rebeccapurple' : '')
        expect(host.style.getPropertyValue('color-interpolation')).toBe(
          familyRoot === null ? 'linearRGB' : '',
        )
        expect(host.style.getPropertyValue('--bkm-server-width')).toBe('320px')
        expect(host.style.getPropertyValue('--bkm-server-height')).toBe('180px')
      }
    }),
)
