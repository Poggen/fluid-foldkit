/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
import type { DataTableRow } from '../../src/data-table.js'

export const keyboard: ReadonlyArray<DataTableRow> = [
  { id: 'Rows', values: { keys: 'Rows', description: 'On a row, or with the pointer over one' } },
  {
    id: 'Rows/0',
    parentId: 'Rows',
    values: { keys: '↑ / ↓', description: 'The row above or below.' },
  },
  {
    id: 'Rows/1',
    parentId: 'Rows',
    values: { keys: 'Home / End', description: 'The first or the last row.' },
  },
  {
    id: 'Rows/2',
    parentId: 'Rows',
    values: { keys: '↓', description: 'From the search or a header: into the first row.' },
  },
  { id: 'Selection', values: { keys: 'Selection', description: 'With a selection column' } },
  {
    id: 'Selection/0',
    parentId: 'Selection',
    values: { keys: 'X / Enter', description: 'Selects or clears the row.' },
  },
  {
    id: 'Selection/1',
    parentId: 'Selection',
    values: {
      keys: 'Shift + ↑ / Shift + ↓',
      description: 'Grows or shrinks the selection from where it started.',
    },
  },
  {
    id: 'Selection/2',
    parentId: 'Selection',
    values: {
      keys: '⌘ + A',
      description: 'Selects every row, on every page, with the pointer anywhere over the table.',
    },
  },
  {
    id: 'Selection/3',
    parentId: 'Selection',
    values: {
      keys: 'Space / Enter',
      description: "On the header's box: selects or clears every row.",
    },
  },
  {
    id: 'Selection/4',
    parentId: 'Selection',
    values: { keys: 'Esc', description: 'Clears the selection.' },
  },
  {
    id: 'Selection/5',
    parentId: 'Selection',
    values: { keys: '⌘ + K', description: "Opens the selection's actions." },
  },
  { id: 'Sub-rows', values: { keys: 'Sub-rows', description: 'On a row that opens' } },
  {
    id: 'Sub-rows/0',
    parentId: 'Sub-rows',
    values: { keys: '→', description: 'Opens the row, then steps into it.' },
  },
  {
    id: 'Sub-rows/1',
    parentId: 'Sub-rows',
    values: { keys: '←', description: 'Closes the row, or steps back to its parent.' },
  },
  {
    id: 'Sub-rows/2',
    parentId: 'Sub-rows',
    values: {
      keys: 'Enter / Space',
      description: 'Opens and closes it, where rows neither select nor click.',
    },
  },
  { id: 'Editing', values: { keys: 'Editing', description: 'In an editable cell' } },
  {
    id: 'Editing/0',
    parentId: 'Editing',
    values: { keys: 'Enter / Esc', description: 'Leaves the field and keeps what you typed.' },
  },
  { id: 'Editing/1', parentId: 'Editing', values: { keys: 'F2', description: 'Edits a link.' } },
  {
    id: 'Editing/2',
    parentId: 'Editing',
    values: { keys: '⌘ + Z', description: 'Takes back the last change.' },
  },
  {
    id: 'Editing/3',
    parentId: 'Editing',
    values: { keys: '⇧ + ⌘ + Z', description: 'Brings it back.' },
  },
  { id: 'Moving rows', values: { keys: 'Moving rows', description: 'With row reordering' } },
  {
    id: 'Moving rows/0',
    parentId: 'Moving rows',
    values: {
      keys: 'Alt + ↑ / Alt + ↓',
      description:
        'Moves the selected rows a place, else the row under the pointer or holding focus.',
    },
  },
  {
    id: 'Moving rows/1',
    parentId: 'Moving rows',
    values: { keys: 'Esc', description: 'During a drag: puts the row back.' },
  },
  { id: 'Columns', values: { keys: 'Columns', description: 'On a header' } },
  {
    id: 'Columns/0',
    parentId: 'Columns',
    values: { keys: 'Alt + ← / Alt + →', description: 'Moves the column.' },
  },
  {
    id: 'Columns/1',
    parentId: 'Columns',
    values: { keys: '← / →', description: "On a column's edge: steps its width by 16px." },
  },
]
