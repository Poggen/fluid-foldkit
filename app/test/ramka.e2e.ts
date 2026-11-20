import { expect, test } from '@playwright/test'

test('opens Ramka from its reference page and releases the dialog before navigation', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/ramka/lightbox')
  await expect(page.getByRole('heading', { name: 'Ramka Lightbox', level: 1 })).toBeVisible()
  const trigger = page.getByRole('button', { name: 'Open image 1', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Ramka image gallery' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-ramka-caption]')).toHaveText('Purple landscape')
  await expect(page.locator('html')).not.toHaveAttribute('data-ramka-view-transition')
  await dialog.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(dialog.locator('[data-ramka-caption]')).toHaveText('Green landscape')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.locator('html')).not.toHaveAttribute('data-ramka-view-transition')
  await expect(page.getByRole('button', { name: 'Open image 2', exact: true })).toBeFocused()
  await page
    .locator('#site-navigation')
    .getByRole('link', { name: 'Installation', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible()
  await expect(page.locator('[data-ramka-content][open]')).toHaveCount(0)
  expect(errors).toEqual([])
})
