import { Button } from '@foldkit/ui'
import { DateTime, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { buildTimeSeriesDefinition, Line, defineCartesianBlock } from '@foldkit-visuals/charts/line'
import type { CartesianViewInputs } from '@foldkit-visuals/charts/line'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const LeftRow = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const RightRow = Schema.Struct({
  date: Schema.DateFromString,
  amount: Schema.Finite,
  label: Schema.String,
})

const day = (index: number) => DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2026, 0, index + 1)))

const leftData = [10, 35, 20].map((value, index) => LeftRow.make({ date: day(index), value }))

const rightData = [5, 15].map((amount, index) =>
  RightRow.make({ date: day(index), amount, label: `Right ${index}` }),
)

const duplicate = new URLSearchParams(location.search).has('repeat-name')

const leftRecipe = defineCartesianBlock({ name: 'isolated-left', Row: LeftRow })

const rightRecipe = defineCartesianBlock({
  name: duplicate ? 'isolated-left' : 'isolated-right',
  Row: RightRow,
})

export const LeftCartesianKey = Symbol('Cartesian')

export const RightCartesianKey = Symbol('Cartesian')

const LeftBlock = Block.make(leftRecipe.namespace, {
  key: LeftCartesianKey,
  ...leftRecipe.contract,
})

const RightBlock = Block.make(rightRecipe.namespace, {
  key: RightCartesianKey,
  ...rightRecipe.contract,
})

const childLayers = Layer.mergeAll(
  LeftBlock.makeLayer(leftRecipe.plans<typeof LeftCartesianKey>(LeftBlock)),
  RightBlock.makeLayer(rightRecipe.plans<typeof RightCartesianKey>(RightBlock)),
)

const Model = Schema.Struct({ left: LeftBlock.Model, right: RightBlock.Model })

const Message = defineMessageUnion({
  ClickedFocusLeft: {},
  ClickedFocusRight: {},
  ClickedEmptyLeft: {},
  ClickedResetLeft: {},
})

export const FactoryIsolationKey = Symbol('FactoryIsolation')

const effects = Block.makeEffectsContract()

const FactoryIsolationBlock = Block.make('FactoryIsolation', {
  key: FactoryIsolationKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects,
})

const LeftBinding = FactoryIsolationBlock.makeRequiredFieldBinding(LeftBlock, {
  field: 'left',
  init: { contextToArgs: () => ['left-chart', leftData] },
})

const RightBinding = FactoryIsolationBlock.makeRequiredFieldBinding(RightBlock, {
  field: 'right',
  init: { contextToArgs: () => ['right-chart', rightData] },
})

const FactoryIsolationComposition = FactoryIsolationBlock.makeComposition({
  bindings: [LeftBinding, RightBinding],
})

const leftDefinitionRevision = Symbol('LeftDefinition')

const rightDefinitionRevision = Symbol('RightDefinition')

const leftInputs: CartesianViewInputs<typeof LeftRow.Type> = {
  ariaLabel: 'Left value rows',
  definitionRevision: leftDefinitionRevision,
  width: 640,
  height: 240,
  sourceOf: (row) => row,
  definition: (rows) =>
    buildTimeSeriesDefinition(rows, {
      id: 'left-chart',
      x: (row) => row.date,
      children: [Line({ dataKey: 'value', fadeEdges: false })],
    }),
}

const rightInputs: CartesianViewInputs<typeof RightRow.Type> = {
  ariaLabel: 'Right amount rows',
  definitionRevision: rightDefinitionRevision,
  width: 640,
  height: 240,
  sourceOf: (row) => row,
  definition: (rows) =>
    buildTimeSeriesDefinition(rows, {
      id: 'right-chart',
      x: (row) => row.date,
      children: [Line({ dataKey: 'amount', fadeEdges: false })],
    }),
}

const focus = (index: Option.Option<number>) =>
  Option.match(index, { onNone: () => 'none', onSome: String })

const layer = FactoryIsolationBlock.makeLayer({
  init: FactoryIsolationComposition.makeInit(() => ({ model: {} })),
  update: FactoryIsolationComposition.makeUpdate({
    ClickedFocusLeft: LeftBinding.requestFocus({ index: 2 }),
    ClickedFocusRight: RightBinding.requestFocus({ index: 0 }),
    ClickedEmptyLeft: LeftBinding.requestData({ data: [] }),
    ClickedResetLeft: LeftBinding.requestData({ data: leftData }),
  }),
  view: FactoryIsolationComposition.makeView((model, h) =>
    h.div(
      [],
      [
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedFocusLeft(),
                toView: (attributes) => h.button([...attributes.button], ['Focus left last']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedFocusRight(),
                toView: (attributes) => h.button([...attributes.button], ['Focus right first']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedEmptyLeft(),
                toView: (attributes) => h.button([...attributes.button], ['Empty left']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedResetLeft(),
                toView: (attributes) => h.button([...attributes.button], ['Reset left']),
              },
              h,
            ),
          ],
        ),
        h.div(
          [h.Id('fixture')],
          [
            h.block(
              LeftBinding.embedView({
                slotId: 'left',
                model: model.left,
                viewInputs: leftInputs,
              }),
            ),
            h.block(
              RightBinding.embedView({
                slotId: 'right',
                model: model.right,
                viewInputs: rightInputs,
              }),
            ),
          ],
        ),
        h.output(
          [h.Id('status')],
          [
            `Rows ${model.left.data.length}/${model.right.data.length}; focus ${focus(model.left.focusedIndex)}/${focus(model.right.focusedIndex)}`,
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(childLayers))

Runtime.run(
  Program.makeElement({
    block: FactoryIsolationBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
