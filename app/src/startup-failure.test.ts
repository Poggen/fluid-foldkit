import { expect, it } from 'vitest'
import { showStartupFailure } from './startup-failure'

it('preserves server navigation and retries only on explicit activation', () => {
  const document = window.document.implementation.createHTMLDocument()
  const link = document.createElement('a')
  link.href = '/components/card'
  link.textContent = 'Card'
  document.body.append(link)
  let retries = 0
  showStartupFailure(document, () => {
    retries += 1
  })
  expect(document.body.contains(link)).toBe(true)
  expect(link.getAttribute('href')).toBe('/components/card')
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    'Interactive controls could not load',
  )
  expect(retries).toBe(0)
  const retry = document.querySelector('button')
  expect(retry?.textContent).toBe('Reload page')
  retry?.click()
  expect(retries).toBe(1)
})
