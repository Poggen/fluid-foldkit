import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { layer } from '../../../registry/fluid/examples/src/thinking-example-block'
import {
  ThinkingDemoBlock,
  ReadPlaybackTime,
  WaitBeforeThinkingStep,
  WaitBeforeThinkingCharacters,
} from '../../../registry/fluid/examples/src/thinking-example-playback'

const subject = { block: ThinkingDemoBlock, layer }
const time = (action: 'toggle' | 'enter' | 'leave', now: number, generation = 0) =>
  Story.Command.resolve(
    ReadPlaybackTime,
    ThinkingDemoBlock.Message.CompletedReadPlaybackTime({ action, now, generation }),
  )
const cancelStep = (generation: number) =>
  Story.Command.resolve(
    WaitBeforeThinkingStep.Interrupt({ generation }, () => ThinkingDemoBlock.Message.Interrupted()),
    ThinkingDemoBlock.Message.Interrupted(),
  )
const cancelCharacters = (generation: number) =>
  Story.Command.resolve(
    WaitBeforeThinkingCharacters.Interrupt({ generation }, () =>
      ThinkingDemoBlock.Message.Interrupted(),
    ),
    ThinkingDemoBlock.Message.Interrupted(),
  )

it.effect(
  'manual pause retains elapsed time through visibility and resumes from the remaining delay',
  () =>
    Story.story(
      subject,
      Story.init('streaming'),
      Story.message(ThinkingDemoBlock.Message.ClickedToggle()),
      time('toggle', 1000),
      Story.model((model) => {
        expect(model.playback).toBe('playing')
        expect(model.started).toBe(1000)
      }),
      Story.message(ThinkingDemoBlock.Message.ClickedToggle()),
      time('toggle', 1300),
      cancelStep(0),
      Story.model((model) => {
        expect(model.playback).toBe('paused')
        expect(model.elapsed).toBe(300)
        expect(model.isManuallyPaused).toBe(true)
      }),
      Story.message(ThinkingDemoBlock.Message.UpdatedVisibility({ ratio: 0.8 })),
      time('enter', 2000),
      Story.model((model) => expect(model.playback).toBe('paused')),
      Story.message(ThinkingDemoBlock.Message.ClickedToggle()),
      time('toggle', 2500),
      Story.model((model) => {
        expect(model.playback).toBe('playing')
        expect(model.started).toBe(2500)
        expect(model.elapsed).toBe(300)
        expect(model.isManuallyPaused).toBe(false)
      }),
      Story.message(ThinkingDemoBlock.Message.ClickedToggle()),
      time('toggle', 2800),
      cancelStep(0),
    ),
)

it.effect('replaying a finished sequence creates only the next child occurrence', () =>
  Story.story(
    subject,
    Story.init('streaming'),
    Story.message(ThinkingDemoBlock.Message.ClickedToggle()),
    time('toggle', 1000),
    ...[400, 1800, 3200, 4200, 5200].flatMap((delay) => [
      Story.Command.resolve(
        WaitBeforeThinkingStep,
        ThinkingDemoBlock.Message.CompletedWaitBeforeThinkingStep({
          generation: 0,
          epoch: 0,
          now: 1000 + delay,
        }),
      ),
      cancelCharacters(0),
    ]),
    Story.model((model) => expect(model.playback).toBe('finished')),
    Story.message(ThinkingDemoBlock.Message.ClickedToggle()),
    time('toggle', 8000),
    cancelStep(0),
    cancelCharacters(0),
    Story.model((model) => {
      expect(model.playback).toBe('playing')
      expect(model.generation).toBe(1)
      expect(model.fired).toBe(0)
      expect(Object.keys(model.roots)).toEqual(['streaming-1'])
    }),
    Story.message(ThinkingDemoBlock.Message.ClickedToggle()),
    time('toggle', 8100, 1),
    cancelStep(1),
  ),
)
