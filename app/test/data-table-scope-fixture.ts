import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  DataTableBlock,
  type DataTableConfig,
  layer as TableLayer,
} from '../../registry/fluid/src/data-table'
import { DefaultCalendarEnvironment } from '../../registry/fluid/src/calendar-environment'
import { PopupAuthorityLayer } from '../../registry/fluid/src/date-picker-popup-authority'
import { inputFileResourcesLayer } from '../../registry/fluid/src/input'
import { SwitchBlock, SwitchLayer } from '../../registry/fluid/src/switch'
import { createSelectLayer } from '../../registry/fluid/src/select'

const container = document.querySelector<HTMLElement>('#style-contract-root')
if (!container) throw new Error('Missing signal directory host')
const rows = container.hasAttribute('data-no-descriptors')
  ? []
  : [
      {
        id: 'temperature',
        values: {
          signal: 'Battery temperature',
          field: 'temperature',
          type: 'float',
          number: 1,
          repeated: 'No',
        },
      },
    ]
const key = Symbol('SignalDirectory')
const Message = defineMessageUnion({ OpenedSignal: {}, ReturnedToDirectory: {}, ClearedScope: {} })
const Directory = Block.make('SignalDirectory', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    table: DataTableBlock.Model,
    onlyActive: SwitchBlock.Model,
    detail: Schema.Boolean,
    scoped: Schema.Boolean,
  }),
  Message,
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof DataTableBlock>['programRequirements']
  >(),
  view: { kind: 'Element' },
})
const Table = Directory.makeRequiredFieldBinding(DataTableBlock, {
  field: 'table',
  init: {
    contextToArgs: (): [DataTableConfig] => [
      {
        id: 'signals',
        columns: [
          { id: 'signal', header: 'Message', width: 220 },
          { id: 'field', header: 'Field', width: 180 },
          { id: 'type', header: 'Type', width: 130 },
          { id: 'number', header: 'Number', width: 100 },
          { id: 'repeated', header: 'Repeated', width: 100 },
        ],
        initialFilters: [{ id: 'signal', value: { kind: 'text', query: '' } }],
        rows,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Directory.makeOutMessageFold(DataTableBlock, {
    RowsChanged: Directory.makeNoopStep,
    CellEdited: Directory.makeNoopStep,
    SelectionChanged: Directory.makeNoopStep,
    RowMoved: Directory.makeNoopStep,
    RowsMoved: Directory.makeNoopStep,
    ViewChanged: Directory.makeNoopStep,
    ActionSelected: Directory.makeNoopStep,
  }),
})
const Active = Directory.makeRequiredFieldBinding(SwitchBlock, {
  field: 'onlyActive',
  init: { contextToArgs: () => [{ id: 'active-signals', checked: false }] },
})
const OnlyActive = Active.withOutMessagePolicy({
  fold: Directory.makeOutMessageFold(SwitchBlock, {
    Toggled: () =>
      Directory.makeStep((model) =>
        Active.requestConfigure({ checked: !model.onlyActive.checked, disabled: false }),
      ),
  }),
})
const Composition = Directory.makeComposition({ bindings: [Table, OnlyActive] })
const layer = Directory.makeLayer({
  init: Composition.makeInit(() => ({ model: { detail: false, scoped: true } })),
  update: Composition.makeUpdate({
    OpenedSignal: Directory.makeFieldsStep(() => ({ detail: () => true })),
    ReturnedToDirectory: Directory.makeFieldsStep(() => ({ detail: () => false })),
    ClearedScope: Directory.makeFieldsStep(() => ({ scoped: () => false })),
  }),
  view: Composition.makeView((model, h) =>
    model.detail
      ? h.button([h.OnClick(Message.ReturnedToDirectory())], ['Back to signals'])
      : h.div(
          [],
          [
            h.block(
              Table.embedView({
                slotId: model.table.id,
                model: model.table,
                viewInputs: {
                  title: model.scoped ? 'Vehicle signals' : 'All signals',
                  showToolbar: false,
                  showPagination: false,
                  emptyTitle: 'No descriptor fields',
                  emptyDescription: 'No fields are present for this message.',
                  renderCell: ({ column, value }) =>
                    column.id === 'signal'
                      ? h.button([h.OnClick(Message.OpenedSignal())], [String(value)])
                      : undefined,
                  renderScope: () =>
                    model.scoped
                      ? h.div(
                          [],
                          [
                            h.block(
                              OnlyActive.embedView({
                                slotId: 'active',
                                model: model.onlyActive,
                                viewInputs: {
                                  label: 'Active signals only',
                                  animate: (node) => node,
                                },
                              }),
                            ),
                            h.button([h.OnClick(Message.ClearedScope())], ['Clear vehicle scope']),
                          ],
                        )
                      : h.empty,
                },
              }),
            ),
          ],
        ),
  ),
}).pipe(Layer.provide(Layer.merge(TableLayer, SwitchLayer)))
Runtime.embed(
  Program.makeElement({ block: Directory, layer, container, devTools: false }).provide(
    Layer.mergeAll(
      createSelectLayer(document),
      inputFileResourcesLayer,
      PopupAuthorityLayer,
      DefaultCalendarEnvironment,
    ),
  ),
)
