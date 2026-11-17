import { Scene, Story } from 'foldkit'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Effect, Schema } from 'effect'
import type { Html } from 'foldkit/html'
import { CheckboxBlock, layer, test as checkboxTest } from '../src/checkbox.js'

const subject = { block: CheckboxBlock, layer }
const sceneSubject = { ...subject, viewInputs: { label: 'Choice', animate: (node: Html) => node } }
const { Message, InMessage, OutMessage } = CheckboxBlock
const control = Scene.role('checkbox')
const path = Scene.selector('path')
const ready = (checked: boolean) =>
  [
    Scene.Mount.resolve(checkboxTest.ObserveControl, Message.Toggled({ checked })),
    Scene.expectOutMessage(OutMessage.Changed({ checked })),
  ] as const
const configure = (checked: boolean, indeterminate = false) =>
  InMessage.RequestedConfigure({ checked, indeterminate, disabled: false, readOnly: false })

for (const checked of [false, true]) {
  it.effect(`mixed native ARIA overrides checked=${checked}`, () =>
    Scene.scene(
      sceneSubject,
      Scene.init({ id: 'choice', checked, indeterminate: true }),
      ...ready(checked),
      Scene.expect(control).toHaveAttr('aria-checked', 'mixed'),
      Scene.expect(control).toHaveAttr('data-indeterminate', ''),
      Scene.click(control),
      Scene.expectOutMessage(OutMessage.Changed({ checked: !checked })),
      Scene.expect(control).toHaveAttr('aria-checked', 'mixed'),
      Scene.expect(path).toHaveAttr('d', 'M7 12H17'),
      Scene.inMessage(configure(!checked)),
      Scene.expect(control).toHaveAttr('aria-checked', String(!checked)),
    ),
  )
  it.effect(`mixed glyph overrides checked=${checked}`, () =>
    Scene.scene(
      sceneSubject,
      Scene.init({ id: 'choice', checked, indeterminate: true }),
      ...ready(checked),
      Scene.expect(path).toHaveAttr('d', 'M7 12H17'),
      Scene.expectAll(Scene.all.selector('path')).toHaveCount(1),
    ),
  )
}

it.effect('check and dash replace each other without an outgoing sibling', () =>
  Scene.scene(
    sceneSubject,
    Scene.init({ id: 'choice', checked: true }),
    ...ready(true),
    Scene.expect(path).toHaveAttr('d', 'M6 12L10 16L18 8'),
    Scene.inMessage(configure(true, true)),
    Scene.expect(path).toHaveAttr('d', 'M7 12H17'),
    Scene.expectAll(Scene.all.selector('path')).toHaveCount(1),
    Scene.inMessage(configure(true)),
    Scene.expect(path).toHaveAttr('d', 'M6 12L10 16L18 8'),
    Scene.expectAll(Scene.all.selector('path')).toHaveCount(1),
  ),
)

it.effect('only empty transitions retain the outgoing glyph', () =>
  Scene.scene(
    sceneSubject,
    Scene.init({ id: 'choice', checked: false, indeterminate: true }),
    ...ready(false),
    Scene.inMessage(configure(false)),
    Scene.expect(control).toHaveAttr('aria-checked', 'false'),
    Scene.expect(path).toHaveAttr('d', 'M7 12H17'),
    Scene.inMessage(configure(true)),
    Scene.expect(path).toHaveAttr('d', 'M6 12L10 16L18 8'),
    Scene.expectAll(Scene.all.selector('path')).toHaveCount(1),
  ),
)

for (const sameGlyph of [false, true]) {
  it.effect(
    `stale completion cannot retire ${sameGlyph ? 'same-glyph' : 'replacement'} reentry`,
    () =>
      Effect.gen(function* () {
        const retired = yield* Story.story(
          subject,
          Story.init({ id: 'choice', checked: false, indeterminate: true }),
          Story.inMessage(configure(false)),
          Story.inMessage(configure(!sameGlyph, sameGlyph)),
          Story.message(Message.CompletedExit({ generation: 1 })),
          Story.model((model) =>
            expect(model.mark).toMatchObject({
              _tag: 'Present',
              glyph: sameGlyph ? 'dash' : 'check',
            }),
          ),
          Story.inMessage(configure(false)),
          Story.inMessage(configure(false)),
          Story.message(Message.CompletedExit({ generation: 1 })),
          Story.model((model) => expect(model.mark._tag).toBe('Exiting')),
          Story.message(Message.CompletedExit({ generation: 3 })),
        )
        yield* Scene.scene(
          sceneSubject,
          Scene.given(retired),
          ...ready(false),
          Scene.expect(path).toBeAbsent(),
        )
      }),
  )
}

for (const blocked of [{ disabled: true }, { readOnly: true }]) {
  it.effect(`mixed ${Object.keys(blocked)[0]} preserves native state and refuses requests`, () =>
    Scene.scene(
      sceneSubject,
      Scene.init({ id: 'choice', checked: true, indeterminate: true, ...blocked }),
      Scene.Mount.resolve(checkboxTest.ObserveControl, Message.Toggled({ checked: false })),
      Scene.expectNoOutMessage(),
      Scene.expect(control).toHaveAttr('aria-checked', 'mixed'),
      Scene.expect(control).not.toHaveHandler('click'),
      Scene.expect(path).toHaveAttr('d', 'M7 12H17'),
    ),
  )
}

it.effect(
  'omitting indeterminate clears mixed state and model serialization retains native inputs',
  () =>
    Effect.gen(function* () {
      const model = yield* Story.story(
        subject,
        Story.init({ id: 'choice', checked: true, indeterminate: true }),
        Story.message(Message.Toggled({ checked: false })),
        Story.expectOutMessage(OutMessage.Changed({ checked: false })),
        Story.model((model) => {
          expect(model.checked).toBe(true)
          expect(model.indeterminate).toBe(true)
        }),
      )
      const codec = Schema.fromJsonString(CheckboxBlock.Model)
      const encoded = yield* Schema.encodeEffect(codec)(model)
      const restored = yield* Schema.decodeEffect(codec)(encoded)
      yield* Story.story(
        subject,
        Story.given(restored),
        Story.inMessage(
          InMessage.RequestedConfigure({ checked: true, disabled: false, readOnly: false }),
        ),
        Story.expectNoOutMessage(),
        Story.model((model) => {
          expect(model.indeterminate).toBe(false)
          expect(model.initialChecked).toBe(true)
        }),
      )
    }),
)
