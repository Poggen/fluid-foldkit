import { Effect, Layer, Option, Predicate, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import {
  DropdownBlock,
  DropdownMenuBlock,
  layer as InlineLayer,
  menuLayer,
} from '../src/dropdown.js'
import { DropdownItem } from '../src/dropdown-item.js'
import { DropdownSearch } from '../src/dropdown-parts.js'
import type { DropdownResources } from '../src/dropdown-resources.js'
import { DropdownResourcesServerLayer, DropdownResourcesLayer } from '../src/dropdown-resources.js'
import {
  DialogBlock,
  DialogLayer,
  DialogResources,
  DialogResourcesServerLayer,
  DialogTitle,
} from '../src/dialog.js'

const Model = Schema.Struct({
  menu: DropdownMenuBlock.Model,
  inline: DropdownBlock.Model,
  dialog: DialogBlock.Model,
  changes: Schema.Array(Schema.Boolean),
  query: Schema.String,
})

const Message = defineMessageUnion({
  Open: {},
  Close: {},
  Control: { open: Schema.Boolean },
  Search: { value: Schema.String },
})

const effects = Block.makeEffectsContract<never, DropdownResources | DialogResources>()

export const DropdownFixtureKey = Symbol('DropdownFixture')

export const DropdownFixture = Block.make('DropdownFixture', {
  key: DropdownFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const FluidDropdownFixtureDefinition = DropdownFixture

const Menu = FluidDropdownFixtureDefinition.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'menu',
  init: { contextToArgs: () => [{ id: 'menu', rootId: 'modal', parentId: 'modal' }] },
}).withOutMessagePolicy({
  fold: FluidDropdownFixtureDefinition.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      FluidDropdownFixtureDefinition.makeFieldsStep((model) => ({
        changes: () => [
          ...model.changes,
          ...events.flatMap((event) =>
            Predicate.isTagged('OpenChanged')(event) ? [event.open] : [],
          ),
        ],
      })),
  }),
})

const Inline = FluidDropdownFixtureDefinition.makeRequiredFieldBinding(DropdownBlock, {
  field: 'inline',
  init: { contextToArgs: () => [{ id: 'inline' }] },
}).withOutMessagePolicy({
  fold: FluidDropdownFixtureDefinition.makeOutMessageFold(DropdownBlock, {
    Events: () => FluidDropdownFixtureDefinition.makeNoopStep(),
  }),
})

const Dialog = FluidDropdownFixtureDefinition.makeRequiredFieldBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'modal', defaultOpen: true }] },
}).withOutMessagePolicy({
  fold: FluidDropdownFixtureDefinition.makeOutMessageFold(DialogBlock, {
    CompletedClose: FluidDropdownFixtureDefinition.makeNoopStep,
    OpenChanged: () => FluidDropdownFixtureDefinition.makeNoopStep(),
  }),
})

const FluidDropdownFixtureComposition = FluidDropdownFixtureDefinition.makeComposition({
  bindings: [Menu, Inline, Dialog],
})

const implementation = {
  init: FluidDropdownFixtureComposition.makeInit(() => ({ model: { changes: [], query: '' } })),
  update: FluidDropdownFixtureComposition.makeUpdate({
    Search: (model, { value }) => ({ model: { ...model, query: value } }),
    Open: Menu.requestVisibility({ open: true }),
    Close: Menu.requestVisibility({ open: false }),
    Control: FluidDropdownFixtureDefinition.makeStep(
      (_model, { open }: typeof Message.Control.Type) =>
        Menu.requestControlledOpen({ control: Option.some(open) }),
    ),
  }),
  view: FluidDropdownFixtureComposition.makeView((model, h) => ({
    title: 'Dropdown fixture',
    body: h.div(
      [],
      [
        h.block(
          Inline.embedView({
            slotId: model.inline.controller.id,
            model: model.inline,
            viewInputs: {
              animate: (node) => node,
              content: (context) => [
                DropdownItem(
                  { id: 'inline-row', index: 0, label: 'Inline action', animate: (node) => node },
                  context,
                  h,
                ),
              ],
            },
          }),
        ),
        h.block(
          Dialog.embedView({
            slotId: model.dialog.id,
            model: model.dialog,
            viewInputs: {
              animate: (node) => node,
              content: (dialog) => [
                DialogTitle({ dialogId: dialog.id, children: ['Modal title'] }, h),
                h.block(
                  Menu.embedView({
                    slotId: model.menu.controller.id,
                    model: model.menu,
                    viewInputs: {
                      animate: (node) => node,
                      trigger: (attributes) => h.button(attributes, ['Open menu']),
                      content: (context) => [
                        DropdownSearch(
                          {
                            value: model.query,
                            onValueChange: (value) => Message.Search({ value }),
                            inputAttributes: childAttributes([h.Id('menu-search')]),
                          },
                          h,
                        ),
                        DropdownItem(
                          {
                            id: 'menu-row',
                            index: 0,
                            label: 'Menu action',
                            animate: (node) => node,
                          },
                          context,
                          h,
                        ),
                      ],
                    },
                  }),
                ),
              ],
            },
          }),
        ),
      ],
    ),
  })),
  EffectsLayer: Layer.empty,
}

const ParentLayer = DropdownFixture.makeLayer<typeof implementation>(implementation)

export const DropdownFixtureLayer = Layer.mergeAll(
  ParentLayer.pipe(
    Layer.provide(
      Layer.mergeAll(
        InlineLayer,
        menuLayer,
        DialogLayer,
        DropdownResourcesServerLayer,
        DialogResourcesServerLayer,
      ),
    ),
  ),
  DropdownResourcesServerLayer,
  DialogResourcesServerLayer,
)

export const modalDropdownResources = (document: Document) =>
  Layer.unwrap(
    Effect.gen(function* acquireModalDropdownResources() {
      const branches = yield* DialogResources

      return DropdownResourcesLayer(document, branches)
    }),
  )

export const invalidDropdownOperations = () => {
  // @ts-expect-error A Dropdown does not have the Accordion operation.
  void ('requestValue' satisfies keyof typeof Menu)
  // @ts-expect-error Controlled open requires the native optional-boolean contract.
  Menu.requestControlledOpen({ control: 'true' })
}
