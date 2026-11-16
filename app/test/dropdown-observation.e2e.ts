import { expect, test } from '@playwright/test'

test('Select typeahead uses current ancestor visibility before a mutation checkpoint', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/components/select')
  await page.addStyleTag({
    content: `
      html[data-dropdown-test-hide-profile] [data-fluid-dropdown-panel] [data-label="Profile"] {
        visibility: hidden !important;
      }
    `,
  })
  const group = page.getByRole('region', { name: 'Groups', exact: true })
  const trigger = group.getByRole('combobox')
  const nativeSelect = group.locator('select')
  const menu = page.getByRole('listbox', { name: 'Options', exact: true })

  await trigger.click()
  await expect(menu).toBeFocused()
  await expect(menu.getByRole('option', { name: 'Profile', exact: true })).toBeVisible()
  await menu.evaluate((panel) => {
    document.documentElement.setAttribute('data-dropdown-test-hide-profile', '')
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }))
  })
  await expect(menu.getByRole('option', { name: 'Privacy', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(menu).toBeHidden()
  await expect(nativeSelect).toHaveValue('privacy')
  await expect(trigger).toContainText('Privacy')

  await trigger.click()
  await expect(menu.getByRole('option', { name: 'Privacy', exact: true })).toBeFocused()
  await menu.evaluate((panel) => {
    if (!(panel instanceof HTMLElement)) throw new Error('Expected an HTML Select panel')
    panel.focus()
    document.documentElement.removeAttribute('data-dropdown-test-hide-profile')
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }))
  })
  await expect(menu.getByRole('option', { name: 'Profile', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(menu).toBeHidden()
  await expect(nativeSelect).toHaveValue('profile')
  await expect(trigger).toContainText('Profile')
})
