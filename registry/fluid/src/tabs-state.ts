import { modifyFields } from 'foldkit/struct'
import { rectAt } from './lib/indexed-geometry.js'
import { Option, Schema } from 'effect'
import { Rect } from './hover-observation.js'
import type { HoverSnapshot } from './hover-observation.js'

export const TabsItemDescriptor = Schema.Struct({
  value: Schema.String,
  disabled: Schema.optionalKey(Schema.Boolean),
})

export type TabsItemDescriptor = typeof TabsItemDescriptor.Type

export const TabsItemObservation = Schema.Struct({
  index: Schema.Int,
  disabled: Schema.Boolean,
  collapsible: Schema.Boolean,
  width: Schema.OptionFromNullOr(Schema.Finite),
})

export const TabsHighlight = Schema.Struct({
  rect: Rect,
  phase: Schema.Literals(['Present', 'Exiting']),
  generation: Schema.Natural,
  converge: Schema.Boolean,
})

export const TabsLabel = Schema.Struct({
  index: Schema.Int,
  phase: Schema.Literals(['Present', 'Exiting']),
  generation: Schema.Natural,
  initial: Schema.Boolean,
  width: Schema.OptionFromNullOr(Schema.Finite),
})

export const tabsLogicalFields = {
  id: Schema.String,
  selectedIndex: Schema.Int,
  activeLabel: Schema.Boolean,
  direction: Schema.Literals(['ltr', 'rtl']),
  idPrefix: Schema.OptionFromNullOr(Schema.String),
  focusedIndex: Schema.OptionFromNullOr(Schema.Int),
  rovingIndex: Schema.OptionFromNullOr(Schema.Int),
  focusRingIndex: Schema.OptionFromNullOr(Schema.Int),
  mouseInside: Schema.Boolean,
  items: Schema.Array(TabsItemObservation),
  labels: Schema.Array(TabsLabel),
  hasItems: Schema.Boolean,
  generation: Schema.Natural,
  hoverSlot: Schema.OptionFromNullOr(TabsHighlight),
  focusSlot: Schema.OptionFromNullOr(TabsHighlight),
}

export const TabsLogicalState = Schema.Struct(tabsLogicalFields)

export type TabsLogicalState = typeof TabsLogicalState.Type

function highlight(
  current: Option.Option<typeof TabsHighlight.Type>,
  rect: typeof Rect.Type | null,
  generation: number,
  exitRect: typeof Rect.Type | null,
): Option.Option<typeof TabsHighlight.Type> {
  if (rect !== null) {
    return Option.some({
      rect,
      phase: 'Present',
      generation:
        Option.isSome(current) && current.value.phase === 'Present'
          ? current.value.generation
          : generation,
      converge: false,
    })
  }

  if (Option.isNone(current) || current.value.phase === 'Exiting') {
    return current
  }

  return Option.some(
    modifyFields(current.value, {
      rect: (rect) => exitRect ?? rect,
      phase: () => 'Exiting',
      generation: () => generation,
      converge: () => exitRect !== null,
    }),
  )
}

export function synchronizeTabsHighlights(model: TabsLogicalState, hover: HoverSnapshot) {
  const selected = rectAt(hover.itemRects, model.selectedIndex) ?? null

  const hovered =
    hover.activeIndex === null || hover.activeIndex === model.selectedIndex
      ? null
      : (rectAt(hover.itemRects, hover.activeIndex) ?? null)

  const focused = Option.isSome(model.focusRingIndex)
    ? (rectAt(hover.itemRects, model.focusRingIndex.value) ?? null)
    : null

  return {
    hoverSlot: highlight(
      model.hoverSlot,
      selected === null ? null : hovered,
      model.generation + 1,
      model.mouseInside ? null : selected,
    ),
    focusSlot: highlight(model.focusSlot, focused, model.generation + 1, null),
    generation: model.generation + 1,
  }
}

export function synchronizeTabsLabels(model: TabsLogicalState) {
  const labels = model.labels.flatMap((slot) => {
    const item = model.items.find((candidate) => candidate.index === slot.index)

    if (item?.collapsible !== true) {
      return []
    }

    const present = model.selectedIndex === slot.index

    return [
      modifyFields(slot, {
        width: () => item.width,
        phase: () => (present ? 'Present' : 'Exiting'),
        generation: () =>
          (present ? 'Present' : 'Exiting') === slot.phase ? slot.generation : model.generation + 1,
      }) satisfies typeof TabsLabel.Type,
    ]
  })

  for (const item of model.items) {
    if (
      item.collapsible &&
      item.index === model.selectedIndex &&
      !labels.some((slot) => slot.index === item.index)
    ) {
      labels.push({
        index: item.index,
        phase: 'Present',
        generation: model.generation + 1,
        initial: model.hasItems,
        width: item.width,
      })
    }
  }

  return { labels, generation: model.generation + 1, hasItems: true }
}

export const NavigationDirection = Schema.Literals(['Left', 'Right', 'First', 'Last'])

/** Public shortcut navigation selects enabled tabs; DOM roving focus has its own manual activation. */
export function navigationIndex(
  items: ReadonlyArray<TabsItemDescriptor>,
  current: number,
  direction: typeof NavigationDirection.Type,
  textDirection: 'ltr' | 'rtl',
): number | null {
  const enabled = items.flatMap((item, index) => (item.disabled === true ? [] : [index]))

  if (enabled.length === 0) {
    return null
  }

  if (direction === 'First') {
    return enabled[0] ?? null
  }

  if (direction === 'Last') {
    return enabled.at(-1) ?? null
  }

  const delta = (direction === 'Right' ? 1 : -1) * (textDirection === 'rtl' ? -1 : 1)

  for (let offset = 1; offset <= items.length; offset += 1) {
    const index = (((current + delta * offset) % items.length) + items.length) % items.length
    const item = items[index]

    if (item !== undefined && item.disabled !== true) {
      return index
    }
  }

  return null
}
