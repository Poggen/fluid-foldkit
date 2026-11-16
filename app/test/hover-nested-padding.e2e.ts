import { expect, test } from '@playwright/test'

test('nested hover rows retain their indentation beside top-level rows', async ({ page }) => {
  await page.goto('/fluid-hover')
  const section = page.locator('#when-to-split-a-list')
  await expect(section.getByRole('button', { name: 'Team', exact: true })).toHaveCSS(
    'padding-inline-start',
    '12px',
  )
  for (const name of ['Design', 'Engineering']) {
    await expect(section.getByRole('button', { name, exact: true })).toHaveCSS(
      'padding-inline-start',
      '32px',
    )
  }
})
