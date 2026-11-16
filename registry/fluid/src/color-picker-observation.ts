// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { NumberDisplay } from './color-number-locale.js'
import { Channel } from './color-picker-state.js'

export const colorObservationFields = {
  Mounted: { supported: Schema.Boolean, numberDisplay: Schema.optional(NumberDisplay) },
  SquarePointer: {
    phase: Schema.Literals(['down', 'move', 'up', 'cancel']),
    pointer: Schema.Int,
    x: Schema.Finite,
    y: Schema.Finite,
    left: Schema.Finite,
    top: Schema.Finite,
    width: Schema.Finite,
    height: Schema.Finite,
  },
  SquareHover: { hovered: Schema.Boolean },
  SquareFocus: { focused: Schema.Boolean },
  SquareKey: { key: Schema.String, shift: Schema.Boolean },
  FieldFocus: { channel: Channel },
  FieldDraft: { channel: Channel, value: Schema.String },
  FieldBlur: { channel: Channel, value: Schema.String },
  FieldAutofill: { channel: Channel, value: Schema.String },
  FieldKey: {
    channel: Channel,
    key: Schema.String,
    numeric: Schema.optional(Schema.Finite),
    shift: Schema.Boolean,
    alt: Schema.optional(Schema.Boolean),
  },
  FieldWheel: {
    channel: Channel,
    delta: Schema.Finite,
    shift: Schema.Boolean,
    alt: Schema.optional(Schema.Boolean),
  },
  ScrubDown: {
    channel: Channel,
    pointer: Schema.Int,
    x: Schema.Finite,
    y: Schema.optional(Schema.Finite),
    scale: Schema.optional(Schema.Finite),
    cursor: Schema.optional(Schema.Boolean),
    pointerType: Schema.optional(Schema.String),
  },
  ScrubMove: {
    pointer: Schema.Int,
    x: Schema.Finite,
    movement: Schema.Finite,
    locked: Schema.Boolean,
    shift: Schema.Boolean,
    alt: Schema.optional(Schema.Boolean),
    movementY: Schema.optional(Schema.Finite),
    left: Schema.optional(Schema.Finite),
    top: Schema.optional(Schema.Finite),
    right: Schema.optional(Schema.Finite),
    bottom: Schema.optional(Schema.Finite),
    scale: Schema.optional(Schema.Finite),
  },
  ScrubLock: { locked: Schema.Boolean },
  ScrubUp: { pointer: Schema.Int, cancelled: Schema.Boolean },
  Pressed: { pressed: Schema.Boolean },
}

export const ColorObservation = defineMessageUnion(colorObservationFields)
