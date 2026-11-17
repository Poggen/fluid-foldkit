import { expect, test } from '@playwright/test'

for (const name of ['Bordered', 'Borderless']) {
  test(`${name} Select holds active background until the popup closes`, async ({ page }) => {
    await page.goto('/components/select')
    const trigger = page
      .getByRole('region', { name: 'Variants', exact: true })
      .getByRole('combobox', { name, exact: true })
    await expect(trigger).toBeVisible()
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('heading', { name: 'Select', exact: true }).hover()
    const activeColor = await page.evaluate(() => {
      const swatch = document.createElement('span')
      swatch.style.backgroundColor = 'var(--active)'
      document.body.append(swatch)
      const color = getComputedStyle(swatch).backgroundColor
      swatch.remove()
      return color
    })
    await expect(trigger).toHaveCSS('background-color', activeColor)
    await page.keyboard.press('Escape')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  })
}
