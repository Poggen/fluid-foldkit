import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ProfitLossLegendProps } from './profit-loss'
import type { LegendContent } from './content'
import type { LegendContextValue, LegendItemContextValue, LegendItemData } from './contexts'

export const legendPresentation: <Item extends LegendItemData>(
  inputs: LegendViewInputs<Item>,
) => LegendPresentation<Item> = function legendPresentation<Item extends LegendItemData>(
  inputs: LegendViewInputs<Item>,
) {
  if (inputs.kind === 'profitLoss') {
    return { kind: 'profitLoss', props: inputs.props } satisfies LegendPresentation<Item>
  }

  if (inputs.kind === 'chart') {
    let props: ChartLegendProps<Item> = { ...inputs.props }

    if (inputs.formatValue !== undefined) {
      props = { ...props, formatValue: inputs.formatValue }
    }

    if (inputs.renderItem !== undefined) {
      props = { ...props, renderItem: inputs.renderItem }
    }

    return { kind: 'chart', props } satisfies LegendPresentation<Item>
  }

  if (inputs.kind === 'composable') {
    return {
      kind: 'composable',
      props: { ...inputs.props, children: inputs.renderLegend },
    } satisfies LegendPresentation<Item>
  }

  let children: LegendItemProps<Item> = { children: inputs.children }

  if (inputs.itemClassName !== undefined) {
    children = { className: inputs.itemClassName, ...children }
  }

  return {
    kind: 'composable',
    props: {
      ...inputs.props,
      children,
    },
  } satisfies LegendPresentation<Item>
}

export type LegendItem = LegendItemData

export interface LegendValueProps {
  readonly className?: string
  readonly showPercentage?: boolean
  readonly percentageClassName?: string
  readonly formatValue?: (value: number) => string
  readonly formatPercentage?: (percentage: number) => string
}

export interface LegendProgressProps {
  readonly trackClassName?: string
  readonly indicatorClassName?: string
  readonly height?: string
}

export interface LegendMarkerProps {
  readonly className?: string
}

export interface LegendLabelProps {
  readonly className?: string
}

export interface LegendPartRenderers {
  readonly marker: (props?: LegendMarkerProps) => Html
  readonly label: (props?: LegendLabelProps) => Html
  readonly value: (props?: LegendValueProps) => Html
  readonly progress: (props?: LegendProgressProps) => Html
}

export interface LegendItemProps<Item extends LegendItemData = LegendItemData> {
  readonly className?: string
  readonly children: <Message, Mounts>(
    context: LegendItemContextValue<Item>,
    parts: LegendPartRenderers,
    legend: LegendContextValue<Item, Message>,
    h: HtmlBuilder<Message, Mounts>,
  ) => LegendContent
}

export interface ChartLegendProps<Item extends LegendItemData = LegendItemData> {
  readonly showProgress?: boolean
  readonly showMarker?: boolean
  readonly showValue?: boolean
  readonly showPercentage?: boolean
  readonly formatValue?: (value: number) => string
  readonly title?: string
  readonly className?: string
  readonly titleClassName?: string
  readonly itemClassName?: string
  readonly labelClassName?: string
  readonly valueClassName?: string
  readonly renderItem?: (context: LegendItemContextValue<Item>) => LegendContent
}

export type LegendChildrenRenderer<Item extends LegendItemData> = <Message, Mounts>(
  context: LegendContextValue<Item, Message>,
  item: (index: number, props: LegendItemProps<Item>) => Html,
  h: HtmlBuilder<Message, Mounts>,
) => LegendContent

export interface LegendProps<Item extends LegendItemData = LegendItemData> {
  readonly title?: string
  readonly titleClassName?: string
  readonly className?: string
  readonly children: LegendItemProps<Item> | LegendChildrenRenderer<Item>
}

export type LegendPresentation<Item extends LegendItemData> =
  | { readonly kind: 'chart'; readonly props: ChartLegendProps<Item> }
  | { readonly kind: 'composable'; readonly props: LegendProps<Item> }
  | { readonly kind: 'profitLoss'; readonly props: ProfitLossLegendProps }

/** Hover values are parent-owned. Source onHover/onHoverChange map to the Binding's out-message fold. */
export type LegendViewInputs<Item extends LegendItemData> =
  | {
      readonly kind: 'chart'
      readonly hoveredIndex: number | null
      readonly props: Omit<ChartLegendProps<Item>, 'formatValue' | 'renderItem'>
      readonly formatValue?: ChartLegendProps<Item>['formatValue']
      readonly renderItem?: ChartLegendProps<Item>['renderItem']
    }
  | {
      readonly kind: 'composableRows'
      readonly hoveredIndex: number | null
      readonly props: Omit<LegendProps<Item>, 'children'>
      readonly itemClassName?: string
      readonly children: LegendItemProps<Item>['children']
    }
  | {
      readonly kind: 'composable'
      readonly hoveredIndex: number | null
      readonly props: Omit<LegendProps<Item>, 'children'>
      readonly renderLegend: LegendChildrenRenderer<Item>
    }
  | {
      readonly kind: 'profitLoss'
      readonly hoveredIndex: number | null
      readonly props: ProfitLossLegendProps
    }
