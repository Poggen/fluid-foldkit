import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { Window } from 'happy-dom'
import { expect } from 'vitest'
import { SelectBlock, layer as SelectLayer } from '../src/select.js'
import { ComboboxBlock, layer as ComboboxLayer } from '../src/combobox.js'
import { CommandMenuBlock, CommandMenuLayer } from '../src/command-menu.js'
import type { DropdownResources } from '../src/dropdown-resources.js'
import type { DialogResources } from '../src/dialog-resources.js'
import { createPresentationContext } from '../src/presentation.js'
import { defaultIcons } from '../src/icons.js'
import type { Html } from 'foldkit/html'

const Options = Schema.Struct({
  compact: Schema.Boolean,
  mode: Schema.Literals([
    'typed',
    'item-only',
    'null-leading',
    'legacy',
    'null-items',
    'custom-content',
    'missing-icon',
  ]),
})
type Options = typeof Options.Type
const items = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
]
const Model = Schema.Struct({
  select: SelectBlock.Model,
  combo: ComboboxBlock.Model,
  command: CommandMenuBlock.Model,
  options: Options,
})
type Model = typeof Model.Type
const key = Symbol('TypedIconsRendering')
const effects = Block.makeEffectsContract<never, DropdownResources | DialogResources>()
const Rendering = Block.make('TypedIconsRendering', {
  key,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([Options]),
  effects,
  view: { kind: 'Document' },
})
const Select = Rendering.makeRequiredFieldBinding(SelectBlock, {
  field: 'select',
  init: { contextToArgs: () => [{ id: 'render-select', items, defaultValue: 'first' }] },
}).withOutMessagePolicy({
  fold: Rendering.makeOutMessageFold(SelectBlock, {
    Selected: Rendering.makeNoopStep,
    OpenChanged: Rendering.makeNoopStep,
  }),
})
const Combo = Rendering.makeRequiredFieldBinding(ComboboxBlock, {
  field: 'combo',
  init: { contextToArgs: () => [{ id: 'render-combo', items }] },
}).withOutMessagePolicy({
  fold: Rendering.makeOutMessageFold(ComboboxBlock, {
    Selected: Rendering.makeNoopStep,
    ValuesChanged: Rendering.makeNoopStep,
    CreateRequested: Rendering.makeNoopStep,
  }),
})
const Command = Rendering.makeRequiredFieldBinding(CommandMenuBlock, {
  field: 'command',
  init: { contextToArgs: () => [{ id: 'render-command', items }] },
}).withOutMessagePolicy({
  fold: Rendering.makeOutMessageFold(CommandMenuBlock, {
    Selected: Rendering.makeNoopStep,
    QueryChanged: Rendering.makeNoopStep,
  }),
})
const Composition = Rendering.makeComposition({ bindings: [Select, Combo, Command] })
const layer = Rendering.makeLayer({
  init: Composition.makeInit((options: Options) => ({ model: { options } })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => {
    const { mode, compact } = model.options
    const shared = {
      context: createPresentationContext({ size: compact ? 'compact' : 'default' }),
      animate: (node: Html) => node,
      itemIconFor: (item: { readonly value: string }) =>
        mode === 'missing-icon' && item.value === 'second' ? undefined : defaultIcons.palette,
      ...(mode === 'null-items' ? { renderIcon: () => null } : {}),
    }
    const fields = {
      ...shared,
      ...(mode === 'item-only' || mode === 'legacy' ? {} : { icon: defaultIcons.settings }),
      ...(mode === 'null-leading' ? { leading: null } : {}),
      ...(mode === 'legacy'
        ? { renderIcon: () => h.span([h.DataAttribute('legacy-icon', '')], ['Legacy icon']) }
        : {}),
    }
    return {
      title: 'Typed item icon rendering',
      body: h.main(
        [],
        [
          h.block(Select.embedView({ slotId: 'select', model: model.select, viewInputs: fields })),
          h.block(Combo.embedView({ slotId: 'combo', model: model.combo, viewInputs: fields })),
          h.block(
            Command.embedView({
              slotId: 'command',
              model: model.command,
              viewInputs: {
                ...shared,
                ...(mode === 'custom-content'
                  ? { renderItemContent: () => [h.span([], ['Custom content'])] }
                  : {}),
              },
            }),
          ),
        ],
      ),
    }
  }),
}).pipe(Layer.provide(Layer.mergeAll(SelectLayer, ComboboxLayer, CommandMenuLayer)))
const assertRendered = (options: Options, assertion: (document: Window['document']) => void) =>
  Effect.gen(function* renderTypedIcons() {
    const { html } = yield* renderToString(
      { block: Rendering, layer },
      { Flags: Options },
      { flags: options, isHydratable: false },
    )
    const window = new Window()
    try {
      window.document.body.innerHTML = html
      assertion(window.document)
    } finally {
      window.close()
    }
  })

