import { HoverMode } from './hover-observation.js'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { HoverBlock } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import { ScrollAreaBlock } from './scroll-area.js'
import { PopupBlock } from './date-picker-popup.js'
import type { PopupAuthority } from './date-picker-popup-authority.js'
import type { TimeFieldViewInputs } from './date-picker-time.js'
import { TimeFieldAction, TimeFieldConfig, TimeFieldState } from './date-picker-time-state.js'

export const Model = Schema.Struct({
  scroll: ScrollAreaBlock.Model,
  popup: PopupBlock.Model,
  field: TimeFieldState,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
  scrollSerial: Schema.Int,
  scrollMode: Schema.Literals(['center', 'nearest']),
})

export const Message = defineMessageUnion({
  Requested: { action: TimeFieldAction },
  Disposed: {},
})

export const OutMessage = defineMessageUnion({ Committed: { minutes: Schema.Finite } })

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedAction: { action: TimeFieldAction },
  RequestedConfigure: { config: TimeFieldConfig },
  RequestedReset: {},
  RequestedDismiss: {},
})

export const TimeFieldKey = Symbol('TimeField')

export const TimeFieldBlock = Block.make('TimeField', {
  key: TimeFieldKey,
  InitArgs: Schema.Tuple([TimeFieldConfig]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<TimeFieldViewInputs>() },
  effects: Block.makeEffectsContract<never, PopupAuthority>(),
  inMessageOutputs: {
    RequestedAction: { outMessage: OutMessage.Committed },
    RequestedDismiss: { outMessage: OutMessage.Committed },
  },
})
