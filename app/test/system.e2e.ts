import { expect, test } from '@playwright/test'

test('nested surface role picker retains the dialog and restores focus through Escape', async ({
  page,
}) => {
  await page.goto('/surfaces?theme=light&shape=rounded', { waitUntil: 'domcontentloaded' })
  const trigger = page.getByRole('button', { name: 'Invite to your workspace', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Invite to your workspace', exact: true })
  const role = dialog.getByRole('combobox', { name: 'Workspace role', exact: true })
  await role.click()
  await page.getByRole('option', { name: 'Administrator', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(role).toContainText('Administrator')
  await role.click()
  await page.keyboard.press('Escape')
  await expect(role).toHaveAttribute('aria-expanded', 'false')
  await expect(dialog).toBeVisible()
  await expect(role).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('mobile Typography keeps its wide scale table locally scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/typography?theme=dark&shape=sharp', { waitUntil: 'domcontentloaded' })
  const tableRegion = page.getByRole('region', { name: 'Typography scale table', exact: true })
  await expect(tableRegion).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await tableRegion.focus()
  await tableRegion.press('ArrowRight')
  await expect.poll(() => tableRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
})
