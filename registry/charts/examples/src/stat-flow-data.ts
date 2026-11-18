import type { ChartStatFlowFormat, ChartStatFlowProps } from '@foldkit-visuals/charts/stat-flow'

export type StatFlowFormatName = 'plain' | 'compact' | 'currency' | 'percent'

const formats: Record<StatFlowFormatName, ChartStatFlowFormat> = {
  plain: { notation: 'standard', maximumFractionDigits: 0 },
  compact: { notation: 'compact', maximumFractionDigits: 1 },
  currency: { style: 'currency', currency: 'USD', maximumFractionDigits: 2 },
  percent: { style: 'percent', maximumFractionDigits: 2 },
}

const successors: Record<StatFlowFormatName, StatFlowFormatName> = {
  plain: 'compact',
  compact: 'currency',
  currency: 'percent',
  percent: 'plain',
}

export const nextStatFormat: (format: StatFlowFormatName) => StatFlowFormatName = (
  format: StatFlowFormatName,
) => successors[format]

export const statFlowConfiguration: (
  value: number,
  format: StatFlowFormatName,
) => ChartStatFlowProps = (value: number, format: StatFlowFormatName) => ({
  value,
  formatOptions: formats[format],
  label: 'Revenue',
})
