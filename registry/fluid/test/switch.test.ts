import { Scene, Story } from 'foldkit'
import { describe, expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Option, Schema } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { SwitchLayer, SwitchBlock, test as switchTest } from '../src/switch.js'
import { FormsParent, FormsParentLayer } from './switch-parent.js'

const subject = { block: SwitchBlock, layer: SwitchLayer }
const { Message, InMessage, OutMessage } = SwitchBlock
const codec = Schema.fromJsonString(SwitchBlock.Model)
const replay = (model: typeof SwitchBlock.Model.Type) =>
  Schema.decodeSync(codec)(Schema.encodeSync(codec)(model))
const release = (generation: number) =>
  Story.steps(
    Story.Command.expectExact(switchTest.ReleaseClick({ generation })),
    Story.Command.resolve(switchTest.ReleaseClick, Message.ReleasedClick({ generation })),
  )

describe('Base', () => {
  test.effect(
    'switch is controlled: activation emits a request and only parent configuration changes checked',
    () =>
      Effect.gen(function* control() {
        const requested = yield* Story.story(
          subject,
          Story.init({ id: 'switch', checked: false }),
          Story.inMessage(InMessage.RequestedToggle()),
          Story.expectOutMessage(OutMessage.Toggled()),
          Story.model((model) => {
            expect(model.checked).toBe(false)
          }),
        )
        yield* Story.story(
          subject,
          Story.given(replay(requested)),
          Story.inMessage(InMessage.RequestedConfigure({ checked: true, disabled: false })),
          Story.model((model) => {
            expect(model.checked).toBe(true)
          }),
          Story.inMessage(InMessage.RequestedToggle()),
          Story.model((model) => {
            expect(model.checked).toBe(true)
          }),
          Story.inMessage(InMessage.RequestedConfigure({ checked: true, disabled: true })),
          Story.inMessage(InMessage.RequestedToggle()),
          Story.expectNoOutMessage(),
        )
      }),
  )
  test.effect(
    'switch drag uses the source 2px dead zone, pressed-width clamp and strict midpoint',
    () =>
      Effect.gen(function* drag() {
        for (const maximum of [12, 11]) {
          const pressed = yield* Story.story(
            subject,
            Story.init({ id: 'switch', checked: false }),
            Story.message(Message.CapturedDown({ id: 7, start: 100, origin: 2, maximum })),
            Story.message(Message.CapturedMove({ id: 7, clientX: 101.99 })),
            Story.model((model) => {
              expect(model.dragging).toBe(false)
            }),
          )
          yield* Story.story(
            subject,
            Story.given(pressed),
            Story.message(Message.CapturedMove({ id: 8, clientX: 200 })),
            Story.model((model) => {
              expect(model.dragging).toBe(true)
              expect(model.dragX).toBe(maximum)
            }),
          )
          const dragged = yield* Story.story(
            subject,
            Story.given(replay(pressed)),
            Story.message(Message.CapturedMove({ id: 7, clientX: 200 })),
            Story.model((model) => {
              expect(model.dragging).toBe(true)
              expect(model.dragX).toBe(maximum)
            }),
          )
          yield* Story.story(
            subject,
            Story.given(replay(dragged)),
            Story.message(Message.CapturedUp({ id: 7, cancelled: false })),
            Story.expectOutMessage(OutMessage.Toggled()),
            Story.model((model) => {
              expect(model.checked).toBe(false)
              expect(model.suppressClick).toBe(true)
              expect(model.pressed).toBe(false)
              expect(Option.isNone(model.pointer)).toBe(true)
            }),
            release(dragged.generation + 1),
            Story.inMessage(InMessage.RequestedToggle()),
            Story.expectOutMessage(OutMessage.Toggled()),
          )
        }
      }),
  )
  test.effect(
    'switch release uses the strict midpoint and controlled disabled updates preserve the source row gesture',
    () =>
      Effect.gen(function* midpoint() {
        const middle = yield* Story.story(
          subject,
          Story.init({ id: 'switch', checked: false }),
          Story.message(Message.CapturedDown({ id: 1, start: 0, origin: 2, maximum: 12 })),
          Story.message(Message.CapturedMove({ id: 1, clientX: 5 })),
          Story.model((model) => {
            expect(model.dragX).toBe(7)
          }),
        )
        yield* Story.story(
          subject,
          Story.given(middle),
          Story.message(Message.CapturedUp({ id: 1, cancelled: false })),
          Story.expectNoOutMessage(),
          release(middle.generation + 1),
        )
        const moved = yield* Story.story(
          subject,
          Story.given(middle),
          Story.message(Message.CapturedMove({ id: 1, clientX: 100 })),
        )
        yield* Story.story(
          subject,
          Story.given(moved),
          Story.message(Message.CapturedUp({ id: 1, cancelled: true })),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        )
        const disabled = yield* Story.story(
          subject,
          Story.given(moved),
          Story.inMessage(InMessage.RequestedConfigure({ checked: true, disabled: true })),
          Story.model((model) => {
            expect(model.pressed).toBe(true)
            expect(model.dragging).toBe(true)
            expect(Option.isSome(model.pointer)).toBe(true)
          }),
        )
        yield* Story.story(
          subject,
          Story.given(disabled),
          Story.message(Message.CapturedUp({ id: 1, cancelled: false })),
          Story.expectNoOutMessage(),
          release(disabled.generation + 1),
        )
        yield* Story.story(
          subject,
          Story.given(disabled),
          Story.message(Message.CapturedMount()),
          Story.model((model) => {
            expect(model.checked).toBe(true)
            expect(model.hovered).toBe(false)
            expect(model.suppressClick).toBe(false)
            expect(model.generation).toBe(disabled.generation + 1)
          }),
        )
      }),
  )
})

