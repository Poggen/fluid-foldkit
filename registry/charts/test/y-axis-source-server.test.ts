import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Window } from 'happy-dom'
import {
  bar,
  barProps,
  candle,
  candleProps,
  scatter,
  scatterProps,
  rows,
  twentyTicks,
} from './y-axis-source-fixture'

export const SourceAxisBarKey = Symbol('SourceAxisBar')
const BarBlock = Block.make(bar.namespace, { key: SourceAxisBarKey, ...bar.contract })
export const SourceAxisCandleKey = Symbol('SourceAxisCandle')
const CandleBlock = Block.make(candle.namespace, { key: SourceAxisCandleKey, ...candle.contract })
export const SourceAxisScatterKey = Symbol('SourceAxisScatter')
const ScatterBlock = Block.make(scatter.namespace, {
  key: SourceAxisScatterKey,
  ...scatter.contract,
})

export const SourceAxisDocumentKey = Symbol('SourceAxisDocument')
const Document = Block.make('SourceAxisDocument', {
  key: SourceAxisDocumentKey,
  Model: Schema.Struct({
    bar: BarBlock.Model,
    candle: CandleBlock.Model,
    scatter: ScatterBlock.Model,
    negative: CandleBlock.Model,
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const BarBinding = Document.makeRequiredFieldBinding(BarBlock, {
  field: 'bar',
  init: { contextToArgs: () => ['axis-bar', rows, bar.configuration(barProps())] },
})
const CandleBinding = Document.makeRequiredFieldBinding(CandleBlock, {
  field: 'candle',
  init: { contextToArgs: () => ['axis-candle', rows, candle.configuration(candleProps())] },
})
const ScatterBinding = Document.makeRequiredFieldBinding(ScatterBlock, {
  field: 'scatter',
  init: { contextToArgs: () => ['axis-scatter', rows, scatter.configuration(scatterProps())] },
})
const NegativeBinding = Document.makeRequiredFieldBinding(CandleBlock, {
  field: 'negative',
  init: {
    contextToArgs: () => [
      'axis-negative',
      rows.map((row) => ({ ...row, low: -2000, high: 2000 })),
      candle.configuration(candleProps({})),
    ],
  },
})
const Composition = Document.makeComposition({
  bindings: [BarBinding, CandleBinding, ScatterBinding, NegativeBinding],
})
const layer = Document.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Source axis contracts',
    body: h.main(
      [],
      [
        h.section(
          [h.Id('bar')],
          [
            h.block(
              BarBinding.embedView({
                slotId: 'bar',
                model: model.bar,
                viewInputs: bar.inputs('axis-bar', barProps()),
              }),
            ),
          ],
        ),
        h.section(
          [h.Id('candle')],
          [
            h.block(
              CandleBinding.embedView({
                slotId: 'candle',
                model: model.candle,
                viewInputs: candle.inputs('axis-candle', candleProps()),
              }),
            ),
          ],
        ),
        h.section(
          [h.Id('scatter')],
          [
            h.block(
              ScatterBinding.embedView({
                slotId: 'scatter',
                model: model.scatter,
                viewInputs: scatter.inputs('axis-scatter', scatterProps()),
              }),
            ),
          ],
        ),
        h.section(
          [h.Id('negative')],
          [
            h.block(
              NegativeBinding.embedView({
                slotId: 'negative',
                model: model.negative,
                viewInputs: candle.inputs('axis-negative', candleProps({})),
              }),
            ),
          ],
        ),
      ],
    ),
  })),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      BarBlock.makeLayer(bar.plans(BarBlock)),
      CandleBlock.makeLayer(candle.plans(CandleBlock)),
      ScatterBlock.makeLayer(scatter.plans(ScatterBlock)),
    ),
  ),
)

it.effect(
  'public SSR renders migration tick counts, numeric secondary placement and negative labels',
  () =>
    Effect.gen(function* () {
      expect(globalThis).not.toHaveProperty('document')
      const { html } = yield* renderToString(
        { block: Document, layer },
        {},
        { isHydratable: false },
      )
      const browser = new Window()
      try {
        browser.document.body.innerHTML = html
        for (const family of ['bar', 'candle', 'scatter']) {
          const host = browser.document.querySelector(`#${family}`)
          const group = host?.querySelector('[data-ts-key$=":source-y-axes"]')
          const labels = [...(group?.querySelectorAll('text') ?? [])]
          expect(labels).toHaveLength(twentyTicks.length * (family === 'scatter' ? 2 : 1))
          expect(group?.namespaceURI).toBe('http://www.w3.org/2000/svg')
          expect(group?.parentElement?.tagName.toLowerCase()).toBe('svg')
          expect(host?.querySelector('.bkm-y-axes')).toBeNull()
          for (const [index, label] of labels.entries()) {
            const right = family === 'scatter' && index < twentyTicks.length
            expect(label.textContent).toBe(twentyTicks[index % twentyTicks.length])
            expect(label.namespaceURI).toBe('http://www.w3.org/2000/svg')
            expect(label.getAttribute('x')).toBe(right ? '374' : '46')
            expect(label.getAttribute('y')).toBe(String(200 - (index % twentyTicks.length) * 9))
            expect(label.getAttribute('text-anchor')).toBe(right ? 'start' : 'end')
            expect(label.getAttribute('dominant-baseline')).toBe('middle')
            expect(label.getAttribute('font-size')).toBe('12')
            expect(label.getAttribute('font-family')).toBe('inherit')
          }
        }
        expect(
          [
            ...browser.document.querySelectorAll('#negative [data-ts-key$=":source-y-axes"] text'),
          ].map((node) => node.textContent),
        ).toEqual(['-2k', '-1k', '0', '1k', '2k'])
      } finally {
        browser.close()
      }
    }),
)
