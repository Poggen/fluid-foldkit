import { expect, test } from '@playwright/test'

test('field playground associates current messages and sizes every part together', async ({
  page,
}) => {
  await page.goto('/components/field')
  const preview = page.getByRole('region', { name: 'Playground', exact: true })
  const input = preview.getByRole('textbox', { name: 'Your name', exact: true })
  await expect(input).toHaveAccessibleName('Your name')
  await expect(input).toHaveAccessibleDescription('A quiet place for your best work.')
  await page.getByRole('switch', { name: 'Invalid', exact: true }).click()
  await expect(input).toHaveAccessibleDescription(
    'A quiet place for your best work. This field needs your attention.',
  )
  await page.getByRole('combobox', { name: 'Size', exact: true }).last().click()
  await page.getByRole('option', { name: 'Compact', exact: true }).click()
  await expect(preview.locator('[data-slot=field-description]')).toHaveCSS('font-size', '11px')
  await expect(preview.locator('[data-slot=field-error]')).toHaveCSS('font-size', '11px')
  await page.getByRole('switch', { name: 'Show description', exact: true }).click()
  await expect(input).toHaveAccessibleDescription('This field needs your attention.')
  await page.getByRole('switch', { name: 'Invalid', exact: true }).click()
  await expect(input).toHaveAccessibleDescription('')
})

test('empty field errors do not leave unresolved description ids', async ({ page }) => {
  await page.goto('/components/field')
  const preview = page.getByRole('region', { name: 'Playground', exact: true })
  const input = preview.getByRole('textbox', { name: 'Your name', exact: true })
  await page.getByRole('switch', { name: 'Invalid', exact: true }).click()
  await page.getByRole('textbox', { name: 'Error', exact: true }).fill('')
  await expect(preview.locator('[data-slot=field-error]')).toHaveCount(0)
  await expect(input).toHaveAttribute('aria-describedby', 'preview-field-input-description')
  await page.getByRole('switch', { name: 'Show description', exact: true }).click()
  await expect(input).not.toHaveAttribute('aria-describedby', /./)
})
