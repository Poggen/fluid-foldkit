import { Schema } from 'effect'
export const DataTableValue = Schema.Union([
  Schema.String,
  Schema.Finite,
  Schema.Boolean,
  Schema.Null,
  Schema.Array(Schema.String),
])
export type DataTableValue = typeof DataTableValue.Type
export const DataTableOption = Schema.Struct({
  value: Schema.String,
  label: Schema.optionalKey(Schema.String),
  color: Schema.optionalKey(Schema.String),
})
export const DataTableEditor = Schema.Struct({
  type: Schema.Literals(['text', 'link', 'number', 'date', 'tags', 'select']),
  options: Schema.optionalKey(Schema.Array(DataTableOption)),
  creatable: Schema.optionalKey(Schema.Boolean),
  placeholder: Schema.optionalKey(Schema.String),
})
export type DataTableEditor = typeof DataTableEditor.Type
