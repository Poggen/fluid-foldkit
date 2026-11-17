// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Option, Schema, Number } from 'effect'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({
  id: Schema.String,
  details: Schema.Boolean,
  controlled: Schema.OptionFromNullOr(Schema.Boolean),
  manual: Schema.OptionFromNullOr(Schema.Boolean),
  running: Schema.OptionFromNullOr(Schema.Boolean),
  defaultOpen: Schema.Boolean,
  open: Schema.Boolean,
  disabled: Schema.Boolean,
  hidden: Schema.Boolean,
  generation: Schema.Natural,
  hovered: Schema.Boolean,
  hoverPaint: Schema.Boolean,
  hoverGeneration: Schema.Natural,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Toggled: {},
  CompletedPanel: { generation: Schema.Natural },
  Hovered: { hovered: Schema.Boolean },
  CompletedHover: { generation: Schema.Natural },
})

export const OutMessage = defineMessageUnion({ OpenChanged: { open: Schema.Boolean } })

export const InMessage = defineInMessageUnion({
  RequestedConfigure: {
    open: Schema.NullOr(Schema.Boolean),
    disabled: Schema.Boolean,
    running: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
    defaultOpen: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
  },
  RequestedToggle: {},
})

export interface ThinkingStepsConfig {
  readonly id: string
  readonly open?: boolean
  readonly running?: boolean
  readonly defaultOpen?: boolean
  readonly disabled?: boolean
}

export const initialize = (config: ThinkingStepsConfig, details: boolean) => {
  const defaultOpen = config.defaultOpen ?? !details
  const running = details ? Option.none<boolean>() : Option.fromUndefinedOr(config.running)
  const open = config.open ?? Option.getOrElse(running, () => defaultOpen)

  return {
    model: Model.make({
      id: config.id,
      details,
      controlled: Option.fromUndefinedOr(config.open),
      manual: Option.none(),
      running,
      defaultOpen,
      open,
      disabled: config.disabled ?? false,
      hidden: !open,
      generation: 0,
      hovered: false,
      hoverPaint: false,
      hoverGeneration: 0,
    }),
  }
}

export const changedOpen = (model: Model, open: boolean) =>
  open === model.open
    ? model
    : modifyFields(model, { open: () => open, hidden: () => false, generation: Number.increment })

export const toggle = (model: Model) =>
  model.disabled
    ? { model }
    : {
        model: Option.isNone(model.controlled)
          ? modifyFields(changedOpen(model, !model.open), {
              manual: () => Option.some(!model.open),
            })
          : model,
        outMessage: OutMessage.OpenChanged({ open: !model.open }),
      }

export const configure = (model: Model, inputs: typeof InMessage.RequestedConfigure.Type) => {
  const next = modifyFields(model, {
    controlled: () => Option.fromNullOr(inputs.open),
    disabled: () => inputs.disabled,
    running: () =>
      model.details || inputs.running === undefined
        ? model.running
        : Option.fromNullOr(inputs.running),
    defaultOpen: () =>
      model.details || inputs.defaultOpen === undefined
        ? model.defaultOpen
        : (inputs.defaultOpen ?? true),
  })
  const open = Option.getOrElse(next.controlled, () =>
    Option.getOrElse(next.manual, () => Option.getOrElse(next.running, () => next.defaultOpen)),
  )
  return { model: changedOpen(next, open) }
}
