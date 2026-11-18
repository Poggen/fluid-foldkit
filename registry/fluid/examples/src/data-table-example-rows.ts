// Example rows derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
import type { DataTableRow } from '../../src/data-table.js'

export const members: ReadonlyArray<DataTableRow> = [
  {
    id: '1',
    values: {
      name: 'Ada Brooks',
      email: 'ada@acme.co',
      role: 'Owner',
      status: 'Active',
      lastActive: '2026-11-08',
    },
  },
  {
    id: '2',
    values: {
      name: 'Kenji Mori',
      email: 'kenji@acme.co',
      role: 'Admin',
      status: 'Active',
      lastActive: '2026-11-07',
    },
  },
  {
    id: '3',
    values: {
      name: 'Lena Fischer',
      email: 'lena@acme.co',
      role: 'Editor',
      status: 'Active',
      lastActive: '2026-11-08',
    },
  },
  {
    id: '4',
    values: {
      name: 'Omar Haddad',
      email: 'omar@acme.co',
      role: 'Editor',
      status: 'Invited',
      lastActive: '2026-10-30',
    },
  },
  {
    id: '5',
    values: {
      name: 'Priya Nair',
      email: 'priya@acme.co',
      role: 'Viewer',
      status: 'Active',
      lastActive: '2026-11-05',
    },
  },
  {
    id: '6',
    values: {
      name: 'Tomás Ruiz',
      email: 'tomas@acme.co',
      role: 'Editor',
      status: 'Suspended',
      lastActive: '2026-09-14',
    },
  },
  {
    id: '7',
    values: {
      name: 'Mia Laurent',
      email: 'mia@acme.co',
      role: 'Viewer',
      status: 'Active',
      lastActive: '2026-11-02',
    },
  },
  {
    id: '8',
    values: {
      name: 'Sam Okafor',
      email: 'sam@acme.co',
      role: 'Admin',
      status: 'Active',
      lastActive: '2026-11-06',
    },
  },
  {
    id: '9',
    values: {
      name: 'Yara Haddad',
      email: 'yara@acme.co',
      role: 'Viewer',
      status: 'Invited',
      lastActive: '2026-10-28',
    },
  },
  {
    id: '10',
    values: {
      name: 'Felix Berg',
      email: 'felix@acme.co',
      role: 'Editor',
      status: 'Active',
      lastActive: '2026-11-01',
    },
  },
  {
    id: '11',
    values: {
      name: 'Ines Costa',
      email: 'ines@acme.co',
      role: 'Viewer',
      status: 'Active',
      lastActive: '2026-10-25',
    },
  },
  {
    id: '12',
    values: {
      name: 'Leo Varga',
      email: 'leo@acme.co',
      role: 'Editor',
      status: 'Active',
      lastActive: '2026-11-04',
    },
  },
]
export const tasks: ReadonlyArray<DataTableRow> = [
  {
    id: 't1',
    values: {
      title: 'Draft the onboarding checklist',
      status: 'In progress',
      estimate: 3,
      due: '2026-11-12',
      labels: ['Docs'],
      link: 'acme.co/specs/onboarding',
    },
  },
  {
    id: 't2',
    values: {
      title: 'Fix the date picker on Safari',
      status: 'Todo',
      estimate: 2,
      due: '2026-11-10',
      labels: ['Bug', 'Web'],
      link: 'acme.co/issues/412',
    },
  },
  {
    id: 't3',
    values: {
      title: 'Ship dark mode for the billing page and the invoices it lists',
      status: 'Review',
      estimate: 5,
      due: '2026-11-14',
      labels: ['Design'],
      link: 'acme.co/specs/billing-dark',
    },
  },
  {
    id: 't4',
    values: {
      title: 'Interview 5 customers about exports',
      status: 'Todo',
      estimate: 8,
      due: '2026-11-21',
      labels: ['Research'],
      link: 'acme.co/research/exports',
    },
  },
  {
    id: 't5',
    values: {
      title: 'Rename workspaces to teams',
      status: 'Done',
      estimate: 1,
      due: '2026-11-03',
      labels: ['Web'],
      link: 'acme.co/issues/398',
    },
  },
  {
    id: 't6',
    values: {
      title: 'Rate-limit the public API',
      status: 'In progress',
      estimate: 5,
      due: '2026-11-18',
      labels: ['API'],
      link: 'acme.co/issues/405',
    },
  },
]
export const files: ReadonlyArray<DataTableRow> = [
  { id: 'brand', values: { name: 'Brand', kind: 'Folder', size: 4746, modified: '2026-11-06' } },
  {
    id: 'brand/logo',
    parentId: 'brand',
    values: { name: 'logo.svg', kind: 'SVG', size: 12, modified: '2026-10-02' },
  },
  {
    id: 'brand/guide',
    parentId: 'brand',
    values: { name: 'guidelines.pdf', kind: 'PDF', size: 4300, modified: '2026-11-06' },
  },
  {
    id: 'brand/type',
    parentId: 'brand',
    values: { name: 'Type', kind: 'Folder', size: 434, modified: '2026-09-18' },
  },
  {
    id: 'brand/type/inter',
    parentId: 'brand/type',
    values: { name: 'Inter.var.woff2', kind: 'Font', size: 336, modified: '2026-09-18' },
  },
  {
    id: 'brand/type/mono',
    parentId: 'brand/type',
    values: { name: 'Mono.woff2', kind: 'Font', size: 98, modified: '2026-09-18' },
  },
  { id: 'product', values: { name: 'Product', kind: 'Folder', size: 658, modified: '2026-11-08' } },
  {
    id: 'product/roadmap',
    parentId: 'product',
    values: { name: 'roadmap.md', kind: 'Markdown', size: 18, modified: '2026-11-08' },
  },
  {
    id: 'product/research',
    parentId: 'product',
    values: { name: 'interviews.csv', kind: 'CSV', size: 640, modified: '2026-11-01' },
  },
  {
    id: 'readme',
    values: { name: 'README.md', kind: 'Markdown', size: 6, modified: '2026-08-21' },
  },
  {
    id: 'deck',
    values: { name: 'pitch.key', kind: 'Keynote', size: 52800, modified: '2026-10-12' },
  },
]
export const entries: ReadonlyArray<DataTableRow> = [
  {
    id: 'e1',
    values: {
      kind: 'New',
      title: 'Data tables',
      date: '2026-11-08',
      summary:
        'Sort, search, resize and reorder columns, select rows with spreadsheet keys, edit cells in place, and open rows into their sub-rows.',
    },
  },
  {
    id: 'e2',
    values: {
      kind: 'Updated',
      title: 'Breadcrumb menus',
      date: '2026-11-07',
      summary:
        'Collapsed crumbs open on hover as well as on click, and the menu keeps focus where it was.',
    },
  },
  {
    id: 'e3',
    values: {
      kind: 'Fixed',
      title: 'Calendar in Safari',
      date: '2026-11-04',
      summary:
        'A range picked across two months no longer jumps back to the first month when the second click lands.',
    },
  },
  {
    id: 'e4',
    values: {
      kind: 'New',
      title: 'Field and text inputs',
      date: '2026-11-04',
      summary:
        'Labels, help text and errors compose into one accessible field, around an input that mirrors the Select trigger.',
    },
  },
  {
    id: 'e5',
    values: {
      kind: 'Updated',
      title: 'Sharp corners',
      date: '2026-11-02',
      summary: 'A third shape setting, 1px corners on every surface, joins rounded and pill.',
    },
  },
]
export const accounts: ReadonlyArray<DataTableRow> = [
  {
    id: 'a1',
    values: {
      company: 'Northwind Labs',
      contact: 'Ada Brooks',
      email: 'ada@northwind.io',
      plan: 'Scale',
      seats: 120,
      mrr: 4800,
      renewal: '2027-01-14',
      country: 'Germany',
      owner: 'Kenji',
    },
  },
  {
    id: 'a2',
    values: {
      company: 'Halden Studio',
      contact: 'Omar Haddad',
      email: 'omar@halden.studio',
      plan: 'Team',
      seats: 18,
      mrr: 540,
      renewal: '2026-12-02',
      country: 'Norway',
      owner: 'Lena',
    },
  },
  {
    id: 'a3',
    values: {
      company: 'Brightside',
      contact: 'Priya Nair',
      email: 'priya@brightside.co',
      plan: 'Team',
      seats: 42,
      mrr: 1260,
      renewal: '2027-03-20',
      country: 'India',
      owner: 'Kenji',
    },
  },
  {
    id: 'a4',
    values: {
      company: 'Costa & Sons',
      contact: 'Ines Costa',
      email: 'ines@costa.pt',
      plan: 'Free',
      seats: 3,
      mrr: 0,
      renewal: '2026-11-30',
      country: 'Portugal',
      owner: 'Sam',
    },
  },
  {
    id: 'a5',
    values: {
      company: 'Varga Systems',
      contact: 'Leo Varga',
      email: 'leo@varga.systems',
      plan: 'Scale',
      seats: 260,
      mrr: 10400,
      renewal: '2027-06-01',
      country: 'Hungary',
      owner: 'Lena',
    },
  },
  {
    id: 'a6',
    values: {
      company: 'Okafor Health',
      contact: 'Sam Okafor',
      email: 'sam@okafor.health',
      plan: 'Team',
      seats: 27,
      mrr: 810,
      renewal: '2027-02-11',
      country: 'Nigeria',
      owner: 'Sam',
    },
  },
]
export const invoices: ReadonlyArray<DataTableRow> = [
  {
    id: 'INV-1042',
    values: {
      id: 'INV-1042',
      customer: 'Northwind Labs',
      status: 'Overdue',
      amount: 4800,
      due: '2026-10-28',
    },
  },
  {
    id: 'INV-1043',
    values: {
      id: 'INV-1043',
      customer: 'Halden Studio',
      status: 'Open',
      amount: 540,
      due: '2026-11-20',
    },
  },
  {
    id: 'INV-1044',
    values: {
      id: 'INV-1044',
      customer: 'Brightside',
      status: 'Paid',
      amount: 1260,
      due: '2026-11-02',
    },
  },
  {
    id: 'INV-1045',
    values: {
      id: 'INV-1045',
      customer: 'Costa & Sons',
      status: 'Draft',
      amount: 90,
      due: '2026-12-01',
    },
  },
  {
    id: 'INV-1046',
    values: {
      id: 'INV-1046',
      customer: 'Varga Systems',
      status: 'Open',
      amount: 10400,
      due: '2026-11-25',
    },
  },
  {
    id: 'INV-1047',
    values: {
      id: 'INV-1047',
      customer: 'Okafor Health',
      status: 'Overdue',
      amount: 810,
      due: '2026-11-05',
    },
  },
  {
    id: 'INV-1048',
    values: {
      id: 'INV-1048',
      customer: 'Northwind Labs',
      status: 'Paid',
      amount: 4800,
      due: '2026-09-28',
    },
  },
  {
    id: 'INV-1049',
    values: {
      id: 'INV-1049',
      customer: 'Brightside',
      status: 'Open',
      amount: 1260,
      due: '2026-12-02',
    },
  },
]
export const steps: ReadonlyArray<DataTableRow> = [
  { id: '1', values: { step: 'Freeze the release branch', owner: 'Kenji', when: 'Mon' } },
  { id: '2', values: { step: 'Run the migration on staging', owner: 'Lena', when: 'Mon' } },
  { id: '3', values: { step: 'Write the changelog', owner: 'Ada', when: 'Tue' } },
  { id: '4', values: { step: 'Record the demo video', owner: 'Omar', when: 'Tue' } },
  { id: '5', values: { step: 'Email the beta group', owner: 'Priya', when: 'Wed' } },
  { id: '6', values: { step: 'Flip the feature flag', owner: 'Kenji', when: 'Thu' } },
  { id: '7', values: { step: 'Post the announcement', owner: 'Ada', when: 'Thu' } },
]
export const payments: ReadonlyArray<DataTableRow> = [
  { id: 'm5gr84i9', values: { status: 'success', email: 'ken99@example.com', amount: 316 } },
  { id: '3u1reuv4', values: { status: 'success', email: 'abe45@example.com', amount: 242 } },
  {
    id: 'derv1ws0',
    values: { status: 'processing', email: 'monserrat44@example.com', amount: 837 },
  },
  { id: '5kma53ae', values: { status: 'success', email: 'silas22@example.com', amount: 874 } },
  { id: 'bhqecj4p', values: { status: 'failed', email: 'carmella@example.com', amount: 721 } },
  { id: 'p0r8xk2d', values: { status: 'pending', email: 'nadia.r@example.com', amount: 129 } },
  { id: 'w7t2lq9z', values: { status: 'success', email: 'omar.f@example.com', amount: 560 } },
  { id: 'c4n6vb1y', values: { status: 'processing', email: 'lea.m@example.com', amount: 98 } },
  { id: 'h2j8sd5k', values: { status: 'failed', email: 'theo@example.com', amount: 415 } },
  { id: 'q9z3mf7w', values: { status: 'success', email: 'ines.b@example.com', amount: 1290 } },
  { id: 'x1c5gt8r', values: { status: 'pending', email: 'yuki@example.com', amount: 64 } },
  { id: 'k6v2pn4e', values: { status: 'success', email: 'arjun.k@example.com', amount: 705 } },
]
