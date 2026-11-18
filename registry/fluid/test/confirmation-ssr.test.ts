import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { renderToString } from 'foldkit/experimental/server'
import { Window } from 'happy-dom'
import { expect } from 'vitest'
import {
  ConfirmationBlock,
  ConfirmationState,
  layer as ConfirmationLayer,
} from '../src/confirmation.js'

const FixtureKey = Symbol('ConfirmationServerFixture')
const Fixture = Block.make('ConfirmationServerFixture', {
  key: FixtureKey,
  Model: Schema.Struct({ confirmation: ConfirmationBlock.Model }),
  Message: defineMessageUnion({}),
  InitArgs: Schema.Tuple([ConfirmationState]),
  ChildInitContext: ConfirmationState,
  effects: Block.makeEffectsContract<never, never>(),
  view: { kind: 'Document' },
})
const Confirmation = Fixture.makeRequiredFieldBinding(ConfirmationBlock, {
  field: 'confirmation',
  init: { contextToArgs: (state: ConfirmationState) => [{ id: 'approval', state }] },
}).withOutMessagePolicy({
  fold: Fixture.makeOutMessageFold(ConfirmationBlock, {
    Approved: Fixture.makeNoopStep,
    Denied: Fixture.makeNoopStep,
    Dismissed: Fixture.makeNoopStep,
    Exited: Fixture.makeNoopStep,
  }),
})
const Composition = Fixture.makeComposition({ bindings: [Confirmation] })
const layer = Fixture.makeLayer({
  init: Composition.makeInit((state) => ({ model: {}, childInitContext: state })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Confirmation',
    body: h.block(
      Confirmation.embedView({
        slotId: 'approval',
        model: model.confirmation,
        viewInputs: {
          title: 'Run build?',
          description: 'Produces the application.',
          approveLabel: 'Run',
          denyLabel: 'Cancel',
          approvedLabel: 'Allowed',
          deniedLabel: 'Blocked',
          size: 'compact',
          icon: 'bell',
        },
      }),
    ),
  })),
}).pipe(Layer.provide(ConfirmationLayer))
const rendered = (state: ConfirmationState, assert: (document: Window['document']) => void) =>
  Effect.gen(function* () {
    const result = yield* renderToString(
      { block: Fixture, layer },
      { Flags: ConfirmationState },
      { flags: state, isHydratable: false },
    )
    const window = new Window()
    try {
      window.document.body.innerHTML = result.html
      assert(window.document)
    } finally {
      window.close()
    }
  })
it.effect('server-renders a named question and primary-first native actions', () =>
  rendered('requested', (document) => {
    const group = document.querySelector('[role=group]')
    expect(group?.getAttribute('aria-labelledby')).toBe('approval-title')
    expect(group?.getAttribute('aria-describedby')).toBe('approval-description')
    expect(document.getElementById('approval-title')?.textContent).toBe('Run build?')
    expect([...document.querySelectorAll('button')].map((button) => button.textContent)).toEqual([
      'Run',
      'Cancel',
    ])
    expect(document.querySelector('[role=status]')).toBeNull()
  }),
)
for (const [state, answer] of [
  ['approved', 'Allowed'],
  ['denied', 'Blocked'],
] satisfies ReadonlyArray<readonly [ConfirmationState, string]>) {
  it.effect(`server-renders the ${state} answer in the action-height status slot`, () =>
    rendered(state, (document) => {
      expect(document.querySelectorAll('button')).toHaveLength(0)
      const status = document.querySelector('[role=status]')
      expect(status?.textContent).toBe(answer)
      expect(status?.classList.contains('h-7')).toBe(true)
      expect(document.querySelector('[role=group]')?.getAttribute('aria-labelledby')).toBe(
        'approval-title',
      )
    }),
  )
}
