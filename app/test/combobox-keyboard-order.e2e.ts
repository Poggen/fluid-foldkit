import { expect, test } from '@playwright/test'

test('mobile combobox accepts rapid keyboard selection', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 1000 })
  await page.goto('/components/combobox')
  const input = page.getByRole('region', { name: 'Basic', exact: true }).getByRole('combobox')
  await input.fill('svel')
  await expect(page.getByRole('option', { name: 'SvelteKit', exact: true })).toBeVisible()
  await input.press('ArrowDown')
  await input.press('Enter')
  await expect(input).toHaveValue('SvelteKit')
  await expect(input).toHaveAttribute('aria-expanded', 'false')
  expect(errors).toEqual([])
})
