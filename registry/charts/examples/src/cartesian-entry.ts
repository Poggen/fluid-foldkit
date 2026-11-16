import { Button } from '@foldkit/ui'
import { DateTime, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { buildTimeSeriesDefinition, Line, defineCartesianBlock } from '@foldkit-visuals/charts/line'
import type { CartesianViewInputs } from '@foldkit-visuals/charts/line'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const data = [10, 35, 20].map((value, index) =>
  Row.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2026, 0, index + 1))), value }),
)

const recipe = defineCartesianBlock({
  name: 'cartesian-foundation',
  Row,
})

export const CartesianFoundationKey = Symbol('Cartesian')

const ChartBlock = Block.make(recipe.namespace, { key: CartesianFoundationKey, ...recipe.contract })

const chartLayer = ChartBlock.makeLayer(recipe.plans<typeof CartesianFoundationKey>(ChartBlock))

const Model = Schema.Struct({ chart: ChartBlock.Model })

const Message = defineMessageUnion({
  ClickedShrink: {},
  ClickedEmpty: {},
  ClickedReset: {},
  ClickedFocusLast: {},
  ClickedClear: {},
})

export const CartesianFixtureKey = Symbol('CartesianFixture')

const effects = Block.makeEffectsContract()

const CartesianFixtureBlock = Block.make('CartesianFixture', {
  key: CartesianFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects,
})

const Binding = CartesianFixtureBlock.makeRequiredFieldBinding(ChartBlock, {
  field: 'chart',
  init: { contextToArgs: () => ['cartesian-fixture', data] },
})

const CartesianFixtureComposition = CartesianFixtureBlock.makeComposition({
  bindings: [Binding],
})

const definitionRevision = Symbol('CartesianFoundationDefinition')

const inputs: CartesianViewInputs<typeof Row.Type> = {
  ariaLabel: 'Typed Cartesian foundation',
  definitionRevision,
  width: 640,
  height: 320,
  sourceOf: (row) => row,
  definition: (rows) =>
    buildTimeSeriesDefinition(rows, {
      id: 'cartesian-fixture',
      x: (row) => row.date,
      children: [Line({ dataKey: 'value', fadeEdges: false })],
    }),
}

const layer = CartesianFixtureBlock.makeLayer({
  init: CartesianFixtureComposition.makeInit(() => ({ model: {} })),
  update: CartesianFixtureComposition.makeUpdate({
    ClickedShrink: Binding.requestData({ data: data.slice(0, 1) }),
    ClickedEmpty: Binding.requestData({ data: [] }),
    ClickedReset: Binding.requestData({ data }),
    ClickedFocusLast: Binding.requestFocus({ index: 2 }),
    ClickedClear: Binding.requestFocus({ index: null }),
  }),
  view: CartesianFixtureComposition.makeView((model, h) =>
    h.div(
      [],
      [
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedFocusLast(),
                toView: (attributes) => h.button([...attributes.button], ['Focus last']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedShrink(),
                toView: (attributes) => h.button([...attributes.button], ['Shrink data']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedEmpty(),
                toView: (attributes) => h.button([...attributes.button], ['Empty data']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedReset(),
                toView: (attributes) => h.button([...attributes.button], ['Reset data']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedClear(),
                toView: (attributes) => h.button([...attributes.button], ['Clear focus']),
              },
              h,
            ),
          ],
        ),
        h.div(
          [h.Id('fixture')],
          [
            h.block(
              Binding.embedView({ slotId: 'cartesian', model: model.chart, viewInputs: inputs }),
            ),
          ],
        ),
        h.output(
          [h.Id('status')],
          [
            `Rows ${model.chart.data.length}; focused ${Option.match(model.chart.focusedIndex, { onNone: () => 'none', onSome: String })}`,
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(chartLayer))

Runtime.run(
  Program.makeElement({
    block: CartesianFixtureBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
