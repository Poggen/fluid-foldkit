// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import { it } from '@effect/vitest'
import { DataTableActionsBlock, DataTableActionsLayer } from '../src/data-table-actions.js'
import type { DialogResources } from '../src/dialog.js'
import type { DropdownResources } from '../src/dropdown-resources.js'
import { createPresentationContext } from '../src/presentation.js'
import { createSelectLayer } from '../src/select.js'

const FixtureKey = Symbol('DataTableActionsFixture')
const Fixture = Block.make('DataTableActionsFixture', {
  key: FixtureKey,
  Model: Schema.Struct({ actions: DataTableActionsBlock.Model, last: Schema.String }),
  Message: defineMessageUnion({ AskedToMove: {} }),
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<never, DialogResources | DropdownResources>(),
})
const RawActions = Fixture.makeRequiredFieldBinding(DataTableActionsBlock, {
  field: 'actions',
  init: {
    contextToArgs: () => [
      {
        id: 'actions',
        selectedIds: ['a', 'b'],
        rowActions: [{ value: 'archive', label: 'Archive row' }],
        selectionActions: [{ value: 'export', label: 'Export selected rows' }],
      },
    ],
  },
})
const Actions = RawActions.withOutMessagePolicy({
  fold: Fixture.makeOutMessageFold(DataTableActionsBlock, {
    MoveConfirmed: () =>
      Fixture.makeStep(() =>
        Update.combineSteps([
          Fixture.makeFieldsStep(() => ({ last: () => 'move-confirmed' })),
          RawActions.requestConfirmMove({ open: false }),
        ]),
      ),
    MoveCancelled: () =>
      Fixture.makeStep(() =>
        Update.combineSteps([
          Fixture.makeFieldsStep(() => ({ last: () => 'move-cancelled' })),
          RawActions.requestConfirmMove({ open: false }),
        ]),
      ),
    ActionSelected: ({ action, ids }) =>
      Fixture.makeStep(() =>
        Update.combineSteps([
          Fixture.makeFieldsStep(() => ({ last: () => `${action}:${ids.join(',')}` })),
          ...(action === 'clear-selection'
            ? [RawActions.requestConfigure({ selectedIds: [], disabled: false, selectable: true })]
            : []),
        ]),
      ),
  }),
})
const Composition = Fixture.makeComposition({ bindings: [Actions] })
const fixtureLayer = Fixture.makeLayer({
  init: Composition.makeInit(() => ({ model: { last: '' } })),
  update: Composition.makeUpdate({ AskedToMove: RawActions.requestConfirmMove({ open: true }) }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.output([h.Id('action-result')], [model.last]),
        h.button(
          [h.Id('confirm-move'), h.OnClick(Fixture.Message.AskedToMove())],
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
                                  h.button(
                                    [h.Id('row-action'), h.DataAttribute('grid-row-action', 'a')],
                                    ['Row actions'],
                                  ),
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
const element = (selector: string) => {
  const node = document.querySelector<HTMLElement>(selector)
  if (!node) throw new Error(`Missing action fixture: ${selector}`)
  return node
}
it.live('runs custom row actions and selected-row keyboard actions through native menus', () =>
  Effect.gen(function* () {
    const nativeAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
    Reflect.deleteProperty(Element.prototype, 'animate')
    const container = document.createElement('div')
    container.id = 'data-table-actions-fixture'
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
            container.remove()
            if (nativeAnimate) Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
          }),
        ),
      ),
    )
    yield* Effect.promise(() => vi.waitFor(() => expect(element('#row-action')).toBeTruthy()))
    element('#row-action').click()
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(element('[role=menuitem]').textContent).toContain('Archive row')),
    )
    yield* Effect.promise(() =>
      vi.waitFor(() => {
        document.querySelector<HTMLElement>('[role=menuitem]')?.click()
        expect(element('#action-result').textContent).toBe('archive:a')
      }),
    )
    element('#row-action').focus()
    const shortcut = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
    element('#row-action').dispatchEvent(shortcut)
    expect(shortcut.defaultPrevented).toBe(true)
    yield* Effect.promise(() =>
      vi.waitFor(() =>
        expect(element('[role=option]').textContent).toContain('Export selected rows'),
      ),
    )
    element('[role=option]').click()
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(element('#action-result').textContent).toBe('export:a,b')),
    )
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull()),
    )
    element('[data-grid-clear-selection]').click()
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(element('#action-result').textContent).toBe('clear-selection:a,b')),
    )
    const unbound = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
    element('#row-action').dispatchEvent(unbound)
    expect(unbound.defaultPrevented).toBe(false)
    element('#confirm-move').click()
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(element('dialog[open]').textContent).toContain('Remove sorting?')),
    )
    const cancel = [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find(
      (button) => button.textContent === 'Cancel',
    )
    if (!cancel) throw new Error('Missing move cancellation')
    cancel.click()
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(element('#action-result').textContent).toBe('move-cancelled')),
    )
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull()),
    )
    element('#confirm-move').click()
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(element('dialog[open]').textContent).toContain('Remove sorting?')),
    )
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find(
      (button) => button.textContent === 'Remove sorting',
    )
    if (!confirm) throw new Error('Missing move confirmation')
    confirm.click()
    yield* Effect.promise(() =>
      vi.waitFor(() => expect(element('#action-result').textContent).toBe('move-confirmed')),
    )
  }).pipe(Effect.scoped),
)