test.effect(
  'pending click release suppresses activation and cannot clear a successor gesture',
  () => {
    const old = switchTest.ReleaseClick({ generation: 2 })
    const current = switchTest.ReleaseClick({ generation: 4 })
    return Scene.scene(
      { ...subject, viewInputs: { label: 'Notifications', animate: (node) => node } },
      Scene.init({ id: 'switch', checked: false }),
      Scene.Mount.resolve(switchTest.ObservePointer, Message.CapturedMount()),
      Scene.Mount.emit(
        switchTest.ObservePointer,
        Message.CapturedDown({ id: 1, start: 0, origin: 2, maximum: 12 }),
      ),
      Scene.Mount.emit(switchTest.ObservePointer, Message.CapturedMove({ id: 1, clientX: 100 })),
      Scene.Mount.emit(switchTest.ObservePointer, Message.CapturedUp({ id: 1, cancelled: false })),
      Scene.Command.expectExact(old),
      Scene.Command.keepPending(old),
      Scene.inMessage(InMessage.RequestedToggle()),
      Scene.expectNoOutMessage(),
      Scene.Mount.emit(switchTest.ObservePointer, Message.CapturedMount()),
      Scene.Mount.emit(
        switchTest.ObservePointer,
        Message.CapturedDown({ id: 2, start: 0, origin: 2, maximum: 12 }),
      ),
      Scene.Mount.emit(switchTest.ObservePointer, Message.CapturedMove({ id: 2, clientX: 100 })),
      Scene.Mount.emit(switchTest.ObservePointer, Message.CapturedUp({ id: 2, cancelled: false })),
      Scene.Command.expectExactInOrder(old, current),
      Scene.Command.keepPending(current),
      Scene.Command.resolve(old, Message.ReleasedClick({ generation: 2 })),
      Scene.inMessage(InMessage.RequestedToggle()),
      Scene.expectNoOutMessage(),
      Scene.Command.resolve(current, Message.ReleasedClick({ generation: 4 })),
      Scene.inMessage(InMessage.RequestedToggle()),
      Scene.expectOutMessage(OutMessage.Toggled()),
    )
  },
)

test.effect(
  'checked parent applies requested toggles and SSR preserves the switch span and hidden checkbox',
  () =>
    Effect.gen(function* parent() {
      yield* Story.story(
        { block: FormsParent, layer: FormsParentLayer },
        Story.init(),
        Story.message(FormsParent.Message.Toggle()),
        Story.model((model) => {
          expect(model.switch.checked).toBe(true)
        }),
        Story.message(FormsParent.Message.Disable()),
        Story.message(FormsParent.Message.Toggle()),
        Story.model((model) => {
          expect(model.switch.checked).toBe(true)
        }),
      )
      const rendered = yield* renderToString(
        { block: FormsParent, layer: FormsParentLayer },
        {},
        { isHydratable: true, buildId: 'fluid-forms' },
      )
      for (const expected of [
        'role="switch"',
        'aria-checked="false"',
        '<span role="switch"',
        'type="checkbox"',
        'aria-labelledby="switch-label"',
        'id="switch-label">Notifications',
        'data-keyboard-nav="false"',
      ])
        expect(rendered.html).toContain(expected)
      expect(rendered.html).not.toContain('data-state=')
      expect(rendered.html).not.toContain('type="button"')
    }),
)

test.effect(
  'Base hidden checkbox preserves the mounted reset default across controlled updates and resets it on remount',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'reset', checked: false }),
      Story.inMessage(InMessage.RequestedConfigure({ checked: true, disabled: false })),
      Story.model((model) => {
        expect(model.checked).toBe(true)
        expect(model.initialChecked).toBe(false)
      }),
      Story.message(Message.CapturedMount()),
      Story.model((model) => {
        expect(model.initialChecked).toBe(true)
      }),
    ),
)
