import { expect, test } from 'vitest'
import { cn, joinClasses } from '../classes'

test('caller classes override the same supported class group and variant without removing unknown classes', () => {
  const classes = [
    'flex hidden',
    ['px-2', 'px-4'],
    { 'hover:bg-red-500': true },
    'hover:bg-blue-500',
    'caller-token caller-token',
  ]

  expect(cn(...classes)).toBe('hidden px-4 hover:bg-blue-500 caller-token caller-token')
})

test('size and font-size retain the Source directional conflict rules', () => {
  expect(cn('w-4 h-8 size-12', 'rounded-t-lg rounded-tr-none', 'text-sm leading-3 text-lg')).toBe(
    'size-12 rounded-t-lg rounded-tr-none text-lg',
  )
  expect(joinClasses('a', false, undefined, '', 'b')).toBe('a b')
})
