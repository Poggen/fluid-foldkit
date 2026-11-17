import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { DocumentTooltipBlock, layer } from '../src/tooltip-native/document.js'
import { TooltipStoryLayer } from './tooltip-story-services.js'

const required = <A>(value: A | undefined): A => {
  if (value === undefined) throw new Error('Missing Tooltip fixture entry')
  return value
}
const subject = { block: DocumentTooltipBlock, layer }
const message = DocumentTooltipBlock.InMessage
const add = (key: string, presentation: 'independent' | 'morph' = 'morph') =>
  Story.inMessage(message.RequestedAdd({ key, groupKey: 'group', group: { presentation } }))
const visibility = (key: string, next: boolean) =>
  Story.inMessage(message.RequestedVisibility({ key, next, reason: 'focus' }))

it.effect('morph closes semantics immediately while its visual hold has a separate clock', () =>
  Story.story(
    subject,
    Story.init(),
    add('a'),
    visibility('a', true),
    visibility('a', false),
    Story.model((model) => {
      expect(model.groups.group?.visual._tag).toBe('Holding')
      expect(model.rows.a?.presentation.internalOpen).toBe(false)
      expect(Option.isSome(model.clocks.group?.hold ?? Option.none())).toBe(true)
      expect(Option.getOrThrow(required(model.clocks.group).pending).delay).toBe(300)
      expect(Option.isNone(required(model.rows.a).interaction.exitWait)).toBe(true)
    }),
    Story.Command.expectNone(),
  ).pipe(Effect.provide(TooltipStoryLayer)),
)

it.effect('provider-only grouping retains ordinary exit and never starts a morph hold', () =>
  Story.story(
    subject,
    Story.init(),
    add('a', 'independent'),
    visibility('a', true),
    visibility('a', false),
    Story.model((model) => {
      expect(model.groups.group?.visual._tag).toBe('Empty')
      expect(Option.isNone(required(model.clocks.group).hold)).toBe(true)
      expect(Option.isSome(required(model.rows.a).interaction.exitWait)).toBe(true)
    }),
    Story.Command.expectNone(),
  ).pipe(Effect.provide(TooltipStoryLayer)),
)

it.effect('same-key reopen cancels hold and a neighbor requests measured transfer', () =>
  Story.story(
    subject,
    Story.init(),
    add('a'),
    add('b'),
    visibility('a', true),
    visibility('a', false),
    visibility('a', true),
    Story.model((model) => {
      expect(model.groups.group?.visual._tag).toBe('Shown')
      expect(Option.isNone(required(model.clocks.group).hold)).toBe(true)
    }),
    visibility('b', true),
    Story.model((model) => {
      expect(model.groups.group?.visual).toMatchObject({ _tag: 'Transferring', from: 'a', to: 'b' })
      expect(model.rows.a?.presentation.internalOpen).toBe(false)
      expect(Option.isNone(required(model.rows.a).interaction.exitWait)).toBe(true)
    }),
    Story.Command.expectNone(),
  ).pipe(Effect.provide(TooltipStoryLayer)),
)

it.effect('an open forced source is not admitted as transfer content', () =>
  Story.story(
    subject,
    Story.init(),
    add('a'),
    add('b'),
    Story.inMessage(message.RequestedConfigure({ key: 'a', options: { forceOpen: true } })),
    visibility('b', true),
    Story.model((model) => {
      expect(model.groups.group?.visual).toMatchObject({ _tag: 'Shown', key: 'b' })
      expect(Option.getOrThrow(required(model.rows.a).presentation.configuration.forceOpen)).toBe(
        true,
      )
      expect(model.rows.a?.presentation.phase).toBe('present')
    }),
    Story.Command.expectNone(),
  ).pipe(Effect.provide(TooltipStoryLayer)),
)

it.effect('removal before capture aborts transfer and updates retain the established mode', () =>
  Story.story(
    subject,
    Story.init(),
    add('a'),
    add('b'),
    visibility('a', true),
    visibility('b', true),
    Story.inMessage(message.RequestedRemove({ key: 'a' })),
    Story.inMessage(message.RequestedGroup({ groupKey: 'group', skipDelayDuration: 0 })),
    Story.model((model) => {
      expect(model.groups.group?.visual).toMatchObject({ _tag: 'Shown', key: 'b' })
      expect(model.groups.group?.presentation).toBe('morph')
    }),
    Story.Command.expectNone(),
  ).pipe(Effect.provide(TooltipStoryLayer)),
)

it.effect('changing group presentation while open starts and stops its owned visual hold', () =>
  Story.story(
    subject,
    Story.init(),
    add('a', 'independent'),
    visibility('a', true),
    Story.inMessage(message.RequestedGroup({ groupKey: 'group', presentation: 'morph' })),
    Story.model((model) => {
      expect(model.groups.group?.visual).toMatchObject({ _tag: 'Shown', key: 'a' })
      expect(model.clocks.group?.morph).toBe(true)
    }),
    visibility('a', false),
    Story.inMessage(message.RequestedGroup({ groupKey: 'group', presentation: 'independent' })),
    Story.model((model) => {
      expect(Option.isNone(required(model.clocks.group).hold)).toBe(true)
      expect(Option.isSome(required(model.rows.a).interaction.exitWait)).toBe(true)
      expect(model.clocks.group?.morph).toBe(false)
    }),
    Story.Command.expectNone(),
  ).pipe(Effect.provide(TooltipStoryLayer)),
)

it.effect('removing the last shared occurrence releases its group clock', () =>
  Story.story(
    subject,
    Story.init(),
    add('a'),
    visibility('a', true),
    visibility('a', false),
    Story.inMessage(message.RequestedRemove({ key: 'a' })),
    Story.model((model) => {
      expect(model.groups.group).toBeUndefined()
      expect(model.clocks.group).toBeUndefined()
    }),
    Story.Command.expectNone(),
  ).pipe(Effect.provide(TooltipStoryLayer)),
)
