import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Story } from 'foldkit'
import {
  ThinkingStepsBlock,
  ThinkingStepsLayer,
  ThinkingStepDetailsBlock,
  ThinkingStepDetailsLayer,
} from '../src/thinking-steps.js'

const root = { block: ThinkingStepsBlock, layer: ThinkingStepsLayer }
const details = { block: ThinkingStepDetailsBlock, layer: ThinkingStepDetailsLayer }
const { InMessage, OutMessage } = ThinkingStepsBlock
const configure = (inputs: Omit<typeof InMessage.RequestedConfigure.Type, '_tag'>) =>
  Story.inMessage(InMessage.RequestedConfigure(inputs))
const open = (expected: boolean) =>
  Story.model<typeof ThinkingStepsBlock.Model.Type>((model) => expect(model.open).toBe(expected))

it.effect('running follows current input until a real manual choice exists', () =>
  Story.story(
    root,
    Story.init({ id: 'root' }),
    open(true),
    configure({ open: null, disabled: false, running: false }),
    open(false),
    Story.expectNoOutMessage(),
    configure({ open: null, disabled: false, running: true }),
    open(true),
    Story.expectNoOutMessage(),
    Story.inMessage(InMessage.RequestedToggle()),
    open(false),
    Story.expectOutMessage(OutMessage.OpenChanged({ open: false })),
    configure({ open: null, disabled: false, running: false }),
    open(false),
    configure({ open: null, disabled: false, running: true }),
    open(false),
  ),
)

it.effect('root default is current while omitted additive inputs retain legacy configuration', () =>
  Story.story(
    root,
    Story.init({ id: 'root', defaultOpen: false }),
    open(false),
    configure({ open: null, disabled: false }),
    open(false),
    configure({ open: null, disabled: false, defaultOpen: true }),
    open(true),
    configure({ open: null, disabled: false, defaultOpen: false }),
    open(false),
    configure({ open: null, disabled: false, running: true }),
    open(true),
    configure({ open: null, disabled: false }),
    open(true),
    configure({ open: null, disabled: false, running: null }),
    open(false),
    configure({ open: null, disabled: false, defaultOpen: null }),
    open(true),
    Story.inMessage(InMessage.RequestedToggle()),
    open(false),
    configure({ open: null, disabled: false, defaultOpen: true }),
    open(false),
  ),
)

it.effect('controlled refusal and acceptance never manufacture a manual preference', () =>
  Story.story(
    root,
    Story.init({ id: 'root', open: false, running: false }),
    Story.inMessage(InMessage.RequestedToggle()),
    open(false),
    Story.expectOutMessage(OutMessage.OpenChanged({ open: true })),
    configure({ open: true, disabled: false }),
    open(true),
    Story.expectNoOutMessage(),
    configure({ open: null, disabled: false }),
    open(false),
    configure({ open: false, disabled: false, running: true }),
    open(false),
    Story.inMessage(InMessage.RequestedToggle()),
    open(false),
    configure({ open: null, disabled: false }),
    open(true),
  ),
)

it.effect(
  'controlled release restores an earlier manual preference and disabled still accepts inputs',
  () =>
    Story.story(
      root,
      Story.init({ id: 'root', defaultOpen: false }),
      Story.inMessage(InMessage.RequestedToggle()),
      open(true),
      configure({ open: false, disabled: false, running: false }),
      open(false),
      Story.inMessage(InMessage.RequestedToggle()),
      open(false),
      configure({ open: null, disabled: true }),
      open(true),
      Story.inMessage(InMessage.RequestedToggle()),
      open(true),
      Story.expectNoOutMessage(),
      configure({ open: false, disabled: true }),
      open(false),
      Story.expectNoOutMessage(),
    ),
)

it.effect('details retain the initial closed fallback and ignore root-only policy inputs', () =>
  Story.story(
    details,
    Story.init({ id: 'details' }),
    open(false),
    Story.inMessage(
      ThinkingStepDetailsBlock.InMessage.RequestedConfigure({
        open: null,
        disabled: false,
        running: true,
        defaultOpen: true,
      }),
    ),
    open(false),
    Story.inMessage(ThinkingStepDetailsBlock.InMessage.RequestedToggle()),
    open(true),
    Story.inMessage(
      ThinkingStepDetailsBlock.InMessage.RequestedConfigure({
        open: null,
        disabled: false,
        running: false,
        defaultOpen: false,
      }),
    ),
    open(true),
  ),
)
