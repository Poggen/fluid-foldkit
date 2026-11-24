import { expect, test, type Locator } from '@playwright/test'

const expectParked = async (dialog: Locator) => {
  await expect(dialog).toBeAttached()
  await expect(dialog).toBeHidden()
  await expect(dialog).toHaveAttribute('aria-hidden', 'true')
  await expect(dialog).toHaveJSProperty('inert', true)
  await expect(dialog.locator('[data-ramka-slide]')).toHaveCount(48)
  await expect(dialog.locator('[data-ramka-item] img')).toHaveCount(0)
}

test.describe('server-painted Photos viewer', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 402, height: 804 } })

  test('parks an inaccessible viewer without full-size photo elements', async ({ page }) => {
    await page.goto('/ramka/lightbox#ramka-photos-app')
    await expect(
      page.getByRole('navigation', { name: 'Ramka example index' }).getByRole('link'),
    ).toHaveCount(8)
    await expect(page.locator('#ramka-photos-app button[data-ramka-trigger]')).toHaveCount(48)
    await expectParked(page.locator('#upstream-photos-app-content'))
    await expect(page.locator('#upstream-photos-app-rtl-content')).toHaveCount(0)
    await expect(page.locator('#upstream-infinite-scroll-content')).toHaveCount(0)
  })
})

test('Photos releases closed media and restores the complete window when reopened', async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 804 })
  await page.goto('/ramka/lightbox#ramka-photos-app')
  const dialog = page.locator('#upstream-photos-app-content')
  const triggers = page.locator('#ramka-photos-app button[data-ramka-trigger]')
  await expectParked(dialog)
  const mounted = await dialog.elementHandle()
  if (!mounted) throw new Error('Missing parked Photos viewer')

  for (const { index, mediaWindow } of [
    { index: 0, mediaWindow: ['0', '1', '2', '3', '45', '46', '47'] },
    { index: 10, mediaWindow: ['7', '8', '9', '10', '11', '12', '13'] },
  ]) {
    const trigger = triggers.nth(index)
    const alt = await trigger.locator('img').getAttribute('alt')
    await trigger.click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveJSProperty('inert', false)
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog).toBeFocused()
    await expect(page.locator('html')).not.toHaveAttribute('data-ramka-view-transition')
    await expect
      .poll(() =>
        dialog
          .locator('[data-ramka-item]')
          .evaluateAll((items) => items.map((item) => item.getAttribute('data-index'))),
      )
      .toEqual(mediaWindow)
    const active = dialog.locator('[data-ramka-item][data-active]')
    await expect(active).toHaveAttribute('data-index', String(index))
    await expect(active.locator('img')).toBeVisible()
    await expect(active.locator('img')).toHaveAttribute('alt', alt ?? '')
    await expect
      .poll(() => active.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0)
    await page.keyboard.press('Escape')
    await expect(page.locator('html')).not.toHaveAttribute('data-ramka-view-transition')
    await expectParked(dialog)
    await expect(trigger).toBeFocused()
    expect(await mounted.evaluate((element) => element.isConnected)).toBe(true)
  }
})
