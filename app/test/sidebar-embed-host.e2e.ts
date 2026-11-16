import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`direct Sidebar embed fills its host and retains native interactions at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize(viewport)
    await page.goto('/components/sidebar?embed=1&size=compact&shape=rounded')
    const sidebar = page.locator('.embedded-preview [class~="group/sidebar-wrapper"]')
    const panel = sidebar.locator('[data-slot="sidebar"]')
    const search = sidebar.getByRole('textbox', { name: 'Search threads', exact: true })
    const toggle = sidebar.getByRole('button', { name: 'Toggle sidebar', exact: true })
    const user = sidebar.getByRole('button', { name: 'Open user menu', exact: true })
    const thread = sidebar
      .getByRole('button', { name: 'Sidebar component height in demo', exact: true })
      .first()

    await expect(sidebar).toHaveCount(1)
    await expect
      .poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThan(viewport.height * 0.8)
    await expect
      .poll(() => panel.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThan(viewport.height * 0.8)
    await expect(panel).toBeInViewport({ ratio: 0.9 })
    await expect(search).toBeInViewport({ ratio: 0.99 })
    await expect(thread).toBeInViewport({ ratio: 0.99 })
    await search.fill('sidebar')
    const retainedSearch = await search.elementHandle()
    if (retainedSearch === null) throw new Error('Missing embedded Sidebar search')
    try {
      await user.click()
      await expect(user).toHaveAttribute('aria-expanded', 'true')
      for (const name of ['Profile', 'Settings', 'Log out']) {
        const item = page.getByRole('menuitem', { name, exact: true })
        await expect(item).toBeVisible()
        await expect(item).toBeInViewport()
      }
      await page.keyboard.press('Escape')
      await expect(user).toHaveAttribute('aria-expanded', 'false')
      await expect(user).toBeFocused()
      await expect(page.getByRole('menuitem', { name: 'Profile', exact: true })).toBeHidden()

      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await expect(search).toHaveValue('sidebar')
      expect(
        await search.evaluate((element, previous) => element === previous, retainedSearch),
      ).toBe(true)
      await expect(panel).toBeInViewport({ ratio: 0.9 })
      await expect(search).toBeInViewport({ ratio: 0.99 })
      await expect(thread).toBeInViewport({ ratio: 0.99 })
      await expect(user).toBeInViewport({ ratio: 0.99 })
      expect(errors).toEqual([])
    } finally {
      await retainedSearch.dispose()
    }
  })
}
