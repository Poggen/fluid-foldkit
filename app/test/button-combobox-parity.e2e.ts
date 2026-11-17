import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'

let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    fileURLToPath(new URL('./button-combobox-parity-fixture.ts', import.meta.url)),
  )
})

test('native popup holds Button appearance and nested Combobox inherits Elevated context', async ({
  page,
}) => {
  const info = test.info()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mountRuntimeFixture(page, '/components/combobox', fixture)
  const trigger = page.getByRole('button', { name: 'Open menu', exact: true })
  const background = trigger.locator(':scope > [aria-hidden]')
  await expect(background).not.toHaveClass(/(?:^| )bg-active(?: |$)/u)
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('menuitem', { name: 'Menu item', exact: true }).hover()
  await expect(background).toHaveClass(/(?:^| )bg-active(?: |$)/u)
  await expect(background).toHaveCSS(
    'background-color',
    await page
      .locator('#explicit-active > [aria-hidden]')
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  )
  await expect(page.locator('#dialog-trigger > [aria-hidden]')).not.toHaveClass(
    /(?:^| )bg-active(?: |$)/u,
  )
  await page.screenshot({ path: info.outputPath('native-menu-held.png') })
  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(background).not.toHaveClass(/(?:^| )bg-active(?: |$)/u)
  await expect(page.getByRole('menu')).toBeHidden()
  const input = page.getByRole('combobox', { name: 'Nested choices' })
  await input.click()
  await page.keyboard.press('ArrowDown')
  const popup = page.locator('#nested-combo-popup [data-combo-surface]')
  await expect(popup).toBeVisible()
  await expect(page.locator('#nested-panel')).toHaveClass(/\bbg-surface-4\b/u)
  await expect(popup).toHaveClass(/\bbg-surface-6\b/u)
  await expect(popup).toHaveClass(/\bshadow-surface-3\b/u)
  await page.screenshot({ path: info.outputPath('nested-surface-6.png') })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Raise substrate', exact: true }).click()
  await input.click()
  await page.keyboard.press('ArrowDown')
  await expect(popup).toHaveClass(/\bbg-surface-8\b/u)
  await expect(popup).toHaveClass(/\bshadow-surface-3\b/u)
  await page.screenshot({ path: info.outputPath('nested-surface-8.png') })
  await page.evaluate(() => window.dispatchEvent(new Event('dispose-button-combobox')))
  await expect(page.locator('#nested-combo-popup')).toHaveCount(0)
  expect(errors).toEqual([])
})
