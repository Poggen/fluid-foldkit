import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import {
  ThinkingTraceBlock,
  FinishThinkingTrace,
  layer,
} from '../../../registry/fluid/examples/src/thinking-trace'

const subject = { block: ThinkingTraceBlock, layer }
it.effect(
  'reasoning follows the parent run and stale completion cannot finish the current run',
  () =>
    Story.story(
      subject,
      Story.init(),
      Story.model((model) => expect(model.reasoning.open).toBe(false)),
      Story.message(ThinkingTraceBlock.Message.ClickedRun()),
      Story.model((model) => {
        expect(model.running).toBe(true)
        expect(model.reasoning.open).toBe(true)
      }),
      Story.message(ThinkingTraceBlock.Message.CompletedRun({ generation: 0 })),
      Story.model((model) => expect(model.running).toBe(true)),
      Story.Command.resolve(
        FinishThinkingTrace,
        ThinkingTraceBlock.Message.CompletedRun({ generation: 1 }),
      ),
      Story.model((model) => {
        expect(model.running).toBe(false)
        expect(model.reasoning.open).toBe(false)
        expect(model.failure.status).toBe('error')
        expect(model.checker.status).toBe('upcoming')
      }),
    ),
)
