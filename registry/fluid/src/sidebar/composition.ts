/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Schema } from 'effect'
import { DialogBlock } from '../dialog.js'
import { DocumentTooltipBlock } from '../tooltip-native-public.js'
import { PresenceBlock } from '../presence.js'
import type { SidebarConfig } from '../sidebar-state.js'
import { SidebarBlock, Message, OutMessage } from './definition.js'
import { observeSidebar } from '../sidebar-observer.js'

export const Mobile = SidebarBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'dialog',
  init: {
    contextToArgs: (config: SidebarConfig) => [
      { id: `${config.id}-mobile`, focusSelector: '[data-sidebar-mobile-panel]' },
    ],
  },
}).withOutMessagePolicy({
  fold: SidebarBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: ({ open }) =>
      SidebarBlock.makeOutMessageStep(() => OutMessage.OpenChanged({ open, mobile: true })),
    CompletedClose: SidebarBlock.makeNoopStep,
  }),
})

export const PeekPresence = SidebarBlock.makeRequiredFieldBinding(PresenceBlock, {
  field: 'peekPresence',
  init: { contextToArgs: (config: SidebarConfig) => [{ id: `${config.id}-peek` }] },
}).withOutMessagePolicy({
  fold: SidebarBlock.makeOutMessageFold(PresenceBlock, {
    Entered: SidebarBlock.makeNoopStep,
    StartedExit: SidebarBlock.makeNoopStep,
    Exited: SidebarBlock.makeNoopStep,
  }),
})

export const RailTooltips = SidebarBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'railTooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: SidebarBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: SidebarBlock.makeNoopStep,
  }),
})

export const SynchronizePeek = SidebarBlock.makeStep((model) => {
  if (model.peeking) {
    return PeekPresence.requestShow()
  }

  if (model.open || model.mobile || model.resizing) {
    return PeekPresence.requestReset()
  }

  return PeekPresence.requestHide()
})

export const Observe = SidebarBlock.makeMountStream('SidebarNative', {
  args: {
    breakpoint: Schema.Finite,
    shortcut: Schema.NullOr(Schema.String),
    side: Schema.Literals(['left', 'right']),
    persist: Schema.Boolean,
  },
  messages: [
    Message.Toggled,
    Message.ObservedMobile,
    Message.ChangedPeek,
    Message.Resized,
    Message.ClosedForDesktop,
    Message.CompletedPin,
    Message.CompletedDragFlip,
  ],
  *handler() {
    return ({ element, viewStateChanges, ...config }) =>
      observeSidebar<
        | typeof Message.Toggled.Type
        | typeof Message.ObservedMobile.Type
        | typeof Message.ChangedPeek.Type
        | typeof Message.Resized.Type
        | typeof Message.ClosedForDesktop.Type
        | typeof Message.CompletedPin.Type
        | typeof Message.CompletedDragFlip.Type
      >(element, viewStateChanges, config, {
        toggle: Message.Toggled,
        mobile: (mobile) =>
          mobile
            ? [Message.ObservedMobile({ mobile })]
            : [Message.ObservedMobile({ mobile }), Message.ClosedForDesktop()],
        peek: (open) => Message.ChangedPeek({ open }),
        resized: (width, open, resizing) => Message.Resized({ width, open, resizing }),
        pinComplete: (generation) => Message.CompletedPin({ generation }),
        dragComplete: (generation) => Message.CompletedDragFlip({ generation }),
      })
  },
})

export const SidebarComposition = SidebarBlock.makeComposition({
  bindings: [Mobile, PeekPresence, RailTooltips],
  mounts: [Observe],
})
