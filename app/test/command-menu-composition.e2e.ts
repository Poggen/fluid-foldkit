import { expect, test } from '@playwright/test'

test('command menu retires its dialog before restoring shared inline controls', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/components/command-menu')
  const preview = page.locator('.reference-preview')
  const props = page.getByRole('complementary', { name: 'CommandMenu props' })
  await expect(preview.getByRole('tab', { name: 'All', exact: true })).toBeVisible()
  await props.getByRole('switch', { name: 'Filters', exact: true }).click()
  await expect(preview.getByRole('combobox', { name: 'Filter commands' })).toBeVisible()
  const dialog = page.getByRole('dialog', { name: 'Command menu', exact: true })

  for (let cycle = 0; cycle < 2; cycle++) {
    await page.keyboard.press('ControlOrMeta+k')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('tab', { name: 'All', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(preview.getByRole('tab', { name: 'All', exact: true })).toBeVisible()
    await preview.getByRole('tab', { name: 'Actions', exact: true }).click()
    await expect(preview.getByRole('tab', { name: 'Actions', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await preview.getByRole('tab', { name: 'All', exact: true }).click()
    const input = preview.locator('input').first()
    await input.fill('search')
    await expect(input).toHaveValue('search')
    await input.clear()
    await expect(preview.getByRole('combobox', { name: 'Filter commands' })).toBeEnabled()
    expect(errors).toEqual([])
  }
})
