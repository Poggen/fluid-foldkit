import { Option, Schema } from 'effect'

export const RadioValue = Schema.Struct({
  index: Schema.Int,
  value: Schema.OptionFromNullOr(Schema.String),
  selected: Schema.OptionFromNullOr(Schema.Boolean),
})

export interface RadioItemConfig {
  readonly index: number
  readonly value?: string
  readonly selected?: boolean
}

export const radioItemValues = (items: ReadonlyArray<RadioItemConfig>) =>
  items.map((item) => ({
    index: item.index,
    value: Option.fromUndefinedOr(item.value),
    selected: Option.fromUndefinedOr(item.selected),
  }))

export interface RadioSelection {
  readonly value: Option.Option<string>
  readonly selectedIndex: Option.Option<number>
  readonly values: ReadonlyArray<typeof RadioValue.Type>
}

export function radioSelectedIndex(model: RadioSelection): number {
  return Option.isSome(model.value)
    ? model.values.findIndex(
        (item) => Option.getOrUndefined(item.value) === Option.getOrUndefined(model.value),
      )
    : Option.getOrElse(model.selectedIndex, () => -1)
}

export function radioItemSelected(model: RadioSelection, item: typeof RadioValue.Type): boolean {
  return Option.isSome(model.value) && Option.isSome(item.value)
    ? model.value.value === item.value.value
    : Option.getOrElse(
        item.selected,
        () => Option.getOrUndefined(model.selectedIndex) === item.index,
      )
}

export function radioHasSelection(model: RadioSelection): boolean {
  return (
    radioSelectedIndex(model) >= 0 ||
    model.values.some((item) => Option.getOrElse(item.selected, () => false))
  )
}
