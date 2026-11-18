// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import { constUndefined } from 'effect/Function'
import { Block } from 'foldkit'
import { Server } from 'foldkit/experimental'
import { SunburstChart, SunburstSegment } from '@foldkit-visuals/charts/sunburst'
import type { SunburstChartProps } from '@foldkit-visuals/charts/sunburst'

const Mode = Schema.Literals(['none', 'partial', 'all', 'duplicate', 'invalid'])
type Mode = typeof Mode.Type
const recipe = SunburstChart({ name: 'default-segment-contract' })
export const SunburstDefaultSegmentsKey = Symbol('SunburstDefaultSegments')
const Chart = Block.make(recipe.namespace, { ...recipe.contract, key: SunburstDefaultSegmentsKey })
const chartLayer = Chart.makeLayer(recipe.plans(Chart))

const data: SunburstChartProps['data'] = {
  name: 'Root',
  children: [
    { name: 'Alpha', value: 2, fill: '#112233' },
    { name: 'Beta', value: 1, fill: '#445566' },
  ],
}
const children: Readonly<Record<Mode, SunburstChartProps['children']>> = {
  none: [],
  partial: [SunburstSegment({ index: 0, fill: '#778899' })],
  all: [
    SunburstSegment({ index: 0, fill: '#778899' }),
    SunburstSegment({ index: 1, fill: '#aabbcc' }),
  ],
  duplicate: [
    SunburstSegment({ index: 0, fill: '#aabbcc' }),
    SunburstSegment({ index: 0, fill: '#778899' }),
  ],
  invalid: [SunburstSegment({ index: 99, fill: '#aabbcc' })],
}
const Model = Schema.Struct({ mode: Mode, chart: Chart.Model })
type Model = typeof Model.Type
const DocumentKey = Symbol('SunburstDefaultSegmentsDocument')
const Document = Block.make('SunburstDefaultSegmentsDocument', {
  key: DocumentKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([Mode]),
  view: { kind: 'Document' },
})
const ChartBinding = Document.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['default-segments'] },
}).withOutMessagePolicy({
  fold: Document.makeOutMessageFold(Chart, {
    FocusChanged: Document.makeNoopStep,
    HoverChanged: Document.makeNoopStep,
  }),
})
const Composition = Document.makeComposition({ bindings: [ChartBinding] })
const layer = Document.makeLayer({
  init: Composition.makeInit((mode: Mode) => ({ model: { mode } })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Sunburst default segments',
    body: h.block(
      ChartBinding.embedView({
        slotId: 'chart',
        model: model.chart,
        viewInputs: recipe.inputs(
          'default-segments',
          { data, size: 320, children: children[model.mode] },
          { focus: constUndefined, hover: constUndefined },
        ),
      }),
    ),
  })),
}).pipe(Layer.provide(chartLayer))

const render = (mode: Mode) =>
  Server.renderToString(
    { block: Document, layer },
    { Flags: Mode },
    { flags: mode, isHydratable: false },
  )

it.effect('Sunburst renders every data arc; Segment carriers only override matching fills', () =>
  Effect.gen(function* () {
    const baseline = yield* render('all')
    const baselineContainer = document.createElement('div')
    baselineContainer.innerHTML = baseline.html
    const baseAlpha = baselineContainer.querySelector('path.bk-sb-a0')?.getAttribute('d')
    const baseBeta = baselineContainer.querySelector('path.bk-sb-a1')?.getAttribute('d')
    expect(baseAlpha).toBeTruthy()
    expect(baseBeta).toBeTruthy()
    expect(baseAlpha).not.toBe(baseBeta)

    for (const mode of Mode.literals) {
      const rendered = yield* render(mode)
      const container = document.createElement('div')
      container.innerHTML = rendered.html
      const alpha = container.querySelector<SVGPathElement>('path.bk-sb-a0')
      const beta = container.querySelector<SVGPathElement>('path.bk-sb-a1')
      expect(container.querySelectorAll('path.bk-sb-a0'), mode).toHaveLength(1)
      expect(container.querySelectorAll('path.bk-sb-a1'), mode).toHaveLength(1)
      expect(alpha?.getAttribute('d'), mode).toBe(baseAlpha)
      expect(beta?.getAttribute('d'), mode).toBe(baseBeta)
      expect(alpha?.getAttribute('fill') ?? alpha?.style.fill, mode).toBe(
        mode === 'partial' || mode === 'all' || mode === 'duplicate' ? '#778899' : '#112233',
      )
      expect(beta?.getAttribute('fill') ?? beta?.style.fill, mode).toBe(
        mode === 'all' ? '#aabbcc' : '#445566',
      )
      expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe(
        'Sunburst chart of Root',
      )
    }
  }),
)
