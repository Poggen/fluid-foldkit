// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { HoverMode } from './hover-observation.js'
import { Schema } from 'effect'
import * as RadioGroup from '@foldkit/ui/radioGroup'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { AskUserQuestionsViewInputs } from './ask-user-questions-parts.js'
import { HoverBlock } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import { SelectionBackgroundsBlock } from './selection-backgrounds.js'
import type { AskUserQuestionsEnvironment } from './ask-user-questions-environment.js'
import { askObservationFields } from './ask-user-questions-observer.js'
import {
  AskConfig,
  AskDefaults,
  AskSettings,
  AskEvent,
  AskFlow,
} from './ask-user-questions-state.js'
import { AskChromeSlot } from './ask-user-questions-presence.js'

export const NativeRadio = RadioGroup.makeBlock()

export const Model = Schema.Struct({
  id: Schema.String,
  radio: NativeRadio.Model,
  flow: AskFlow,
  radius: Schema.Number,
  chrome: Schema.Array(AskChromeSlot),
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
  selection: SelectionBackgroundsBlock.Model,
})

export const Message = defineMessageUnion({
  ...askObservationFields,
  CapturedNativeSelection: { index: Schema.Int },
  CompletedValidation: {
    generation: Schema.Natural,
    revision: Schema.Natural,
    error: Schema.OptionFromNullOr(Schema.String),
  },
  CompletedFocus: {},
  Unmounted: {},
  CompletedChromeExit: { key: AskChromeSlot.fields.key, generation: Schema.Natural },
})

export const OutMessage = defineMessageUnion({ Events: { events: Schema.Array(AskEvent) } })

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedRadius: { radius: Schema.Finite },
  RequestedConfigure: { config: AskSettings },
  RequestedReset: { config: AskDefaults },
  RequestedSelect: { index: Schema.Int },
  RequestedText: { value: Schema.String },
  RequestedSubmit: {},
  RequestedSkip: {},
  RequestedBack: {},
})

export const AskUserQuestionsKey = Symbol('AskUserQuestions')

const effects = Block.makeEffectsContract<never, AskUserQuestionsEnvironment>()

export const AskUserQuestionsBlock = Block.make('AskUserQuestions', {
  key: AskUserQuestionsKey,
  InitArgs: Schema.Tuple([AskConfig]),
  Model,
  Message,
  OutMessage,
  InMessage,
  inMessageOutputs: {
    RequestedSelect: { outMessage: OutMessage.Events },
    RequestedText: { outMessage: OutMessage.Events },
    RequestedSubmit: { outMessage: OutMessage.Events },
    RequestedSkip: { outMessage: OutMessage.Events },
    RequestedBack: { outMessage: OutMessage.Events },
  },
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<AskUserQuestionsViewInputs>() },
})
