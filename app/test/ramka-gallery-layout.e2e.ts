import { expect, test, type Page } from '@playwright/test'

test('rotating the full gallery preserves demo positions and reference height', async ({
  page,
  context,
}) => {
  const portrait = { width: 402, height: 804 }
  const landscape = { width: 844, height: 390 }
  const openGallery = async (tab: Page, viewport: typeof portrait) => {
    await tab.setViewportSize(viewport)
    await tab.goto('/ramka/lightbox#ramka-photos-app')
    await expect(tab.locator('.reference-contract table').last()).toBeAttached()
    await tab.evaluate(() => document.fonts.ready.then(() => undefined))
  }
  const positions = (tab: Page) =>
    tab.getByRole('navigation', { name: 'Ramka example index' }).evaluate((index) => {
      const anchors = Array.from(index.querySelectorAll('a'), (link) => {
        const target = document.getElementById(link.hash.slice(1))
        if (!target) throw new Error(`Missing demo ${link.hash}`)
        return Math.round(target.getBoundingClientRect().top + window.scrollY)
      })
      const api = document.querySelector('[aria-label="API reference"]')
      if (!api) throw new Error('Missing API reference')
      return [...anchors, Math.round(api.getBoundingClientRect().height)]
    })

  await openGallery(page, portrait)
  const reference = await context.newPage()
  try {
    await openGallery(reference, landscape)
    await page.setViewportSize(landscape)
    await expect
      .poll(async () => {
        const expected = await positions(reference)
        const actual = await positions(page)
        return actual.length === 9 && expected.length === 9
          ? Math.max(...actual.map((position, index) => Math.abs(position - expected[index]!)))
          : Infinity
      })
      .toBeLessThanOrEqual(1)
  } finally {
    await reference.close()
  }
})
