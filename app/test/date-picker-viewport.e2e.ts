import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

const props = encodeURIComponent(
  JSON.stringify({ numberOfMonths: 1, time: 'none', variant: 'outline' }),
)
const singleMonth = `/components/date-picker?embed=1&props=${props}`

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`opening and paging the DatePicker preserves the mobile viewport with ${reducedMotion} motion`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto(singleMonth)
    const trigger = page.locator('#preview-date-picker')
    await expect(trigger).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
    const measurement = await page.evaluateHandle(() => {
      let widest = document.documentElement.scrollWidth
      function sample() {
        widest = Math.max(widest, document.documentElement.scrollWidth)
        frame = requestAnimationFrame(sample)
      }
      let frame = requestAnimationFrame(sample)
      return () => {
        cancelAnimationFrame(frame)
        return Math.max(widest, document.documentElement.scrollWidth)
      }
    })
    await trigger.tap()
    const popup = page.locator('#preview-date-picker-popup')
    const grid = popup.getByRole('grid')
    await expect(grid).toBeVisible()
    const month = await grid.getAttribute('aria-label')
    if (!month) throw new Error('Calendar grid has no month label')
    await popup.locator('[data-calendar-nav="next"]').tap()
    await expect(grid).not.toHaveAttribute('aria-label', month)
    await popup.locator('[data-calendar-nav="previous"]').tap()
    await expect(grid).toHaveAttribute('aria-label', month)
    await page.keyboard.press('Escape')
    await expect(popup).toBeHidden()
    expect(await measurement.evaluate((finish) => finish())).toBe(390)
  })
}

test('keyboard opening focuses today for an empty picker and the chosen date on reopening', async ({
  page,
}) => {
  await page.goto(singleMonth)
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  const trigger = page.locator('#preview-date-picker')
  const popup = page.locator('#preview-date-picker-popup')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(popup).toHaveAttribute('data-side', /top|bottom|left|right/)
  const today = popup.locator('[data-today="true"] [data-calendar-button]')
  await expect(today).toBeFocused()
  const ordinal = Number(await today.getAttribute('data-calendar-ordinal'))
  await page.keyboard.press('ArrowRight')
  const tomorrow = popup.locator(
    `[data-calendar-button][data-calendar-ordinal="${ordinal + 1}"][tabindex="0"]`,
  )
  await expect(tomorrow).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(popup).toBeHidden()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(popup).toHaveAttribute('data-side', /top|bottom|left|right/)
  await expect(tomorrow).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(today).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()
  await expect(trigger).toBeFocused()
})
