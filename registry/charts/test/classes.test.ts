import { expect, it } from 'vitest'
import { cn } from '../src/kit/classes.js'

it.each([
  ['p-2 px-4', 'p-2 px-4'],
  ['px-4 p-2', 'p-2'],
  ['gap-2 gap-x-4', 'gap-2 gap-x-4'],
  ['gap-x-4 gap-2', 'gap-2'],
  ['text-sm text-muted-foreground', 'text-sm text-muted-foreground'],
  ['text-muted-foreground text-red-500', 'text-red-500'],
  ['w-full w-[320px]', 'w-[320px]'],
  ['sm:p-2 sm:p-4 p-1', 'sm:p-4 p-1'],
  ['hover:opacity-50 hover:opacity-100 opacity-80', 'hover:opacity-100 opacity-80'],
  ['rounded-lg rounded-t-none', 'rounded-lg rounded-t-none'],
  ['tabular-nums proportional-nums', 'proportional-nums'],
  ['bkm-stat custom-chart', 'bkm-stat custom-chart'],
])('preserves chart class override semantics for %s', (input, expected) => {
  expect(cn(input)).toBe(expected)
})

it('accepts conditional caller classes and Tailwind 4 important modifiers', () => {
  expect(cn('flex p-2!', false, undefined, { 'p-4!': true }, ['custom-chart'])).toBe(
    'flex p-4! custom-chart',
  )
})
