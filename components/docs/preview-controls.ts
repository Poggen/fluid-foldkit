import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion } from 'foldkit/message'
import {
  TabsBlock,
  layer as TabsLayer,
  hoverModeOf as tabsHoverModeOf,
} from '@foldkit-visuals/fluid/tabs'
import type { TabsViewInputs } from '@foldkit-visuals/fluid/tabs'
import { createSwitchMotionScope } from '@foldkit-visuals/fluid/switch'
import { InspectorBlock, layer as InspectorLayer } from './inspector'

const Config = Schema.Struct({
  id: Schema.String,
  idPrefix: Schema.String,
  selectedIndex: Schema.Int,
})
type Config = typeof Config.Type
const key = Symbol('PreviewControls')
export const PreviewControlsBlock = Block.make('PreviewControls', {
  key,
  InitArgs: Schema.Tuple([Config]),
  ChildInitContext: Config,
  Model: Schema.Struct({ tabs: TabsBlock.Model, inspector: InspectorBlock.Model }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    RequestedHoverMode: { mode: Schema.Literals(['fluid', 'standard']) },
  }),
  view: { kind: 'Element', Inputs: Block.makeInputContract<TabsViewInputs>() },
})
const BaseTabsBinding = PreviewControlsBlock.makeRequiredFieldBinding(TabsBlock, {
  field: 'tabs',
  init: { contextToArgs: (config) => [config] },
})
const TabsBinding = BaseTabsBinding.withOutMessagePolicy({
  fold: PreviewControlsBlock.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) => BaseTabsBinding.requestSelected({ selectedIndex: index }),
  }),
})
const InspectorBinding = PreviewControlsBlock.makeRequiredFieldBinding(InspectorBlock, {
  field: 'inspector',
  init: { contextToArgs: ({ id }) => [`inspect-${id}`] },
})
const Composition = PreviewControlsBlock.makeComposition({
  bindings: [TabsBinding, InspectorBinding],
})
const init = Composition.makeInit((config) => ({ model: {}, childInitContext: config }))
const update = Composition.makeUpdate({})
const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedHoverMode: PreviewControlsBlock.makeStep.fromMessage(({ mode }) =>
    TabsBinding.requestHoverMode({ mode }),
  ),
})
export const layer = PreviewControlsBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* Composition.acquireChildren()
    const switchMotion = createSwitchMotionScope('documentation-preview-controls')
    yield* Layer.build(switchMotion.layer)

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view: Composition.makeView.withInputs((model, inputs, h) =>
        h.div(
          [h.Class('flex min-w-0 flex-1 items-center gap-3')],
          [
            h.block(
              TabsBinding.embedView({
                slotId: model.tabs.id,
                model: model.tabs,
                viewInputs: inputs,
              }),
            ),
            h.block(
              InspectorBinding.embedView({
                slotId: `inspect-${model.tabs.id}`,
                model: model.inspector,
                viewInputs: {
                  ...inputs,
                  animate: (node, animation) =>
                    typeof window === 'undefined' ? node : switchMotion.node(node, animation),
                },
              }),
            ),
          ],
        ),
      ),
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(TabsLayer, InspectorLayer)))

export const hoverModeOf = (model: typeof PreviewControlsBlock.Model.Type) =>
  tabsHoverModeOf(model.tabs)
