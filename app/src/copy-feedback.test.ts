import { describe, expect, it } from 'vitest'
import { beginCopy, initialCopyFeedback, setCopyFeedback } from './copy-feedback'
import { buildInstallBrief } from './install-brief'
import { defaults } from './settings'
import { shortcutSelection } from './global-shortcuts'
describe('global customization behavior', () => {
  it('keeps hero and sidebar clipboard receipts independent and rejects stale completion', () => {
    const hero = beginCopy(initialCopyFeedback(), 'hero')
    const both = beginCopy(hero, 'sidebar')
    const complete = setCopyFeedback(both, 'hero', hero.hero.revision, true)
    expect(complete.hero.complete).toBe(true)
    expect(complete.sidebar.complete).toBe(false)
    const newer = beginCopy(complete, 'hero')
    expect(setCopyFeedback(newer, 'hero', hero.hero.revision, false)).toBe(newer)
  })
  it('copies a self-contained native install brief at the current origin', () => {
    const brief = buildInstallBrief('https://docs.example.test', undefined, defaults)
    expect(brief).toContain('https://docs.example.test/r/fluid/0.1.0-preview.1/{name}.json')
    expect(brief).toContain('https://docs.example.test/installation')
    expect(brief).toContain('0.170.0-canary.54f8bcd443b4')
    expect(brief).toContain('makeRequiredFieldBinding')
    expect(brief).toContain('bunx shadcn@4.23.0 add @fluid-foldkit/button')
    expect(brief).not.toContain('@fluid-foldkit/all')
    expect(brief).toContain('bunx shadcn@4.23.0 add @bklit-foldkit/all')
  })
  it('cycles the original supported shortcut choices from current settings', () => {
    expect(shortcutSelection({ ...defaults, theme: 'system' }, 't')).toEqual({
      _tag: 'Theme',
      value: 'light',
    })
    expect(shortcutSelection({ ...defaults, font: 'serif' }, 'f')).toEqual({
      _tag: 'Font',
      value: 'sans',
    })
    expect(shortcutSelection({ ...defaults, shape: 'pill' }, 'r')).toEqual({
      _tag: 'Shape',
      value: 'sharp',
    })
    expect(shortcutSelection(defaults, 's')).toEqual({ _tag: 'Size', value: 'compact' })
    expect(shortcutSelection(defaults, 'h')).toEqual({ _tag: 'Hover', value: 'standard' })
  })
})
