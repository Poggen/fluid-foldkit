import { expect, test, type Locator, type Page } from '@playwright/test'

const rootAccent = (page: Page) =>
  page
    .locator('html')
    .evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--fluid-accent').trim().toLowerCase(),
    )

const expectSwatchColor = async (swatch: Locator, color: string) => {
  await expect
    .poll(() =>
      swatch.evaluate((element, expected) => {
        const normalized = document.createElement('span')
        normalized.style.backgroundColor = expected
        return getComputedStyle(element).backgroundColor === normalized.style.backgroundColor
      }, color),
    )
    .toBe(true)
}

const expectSelection = async (
  page: Page,
  owner: 'desktop' | 'mobile',
  value: string,
  color: string,
) => {
  const control = page.locator(`#customize-${owner}-accent`)
  await expect(control.locator('select')).toHaveValue(value)
  await expectSwatchColor(
    control
      .getByRole('combobox', { name: 'Accent', exact: true })
      .locator('span.inline-block.relative.shrink-0.overflow-hidden > span'),
    color,
  )
}

const expectMobileSelection = async (page: Page, value: string, color: string) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#site-menu-button').click()
  await expectSelection(page, 'mobile', value, color)
  await page.keyboard.press('Escape')
  await expect(page.locator('#site-menu-button')).toHaveAttribute('aria-expanded', 'false')
  await page.setViewportSize({ width: 1440, height: 1000 })
}

test('custom samples keep both accent selections and swatches current through preset transitions and reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/?theme=light&accent=%2312AbEf80')
  const card = page.locator('[data-component="fluid/color-picker"]')
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveAttribute('data-deferred', 'false')
  const hex = card.getByRole('textbox', { name: 'Hex value', exact: true })
  await expectSelection(page, 'desktop', 'custom', '#12AbEf80')

  for (const color of ['#12345680', '#AbCdEf40']) {
    await hex.fill(color)
    await hex.press('Tab')
    await expect.poll(() => rootAccent(page)).toBe(color.toLowerCase())
    await expectSelection(page, 'desktop', 'custom', color)
    await expect
      .poll(() => new URL(page.url()).searchParams.get('accent')?.toLowerCase())
      .toBe(color.toLowerCase())
  }

  await hex.fill('#e7000b')
  await hex.press('Tab')
  await expectSelection(page, 'desktop', 'red', '#e7000b')
  await expect.poll(() => new URL(page.url()).searchParams.get('accent')).toBe('red')
  await expectMobileSelection(page, 'red', '#e7000b')

  await card.scrollIntoViewIfNeeded()
  await hex.fill('#A1B2C344')
  await hex.press('Tab')
  await expect.poll(() => rootAccent(page)).toBe('#a1b2c344')
  await expectSelection(page, 'desktop', 'custom', '#a1b2c344')
  await expect
    .poll(() => new URL(page.url()).searchParams.get('accent')?.toLowerCase())
    .toBe('#a1b2c344')
  await expectMobileSelection(page, 'custom', '#a1b2c344')

  await page.reload()
  await expectSelection(page, 'desktop', 'custom', '#a1b2c344')
  await expect.poll(() => rootAccent(page)).toBe('#a1b2c344')
})

for (const theme of ['light', 'dark', 'system']) {
  test(`open Accent menu keeps its custom swatch live during history changes in ${theme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/?theme=${theme}&accent=%2312abef80`)
    const card = page.locator('[data-component="fluid/color-picker"]')
    await card.scrollIntoViewIfNeeded()
    await expect(card).toHaveAttribute('data-deferred', 'false')
    const hex = card.getByRole('textbox', { name: 'Hex value', exact: true })
    await expectSelection(page, 'desktop', 'custom', '#12abef80')
    await page.evaluate(() => history.pushState(history.state, '', location.href))
    await hex.fill('#a1b2c344')
    await hex.press('Tab')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('accent')?.toLowerCase())
      .toBe('#a1b2c344')
    await page.locator('#customize-desktop-accent').getByRole('combobox').click()
    const menu = page.getByRole('listbox', { name: 'Accent', exact: true })
    const custom = menu.getByRole('option', { name: 'Custom', exact: true })
    const paint = custom.locator('span.inline-block.relative.shrink-0.overflow-hidden > span')
    await expectSwatchColor(paint, '#a1b2c344')

    await page.goBack()
    await expect(menu).toBeVisible()
    await expect(custom).toHaveAttribute('aria-selected', 'true')
    await expectSelection(page, 'desktop', 'custom', '#12abef80')
    await expectSwatchColor(paint, '#12abef80')
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
  })
}
