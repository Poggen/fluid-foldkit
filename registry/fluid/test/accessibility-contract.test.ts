// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Button } from '../src/button.js'
import { Card } from '../src/card.js'
import { InputFieldBlock, layer as InputFieldLayer } from '../src/input-group-field.js'

const AccessibilityKey = Symbol('AccessibilityContract')
const effects = Block.makeEffectsContract()
const AccessibilityBlock = Block.make('AccessibilityContract', {
  key: AccessibilityKey,
  Model: Schema.Struct({ field: InputFieldBlock.Model, error: Schema.String }),
  Message: defineMessageUnion({ ValidationFailed: {} }),
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})
const Field = AccessibilityBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'field',
  init: { contextToArgs: () => [{ id: 'contact-email', index: 0, value: '' }] },
}).withOutMessagePolicy({
  fold: AccessibilityBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: AccessibilityBlock.makeNoopStep,
  }),
})
const Composition = AccessibilityBlock.makeComposition({ bindings: [Field] })
const plans = {
  init: Composition.makeInit(() => ({ model: { error: '' } })),
  update: Composition.makeUpdate({
    ValidationFailed: AccessibilityBlock.makeFieldsStep(() => ({
      error: () => 'Enter a valid email address',
    })),
  }),
  view: Composition.makeView((model, h) => ({
    title: 'Accessible controls',
    body: h.main(
      [],
      [
        h.block(
          Field.embedView({
            slotId: model.field.id,
            model: model.field,
            viewInputs: { label: 'Contact email', error: model.error },
          }),
        ),
        Button(
          {
            children: ['Validate'],
            attributes: [h.OnClick(AccessibilityBlock.Message.ValidationFailed())],
          },
          h,
        ),
        ...[false, true].map((selected) =>
          Card(
            {
              label: selected ? 'Selected plan' : 'Available plan',
              selected,
              onClick: AccessibilityBlock.Message.ValidationFailed(),
              children: () => ['Plan'],
            },
            h,
          ),
        ),
      ],
    ),
  })),
}
const layer = AccessibilityBlock.makeLayer(plans).pipe(Layer.provide(InputFieldLayer))
const subject = { block: AccessibilityBlock, layer }

const renderedControls = Effect.gen(function* () {
  const host = yield* Effect.acquireRelease(
    Effect.sync(() => {
      const wrapper = document.createElement('div')
      const element = document.createElement('div')
      element.id = 'accessibility-contract'
      wrapper.append(element)
      document.body.append(wrapper)
      return wrapper
    }),
    (element) => Effect.sync(() => element.remove()),
  )
  yield* Effect.acquireRelease(
    Effect.sync(() =>
      Runtime.embed(
        Program.make({
          ...subject,
          container: host.querySelector<HTMLElement>('#accessibility-contract'),
        }),
      ),
    ),
    (program) => Effect.promise(program.dispose),
  )
  yield* Effect.try(() => expect(host.querySelector('button')).not.toBeNull()).pipe(
    Effect.retry({ times: 50, schedule: Schedule.spaced('10 millis') }),
  )
  return host
})

it.live('validation errors are announced when they appear after interaction', () =>
  Effect.gen(function* () {
    const host = yield* renderedControls
    expect(host.querySelector('[role="alert"]')).toBeNull()
    host.querySelector('button')?.click()
    yield* Effect.try(() =>
      expect(host.querySelector('[role="alert"]')?.textContent).toBe('Enter a valid email address'),
    ).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('10 millis') }))
  }),
)

it.live('selectable cards expose both pressed and unpressed states', () =>
  Effect.gen(function* () {
    const host = yield* renderedControls
    const buttons = host.querySelectorAll('button[aria-label$="plan"]')
    expect([...buttons].map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
    ])
  }),
)
