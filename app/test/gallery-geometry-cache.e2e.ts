import { expect, test, type Page } from '@playwright/test'
import { admitAllPreviews } from './fixtures/gallery-admission'

const setSize = async (page: Page, label: 'Compact' | 'Default') => {
  await page.getByRole('button', { name: 'Pages', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Pages', exact: true })
  await dialog.getByRole('combobox', { name: 'Size', exact: true }).click()
  const option = page.getByRole('option', { name: label, exact: true })
  await option.click()
  await expect(option).toBeHidden()
  await expect(page.locator('.site')).toHaveAttribute('data-size', label.toLowerCase())
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
}

test('history placeholders reuse measured geometry only at the observed width and density', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const input = page.locator('[data-component="fluid/input"]')
  const content = input.locator('.preview-content')
  await expect(input).toHaveAttribute('data-deferred', 'true')
  await expect(content).toHaveCSS('min-height', '200px')
  await admitAllPreviews(page)
  await page.evaluate(() => scrollTo(0, 0))
  const heading = page.getByRole('heading', { level: 1, name: 'Fluid Functionalism', exact: true })
  await expect(heading).toBeInViewport()
  await page.getByRole('link', { name: 'Learn more', exact: true }).click()
  await expect(page).toHaveURL(/\/installation$/)
  await page.goBack()
  await expect(heading).toBeVisible()
  await expect(input).toHaveAttribute('data-deferred', 'true')
  await expect(content).toHaveCSS('min-height', '0px')
  await expect(input.getByRole('textbox')).toHaveCount(0)
  const restored = await input.boundingBox()
  if (restored === null) throw new Error('Expected a reserved input card')

  await setSize(page, 'Compact')
  await expect(input).toHaveAttribute('data-deferred', 'true')
  await expect(content).toHaveCSS('min-height', '200px')
  await setSize(page, 'Default')
  await expect(content).toHaveCSS('min-height', '0px')

  await page.setViewportSize({ width: 460, height: 844 })
  await expect(input).toHaveAttribute('data-deferred', 'true')
  await expect(content).toHaveCSS('min-height', '200px')
  await expect
    .poll(async () => (await input.boundingBox())?.height ?? 0)
    .toBeGreaterThan(restored.height)
})
