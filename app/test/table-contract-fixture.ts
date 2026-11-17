import { Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { TableBlock, layer as TableLayer } from '@foldkit-visuals/fluid/table'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@foldkit-visuals/fluid/table-parts'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'

const Model = Schema.Struct({
  table: TableBlock.Model,
  expanded: Schema.Boolean,
  count: Schema.Natural,
  revision: Schema.Natural,
  selected: Schema.Array(Schema.Finite),
})
const Message = defineMessageUnion({ Snapped: {}, Added: {}, Selected: {} })
const effects = Block.makeEffectsContract()
const TableContractKey = Symbol('TableContract')
const TableContractBlock = Block.make('TableContract', {
  key: TableContractKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  effects,
  view: { kind: 'Document' },
})
const Table = TableContractBlock.makeRequiredFieldBinding(TableBlock, {
  field: 'table',
  init: { contextToArgs: () => [{ id: 'contract-table', selectedIndices: [1, 2] }] },
})
const TableContractComposition = TableContractBlock.makeComposition({ bindings: [Table] })
const init = TableContractComposition.makeInit(() => ({
  model: { expanded: false, count: 8, revision: 0, selected: [1, 2] },
}))
const configure = TableContractBlock.makeStep((model) =>
  Table.requestConfigure({
    selectedIndices: model.selected,
    heldHeadIndex: null,
    hideHeadHighlight: false,
    snapKey: model.revision,
  }),
)
const update = TableContractComposition.makeUpdate({
  Snapped: Update.combineSteps([
    TableContractBlock.makeFieldsStep((model) => ({
      expanded: () => !model.expanded,
      revision: () => model.revision + 1,
    })),
    configure,
  ]),
  Added: Update.combineSteps([
    TableContractBlock.makeFieldsStep((model) => ({
      count: () => model.count + 1,
      selected: () => [model.count],
      revision: () => model.revision + 1,
    })),
    configure,
  ]),
  Selected: Update.combineSteps([
    TableContractBlock.makeFieldsStep((model) => ({
      selected: () => (model.selected.length === 2 ? [1, 3, 5] : [1, 2]),
    })),
    configure,
  ]),
})
const motion = createTargetMotionScope('table-contract-highlight')
const animate = hoverHighlightAnimation(motion)
const view = TableContractComposition.makeView((model, h) => ({
  title: 'Table contracts',
  body: h.div(
    [],
    [
      h.button([h.Id('contract-snap'), h.OnClick(Message.Snapped())], ['Snap']),
      h.button([h.Id('contract-add'), h.OnClick(Message.Added())], ['Add']),
      h.button([h.Id('contract-select'), h.OnClick(Message.Selected())], ['Select']),
      h.div(
        [
          h.Style({
            position: 'relative',
            width: '540px',
            transform: 'scale(1.25)',
            transformOrigin: 'top left',
          }),
        ],
        [
          h.block(
            Table.embedView({
              slotId: model.table.id,
              model: model.table,
              viewInputs: {
                // Legacy five-argument wrappers must retain child presentation metadata via the target.
                animateHighlight: (node, present, rect, reduce, transition) =>
                  animate(node, present, rect, reduce, transition),
                selectionMirrorIds: ['contract-mirror'],
                onHighlightFrame: (box) =>
                  document.dispatchEvent(new CustomEvent('contract-frame', { detail: box })),
                hoverMarker: (index) => h.span([h.DataAttribute('marker', String(index))], ['*']),
                content: (context) => [
                  TableHeader(
                    {
                      context,
                      children: [
                        TableRow(
                          {
                            context,
                            children: ['Name', 'Status'].map((label, index) =>
                              TableHead({ context, hoverIndex: index, children: [label] }, h),
                            ),
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                  TableBody(
                    {
                      children: Array.from({ length: model.count }, (_, index) =>
                        TableRow(
                          {
                            context,
                            index,
                            attributes: [
                              h.Style({ height: model.expanded && index === 0 ? '90px' : '36px' }),
                            ],
                            children: [`Row ${index}`, 'Active'].map((label) =>
                              TableCell({ size: context.size, children: [label] }, h),
                            ),
                          },
                          h,
                        ),
                      ),
                    },
                    h,
                  ),
                ],
              },
            }),
          ),
          h.div([
            h.Id('contract-mirror'),
            h.Style({ position: 'absolute', inset: '0px', pointerEvents: 'none' }),
          ]),
        ],
      ),
    ],
  ),
}))
const layer = TableContractBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.merge(TableLayer, motion.layer)),
)
Runtime.embed(
  Program.make({
    block: TableContractBlock,
    layer,
    container: document.getElementById('style-contract-root'),
  }),
)
