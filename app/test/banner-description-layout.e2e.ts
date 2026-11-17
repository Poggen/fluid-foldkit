import { expect, test } from '@playwright/test'

test('Banner description controls its declared layout without descendant selectors', async ({
  page,
}) => {
  await page.goto('/components/banner')
  const preview = page.getByRole('region', { name: 'Playground', exact: true })
  const banner = preview.locator('[data-slot="banner"]')
  await expect(banner).toHaveAttribute('data-described', '')
  await expect(banner).toHaveCSS('align-items', 'flex-start')
  const description = page.getByRole('switch', { name: 'Description', exact: true })
  await description.scrollIntoViewIfNeeded()
  await description.click()
  await expect(banner).not.toHaveAttribute('data-described')
  await expect(banner).toHaveCSS('align-items', 'center')
  await description.click()
  await expect(banner).toHaveAttribute('data-described', '')
  await expect(banner).toHaveCSS('align-items', 'flex-start')
})
