import { expect, test, type Page } from '@playwright/test'

async function expectRootTheme(page: Page, theme: 'light' | 'dark') {
  const root = page.locator('html')
  await expect(root).toHaveClass(new RegExp(`\\b${theme}\\b`, 'u'))
  await expect(root).not.toHaveClass(theme === 'light' ? /\bdark\b/u : /\blight\b/u)
  await expect(root).toHaveCSS('color-scheme', theme)
  const foreground = theme === 'light' ? 'rgb(23, 23, 23)' : 'rgb(245, 245, 245)'
  await expect(root).toHaveCSS('color', foreground)
  await expect(page.locator('body')).toHaveCSS('color', foreground)
}

test('explicit and system themes own root colors across OS preferences', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/components/input?theme=light')
  const theme = page
    .locator('#site-customizer')
    .getByRole('combobox', { name: 'Theme', exact: true })
  await expect(theme).toContainText('Light')
  await expectRootTheme(page, 'light')
  const original = await page.evaluate(() => {
    const root = document.documentElement
    root.classList.add('root-theme-consumer')
    root.style.setProperty('--root-theme-consumer', 'preserved')
    return { lang: root.getAttribute('lang'), style: root.style.getPropertyValue('--fluid-accent') }
  })
  for (const choice of ['Dark', 'Light', 'System']) {
    await theme.click()
    await page.getByRole('option', { name: choice, exact: true }).click()
    await expect(theme).toContainText(choice)
    await expectRootTheme(page, choice === 'Light' ? 'light' : 'dark')
    await expect(page.locator('html')).toHaveClass(/\broot-theme-consumer\b/u)
    expect(await page.locator('html').getAttribute('lang')).toBe(original.lang)
    expect(
      await page.locator('html').evaluate((root) => root.style.getPropertyValue('--fluid-accent')),
    ).toBe(original.style)
    expect(
      await page
        .locator('html')
        .evaluate((root) => root.style.getPropertyValue('--root-theme-consumer')),
    ).toBe('preserved')
  }
  await page.emulateMedia({ colorScheme: 'light' })
  await expectRootTheme(page, 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expectRootTheme(page, 'dark')
  expect(
    await page
      .locator('html')
      .evaluate((root) => root.style.getPropertyValue('--root-theme-consumer')),
  ).toBe('preserved')
  await page.goto('/components/input?theme=dark')
  await expectRootTheme(page, 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/components/input?theme=light')
  await expectRootTheme(page, 'light')
})

test('head bootstrap owns explicit light root colors before hydration', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  const intercepted: string[] = []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.route('**/assets/app-*.js', async (route) => {
    intercepted.push(new URL(route.request().url()).pathname)
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  })
  const response = await page.goto('/?theme=light')
  expect(response?.ok()).toBe(true)
  const entry = page.locator('script[type="module"][src^="/assets/app-"]')
  await expect(entry).toHaveCount(1)
  expect(intercepted).toContain(await entry.getAttribute('src'))
  await expect(page.locator('.showcase-grid[data-live-previews="false"]')).toBeVisible()
  await expect(page.locator('[data-live-previews="true"]')).toHaveCount(0)
  await expectRootTheme(page, 'light')
  expect(errors).toEqual([])
})
