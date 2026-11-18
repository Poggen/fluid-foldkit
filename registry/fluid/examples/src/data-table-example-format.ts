/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
import { DateTime, Option } from 'effect'
import type { DataTableColumn, DataTableValue } from '../../src/data-table.js'
import type { Scenario } from './data-table-example-data.js'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const euro = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})
const monthDay = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })

export const formatCell: (
  scenario: Scenario,
  column: DataTableColumn,
  value: DataTableValue | undefined,
) => string | undefined = function formatCell(
  scenario: Scenario,
  column: DataTableColumn,
  value: DataTableValue | undefined,
) {
  if (column.id === 'fluidHover' && typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (
    (column.editor?.type === 'date' || (scenario === 'showcase' && column.id === 'added')) &&
    typeof value === 'string' &&
    value
  ) {
    const parsed = DateTime.make(value + 'T00:00:00Z')
    if (Option.isNone(parsed)) return value
    const day = DateTime.toEpochMillis(parsed.value)
    return scenario === 'catalogue' || scenario === 'showcase'
      ? weekday.format(day) + ' ' + monthDay.format(day)
      : monthDay.format(day)
  }
  if (typeof value !== 'number') return undefined
  if (column.id === 'amount') return scenario === 'filters' ? euro.format(value) : usd.format(value)
  if (column.id === 'mrr') return euro.format(value)
  if (column.id === 'size') return value >= 1024 ? (value / 1024).toFixed(1) + ' MB' : value + ' KB'
  return undefined
}
