import { expect, test, type Page } from '@playwright/test'

const queryValue = (page: Page, name: string) => new URL(page.url()).searchParams.get(name)

for (const viewport of [
  { width: 1440, height: 1000, owner: 'desktop' },
  { width: 390, height: 844, owner: 'mobile' },
]) {
  test(`custom font metadata and weight selection stay current after accent updates on ${viewport.owner}`, async ({
    page,
  }) => {
    // Keep the bundled catalogue and its asynchronous delivery real.
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
    )
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/?font=custom&family=Playfair+Display&weight=400&accent=%2312abef80')
    const site = page.locator('[data-app="visuals"]')
    const hero = page.locator('h1').filter({ hasText: 'Fluid Functionalism' })
    await expect(site).toHaveAttribute('data-font', 'custom')
    await expect(hero).toHaveCSS('font-weight', '400')

    // The initial Weight model contains only 400; 700 arrives through PrepareFont.
    await expect(page.locator('#customize-desktop-weight select option[value="700"]')).toHaveCount(
      1,
    )
    const card = page.locator('[data-component="fluid/color-picker"]')
    await card.scrollIntoViewIfNeeded()
    await expect(card).toHaveAttribute('data-deferred', 'false')
    const hex = card.getByRole('textbox', { name: 'Hex value', exact: true })
    await page.evaluate(() => history.pushState(history.state, '', location.href))
    for (const color of ['#12345680', '#a1b2c344']) {
      await hex.fill(color)
      await hex.press('Tab')
      await expect.poll(() => queryValue(page, 'accent')).toBe(color)
    }

    if (viewport.owner === 'mobile')
      await page.getByRole('button', { name: 'Pages', exact: true }).click()
    const preferences =
      viewport.owner === 'mobile'
        ? page.getByRole('dialog', { name: 'Pages', exact: true })
        : page.locator('#site-customizer [data-customizer-content]')
    const weight = preferences.getByRole('combobox', { name: 'Heading weight', exact: true })
    const font = preferences.getByRole('combobox', { name: 'Heading font', exact: true })
    const nativeWeight = page.locator(`#customize-${viewport.owner}-weight select`)
    const nativeFont = page.locator(`#customize-${viewport.owner}-font select`)

    await weight.click()
    const weights = page.getByRole('listbox', { name: 'Heading weight', exact: true })
    await expect(weights.getByRole('option', { name: 'Bold 700', exact: true })).toBeVisible()
    await page.goBack()
    await expect.poll(() => queryValue(page, 'accent')).toBe('#12abef80')
    await expect(weights).toBeVisible()
    await page.goForward()
    await expect.poll(() => queryValue(page, 'accent')).toBe('#a1b2c344')
    await expect(weights).toBeVisible()
    await weights.getByRole('option', { name: 'Semibold 600', exact: true }).click()
    await expect(weights).toBeHidden()
    await expect(nativeWeight).toHaveValue('600')
    await expect(weight).toContainText('Semibold 600')
    await expect.poll(() => queryValue(page, 'weight')).toBe('600')
    await expect(site).toHaveCSS('--heading-weight', '600')
    await expect(hero).toHaveCSS('font-weight', '600')

    // Font stayed unchanged through Weight selection; its next action must still dispatch.
    await font.click()
    await page
      .getByRole('listbox', { name: 'Heading font', exact: true })
      .getByRole('option', { name: 'Browse Google Fonts…', exact: true })
      .click()
    const picker = page.getByRole('dialog', { name: 'Google Fonts', exact: true })
    await expect(picker).toBeVisible()
    await picker.getByPlaceholder(/Search [\d,]+ Google Fonts…/).fill('Fraunces')
    await picker.getByRole('option', { name: 'Fraunces', exact: true }).click()
    await expect(picker).toBeHidden()
    await expect(nativeFont).toHaveValue('custom')
    await expect(font).toContainText('Fraunces')
    await expect.poll(() => queryValue(page, 'family')).toBe('Fraunces')
    await expect.poll(() => queryValue(page, 'weight')).toBe('600')
    await expect(site).toHaveCSS('--heading-family', /Fraunces/)
    await expect(hero).toHaveCSS('font-family', /Fraunces/)

    // Fraunces supports 100; the previous family's catalogue range starts at 400.
    await expect(nativeWeight.locator('option[value="100"]')).toHaveCount(1)
    await weight.click()
    await weights.getByRole('option', { name: 'Thin 100', exact: true }).click()
    await expect(weights).toBeHidden()
    await expect(nativeWeight).toHaveValue('100')
    await expect.poll(() => queryValue(page, 'weight')).toBe('100')
    await expect(hero).toHaveCSS('font-weight', '100')
    await weight.click()
    await weights.getByRole('option', { name: 'Auto', exact: true }).click()
    await expect(weights).toBeHidden()
    await expect(nativeWeight).toHaveValue('auto')
    await expect(weight).toContainText('Auto')
    await expect.poll(() => queryValue(page, 'weight')).toBeNull()
    await expect(site).toHaveCSS('--heading-weight', '550')
    await expect(site).toHaveCSS('--heading-display-weight', '700')
    await expect(hero).not.toHaveCSS('font-weight', '100')
    await expect.poll(() => queryValue(page, 'accent')).toBe('#a1b2c344')
  })
}
