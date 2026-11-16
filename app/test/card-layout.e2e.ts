import { expect, test } from '@playwright/test'

test('landing Card preserves its source width cap in wide and narrow containers', async ({
  page,
}) => {
  await page.goto('/')
  const demo = page.locator('[data-component="fluid/card"]')
  await demo.scrollIntoViewIfNeeded()
  const container = demo.locator('..')
  await expect(container).toHaveClass(/\bpreview-reveal\b/u)
  const group = demo.locator('[data-slot="card-group"]')
  await expect(group).toBeVisible()
  // Source cards fill this flex wrapper; their own width is a preferred flex size.
  for (const width of [720, 320]) {
    await container.evaluate((element, value) => {
      element.style.width = `${value}px`
      element.style.minWidth = `${value}px`
      element.style.maxWidth = 'none'
    }, width)
    await expect(container).toHaveCSS('width', `${width}px`)
    await expect.poll(async () => (await container.boundingBox())?.width).toBe(width)
    if (width === 720) await expect(group).toHaveCSS('width', '520px')
    else {
      await expect.poll(async () => (await group.boundingBox())?.width ?? 0).toBeGreaterThan(200)
      await expect
        .poll(async () => (await group.boundingBox())?.width ?? Infinity)
        .toBeLessThanOrEqual(width)
    }
  }
})
