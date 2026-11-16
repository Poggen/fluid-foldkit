import { expect, test } from '@playwright/test'

test('sidebar gallery retains static branding and native search, actions and user menu', async ({
  page,
}) => {
  const errors: Array<string> = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const preview = page.locator('[data-component="fluid/sidebar"]')
  await preview.scrollIntoViewIfNeeded()
  await expect(preview.getByText('Acme Inc', { exact: true })).toBeVisible()
  await expect(preview.getByRole('button', { name: /Acme Inc/ })).toHaveCount(0)
  await expect(preview.getByRole('button', { name: 'Switch workspace' })).toHaveCount(0)

  const search = preview.getByRole('textbox', { name: 'Search threads' })
  const searchShortcut = preview.locator('kbd').filter({ hasText: '⌘K' })
  await page.mouse.move(0, 0)
  await expect(searchShortcut).toHaveCSS('opacity', '0')
  await search.fill('Keep my draft')
  await expect(searchShortcut).toHaveCSS('opacity', '1')
  await expect(search).toHaveValue('Keep my draft')
  await page.keyboard.press('Tab')
  const action = preview
    .getByRole('navigation', { name: 'Actions', exact: true })
    .getByRole('button', { name: /New thread/ })
  await expect(action).toBeFocused()
  await expect(action.locator('kbd').locator('..')).toHaveCSS('opacity', '1')
  await page.keyboard.press('Enter')
  await expect(search).toHaveValue('Keep my draft')

  const user = preview.getByRole('button', { name: 'Open user menu', exact: true })
  await user.click()
  await expect(user).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('menuitem', { name: 'Profile', exact: true })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Log out', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(user).toBeFocused()
  await expect(user).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('menuitem', { name: 'Profile', exact: true })).toBeHidden()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Profile', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Settings', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(user).toBeFocused()
  await expect(search).toHaveValue('Keep my draft')
  expect(errors).toEqual([])
})
