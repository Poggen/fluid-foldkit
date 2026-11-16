import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Effect, Schema } from 'effect'
import { Story } from 'foldkit'
import {
  ThinkingStepsBlock,
  ThinkingStepsLayer,
  ThinkingStepDetailsBlock,
  ThinkingStepDetailsLayer,
} from '../src/thinking-steps.js'

const steps = { block: ThinkingStepsBlock, layer: ThinkingStepsLayer }
const details = { block: ThinkingStepDetailsBlock, layer: ThinkingStepDetailsLayer }

it.effect('an interrupted panel close rejects stale retirement after replay', () =>
  Effect.gen(function* interruptedPanel() {
    const closing = yield* Story.story(
      steps,
      Story.init({ id: 'steps' }),
      Story.model((model) => {
        expect(model.open).toBe(true)
      }),
      Story.inMessage(ThinkingStepsBlock.InMessage.RequestedToggle()),
      Story.model((model) => {
        expect(model.open).toBe(false)
        expect(model.hidden).toBe(false)
      }),
    )
    const codec = Schema.fromJsonString(ThinkingStepsBlock.Model)
    const replayed = yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(closing))
    const closedAgain = yield* Story.story(
      steps,
      Story.given(replayed),
      Story.inMessage(ThinkingStepsBlock.InMessage.RequestedToggle()),
      Story.message(ThinkingStepsBlock.Message.CompletedPanel({ generation: closing.generation })),
      Story.model((model) => {
        expect(model.open).toBe(true)
        expect(model.hidden).toBe(false)
      }),
      Story.inMessage(ThinkingStepsBlock.InMessage.RequestedToggle()),
    )
    yield* Story.story(
      steps,
      Story.given(closedAgain),
      Story.message(
        ThinkingStepsBlock.Message.CompletedPanel({ generation: closedAgain.generation }),
      ),
      Story.model((model) => {
        expect(model.hidden).toBe(true)
      }),
      Story.Command.expectNone(),
    )
  }),
)

it.effect(
  'Base details start closed and controlled or disabled toggles preserve parent ownership',
  () =>
    Story.story(
      details,
      Story.init({ id: 'details' }),
      Story.model((model) => {
        expect(model.open).toBe(false)
      }),
      Story.inMessage(
        ThinkingStepDetailsBlock.InMessage.RequestedConfigure({ open: true, disabled: false }),
      ),
      Story.inMessage(ThinkingStepDetailsBlock.InMessage.RequestedToggle()),
      Story.model((model) => {
        expect(model.open).toBe(true)
      }),
      Story.expectOutMessage(ThinkingStepDetailsBlock.OutMessage.OpenChanged({ open: false })),
      Story.inMessage(
        ThinkingStepDetailsBlock.InMessage.RequestedConfigure({ open: null, disabled: true }),
      ),
      Story.inMessage(ThinkingStepDetailsBlock.InMessage.RequestedToggle()),
      Story.model((model) => {
        expect(model.open).toBe(false)
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    ),
)
