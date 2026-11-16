import { describe, expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Story } from 'foldkit'
import { Effect, Schema } from 'effect'
import { InputFieldBlock, layer } from '../src/input-group-field.js'

const subject = { block: InputFieldBlock, layer }

describe('controlled input field', () => {
  test.effect(
    'typing reports raw text without taking ownership, including partial IME drafts',
    () =>
      Effect.gen(function* drafts() {
        for (const value of ['', 'に', '日本', '  a  ']) {
          yield* Story.story(
            subject,
            Story.init({ id: 'name', index: 0, value: 'previous' }),
            Story.message(InputFieldBlock.Message.CapturedInput({ value })),
            Story.model((model) => {
              expect(model.value).toBe('previous')
            }),
            Story.expectOutMessage(InputFieldBlock.OutMessage.Changed({ value })),
            Story.inMessage(
              InputFieldBlock.InMessage.RequestedConfigure({
                value: 'accepted',
                disabled: false,
                readOnly: false,
              }),
            ),
            Story.model((model) => {
              expect(model.value).toBe('accepted')
            }),
            Story.Command.expectNone(),
          )
        }
      }),
  )
  test.effect(
    'disabled and readOnly controls never emit an edit while focus state survives serialization',
    () =>
      Effect.gen(function* blockedDrafts() {
        const codec = Schema.fromJsonString(InputFieldBlock.Model)
        for (const [disabled, readOnly] of [
          [true, false],
          [false, true],
        ] satisfies ReadonlyArray<readonly [boolean, boolean]>) {
          const focused = yield* Story.story(
            subject,
            Story.init({ id: 'name', index: 0, value: 'retained', disabled, readOnly }),
            Story.message(InputFieldBlock.Message.CapturedFocus({ focused: true })),
            Story.Command.expectNone(),
          )
          const replayed = yield* Schema.decodeEffect(codec)(
            yield* Schema.encodeEffect(codec)(focused),
          )
          yield* Story.story(
            subject,
            Story.given(replayed),
            Story.message(InputFieldBlock.Message.CapturedInput({ value: 'blocked' })),
            Story.expectNoOutMessage(),
            Story.model((model) => {
              expect(model.focused).toBe(true)
            }),
            Story.message(InputFieldBlock.Message.Unmounted()),
            Story.model((model) => {
              expect(model.focused).toBe(false)
            }),
            Story.Command.expectNone(),
          )
        }
      }),
  )
})
