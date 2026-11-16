import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { BreadcrumbBlock, layer } from '../src/breadcrumb.js'

const subject = { block: BreadcrumbBlock, layer }

it.effect('responsive disclosure keeps the accepted expanded state across width changes', () =>
  Story.story(
    subject,
    Story.init({ id: 'trail', count: 6 }),
    Story.message(BreadcrumbBlock.Message.Observed({ hiddenCount: 3, truncated: ['page'] })),
    Story.message(BreadcrumbBlock.Message.Toggled()),
    Story.expectOutMessage(BreadcrumbBlock.OutMessage.ExpandedChanged({ expanded: true })),
    Story.message(BreadcrumbBlock.Message.Observed({ hiddenCount: 0, truncated: [] })),
    Story.model((model) => {
      expect(model.expanded).toBe(true)
      expect(model.truncated).toEqual([])
    }),
    Story.inMessage(BreadcrumbBlock.InMessage.RequestedExpanded({ expanded: false })),
    Story.model((model) => {
      expect(model.expanded).toBe(false)
    }),
    Story.Command.expectNone(),
  ),
)

it.effect(
  'changing the trail count clears stale collapsed steps while keeping explicit expansion',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'changing-trail', count: 6, expanded: true }),
      Story.message(BreadcrumbBlock.Message.Observed({ hiddenCount: 3, truncated: [] })),
      Story.inMessage(BreadcrumbBlock.InMessage.RequestedCount({ count: 3 })),
      Story.model((model) => {
        expect(model.count).toBe(3)
        expect(model.hiddenCount).toBe(0)
        expect(model.expanded).toBe(true)
      }),
      Story.Command.expectNone(),
    ),
)

it.effect('explicit collapse policy preserves expansion and rejects stale measured collapse', () =>
  Story.story(
    subject,
    Story.init({ id: 'policy-trail', count: 6 }),
    Story.inMessage(BreadcrumbBlock.InMessage.RequestedCollapse({ collapse: 'always' })),
    Story.model((model) => expect(model.hiddenCount).toBe(3)),
    Story.message(BreadcrumbBlock.Message.Observed({ hiddenCount: 0, truncated: [] })),
    Story.model((model) => expect(model.hiddenCount).toBe(3)),
    Story.inMessage(BreadcrumbBlock.InMessage.RequestedExpanded({ expanded: true })),
    Story.model((model) => expect(model.hiddenCount).toBe(0)),
    Story.inMessage(BreadcrumbBlock.InMessage.RequestedExpanded({ expanded: false })),
    Story.inMessage(BreadcrumbBlock.InMessage.RequestedCount({ count: 4 })),
    Story.model((model) => expect(model.hiddenCount).toBe(1)),
    Story.inMessage(BreadcrumbBlock.InMessage.RequestedCollapse({ collapse: 'never' })),
    Story.message(BreadcrumbBlock.Message.Observed({ hiddenCount: 2, truncated: [] })),
    Story.model((model) => expect(model.hiddenCount).toBe(0)),
    Story.Command.expectNone(),
  ),
)
