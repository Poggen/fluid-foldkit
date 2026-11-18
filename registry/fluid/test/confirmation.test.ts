import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { ConfirmationBlock as block, layer } from '../src/confirmation.js'
import { BannerBlock, test as bannerTest } from '../src/banner.js'
const subject = { block, layer }
const capturedPreference = Story.Command.resolve(
  bannerTest.CaptureReducedMotion,
  BannerBlock.Message.CapturedReducedMotion({ value: false, mountGeneration: 0 }),
)
it.effect('reports approval and denial without answering until the parent accepts', () =>
  Story.story(
    subject,
    Story.init({ id: 'confirmation' }),
    capturedPreference,
    Story.message(block.Message.ClickedApprove()),
    Story.expectOutMessage(block.OutMessage.Approved()),
    Story.model((model) => expect(model.state).toBe('requested')),
    Story.inMessage(block.InMessage.RequestedState({ state: 'approved' })),
    Story.message(block.Message.ClickedDeny()),
    Story.expectNoOutMessage(),
    Story.inMessage(block.InMessage.RequestedState({ state: 'requested' })),
    Story.message(block.Message.ClickedDeny()),
    Story.expectOutMessage(block.OutMessage.Denied()),
    Story.model((model) => expect(model.state).toBe('requested')),
    Story.inMessage(block.InMessage.RequestedState({ state: 'denied' })),
    Story.model((model) => expect(model.state).toBe('denied')),
    Story.Command.expectNone(),
  ),
)
it.effect('retains Banner controlled visibility and forwards dismissal intent', () =>
  Story.story(
    subject,
    Story.init({ id: 'visible', open: true, state: 'approved' }),
    capturedPreference,
    Story.inMessage(block.InMessage.RequestedDismiss()),
    Story.expectOutMessage(block.OutMessage.Dismissed()),
    Story.model((model) => expect(model.banner.phase).toBe('Present')),
    Story.inMessage(block.InMessage.RequestedConfigureOpen({ open: false })),
    Story.model((model) => expect(model.banner.phase).toBe('Exiting')),
    Story.inMessage(block.InMessage.RequestedReset()),
    Story.Command.resolve(
      bannerTest.CaptureReducedMotion,
      BannerBlock.Message.CapturedReducedMotion({ value: false, mountGeneration: 1 }),
    ),
    Story.model((model) => {
      expect(model.banner.phase).toBe('Closed')
      expect(model.state).toBe('requested')
    }),
    Story.inMessage(block.InMessage.RequestedOpen()),
    Story.model((model) => expect(model.banner.phase).toBe('Closed')),
    Story.inMessage(block.InMessage.RequestedConfigureOpen({ open: true })),
    Story.model((model) => expect(model.banner.phase).toBe('Present')),
    Story.Command.expectNone(),
  ),
)
