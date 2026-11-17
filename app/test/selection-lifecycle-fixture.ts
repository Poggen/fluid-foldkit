import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { ComboboxBlock, layer as ComboLayer } from '../../registry/fluid/src/combobox'
import {
  SelectionBackgroundsBlock,
  layer as SelectionLayer,
} from '../../registry/fluid/src/selection-backgrounds'
import { DialogResourcesLayer } from '../../registry/fluid/src/dialog-resources'
import { convergeMs, splitMs } from '../../registry/fluid/src/lib/selection-geometry'

declare global {
  interface Window {
    selectionLifecycleReceipt: { scheduled: number; cancelled: number }
  }
}
const receipt = { scheduled: 0, cancelled: 0 }
window.selectionLifecycleReceipt = receipt
const tracked = new Set<number>()
const browserWindow: Window = window
const nativeTimeout = browserWindow.setTimeout.bind(browserWindow)
const nativeClear = browserWindow.clearTimeout.bind(browserWindow)
browserWindow.setTimeout = (handler, delay, ...args) => {
  const timer = nativeTimeout(handler, delay, ...args)
  if (delay === convergeMs || delay === splitMs) {
    receipt.scheduled += 1
    tracked.add(timer)
  }
  return timer
}
browserWindow.clearTimeout = (timer) => {
  if (timer !== undefined && tracked.delete(timer)) receipt.cancelled += 1
  nativeClear(timer)
}

const Message = defineMessageUnion({ Hidden: {}, Shown: {}, Cleared: {}, Restored: {}, Merged: {} })
const key = Symbol('SelectionLifecycle')
const Root = Block.make('SelectionLifecycle', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    combo: ComboboxBlock.Model,
    selection: SelectionBackgroundsBlock.Model,
    visible: Schema.Boolean,
  }),
  Message,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof ComboboxBlock>['programRequirements']
  >(),
})
const Combo = Root.makeRequiredFieldBinding(ComboboxBlock, {
  field: 'combo',
  init: {
    contextToArgs: () => [
      {
        id: 'initial-open',
        defaultValue: 'first',
        items: [
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second' },
        ],
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(ComboboxBlock, {
    Selected: Root.makeNoopStep,
    ValuesChanged: Root.makeNoopStep,
    CreateRequested: Root.makeNoopStep,
  }),
})
const Selection = Root.makeRequiredFieldBinding(SelectionBackgroundsBlock, {
  field: 'selection',
  init: {
    contextToArgs: () => [
      {
        id: 'lifecycle-selection',
        indices: [0, 2],
        radius: 8,
        itemRects: [0, 1, 2].map((index) => ({ top: index * 24, left: 0, width: 100, height: 24 })),
      },
    ],
  },
})
const Composition = Root.makeComposition({ bindings: [Combo, Selection] })
const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { visible: true },
    steps: new URL(window.location.href).searchParams.has('selectionOnly')
      ? []
      : [Combo.requestOpen()],
  })),
  update: Composition.makeUpdate({
    Hidden: Root.makeFieldsStep(() => ({ visible: () => false })),
    Shown: Root.makeFieldsStep(() => ({ visible: () => true })),
    Cleared: Selection.requestSelection({ indices: [] }),
    Restored: Selection.requestSelection({ indices: [0, 2] }),
    Merged: Selection.requestSelection({ indices: [0, 1, 2] }),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [h.Class('p-4 flex flex-col items-start gap-4')],
      [
        h.block(
          Combo.embedView({
            slotId: 'initial-open',
            model: model.combo,
            viewInputs: { ariaLabel: 'Initially open choices', animate: (node) => node },
          }),
        ),
        h.output(
          [
            h.Id('combo-state'),
            h.DataAttribute('slots', String(model.combo.selection.slots.length)),
          ],
          ['Combo selection slots'],
        ),
        h.button([h.OnClick(Message.Cleared())], ['Clear geometry']),
        h.button([h.OnClick(Message.Restored())], ['Restore geometry']),
        h.button([h.OnClick(Message.Merged())], ['Merge geometry']),
        h.button([h.OnClick(Message.Hidden())], ['Hide geometry']),
        h.button([h.OnClick(Message.Shown())], ['Show geometry']),
        h.output(
          [
            h.Id('selection-state'),
            h.DataAttribute('slots', String(model.selection.slots.length)),
            h.DataAttribute(
              'exits',
              String(model.selection.slots.filter((slot) => !slot.present).length),
            ),
            h.DataAttribute('boundaries', String(model.selection.boundaries.length)),
          ],
          ['Selection lifecycle'],
        ),
        model.visible
          ? h.block(
              Selection.embedView({
                slotId: 'lifecycle-selection',
                model: model.selection,
                viewInputs: { animate: (node) => node },
              }),
            )
          : h.empty,
      ],
    ),
  ),
}).pipe(Layer.provide(Layer.merge(ComboLayer, SelectionLayer)))
const container = document.querySelector<HTMLElement>('#style-contract-root')
if (container === null) throw new Error('Lifecycle fixture container required')
const runtime = Runtime.embed(
  Program.makeElement({ block: Root, layer, container, devTools: false }).provide(
    DialogResourcesLayer(document),
  ),
)
window.addEventListener(
  'dispose-selection-lifecycle',
  () => {
    void runtime.dispose().finally(() => {
      browserWindow.setTimeout = nativeTimeout
      browserWindow.clearTimeout = nativeClear
    })
  },
  { once: true },
)
