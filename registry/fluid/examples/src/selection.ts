import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  SelectionBackgroundsBlock,
  layer as SelectionLayer,
  selectionBackgroundAnimation,
} from '@foldkit-visuals/fluid/selection-backgrounds'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import './selection.css'

const itemRects = [0, 1, 2, 3, 4].map((index) => ({
  top: 24 + index * 52,
  left: 24,
  width: 248,
  height: 40,
}))

const Model = Schema.Struct({
  selection: SelectionBackgroundsBlock.Model,
  isMounted: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedMerge: {},
  ClickedSplit: {},
  ClickedGrow: {},
  ClickedClear: {},
  ClickedReset: {},
  ClickedToggle: {},
})

const effects = Block.makeEffectsContract()

export const SelectionExampleKey = Symbol('SelectionExampleBlock')

const SelectionExampleBlock = Block.make('SelectionExample', {
  key: SelectionExampleKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const Selection = SelectionExampleBlock.makeRequiredFieldBinding(SelectionBackgroundsBlock, {
  field: 'selection',
  init: {
    contextToArgs: () => [{ id: 'selection-backgrounds', indices: [0, 2], itemRects, radius: 8 }],
  },
})

const SelectionExampleComposition = SelectionExampleBlock.makeComposition({
  bindings: [Selection],
})

const motion = createTargetMotionScope('fluid-selection-parity')

const init = SelectionExampleComposition.makeInit(() => ({ model: { isMounted: true } }))

const update = SelectionExampleComposition.makeUpdate({
  ClickedMerge: Selection.requestSelection({ indices: [0, 1, 2] }),
  ClickedSplit: Selection.requestSelection({ indices: [0, 2] }),
  ClickedGrow: Selection.requestSelection({ indices: [0, 1, 2, 3, 4] }),
  ClickedClear: Selection.requestSelection({ indices: [] }),
  ClickedReset: Selection.requestSelection({ indices: [0, 2] }),
  ClickedToggle: SelectionExampleBlock.makeFieldsStep(() => ({ isMounted: Boolean.not })),
})

const view = SelectionExampleComposition.makeView((model, h) => ({
  title: 'Fluid selection parity',
  body: h.main(
    [h.Class('p-6')],
    [
      h.h1([], ['Fluid selection parity']),
      h.div(
        [h.Class('flex gap-2 m-[16px_0] [&_button]:p-2 [&_button]:[border:1px_solid_#bbb]')],
        [
          Button.view(
            {
              onClick: Message.ClickedMerge(),
              toView: (attributes) => h.button([...attributes.button, h.Id('merge')], ['Merge']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedSplit(),
              toView: (attributes) => h.button([...attributes.button, h.Id('split')], ['Split']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedGrow(),
              toView: (attributes) => h.button([...attributes.button, h.Id('grow')], ['Grow']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedClear(),
              toView: (attributes) => h.button([...attributes.button, h.Id('clear')], ['Clear']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedReset(),
              toView: (attributes) => h.button([...attributes.button, h.Id('reset')], ['Reset']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedToggle(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('toggle')], ['Toggle mount']),
            },
            h,
          ),
        ],
      ),
      h.div(
        [h.Id('selection-region'), h.Class('relative w-75 p-6 [border:2px_solid_#888] mt-4')],
        [
          model.isMounted
            ? h.block(
                Selection.embedView({
                  slotId: model.selection.id,
                  model: model.selection,
                  viewInputs: { animate: selectionBackgroundAnimation(motion) },
                }),
              )
            : h.empty,
          ...[0, 1, 2, 3, 4].map((index) =>
            h.div([h.Class('relative block w-62 h-10 mb-3 text-left p-2')], [`Row ${index + 1}`]),
          ),
        ],
      ),
    ],
  ),
}))

const layer = SelectionExampleBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(SelectionLayer),
)

Runtime.run(
  Program.make({
    block: SelectionExampleBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide(motion.layer),
)
