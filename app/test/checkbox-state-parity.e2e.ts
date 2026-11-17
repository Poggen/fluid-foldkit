import { expect, test } from '@playwright/test'
import { defaults } from '../src/playground/configs/checkbox'

test('public playground configuration exposes and accepts mixed state', async ({ page }) => {
  await page.goto(
    `/components/checkbox?props=${encodeURIComponent(JSON.stringify({ ...defaults, checked: true, indeterminate: true }))}`,
  )
  const checkbox = page.locator('#preview-checkbox')
  await expect(checkbox).toHaveAttribute('aria-checked', 'mixed')
  await expect(checkbox.locator('path')).toHaveAttribute('d', 'M7 12H17')
  await expect(page.getByRole('switch', { name: 'Indeterminate', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await checkbox.click()
  await expect(checkbox).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('switch', { name: 'Indeterminate', exact: true })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await page.getByRole('switch', { name: 'Indeterminate', exact: true }).click()
  await expect(checkbox).toHaveAttribute('aria-checked', 'mixed')
})
