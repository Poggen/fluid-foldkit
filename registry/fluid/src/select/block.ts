/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { HoverMode } from '../hover-observation.js'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { DropdownMenuBlock } from '../dropdown.js'
import type { DropdownResources } from '../dropdown-resources.js'
import type { Icon, Presentation } from '../presentation.js'
import type { TargetMotionOptions as MotionOptions } from '../motion-target.js'

export const SelectOption = Schema.Struct({
  value: Schema.String,
  label: Schema.String,
  disabled: Schema.optionalKey(Schema.Boolean),
  group: Schema.optionalKey(Schema.String),
})

export type SelectOption = typeof SelectOption.Type

export interface SelectConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  /** Owning Dialog/popup IDs preserve ancestry when the listbox is portalled. */
  readonly rootId?: string
  readonly parentId?: string
  readonly items: ReadonlyArray<SelectOption>
  readonly value?: string
  readonly defaultValue?: string
  readonly disabled?: boolean
}

export interface SelectViewInputs extends Presentation {
  readonly placeholder?: string
  readonly variant?: 'bordered' | 'borderless'
  readonly invalid?: boolean
  readonly error?: string
  /** Typed trigger icon; explicit leading HTML takes precedence. */
  readonly icon?: Icon
  readonly leading?: Html
  readonly name?: string
  readonly form?: string
  readonly required?: boolean
  readonly className?: string
  /** Classes on the combobox button only, after the shared className. */
  readonly triggerClassName?: string
  readonly contentClassName?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly ariaLabel?: string
  /** Typed popup icons, independent of the trigger; raw renderIcon overrides these. */
  readonly itemIconFor?: (item: SelectOption) => Icon | undefined
  readonly renderIcon?: (item: SelectOption) => Html
  readonly animate: (node: Html, options: MotionOptions) => Html
}

export const Model = Schema.Struct({
  id: Schema.String,
  items: Schema.Array(SelectOption),
  value: Schema.String,
  initialValue: Schema.String,
  controlled: Schema.Boolean,
  disabled: Schema.Boolean,
  acknowledgement: Schema.Natural,
  search: Schema.String,
  searchGeneration: Schema.Natural,
  menu: DropdownMenuBlock.Model,
})

export const Message = defineMessageUnion({
  CompletedAcknowledgement: { generation: Schema.Natural },
  NativeSelected: { value: Schema.String },
  FormReset: {},
  TypedCharacter: { character: Schema.String },
  ClearedSearch: { generation: Schema.Natural },
})

export const OutMessage = defineMessageUnion({
  Selected: { value: Schema.String },
  OpenChanged: { open: Schema.Boolean },
})

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedOpen: {},
  RequestedClose: {},
  RequestedConfigure: {
    items: Schema.Array(SelectOption),
    value: Schema.optionalKey(Schema.String),
    disabled: Schema.optionalKey(Schema.Boolean),
  },
})

export const Config = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  rootId: Schema.optionalKey(Schema.String),
  parentId: Schema.optionalKey(Schema.String),
  items: Schema.Array(SelectOption),
  value: Schema.optionalKey(Schema.String),
  defaultValue: Schema.optionalKey(Schema.String),
  disabled: Schema.optionalKey(Schema.Boolean),
})

export const SelectNamespace = Block.makeNamespace('Select')

const effects = Block.makeEffectsContract<never, DropdownResources>()

export const contract = {
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<SelectViewInputs>() },
  effects,
  inMessageOutputs: {
    RequestedOpen: { outMessage: OutMessage },
    RequestedClose: { outMessage: OutMessage },
  },
} satisfies Omit<Block.ContractConfiguration, 'key'> & {
  readonly Model: typeof Model
  readonly Message: typeof Message
  readonly OutMessage: typeof OutMessage
}

export const SelectKey = Symbol('Select')

export const SelectBlock = Block.make(SelectNamespace, { ...contract, key: SelectKey })

export const {
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeStep,
  makeNoopStep,
  makeFieldsStep,
  makeCommandsStep,
  makeComposition,
} = SelectBlock

/** Compatibility type for consumers naming the passive contract. */
export type SelectDeclared<Key extends symbol = typeof SelectKey> = ReturnType<
  typeof Block.make<'Select', Key, typeof contract>
>
