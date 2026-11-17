import { expect, test } from '@playwright/test'
import { defaults } from '../src/playground/configs/card'

const cardUrl = (overrides: Partial<typeof defaults>) =>
  `/components/card?props=${encodeURIComponent(JSON.stringify({ ...defaults, ...overrides }))}`

test('inline Card image remains square as inherited size and radius change', async ({ page }) => {
  for (const [size, shape] of [
    ['default', 'sharp'],
    ['compact', 'rounded'],
    ['default', 'pill'],
  ] as const) {
    await page.goto(
      cardUrl({ cardOrientation: 'inline', media: 'image', appearance: { size, shape } }),
    )
    const group = page.locator('[data-slot="card-group"]').first()
    await expect(group).toHaveAttribute('data-orientation', 'inline')
    const image = group.locator('[data-slot="card-image"]').first()
    await expect(image).toBeVisible()
    await expect(image).toHaveCSS('width', '160px')
    await expect(image).toHaveCSS('height', '160px')
    const header = group.locator('[data-slot="card-header"]').first()
    await expect.poll(async () => (await header.boundingBox())?.width ?? 0).toBeGreaterThan(100)
  }
})

test('Card selection clamps to the last visible item when three columns become two', async ({
  page,
}) => {
  await page.goto(cardUrl({ columns: 3, selected: true }))
  const group = page.locator('[data-slot="card-group"]').first()
  await group.getByRole('button', { name: 'Drop-in registry', exact: true }).click()
  await expect(group.locator('[data-selected="true"]')).toContainText('Drop-in registry')
  await page.getByRole('combobox', { name: 'Columns', exact: true }).click()
  await page.getByRole('option', { name: '2', exact: true }).click()
  await expect(group.locator('[data-slot="card"]')).toHaveCount(4)
  await expect(group.locator('[data-selected="true"]')).toContainText('Dark mode ready')
})
