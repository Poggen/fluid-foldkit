import { childAttributes } from 'foldkit/html'
import { TabsBlock, layer as TabsLayer } from '@foldkit-visuals/fluid/tabs'
import type { TabsContext } from '@foldkit-visuals/fluid/tabs'
import { Elevated } from '@foldkit-visuals/fluid/elevated'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { ShapeProvider, useSizeContext } from '@foldkit-visuals/fluid/presentation/context'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { expect } from 'vitest'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { renderToString } from 'foldkit/experimental/server'
import { TabsItem } from '../src/tabs.js'
const effects = Block.makeEffectsContract()
const Model = Schema.Struct({ tabs: TabsBlock.Model })
const Message = defineMessageUnion({ Noop: {} })
const TabsEntryKey = Symbol('TabsEntryRender')
const Root = Block.make('TabsEntryRender', {
  key: TabsEntryKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})
const Tabs = Root.makeRequiredFieldBinding(TabsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => [{ id: 'tabs', selectedIndex: 1 }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(TabsBlock, { Selected: Root.makeNoopStep }),
})
const Composition = Root.makeComposition({ bindings: [Tabs] })
const init = Composition.makeInit(() => ({ model: {} }))
const update = Composition.makeUpdate({ Noop: Root.makeNoopStep() })
const view = Composition.makeView((model, h) => ({
  title: 'Tabs entry',
  body: h.block(
    Tabs.embedView({
      slotId: model.tabs.id,
      model: model.tabs,
      viewInputs: {
        items: [{ value: 'First' }, { value: 'Second' }, { value: 'Disabled', disabled: true }],
        animate: (node) => node,
        content: (context) =>
          ['First', 'Second', 'Disabled'].map((label, index) =>
            TabsItem({ label, index }, context, h),
          ),
      },
    }),
  ),
}))
const layer = Root.makeLayer({ init, update, view }).pipe(Layer.provide(TabsLayer))
it.effect(
  'Secondary tabs render one selected tab stop, focusable-disabled semantics and no phantom panel links',
  () =>
    Effect.gen(function* tabsCase1() {
      const { html } = yield* renderToString({ block: Root, layer }, {}, { isHydratable: false })
      expect(html.match(/tabindex="0"/gu)).toHaveLength(1)
      expect(/<button[^>]*id="tabs-tab-1"[^>]*>/u.exec(html)?.[0]).toContain('tabindex="0"')
      expect(/<[^>]*role="tablist"[^>]*>/u.exec(html)?.[0]).not.toContain('tabindex=')
      expect(/<button[^>]*id="tabs-tab-2"[^>]*>/u.exec(html)?.[0]).toContain('aria-disabled="true"')
      expect(/<button[^>]*id="tabs-tab-2"[^>]*>/u.exec(html)?.[0]).not.toContain(' disabled')
      expect(html).not.toContain('aria-controls=')
    }),
)
export const TabsContextParentKey = Symbol('TabsContextParent')
const contextEffects = Block.makeEffectsContract()
const ContextRoot = Block.make('TabsContextParent', {
  key: TabsContextParentKey,
  Model: Schema.Struct({ primary: TabsBlock.Model, secondary: TabsBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: contextEffects,
})
const PrimaryContext = ContextRoot.makeRequiredFieldBinding(TabsBlock, {
  field: 'primary',
  init: { contextToArgs: () => [{ id: 'primary-tabs', selectedIndex: 0 }] },
}).withOutMessagePolicy({
  fold: ContextRoot.makeOutMessageFold(TabsBlock, { Selected: ContextRoot.makeNoopStep }),
})
const SecondaryContext = ContextRoot.makeRequiredFieldBinding(TabsBlock, {
  field: 'secondary',
  init: { contextToArgs: () => [{ id: 'secondary-tabs', selectedIndex: 0 }] },
}).withOutMessagePolicy({
  fold: ContextRoot.makeOutMessageFold(TabsBlock, { Selected: ContextRoot.makeNoopStep }),
})
const contextComposition = ContextRoot.makeComposition({
  bindings: [PrimaryContext, SecondaryContext],
})
const contextMotion = createTargetMotionScope('tabs-context-parent')
const contextView = contextComposition.makeView((model, h) => {
  const content = (context: TabsContext) => [
    h.span([
      h.DataAttribute('tabs-presentation', context.id),
      h.DataAttribute('size-provider', useSizeContext(context.context, (size) => size).size),
    ]),
    TabsItem({ label: `${context.id} direct`, index: 0 }, context, h),
    Elevated(
      {
        ...context,
        offset: 1,
        children: () => [TabsItem({ label: `${context.id} wrapped`, index: 1 }, context, h)],
      },
      h,
    ),
  ]
  return {
    title: 'Public Tabs context composition',
    body: ShapeProvider({
      defaultShape: 'pill',
      children: (presentation) =>
        h.main(
          [],
          [
            h.block(
              PrimaryContext.embedView({
                slotId: model.primary.id,
                model: model.primary,
                viewInputs: {
                  context: presentation,
                  size: 'compact',
                  items: [{ value: 'First' }, { value: 'Second' }],
                  animate: contextMotion.node,
                  className: 'root-primary-tabs',
                  attributes: childAttributes([
                    h.Id('primary-tabs'),
                    h.DataAttribute('root-owner', 'primary-tabs'),
                  ]),
                  content,
                },
              }),
            ),
            h.block(
              SecondaryContext.embedView({
                slotId: model.secondary.id,
                model: model.secondary,
                viewInputs: {
                  context: presentation,
                  size: 'compact',
                  items: [{ value: 'First' }, { value: 'Second' }],
                  animate: contextMotion.node,
                  className: 'root-secondary-tabs',
                  attributes: childAttributes([
                    h.Id('secondary-tabs'),
                    h.DataAttribute('root-owner', 'secondary-tabs'),
                  ]),
                  content,
                },
              }),
            ),
          ],
        ),
    }),
  }
})
const contextLayer = ContextRoot.makeLayer({
  init: contextComposition.makeInit(() => ({ model: {} })),
  update: contextComposition.makeUpdate({}),
  view: contextView,
}).pipe(Layer.provide(TabsLayer))
for (const variant of ['primary', 'secondary'] as const) {
  it.effect(`${variant} Tabs keeps root attributes out of public Elevated content`, () =>
    Effect.gen(function* tabsContextComposition() {
      const { html } = yield* renderToString(
        { block: ContextRoot, layer: contextLayer },
        {},
        { isHydratable: false },
      )
      const id = `${variant}-tabs`
      for (const [index, selected] of [
        [0, 'true'],
        [1, 'false'],
      ] as const) {
        const tab = new RegExp(`<button(?=[^>]*id="${id}-tab-${index}")[^>]*>`, 'u').exec(html)?.[0]
        expect(tab).toContain('role="tab"')
        expect(tab).toContain(`aria-selected="${selected}"`)
        expect(tab).toContain(`tabindex="${index === 0 ? 0 : -1}"`)
        expect(tab).toContain('h-7')
        expect(tab).toContain('rounded-[20px]')
        expect(tab).not.toContain(`root-${id}`)
        expect(tab).not.toContain('data-root-owner')
      }
      expect(html).toContain(`${id} direct`)
      expect(html).toContain(`${id} wrapped`)
      const provider = new RegExp(`<span(?=[^>]*data-tabs-presentation="${id}")[^>]*>`, 'u').exec(
        html,
      )?.[0]
      expect(provider).toContain('data-size-provider="compact"')
      expect({
        rootIds: html.split(` id="${id}"`).length - 1,
        rootAttributes: html.split(`data-root-owner="${id}"`).length - 1,
        rootClasses: html.split(`root-${id}`).length - 1,
      }).toEqual({ rootIds: 1, rootAttributes: 1, rootClasses: 1 })
    }),
  )
}
