import { expect, type Page } from '@playwright/test'

export const admitAllPreviews = async (page: Page) => {
  const cards = page.locator('[data-preview-href]')
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded()
    await expect(card).toHaveAttribute('data-deferred', 'false')
  }
  await expect(page.locator('[data-preview-href][data-deferred="true"]')).toHaveCount(0)
}
