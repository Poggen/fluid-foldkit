import { Option, Schema } from 'effect'
import { Rect, rectAt } from './lib/indexed-geometry.js'
import type { HoverSnapshot } from './hover-observation.js'

export const SelectedPillTarget = Schema.Struct({ ...Rect.fields, opacity: Schema.Finite })

export type SelectedPillTarget = typeof SelectedPillTarget.Type

export const selectedPillFields = {
  selectedPill: Schema.OptionFromNullOr(SelectedPillTarget),
  selectedPillRevision: Schema.Natural,
  selectedPillLease: Schema.OptionFromNullOr(Schema.String),
}

export const initialSelectedPill = {
  selectedPill: Option.none<SelectedPillTarget>(),
  selectedPillRevision: 0,
  selectedPillLease: Option.none<string>(),
}

export function selectedPillTarget(model: {
  readonly hover: HoverSnapshot
  readonly selectedIndex: number
}) {
  const rect = rectAt(model.hover.itemRects, model.selectedIndex)

  return rect === undefined || rect === null
    ? Option.none<SelectedPillTarget>()
    : Option.some({
        ...rect,
        opacity:
          model.hover.activeIndex !== null && model.hover.activeIndex !== model.selectedIndex
            ? 0.8
            : 1,
      })
}

export function sameSelectedPill(
  a: Option.Option<SelectedPillTarget>,
  b: Option.Option<SelectedPillTarget>,
) {
  if (Option.isNone(a) || Option.isNone(b)) {
    return Option.isNone(a) && Option.isNone(b)
  }

  return (
    a.value.left === b.value.left &&
    a.value.top === b.value.top &&
    a.value.width === b.value.width &&
    a.value.height === b.value.height &&
    a.value.opacity === b.value.opacity
  )
}
