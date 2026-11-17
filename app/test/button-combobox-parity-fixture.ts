import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Button } from '../../registry/fluid/src/button'
import { ComboboxBlock, layer as ComboLayer } from '../../registry/fluid/src/combobox'
import { DropdownMenuBlock, menuLayer } from '../../registry/fluid/src/dropdown'
import { DropdownItem } from '../../registry/fluid/src/dropdown-item'
import { DialogResources, DialogResourcesLayer } from '../../registry/fluid/src/dialog-resources'
import { DropdownResourcesLayer } from '../../registry/fluid/src/dropdown-resources'
import { Elevated } from '../../registry/fluid/src/elevated'
import { createPresentationContext } from '../../registry/fluid/src/presentation'

const Message = defineMessageUnion({ RaisedSurface: {}, LoweredSurface: {} })
const key = Symbol('ButtonComboboxParity')
const Root = Block.make('ButtonComboboxParity', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    menu: DropdownMenuBlock.Model,
    combo: ComboboxBlock.Model,
    surface: Schema.Finite,
  }),
  Message,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof DropdownMenuBlock>['programRequirements']
    | Block.FactsOf<typeof ComboboxBlock>['programRequirements']
  >(),
})
const Menu = Root.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'menu',
  init: { contextToArgs: () => [{ id: 'held-menu', hoverMode: 'standard' as const }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DropdownMenuBlock, { Events: Root.makeNoopStep }),
})
const Combo = Root.makeRequiredFieldBinding(ComboboxBlock, {
  field: 'combo',
  init: {
    contextToArgs: () => [
      {
        id: 'nested-combo',
        hoverMode: 'standard' as const,
        items: [
          { value: 'first', label: 'First choice' },
          { value: 'second', label: 'Second choice' },
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
const Composition = Root.makeComposition({ bindings: [Menu, Combo] })
const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({ model: { surface: 2 } })),
  update: Composition.makeUpdate({
    RaisedSurface: Root.makeFieldsStep(() => ({ surface: () => 7 })),
    LoweredSurface: Root.makeFieldsStep(() => ({ surface: () => 2 })),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [h.Class('flex flex-col items-start gap-4 p-4')],
      [
        h.h1([], ['Button and Combobox context parity']),
        h.block(
          Menu.embedView({
            slotId: 'held-menu',
            model: model.menu,
            viewInputs: {
              animate: (node) => node,
              trigger: (attributes) =>
                Button({ variant: 'ghost', attributes, children: ['Open menu'] }, h),
              content: (context) => [
                DropdownItem({ index: 0, label: 'Menu item', animate: (node) => node }, context, h),
              ],
            },
          }),
        ),
        Button(
          {
            variant: 'ghost',
            active: true,
            attributes: [h.Id('explicit-active')],
            children: ['Explicit active'],
          },
          h,
        ),
        Button(
          {
            variant: 'ghost',
            attributes: [h.Id('dialog-trigger'), h.AriaExpanded(true), h.AriaHasPopup('dialog')],
            children: ['Dialog trigger'],
          },
          h,
        ),
        h.button([h.OnClick(Message.RaisedSurface())], ['Raise substrate']),
        h.button([h.OnClick(Message.LoweredSurface())], ['Lower substrate']),
        Elevated(
          {
            context: createPresentationContext({ surface: model.surface }),
            offset: 2,
            className: 'w-80 p-4',
            attributes: [h.Id('nested-panel')],
            children: (context) => [
              h.block(
                Combo.embedView({
                  slotId: 'nested-combo',
                  model: model.combo,
                  viewInputs: {
                    context,
                    ariaLabel: 'Nested choices',
                    animate: (node) => node,
                  },
                }),
              ),
            ],
          },
          h,
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(Layer.merge(menuLayer, ComboLayer)))
const dialogs = DialogResourcesLayer(document)
const dropdowns = Layer.unwrap(
  Effect.gen(function* () {
    return DropdownResourcesLayer(document, yield* DialogResources)
  }),
).pipe(Layer.provide(dialogs))
const container = document.querySelector<HTMLElement>('#style-contract-root')
if (container === null) throw new Error('Parity fixture container required')
const runtime = Runtime.embed(
  Program.makeElement({ block: Root, layer, container, devTools: false }).provide(
    Layer.merge(dialogs, dropdowns),
  ),
)
window.addEventListener(
  'dispose-button-combobox',
  () => {
    void runtime.dispose()
  },
  { once: true },
)
