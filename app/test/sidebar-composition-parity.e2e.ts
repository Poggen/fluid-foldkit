import { expect, test } from '@playwright/test'
import { defaults } from '../src/playground/configs/sidebar'

for (const primary of ['threads', 'menu'] as const) {
  test(`Sidebar ${primary} sections partition rows and retain native workspace navigation`, async ({
    page,
  }) => {
    await page.goto(
      `/components/sidebar?props=${encodeURIComponent(JSON.stringify({ ...defaults, l1Primary: primary }))}`,
    )
    const preview = page.getByRole('region', { name: 'Playground', exact: true })
    const groups = preview.locator('[data-sidebar="group"]')
    await expect(groups).toHaveCount(2)
    await expect(groups.nth(0).locator('[data-sidebar="menu-button"]')).toHaveCount(3)
    await expect(groups.nth(1).locator('[data-sidebar="menu-button"]')).toHaveCount(2)
    const labels = await preview
      .getByRole('navigation', { name: 'Threads', exact: true })
      .locator('[data-sidebar="menu-button"]')
      .allTextContents()
    expect(new Set(labels).size).toBe(5)
    const switcher = preview.getByRole('button', { name: 'Switch workspace', exact: true })
    await switcher.scrollIntoViewIfNeeded()
    await switcher.click()
    await expect(
      page.getByRole('menuitemradio', { name: 'Acme Inc', exact: true }),
    ).toHaveAttribute('aria-checked', 'true')
    for (const label of ['Fluid Labs', 'Personal', 'New workspace']) {
      await expect(page.getByRole('menuitem', { name: label, exact: true })).toBeVisible()
    }
    await page.keyboard.press('Escape')
    await expect(switcher).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menuitemradio', { name: 'Acme Inc', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: 'Fluid Labs', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(switcher).toHaveAttribute('aria-expanded', 'false')
    await expect(switcher).toBeFocused()
  })
}

test('Sidebar loading matches four skeletons in each original section', async ({ page }) => {
  await page.goto(
    `/components/sidebar?props=${encodeURIComponent(JSON.stringify({ ...defaults, state: 'loading' }))}`,
  )
  const groups = page
    .getByRole('region', { name: 'Playground', exact: true })
    .locator('[data-sidebar="group"]')
  await expect(groups).toHaveCount(2)
  for (const group of await groups.all()) {
    await expect(group.locator('[data-sidebar="menu-skeleton"]')).toHaveCount(4)
  }
})
