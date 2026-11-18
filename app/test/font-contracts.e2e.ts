import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'

let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(
      new URL('../../registry/charts/test/font-contracts-native.fixture.ts', import.meta.url),
    ),
  )
})

test('native Canvas cache and callback retirement retain current font ownership through real font admission', async ({
  page,
}) => {
  const font = await readFile(new URL('../src/assets/GeistSerif-Regular.woff2', import.meta.url))
  await page.route('**/__font-contract__/font.woff2', (route) =>
    route.fulfill({ body: font, contentType: 'font/woff2' }),
  )
  await mountRuntimeFixture(page, '/charts/line', fixture)
  await expect(page.locator('#font-metrics')).toBeAttached()
  const metrics = JSON.parse((await page.locator('#font-metrics').textContent()) ?? '{}')
  expect(metrics.first).toEqual(metrics.expected)
  expect(metrics.cached).toBe(true)
  expect(metrics.unchanged).toBe(false)
  expect(metrics.refreshed).toBe(true)
  expect(metrics.retired).toBe(true)
  const callbacks = JSON.parse((await page.locator('#font-callbacks').textContent()) ?? '{}')
  expect(callbacks.subscribed).toMatch(/ serif$/u)
  expect(callbacks.released).toMatch(/ monospace$/u)
  expect(callbacks.later).toMatch(/ sans-serif$/u)
  expect(callbacks.retired).toBe(1)
  expect(callbacks.updatedTooltip).toMatch(/ serif$/u)
  expect(callbacks.removedTooltip).toMatch(/ monospace$/u)
  expect(callbacks.retiredTooltip).toMatch(/ sans-serif$/u)
  expect(callbacks.cleared).toBe(true)
  expect(callbacks.clearedFont).toMatch(/ monospace$/u)
  await expect(page.locator('#font-admission, #font-error')).toBeAttached()
  expect(await page.locator('#font-error').allTextContents()).toEqual([])
  const admission = JSON.parse((await page.locator('#font-admission').textContent()) ?? '{}')
  expect(admission.loaded).toBe('loaded')
  expect(admission.rendered).toBe(true)
  expect(admission.freshScene).toBe(true)
  expect(admission.retainedSvg).toBe(true)
  expect(admission.nativeFont).toContain('NativeFontContract')
})
