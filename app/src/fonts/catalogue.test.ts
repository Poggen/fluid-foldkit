import { describe, expect, it } from 'vitest'
import { Schema } from 'effect'
import raw from './catalogue.json'
import {
  FontCatalogue,
  FontChoice,
  fontStylesheet,
  fontWeights,
  matchingFonts,
  nearestWeight,
  previewStylesheet,
} from './catalogue'
import {
  Settings,
  applySelection,
  componentPresentation,
  defaults,
  currentFontFamily,
  headingFontPresentation,
  resolveSettings,
  settingsFromUrl,
  settingsQuery,
} from '../settings'
import { shouldTransitionTheme } from '../theme'
const catalogue = Schema.decodeUnknownSync(FontCatalogue)(raw)
const font = (name: string) => {
  const result = catalogue.fonts.find((font) => font.name === name)
  if (result === undefined) throw new Error(`Missing reference font ${name}`)
  return result
}
describe('full Google Fonts catalogue', () => {
  it('includes every family in the current snapshot and keeps source provenance', () => {
    expect(catalogue.source).toBe('https://fonts.google.com/metadata/fonts')
    expect(catalogue.fonts.length).toBeGreaterThanOrEqual(1961)
    expect(new Set(catalogue.fonts.map((font) => font.name)).size).toBe(catalogue.fonts.length)
    expect(font('Inter').weightAxis).toEqual([100, 900])
  })
  it('ranks prefix matches before interior matches and filters categories before the row limit', () => {
    const results = matchingFonts(catalogue.fonts, 'sans', 'all', null)
    expect(results.length).toBeLessThanOrEqual(50)
    expect(results[0]?.name.toLowerCase().startsWith('sans')).toBe(true)
    expect(
      matchingFonts(catalogue.fonts, '', 'serif', null).every((font) => font.category === 'serif'),
    ).toBe(true)
    expect(matchingFonts(catalogue.fonts, '', 'all', 'Inter')[0]?.name).toBe('Inter')
  })
  it('loads variable axes and bounded static weights through encoded CSS2 URLs', () => {
    expect(fontStylesheet(font('Inter'))).toContain(':opsz,wght@14..32,100..900')
    expect(fontWeights(font('Inter'))).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900])
    expect(nearestWeight(font('Playfair Display'), 550)).toBe(500)
    expect(previewStylesheet([font('Inter')])).toContain('&text=')
  })
})
describe('canonical theme and heading preferences', () => {
  it('preserves legacy URLs and round trips a custom family and weight', () => {
    for (const value of ['sans', 'serif'])
      expect(settingsFromUrl(`https://example.test/?font=${value}`).font).toBe(value)
    const selected = applySelection(defaults, {
      _tag: 'CustomFont',
      value: { family: 'Playfair Display', weight: 600 },
    })
    expect(settingsFromUrl(`https://example.test/${settingsQuery(selected)}`)).toEqual(selected)
    expect(currentFontFamily(selected)).toBe('Playfair Display')
    expect(headingFontPresentation(selected)).toMatchObject({ weight: 600, displayWeight: 600 })
  })
  it('rejects incomplete custom mode, unsafe family names, and invalid weights at the boundary', () => {
    expect(Schema.is(Settings)({ ...defaults, font: 'custom' })).toBe(false)
    expect(applySelection(defaults, { _tag: 'Font', value: 'custom' })).toBe(defaults)
    expect(settingsFromUrl('https://example.test/?font=custom&family=%22%3Bcolor:red').font).toBe(
      'sans',
    )
    expect(Schema.is(FontChoice)({ family: 'Inter', weight: 1001 })).toBe(false)
    expect(Schema.is(FontChoice)({ family: 'Inter', weight: 0 })).toBe(false)
  })
  it('derives system appearance without changing the requested preference or invalidating equal projections', () => {
    const system = { ...defaults, theme: 'system' as const }
    expect(resolveSettings(system, 'dark').theme).toBe('dark')
    expect(system.theme).toBe('system')
    expect(resolveSettings(system, 'dark')).toBe(resolveSettings(system, 'dark'))
    expect(componentPresentation(system, 'dark').theme).toBe('dark')
    expect(shouldTransitionTheme(system, { ...system, theme: 'light' }, false, true)).toBe(false)
    expect(shouldTransitionTheme(system, { ...system, theme: 'light' }, true, true)).toBe(false)
    expect(
      shouldTransitionTheme(system, { ...system, theme: 'light' }, true, true, 'dark', 'dark'),
    ).toBe(true)
  })
})
