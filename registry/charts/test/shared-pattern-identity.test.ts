import { expect, test } from 'vitest'
import { patternResourceEntries } from '../src/kit/pattern/resources'
import { PatternCircles } from '../src/kit/pattern/primitives'

const resource = (id: string) => PatternCircles({ id, width: 8, height: 8 }).props

test('inserting an unrelated pattern preserves the existing resource keys', () => {
  const a = resource('a')
  const b = resource('b')
  const before = patternResourceEntries([a, b])
  const after = patternResourceEntries([resource('inserted'), a, b])
  expect(after.slice(1)).toEqual(before)
})

test('duplicate SVG ids remain ordered, separate declarations without global-position keys', () => {
  const a = resource('same')
  const b = resource('same')
  const before = patternResourceEntries([a, b])
  const after = patternResourceEntries([a, resource('unrelated'), b])
  expect(before.map(([, value]) => value)).toEqual([a, b])
  expect(new Set(before.map(([key]) => key)).size).toBe(2)
  expect(after[0]).toEqual(before[0])
  expect(after[2]).toEqual(before[1])
})
