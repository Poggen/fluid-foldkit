import { ComponentPresentation } from '../settings'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion } from 'foldkit/message'
import * as Dropdown from '../../../registry/fluid/examples/src/dropdown-example-block'
import { view as dropdownView } from '../../../registry/fluid/examples/src/dropdown-example-view'
import * as Breadcrumb from '../../../registry/fluid/examples/src/breadcrumb-example-block'
import { view as breadcrumbView } from '../../../registry/fluid/examples/src/breadcrumb-example-view'
const key = Symbol('AuthoredMenus')
export const AuthoredMenusBlock = Block.make('AuthoredMenus', {
  key,
  InitArgs: Schema.Tuple([]),
  Message: Schema.Never,
  Model: Schema.Struct({
    dropdown: Dropdown.DropdownExampleBlock.Model,
    breadcrumb: Breadcrumb.BreadcrumbExampleBlock.Model,
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof Dropdown.DropdownExampleBlock>['programRequirements']
    | Block.FactsOf<typeof Breadcrumb.BreadcrumbExampleBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{ readonly slug: string; readonly ready: boolean }>(),
  },
})
const Root = AuthoredMenusBlock
const DropdownBinding = Root.makeRequiredFieldBinding(Dropdown.DropdownExampleBlock, {
  field: 'dropdown',
})
const BreadcrumbBinding = Root.makeRequiredFieldBinding(Breadcrumb.BreadcrumbExampleBlock, {
  field: 'breadcrumb',
})
const Composition = Root.makeComposition({ bindings: [DropdownBinding, BreadcrumbBinding] })
const dropdownLayer = Dropdown.DropdownExampleBlock.makeLayer({
  init: Dropdown.init,
  update: Dropdown.update,
  inMessageUpdate: Dropdown.inMessageUpdate,
  view: dropdownView,
}).pipe(Layer.provide(Dropdown.dependencies))
const breadcrumbLayer = Breadcrumb.BreadcrumbExampleBlock.makeLayer({
  init: Breadcrumb.init,
  update: Breadcrumb.update,
  inMessageUpdate: Breadcrumb.inMessageUpdate,
  view: breadcrumbView,
  EffectsLayer: Breadcrumb.effectsLayer,
}).pipe(Layer.provide(Breadcrumb.dependencies))
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep.fromMessage(({ presentation: settings }) => {
      const options = {
        embedded: true,
        shape: settings.shape,
        size: settings.size,
        hoverMode: settings.hover,
      }
      return Update.combineSteps([
        DropdownBinding.informOfDocumentation(options),
        BreadcrumbBinding.informOfDocumentation(options),
      ])
    }),
  }),
  view: Composition.makeView.withInputs((model, { slug, ready }, h) =>
    !ready
      ? h.empty
      : slug === 'dropdown'
        ? h.block(DropdownBinding.embedView({ slotId: 'authored-dropdown', model: model.dropdown }))
        : slug === 'breadcrumb'
          ? h.block(
              BreadcrumbBinding.embedView({
                slotId: 'authored-breadcrumb',
                model: model.breadcrumb,
              }),
            )
          : h.empty,
  ),
}).pipe(Layer.provide(Layer.merge(dropdownLayer, breadcrumbLayer)))
