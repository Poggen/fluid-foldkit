import { expect, test } from 'vitest'
import { Area, Line, SeriesBar } from '@foldkit-visuals/charts/composed'
import { composedTooltipRows } from '../src/composed/tooltip'

test('mixed marks show each metric once in declaration order with source bar color precedence', () => {
  const rows = composedTooltipRows([
    Area({ dataKey: 'cost', fill: 'green' }),
    Line({ dataKey: 'revenue', stroke: 'navy' }),
    SeriesBar({ dataKey: 'cost', fill: 'orange', stroke: 'red' }),
  ])({ cost: 108, revenue: 180 })

  expect(rows).toEqual([
    { label: 'cost', value: 108, color: 'red' },
    { label: 'revenue', value: 180, color: 'navy' },
  ])
})

test('bar-first declarations retain their slot before later line-only metrics', () => {
  expect(
    composedTooltipRows([
      SeriesBar({ dataKey: 'cost', fill: 'green' }),
      Line({ dataKey: 'revenue', stroke: 'navy' }),
    ])({ cost: 0, revenue: -2 }),
  ).toEqual([
    { label: 'cost', value: 0, color: 'green' },
    { label: 'revenue', value: -2, color: 'navy' },
  ])
})
