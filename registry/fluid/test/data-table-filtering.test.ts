import { expect, it } from 'vitest'
import { dataTableMatches } from '../src/data-table.js'
import type { DataTableFilterValue, DataTableValue } from '../src/data-table.js'

const cases: ReadonlyArray<{
  readonly name: string
  readonly value: DataTableValue
  readonly filter: DataTableFilterValue
  readonly matches: boolean
}> = [
  {
    name: 'case-insensitive text',
    value: 'Ada LOVELACE',
    filter: { kind: 'text', query: 'love' },
    matches: true,
  },
  {
    name: 'negative substring',
    value: 'Ada Lovelace',
    filter: { kind: 'text', query: 'love', op: 'does not contain' },
    matches: false,
  },
  {
    name: 'empty tags',
    value: [],
    filter: { kind: 'text', query: '', op: 'is empty' },
    matches: true,
  },
  {
    name: 'any matching tag',
    value: ['elm', 'effect'],
    filter: { kind: 'options', values: ['foldkit', 'effect'] },
    matches: true,
  },
  {
    name: 'excluded matching tag',
    value: ['elm', 'effect'],
    filter: { kind: 'options', values: ['effect'], op: 'is not' },
    matches: false,
  },
  {
    name: 'inclusive numeric boundary',
    value: 10,
    filter: { kind: 'number', min: 10, max: 20 },
    matches: true,
  },
  {
    name: 'missing number is not zero',
    value: null,
    filter: { kind: 'number', max: 0 },
    matches: false,
  },
  {
    name: 'inclusive end day',
    value: '2026-11-18',
    filter: { kind: 'date', from: '2026-11-01', to: '2026-11-18' },
    matches: true,
  },
  {
    name: 'strictly before day',
    value: '2026-11-18',
    filter: { kind: 'date', op: 'before', to: '2026-11-18' },
    matches: false,
  },
]

it.each(cases)('matches $name', ({ value, filter, matches }) => {
  expect(dataTableMatches(value, filter)).toBe(matches)
})
