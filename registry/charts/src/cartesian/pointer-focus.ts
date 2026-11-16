import { makeModifyFieldsFor } from 'foldkit/struct'
import { Option } from 'effect'

const modifyFocus = makeModifyFieldsFor<{
  readonly focusedIndex: Option.Option<number>
  readonly focusedSeriesIndex: Option.Option<number>
  readonly focusSource: 'pointer' | 'keyboard' | 'programmatic'
}>()

export function pointerFocus<
  Model extends {
    readonly focusedIndex: Option.Option<number>
    readonly focusedSeriesIndex: Option.Option<number>
    readonly focusSource: 'pointer' | 'keyboard' | 'programmatic'
  },
>(model: Model, index: number | null, seriesIndex: number | null, deduplicate: boolean): Model {
  if (
    deduplicate &&
    model.focusSource === 'pointer' &&
    Option.getOrNull(model.focusedIndex) === index &&
    Option.getOrNull(model.focusedSeriesIndex) === seriesIndex
  ) {
    return model
  }

  return modifyFocus(model, {
    focusedIndex: () => Option.fromNullishOr(index),
    focusedSeriesIndex: () => Option.fromNullishOr(seriesIndex),
    focusSource: () => 'pointer',
  })
}
