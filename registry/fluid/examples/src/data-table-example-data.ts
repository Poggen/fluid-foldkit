// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'
import type {
  DataTableColumn,
  DataTableConfig,
  DataTableRow,
  DataTableView,
} from '../../src/data-table.js'
import {
  accounts,
  entries,
  files,
  invoices,
  members,
  payments,
  steps,
  tasks,
} from './data-table-example-rows.js'

import { catalogue } from './data-table-example-catalogue.js'
import { componentRows } from './data-table-example-components.js'
import { keyboard } from './data-table-example-keyboard.js'

export const Scenario = Schema.Literals([
  'showcase',
  'catalogue',
  'team',
  'filters',
  'views',
  'tasks',
  'columns',
  'frozen',
  'reorder',
  'files',
  'wrap',
  'sort',
  'search',
  'loading',
  'keyboard',
])
export type Scenario = typeof Scenario.Type
export const titles: Record<Scenario, string> = {
  showcase: 'Components',
  catalogue: 'Components',
  team: 'Team',
  filters: 'Invoices',
  views: 'People',
  tasks: 'Tasks',
  columns: 'Members',
  frozen: 'Accounts',
  reorder: 'Launch checklist',
  files: 'Files',
  wrap: 'Changelog',
  sort: 'Payments',
  search: 'Payments',
  loading: 'Payments',
  keyboard: 'Keyboard',
}
const col = (
  id: string,
  header: string,
  options: Omit<DataTableColumn, 'id' | 'header'> = {},
): DataTableColumn => ({ id, header, ...options })
const text = (id: string, header: string) => col(id, header, { editor: { type: 'text' } })
const num = (id: string, header: string) =>
  col(id, header, { editor: { type: 'number' }, filter: 'number' })
const day = (id: string, header: string) =>
  col(id, header, { editor: { type: 'date' }, filter: 'date' })
const colors: Readonly<Record<string, string>> = {
  'Radix + Base UI': 'blue',
  None: 'gray',
  Owner: 'purple',
  Admin: 'blue',
  Editor: 'green',
  Viewer: 'gray',
  Active: 'green',
  Invited: 'amber',
  Suspended: 'red',
  Todo: 'gray',
  'In progress': 'blue',
  Review: 'amber',
  Done: 'green',
  New: 'blue',
  Updated: 'amber',
  Fixed: 'red',
  Free: 'gray',
  Team: 'blue',
  Scale: 'purple',
  Paid: 'green',
  Open: 'blue',
  Overdue: 'red',
  Draft: 'gray',
}
const choice = (id: string, header: string, rows: readonly DataTableRow[]) =>
  col(id, header, {
    editor: {
      type: 'select',
      options: [...new Set(rows.map((row) => String(row.values[id])))].map((value) => ({
        value,
        color: colors[value] ?? 'gray',
      })),
    },
    filter: 'options',
  })

const componentColumns = [
  col('name', 'Component', { editor: { type: 'text' }, hideable: false }),
  choice('primitives', 'Primitives', catalogue),
  col('fluidHover', 'Fluid hover', { editable: false }),
  num('props', 'Props'),
  day('added', 'Added'),
  col('tags', 'Tags', { editor: { type: 'tags', creatable: true } }),
  col('website', 'Website', { editor: { type: 'link' } }),
  col('summary', 'Summary', { editor: { type: 'text' }, lines: 'wrap' }),
]
const peopleColumns = [
  text('name', 'Name'),
  text('email', 'Email'),
  choice('role', 'Role', members),
  choice('status', 'Status', members),
  day('lastActive', 'Last active'),
]
const paymentColumns = [
  text('email', 'Email'),
  choice('status', 'Status', payments),
  num('amount', 'Amount'),
]
const view = (id: string, name: string, options: Partial<DataTableView> = {}): DataTableView => ({
  id,
  name,
  search: '',
  sorting: [],
  filters: [],
  hiddenColumns: [],
  columnOrder: peopleColumns.map((column) => column.id),
  ...options,
})

