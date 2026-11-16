import { Schema } from 'effect'
import type { LegendViewInputs } from './options'
import { defineLegendBlock } from './block'

export const PROFIT_LOSS_POSITIVE_COLOR = 'var(--color-emerald-500, oklch(69.6% 0.17 162.48))'

export const PROFIT_LOSS_NEGATIVE_COLOR = 'var(--color-red-500, oklch(63.7% 0.237 25.331))'

export const PROFIT_LOSS_TOOLTIP_LABEL_FALLBACK = 'Profit/Loss'

export const profitLossColor = (value: number): string =>
  value >= 0 ? PROFIT_LOSS_POSITIVE_COLOR : PROFIT_LOSS_NEGATIVE_COLOR

export function resolveProfitLossTooltipLabel(label: string): string {
  return label.trim() || PROFIT_LOSS_TOOLTIP_LABEL_FALLBACK
}

/** Complete caller rows remain typed; no projection to an erased data bag. */
export interface ProfitLossSegment<Row = object> {
  readonly data: ReadonlyArray<Row>
  readonly isPositive: boolean
}

export const PROFIT_LOSS_LEGEND_ITEMS: readonly [
  {
    readonly label: 'Profit'
    readonly value: 0
    readonly color: typeof PROFIT_LOSS_POSITIVE_COLOR
  },
  { readonly label: 'Loss'; readonly value: 0; readonly color: typeof PROFIT_LOSS_NEGATIVE_COLOR },
] = [
  { label: 'Profit', value: 0, color: PROFIT_LOSS_POSITIVE_COLOR },
  { label: 'Loss', value: 0, color: PROFIT_LOSS_NEGATIVE_COLOR },
]

export interface ProfitLossLegendProps {
  readonly align?: 'start' | 'center' | 'end'
  readonly className?: string
}

const Item = Schema.Struct({ label: Schema.String, value: Schema.Finite, color: Schema.String })

export function ProfitLossLegend() {
  const recipe = defineLegendBlock({ Item })

  return {
    ...recipe,
    items: PROFIT_LOSS_LEGEND_ITEMS,
    inputs: (
      hoveredIndex: number | null,
      props: ProfitLossLegendProps = {},
    ): LegendViewInputs<typeof Item.Type> => ({
      hoveredIndex,
      kind: 'profitLoss',
      props,
    }),
  }
}
