import { modifyFields } from 'foldkit/struct'
import { Schema } from 'effect'

export const checkboxMarks: (
  previous: ReadonlyArray<CheckboxMark>,
  values: ReadonlyArray<CheckboxValue>,
  generation: number,
) => ReadonlyArray<CheckboxMark> = function checkboxMarks(
  previous: ReadonlyArray<CheckboxMark>,
  values: ReadonlyArray<CheckboxValue>,
  generation: number,
) {
  const next = previous.flatMap((slot) => {
    const item = values.find((item) => item.index === slot.index)

    if (!item) return []

    if (item.checked === slot.present) return [slot]

    return [
      modifyFields(slot, {
        present: () => item.checked,
        generation: () => generation,
        initial: () => true,
      }),
    ]
  })

  for (const item of values)
    if (item.checked && !next.some((slot) => slot.index === item.index))
      next.push({ index: item.index, present: true, generation, initial: true })

  return next
}

export const CheckboxValue = Schema.Struct({ index: Schema.Int, checked: Schema.Boolean })

export const CheckboxMark = Schema.Struct({
  index: Schema.Int,
  present: Schema.Boolean,
  generation: Schema.Natural,
  initial: Schema.Boolean,
})

export type CheckboxValue = typeof CheckboxValue.Type

export type CheckboxMark = typeof CheckboxMark.Type
