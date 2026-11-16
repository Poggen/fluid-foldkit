import { Schema } from 'effect'
import type { SelectOption } from './select.js'

export const ChipRect = Schema.Struct({
  left: Schema.Finite,
  top: Schema.Finite,
  width: Schema.Finite,
  height: Schema.Finite,
})

export const ChipMeasurement = Schema.Struct({ value: Schema.String, ...ChipRect.fields })

export const ComboboxChip = Schema.Struct({
  value: Schema.String,
  label: Schema.String,
  present: Schema.Boolean,
  generation: Schema.Natural,
  initial: Schema.Boolean,
  rect: Schema.NullOr(ChipRect),
})

export type ComboboxChip = typeof ComboboxChip.Type

export const reconcileComboboxChips = (
  previous: ReadonlyArray<ComboboxChip>,
  values: ReadonlyArray<string>,
  items: ReadonlyArray<SelectOption>,
  generation: number,
): ReadonlyArray<ComboboxChip> => {
  const present = values.flatMap((value) => {
    const item = items.find((entry) => entry.value === value)

    if (item === undefined) {
      return []
    }

    const old = previous.find((chip) => chip.value === value)

    return [
      {
        value,
        label: item.label,
        present: true,
        generation: old?.present === true ? old.generation : generation,
        initial: old?.initial ?? false,
        rect: old?.rect ?? null,
      },
    ]
  })

  return [
    ...present,
    ...previous.flatMap((chip) => {
      if (present.some((entry) => entry.value === chip.value)) {
        return []
      }

      return [chip.present ? { ...chip, present: false, generation } : chip]
    }),
  ]
}
