import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Option, Schema } from 'effect'
import { Story } from 'foldkit'
import { FinishExit } from '../src/dropdown-composition.js'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'
import { DropdownMenuBlock, menuLayer } from '../src/dropdown.js'
import {
  DropdownControllerBlock as Dropdown,
  layer as controllerLayer,
} from '../src/dropdown-controller.js'
import { renderToString } from 'foldkit/experimental/server'
import { DropdownFixture, DropdownFixtureLayer } from './dropdown-parent.js'
import type { DropdownRow } from '../src/dropdown-state.js'

const controllerSubject = { block: Dropdown, layer: controllerLayer }

const menuSubject = {
  block: DropdownMenuBlock,
  layer: menuLayer.pipe(Layer.provide(DropdownResourcesServerLayer)),
}

const fixtureSubject = { block: DropdownFixture, layer: DropdownFixtureLayer }

const rows: ReadonlyArray<DropdownRow> = [
  {
    id: 'apple',
    index: 4,
    label: 'Apple',
    disabled: false,
    available: true,
    kind: 'action',
    checked: false,
    closeOnClick: true,
  },
  {
    id: 'apricot',
    index: 9,
    label: 'Apricot',
    disabled: true,
    available: true,
    kind: 'action',
    checked: false,
    closeOnClick: true,
  },
  {
    id: 'banana',
    index: -0.5,
    label: 'Banana',
    disabled: false,
    available: true,
    kind: 'checkbox',
    checked: true,
    closeOnClick: false,
  },
]

test.effect(
  'controlled rejection emits the request and retains defaultOpen when control is released',
  () =>
    Story.story(
      controllerSubject,
      Story.init({ id: 'controlled', open: false, defaultOpen: true }),
      Story.inMessage(Dropdown.InMessage.RequestedOpen({ open: true })),
      Story.expectOutMessage(Dropdown.OutMessage.OpenChanged({ open: true })),
      Story.model((m) => {
        expect(m.phase).toBe('absent')
      }),
      Story.inMessage(Dropdown.InMessage.RequestedOpen({ open: false })),
      Story.model((m) => {
        expect(m.internalOpen).toBe(true)
      }),
      Story.inMessage(Dropdown.InMessage.RequestedControlledOpen({ control: Option.none() })),
      Story.model((m) => {
        expect(m.phase).toBe('open')
      }),
      Story.Command.expectNone(),
    ),
)

test.effect('a late exit cannot unmount a reopened popup or a later closing generation', () =>
  Effect.gen(function* () {
    const closed = yield* Story.story(
      controllerSubject,
      Story.init({ id: 'exit', defaultOpen: true }),
      Story.inMessage(Dropdown.InMessage.RequestedOpen({ open: false })),
    )
    const closingAgain = yield* Story.story(
      controllerSubject,
      Story.given(closed),
      Story.inMessage(Dropdown.InMessage.RequestedOpen({ open: true })),
      Story.inMessage(
        Dropdown.InMessage.InformedOfExitCompletion({ generation: closed.generation }),
      ),
      Story.model((m) => {
        expect(m.phase).toBe('open')
      }),
      Story.inMessage(Dropdown.InMessage.RequestedOpen({ open: false })),
      Story.inMessage(
        Dropdown.InMessage.InformedOfExitCompletion({ generation: closed.generation }),
      ),
      Story.model((m) => {
        expect(m.phase).toBe('closing')
      }),
    )
    yield* Story.story(
      controllerSubject,
      Story.given(closingAgain),
      Story.inMessage(
        Dropdown.InMessage.InformedOfExitCompletion({ generation: closingAgain.generation }),
      ),
      Story.model((m) => {
        expect(m.phase).toBe('absent')
      }),
      Story.Command.expectNone(),
    )
  }),
)

test.effect(
  'DOM ordering and identity drive focus after reorder and disabled rows follow the primitive flavor',
  () =>
    Story.story(
      controllerSubject,
      Story.init({ id: 'rows' }),
      Story.inMessage(Dropdown.InMessage.InformedOfRows({ rows })),
      Story.inMessage(Dropdown.InMessage.InformedOfFocus({ id: Option.some('apple') })),
      Story.inMessage(
        Dropdown.InMessage.RequestedNavigate({ key: 'ArrowDown', searchId: Option.none() }),
      ),
      Story.expectOutMessage(Dropdown.OutMessage.FocusRequested({ id: 'apricot' })),
      Story.inMessage(
        Dropdown.InMessage.InformedOfRows({
          rows: [rows[2], rows[0]].filter((row): row is DropdownRow => row !== undefined),
        }),
      ),
      Story.model((m) => {
        expect(Option.getOrUndefined(m.focusedId)).toBe('apple')
      }),
      Story.inMessage(
        Dropdown.InMessage.RequestedNavigate({ key: 'ArrowDown', searchId: Option.none() }),
      ),
      Story.expectOutMessage(Dropdown.OutMessage.FocusRequested({ id: 'banana' })),
      Story.inMessage(Dropdown.InMessage.InformedOfRows({ rows: [] })),
      Story.model((m) => {
        expect(Option.isNone(m.focusedId)).toBe(true)
      }),
      Story.Command.expectNone(),
    ),
)

