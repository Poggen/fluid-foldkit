import { expect, test } from 'vitest'
import { Option } from 'effect'
import { defaults } from './configs/checkbox'
import { decodeConfiguration, serializeConfiguration, updateConfiguration } from './configuration'

test('saved Checkbox URLs without mixed state decode to the compatible default', () => {
  const { indeterminate: _indeterminate, ...legacy } = defaults
  expect(Option.getOrThrow(decodeConfiguration(JSON.stringify(legacy)))).toEqual(defaults)
  const mixed = { ...defaults, indeterminate: true }
  expect(Option.getOrThrow(decodeConfiguration(serializeConfiguration(mixed)))).toEqual(mixed)
})

test('Checkbox rejects invalid mixed inputs instead of defaulting them', () => {
  for (const indeterminate of ['true', null, 1]) {
    expect(Option.isNone(decodeConfiguration(JSON.stringify({ ...defaults, indeterminate })))).toBe(
      true,
    )
  }
  expect(updateConfiguration(defaults, 'indeterminate', 'true')).toBe(defaults)
  expect(updateConfiguration(defaults, 'indeterminate', true)).toEqual({
    ...defaults,
    indeterminate: true,
  })
})
