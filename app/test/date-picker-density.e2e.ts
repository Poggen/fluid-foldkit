import { expect, test } from '@playwright/test'

for (const fixture of [
  { path: '/', id: 'preview-date-picker' },
  { path: '/components/date-picker', id: 'docs-picker-date' },
]) {
  test(`global density retains the open DatePicker on ${fixture.path}`, async ({ page }) => {
    const errors: Array<string> = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${fixture.path}?size=compact`)
    const customizer = page.locator('#site-customizer')
    await customizer.locator('#customize-desktop-size-select-trigger').click()
    await page.getByRole('option', { name: 'Default', exact: true }).click()
    await expect(page.locator('.site')).toHaveAttribute('data-size', 'default')

    if (fixture.path === '/') {
      await page.locator('[data-component="fluid/date-picker"]').scrollIntoViewIfNeeded()
    }
    const trigger = page.locator(`#${fixture.id}`)
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    const popup = page.locator(`#${fixture.id}-popup`)
    const calendar = popup.locator('[data-calendar-cell-size]').first()
    await expect(popup).toBeVisible()
    await expect(calendar).toHaveAttribute('data-calendar-cell-size', '36')
    await expect(trigger).toHaveCSS('column-gap', '6px')
    await calendar.evaluate((element) => element.setAttribute('data-density-retained', 'true'))
    const day = popup.locator('[data-calendar-button][tabindex="0"]').first()
    await day.focus()
    await expect(day).toBeFocused()
    const ordinal = await day.getAttribute('data-calendar-ordinal')
    const displayMonth = await day.getAttribute('data-calendar-display-month')
    const focusedDay = popup.locator(
      `[data-calendar-button][data-calendar-ordinal="${ordinal}"][data-calendar-display-month="${displayMonth}"]`,
    )

    await page.goBack()
    await expect(page.locator('.site')).toHaveAttribute('data-size', 'compact')
    await expect(popup).toBeVisible()
    await expect(calendar).toHaveAttribute('data-calendar-cell-size', '36')
    await expect(trigger).toHaveCSS('column-gap', '4px')
    await expect(calendar).toHaveAttribute('data-density-retained', 'true')
    await expect(focusedDay).toBeFocused()

    await page.goForward()
    await expect(page.locator('.site')).toHaveAttribute('data-size', 'default')
    await expect(popup).toBeVisible()
    await expect(trigger).toHaveCSS('column-gap', '6px')
    await expect(calendar).toHaveAttribute('data-calendar-cell-size', '36')
    await expect(calendar).toHaveAttribute('data-density-retained', 'true')
    await expect(focusedDay).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(popup).toBeHidden()
    await expect(trigger).toBeFocused()
    expect(errors).toEqual([])
  })
}