export function dataset(id: string, scenario: Scenario): DataTableConfig {
  const make = (
    rows: readonly DataTableRow[],
    columns: readonly DataTableColumn[],
    settings: Partial<DataTableConfig> = {},
  ): DataTableConfig => ({
    id,
    rows,
    columns,
    selectable: false,
    pageSize: Math.max(1, rows.length),
    ...settings,
  })
  switch (scenario) {
    case 'catalogue':
      return make(catalogue, componentColumns, {
        selectable: true,
        pageSize: 10,
        views: [view('all', 'All components', { columnOrder: componentColumns.map((c) => c.id) })],
      })
    case 'team':
      return make(members, peopleColumns, {
        selectable: true,
        pageSize: 8,
        rowActions: [
          { value: 'admin', label: 'Make admin' },
          { value: 'remove', label: 'Remove', destructive: true },
        ],
        selectionActions: [
          { value: 'admin', label: 'Make admins' },
          { value: 'suspend', label: 'Suspend' },
          { value: 'remove', label: 'Remove from team', destructive: true },
        ],
        initialSelectedIds: ['2', '3', '4'],
      })
    case 'views':
      return make(members, peopleColumns, {
        views: [
          view('all', 'Everyone'),
          view('pending', 'Pending invites', {
            filters: [{ id: 'status', value: { kind: 'options', values: ['Invited'] } }],
          }),
          view('admins', 'Admins', {
            filters: [{ id: 'role', value: { kind: 'options', values: ['Admin'] } }],
          }),
          view('recent', 'Recently active', { sorting: [{ id: 'lastActive', desc: true }] }),
        ],
      })
    case 'columns':
      return make(members.slice(0, 6), peopleColumns)
    case 'filters':
      return make(
        invoices,
        [
          text('id', 'Invoice'),
          text('customer', 'Customer'),
          choice('status', 'Status', invoices),
          num('amount', 'Amount'),
          day('due', 'Due'),
        ],
        {
          initialFilters: [
            { id: 'status', value: { kind: 'options', values: ['Paid', 'Open'] } },
            { id: 'amount', value: { kind: 'number' } },
          ],
        },
      )
    case 'tasks':
      return make(
        tasks,
        [
          text('title', 'Task'),
          choice('status', 'Status', tasks),
          num('estimate', 'Points'),
          day('due', 'Due'),
          col('labels', 'Labels', { editor: { type: 'tags', creatable: true } }),
          col('link', 'Spec', { editor: { type: 'link' } }),
        ],
        { selectable: true },
      )
    case 'frozen':
      return make(
        accounts,
        [
          text('company', 'Company'),
          text('contact', 'Contact'),
          text('email', 'Email'),
          choice('plan', 'Plan', accounts),
          num('seats', 'Seats'),
          num('mrr', 'MRR'),
          day('renewal', 'Renews'),
          text('country', 'Country'),
          text('owner', 'Owner'),
        ],
        { selectable: true, initialPinnedColumns: { left: ['company'], right: [] } },
      )
    case 'reorder':
      return make(steps, [text('step', 'Step'), text('owner', 'Owner'), text('when', 'When')], {
        selectable: true,
      })
    case 'files':
      return make(
        files,
        [
          text('name', 'Name'),
          choice('kind', 'Kind', files),
          num('size', 'Size'),
          day('modified', 'Modified'),
        ],
        {
          selectable: true,
          initialExpandedIds: files
            .filter((row) => row.values.kind === 'Folder')
            .map((row) => row.id),
        },
      )
    case 'wrap':
      return make(entries, [
        choice('kind', 'Kind', entries),
        text('title', 'Title'),
        col('summary', 'Summary', { lines: 'wrap' }),
        day('date', 'Date'),
      ])
    case 'keyboard':
      return make(
        keyboard,
        [
          col('keys', 'Keys', { filter: false, sortable: false }),
          col('description', 'What it does', { lines: 'wrap', filter: false, sortable: false }),
        ],
        {
          initialExpandedIds: keyboard
            .filter((row) => row.parentId === undefined)
            .map((row) => row.id),
        },
      )
    case 'showcase':
      return make(
        componentRows,
        [
          col('name', 'Component', { hideable: false }),
          col('primitives', 'Primitives'),
          col('props', 'Props'),
          col('added', 'Added'),
        ],
        {
          selectable: true,
          editable: false,
          pageSize: 8,
          initialSorting: [{ id: 'added', desc: true }],
          rowActions: [],
          selectionActions: [],
        },
      )
    case 'sort':
    case 'search':
    case 'loading':
      return make(payments, paymentColumns)
  }
}
