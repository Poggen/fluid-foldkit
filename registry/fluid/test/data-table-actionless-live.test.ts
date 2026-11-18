// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import { DataTableActionsBlock, DataTableActionsLayer } from '../src/data-table-actions.js'
import type { DialogResources } from '../src/dialog.js'
import type { DropdownResources } from '../src/dropdown-resources.js'
import { createPresentationContext } from '../src/presentation.js'
import { createSelectLayer } from '../src/select.js'

const FixtureKey = Symbol('ActionlessTableFixture')
const Fixture = Block.make('ActionlessTableFixture', {
  key: FixtureKey,
  Model: Schema.Struct({ actions: DataTableActionsBlock.Model, checked: Schema.Boolean }),
  Message: defineMessageUnion({ Toggled: {}, ConfirmMove: {} }),
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<never, DialogResources | DropdownResources>(),
})
const RawActions = Fixture.makeRequiredFieldBinding(DataTableActionsBlock, {
  field: 'actions',
  init: {
    contextToArgs: () => [
      { id: 'actionless-actions', selectedIds: ['a'], rowActions: [], selectionActions: [] },
    ],
  },
})
const Actions = RawActions.withOutMessagePolicy({
  fold: Fixture.makeOutMessageFold(DataTableActionsBlock, {
    ActionSelected: ({ action }) =>
      action === 'clear-selection'
        ? Update.combineSteps([
            Fixture.makeFieldsStep(() => ({ checked: () => false })),
            RawActions.requestConfigure({ selectedIds: [], disabled: false, selectable: true }),
          ])
        : Fixture.makeNoopStep(),
    MoveConfirmed: () => RawActions.requestConfirmMove({ open: false }),
    MoveCancelled: () => RawActions.requestConfirmMove({ open: false }),
  }),
})
const Composition = Fixture.makeComposition({ bindings: [Actions] })
const fixtureLayer = Fixture.makeLayer({
  init: Composition.makeInit(() => ({ model: { checked: true } })),
  update: Composition.makeUpdate({
    Toggled: Fixture.makeStep((model) =>
      Update.combineSteps([
        Fixture.makeFieldsStep(() => ({ checked: () => !model.checked })),
        RawActions.requestConfigure({
          selectedIds: model.checked ? [] : ['a'],
          disabled: false,
          selectable: true,
        }),
      ]),
    ),
    ConfirmMove: RawActions.requestConfirmMove({ open: true }),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button(
          [h.Id('actionless-confirm'), h.OnClick(Fixture.Message.ConfirmMove())],
          ['Move sorted row'],
        ),
        h.block(
          Actions.embedView({
            slotId: 'actions',
            model: model.actions,
            viewInputs: {
              context: createPresentationContext({ reducedMotion: 'always' }),
              content: (attributes) =>
                h.div(attributes, [
                  h.table(
                    [],
                    [
                      h.tbody(
                        [],
                        [
                          h.tr(
                            [
                              h.DataAttribute('grid-body-row', ''),
                              h.DataAttribute('grid-row', 'a'),
                            ],
                            [
                              h.td(
                                [],
                                [
                                  h.input([
                                    h.Id('actionless-select'),
                                    h.Type('checkbox'),
                                    h.AriaLabel('Select row a'),
                                    h.Checked(model.checked),
                                    h.OnClick(Fixture.Message.Toggled()),
                                  ]),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ]),
            },
          }),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(DataTableActionsLayer))

it.live(
  'keeps actionless table selection enabled while retaining the selection bar and move dialog',
  () =>
    Effect.gen(function* () {
      const nativeAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
      Reflect.deleteProperty(Element.prototype, 'animate')
      const container = document.createElement('div')
      container.id = 'actionless-table-fixture'
      document.body.append(container)
      const app = Runtime.embed(
        Program.makeElement({ block: Fixture, layer: fixtureLayer, container }).provide(
          createSelectLayer(document),
        ),
      )
      yield* Effect.addFinalizer(() =>
        Effect.promise(app.dispose).pipe(
          Effect.andThen(
            Effect.sync(() => {
              document.getElementById('actionless-table-fixture')?.remove()
              container.remove()
              if (nativeAnimate) Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
            }),
          ),
        ),
      )
      const checkbox = () => {
        const input = document.getElementById('actionless-select')
        if (!(input instanceof HTMLInputElement)) throw new Error('Missing selection input')
        return input
      }
      yield* Effect.promise(() => vi.waitFor(() => expect(checkbox()).toBeTruthy()))
      const root = () => {
        const element = document.getElementById('actionless-actions')
        if (!element) throw new Error('Missing live actions root')
        return element
      }
      const original = checkbox()
      expect(original.closest('[aria-disabled=true], [inert]')).toBeNull()
      const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      original.dispatchEvent(context)
      expect(context.defaultPrevented).toBe(false)
      expect(root().querySelector('[role=menu]')).toBeNull()
      yield* Effect.promise(() =>
        vi.waitFor(() =>
          expect(root().querySelector('[data-grid-clear-selection]')).not.toBeNull(),
        ),
      )
      const clear = root().querySelector<HTMLButtonElement>('[data-grid-clear-selection]')
      if (!clear) throw new Error('Missing selection bar')
      clear.click()
      yield* Effect.promise(() =>
        vi.waitFor(() => {
          expect(checkbox().checked).toBe(false)
          const bar = root().querySelector<HTMLElement>('[data-grid-selection-bar]')
          expect(bar ? getComputedStyle(bar).opacity : '0').toBe('0')
        }),
      )
      checkbox().click()
      yield* Effect.promise(() =>
        vi.waitFor(() => {
          expect(checkbox().checked).toBe(true)
          const bar = root().querySelector<HTMLElement>('[data-grid-selection-bar]')
          expect(bar ? getComputedStyle(bar).opacity : '0').toBe('1')
        }),
      )
      expect(checkbox()).toBe(original)
      expect(checkbox().isConnected).toBe(true)
      document.getElementById('actionless-confirm')?.click()
      yield* Effect.promise(() =>
        vi.waitFor(() =>
          expect(document.querySelector('dialog[open]')?.textContent).toContain('Remove sorting?'),
        ),
      )
      const cancel = [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find(
        (button) => button.textContent === 'Cancel',
      )
      if (!cancel) throw new Error('Missing cancellation')
      cancel.click()
      yield* Effect.promise(() =>
        vi.waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull()),
      )
      expect(checkbox()).toBe(original)
      expect(checkbox().isConnected).toBe(true)
      expect(checkbox().checked).toBe(true)
      expect(checkbox().closest('[aria-disabled=true], [inert]')).toBeNull()
    }).pipe(Effect.scoped),
)
