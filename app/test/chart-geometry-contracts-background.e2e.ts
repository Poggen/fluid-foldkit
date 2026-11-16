import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'
let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(new URL('./chart-geometry-contracts-background-fixture.ts', import.meta.url)),
  )
})
test('native background masks bound each fade independently and hide only the loading chart', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/charts/line', fixture)
  const ready = page.locator('[data-bkm-native-chart="background-ready"] .bkm-bg')
  const loading = page.locator('[data-bkm-native-chart="background-loading"] .bkm-bg')
  await expect(ready.locator('rect')).toHaveCSS('opacity', '1')
  await expect(loading.locator('rect')).toHaveCSS('opacity', '0')
  for (const plot of [ready, loading]) {
    const fade = await plot.evaluate((element) => ({
      horizontal: getComputedStyle(element).getPropertyValue('--bkm-bg-h').trim(),
      vertical: getComputedStyle(element).getPropertyValue('--bkm-bg-v').trim(),
      mask: getComputedStyle(element).maskImage,
      composition: getComputedStyle(element).maskComposite,
    }))
    expect(fade.horizontal).toBe('45%')
    expect(fade.vertical).toBe('0%')
    expect(fade.mask).toContain('linear-gradient')
    expect(fade.mask).toContain('45%')
    expect(fade.composition).toBe('intersect, intersect')
  }
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-geometry-fixture')))
})
