/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { TooltipDom } from '../tooltip-native-public.js'
import { DocumentTooltipBlock } from '../tooltip-native-public.js'
import type { DialogResources } from '../dialog-resources.js'
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { DialogBlock } from '../dialog.js'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { SidebarConfigSchema, SidebarOptions } from '../sidebar-state.js'
import { PresenceBlock } from '../presence.js'
import type { MotionOptions } from '../motion.js'
import type { Presentation, PresentationContext } from '../presentation.js'

export const Model = Schema.Struct({
  options: SidebarOptions,
  railTooltips: DocumentTooltipBlock.Model,
  railTooltipOpen: Schema.Option(Schema.Boolean),
  open: Schema.Boolean,
  controlled: Schema.Boolean,
  mobile: Schema.Boolean,
  mounted: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  width: Schema.String,
  peeking: Schema.Boolean,
  resizing: Schema.Boolean,
  pinHold: Schema.Boolean,
  pinGeneration: Schema.Natural,
  dragFlip: Schema.Natural,
  dragGeneration: Schema.Natural,
  peekPresence: PresenceBlock.Model,
  persisted: Schema.OptionFromNullOr(Schema.Boolean),
  dialog: DialogBlock.Model,
})

export const Message = defineMessageUnion({
  Toggled: {},
  ClosedForDesktop: {},
  ObservedMobile: { mobile: Schema.Boolean },
  ChangedPeek: { open: Schema.Boolean },
  Resized: { width: Schema.Finite, open: Schema.Boolean, resizing: Schema.Boolean },
  CompletedPin: { generation: Schema.Natural },
  CompletedDragFlip: { generation: Schema.Natural },
})

export const OutMessage = defineMessageUnion({
  OpenChanged: { open: Schema.Boolean, mobile: Schema.Boolean },
  WidthChanged: { width: Schema.String },
})

export const InMessage = defineInMessageUnion({
  RequestedPresentation: {
    side: SidebarOptions.fields.side,
    variant: SidebarOptions.fields.variant,
  },
  RequestedBehavior: {
    peek: SidebarOptions.fields.peek,
    collapsible: SidebarOptions.fields.collapsible,
    rail: Schema.Boolean,
  },
  RequestedRailTooltipOpen: { open: Schema.NullOr(Schema.Boolean) },
  RequestedToggle: {},
  RequestedOpen: { open: Schema.Boolean },
  RequestedControlledOpen: { open: Schema.Boolean },
  RequestedWidth: { width: Schema.String },
})

const effects = Block.makeEffectsContract<never, DialogResources | TooltipDom>()

export const SidebarKey = Symbol('FluidSidebar')

export const SidebarBlock = Block.make('Sidebar', {
  key: SidebarKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([SidebarConfigSchema]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<SidebarViewInputs>() },
  effects,
  inMessageOutputs: {
    RequestedToggle: { outMessage: OutMessage.OpenChanged },
    RequestedOpen: { outMessage: OutMessage.OpenChanged },
  },
})

export interface SidebarRenderInfo {
  readonly open: boolean
  readonly mobile: boolean
  readonly peeking: boolean
  readonly side: 'left' | 'right'
  readonly ownerId: string
  readonly shortcut: string | null
  readonly shortcutKey: string
  readonly trigger: ReadonlyArray<ChildAttribute>
}

export type SidebarDesktopRenderInfo = SidebarRenderInfo & {
  readonly occurrence: 'desktop'
  readonly idPrefix: string
}

export type SidebarMobileRenderInfo = SidebarRenderInfo & {
  readonly occurrence: 'mobile'
  readonly idPrefix: string
}

export interface SidebarViewInputs extends Presentation {
  readonly animate: (node: Html, options: MotionOptions) => Html
  /** Desktop content retains its interaction owners across the mobile breakpoint. */
  readonly content: (
    info: SidebarDesktopRenderInfo,
    context: PresentationContext,
  ) => ReadonlyArray<Html>
  /** Separate mobile child owners/IDs; never embed the desktop Binding again. */
  readonly mobileContent: (
    info: SidebarMobileRenderInfo,
    context: PresentationContext,
  ) => ReadonlyArray<Html>
  readonly inset: (info: SidebarRenderInfo, context: PresentationContext) => ReadonlyArray<Html>
  readonly title?: string
  readonly className?: string
  readonly bordered?: boolean
  readonly panelClassName?: string
  readonly sidebarClassName?: string
  readonly insetClassName?: string
}
