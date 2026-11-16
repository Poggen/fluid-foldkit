import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { Window } from 'happy-dom'
import { expect } from 'vitest'
import { CommandMenuBlock, CommandMenuLayer } from '../src/command-menu.js'
import type { CommandMenuViewInputs } from '../src/command-menu.js'
import { defaultIcons } from '../src/icons.js'

const items = [
  {
    value: 'search',
    label: 'Search everywhere',
    description: 'Files, people, messages',
    shortcut: 'mod+k',
  },
  { value: 'settings', label: 'Settings', description: 'Account and workspace' },
]
const Mode = Schema.Literals([
  'default',
  'null-row',
  'custom-content',
  'custom-label',
  'empty-label',
])
type Mode = typeof Mode.Type
const RenderingKey = Symbol('CommandMenuSourceRendering')
const RenderingBlock = Block.make('CommandMenuSourceRendering', {
  key: RenderingKey,
  Model: Schema.Struct({ menu: CommandMenuBlock.Model, mode: Mode }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([Mode]),
  ChildInitContext: Mode,
  view: { kind: 'Document' },
})
const Menu = RenderingBlock.makeRequiredFieldBinding(CommandMenuBlock, {
  field: 'menu',
  init: {
    contextToArgs: (mode) => [
      {
        id: `render-${mode}`,
        items,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: RenderingBlock.makeOutMessageFold(CommandMenuBlock, {
    Selected: RenderingBlock.makeNoopStep,
    QueryChanged: RenderingBlock.makeNoopStep,
  }),
})
const Composition = RenderingBlock.makeComposition({ bindings: [Menu] })
const renderingLayer = RenderingBlock.makeLayer({
  init: Composition.makeInit((mode: Mode) => ({ model: { mode }, childInitContext: mode })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => {
    const viewInputs: CommandMenuViewInputs = {
      animate: (node) => node,
      itemIconFor: () => defaultIcons.palette,
      ...(model.mode === 'custom-label' || model.mode === 'custom-content'
        ? {
            renderItemLabel: () => [h.span([h.DataAttribute('custom-label', '')], ['Label slot'])],
          }
        : model.mode === 'empty-label'
          ? { renderItemLabel: () => [] }
          : {}),
      ...(model.mode === 'null-row'
        ? {
            renderItem: (item, _index, defaultView) =>
              item.value === 'search' ? null : defaultView,
          }
        : {}),
      ...(model.mode === 'custom-content'
        ? {
            renderItemContent: () => [h.span([], ['Custom label'])],
          }
        : {}),
    }
    return {
      title: 'Command menu source rendering',
      body: h.block(Menu.embedView({ slotId: 'menu', model: model.menu, viewInputs })),
    }
  }),
}).pipe(Layer.provide(CommandMenuLayer))

// SSR owns rendering without executing the private child Mount handlers.
// Selection is covered by command-menu-keyboard-order.test.ts and the matching showcase e2e.
const assertRendered = (mode: Mode, assertion: (document: Window['document']) => void) =>
  Effect.gen(function* renderCommandMenu() {
    const { html } = yield* renderToString(
      { block: RenderingBlock, layer: renderingLayer },
      { Flags: Mode },
      { flags: mode, isHydratable: false },
    )
    const window = new Window()
    try {
      window.document.body.innerHTML = html
      assertion(window.document)
    } finally {
      window.close()
    }
  })

it.effect('an absent row renderer keeps the default option content', () =>
  assertRendered('default', (document) => {
    const search = document.querySelector('[role="option"][data-command-value="search"]')
    const settings = document.querySelector('[role="option"][data-command-value="settings"]')
    expect(search).not.toBeNull()
    expect(search?.textContent).toContain('Search everywhere')
    expect(settings).not.toBeNull()
    expect(settings?.textContent).toContain('Settings')
    expect(settings?.textContent).toContain('Account and workspace')
  }),
)

it.effect('an explicit null custom row suppresses its default option', () =>
  assertRendered('null-row', (document) => {
    expect(document.querySelector('[data-command-value="search"]')).toBeNull()
    expect(document.querySelector('[data-command-value="settings"]')?.textContent).toContain(
      'Settings',
    )
    const listbox = document.querySelector('[role="listbox"]')
    expect(listbox).not.toBeNull()
    expect(listbox?.textContent).not.toContain('Search everywhere')
  }),
)

it.effect('custom row content replaces label, icon and shortcut even with a label renderer', () =>
  assertRendered('custom-content', (document) => {
    const option = document.querySelector('[role="option"][data-command-value="search"]')
    expect(option).not.toBeNull()
    expect(option?.textContent).toBe('Custom label')
    expect(option?.querySelector('[data-custom-label]')).toBeNull()
    expect(option?.querySelector('.lucide-palette')).toBeNull()
    expect(option?.querySelector('[data-slot="command-menu-shortcut"]')).toBeNull()
    const listbox = document.querySelector('[role="listbox"]')
    expect(listbox).not.toBeNull()
    expect(listbox?.textContent).not.toContain('Search everywhere')
  }),
)

it.effect('custom labels keep the component-owned icon, active stroke and shortcut', () =>
  assertRendered('custom-label', (document) => {
    const option = document.querySelector('[role="option"][data-command-value="search"]')
    const icon = option?.querySelector('.lucide-palette')
    expect(option).not.toBeNull()
    expect(option?.querySelector('[data-custom-label]')?.textContent).toBe('Label slot')
    expect(option?.textContent).not.toContain('Search everywhere')
    expect(option?.textContent).not.toContain('Files, people, messages')
    expect(icon?.getAttribute('width')).toBe('16')
    expect(icon?.getAttribute('stroke-width')).toBe('2')
    expect(
      document
        .querySelector('[data-command-value="settings"] .lucide-palette')
        ?.getAttribute('stroke-width'),
    ).toBe('1.5')
    expect(option?.querySelectorAll('[data-slot="command-menu-shortcut"]')).toHaveLength(1)
    expect(option?.querySelector('[data-slot="command-menu-shortcut"]')?.textContent).toContain('K')
  }),
)

it.effect('an empty label result suppresses default text while retaining icon and shortcut', () =>
  assertRendered('empty-label', (document) => {
    const option = document.querySelector('[role="option"][data-command-value="search"]')
    expect(option).not.toBeNull()
    expect(option?.textContent).not.toContain('Search everywhere')
    expect(option?.textContent).not.toContain('Files, people, messages')
    expect(option?.querySelectorAll('.lucide-palette')).toHaveLength(1)
    expect(option?.querySelectorAll('[data-slot="command-menu-shortcut"]')).toHaveLength(1)
    expect(option?.children).toHaveLength(2)
  }),
)
