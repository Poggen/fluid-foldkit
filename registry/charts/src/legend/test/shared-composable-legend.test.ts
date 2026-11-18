import { Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { renderToString } from 'foldkit/experimental/server'
import { it as effectIt } from '@effect/vitest'
import { expect } from 'vitest'
import { Window } from 'happy-dom'
import { Legend, useLegend, useLegendItem } from '../index'

const Item = Schema.Struct({
  label: Schema.String,
  value: Schema.Finite,
  maxValue: Schema.Finite,
  color: Schema.String,
  description: Schema.String,
})

const items = [
  Item.make({
    label: 'Revenue',
    value: 20,
    maxValue: 100,
    color: 'red',
    description: 'complete caller row',
  }),
]

const legend = Legend({ Item })

export const ComposableLegendKey = Symbol('Legend')

const LegendBlock = Block.make(legend.namespace, { key: ComposableLegendKey, ...legend.contract })

const legendLayer = LegendBlock.makeLayer(legend.plans<typeof ComposableLegendKey>(LegendBlock))

const Model = Schema.Struct({ legend: LegendBlock.Model, hoveredIndex: Schema.NullOr(Schema.Int) })

const Message = defineMessageUnion({ RequestedChildHover: { index: Schema.NullOr(Schema.Int) } })

export const ComposableLegendContractKey = Symbol('ComposableLegendContract')

const ComposableLegendContractBlock = Block.make('ComposableLegendContract', {
  key: ComposableLegendContractKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Binding = ComposableLegendContractBlock.makeRequiredFieldBinding(LegendBlock, {
  field: 'legend',
  init: { contextToArgs: () => ['composable-owner', items] },
}).withOutMessagePolicy({
  fold: ComposableLegendContractBlock.makeOutMessageFold(LegendBlock, {
    HoverRequested: ({ index }) =>
      ComposableLegendContractBlock.makeFieldsStep(() => ({ hoveredIndex: () => index })),
    LayoutMeasured: () => ComposableLegendContractBlock.makeNoopStep(),
  }),
})

const Composition = ComposableLegendContractBlock.makeComposition({ bindings: [Binding] })

const layer = ComposableLegendContractBlock.makeLayer({
  init: Composition.makeInit(() => ({ model: { hoveredIndex: 0 } })),
  update: Composition.makeUpdate({
    RequestedChildHover: (model, { index }) => Binding.requestHover({ index })(model),
  }),
  view: Composition.makeView((model, h) => ({
    title: 'Composable legend',
    body: h.div(
      [],
      [
        h.block(
          Binding.embedView({
            slotId: 'legend',
            model: model.legend,
            viewInputs: legend.inputs(model.hoveredIndex, {
              title: 'Custom legend',
              children: (wholeContext, renderItem, rootHtml) => {
                const whole = useLegend(wholeContext)

                return [
                  ...whole.items.map((_item, index) =>
                    renderItem(index, {
                      children: (itemContext, parts, legendContext, html) => {
                        const context = useLegend(legendContext)
                        const item = useLegendItem(itemContext)

                        return [
                          parts.marker(),
                          parts.label(),
                          parts.value({
                            showPercentage: true,
                            formatValue: (value) => `$${value}`,
                            formatPercentage: (value) => `${value.toFixed(1)}%`,
                          }),
                          parts.progress(),
                          html.button(
                            [
                              html.OnClick(context.setHoveredIndex(item.index)),
                              html.DataAttribute('metadata', item.item.description),
                            ],
                            ['Choose'],
                          ),
                        ]
                      },
                    }),
                  ),
                  rootHtml.button(
                    [
                      rootHtml.OnClick(whole.setHoveredIndex(null)),
                      rootHtml.DataAttribute('legend-footer', ''),
                    ],
                    ['Clear'],
                  ),
                ]
              },
            }),
          }),
        ),
      ],
    ),
  })),
}).pipe(Layer.provide(legendLayer))

const Parent = { block: ComposableLegendContractBlock, layer }

effectIt.effect(
  'routes composable child intent to the one parent hover field without changing complete item rows',
  () =>
    Story.story(
      Parent,
      Story.init(),
      Story.models(
        Story.steps(Story.message(Parent.block.Message.RequestedChildHover({ index: null }))),
        (initial, cleared) => {
          expect(cleared.hoveredIndex).toBeNull()
          expect(cleared.legend).toBe(initial.legend)
          expect(cleared.legend.items).toBe(items)
        },
      ),
    ),
)

effectIt.effect(
  'server-renders custom parts and full caller metadata through actual explicit legend contexts',
  () =>
    Effect.gen(function* composableLegendContract() {
      const { html } = yield* renderToString(Parent, {}, { isHydratable: false })
      expect(html).toContain('Custom legend')
      expect(html).toContain('Revenue')
      expect(html).toContain('$20')
      expect(html).toContain('20.0%')
      const document = new Window().document
      document.body.innerHTML = html
      const progress = document.querySelector('[role="progressbar"]')
      expect(progress?.getAttribute('aria-label')).toBe('Revenue')
      expect(html).toContain('aria-valuenow="20"')
      expect(html).toContain('data-metadata="complete caller row"')
      expect(html).toContain('data-hovered-any=""')
      expect(html).toContain('data-legend-footer=""')
      expect(html.indexOf('data-legend-footer')).toBeGreaterThan(html.indexOf('data-metadata'))
    }),
)
