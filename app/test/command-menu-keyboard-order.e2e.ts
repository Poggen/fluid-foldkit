import { expect, test } from '@playwright/test'

test('global search commits the latest keyboard selection before its DOM highlight catches up', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/components/button')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  await page
    .locator('#site-navigation')
    .getByRole('button', { name: 'Search', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Site menu', exact: true })
  await expect(dialog).toBeVisible()
  const input = dialog.getByRole('combobox')
  const options = dialog.getByRole('option').filter({ visible: true })
  await expect(options.first()).toBeVisible()
  const rows = await options.evaluateAll((elements) =>
    elements
      .filter((element) => element.getAttribute('aria-disabled') !== 'true')
      .map((element) => ({ id: element.id, route: element.getAttribute('data-command-value') })),
  )
  const [first, next] = rows
  if (!first || !next || !next.route?.startsWith('/') || first.route === next.route) {
    throw new Error('Expected two distinct enabled Search routes')
  }
  await input.press('Home')
  await expect(input).toHaveAttribute('aria-activedescendant', first.id)
  await input.press('ArrowDown')
  await input.press('Enter')
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(new URL(next.route, page.url()).pathname)
  expect(errors).toEqual([])
})
