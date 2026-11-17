import { Schema } from 'effect'
import { GroupPresentation } from './group-visual.js'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Side, Transaction, configuration, initialGroup } from './domain.js'

export const Message = defineMessageUnion({})

const TooltipOptions = Schema.Struct({
  hoverable: Schema.optionalKey(Schema.UndefinedOr(Schema.Boolean)),
  side: Schema.optionalKey(Schema.UndefinedOr(Side)),
  sideOffset: Schema.optionalKey(Schema.UndefinedOr(Schema.Number)),
  delayDuration: Schema.optionalKey(Schema.UndefinedOr(Schema.Number)),
  forceOpen: Schema.optionalKey(Schema.UndefinedOr(Schema.Boolean)),
  followCursor: Schema.optionalKey(Schema.UndefinedOr(Schema.Literals(['x', 'y']))),
})

const GroupOptions = Schema.Struct({
  presentation: Schema.optionalKey(Schema.UndefinedOr(GroupPresentation)),
  delayDuration: Schema.optionalKey(Schema.UndefinedOr(Schema.Number)),
  skipDelayDuration: Schema.optionalKey(Schema.UndefinedOr(Schema.Number)),
  disableHoverableContent: Schema.optionalKey(Schema.UndefinedOr(Schema.Boolean)),
})

export const InMessage = defineInMessageUnion({
  RequestedAdd: {
    key: Schema.String,
    groupKey: Schema.optionalKey(Schema.String),
    group: Schema.optionalKey(GroupOptions),
    options: Schema.optionalKey(TooltipOptions),
  },
  RequestedRemove: { key: Schema.String },
  RequestedGroup: { groupKey: Schema.String, ...GroupOptions.fields },
  RequestedConfigure: { key: Schema.String, options: TooltipOptions },
  RequestedVisibility: { key: Schema.String, next: Schema.Boolean, reason: Schema.String },
})

export const registration = (input: typeof InMessage.RequestedAdd.Type) => ({
  key: input.key,
  groupKey: input.groupKey ?? `local:${input.key}`,
  group: initialGroup(input.group, input.groupKey === undefined),
  ownsGroup: input.groupKey === undefined,
  configuration: configuration(input.options ?? {}),
})

export const OutMessage = defineMessageUnion({ Transaction: Transaction.fields })
