export interface LegendItemData {
  readonly label: string
  readonly value: number
  readonly maxValue?: number
  readonly color: string
}

export interface LegendContextValue<Item extends LegendItemData = LegendItemData, Action = void> {
  readonly items: ReadonlyArray<Item>
  readonly hoveredIndex: number | null
  /** Construction-owned capability: route intent through the registered parent Binding. */
  readonly setHoveredIndex: (index: number | null) => Action
}

export interface LegendItemContextValue<Item extends LegendItemData = LegendItemData> {
  readonly item: Item
  readonly index: number
  readonly isHovered: boolean
  readonly isFaded: boolean
  readonly percentage: number
}

export function useLegend<Item extends LegendItemData, Action = void>(
  context?: LegendContextValue<Item, Action>,
): LegendContextValue<Item, Action> {
  if (context === undefined) {
    throw new Error('useLegend must be used within a <Legend> component.')
  }

  return context
}

export function useLegendItem<Item extends LegendItemData>(
  context?: LegendItemContextValue<Item>,
): LegendItemContextValue<Item> {
  if (context === undefined) {
    throw new Error('useLegendItem must be used within a <LegendItem> component.')
  }

  return context
}

/** Composable Legend uses the source truthiness rule; NaN is an absent maximum. */
export function legendItemContext<Item extends LegendItemData>(
  item: Item,
  index: number,
  hoveredIndex: number | null,
): LegendItemContextValue<Item> {
  const maximum = item.maxValue

  return {
    item,
    index,
    isHovered: hoveredIndex === index,
    isFaded: hoveredIndex !== null && hoveredIndex !== index,
    percentage:
      maximum === undefined || maximum === 0 || Number.isNaN(maximum)
        ? 0
        : (item.value / maximum) * 100,
  }
}

/** Ready-made ChartLegend has a distinct source denominator rule, including NaN. */
export function chartLegendItemContext<Item extends LegendItemData>(
  item: Item,
  index: number,
  hoveredIndex: number | null,
): LegendItemContextValue<Item> {
  const maximum = item.maxValue ?? 0

  return {
    item,
    index,
    isHovered: hoveredIndex === index,
    isFaded: hoveredIndex !== null && hoveredIndex !== index,
    percentage: maximum === 0 ? 0 : (item.value / maximum) * 100,
  }
}
