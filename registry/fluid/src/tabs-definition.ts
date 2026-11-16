import { HoverMode } from './hover-observation.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { HoverBlock } from './hover.js'
import {
  tabsLogicalFields,
  TabsItemObservation,
  TabsItemDescriptor,
  NavigationDirection,
} from './tabs-state.js'
import { selectedPillFields } from './tabs-selected-pill-state.js'
import type { TabsViewInputs } from './tabs-contract.js'

const Model = Schema.Struct({
  ...tabsLogicalFields,
  hover: HoverBlock.Model,
  ...selectedPillFields,
  selectionGeneration: Schema.Natural,
})

export const Message = defineMessageUnion({
  CapturedMount: {},
  CapturedItems: { items: Schema.Array(TabsItemObservation) },
  CapturedMouse: { inside: Schema.Boolean },
  CapturedFocus: { index: Schema.Int, visible: Schema.Boolean },
  CapturedBlur: { inside: Schema.Boolean },
  CapturedSelection: { index: Schema.Int },
  CompletedFocus: {},
  CapturedSelectedPillLease: { lease: Schema.String },
  ObservedSelectedPillRetarget: {
    lease: Schema.String,
    revision: Schema.Natural,
    applied: Schema.Boolean,
  },
  ObservedSelectionTabStop: {
    selectedIndex: Schema.Int,
    generation: Schema.Natural,
    index: Schema.OptionFromNullOr(Schema.Int),
  },
  CompletedHighlightExit: { kind: Schema.Literals(['hover', 'focus']), generation: Schema.Natural },
  CompletedLabelExit: { index: Schema.Int, generation: Schema.Natural },
})

const effects = Block.makeEffectsContract()

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedNavigate: {
    direction: NavigationDirection,
    items: Schema.Array(TabsItemDescriptor),
    focus: Schema.Boolean,
  },
  RequestedSelected: { selectedIndex: Schema.Int },
  RequestedActiveLabel: { activeLabel: Schema.Boolean },
  RequestedDirection: { direction: Schema.Literals(['ltr', 'rtl']) },
})

export const OutMessage = defineMessageUnion({ Selected: { index: Schema.Int } })

const Config = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  selectedIndex: Schema.Int,
  activeLabel: Schema.optionalKey(Schema.Boolean),
  direction: Schema.optionalKey(Schema.Literals(['ltr', 'rtl'])),
  idPrefix: Schema.optionalKey(Schema.String),
})

export const TabsBlockKey = Symbol('TabsBlock')

export const TabsBlock = Block.make('Tabs', {
  key: TabsBlockKey,
  InitArgs: Schema.Tuple([Config]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<TabsViewInputs>() },
  effects,
  inMessageOutputs: { RequestedNavigate: { outMessage: OutMessage.Selected } },
})
