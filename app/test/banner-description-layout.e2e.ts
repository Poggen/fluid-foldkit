import { expect, test } from '@playwright/test'

test('Banner aligns its icon with the top of a described title and centers it for a title alone', async ({
  page,
}) => {
  await page.goto('/components/banner')
  const banner = page.getByRole('region', { name: 'Playground', exact: true }).getByRole('status')
  const title = banner.locator('[data-slot="banner-title"]')
  const icon = banner.locator(':scope > [aria-hidden="true"]').first()
  const description = page
    .locator('#site-customizer')
    .getByRole('switch', { name: 'Description', exact: true })
  const text = banner.locator('[data-slot="banner-description"]')

  const alignmentError = async (centered: boolean) => {
    const [titleBox, iconBox] = await Promise.all([title.boundingBox(), icon.boundingBox()])
    if (!titleBox || !iconBox) throw new Error('Banner title or icon has no layout box')
    return Math.abs(
      titleBox.y - iconBox.y + (centered ? (titleBox.height - iconBox.height) / 2 : 0),
    )
  }

  await expect(text).toBeVisible()
  await expect.poll(() => alignmentError(false)).toBeLessThan(1)
  await description.click()
  await expect(text).toHaveCount(0)
  await expect.poll(() => alignmentError(true)).toBeLessThan(1)
  await description.click()
  await expect(text).toBeVisible()
  await expect.poll(() => alignmentError(false)).toBeLessThan(1)
})
