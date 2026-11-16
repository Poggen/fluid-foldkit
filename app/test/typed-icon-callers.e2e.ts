import { expect, test } from '@playwright/test'

for (const size of ['default', 'compact']) {
  const iconSize = size === 'compact' ? '14px' : '16px'

  test(`Combobox playground uses typed field icons and matching copied code (${size})`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/components/combobox?size=${size}`)
    const controls = page.getByRole('complementary', { name: 'Combobox props', exact: true })
    const playground = page.getByRole('region', { name: 'Playground', exact: true })
    const field = playground.locator('.reference-preview [data-combo-field]')
    const input = field.getByRole('combobox', { name: 'Components', exact: true })
    const icon = field.locator('.lucide-search')
    const multiple = controls.getByRole('switch', { name: 'Multiple', exact: true })
    await expect(multiple).toHaveAttribute('aria-checked', 'true')
    await controls.getByRole('switch', { name: 'Leading icon', exact: true }).click()
    await expect(icon).toHaveCount(1)
    await expect(icon).toHaveCSS('width', iconSize)
    await expect(icon).toHaveCSS('stroke-width', '1.5px')
    const blurredColor = await icon.evaluate((node) => getComputedStyle(node).color)
    await input.focus()
    await expect(icon).toHaveCSS('stroke-width', '2px')
    await expect(icon).toHaveCSS(
      'color',
      await input.evaluate((node) => getComputedStyle(node).color),
    )
    await expect
      .poll(() => icon.evaluate((node) => getComputedStyle(node).color))
      .not.toBe(blurredColor)
    await expect(icon.locator('..')).toHaveCSS('height', size === 'compact' ? '20px' : '24px')
    await expect(field.locator('[data-combo-chip-rows]')).toHaveCSS('margin-left', '0px')
    await input.press('Escape')
    await multiple.click()
    await expect(multiple).toHaveAttribute('aria-checked', 'false')
    await expect(field.locator(':scope > svg.lucide-search')).toHaveCount(1)
    await expect(icon).toHaveCSS('width', iconSize)
    await input.focus()
    await expect(icon).toHaveCSS('stroke-width', '2px')
    await input.press('Escape')
    await playground.getByRole('tab', { name: 'Code', exact: true }).click()
    const code = playground.locator('.code-block pre code')
    await expect(code).toContainText('icon: defaultIcons.search')
    await expect(code).not.toContainText('leading: defaultIcons.search')
    await playground.getByRole('tab', { name: 'Preview', exact: true }).click()
    await expect(icon).toHaveCount(1)
    expect(errors).toEqual([])
  })

  test(`authored Select keeps theme, grouped and timezone icon roles distinct (${size})`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/components/select?size=${size}`)
    const theme = page
      .getByRole('region', { name: 'With Icons', exact: true })
      .getByRole('combobox')
    await expect(theme.locator('.lucide-monitor')).toHaveCSS('width', iconSize)
    await theme.click()
    const light = page.getByRole('option', { name: 'Light', exact: true })
    await expect(light.locator('.lucide-sun')).toHaveCSS('width', iconSize)
    await expect(light).toBeInViewport({ ratio: 1 })
    // Retry scrolling can move the anchor during entry; hover the visible row in place.
    await light.hover({ scroll: 'none' })
    await expect(light.locator('.lucide-sun')).toHaveCSS('stroke-width', '2px')
    await light.click()
    await expect(theme).toContainText('Light')
    await expect(theme.locator('.lucide-sun')).toHaveCount(1)
    await expect(theme.locator('.lucide-monitor')).toHaveCount(0)

    const groups = page.getByRole('region', { name: 'Groups', exact: true }).getByRole('combobox')
    await expect(groups.locator('.lucide')).toHaveCount(0)
    await groups.click()
    const profile = page.getByRole('option', { name: 'Profile', exact: true })
    await expect(profile.locator('.lucide-user')).toHaveCSS('width', iconSize)
    await profile.click()
    await expect(groups).toContainText('Profile')
    await expect(groups.locator('.lucide')).toHaveCount(0)

    const timezone = page
      .getByRole('region', { name: 'Scrollable List', exact: true })
      .getByRole('combobox')
    await expect(timezone.locator('.lucide-globe')).toHaveCSS('width', iconSize)
    await timezone.click()
    const pacific = page.getByRole('option', { name: '(UTC-8) Pacific Time', exact: true })
    await expect(pacific).toBeVisible()
    await expect(pacific.locator('.lucide')).toHaveCount(0)
    await pacific.click()
    await expect(timezone).toContainText('(UTC-8) Pacific Time')
    await expect(timezone.locator('.lucide-globe')).toHaveCount(1)
    expect(errors).toEqual([])
  })

  test(`authored Combobox separates field icons from selected item icons (${size})`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/components/combobox?size=${size}`)
    const views = page.getByRole('region', { name: 'With icons', exact: true })
    const field = views.locator('[data-combo-field]')
    const input = views.getByRole('combobox')
    await expect(field.locator('.lucide-search')).toHaveCSS('width', iconSize)
    await input.fill('star')
    const starred = page.getByRole('option', { name: 'Starred', exact: true })
    await expect(starred.locator('.lucide-star')).toHaveCSS('width', iconSize)
    await starred.click()
    await expect(input).toHaveValue('Starred')
    await expect(field.locator('.lucide-search')).toHaveCount(1)
    await expect(field.locator('.lucide-star')).toHaveCount(0)

    const timezones = page.getByRole('region', { name: 'Long list', exact: true })
    const timezoneInput = timezones.getByRole('combobox')
    await expect(timezones.locator('[data-combo-field] .lucide-globe')).toHaveCSS('width', iconSize)
    await timezoneInput.fill('Tokyo')
    const tokyo = page.getByRole('option', { name: '(UTC+9) Tokyo', exact: true })
    await expect(tokyo).toBeVisible()
    await expect(tokyo.locator('.lucide')).toHaveCount(0)
    await tokyo.click()
    await expect(timezoneInput).toHaveValue('(UTC+9) Tokyo')
    await expect(timezones.locator('[data-combo-field] .lucide-globe')).toHaveCount(1)
    expect(errors).toEqual([])
  })
}
