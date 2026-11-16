import { describe, expect, it } from 'vitest'
import {
  applySelection,
  componentPresentation,
  componentPresentationEqual,
  defaults,
  settingsFromLocation,
  settingsFromUrl,
  settingsQuery,
} from './settings'

describe('settings ownership', () => {
  it('applies independent field choices to the current accepted settings', () => {
    const dark = applySelection(defaults, { _tag: 'Theme', value: 'dark' })
    const custom = applySelection(dark, { _tag: 'Accent', value: '#12345678' })
    const serif = applySelection(custom, { _tag: 'Font', value: 'serif' })
    const rounded = applySelection(serif, { _tag: 'Shape', value: 'rounded' })
    const compact = applySelection(rounded, { _tag: 'Size', value: 'compact' })
    const standard = applySelection(compact, { _tag: 'Hover', value: 'standard' })
    expect(standard).toEqual({
      theme: 'dark',
      accent: '#12345678',
      font: 'serif',
      shape: 'rounded',
      size: 'compact',
      hover: 'standard',
    })
    expect(dark).toEqual({ ...defaults, theme: 'dark' })
  })

  it('keeps font changes out of component behavior configuration', () => {
    const before = componentPresentation(defaults)
    const after = componentPresentation({ ...defaults, font: 'serif' })
    expect(componentPresentationEqual(before, after)).toBe(true)
    expect(after).toEqual({
      theme: 'light',
      accent: 'blue',
      shape: 'sharp',
      size: 'default',
      hover: 'fluid',
    })
  })

  it('round trips all accepted settings through the shareable URL', () => {
    const settings = {
      theme: 'dark',
      accent: '#abcdef80',
      font: 'serif',
      shape: 'pill',
      size: 'compact',
      hover: 'standard',
    } as const
    expect(settingsFromUrl(`https://example.test/${settingsQuery(settings)}`)).toEqual(settings)
    expect(settingsQuery(defaults)).toBe('')
  })

  it('applies preview presentation overrides without replacing other root settings', () => {
    const url = new URL('https://example.test/?theme=dark&font=serif&size=compact&shape=pill')
    url.searchParams.set('props', JSON.stringify({ shape: 'rounded', hover: 'standard', size: 42 }))
    expect(settingsFromLocation(url.href)).toEqual({
      theme: 'dark',
      accent: 'blue',
      font: 'serif',
      shape: 'rounded',
      size: 'compact',
      hover: 'standard',
    })
  })
})
