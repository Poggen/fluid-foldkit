import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Scene, Story } from 'foldkit'
import { Effect, Schema } from 'effect'
import {
  KeyboardNavGateBlock,
  KeyboardNavGateLayer,
  test as gateTest,
} from '../src/keyboard-nav-gate.js'

const subject = { block: KeyboardNavGateBlock, layer: KeyboardNavGateLayer }
const { CaptureFocus, ObserveNavigation } = gateTest
const codec = Schema.fromJsonString(KeyboardNavGateBlock.Model)
const replay = (model: typeof KeyboardNavGateBlock.Model.Type) =>
  Schema.decodeSync(codec)(Schema.encodeSync(codec)(model))

test.effect('popup gate tracks the exact source navigation keys and opening reseeds the flag', () =>
  Effect.gen(function* navigationKeys() {
    for (const key of [
      'ArrowDown',
      'ArrowUp',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'Tab',
    ]) {
      const usedKeyboard = yield* Story.story(
        subject,
        Story.init({ id: 'gate' }),
        Story.message(KeyboardNavGateBlock.Message.CapturedNavigation({ key })),
        Story.model((model) => {
          expect(model.keyboardNav).toBe(true)
        }),
      )
      yield* Story.story(
        subject,
        Story.given(replay(usedKeyboard)),
        Story.inMessage(KeyboardNavGateBlock.InMessage.RequestedOpen({ open: true })),
        Story.Command.expectExact(CaptureFocus({ generation: 1 })),
        Story.Command.resolve(
          CaptureFocus,
          KeyboardNavGateBlock.Message.CapturedFocusVisible({ generation: 1, value: false }),
        ),
        Story.message(KeyboardNavGateBlock.Message.CapturedNavigation({ key: 'a' })),
        Story.model((model) => {
          expect(model.keyboardNav).toBe(false)
        }),
        Story.message(KeyboardNavGateBlock.Message.CapturedNavigation({ key })),
        Story.model((model) => {
          expect(model.keyboardNav).toBe(true)
        }),
        Story.Command.expectNone(),
      )
    }
  }),
)

test.effect(
  'popup gate ignores old focus snapshots and does not erase keyboard use with a delayed pointer seed',
  () =>
    Effect.gen(function* focusOrdering() {
      const scene = { ...subject, viewInputs: { content: () => [] } }
      const original = CaptureFocus({ generation: 0 })
      yield* Scene.scene(
        scene,
        Scene.init({ id: 'gate', open: true }),
        Scene.Command.expectExact(original),
        Scene.Command.keepPending(original),
        Scene.Mount.expectExact(ObserveNavigation),
        Scene.Mount.resolve(
          ObserveNavigation,
          KeyboardNavGateBlock.Message.CapturedNavigation({ key: 'ArrowDown' }),
        ),
        Scene.expect(Scene.selector('#gate')).toHaveAttr('data-keyboard-nav', 'true'),
        Scene.Command.resolve(
          original,
          KeyboardNavGateBlock.Message.CapturedFocusVisible({ generation: 0, value: false }),
        ),
        Scene.expect(Scene.selector('#gate')).toHaveAttr('data-keyboard-nav', 'true'),
        Scene.inMessage(KeyboardNavGateBlock.InMessage.RequestedOpen({ open: false })),
        Scene.expect(Scene.selector('#gate')).toHaveAttr('data-keyboard-nav', 'true'),
        Scene.Command.expectNone(),
      )
      const reopened = CaptureFocus({ generation: 2 })
      yield* Scene.scene(
        scene,
        Scene.init({ id: 'gate', open: true }),
        Scene.Command.expectExact(original),
        Scene.Command.keepPending(original),
        Scene.Mount.resolve(
          ObserveNavigation,
          KeyboardNavGateBlock.Message.CapturedNavigation({ key: 'ArrowDown' }),
        ),
        Scene.inMessage(KeyboardNavGateBlock.InMessage.RequestedOpen({ open: false })),
        Scene.inMessage(KeyboardNavGateBlock.InMessage.RequestedOpen({ open: true })),
        Scene.Command.expectExactInOrder(original, reopened),
        Scene.Command.resolve(
          original,
          KeyboardNavGateBlock.Message.CapturedFocusVisible({ generation: 0, value: true }),
        ),
        Scene.expect(Scene.selector('#gate')).toHaveAttr('data-keyboard-nav', 'false'),
        Scene.Command.resolve(
          reopened,
          KeyboardNavGateBlock.Message.CapturedFocusVisible({ generation: 2, value: true }),
        ),
        Scene.expect(Scene.selector('#gate')).toHaveAttr('data-keyboard-nav', 'true'),
        Scene.Command.expectNone(),
      )
    }),
)
