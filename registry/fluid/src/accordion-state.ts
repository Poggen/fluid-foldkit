import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { rectAt } from './lib/indexed-geometry.js'
import { Schema, Number } from 'effect'
import { Rect } from './hover-observation.js'
import type { HoverSnapshot } from './hover-observation.js'

export const AccordionItemState = Schema.Struct({
  value: Schema.String,
  index: Schema.NullOr(Schema.Finite),
  disabled: Schema.Boolean,
  highlight: Schema.Literals(['item', 'trigger']),
  open: Schema.Boolean,
  initialOpen: Schema.Boolean,
  triggerId: Schema.NullOr(Schema.String),
  toggling: Schema.Boolean,
  hidden: Schema.Boolean,
  generation: Schema.Natural,
})

export type AccordionItemState = typeof AccordionItemState.Type

export const AccordionItemConfig = Schema.Struct({
  value: Schema.String,
  index: Schema.NullOr(Schema.Finite),
  disabled: Schema.Boolean,
  highlight: Schema.Literals(['item', 'trigger']),
})

export type AccordionItemConfig = typeof AccordionItemConfig.Type

export const AccordionLayout = Schema.Struct({ value: Schema.String, rect: Rect })

export const AccordionTint = Schema.Struct({
  value: Schema.String,
  rect: Rect,
  present: Schema.Boolean,
  generation: Schema.Natural,
})

export type AccordionTint = typeof AccordionTint.Type

export const accordionFields = {
  id: Schema.String,
  type: Schema.Literals(['single', 'multiple']),
  grouped: Schema.Boolean,
  controlled: Schema.Boolean,
  callback: Schema.Boolean,
  collapsible: Schema.Boolean,
  disabled: Schema.Boolean,
  disabledTriggers: Schema.Array(Schema.String),
  orientation: Schema.Literals(['vertical', 'horizontal']),
  direction: Schema.Literals(['ltr', 'rtl']),
  loopFocus: Schema.Boolean,
  highlight: Schema.Literals(['item', 'trigger']),
  values: Schema.Array(Schema.String),
  internalSingleValue: Schema.String,
  internalMultipleValues: Schema.Array(Schema.String),
  items: Schema.Array(AccordionItemState),
  layout: Schema.Array(AccordionLayout),
  tints: Schema.Array(AccordionTint),
  hovered: Schema.Array(AccordionTint),
  focusTint: Schema.NullOr(AccordionTint),
  pointerValue: Schema.NullOr(Schema.String),
  focusedValue: Schema.NullOr(Schema.String),
  focusVisible: Schema.Boolean,
  generation: Schema.Natural,
  reduceMotion: Schema.Boolean,
}

export const AccordionState = Schema.Struct(accordionFields)

export type AccordionState = typeof AccordionState.Type

export const AccordionRootConfig = Schema.Struct({
  type: Schema.optionalKey(accordionFields.type),
  value: Schema.optionalKey(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
  onValueChange: Schema.optionalKey(Schema.Boolean),
  collapsible: Schema.optionalKey(Schema.Boolean),
  disabled: Schema.optionalKey(Schema.Boolean),
  orientation: Schema.optionalKey(accordionFields.orientation),
  direction: Schema.optionalKey(accordionFields.direction),
  loopFocus: Schema.optionalKey(Schema.Boolean),
  highlight: Schema.optionalKey(accordionFields.highlight),
})

export const AccordionConfig = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  ...AccordionRootConfig.fields,
  id: Schema.String,
  grouped: Schema.optionalKey(Schema.Boolean),
  defaultValue: Schema.optionalKey(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
  items: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        value: Schema.String,
        index: Schema.optionalKey(Schema.Finite),
        disabled: Schema.optionalKey(Schema.Boolean),
        highlight: Schema.optionalKey(accordionFields.highlight),
      }),
    ),
  ),
})

export type AccordionConfig = typeof AccordionConfig.Type

export const accordionValues = (
  value: string | ReadonlyArray<string> | undefined,
): ReadonlyArray<string> => {
  if (Schema.is(Schema.String)(value)) {
    return value.length > 0 ? [value] : []
  }

  return value ?? []
}

export function accordionItems(
  items: ReadonlyArray<AccordionItemConfig>,
  values: ReadonlyArray<string>,
  previous: ReadonlyArray<AccordionItemState>,
  generation: number,
): ReadonlyArray<AccordionItemState> {
  return items.map((item) => {
    const prior = previous.find((row) => row.value === item.value)
    const open = values.includes(item.value)

    return prior
      ? {
          ...prior,
          ...item,
          open,
          hidden: open ? false : prior.hidden,
          toggling: prior.open !== open || prior.toggling,
          generation: prior.open === open ? prior.generation : generation,
        }
      : {
          ...item,
          open,
          initialOpen: open,
          triggerId: null,
          toggling: false,
          hidden: !open,
          generation,
        }
  })
}

