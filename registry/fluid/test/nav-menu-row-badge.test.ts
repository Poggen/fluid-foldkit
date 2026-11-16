// @vitest-environment node
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { expect } from 'vitest'
import { Window } from 'happy-dom'
import { NavMenuBlock, NavItemConfig, navMenuLayer } from '@foldkit-visuals/fluid/nav-menu'
import { SidebarMenuBadge } from '@foldkit-visuals/fluid/sidebar/parts'

const key = Symbol('NavMenuRowBadge')
const effects = Block.makeEffectsContract()
const Root = Block.make('NavMenuRowBadge', {
  key,
  Model: Schema.Struct({ menu: NavMenuBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Document' },
})
const Menu = Root.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'menu',
  init: {
    contextToArgs: () => [
      {
        id: 'row-badge-menu',
        activeSlug: '#search',
        items: [
          NavItemConfig.make({
            value: 'search',
            label: 'Search',
            href: '#search',
            disabled: false,
            status: null,
            badge: 'Old',
            level: 0,
          }),
          NavItemConfig.make({
            value: 'inbox',
            label: 'Inbox',
            href: '#inbox',
            disabled: false,
            status: null,
            badge: '4',
            level: 0,
          }),
          NavItemConfig.make({
            value: 'shortcut',
            label: 'Shortcut',
            href: '#shortcut',
            disabled: false,
            status: null,
            badge: null,
            level: 0,
          }),
        ],
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(NavMenuBlock, { Selected: Root.makeNoopStep }),
})
const Composition = Root.makeComposition({ bindings: [Menu] })
const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Sibling row badges',
    body: h.block(
      Menu.embedView({
        slotId: 'menu',
        model: model.menu,
        viewInputs: {
          sidebar: true,
          kind: 'action',
          animate: (node) => node,
          highlight: (node) => node,
          rowBadge: (item, active) =>
            item.value === 'search' || item.value === 'shortcut'
              ? [SidebarMenuBadge({ active, children: [h.kbd([], ['⌘']), h.kbd([], ['K'])] }, h)]
              : [],
        },
      }),
    ),
  })),
}).pipe(Layer.provide(navMenuLayer))

it.effect(
  'custom row badges remain siblings of checked buttons and retain the default badge gutter',
  () =>
    Effect.gen(function* () {
      const { html } = yield* renderToString({ block: Root, layer }, {}, { isHydratable: false })
      const window = new Window()
      try {
        const container = window.document.createElement('div')
        container.innerHTML = html
        const buttons = container.querySelectorAll('button[data-nav-index]')
        const search = buttons.item(0)
        const inbox = buttons.item(1)
        const customOnly = buttons.item(2)
        expect(buttons).toHaveLength(3)
        if (
          !(search instanceof window.HTMLButtonElement) ||
          !(inbox instanceof window.HTMLButtonElement) ||
          !(customOnly instanceof window.HTMLButtonElement)
        )
          throw new Error('Expected all three sidebar buttons')
        const badge = search.nextElementSibling

        expect(badge?.getAttribute('data-sidebar')).toBe('menu-badge')
        expect(badge?.parentElement).toBe(search.parentElement)
        expect(badge?.previousElementSibling).toBe(search)
        expect(container.querySelector('[data-sidebar=menu-actions]')).toBeNull()
        expect(badge?.querySelectorAll('kbd')).toHaveLength(2)
        expect(badge?.textContent).toBe('⌘K')
        expect(badge?.getAttribute('style')).toContain("'wght' 550, 'opsz' 18")
        expect(search.querySelector('[data-sidebar=menu-badge], kbd')).toBeNull()
        expect(inbox.querySelector('[data-sidebar=menu-badge]')).toBeNull()
        expect(inbox.nextElementSibling?.getAttribute('data-sidebar')).toBe('menu-badge')
        expect(inbox.nextElementSibling?.textContent).toBe('4')
        expect(container.textContent).not.toContain('Old')
        expect(search.style.getPropertyValue('--row-gutter')).toBe('36px')
        expect(inbox.style.getPropertyValue('--row-gutter')).toBe('36px')
        expect(customOnly.nextElementSibling?.getAttribute('data-sidebar')).toBe('menu-badge')
        expect(customOnly.nextElementSibling?.textContent).toBe('⌘K')
        expect(customOnly.style.getPropertyValue('--row-gutter')).toBe('36px')
      } finally {
        window.close()
      }
    }),
)
