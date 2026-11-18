export const useLegend: <Item extends LegendItemData, Action = void>(
  context?: LegendContextValue<Item, Action>,
) => LegendContextValue<Item, Action> = function useLegend<
  Item extends LegendItemData,
  Action = void,
>(context?: LegendContextValue<Item, Action>) {
  if (context === undefined) {
    throw new Error('useLegend must be used within a <Legend> component.')
  }

  return context satisfies LegendContextValue<Item, Action>
}

export const useLegendItem: <Item extends LegendItemData>(
  context?: LegendItemContextValue<Item>,
) => LegendItemContextValue<Item> = function useLegendItem<Item extends LegendItemData>(
  context?: LegendItemContextValue<Item>,
) {
  if (context === undefined) {
    throw new Error('useLegendItem must be used within a <LegendItem> component.')
  }

  return context satisfies LegendItemContextValue<Item>
}

/** Composable Legend uses the source truthiness rule; NaN is an absent maximum. */
export const legendItemContext: <Item extends LegendItemData>(
  item: Item,
  index: number,
  hoveredIndex: number | null,
) => LegendItemContextValue<Item> = function legendItemContext<Item extends LegendItemData>(
  item: Item,
  index: number,
  hoveredIndex: number | null,
) {
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
  } satisfies LegendItemContextValue<Item>
}

/** Ready-made ChartLegend has a distinct source denominator rule, including NaN. */
export const chartLegendItemContext: <Item extends LegendItemData>(
  item: Item,
  index: number,
  hoveredIndex: number | null,
) => LegendItemContextValue<Item> = function chartLegendItemContext<Item extends LegendItemData>(
  item: Item,
  index: number,
  hoveredIndex: number | null,
) {
  const maximum = item.maxValue ?? 0

  return {
    item,
    index,
    isHovered: hoveredIndex === index,
    isFaded: hoveredIndex !== null && hoveredIndex !== index,
    percentage: maximum === 0 ? 0 : (item.value / maximum) * 100,
  } satisfies LegendItemContextValue<Item>
}

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
