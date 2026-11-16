// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

export const Status = Schema.Literals(['idle', 'copied', 'error'])

export const Variant = Schema.Literals(['icon', 'button'])

export const Align = Schema.Literals(['right', 'left'])

export const Model = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  variant: Variant,
  align: Align,
  displayedVariant: Variant,
  glyphInitial: Schema.Boolean,
  rootRevision: Schema.Natural,
  lifetimeRevision: Schema.Natural,
  hasMounted: Schema.Boolean,
  disabled: Schema.Boolean,
  status: Status,
  copyCount: Schema.Natural,
  tooltipState: Schema.Literals(['idle', 'copied', 'suppressed']),
  tooltipVisible: Schema.Boolean,
  tooltipWasVisible: Schema.Boolean,
  displayed: Status,
  displayedCount: Schema.Natural,
  exiting: Schema.Boolean,
})

export const Config = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  disabled: Schema.optionalKey(Schema.Boolean),
  variant: Schema.optionalKey(Variant),
  align: Schema.optionalKey(Align),
})

export type InputCopyConfig = typeof Config.Type

export const InputCopyEvent = Schema.TaggedUnion({
  Copied: {},
  TooltipChanged: {
    enabled: Schema.Boolean,
    forceOpen: Schema.NullOr(Schema.Boolean),
    content: Schema.String,
  },
})

export const OutMessage = defineMessageUnion({ Events: { events: Schema.Array(InputCopyEvent) } })

export const InMessage = defineInMessageUnion({
  RequestedConfigure: {
    value: Schema.String,
    disabled: Schema.Boolean,
    variant: Schema.optionalKey(Variant),
    align: Schema.optionalKey(Align),
  },
  RequestedCopy: {},
  InformedOfTooltipVisibility: { open: Schema.Boolean },
})
