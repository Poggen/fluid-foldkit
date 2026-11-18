import { describe, expect, it } from 'vitest'
import { splitKeys } from '../src/key-cap.js'

describe('shortcut notation', () => {
  it.each([
    ['⇧⌘O', ['⇧', '⌘', 'O']],
    ['Ctrl+K', ['Ctrl', 'K']],
    ['Ctrl++', ['Ctrl', '+']],
    ['Option Shift Esc', ['Option', 'Shift', 'Esc']],
    ['+', ['+']],
    ['', []],
  ])('splits %s into its individual keys', (combo, keys) => {
    expect(splitKeys(combo)).toEqual(keys)
  })
})
