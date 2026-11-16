import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  KeyboardNavGateBlock,
  KeyboardNavGateLayer,
} from '@foldkit-visuals/fluid/keyboard-nav-gate'
import { TabsBlock, TabsItem, layer as TabsLayer } from '@foldkit-visuals/fluid/tabs'
import { SwitchBlock, SwitchLayer } from '@foldkit-visuals/fluid/switch'
import { SelectBlock, layer as SelectLayer } from '@foldkit-visuals/fluid/select'

const Model = Schema.Struct({
  switch: SwitchBlock.Model,
  tabs: TabsBlock.Model,
  gate: KeyboardNavGateBlock.Model,
  legacySelect: SelectBlock.Model,
  triggerSelect: SelectBlock.Model,
})

const Message = defineMessageUnion({ Toggle: {}, Disable: {}, Open: {}, Close: {} })

export const FluidFormsParentKey = Symbol('FluidFormsParent')

const FluidFormsParentBlock = Block.make('FluidFormsParent', {
  key: FluidFormsParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SelectBlock>['programRequirements']
    | Block.FactsOf<typeof TabsBlock>['programRequirements']
  >(),
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

const selectItems = [{ value: 'selected', label: 'Selected' }]
const LegacySelect = FluidFormsParentBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'legacySelect',
  init: {
    contextToArgs: () => [{ id: 'legacy-select', items: selectItems, defaultValue: 'selected' }],
  },
}).withOutMessagePolicy({
  fold: FluidFormsParentBlock.makeOutMessageFold(SelectBlock, {
    Selected: FluidFormsParentBlock.makeNoopStep,
    OpenChanged: FluidFormsParentBlock.makeNoopStep,
  }),
})
const TriggerSelect = FluidFormsParentBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'triggerSelect',
  init: {
    contextToArgs: () => [{ id: 'trigger-select', items: selectItems, defaultValue: 'selected' }],
  },
}).withOutMessagePolicy({
  fold: FluidFormsParentBlock.makeOutMessageFold(SelectBlock, {
    Selected: FluidFormsParentBlock.makeNoopStep,
    OpenChanged: FluidFormsParentBlock.makeNoopStep,
  }),
})

const tabLabels = [
  'Account overview',
  'Notification preferences',
  'Workspace permissions',
  'Connected applications',
  'Billing and invoices',
  'Security and authentication',
]
const Tabs = FluidFormsParentBlock.makeRequiredFieldBinding(TabsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => [{ id: 'overflow-tabs', selectedIndex: 0 }] },
}).withOutMessagePolicy({
  fold: FluidFormsParentBlock.makeOutMessageFold(TabsBlock, {
    Selected: FluidFormsParentBlock.makeNoopStep,
  }),
})

const FluidFormsParentComposition = FluidFormsParentBlock.makeComposition({
  bindings: [Switch, Gate, LegacySelect, TriggerSelect, Tabs],
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
      h.div(
        [h.Class('w-64')],
        [
          h.block(
            Tabs.embedView({
              slotId: model.tabs.id,
              model: model.tabs,
              viewInputs: {
                ariaLabel: 'Overflowing workspace tabs',
                items: tabLabels.map((value) => ({ value })),
                animate: (node) => node,
                content: (context) =>
                  tabLabels.map((label, index) => TabsItem({ index, label }, context, h)),
              },
            }),
          ),
        ],
      ),
      h.div(
        [h.Id('native-scroller'), h.Class('w-64 overflow-x-auto whitespace-nowrap')],
        [tabLabels.join(' · ')],
      ),
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
      h.block(
        LegacySelect.embedView({
          slotId: 'legacy-select',
          model: model.legacySelect,
          viewInputs: {
            ariaLabel: 'Shared Select classes',
            size: 'compact',
            className: 'px-3',
            animate: (node) => node,
          },
        }),
      ),
      h.block(
        TriggerSelect.embedView({
          slotId: 'trigger-select',
          model: model.triggerSelect,
          viewInputs: {
            ariaLabel: 'Button Select classes',
            size: 'compact',
            className: 'px-3',
            triggerClassName: 'px-2',
            animate: (node) => node,
          },
        }),
      ),
    ],
  ),
}))

export const FormsParent = FluidFormsParentBlock

export const FormsParentLayer = FluidFormsParentBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.mergeAll(SwitchLayer, KeyboardNavGateLayer, SelectLayer, TabsLayer)),
)
