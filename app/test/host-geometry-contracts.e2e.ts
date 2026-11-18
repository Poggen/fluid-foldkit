import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'

let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(
      new URL('../../registry/fluid/test/host-geometry-native.fixture.ts', import.meta.url),
    ),
  )
})

test('native tab geometry follows selection, reverses and reacquires a physical pill', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/components/tabs',
    fixture,
    '<main id="style-contract-root" data-fixture="tabs"></main>',
  )
  await page.addStyleTag({
    content:
      '[data-fluid-hover-index]{width:100px;height:36px;flex:0 0 auto}[data-slot="fluid-tabs"]{width:300px}',
  })
  const host = page.locator('#secondary-host')
  const tabs = host.getByRole('tab')
  const pill = host.locator('[data-tabs-selected-pill]')
  const x = () => pill.evaluate((element) => element.getBoundingClientRect().x)
  const first = await tabs.nth(0).evaluate((element) => element.getBoundingClientRect().x)
  const second = await tabs.nth(1).evaluate((element) => element.getBoundingClientRect().x)
  expect(second).toBeGreaterThan(first)
  await expect.poll(x).toBeCloseTo(first, 1)
  await tabs.nth(1).click()
  await expect
    .poll(async () => {
      const position = await x()
      return position > first && position < second
    })
    .toBe(true)
  await tabs.nth(0).click()
  await expect.poll(x).toBeCloseTo(first, 1)
  await tabs.nth(1).click()
  await expect.poll(x).toBeCloseTo(second, 1)
  await pill.evaluate((element) => element.setAttribute('data-original-pill', ''))
  await page.getByRole('button', { name: 'Toggle visible', exact: true }).click()
  await expect(pill).toHaveCount(0)
  await page.getByRole('button', { name: 'Toggle visible', exact: true }).click()
  await expect(pill).toBeVisible()
  await expect(pill).not.toHaveAttribute('data-original-pill')
  await expect.poll(x).toBeCloseTo(second, 1)
  await page.getByRole('button', { name: 'Dispose tabs', exact: true }).click()
  await expect(pill).toHaveCount(0)
})

test('native popup dimensions follow the anchor and flip against the actual viewport', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/components/combobox',
    fixture,
    '<main id="style-contract-root" data-fixture="combobox"></main>',
  )
  const anchor = page.locator('#anchor-field')
  await anchor.evaluate((element) => {
    element.style.cssText = 'position:fixed;left:40px;top:100px;width:180px;height:36px'
  })
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  const popup = page.locator('#anchor-popup')
  await popup.evaluate((element) => {
    element.style.width = '240px'
    element.style.height = '120px'
  })
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await expect(popup).toHaveAttribute('data-side', 'bottom')
  await expect
    .poll(() =>
      popup.evaluate((element) => getComputedStyle(element).getPropertyValue('--anchor-width')),
    )
    .toBe('180px')
  await anchor.evaluate((element) => {
    element.style.top = '260px'
    element.style.width = '210px'
  })
  await page.setViewportSize({ width: 800, height: 300 })
  await expect(popup).toHaveAttribute('data-side', 'top')
  await expect
    .poll(() =>
      popup.evaluate((element) => getComputedStyle(element).getPropertyValue('--anchor-width')),
    )
    .toBe('210px')
  const bounds = await popup.boundingBox()
  const target = await anchor.boundingBox()
  if (bounds === null || target === null) throw new Error('Expected actual anchor and popup layout')
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(target.y)
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-native-combo')))
  await expect(popup).toHaveCount(0)
})

test('native collapse resources consume real resize and current content on reopening', async ({
  page,
}) => {
  await mountRuntimeFixture(
    page,
    '/components/accordion',
    fixture,
    '<main id="style-contract-root" data-fixture="collapse"></main>',
  )
  for (const name of ['accordion', 'thinking', 'sidebar', 'submenu']) {
    const panel = page.locator(`[data-native-collapse="${name}"]`)
    await expect(panel).toHaveCSS('height', '124px')
    await page.getByRole('button', { name: `Resize ${name}`, exact: true }).click()
    await expect(panel).toHaveCSS('height', '204px')
    await page.getByRole('button', { name: `Close ${name}`, exact: true }).click()
    await expect(panel).toHaveCSS('height', '0px')
    await page.getByRole('button', { name: `Reopen ${name}`, exact: true }).click()
    await expect(panel).toHaveCSS('height', '240px')
    if (name === 'sidebar') await expect(panel).toHaveCSS('overflow', 'visible')
    await page.getByRole('button', { name: `Dispose ${name}`, exact: true }).click()
    await expect(panel).toHaveCount(0)
  }
})
