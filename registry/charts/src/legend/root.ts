import { defineLegendBlock } from './block'
import type { ChartRowSchema } from '../cartesian/data-boundary'
import type { LegendItemData } from './contexts'
import type { ChartLegendProps, LegendProps, LegendViewInputs } from './options'

/** Item rows initialize the checked Model; controlled hover is an explicit parent view input. */
export function Legend<
  ItemSchema extends ChartRowSchema & { readonly Type: LegendItemData },
>(options: { readonly Item: ItemSchema }) {
  const recipe = defineLegendBlock(options)
  const inputsCallback: (
    hoveredIndex: number | null,
    props: LegendProps<ItemSchema['Type']>,
  ) => LegendViewInputs<ItemSchema['Type']> = (
    hoveredIndex: number | null,
    props: LegendProps<ItemSchema['Type']>,
  ) => {
    const { children, ...presentation } = props

    if (!('children' in children)) {
      return {
        kind: 'composable',
        hoveredIndex,
        props: presentation,
        renderLegend: children,
      } satisfies LegendViewInputs<ItemSchema['Type']>
    }

    let inputs: LegendViewInputs<ItemSchema['Type']> = {
      kind: 'composableRows',
      hoveredIndex,
      props: presentation,
      children: children.children,
    }

    if (children.className !== undefined) {
      inputs = { ...inputs, itemClassName: children.className }
    }

    return inputs satisfies LegendViewInputs<ItemSchema['Type']>
  }

  return {
    ...recipe,
    inputs: inputsCallback,
  }
}

export function ChartLegend<
  ItemSchema extends ChartRowSchema & { readonly Type: LegendItemData },
>(options: { readonly Item: ItemSchema }) {
  const recipe = defineLegendBlock(options)
  const inputsCallback: (
    hoveredIndex: number | null,
    props?: ChartLegendProps<ItemSchema['Type']>,
  ) => LegendViewInputs<ItemSchema['Type']> = (
    hoveredIndex: number | null,
    props: ChartLegendProps<ItemSchema['Type']> = {},
  ) => {
    const { formatValue, renderItem, ...presentation } = props

    let inputs: LegendViewInputs<ItemSchema['Type']> = {
      kind: 'chart',
      hoveredIndex,
      props: presentation,
    }

    if (formatValue !== undefined) {
      inputs = { ...inputs, formatValue }
    }

    if (renderItem !== undefined) {
      inputs = { ...inputs, renderItem }
    }

    return inputs satisfies LegendViewInputs<ItemSchema['Type']>
  }

  return {
    ...recipe,
    inputs: inputsCallback,
  }
}
