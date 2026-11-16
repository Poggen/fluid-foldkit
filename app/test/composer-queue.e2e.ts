import { expect, test } from '@playwright/test'

test('playground queue mounts, reorders and restores a queued draft', async ({ page }) => {
  const crashes: Array<string> = []
  page.on('pageerror', (error) => crashes.push(error.message))
  await page.goto('/components/input-message', { waitUntil: 'domcontentloaded' })
  const preview = page.getByRole('region', { name: 'Playground', exact: true })
  const composer = preview.getByRole('textbox', { name: 'Try the message composer', exact: true })
  await expect(composer).toBeVisible()
  await page
    .getByRole('complementary', { name: 'InputMessage props' })
    .getByRole('combobox', { name: 'Status', exact: true })
    .click()
  await page.getByRole('option', { name: 'Streaming', exact: true }).click()
  for (const draft of ['First queued draft', 'Second queued draft']) {
    await composer.fill(draft)
    await preview.getByRole('button', { name: 'Queue message', exact: true }).click()
    await expect(composer).toHaveValue('')
  }
  const rows = preview.locator('[data-fluid-reorder-item]')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('First queued draft')
  await rows.first().press('Alt+ArrowDown')
  await expect(rows.first()).toContainText('Second queued draft')
  await rows.first().press('F2')
  await expect(composer).toHaveValue('Second queued draft')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('First queued draft')
  expect(crashes).toEqual([])
})
