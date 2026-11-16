import { expect, test } from '@playwright/test'

test('scrolled sample inspection stays in the viewport above page motion and leaves the demo live', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 640 })
  await page.goto('/components/switch')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const sample = page.getByRole('region', { name: 'Basic', exact: true })
  const inspect = sample.getByRole('switch', { name: 'Inspect', exact: true })
  const notifications = sample.getByRole('switch', { name: 'Notifications', exact: true })
  const status = sample.getByRole('status')
  await notifications.scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await expect(status).toHaveCount(0)
  await inspect.click()
  await notifications.focus()
  await expect(status).toContainText('[switch]')
  await expect
    .poll(() =>
      status.evaluate((node) => {
        const bounds = node.getBoundingClientRect()
        return (
          bounds.top >= 0 &&
          bounds.left >= 0 &&
          bounds.bottom <= innerHeight &&
          bounds.right <= innerWidth
        )
      }),
    )
    .toBe(true)
  const before = await notifications.getAttribute('aria-checked')
  await notifications.press('Space')
  await expect(notifications).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
  await page.mouse.wheel(0, 120)
  await expect
    .poll(() => status.evaluate((node) => node.getBoundingClientRect().bottom <= innerHeight))
    .toBe(true)
  await inspect.click()
  await expect(status).toHaveCount(0)
  await notifications.focus()
  await expect(status).toHaveCount(0)
})

test('enabling inspection measures an already focused preview element', async ({ page }) => {
  await page.goto('/components/switch')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const sample = page.getByRole('region', { name: 'Basic', exact: true })
  const notifications = sample.getByRole('switch', { name: 'Notifications', exact: true })
  const inspect = sample.getByRole('switch', { name: 'Inspect', exact: true })
  await notifications.focus()
  await inspect.evaluate((node: HTMLElement) => node.click())
  await expect(inspect).toHaveAttribute('aria-checked', 'true')
  await expect(notifications).toBeFocused()
  await expect(sample.getByRole('status')).toContainText('[switch]')
})
