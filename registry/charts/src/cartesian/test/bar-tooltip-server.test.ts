import { it as effectIt } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { Window } from 'happy-dom'
import { Bar, BarSquares, ChartTooltip } from '../../index'
import { data, root, Chart, subject } from './bar.fixture'

export const BarTooltipParentKey = Symbol('BarTooltipParent')

const TooltipParent = Block.make('BarTooltipParent', {
  key: BarTooltipParentKey,
  Model: Schema.Struct({ chart: Chart.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const TooltipBinding = TooltipParent.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['bar-contract', data, root.configuration({ children: [] })] },
})

const TooltipComposition = TooltipParent.makeComposition({ bindings: [TooltipBinding] })

const tooltipPaintCases = [
  { name: 'paint reference', fill: 'url(#paint)', stroke: '#ff5500', color: '#ff5500' },
  { name: 'solid fill override', fill: 'blue', stroke: '#ff5500', color: '#ff5500' },
  { name: 'fill fallback', fill: 'blue', color: 'blue' },
  { name: 'empty stroke fallback', fill: 'blue', stroke: '', color: 'blue' },
  { name: 'empty paint fallback', fill: '', stroke: '', color: 'var(--chart-line-primary)' },
]

for (const paint of tooltipPaintCases) {
  const { name, color, ...seriesPaint } = paint

  effectIt.effect(`Bar and BarSquares tooltip rows preserve Source ${name}`, () =>
    Effect.gen(function* barTooltipRows() {
      const inputs = root.inputs('bar-contract', {
        children: [
          Bar({ dataKey: 'a', ...seriesPaint }),
          BarSquares({ dataKey: 'b', ...seriesPaint }),
          ChartTooltip(),
        ],
      })

      const focused = yield* Story.story(
        subject,
        Story.init('bar-contract', data, root.configuration({ children: [] })),
        Story.messageWith((model: typeof Chart.Model.Type) =>
          Chart.Message.CompletedReveal({ generation: model.generation }),
        ),
        Story.inMessage(Chart.InMessage.RequestedFocus({ index: 1, seriesIndex: null })),
      )

      const layer = TooltipParent.makeLayer({
        init: TooltipComposition.makeInit(() => ({ model: {} })),
        update: TooltipComposition.makeUpdate({}),
        view: TooltipComposition.makeView((_model, h) => ({
          title: 'Bar tooltip colors',
          body: h.div(
            [],
            [
              h.block(
                TooltipBinding.embedView({
                  slotId: 'chart',
                  model: focused,
                  viewInputs: inputs,
                }),
              ),
            ],
          ),
        })),
      }).pipe(Layer.provide(subject.layer))

      const { html } = yield* renderToString(
        { block: TooltipParent, layer },
        {},
        { isHydratable: false },
      )
      const browser = new Window()
      browser.document.body.innerHTML = html
      const panel = browser.document.getElementById('bar-contract-tooltip')
      const swatches = [...(panel?.querySelectorAll('span') ?? [])]
        .map((span) => span.style.getPropertyValue('--bkm-tooltip-row-color'))
        .filter((background) => background !== '')

      expect(panel?.textContent).toContain('B')
      expect(panel?.textContent).toContain('-10')
      expect(swatches).toEqual([color, color])
    }),
  )
}
