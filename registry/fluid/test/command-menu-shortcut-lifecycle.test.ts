// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Option, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect } from 'vitest'
import { CommandMenuDialogBlock, CommandMenuDialogLayer } from '../src/command-menu-dialog.js'
import { DialogResourcesLayer, isDialogOpen } from '../src/dialog.js'
import type { DialogResources } from '../src/dialog.js'

const Message = defineMessageUnion({ ChangedShortcut: { shortcut: Schema.NullOr(Schema.String) } })
const FixtureKey = Symbol('CommandShortcutFixture')
const Fixture = Block.make('CommandShortcutFixture', {
  key: FixtureKey,
  Model: Schema.Struct({ menu: CommandMenuDialogBlock.Model }),
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<never, DialogResources>(),
})
const Menu = Fixture.makeRequiredFieldBinding(CommandMenuDialogBlock, {
  field: 'menu',
  init: {
    contextToArgs: () => [
      {
        id: 'dynamic-shortcut',
        shortcut: 'mod+k',
        modal: false,
        items: [{ value: 'open', label: 'Open document' }],
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Fixture.makeOutMessageFold(CommandMenuDialogBlock, {
    OpenChanged: Fixture.makeNoopStep,
    QueryChanged: Fixture.makeNoopStep,
    Selected: Fixture.makeNoopStep,
  }),
})
const Composition = Fixture.makeComposition({ bindings: [Menu] })
const fixtureLayer = Fixture.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({
    ChangedShortcut: Fixture.makeStep.fromMessage(
      ({ shortcut }: typeof Message.ChangedShortcut.Type) =>
        Menu.requestShortcut({ shortcut: Option.fromNullOr(shortcut) }),
    ),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button(
          [h.Id('use-j'), h.OnClick(Message.ChangedShortcut({ shortcut: 'mod+j' }))],
          ['Use J'],
        ),
        h.button(
          [h.Id('use-k'), h.OnClick(Message.ChangedShortcut({ shortcut: 'mod+k' }))],
          ['Use K'],
        ),
        h.button(
          [h.Id('disable-shortcut'), h.OnClick(Message.ChangedShortcut({ shortcut: null }))],
          ['Disable'],
        ),
        h.output(
          [h.Id('shortcut-state')],
          [Option.getOrElse(model.menu.shortcut, () => 'disabled')],
        ),
        h.output([h.Id('open-state')], [String(isDialogOpen(model.menu.dialog))]),
        h.block(
          Menu.embedView({
            slotId: 'menu',
            model: model.menu,
            viewInputs: { animate: (node) => node },
          }),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(CommandMenuDialogLayer))

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced('20 millis') }))
const element = (selector: string) => {
  const node = document.querySelector<HTMLElement>(selector)
  if (!node) throw new Error(`Missing shortcut fixture element: ${selector}`)
  return node
}
const press = (key: string) => {
  const event = new KeyboardEvent('keydown', {
    key,
    metaKey: true,
    bubbles: true,
    cancelable: true,
  })
  document.body.dispatchEvent(event)
  return event
}

it.live(
  'changing the shortcut replaces the live key listener without replacing the open menu',
  () =>
    Effect.gen(function* () {
      const container = document.createElement('div')
      container.id = 'shortcut-lifecycle-fixture'
      document.body.append(container)
      const app = Runtime.embed(
        Program.makeElement({ block: Fixture, layer: fixtureLayer, container }).provide(
          DialogResourcesLayer(document),
        ),
      )
      yield* Effect.addFinalizer(() =>
        Effect.promise(app.dispose).pipe(Effect.andThen(Effect.sync(() => container.remove()))),
      )
      yield* eventually(() => expect(element('#shortcut-state').textContent).toBe('mod+k'))
      yield* eventually(() => expect(press('k').defaultPrevented).toBe(true))
      yield* eventually(() => expect(element('#open-state').textContent).toBe('true'))
      const input = element('#dynamic-shortcut-input')
      if (!(input instanceof HTMLInputElement)) throw new Error('Expected command menu input')
      input.value = 'document'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      element('#use-j').click()
      yield* eventually(() => expect(element('#shortcut-state').textContent).toBe('mod+j'))
      expect(element('#dynamic-shortcut-input')).toBe(input)
      expect(input.value).toBe('document')
      expect(element('#open-state').textContent).toBe('true')
      expect(press('k').defaultPrevented).toBe(false)
      expect(press('j').defaultPrevented).toBe(true)
      yield* eventually(() => expect(element('#open-state').textContent).toBe('false'))
      element('#disable-shortcut').click()
      yield* eventually(() => expect(element('#shortcut-state').textContent).toBe('disabled'))
      expect(press('j').defaultPrevented).toBe(false)
      expect(press('k').defaultPrevented).toBe(false)
      element('#use-k').click()
      yield* eventually(() => expect(element('#shortcut-state').textContent).toBe('mod+k'))
      expect(press('j').defaultPrevented).toBe(false)
      expect(press('k').defaultPrevented).toBe(true)
      yield* eventually(() => expect(element('#open-state').textContent).toBe('true'))
    })
      .pipe(Effect.scoped)
      .pipe(
        Effect.andThen(
          Effect.sync(() => {
            expect(press('k').defaultPrevented).toBe(false)
            expect(press('j').defaultPrevented).toBe(false)
          }),
        ),
      ),
)
