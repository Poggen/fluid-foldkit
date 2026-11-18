import { describe, expect, it } from 'vitest'
import { applyTeamAction } from '../examples/src/data-table-example-actions.js'
import type { DataTableRow } from '../src/data-table.js'

const rows: ReadonlyArray<DataTableRow> = [
  { id: 'a', values: { name: 'Alice', role: 'Editor', status: 'Active' } },
  { id: 'b', values: { name: 'Bob', role: 'Viewer', status: 'Invited' } },
]
describe('Team example domain actions', () => {
  it.each([
    ['admin', [{ id: 'a', values: { name: 'Alice', role: 'Admin', status: 'Active' } }, rows[1]]],
    [
      'suspend',
      [{ id: 'a', values: { name: 'Alice', role: 'Editor', status: 'Suspended' } }, rows[1]],
    ],
    ['remove', [rows[1]]],
  ])('%s changes only the addressed members', (action, expected) => {
    expect(applyTeamAction(rows, action, ['a'])).toEqual(expected)
    expect(rows[0]?.values).toEqual({ name: 'Alice', role: 'Editor', status: 'Active' })
  })
  it('ignores unsupported commands and empty selections', () => {
    expect(applyTeamAction(rows, 'unknown', ['a'])).toBeUndefined()
    expect(applyTeamAction(rows, 'admin', [])).toBeUndefined()
  })
})
