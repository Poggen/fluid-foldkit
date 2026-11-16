import { Number } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { initChildren } from './thinking-example-children.js'
import {
  ThinkingDemoBlock,
  WaitBeforeThinkingStep,
  WaitBeforeThinkingCharacters,
  getDemo,
} from './thinking-example-playback.js'

type PlaybackTime = typeof ThinkingDemoBlock.Message.CompletedReadPlaybackTime.Type

const interrupt = ThinkingDemoBlock.makeCommandsStep((model) => [
  WaitBeforeThinkingStep.Interrupt({ generation: model.generation }, () =>
    ThinkingDemoBlock.Message.Interrupted(),
  ),
  WaitBeforeThinkingCharacters.Interrupt({ generation: model.generation }, () =>
    ThinkingDemoBlock.Message.Interrupted(),
  ),
])

const restartPlayback = ({ generation, now }: PlaybackTime) =>
  ThinkingDemoBlock.makeStep((model) =>
    Update.combineSteps([
      interrupt,
      ThinkingDemoBlock.makeFieldsStep(() => ({
        generation: () => generation + 1,
        epoch: Number.increment,
        fired: () => 0,
        playback: () => 'playing',
        isManuallyPaused: () => false,
        elapsed: () => 0,
        started: () => now,
        characters: () => 0,
        roots: () => ({}),
        rows: () => ({}),
        details: () => ({}),
      })),
      initChildren,
      ThinkingDemoBlock.makeCommandsStep(() => [
        WaitBeforeThinkingStep({
          generation: generation + 1,
          epoch: model.epoch + 1,
          delay: getDemo(model.id).delays[0] ?? 0,
        }),
      ]),
    ]),
  )

const pausePlayback = ({ action, generation, now }: PlaybackTime) =>
  ThinkingDemoBlock.makeStep((model) => ({
    model: modifyFields(model, {
      playback: () => 'paused',
      epoch: Number.increment,
      isManuallyPaused: () => action === 'toggle',
      elapsed: () => model.elapsed + (model.playback === 'playing' ? now - model.started : 0),
    }),
    commands: [
      WaitBeforeThinkingStep.Interrupt({ generation }, () =>
        ThinkingDemoBlock.Message.Interrupted(),
      ),
    ],
  }))

const resumePlayback = ({ generation, now }: PlaybackTime) =>
  ThinkingDemoBlock.makeStep((model) => ({
    model: modifyFields(model, {
      playback: () => 'playing',
      isManuallyPaused: () => false,
      started: () => now,
    }),
    commands: [
      WaitBeforeThinkingStep({
        generation,
        epoch: model.epoch,
        delay: (getDemo(model.id).delays[model.fired] ?? model.elapsed) - model.elapsed,
      }),
    ],
  }))

export const handleCompletedReadPlaybackTime = ThinkingDemoBlock.makeStep(
  (model, message: PlaybackTime) => {
    const { action, generation } = message
    if (generation !== model.generation) return ThinkingDemoBlock.makeNoopStep()
    const demo = getDemo(model.id)
    if (demo.delays.length === 0 || (action === 'enter' && model.isManuallyPaused)) {
      return ThinkingDemoBlock.makeNoopStep()
    }
    if (model.playback === 'finished') {
      return action === 'toggle' ? restartPlayback(message) : ThinkingDemoBlock.makeNoopStep()
    }
    if (action === 'leave' || (action === 'toggle' && model.playback === 'playing')) {
      return pausePlayback(message)
    }
    return model.playback === 'playing' ? ThinkingDemoBlock.makeNoopStep() : resumePlayback(message)
  },
)
