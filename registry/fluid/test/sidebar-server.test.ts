import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { Window } from 'happy-dom'
import type { Html } from 'foldkit/html'
import { renderToString } from 'foldkit/experimental/server'
import { SidebarMenuSub } from '../src/sidebar-parts.js'
import { SidebarAppBlock, SidebarAppLayer } from '../src/sidebar-app.js'
import { NavMenuBlock, NavItemConfig, navMenuLayer } from '../src/nav-menu.js'
import { SettingsDialogBlock, SettingsDialogLayer } from '../src/dialog-sidebar.js'
import { MobileDrawerBlock, mobileDrawerLayer } from '../src/mobile-drawer.js'
import type { DialogResources } from '../src/dialog-resources.js'
import type { DropdownResources } from '../src/dropdown-resources.js'
import type { TooltipDom } from '../src/tooltip-native-public.js'
const Model = Schema.Struct({
  app: SidebarAppBlock.Model,
  secondaryApp: SidebarAppBlock.Model,
  primaryNav: NavMenuBlock.Model,
  secondaryNav: NavMenuBlock.Model,
  settings: SettingsDialogBlock.Model,
  drawer: MobileDrawerBlock.Model,
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
const Settings = SidebarServerBlock.makeRequiredFieldBinding(SettingsDialogBlock, {
  field: 'settings',
  init: { contextToArgs: () => [{ id: 'server-settings' }] },
}).withOutMessagePolicy({
  fold: SidebarServerBlock.makeOutMessageFold(SettingsDialogBlock, {
    OpenChanged: SidebarServerBlock.makeNoopStep,
    SectionChanged: SidebarServerBlock.makeNoopStep,
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
  init: { contextToArgs: () => [{ id: 'server-secondary-nav', items: navItems }] },
}).withOutMessagePolicy({
  fold: SidebarServerBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: SidebarServerBlock.makeNoopStep,
  }),
})
const Drawer = SidebarServerBlock.makeRequiredFieldBinding(MobileDrawerBlock, {
  field: 'drawer',
  init: { contextToArgs: () => [{ id: 'server-drawer' }] },
}).withOutMessagePolicy({
  fold: SidebarServerBlock.makeOutMessageFold(MobileDrawerBlock, {
    CloseRequested: SidebarServerBlock.makeNoopStep,
    OpenChanged: SidebarServerBlock.makeNoopStep,
  }),
})
const SidebarServerComposition = SidebarServerBlock.makeComposition({
  bindings: [App, SecondaryApp, PrimaryNav, SecondaryNav, Settings, Drawer],
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
        SidebarMenuSub(
          {
            open: false,
            animate: preserveNode,
            attributes: [h.Id('server-closed-submenu')],
            children: [h.li([], ['Retained branch content'])],
          },
          h,
        ),
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
                  [h.DataAttribute('app-inset', 'secondary')],
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
        h.block(
          Settings.embedView({
            slotId: 'settings',
            model: model.settings,
            viewInputs: {
              animate: preserveNode,
              highlight: preserveNode,
              switchAnimate: preserveNode,
            },
          }),
        ),
        h.block(
          Drawer.embedView({
            slotId: 'drawer',
            model: model.drawer,
            viewInputs: { animate: preserveNode, content: () => [] },
          }),
        ),
      ],
    ),
  })),
}).pipe(
  Layer.provide(
    Layer.mergeAll(SidebarAppLayer, navMenuLayer, SettingsDialogLayer, mobileDrawerLayer),
  ),
)
it.effect(
  'actual Sidebar inset owns one Nav per canonical instance and retains internal menus and Settings/Drawer SSR',
  () =>
    Effect.gen(function* rendersNativeSidebarCallbacks() {
      const rendered = yield* renderToString(
        { block: SidebarServerBlock, layer: SidebarServerLayer },
        {},
        { isHydratable: true, buildId: 'sidebar-server' },
      )
      expect(rendered.html).toContain('⇧⌘O')
      expect(rendered.html).toContain('Platform')
      expect(rendered.html).toContain('Retained branch content')
      expect(rendered.html).toMatch(
        /<ul(?=[^>]*id="server-closed-submenu")(?=[^>]*data-state="closed")(?=[^>]*aria-hidden="true")[^>]*>/u,
      )
      expect(rendered.html).toContain('aria-expanded="true"')
      expect(rendered.html.match(/data-app-inset="primary"/gu)).toHaveLength(1)
      expect(rendered.html.match(/data-app-inset="secondary"/gu)).toHaveLength(1)
      expect(rendered.html).toContain('Nested destination')
      expect(rendered.html).toContain('Inbox')
      expect(rendered.html).toContain('Notifications')
      const window = new Window()
      try {
        const document = window.document
        document.body.innerHTML = rendered.html
        for (const id of ['server-app', 'server-secondary-app']) {
          const desktopScroll = document.getElementById(`${id}-desktop-scroll`)
          expect(
            desktopScroll?.querySelector(
              '[data-slot="scroll-area-viewport"] [data-sidebar="content"]',
            ),
          ).toBeTruthy()
          expect(document.getElementById(`${id}-mobile-panel-scroll`)).toBeNull()
          const topbarTrigger = document.querySelector(
            `header > [data-sidebar-owner="${id}"][data-sidebar="trigger"]`,
          )
          expect(topbarTrigger).not.toBeNull()
        }
        const ids = [...document.querySelectorAll('[id]')].map((node) => node.id)
        expect(new Set(ids).size).toBe(ids.length)
        const primary = document.querySelector('[data-app-inset="primary"]')
        expect(primary).not.toBeNull()
        const subrow = primary?.querySelector('[data-sidebar="menu-sub-item"]')
        if (!(subrow instanceof window.HTMLElement)) throw new Error('Missing sidebar subrow')
        expect(subrow.style.getPropertyValue('--row-h')).toBe('24px')
        expect(window.getComputedStyle(subrow).marginInlineStart).toBe('24px')
        expect(primary?.querySelector('[data-sibling-badge="true"]')).not.toBeNull()
        expect(primary?.querySelector('[data-sidebar="menu-badge"]')?.textContent).toBe('2')
        const secondary = document.querySelector('[data-app-inset="secondary"]')
        expect(secondary).not.toBeNull()
        expect(secondary?.querySelector('[data-sibling-badge="false"]')).not.toBeNull()
        expect(secondary?.querySelector('[data-sidebar="menu-badge"]')).toBeNull()
        for (const { container, sidebar } of [
          { container: primary, sidebar: true },
          { container: secondary, sidebar: false },
        ]) {
          const enabled = container?.querySelector('[data-nav-index="0"]')
          if (!(enabled instanceof window.HTMLElement)) throw new Error('Missing enabled row')
          expect(enabled.getAttribute('aria-disabled')).toBeNull()
          for (const { index, tag } of [
            { index: 1, tag: 'A' },
            { index: 2, tag: 'BUTTON' },
          ]) {
            const row = container?.querySelector(`[data-nav-index="${index}"]`)
            if (!(row instanceof window.HTMLElement)) throw new Error('Missing disabled row')
            expect(row.tagName).toBe(tag)
            expect(row.getAttribute('aria-disabled')).toBe('true')
            expect(row.tabIndex).toBe(-1)
            expect(window.getComputedStyle(row).paddingInlineStart).toBe(sidebar ? '8px' : '28px')
            if (sidebar) {
              expect(row.style.getPropertyValue('--row-gutter')).toBe('64px')
              expect(row.style.getPropertyValue('--row-gutter-hover')).toBe('64px')
            } else {
              expect(window.getComputedStyle(row).paddingInlineEnd).toBe('36px')
            }
          }
        }
      } finally {
        window.close()
      }
    }),
)
