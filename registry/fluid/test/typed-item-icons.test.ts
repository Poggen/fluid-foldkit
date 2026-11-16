import { it } from '@effect/vitest'
import { Schema } from 'effect'
import { Block, Scene } from 'foldkit'
import { SelectItem } from '../src/select-item.js'
import { defaultIcons } from '../src/icons.js'
import { createPresentationContext } from '../src/presentation.js'

const Model = Schema.Struct({
  compact: Schema.Boolean,
  active: Schema.Boolean,
  checked: Schema.Boolean,
})
type Model = typeof Model.Type
const key = Symbol('TypedItemRenderFixture')
const effects = Block.makeEffectsContract()
const ItemFixture = Block.make('TypedItemRenderFixture', {
  key,
  Model,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([Model]),
  effects,
  view: { kind: 'Element' },
})
const Composition = ItemFixture.makeComposition()
const ItemLayer = ItemFixture.makeLayer({
  init: Composition.makeInit((model: Model) => ({ model })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) =>
    SelectItem(
      {
        index: 0,
        label: 'Palette',
        checked: model.checked,
        icon: defaultIcons.palette,
        animate: (node) => node,
      },
      {
        id: 'typed-item',
        activeIndex: model.active ? 0 : null,
        multiple: false,
        inMenu: true,
        context: createPresentationContext({ size: model.compact ? 'compact' : 'default' }),
      },
      h,
    ),
  ),
})
// Attribute selectors also cover SVG class attributes in the public Scene query model.
// Static stateless-render contract; focus/hover transitions belong to the browser candidate.
for (const compact of [false, true]) {
  for (const state of [
    { active: false, checked: false },
    { active: true, checked: false },
    { active: false, checked: true },
  ]) {
    it.effect(
      `SelectItem paints one inherited icon (${compact}, ${state.active}, ${state.checked})`,
      () =>
        Scene.scene(
          { block: ItemFixture, layer: ItemLayer },
          Scene.init({ compact, ...state }),
          Scene.expectAll(Scene.all.selector('svg[class^="lucide lucide-palette"]')).toHaveCount(1),
          Scene.expect(Scene.selector('svg[class^="lucide lucide-palette"]')).toHaveAttr(
            'width',
            compact ? '14' : '16',
          ),
          Scene.expect(Scene.selector('svg[class^="lucide lucide-palette"]')).toHaveAttr(
            'stroke-width',
            state.active || state.checked ? '2' : '1.5',
          ),
        ),
    )
  }
}
