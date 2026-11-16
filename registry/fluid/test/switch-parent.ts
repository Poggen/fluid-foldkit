import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { KeyboardNavGateBlock, KeyboardNavGateLayer } from '../src/keyboard-nav-gate.js'
import { SwitchBlock, SwitchLayer } from '../src/switch.js'

const Model = Schema.Struct({ switch: SwitchBlock.Model, gate: KeyboardNavGateBlock.Model })

const Message = defineMessageUnion({ Toggle: {}, Disable: {}, Open: {}, Close: {} })

export const FluidFormsParentKey = Symbol('FluidFormsParent')

const FluidFormsParentBlock = Block.make('FluidFormsParent', {
  key: FluidFormsParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Toggle = FluidFormsParentBlock.makeRequiredFieldBinding(SwitchBlock, {
  field: 'switch',
  init: { contextToArgs: () => [{ id: 'switch', checked: false }] },
})

const Switch = Toggle.withOutMessagePolicy({
  fold: FluidFormsParentBlock.makeOutMessageFold(SwitchBlock, {
    Toggled: () =>
      FluidFormsParentBlock.makeStep((model) =>
        Toggle.requestConfigure({
          checked: !model.switch.checked,
          disabled: model.switch.disabled,
        }),
      ),
  }),
})

const Gate = FluidFormsParentBlock.makeRequiredFieldBinding(KeyboardNavGateBlock, {
  field: 'gate',
  init: { contextToArgs: () => [{ id: 'gate' }] },
})

const FluidFormsParentComposition = FluidFormsParentBlock.makeComposition({
  bindings: [Switch, Gate],
})

const init = FluidFormsParentComposition.makeInit(() => ({ model: {} }))

const update = FluidFormsParentComposition.makeUpdate({
  Toggle: Switch.requestToggle(),
  Disable: FluidFormsParentBlock.makeStep((model) =>
    Switch.requestConfigure({ checked: model.switch.checked, disabled: !model.switch.disabled }),
  ),
  Open: Gate.requestOpen({ open: true }),
  Close: Gate.requestOpen({ open: false }),
})

const view = FluidFormsParentComposition.makeView((model, h) => ({
  title: 'Native Fluid forms',
  body: h.main(
    [],
    [
      h.block(
        Switch.embedView({
          slotId: model.switch.id,
          model: model.switch,
          viewInputs: { label: 'Notifications', animate: (node) => node },
        }),
      ),
      h.block(
        Gate.embedView({
          slotId: model.gate.id,
          model: model.gate,
          viewInputs: { content: ({ keyboardNav }) => [h.span([], [String(keyboardNav)])] },
        }),
      ),
    ],
  ),
}))

export const FormsParent = FluidFormsParentBlock

export const FormsParentLayer = FluidFormsParentBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.mergeAll(SwitchLayer, KeyboardNavGateLayer)),
)