test.effect(
  'checkbox activation leaves checked authority with the consumer and preserves genuine numeric codec values',
  () =>
    Effect.gen(function* () {
      const configured = yield* Story.story(
        controllerSubject,
        Story.init({ id: 'codec' }),
        Story.inMessage(Dropdown.InMessage.InformedOfRows({ rows })),
        Story.inMessage(
          Dropdown.InMessage.RequestedSelection({
            selection: {
              checkedIndex: Option.some(-0.5),
              checkedIndices: Option.some([-1, -0.5, Infinity, Number.NaN]),
            },
          }),
        ),
      )
      const codec = Schema.fromJsonString(Dropdown.Model)
      const restored = yield* Schema.decodeEffect(codec)(
        yield* Schema.encodeEffect(codec)(configured),
      )
      expect(Option.getOrUndefined(restored.checkedIndices)).toEqual([
        -1,
        -0.5,
        Infinity,
        Number.NaN,
      ])
      yield* Story.story(
        controllerSubject,
        Story.given(restored),
        Story.inMessage(Dropdown.InMessage.RequestedActivate({ id: 'banana' })),
        Story.expectOutMessage(
          Dropdown.OutMessage.Activated({ id: 'banana', index: -0.5, close: false, root: false }),
        ),
        Story.model((m) => {
          expect(m.checkedIndices).toEqual(restored.checkedIndices)
        }),
        Story.inMessage(Dropdown.InMessage.RequestedActivate({ id: 'apricot' })),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
      )
    }),
)

test.effect(
  'registered modal parent routes only public Dropdown operations and preserves JSON state',
  () =>
    Effect.gen(function* () {
      const closed = yield* Story.story(
        fixtureSubject,
        Story.init(),
        Story.message(DropdownFixture.Message.Open()),
        Story.model((m) => {
          expect(m.menu.controller.phase).toBe('open')
          expect(m.changes).toEqual([true])
        }),
        Story.message(DropdownFixture.Message.Close()),
        Story.model((m) => {
          expect(m.menu.controller.phase).toBe('closing')
          expect(m.changes).toEqual([true, false])
        }),
        Story.Command.expectExact(FinishExit({ generation: 2 })),
        Story.Command.resolve(
          FinishExit,
          DropdownMenuBlock.Message.CompletedExit({ generation: 2 }),
        ),
        Story.Command.expectNone(),
      )
      const codec = Schema.fromJsonString(DropdownFixture.Model)
      expect(yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(closed))).toEqual(
        closed,
      )
    }),
)

test.effect('SSR renders inline group semantics and keeps Dialog popup portals absent', () =>
  Effect.gen(function* () {
    const rendered = yield* renderToString(
      fixtureSubject,
      {},
      { isHydratable: true, buildId: 'dropdown-fixture' },
    ).pipe(Effect.provide(DropdownFixtureLayer))
    expect(rendered.html).toContain('role="group"')
    expect(rendered.html).toContain('Inline action')
    expect(rendered.html).not.toContain('role="menu"')
    expect(rendered.html).not.toContain('Modal title')
  }),
)

test.effect('late scoped dismissal cannot close a reopened Dropdown or emit an open callback', () =>
  Story.story(
    menuSubject,
    Story.init({ id: 'generation', defaultOpen: true }),
    Story.inMessage(DropdownMenuBlock.InMessage.RequestedVisibility({ open: false })),
    Story.Command.expectExact(FinishExit({ generation: 1 })),
    Story.inMessage(DropdownMenuBlock.InMessage.RequestedVisibility({ open: true })),
    Story.message(
      DropdownMenuBlock.Message.Dismissed({ restore: false, reason: 'outside', generation: 0 }),
    ),
    Story.model((m) => {
      expect(m.controller.phase).toBe('open')
    }),
    Story.expectNoOutMessage(),
    Story.Command.resolve(
      FinishExit({ generation: 1 }),
      DropdownMenuBlock.Message.CompletedExit({ generation: 1 }),
    ),
    Story.model((m) => {
      expect(m.controller.phase).toBe('open')
    }),
    Story.message(
      DropdownMenuBlock.Message.Dismissed({ restore: false, reason: 'outside', generation: 2 }),
    ),
    Story.model((m) => {
      expect(m.controller.phase).toBe('closing')
      expect(m.controller.restoreFocus).toBe(false)
    }),
    Story.Command.expectExact(FinishExit({ generation: 3 })),
    Story.Command.resolve(FinishExit, DropdownMenuBlock.Message.CompletedExit({ generation: 3 })),
    Story.Command.expectNone(),
  ),
)

