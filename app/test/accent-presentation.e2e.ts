import { expect, test } from '@playwright/test'

for (const path of ['/components/button', '/components/button?embed=1']) {
  test(`renders custom accent before hydration at ${path}`, async ({ browser, baseURL }) => {
    if (baseURL === undefined) throw new Error('Expected a showcase base URL')
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
      const page = await context.newPage()
      await page.goto(`${path}${path.includes('?') ? '&' : '?'}theme=light&accent=%2312abef`)
      await expect(page.locator('style[data-accent-styles]')).toHaveCount(1)
      await expect(page.locator('html')).toHaveCSS('--fluid-accent', '#12abef')
      expect(
        await page
          .locator('html')
          .evaluate((element) => element.style.getPropertyValue('--fluid-accent')),
      ).toBe('')
    } finally {
      await context.close()
    }
  })
}

for (const scheme of ['light', 'dark'] as const) {
  test(`resolves system accent before hydration in ${scheme}`, async ({ browser, baseURL }) => {
    if (baseURL === undefined) throw new Error('Expected a showcase base URL')
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme: scheme,
      baseURL,
    })
    try {
      const page = await context.newPage()
      await page.goto('/components/button?embed=1&accent=green')
      expect(await page.locator('style[data-accent-styles]').textContent()).toContain(
        'light-dark(#00A63E,#05DF72)',
      )
      const color = await page.evaluate(() => {
        const probe = document.createElement('span')
        probe.style.color = 'var(--fluid-accent)'
        document.body.append(probe)
        const result = getComputedStyle(probe).color
        probe.remove()
        return result
      })
      expect(color).toBe(scheme === 'light' ? 'rgb(0, 166, 62)' : 'rgb(5, 223, 114)')
    } finally {
      await context.close()
    }
  })
}

test('keeps one live accent owner across theme changes, nested light scopes and body portals', async ({
  page,
}) => {
  await page.goto('/?theme=light&accent=%2312abef')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const style = await page.locator('style[data-accent-styles]').elementHandle()
  expect(style).not.toBeNull()
  await expect(page.locator('.site.light')).toHaveCSS('--fluid-accent', '#12abef')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Site menu', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveCSS('--fluid-accent', '#12abef')
  expect(await dialog.evaluate((element) => element.closest('.site') === null)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await page
    .locator('#site-customizer')
    .getByRole('combobox', { name: 'Theme', exact: true })
    .click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
  await expect(page.locator('html')).toHaveCSS('--fluid-accent', '#12abef')
  const nested = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.className = 'light'
    probe.style.color = 'var(--fluid-accent)'
    document.body.append(probe)
    const result = getComputedStyle(probe).color
    probe.remove()
    return result
  })
  expect(nested).toBe('rgb(18, 171, 239)')
  await expect(page.locator('style[data-accent-styles]')).toHaveCount(1)
  expect(
    await style?.evaluate(
      (element) => element === document.querySelector('style[data-accent-styles]'),
    ),
  ).toBe(true)
  expect(
    await page
      .locator('html')
      .evaluate((element) => element.style.getPropertyValue('--fluid-accent')),
  ).toBe('')
})
