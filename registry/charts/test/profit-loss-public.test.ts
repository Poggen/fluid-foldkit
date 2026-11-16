import { expect, it } from 'vitest'
import {
  PROFIT_LOSS_POSITIVE_COLOR,
  PROFIT_LOSS_NEGATIVE_COLOR,
  PROFIT_LOSS_TOOLTIP_LABEL_FALLBACK,
  PROFIT_LOSS_LEGEND_ITEMS,
  profitLossColor,
  resolveProfitLossTooltipLabel,
} from '../src/index'

it('retains the Source palette bytes, Profit/Loss order and both zero legend values', () => {
  const lossValue: 0 = PROFIT_LOSS_LEGEND_ITEMS[1].value

  expect(PROFIT_LOSS_POSITIVE_COLOR).toBe('var(--color-emerald-500, oklch(69.6% 0.17 162.48))')
  expect(PROFIT_LOSS_NEGATIVE_COLOR).toBe('var(--color-red-500, oklch(63.7% 0.237 25.331))')
  expect(PROFIT_LOSS_TOOLTIP_LABEL_FALLBACK).toBe('Profit/Loss')
  expect(PROFIT_LOSS_LEGEND_ITEMS).toEqual([
    { label: 'Profit', value: 0, color: 'var(--color-emerald-500, oklch(69.6% 0.17 162.48))' },
    { label: 'Loss', value: 0, color: 'var(--color-red-500, oklch(63.7% 0.237 25.331))' },
  ])
  expect(lossValue).toBe(0)
  expect(Object.isFrozen(PROFIT_LOSS_LEGEND_ITEMS)).toBe(false)
  expect(Object.isFrozen(PROFIT_LOSS_LEGEND_ITEMS[0])).toBe(false)
})

it.each([
  { value: -1, expected: 'var(--color-red-500, oklch(63.7% 0.237 25.331))' },
  { value: Number.NEGATIVE_INFINITY, expected: 'var(--color-red-500, oklch(63.7% 0.237 25.331))' },
  { value: Number.NaN, expected: 'var(--color-red-500, oklch(63.7% 0.237 25.331))' },
  { value: -0, expected: 'var(--color-emerald-500, oklch(69.6% 0.17 162.48))' },
  { value: 0, expected: 'var(--color-emerald-500, oklch(69.6% 0.17 162.48))' },
  { value: 1, expected: 'var(--color-emerald-500, oklch(69.6% 0.17 162.48))' },
  {
    value: Number.POSITIVE_INFINITY,
    expected: 'var(--color-emerald-500, oklch(69.6% 0.17 162.48))',
  },
])('preserves Source sign selection for $value', ({ value, expected }) => {
  expect(profitLossColor(value)).toBe(expected)
})

it.each([
  { label: '', expected: 'Profit/Loss' },
  { label: ' \t\n', expected: 'Profit/Loss' },
  { label: '\u00A0\uFEFF', expected: 'Profit/Loss' },
  { label: '\u00A0 Profit \uFEFF', expected: 'Profit' },
  { label: '0', expected: '0' },
  { label: '  Profit  /  Loss  ', expected: 'Profit  /  Loss' },
])('trims only the edges before resolving Source label $label', ({ label, expected }) => {
  expect(resolveProfitLossTooltipLabel(label)).toBe(expected)
})
