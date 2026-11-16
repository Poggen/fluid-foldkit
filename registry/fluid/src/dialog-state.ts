// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'

export const DialogControl = Schema.OptionFromNullOr(Schema.Boolean)

export const DialogConfig = Schema.Struct({
  id: Schema.String,
  parentDialogId: Schema.optionalKey(Schema.String),
  open: Schema.optionalKey(Schema.Boolean),
  defaultOpen: Schema.optionalKey(Schema.Boolean),
  modal: Schema.optionalKey(Schema.Boolean),
  focusSelector: Schema.optionalKey(Schema.String),
  returnFocusSelector: Schema.optionalKey(Schema.String),
})

export type DialogConfig = typeof DialogConfig.Type
