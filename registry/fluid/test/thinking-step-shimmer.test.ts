// @vitest-environment happy-dom
import shimmerCss from '../src/styles/thinking-indicator.css?raw'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import { ThinkingStepBlock, layer as ThinkingStepLayer } from '../src/thinking-step.js'
import type { ThinkingStepConfig } from '../src/thinking-step.js'

const RootKey = Symbol('ThinkingStepShimmer')
const Message = defineMessageUnion({ Completed: {}, Activated: {} })
const effects = Block.makeEffectsContract()
const Root = Block.make('ThinkingStepShimmer', {
  key: RootKey,
  Model: Schema.Struct({ step: ThinkingStepBlock.Model }),
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects,
})
const Step = Root.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'step',
  init: { contextToArgs: (): [ThinkingStepConfig] => [{ id: 'shimmer-step', status: 'active' }] },
})
const Composition = Root.makeComposition({ bindings: [Step] })
const init = Composition.makeInit(() => ({ model: {} }))
const update = Composition.makeUpdate({
  Completed: Step.requestConfigure({ status: 'complete' }),
  Activated: Step.requestConfigure({ status: 'active' }),
})
const view = Composition.makeView((model, h) =>
  h.div(
    [],
    [
      h.button([h.Id('complete'), h.OnClick(Message.Completed())], ['Complete']),
      h.button([h.Id('activate'), h.OnClick(Message.Activated())], ['Activate']),
      h.block(
        Step.embedView({
          slotId: model.step.id,
          model: model.step,
          viewInputs: { label: 'Working', animate: (node) => node },
        }),
      ),
    ],
  ),
)
const layer = Root.makeLayer({ init, update, view }).pipe(Layer.provide(ThinkingStepLayer))

it.live('the same step stops its shimmer when completed and resumes when active again', () =>
  Effect.gen(function* () {
    const container = document.createElement('div')
    container.id = 'thinking-step-shimmer-regression'
    const stylesheet = document.createElement('style')
    stylesheet.textContent = shimmerCss
    document.head.append(stylesheet)
    const host = document.createElement('div')
    host.append(container)
    document.body.append(host)
    const program = Runtime.embed(Program.makeElement({ block: Root, layer, container }))
    const label = () => {
      const element = [...host.querySelectorAll('#shimmer-step span')].find((candidate) =>
        candidate.textContent?.startsWith('Working'),
      )
      if (!(element instanceof HTMLElement)) throw new Error('Missing step label')
      return element
    }
    try {
      yield* Effect.promise(() =>
        vi.waitFor(() => expect(getComputedStyle(label()).animation).toContain('shimmer')),
      )
      const original = label()
      const complete = host.querySelector('#complete')
      if (!(complete instanceof HTMLButtonElement)) throw new Error('Missing completion control')
      complete.click()
      yield* Effect.promise(() =>
        vi.waitFor(() => {
          expect(label()).toBe(original)
          expect(label().textContent).toBe('Working')
          expect(getComputedStyle(label()).animation).not.toContain('shimmer')
        }),
      )
      const activate = host.querySelector('#activate')
      if (!(activate instanceof HTMLButtonElement)) throw new Error('Missing activation control')
      activate.click()
      yield* Effect.promise(() =>
        vi.waitFor(() => {
          expect(label()).toBe(original)
          expect(getComputedStyle(label()).animation).toContain('shimmer')
        }),
      )
    } finally {
      yield* Effect.promise(() => program.dispose())
      host.remove()
      stylesheet.remove()
    }
  }),
)
