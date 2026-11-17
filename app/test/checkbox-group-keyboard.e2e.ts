import { expect, test } from '@playwright/test'

test('checkbox groups acknowledge keyboard and pointer changes in docs and Playground', async ({
  page,
}) => {
  await page.goto('/components/checkbox-group')
  const docs = page.getByRole('region', { name: 'Basic', exact: true })
  const apples = docs.getByRole('checkbox', { name: 'Apples', exact: true })
  const bananas = docs.getByRole('checkbox', { name: 'Bananas', exact: true })
  await apples.focus()
  await apples.press('Space')
  await expect(apples).not.toBeChecked()
  await apples.press('ArrowDown')
  await expect(bananas).toBeFocused()
  await bananas.press('Enter')
  await expect(bananas).toBeChecked()
  await bananas.click()
  await expect(bananas).not.toBeChecked()
  const preview = page.getByRole('region', { name: 'Playground', exact: true })
  const design = preview.getByRole('checkbox', { name: 'Design', exact: true })
  await expect(design).not.toBeChecked()
  await expect(preview.getByRole('checkbox', { name: 'Engineering', exact: true })).toBeChecked()
  await expect(preview.getByRole('checkbox', { name: 'Product', exact: true })).toBeChecked()
  await design.press('Space')
  await expect(design).toBeChecked()
  await design.click()
  await expect(design).not.toBeChecked()
})

test('checkbox group count changes discard removed checks and their backgrounds', async ({
  page,
}) => {
  await page.goto('/components/checkbox-group')
  const preview = page.getByRole('region', { name: 'Playground', exact: true })
  const count = page.getByRole('spinbutton', { name: 'Count', exact: true })
  await expect(preview.getByRole('checkbox')).toHaveCount(3)
  await expect(preview.getByRole('checkbox', { name: 'Engineering', exact: true })).toBeChecked()
  await count.fill('1')
  await count.press('Tab')
  await expect(preview.getByRole('checkbox')).toHaveCount(1)
  await count.fill('3')
  await count.press('Tab')
  await expect(preview.getByRole('checkbox')).toHaveCount(3)
  for (const name of ['Design', 'Engineering', 'Product']) {
    await expect(preview.getByRole('checkbox', { name, exact: true })).not.toBeChecked()
  }
  await expect(preview.locator('#preview-checks-selection > .bg-active')).toHaveCount(0)
})
