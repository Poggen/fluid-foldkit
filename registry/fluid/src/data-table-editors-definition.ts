import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { DataTableEditor, DataTableValue } from './data-table-editor-value.js'
import { InputBlock } from './input.js'
import { SelectBlock } from './select.js'
import { ComboboxBlock } from './combobox-definition.js'
import { DatePickerBlock } from './date-picker-definition.js'
import { DatePickerState } from './date-picker-state.js'
import { DatePickerPresentation } from './date-picker-config.js'
import { CalendarState } from './calendar-state.js'
import type { Presentation } from './presentation.js'
import type { ComboboxViewInputs } from './combobox-view.js'
import type { DatePickerViewInputs } from './date-picker.js'

export const Edit = Schema.Struct({
  rowId: Schema.String,
  columnId: Schema.String,
  editor: DataTableEditor,
  value: DataTableValue,
})
export type Edit = typeof Edit.Type
export const PreparedPicker = Schema.Struct({
  initial: DatePickerState,
  presentation: DatePickerPresentation,
  calendar: Schema.Struct({ initial: CalendarState }),
  now: Schema.Finite,
})
export const Message = defineMessageUnion({
  PreparedDate: { generation: Schema.Natural, prepared: PreparedPicker },
  ClickedApply: {},
  ClickedCancel: {},
  KeyPressed: { key: Schema.String },
})
export const OutMessage = defineMessageUnion({
  DraftChanged: { value: DataTableValue },
  Committed: { value: DataTableValue },
  Cancelled: {},
})
export interface DataTableEditorsInputs extends Presentation {
  readonly animate: ComboboxViewInputs['animate']
  readonly highlight: DatePickerViewInputs['highlight']
  readonly ariaLabel?: string
}
const key = Symbol('DataTableEditors')
export const DataTableEditorsBlock = Block.make('DataTableEditors', {
  key,
  InitArgs: Schema.Tuple([Schema.String]),
  Model: Schema.Struct({
    id: Schema.String,
    active: Schema.OptionFromNullOr(Edit),
    generation: Schema.Natural,
    input: Schema.OptionFromNullOr(InputBlock.Model),
    select: Schema.OptionFromNullOr(SelectBlock.Model),
    tags: Schema.OptionFromNullOr(ComboboxBlock.Model),
    picker: Schema.OptionFromNullOr(DatePickerBlock.Model),
  }),
  Message,
  OutMessage,
  InMessage: defineInMessageUnion({ RequestedEdit: Edit.fields, RequestedClear: {} }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof InputBlock>['programRequirements']
    | Block.FactsOf<typeof SelectBlock>['programRequirements']
    | Block.FactsOf<typeof ComboboxBlock>['programRequirements']
    | Block.FactsOf<typeof DatePickerBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<DataTableEditorsInputs>() },
})
