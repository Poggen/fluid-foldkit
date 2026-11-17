import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'
let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(new URL('./selection-lifecycle-fixture.ts', import.meta.url)),
  )
})
test('initially-open Combobox and Selection retain native unmount cleanup', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mountRuntimeFixture(page, '/components/combobox', fixture)
  const combo = page.getByRole('combobox', { name: 'Initially open choices' })
  const comboState = page.locator('#combo-state')
  await expect(combo).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('option', { name: 'First', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(comboState).toHaveAttribute('data-slots', '1')
  await combo.focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('#initial-open-popup')).toHaveCount(0)
  await expect(comboState).toHaveAttribute('data-slots', '0')
  await combo.click()
  await page.keyboard.press('ArrowDown')
  await expect(comboState).toHaveAttribute('data-slots', '1')
  await page.keyboard.press('Escape')
  await expect(page.locator('#initial-open-popup')).toHaveCount(0)
  await expect(comboState).toHaveAttribute('data-slots', '0')
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-selection-lifecycle')))
  await expect(page.locator('#selection-state')).toHaveCount(0)
  expect(errors).toEqual([])
  await test.info().attach('clock-cleanup-receipt', {
    body: JSON.stringify(await page.evaluate(() => window.selectionLifecycleReceipt)),
    contentType: 'application/json',
  })
})

test('direct conditional Selection unmount clears geometry and cancels its clock', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mountRuntimeFixture(page, '/components/combobox?selectionOnly', fixture)
  const state = page.locator('#selection-state')
  await page.getByRole('button', { name: 'Clear geometry', exact: true }).click()
  await expect(state).toHaveAttribute('data-exits', '2')
  await page.getByRole('button', { name: 'Hide geometry', exact: true }).click()
  await expect(page.locator('#lifecycle-selection')).toHaveCount(0)
  await expect(state).toHaveAttribute('data-slots', '0')
  await page.getByRole('button', { name: 'Show geometry', exact: true }).click()
  await page.getByRole('button', { name: 'Restore geometry', exact: true }).click()
  await expect(state).toHaveAttribute('data-slots', '2')
  await page.getByRole('button', { name: 'Merge geometry', exact: true }).click()
  await expect(state).toHaveAttribute('data-boundaries', '1')
  await expect
    .poll(() => page.evaluate(() => window.selectionLifecycleReceipt.scheduled))
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Hide geometry', exact: true }).click()
  await expect(state).toHaveAttribute('data-boundaries', '0')
  await expect
    .poll(() => page.evaluate(() => window.selectionLifecycleReceipt.cancelled))
    .toBeGreaterThan(0)
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-selection-lifecycle')))
  await expect(page.locator('#selection-state')).toHaveCount(0)
  expect(errors).toEqual([])
  await test.info().attach('clock-cleanup-receipt', {
    body: JSON.stringify(await page.evaluate(() => window.selectionLifecycleReceipt)),
    contentType: 'application/json',
  })
})
