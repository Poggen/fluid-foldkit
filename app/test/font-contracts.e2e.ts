import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
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
  await expect(page.locator('#font-admission')).toBeAttached()
  const admission = JSON.parse((await page.locator('#font-admission').textContent()) ?? '{}')
  expect(admission.loaded).toBe('loaded')
  expect(admission.rendered).toBe(true)
  expect(admission.freshScene).toBe(true)
  expect(admission.retainedSvg).toBe(true)
  expect(admission.nativeFont).toContain('NativeFontContract')
  await expect(page.locator('#font-error')).toHaveCount(0)
})
