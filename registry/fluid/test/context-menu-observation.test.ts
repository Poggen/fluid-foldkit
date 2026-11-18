// @vitest-environment happy-dom
import { Effect, Layer, Schema, Stream } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { ContextMenuBlock, layer as ContextMenuLayer } from '../src/context-menu.js'
import { DropdownResourcesLayer } from '../src/dropdown-resources.js'
import type { DropdownResources } from '../src/dropdown-resources.js'
import { expect, vi } from 'vitest'
import { it } from '@effect/vitest'
import { observeContextMenu } from '../src/context-menu-observation.js'
import type { ContextMenuOpening } from '../src/context-menu-observation.js'
it.live('preserves editable and filtered native menus and opens pointer and keyboard menus', () =>
  Effect.gen(function* () {
    const host = document.createElement('div')
    host.innerHTML =
      '<div id="context-area" tabindex="0"><input><span class="allowed">Target</span><span class="excluded">Other</span></div><button id="context-menu-trigger" aria-expanded="false"></button>'
    document.body.append(host)
    yield* Effect.addFinalizer(() => Effect.sync(() => host.remove()))
    const area = host.querySelector<HTMLElement>('#context-area')
    const anchor = host.querySelector<HTMLElement>('button')
    const target = host.querySelector<HTMLElement>('.allowed')
    if (!area || !anchor || !target) throw new Error('Missing context menu fixture')
    const openings: ContextMenuOpening[] = []
    const listener = vi.spyOn(area, 'addEventListener')
    yield* observeContextMenu({
      id: 'context',
      element: host,
      viewStateChanges: Stream.make('Live'),
    }).pipe(
      Stream.runForEach((opening) =>
        Effect.sync(() => {
          openings.push(opening)
        }),
      ),
      Effect.forkScoped,
    )
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(listener).toHaveBeenCalledWith('contextmenu', expect.any(Function))),
    )
    host.dataset.contextMenuFilter = '.allowed'
    for (const element of host.querySelectorAll('input, .excluded')) {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }
    const pointer = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 71,
      clientY: 83,
    })
    target.dispatchEvent(pointer)
    expect(pointer.defaultPrevented).toBe(true)
    expect(anchor.parentElement).toBe(document.body)
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(openings).toEqual([{ _tag: 'OpenedAt', x: 71, y: 83 }])),
    )
    delete host.dataset.contextMenuFilter
    area.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'F10',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    )
    yield* Effect.promise(() => vi.waitFor(() => expect(openings).toHaveLength(2)))
    const popupItem = document.createElement('button')
    document.body.append(popupItem)
    yield* Effect.addFinalizer(() => Effect.sync(() => popupItem.remove()))
    anchor.setAttribute('aria-expanded', 'true')
    popupItem.focus()
    anchor.setAttribute('aria-expanded', 'false')
    yield* Effect.promise(() => vi.waitFor(() => expect(document.activeElement).toBe(popupItem)))
    anchor.focus()
    expect(document.activeElement).toBe(area)
    host.dataset.contextMenuDisabled = 'true'
    const disabled = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    area.dispatchEvent(disabled)
    expect(disabled.defaultPrevented).toBe(false)
    host.dataset.contextMenuDisabled = 'false'
    area.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'touch',
        clientX: 41,
        clientY: 53,
        bubbles: true,
      }),
    )
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(openings).toHaveLength(3), { timeout: 1500 }),
    )
    area.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    area.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(openings[2]).toEqual({ _tag: 'OpenedAt', x: 41, y: 53 })
    anchor.remove()
  }).pipe(Effect.scoped),
)

const DisabledContextFixtureKey = Symbol('DisabledContextFixture')
const Fixture = Block.make('DisabledContextFixture', {
  key: DisabledContextFixtureKey,
  Model: Schema.Struct({ menu: ContextMenuBlock.Model, clicks: Schema.Natural }),
  Message: defineMessageUnion({ ClickedNative: {} }),
  InitArgs: Schema.Tuple([]),
  effects: Block.makeEffectsContract<never, DropdownResources>(),
  view: { kind: 'Element' },
})
const Menu = Fixture.makeRequiredFieldBinding(ContextMenuBlock, {
  field: 'menu',
  init: { contextToArgs: () => [{ id: 'disabled-region', disabled: true }] },
}).withOutMessagePolicy({
  fold: Fixture.makeOutMessageFold(ContextMenuBlock, { Events: Fixture.makeNoopStep }),
})
const FixtureComposition = Fixture.makeComposition({ bindings: [Menu] })
const fixtureLayer = Fixture.makeLayer({
  init: FixtureComposition.makeInit(() => ({ model: { clicks: 0 } })),
  update: FixtureComposition.makeUpdate({
    ClickedNative: Fixture.makeFieldsStep(() => ({ clicks: (clicks) => clicks + 1 })),
  }),
  view: FixtureComposition.makeView((model, h) =>
    h.div(
      [],
      [
        h.output([h.Id('native-clicks')], [String(model.clicks)]),
        h.block(
          Menu.embedView({
            slotId: 'menu',
            model: model.menu,
            viewInputs: {
              animate: (node) => node,
              trigger: (attributes) =>
                h.div(attributes, [
                  h.button(
                    [h.Id('native-button'), h.OnClick(Fixture.Message.ClickedNative())],
                    ['Native action'],
                  ),
                  h.input([h.Id('native-input'), h.Type('text')]),
                ]),
              content: () => [],
            },
          }),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(ContextMenuLayer))
it.live('disabled context invocation preserves descendant controls and omits popup semantics', () =>
  Effect.gen(function* () {
    const container = document.createElement('div')
    container.id = 'disabled-context-fixture'
    document.body.append(container)
    const app = Runtime.embed(
      Program.makeElement({ block: Fixture, layer: fixtureLayer, container }).provide(
        DropdownResourcesLayer(document, { registerBranch: () => Effect.void }),
      ),
    )
    yield* Effect.addFinalizer(() =>
      Effect.promise(app.dispose).pipe(Effect.andThen(Effect.sync(() => container.remove()))),
    )
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(document.getElementById('native-button')).not.toBeNull()),
    )
    const area = document.getElementById('disabled-region-area')
    const button = document.getElementById('native-button')
    const input = document.getElementById('native-input')
    if (
      !(area instanceof HTMLElement) ||
      !(button instanceof HTMLButtonElement) ||
      !(input instanceof HTMLInputElement)
    )
      throw new Error('Missing disabled context fixture')
    expect(button.closest('[aria-disabled=true]')).toBeNull()
    for (const name of ['aria-haspopup', 'aria-controls', 'aria-expanded', 'tabindex'])
      expect(area.hasAttribute(name)).toBe(false)
    expect(button.disabled).toBe(false)
    button.click()
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(document.getElementById('native-clicks')?.textContent).toBe('1')),
    )
    input.focus()
    expect(document.activeElement).toBe(input)
    for (const event of [
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true }),
    ]) {
      button.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(document.querySelector('[role=menu]')).toBeNull()
  }).pipe(Effect.scoped),
)
