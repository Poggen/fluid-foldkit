import { describe, expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Story } from 'foldkit'
import { CheckboxBlock, layer as CheckboxLayer } from '../src/checkbox.js'
import { InputBlock, inputFileResourcesLayer, layer as InputLayer } from '../src/input.js'
import { TextareaBlock, layer as TextareaLayer } from '../src/textarea.js'

const checkbox = { block: CheckboxBlock, layer: CheckboxLayer }
const input = { block: InputBlock, layer: InputLayer.pipe(Layer.provide(inputFileResourcesLayer)) }
const textarea = { block: TextareaBlock, layer: TextareaLayer }

describe('standalone form controls', () => {
  test.effect(
    'checkbox requests remain parent-owned and stale retract completion cannot remove a re-entered check',
    () =>
      Effect.gen(function* checkboxControl() {
        const exiting = yield* Story.story(
          checkbox,
          Story.init({ id: 'choice', checked: true }),
          Story.model((model) => {
            expect(model.entering).toBe(false)
          }),
          Story.message(CheckboxBlock.Message.Toggled({ checked: false })),
          Story.expectOutMessage(CheckboxBlock.OutMessage.Changed({ checked: false })),
          Story.model((model) => {
            expect(model.checked).toBe(true)
          }),
          Story.inMessage(
            CheckboxBlock.InMessage.RequestedConfigure({
              checked: false,
              disabled: false,
              readOnly: false,
            }),
          ),
          Story.model((model) => {
            expect(model.mark._tag).toBe('Exiting')
          }),
        )
        yield* Story.story(
          checkbox,
          Story.given(exiting),
          Story.inMessage(
            CheckboxBlock.InMessage.RequestedConfigure({
              checked: true,
              disabled: false,
              readOnly: false,
            }),
          ),
          Story.message(
            CheckboxBlock.Message.CompletedExit({ generation: exiting.mark.generation }),
          ),
          Story.model((model) => {
            expect(model.mark._tag).toBe('Present')
            expect(model.checked).toBe(true)
          }),
          Story.inMessage(
            CheckboxBlock.InMessage.RequestedConfigure({
              checked: true,
              disabled: false,
              readOnly: true,
            }),
          ),
          Story.message(CheckboxBlock.Message.Toggled({ checked: false })),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        )
      }),
  )
  test.effect(
    'Input forwards raw drafts and only accepts values through its public configure operation',
    () =>
      Effect.gen(function* inputControl() {
        for (const value of ['', '日本', '  raw  ', '-']) {
          yield* Story.story(
            input,
            Story.init({ id: 'draft', value: 'saved' }),
            Story.message(InputBlock.Message.CapturedInput({ value })),
            Story.model((model) => {
              expect(model.value).toBe('saved')
            }),
            Story.expectOutMessage(InputBlock.OutMessage.Changed({ value })),
            Story.Command.expectNone(),
          )
        }
        const files = [
          { id: 'resume-4-1', name: 'resume', type: 'text/plain', size: 4, lastModified: 1 },
        ]
        yield* Story.story(
          input,
          Story.init({ id: 'draft', value: 'saved' }),
          Story.message(InputBlock.Message.CapturedFiles({ files })),
          Story.model((model) => {
            expect(model.hasFile).toBe(true)
          }),
          Story.expectOutMessage(InputBlock.OutMessage.FilesChanged({ files })),
          Story.inMessage(
            InputBlock.InMessage.RequestedConfigure({
              value: 'accepted',
              disabled: true,
              readOnly: false,
            }),
          ),
          Story.model((model) => {
            expect(model.value).toBe('accepted')
          }),
          Story.message(InputBlock.Message.CapturedInput({ value: 'blocked' })),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        )
      }),
  )
  test.effect('Textarea preserves multiline drafts and read-only policy', () =>
    Story.story(
      textarea,
      Story.init({ id: 'notes', value: 'saved', readOnly: true }),
      Story.message(TextareaBlock.Message.CapturedInput({ value: 'a\nb' })),
      Story.expectNoOutMessage(),
      Story.inMessage(
        TextareaBlock.InMessage.RequestedConfigure({
          value: 'first\nsecond',
          disabled: false,
          readOnly: false,
        }),
      ),
      Story.model((model) => {
        expect(model.value).toBe('first\nsecond')
      }),
      Story.message(TextareaBlock.Message.CapturedInput({ value: 'third\n' })),
      Story.expectOutMessage(TextareaBlock.OutMessage.Changed({ value: 'third\n' })),
      Story.Command.expectNone(),
    ),
  )
})
