import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import { renderToString } from 'foldkit/experimental/server'
import { SidebarAppBlock, SidebarAppLayer } from '@foldkit-visuals/fluid/sidebar/app'
import { NavMenuBlock, NavItemConfig, navMenuLayer } from '@foldkit-visuals/fluid/nav-menu'
import type { DialogResources } from '@foldkit-visuals/fluid/dialog/environment'
import type { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'
import type { TooltipDom } from '@foldkit-visuals/fluid/tooltip'
const Model = Schema.Struct({
  app: SidebarAppBlock.Model,
  secondaryApp: SidebarAppBlock.Model,
  primaryNav: NavMenuBlock.Model,
  secondaryNav: NavMenuBlock.Model,
})
const effects = Block.makeEffectsContract<never, DialogResources | DropdownResources | TooltipDom>()
const SidebarServerKey = Symbol('SidebarServer')
const SidebarServerBlock = Block.make('SidebarServer', {
  key: SidebarServerKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})
const App = SidebarServerBlock.makeRequiredFieldBinding(SidebarAppBlock, {
  field: 'app',
  init: { contextToArgs: () => [{ id: 'server-app' }] },
}).withOutMessagePolicy({
  fold: SidebarServerBlock.makeOutMessageFold(SidebarAppBlock, {
    Selected: SidebarServerBlock.makeNoopStep,
    OpenChanged: SidebarServerBlock.makeNoopStep,
    WidthChanged: SidebarServerBlock.makeNoopStep,
  }),
})
const SecondaryApp = SidebarServerBlock.makeRequiredFieldBinding(SidebarAppBlock, {
  field: 'secondaryApp',
  init: { contextToArgs: () => [{ id: 'server-secondary-app' }] },
}).withOutMessagePolicy({
  fold: SidebarServerBlock.makeOutMessageFold(SidebarAppBlock, {
    Selected: SidebarServerBlock.makeNoopStep,
    OpenChanged: SidebarServerBlock.makeNoopStep,
    WidthChanged: SidebarServerBlock.makeNoopStep,
  }),
})
const navItems = [
  NavItemConfig.make({
    value: 'nested',
    label: 'Nested destination',
    href: '#nested',
    level: 1,
    disabled: false,
    status: null,
    badge: '2',
  }),
  ...['disabled-link', 'disabled-button'].map((value) =>
    NavItemConfig.make({
      value,
      label: value,
      href: `#${value}`,
      level: 1,
      disabled: true,
      status: null,
      badge: '2',
    }),
  ),
]
const PrimaryNav = SidebarServerBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'primaryNav',
  init: { contextToArgs: () => [{ id: 'server-primary-nav', items: navItems }] },
}).withOutMessagePolicy({
  fold: SidebarServerBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: SidebarServerBlock.makeNoopStep,
  }),
})
const SecondaryNav = SidebarServerBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'secondaryNav',
  init: {
    contextToArgs: () => [
      { id: 'server-secondary-nav', items: navItems, itemFeedback: true, activeSlug: '#nested' },
    ],
  },
}).withOutMessagePolicy({
  fold: SidebarServerBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: SidebarServerBlock.makeNoopStep,
  }),
})
const SidebarServerComposition = SidebarServerBlock.makeComposition({
  bindings: [App, SecondaryApp, PrimaryNav, SecondaryNav],
})
const preserveNode = (node: Html) => node
const SidebarServerLayer = SidebarServerBlock.makeLayer({
  init: SidebarServerComposition.makeInit(() => ({ model: {} })),
  update: SidebarServerComposition.makeUpdate({}),
  view: SidebarServerComposition.makeView((model, h) => ({
    title: 'Sidebar server integration',
    body: h.div(
      [],
      [
        h.block(
          App.embedView({
            slotId: 'app',
            model: model.app,
            viewInputs: {
              animate: preserveNode,
              highlight: preserveNode,
              content: () => [
                h.div(
                  [h.DataAttribute('app-inset', 'primary')],
                  [
                    h.block(
                      PrimaryNav.embedView({
                        slotId: 'nested-primary',
                        model: model.primaryNav,
                        viewInputs: {
                          animate: preserveNode,
                          highlight: preserveNode,
                          kind: (item) => (item.value === 'disabled-button' ? 'button' : 'link'),
                          sidebar: true,
                          size: 'compact',
                          rowActions: (_item, context) => ({
                            entries: [
                              h.button(
                                [h.DataAttribute('sibling-badge', String(context.hasBadge))],
                                ['Action'],
                              ),
                            ],
                          }),
                        },
                      }),
                    ),
                  ],
                ),
              ],
            },
          }),
        ),
        h.block(
          SecondaryApp.embedView({
            slotId: 'secondary-app',
            model: model.secondaryApp,
            viewInputs: {
              animate: preserveNode,
              highlight: preserveNode,
              content: () => [
                h.div(
                  [h.DataAttribute('app-inset', 'secondary'), h.Style({ '--active': '#24416f' })],
                  [
                    h.block(
                      SecondaryNav.embedView({
                        slotId: 'nested-secondary',
                        model: model.secondaryNav,
                        viewInputs: {
                          animate: preserveNode,
                          highlight: preserveNode,
                          kind: (item) => (item.value === 'disabled-button' ? 'button' : 'link'),
                          rowActions: (_item, context) => ({
                            entries: [
                              h.button(
                                [h.DataAttribute('sibling-badge', String(context.hasBadge))],
                                ['Action'],
                              ),
                            ],
                          }),
                        },
                      }),
                    ),
                  ],
                ),
              ],
            },
          }),
        ),
      ],
    ),
  })),
}).pipe(Layer.provide(Layer.merge(SidebarAppLayer, navMenuLayer)))

export const renderSidebarContract = () =>
  renderToString(
    { block: SidebarServerBlock, layer: SidebarServerLayer },
    {},
    { isHydratable: true, buildId: 'sidebar-style-contract' },
  )
