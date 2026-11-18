/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { DropdownRow } from './dropdown-state.js'

export const DropdownObservation = defineMessageUnion({
  MeasuredRows: { rows: Schema.Array(DropdownRow) },
  FocusedRow: { id: Schema.OptionFromNullOr(Schema.String), visible: Schema.Boolean },
  PressedNavigationKey: { key: Schema.String, searchId: Schema.OptionFromNullOr(Schema.String) },
  TypedCharacter: { character: Schema.String },
  ActivatedRow: { id: Schema.String },
  Dismissed: {
    restore: Schema.Boolean,
    generation: Schema.Natural,
    reason: Schema.Literals(['escape', 'outside', 'focus', 'tab', 'left']),
  },
  CompletedExit: { generation: Schema.Natural },
  RequestedOpen: { open: Schema.Boolean },
  ClickedSubTrigger: {},
  ClickedTrigger: { withinHoverAdmission: Schema.Boolean },
  Mounted: {},
  PressedOpeningKey: { key: Schema.String },
  HoveredTrigger: { over: Schema.Boolean, openOnHover: Schema.optionalKey(Schema.Boolean) },
  MovedPointer: {},
})

export type DropdownObservation = typeof DropdownObservation.Type

export type DropdownTriggerObservation = Extract<
  DropdownObservation,
  {
    readonly _tag:
      | 'RequestedOpen'
      | 'ClickedSubTrigger'
      | 'ClickedTrigger'
      | 'PressedOpeningKey'
      | 'Mounted'
      | 'HoveredTrigger'
  }
>

export type DropdownPanelObservation = Exclude<
  DropdownObservation,
  { readonly _tag: 'ClickedSubTrigger' | 'ClickedTrigger' | 'PressedOpeningKey' | 'Mounted' }
>

export const DropdownMountArgs = Schema.Struct({
  id: Schema.String,
  rootId: Schema.String,
  parentId: Schema.OptionFromNullOr(Schema.String),
  inline: Schema.Boolean,
  side: Schema.Literals(['top', 'bottom', 'left', 'right']),
  align: Schema.Literals(['start', 'center', 'end']),
  sideOffset: Schema.Finite,
  alignOffset: Schema.Finite,
})

export const DROPDOWN_ANIMATION_COMPLETE = 'fluid-dropdown-animation-complete'
