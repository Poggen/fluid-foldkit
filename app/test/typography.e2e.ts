import { expect, test } from '@playwright/test'

test('keeps mobile Breadcrumb previews within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/components/breadcrumb')
  const playground = page.getByRole('region', { name: 'Playground', exact: true })
  await expect(playground.getByRole('navigation')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Basic', exact: true })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390)
  const icons = page
    .getByRole('region', { name: 'With icons', exact: true })
    .locator('[data-component-preview] > .overflow-hidden')
  await expect.poll(() => icons.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true)
  await icons.evaluate((node) => {
    node.scrollLeft = node.scrollWidth
  })
  await expect.poll(() => icons.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0)
  await page.goto('/components/input-message')
  const messages = page.locator('.authored-preview').first()
  await expect(messages).toHaveCSS('overflow-x', 'visible')
  await expect(messages).toHaveCSS('overflow-y', 'visible')
})

test('keeps documentation headings responsive to viewport and user preferences', async ({
  page,
}) => {
  await page.goto('/components/button')
  const title = page.getByRole('heading', { level: 1, name: 'Button', exact: true })
  const installation = page.getByRole('heading', { level: 2, name: 'Installation', exact: true })
  const customizer = page.locator('#site-customizer [data-customizer-content]')
  await expect(title).toHaveCSS('font-size', '28px')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(title).toHaveCSS('font-size', '22px')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await customizer.getByRole('combobox', { name: 'Size', exact: true }).click()
  await page.getByRole('option', { name: 'Compact', exact: true }).click()
  await expect(title).toHaveCSS('font-size', '24px')
  await expect(installation).toHaveCSS('font-size', '15px')
  await expect(
    page.locator('#site-customizer').getByRole('heading', { name: 'Make them yours', exact: true }),
  ).toHaveCSS('font-size', '11px')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(title).toHaveCSS('font-size', '20px')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await customizer.getByRole('combobox', { name: 'Heading font', exact: true }).click()
  await page.getByRole('option', { name: 'Geist Serif', exact: true }).click()
  await page.evaluate(() => document.fonts.ready)
  await expect(title).toHaveCSS('font-family', '"Geist Serif", serif')
  await expect(title).toHaveCSS('font-size', '28px')
  await expect(installation).toHaveCSS('font-family', '"Geist Serif", serif')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(title).toHaveCSS('font-size', '24px')
  await page.getByRole('button', { name: 'Pages', exact: true }).click()
  const mobileSettings = page.getByRole('dialog', { name: 'Pages', exact: true })
  await expect(mobileSettings.getByText('Heading font', { exact: true })).toHaveCSS(
    'font-size',
    '12px',
  )
  const mobileHeading = mobileSettings.getByRole('heading', {
    name: 'Make them yours',
    exact: true,
  })
  await expect(mobileHeading).toHaveCSS('font-size', '15px')
  await expect(mobileHeading).toHaveCSS('font-family', '"Geist Serif", serif')
})
