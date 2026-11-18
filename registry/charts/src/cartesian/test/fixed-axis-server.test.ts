import { DateTime, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Window } from 'happy-dom'
import {
  AreaChart,
  LineChart,
  ComposedChart,
  BarChart,
  Area,
  Line,
  SeriesBar,
  Bar,
  YAxis,
  BarXAxis,
} from '../../index'
import { initialInteraction } from '../state'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  name: Schema.String,
  value: Schema.Finite,
})
const rows = [20, 40].map((value, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)),
    name: String(index),
    value,
  }),
)
const dimensions = { width: 500, height: 300, animationDuration: 0 }
const axes = [YAxis({ domain: [0, 100], formatValue: (value) => `<b>${value}%</b>` })]
const line = LineChart({ name: 'fixed-server-line', Row }).inputs('fixed-server-line', {
  ...dimensions,
  children: [Line({ dataKey: 'value' }), ...axes],
})
const area = AreaChart({ name: 'fixed-server-area', Row }).inputs('fixed-server-area', {
  ...dimensions,
  children: [Area({ dataKey: 'value' }), ...axes],
})
const composed = ComposedChart({ name: 'fixed-server-composed', Row }).inputs(
  'fixed-server-composed',
  { ...dimensions, yDomain: [0, 100], children: [SeriesBar({ dataKey: 'value' }), ...axes] },
)
const bar = BarChart({ name: 'fixed-server-bar', Row }).inputs('fixed-server-bar', {
  ...dimensions,
  yDomain: [0, 100],
  children: [Bar({ dataKey: 'value' }), ...axes],
})
const horizontal = BarChart({ name: 'fixed-server-horizontal', Row }).inputs(
  'fixed-server-horizontal',
  {
    ...dimensions,
    orientation: 'horizontal',
    yDomain: [0, 100],
    children: [
      Bar({ dataKey: 'value' }),
      BarXAxis({ type: 'number', formatValue: (value) => `<b>${value}%</b>` }),
    ],
  },
)

export const FixedAxisServerKey = Symbol('FixedAxisServer')
const Document = Block.make('FixedAxisServer', {
  key: FixedAxisServerKey,
  Model: Schema.Struct({}),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
const Composition = Document.makeComposition({})
const state = { ...initialInteraction(), revealReady: true, phaseClockReady: true }
const layer = Document.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((_model, h) => ({
    title: 'Fixed axis server contract',
    body: h.main(
      [],
      [
        h.section([h.Id('line')], [line.serverContent?.(rows, state) ?? h.empty]),
        h.section([h.Id('area')], [area.serverContent?.(rows, state) ?? h.empty]),
        h.section([h.Id('composed')], [composed.serverContent?.(rows, state) ?? h.empty]),
        h.section([h.Id('bar')], [bar.serverContent?.(rows, state) ?? h.empty]),
        h.section([h.Id('horizontal')], [horizontal.serverContent?.(rows, state) ?? h.empty]),
      ],
    ),
  })),
})

it.effect('SSR paints exact fixed-scale geometry and escapes numeric formatter text', () =>
  Effect.gen(function* () {
    expect(globalThis).not.toHaveProperty('document')
    const { html } = yield* renderToString({ block: Document, layer }, {}, { isHydratable: false })
    const browser = new Window()
    try {
      browser.document.body.innerHTML = html
      for (const family of ['line', 'area', 'composed', 'bar']) {
        const section = browser.document.querySelector(`#${family}`)
        expect(
          [...(section?.querySelectorAll('text') ?? [])].map((node) => node.textContent),
        ).toContain('<b>100%</b>')
        expect(section?.querySelector('b')).toBeNull()
        if (family === 'bar' || family === 'composed') {
          const rectangles = [...(section?.querySelectorAll('rect') ?? [])]
          expect(
            rectangles.some(
              (node) => node.getAttribute('y') === '216' && node.getAttribute('height') === '44',
            ),
          ).toBe(true)
        } else {
          expect(
            [...(section?.querySelectorAll('path') ?? [])].some((node) =>
              node.getAttribute('d')?.includes('216'),
            ),
          ).toBe(true)
        }
      }
      const horizontal = browser.document.querySelector('#horizontal')
      expect(horizontal?.querySelector('[data-bkm-bar-category-x-axis]')).toBeNull()
      expect(
        [...(horizontal?.querySelectorAll('text') ?? [])].map((node) => node.textContent),
      ).toContain('<b>100%</b>')
      expect(horizontal?.querySelector('b')).toBeNull()
    } finally {
      browser.close()
    }
  }),
)