for (const compact of [false, true]) {
  it.effect(`typed field and item icons inherit presentation (${compact})`, () =>
    assertRendered({ compact, mode: 'typed' }, (document) => {
      for (const id of ['render-select', 'render-combo']) {
        const icons = document.querySelectorAll(`#${id} .lucide-settings`)
        expect(icons).toHaveLength(1)
        expect(icons[0]?.getAttribute('width')).toBe(compact ? '14' : '16')
        expect(icons[0]?.getAttribute('stroke-width')).toBe('1.5')
      }
      const active = document.querySelector('[data-command-value="first"] .lucide-palette')
      const inactive = document.querySelector('[data-command-value="second"] .lucide-palette')
      expect(active?.getAttribute('width')).toBe(compact ? '14' : '16')
      expect(active?.getAttribute('stroke-width')).toBe('2')
      expect(inactive?.getAttribute('stroke-width')).toBe('1.5')
      expect(document.querySelectorAll('#render-command .lucide-palette')).toHaveLength(2)
    }),
  )
}
it.effect('item-only projections do not create field or selected-trigger icons', () =>
  assertRendered({ compact: false, mode: 'item-only' }, (document) => {
    expect(document.querySelector('#render-select [role="combobox"]')?.textContent).toContain(
      'First',
    )
    expect(document.querySelector('#render-select .lucide-palette')).toBeNull()
    expect(document.querySelector('#render-combo .lucide-palette')).toBeNull()
    expect(document.querySelector('.lucide-settings')).toBeNull()
    expect(document.querySelectorAll('#render-command .lucide-palette')).toHaveLength(2)
  }),
)
it.effect('null leading suppresses typed field icons', () =>
  assertRendered({ compact: false, mode: 'null-leading' }, (document) => {
    expect(document.querySelector('.lucide-settings')).toBeNull()
    expect(document.querySelector('#render-select [role="combobox"]')?.textContent).toContain(
      'First',
    )
  }),
)
it.effect('legacy raw renderer still supplies the selected Select trigger', () =>
  assertRendered({ compact: false, mode: 'legacy' }, (document) => {
    expect(document.querySelectorAll('#render-select [data-legacy-icon]')).toHaveLength(1)
    expect(document.querySelector('#render-combo [data-legacy-icon]')).toBeNull()
  }),
)
it.effect('null raw Command icons suppress typed item defaults without removing rows', () =>
  assertRendered({ compact: false, mode: 'null-items' }, (document) => {
    expect(document.querySelector('#render-command .lucide-palette')).toBeNull()
    expect(document.querySelectorAll('#render-command [role="option"]')).toHaveLength(2)
  }),
)
it.effect('custom Command content retains ownership over default icons and text', () =>
  assertRendered({ compact: false, mode: 'custom-content' }, (document) => {
    expect(document.querySelector('#render-command .lucide-palette')).toBeNull()
    const rows = document.querySelectorAll('#render-command [role="option"]')
    expect(rows).toHaveLength(2)
    expect([...rows].map((row) => row.textContent)).toEqual(['Custom content', 'Custom content'])
  }),
)
it.effect('an omitted per-item icon leaves other typed icons intact', () =>
  assertRendered({ compact: false, mode: 'missing-icon' }, (document) => {
    expect(document.querySelectorAll('#render-command .lucide-palette')).toHaveLength(1)
    expect(document.querySelector('[data-command-value="first"] .lucide-palette')).not.toBeNull()
    expect(document.querySelector('[data-command-value="second"] .lucide-palette')).toBeNull()
  }),
)
