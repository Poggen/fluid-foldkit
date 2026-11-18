import type { DataTableRow } from '../../src/data-table.js'

/** Domain actions remain application-owned; DataTable owns selection and undo history. */
export const applyTeamAction: (
  rows: ReadonlyArray<DataTableRow>,
  action: string,
  ids: ReadonlyArray<string>,
) => ReadonlyArray<DataTableRow> | undefined = function applyTeamAction(
  rows: ReadonlyArray<DataTableRow>,
  action: string,
  ids: ReadonlyArray<string>,
) {
  if (!['admin', 'suspend', 'remove'].includes(action) || ids.length === 0) return undefined
  const selected = new Set(ids)
  if (action === 'remove') return rows.filter((row) => !selected.has(row.id))
  const patch = action === 'admin' ? { role: 'Admin' } : { status: 'Suspended' }
  return rows.map((row) =>
    selected.has(row.id) ? { ...row, values: { ...row.values, ...patch } } : row,
  )
}