test.effect(
  'live disabling blocks trigger intent while controlled synchronization remains available',
  () =>
    Story.story(
      menuSubject,
      Story.init({ id: 'disabled' }),
      Story.inMessage(DropdownMenuBlock.InMessage.RequestedDisabled({ disabled: true })),
      Story.message(DropdownMenuBlock.Message.ClickedSubTrigger()),
      Story.model((m) => {
        expect(m.controller.phase).toBe('absent')
      }),
      Story.expectNoOutMessage(),
      Story.inMessage(
        DropdownMenuBlock.InMessage.RequestedControlledOpen({ control: Option.some(true) }),
      ),
      Story.model((m) => {
        expect(m.controller.phase).toBe('open')
      }),
      Story.Command.expectNone(),
    ),
)

test.effect('the primitive decides whether an aria-disabled div can match a label', () =>
  Story.story(
    controllerSubject,
    Story.init({ id: 'typing' }),
    Story.inMessage(Dropdown.InMessage.InformedOfRows({ rows })),
    Story.inMessage(Dropdown.InMessage.InformedOfFocus({ id: Option.some('apple') })),
    Story.inMessage(Dropdown.InMessage.RequestedTypeahead({ character: 'a' })),
    Story.expectOutMessage(
      Dropdown.OutMessage.TypeaheadChanged({ generation: 1, target: Option.some('apricot') }),
    ),
    Story.Command.expectNone(),
  ),
)

test.effect('repeated initials preserve Base double-letter words and Radix rapid cycling', () => {
  const animals = rows.slice(0, 2).map((row, index) => ({
    ...row,
    id: index === 0 ? 'llama' : 'lion',
    label: index === 0 ? 'Llama' : 'Lion',
    disabled: false,
  }))
  return Story.story(
    controllerSubject,
    Story.init({ id: 'cycling' }),
    Story.inMessage(Dropdown.InMessage.InformedOfRows({ rows: animals })),
    Story.inMessage(Dropdown.InMessage.RequestedTypeahead({ character: 'l' })),
    Story.inMessage(Dropdown.InMessage.InformedOfFocus({ id: Option.some('llama') })),
    Story.inMessage(Dropdown.InMessage.RequestedTypeahead({ character: 'l' })),
    Story.expectOutMessage(
      Dropdown.OutMessage.TypeaheadChanged({ generation: 2, target: Option.none() }),
    ),
    Story.model((m) => {
      expect(m.search).toBe('ll')
    }),
    Story.Command.expectNone(),
  )
})

test.effect('a miss and stale expiry follow the source typing session rules', () =>
  Effect.gen(function* () {
    const typed = yield* Story.story(
      controllerSubject,
      Story.init({ id: 'expiry' }),
      Story.inMessage(Dropdown.InMessage.InformedOfRows({ rows })),
      Story.inMessage(Dropdown.InMessage.RequestedTypeahead({ character: 'x' })),
      Story.model((m) => {
        expect(m.search).toBe('')
      }),
      Story.inMessage(Dropdown.InMessage.RequestedTypeahead({ character: 'a' })),
    )
    const extended = yield* Story.story(
      controllerSubject,
      Story.given(typed),
      Story.inMessage(Dropdown.InMessage.RequestedTypeahead({ character: 'p' })),
      Story.inMessage(
        Dropdown.InMessage.InformedOfTypeaheadCompletion({ generation: typed.searchGeneration }),
      ),
      Story.model((m) => {
        expect(m.search).toBe('ap')
      }),
    )
    yield* Story.story(
      controllerSubject,
      Story.given(extended),
      Story.inMessage(
        Dropdown.InMessage.InformedOfTypeaheadCompletion({ generation: extended.searchGeneration }),
      ),
      Story.model((m) => {
        expect(m.search).toBe('')
      }),
      Story.Command.expectNone(),
    )
  }),
)

test.effect(
  'hover opening preserves focus; a subsequent explicit opening restores normal focus policy',
  () =>
    Story.story(
      controllerSubject,
      Story.init({ id: 'hover-open' }),
      Story.inMessage(Dropdown.InMessage.RequestedTriggerHover({ over: true, openOnHover: true })),
      Story.model((m) => {
        expect(m.phase).toBe('open')
        expect(m.openedByHover).toBe(true)
        expect(m.restoreFocus).toBe(false)
      }),
      Story.inMessage(Dropdown.InMessage.RequestedOpen({ open: false })),
      Story.inMessage(Dropdown.InMessage.RequestedOpenWithKey({ key: 'ArrowDown' })),
      Story.model((m) => {
        expect(m.openedByHover).toBe(false)
        expect(m.restoreFocus).toBe(true)
        expect(m.litBy).toBe('keyboard')
      }),
      Story.Command.expectNone(),
    ),
)
