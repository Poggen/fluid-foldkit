import { expect, it } from 'vitest'
import { publishRootPresentation } from './environment'
import { defaults } from './settings'

it('publishes source density and font choices on the common ancestor of app and portals', () => {
  const document = window.document.implementation.createHTMLDocument('Presentation')
  const root = document.documentElement
  const app = document.createElement('main')
  const portal = document.createElement('div')
  document.body.append(app, portal)
  publishRootPresentation(root, { ...defaults, size: 'compact', font: 'serif' }, 'dark')
  expect(portal.closest('[data-size]')).toBe(root)
  expect(app.closest('[data-font]')).toBe(root)
  expect(root.dataset.size).toBe('compact')
  expect(root.dataset.font).toBe('geist-serif')
  expect(root.style.getPropertyValue('--heading-family')).toBe('"Geist Serif", serif')
  expect(root.style.getPropertyValue('--heading-weight')).toBe('400')
  expect(root.style.getPropertyValue('--heading-display-weight')).toBe('400')
  expect(root.classList.contains('dark')).toBe(true)
  expect(root.classList.contains('light')).toBe(false)
})

it('keeps custom choice, role weights and chosen scale through failure, retry and reset', () => {
  const root = document.implementation.createHTMLDocument('Presentation').documentElement
  const selected = {
    ...defaults,
    font: 'custom' as const,
    customFont: { family: 'Lora', weight: null },
  }
  publishRootPresentation(root, selected, 'light')
  expect(root.dataset.font).toBe('custom')
  expect(root.style.getPropertyValue('--heading-family')).toBe('"Lora", var(--font-sans)')
  expect(root.style.getPropertyValue('--heading-weight')).toBe('550')
  expect(root.style.getPropertyValue('--heading-display-weight')).toBe('700')
  publishRootPresentation(root, selected, 'light', true)
  expect(root.dataset.font).toBe('custom')
  expect(root.style.getPropertyValue('--heading-family')).toBe('var(--font-sans)')
  publishRootPresentation(
    root,
    { ...selected, customFont: { family: 'Lora', weight: 600 } },
    'light',
  )
  expect(root.style.getPropertyValue('--heading-family')).toBe('"Lora", var(--font-sans)')
  expect(root.style.getPropertyValue('--heading-weight')).toBe('600')
  expect(root.style.getPropertyValue('--heading-display-weight')).toBe('600')
  publishRootPresentation(root, defaults, 'light')
  expect(root.dataset.font).toBe('inter')
  expect(root.dataset.size).toBe('default')
  expect(root.style.getPropertyValue('--heading-family')).toBe('"Inter Variable", var(--font-sans)')
  expect(root.style.getPropertyValue('--heading-weight')).toBe('550')
  expect(root.style.getPropertyValue('--heading-display-weight')).toBe('700')
})

it('does not mutate root presentation for a repeated publish or unrelated accent selection', () => {
  const root = document.implementation.createHTMLDocument('Presentation').documentElement
  publishRootPresentation(root, defaults, 'light')
  const observer = new MutationObserver(() => {})
  observer.observe(root, { attributes: true })
  try {
    publishRootPresentation(root, defaults, 'light')
    publishRootPresentation(root, { ...defaults, accent: 'red' }, 'light')
    expect(observer.takeRecords()).toEqual([])
  } finally {
    observer.disconnect()
  }
})