export function accordionToggle(
  model: AccordionState,
  value: string,
): ReadonlyArray<string> | null {
  const item = model.items.find((candidate) => candidate.value === value)

  if (!item || item.disabled || model.disabled || model.disabledTriggers.includes(value)) {
    return null
  }

  if (model.values.includes(value)) {
    return model.values.filter((selected) => selected !== value)
  }

  return model.type === 'single' ? [value] : [...model.values, value]
}

export function accordionTints(model: AccordionState, activeIndex: number | null) {
  const current = model.layout.filter(({ value }) => {
    const item = model.items.find((candidate) => candidate.value === value)

    return (
      item?.open === true &&
      (!model.grouped || item.index !== null) &&
      ((model.grouped ? model.highlight : item.highlight) === 'item' ||
        (model.grouped ? item.index === activeIndex : model.pointerValue === item.value))
    )
  })

  const next = model.tints.map((slot) => {
    const layout = current.find((item) => item.value === slot.value)

    return layout
      ? modifyFields(slot, {
          rect: () => layout.rect,
          present: () => true,
          generation: () => (slot.present ? slot.generation : model.generation + 1),
        })
      : modifyFields(slot, {
          present: () => false,
          generation: () => (slot.present ? model.generation + 1 : slot.generation),
        })
  })

  for (const item of current) {
    if (!next.some((slot) => slot.value === item.value)) {
      next.push({ ...item, present: true, generation: model.generation + 1 })
    }
  }

  return next
}

export const AccordionRootProperties = Schema.Struct({
  type: accordionFields.type,
  controlledValue: Schema.NullOr(Schema.Array(Schema.String)),
  callback: Schema.Boolean,
  collapsible: Schema.Boolean,
  disabled: Schema.Boolean,
  orientation: accordionFields.orientation,
  direction: accordionFields.direction,
  loopFocus: Schema.Boolean,
  highlight: accordionFields.highlight,
})

export const accordionRootProperties = (
  config: Omit<AccordionConfig, 'id' | 'items' | 'defaultValue' | 'grouped'>,
): typeof AccordionRootProperties.Type => ({
  type: config.type ?? 'single',
  controlledValue: config.value === undefined ? null : accordionValues(config.value),
  callback: config.onValueChange ?? false,
  collapsible: config.collapsible ?? true,
  disabled: config.disabled ?? false,
  orientation: config.orientation ?? 'vertical',
  direction: config.direction ?? 'ltr',
  loopFocus: config.loopFocus ?? true,
  highlight: config.highlight ?? 'item',
})

export function configureAccordionRoot(
  model: AccordionState,
  props: typeof AccordionRootProperties.Type,
) {
  const { controlledValue } = props

  const values =
    controlledValue ??
    (props.type === 'single'
      ? accordionValues(model.internalSingleValue)
      : model.internalMultipleValues)

  return {
    type: (): AccordionState['type'] => props.type,
    callback: () => props.callback,
    collapsible: () => props.collapsible,
    disabled: () => props.disabled,
    orientation: (): AccordionState['orientation'] => props.orientation,
    direction: (): AccordionState['direction'] => props.direction,
    loopFocus: () => props.loopFocus,
    highlight: (): AccordionState['highlight'] => props.highlight,
    controlled: () => controlledValue !== null,
    values: () => values,
    items: () => accordionItems(model.items, values, model.items, model.generation + 1),
  }
}

export function synchronizeAccordion(model: AccordionState, hover: HoverSnapshot) {
  const tints = accordionTints(model, hover.activeIndex).map((slot) => {
    const item = model.items.find((row) => row.value === slot.value)

    const rect =
      model.grouped && model.highlight === 'trigger' && item !== undefined && item.index !== null
        ? rectAt(hover.itemRects, item.index)
        : null

    return rect ? modifyFields(slot, { rect: () => rect }) : slot
  })

  const target =
    model.pointerValue === null
      ? null
      : model.layout.find((row) => row.value === model.pointerValue)

  const hovered = model.hovered.map((slot) =>
    modifyFields(slot, {
      present: () => slot.value === model.pointerValue,
      generation: () =>
        slot.present === (slot.value === model.pointerValue)
          ? slot.generation
          : model.generation + 1,
    }),
  )

  if (target && !hovered.some((slot) => slot.value === target.value)) {
    hovered.push({ ...target, present: true, generation: model.generation + 1 })
  }

  const focused = model.items.find((item) => item.value === model.focusedValue)

  const focusRect =
    model.focusVisible && focused !== undefined && focused.index !== null
      ? rectAt(hover.itemRects, focused.index)
      : null

  let focusTint: AccordionTint | null = null

  if (focusRect !== null && focusRect !== undefined) {
    focusTint = {
      value: focused?.value ?? '',
      rect: focusRect,
      present: true,
      generation:
        model.focusTint?.present === true ? model.focusTint.generation : model.generation + 1,
    }
  } else if (model.focusTint !== null) {
    const focusTintPresent = model.focusTint.present
    focusTint = modifyFields(model.focusTint, {
      present: () => false,
      generation: (generation) => (focusTintPresent ? model.generation + 1 : generation),
    })
  }

  return {
    tints: () => tints,
    hovered: () => hovered,
    focusTint: () => focusTint,
    generation: Number.increment,
  }
}
