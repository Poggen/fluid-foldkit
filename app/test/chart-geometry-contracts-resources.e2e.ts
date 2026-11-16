import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'

let resource = ''
let brush = ''
test.beforeAll(async () => {
  resource = await bundleRuntimeFixture(
    fileURLToPath(new URL('./chart-geometry-contracts-resource-fixture.ts', import.meta.url)),
  )
  brush = await bundleRuntimeFixture(
    fileURLToPath(new URL('./chart-geometry-contracts-brush-fixture.ts', import.meta.url)),
  )
})

test('direct TimeSeries resource consumes changed dimensions and releases only its class leases', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/charts/line', resource)
  const host = page.locator('#direct-resource')
  await expect(host).toHaveCSS('width', '400px')
  await expect(host).toHaveCSS('height', '240px')
  await expect(host).toHaveCSS('position', 'relative')
  await expect(host).toHaveCSS('user-select', 'none')
  await page.evaluate(() => window.dispatchEvent(new Event('resize-direct-resource')))
  await expect(host).toHaveCSS('width', '480px')
  await expect(page.getByText('application-owned decoy')).toHaveCount(1)
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-geometry-fixture')))
  await expect(host).toHaveAttribute('class', 'caller later')
  await expect(host.locator(':scope > *')).toHaveCount(0)
  await expect(page.getByText('application-owned decoy')).toHaveCount(1)
})

test('Brush consumes native resize and controlled-selection geometry without replacing its SVG', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/charts/line', brush)
  const handles = page.locator('[data-chart-brush-handle-pill]')
  await expect(handles).toHaveCount(2)
  await expect(handles.nth(1)).toHaveCSS('left', '200px')
  const svg = page.locator('svg.ts-chart').first()
  const original = await svg.elementHandle()
  await page.getByRole('button', { name: 'Resize brush', exact: true }).click()
  await expect(handles.nth(1)).toHaveCSS('left', '300px')
  expect(await svg.evaluate((element, before) => element === before, original)).toBe(true)
  await expect(svg).toHaveAttribute('viewBox', /600/u)
  await expect(page.locator('.bkm-brush-track-overlay-pane')).toHaveCSS('width', '258px')
  await page.getByRole('button', { name: 'Select brush', exact: true }).click()
  await expect(page.locator('[data-brush-selection]')).toHaveText('86400000:172800000')
  await expect(handles.nth(0)).toHaveCSS('left', '38px')
  await expect(handles.nth(1)).toHaveCSS('left', '300px')
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-geometry-fixture')))
  await expect(handles).toHaveCount(0)
})
