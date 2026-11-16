import { expect, test } from '@playwright/test'

for (const origin of ['desktop', 'mobile drawer', 'mobile shortcut'] as const) {
  test(`font browsing from the site menu restores focus to its ${origin} origin`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: origin === 'desktop' ? 1440 : 390, height: 1000 })
    await page.goto('/components/button?theme=light')
    await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
    const pages = page.getByRole('button', { name: 'Pages', exact: true })
    const drawer = page.getByRole('dialog', { name: 'Pages', exact: true })
    const trigger =
      origin === 'desktop'
        ? page.locator('#site-navigation').getByRole('button', { name: 'Search', exact: true })
        : origin === 'mobile drawer'
          ? drawer.getByRole('button', { name: 'Search', exact: true })
          : pages
    if (origin === 'mobile drawer') await pages.click()
    if (origin === 'mobile shortcut') await page.keyboard.press('ControlOrMeta+k')
    else await trigger.click()
    const menu = page.getByRole('dialog', { name: 'Site menu', exact: true })
    await menu.getByRole('combobox').fill('Google Fonts')
    await menu.getByRole('option', { name: 'Browse Google Fonts…', exact: true }).click()
    const fonts = page.getByRole('dialog', { name: 'Google Fonts', exact: true })
    await expect(fonts).toBeVisible()
    await expect(menu).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(fonts).toBeHidden()
    await expect(trigger).toBeFocused()
  })
}
