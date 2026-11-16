import { expect, test } from '@playwright/test'

for (const width of [1440, 390]) {
  test(`authored choices and playground controls remain independent at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/components/combobox')
    const basic = page.getByRole('region', { name: 'Basic', exact: true })
    const input = basic.getByRole('combobox')
    await input.fill('svel')
    await expect(page.getByRole('option', { name: 'SvelteKit', exact: true })).toBeVisible()
    await input.press('ArrowDown')
    await input.press('Enter')
    await expect(input).toHaveValue('SvelteKit')

    const icons = page
      .getByRole('region', { name: 'With icons', exact: true })
      .getByRole('combobox')
    await icons.fill('star')
    await page.getByRole('option', { name: 'Starred', exact: true }).click()
    await expect(icons).toHaveValue('Starred')
    await expect(input).toHaveValue('SvelteKit')
    await basic.getByRole('tab', { name: 'Code', exact: true }).click()
    await basic.getByRole('tab', { name: 'Preview', exact: true }).click()
    await expect(input).toHaveValue('SvelteKit')

    const controls = page.getByRole('complementary', { name: 'Combobox props', exact: true })
    const choices = controls.getByRole('combobox')
    expect(await choices.count()).toBeGreaterThan(0)
    for (const choice of await choices.all()) {
      await expect(choice).toHaveCSS('padding-inline-start', '8px')
      await expect(choice).toHaveCSS('padding-inline-end', '8px')
      await expect(choice.locator('..')).toHaveCSS('padding-inline-start', '0px')
      await expect(choice.locator('..')).toHaveCSS('padding-inline-end', '0px')
    }
    const multiple = controls.getByRole('switch', { name: 'Multiple', exact: true })
    await multiple.click()
    await expect(
      page
        .locator('.reference-preview')
        .getByRole('button', { name: 'Remove Combobox', exact: true }),
    ).toHaveCount(0)
    const playground = page.getByRole('region', { name: 'Playground', exact: true })
    await playground.getByRole('tab', { name: 'Code', exact: true }).click()
    await playground.getByRole('tab', { name: 'Preview', exact: true }).click()
    await expect(input).toHaveValue('SvelteKit')
    await expect(icons).toHaveValue('Starred')
    await expect(multiple).toHaveAttribute('aria-checked', 'false')

    await page.goto('/components/select')
    const selectSection = page.getByRole('region', { name: 'Basic', exact: true })
    const select = selectSection.getByRole('combobox')
    await select.click()
    await page.getByRole('option', { name: 'Banana', exact: true }).click()
    await expect(select).toContainText('Banana')
    await selectSection.getByRole('tab', { name: 'Code', exact: true }).click()
    await selectSection.getByRole('tab', { name: 'Preview', exact: true }).click()
    await expect(select).toContainText('Banana')
    expect(errors).toEqual([])
  })
}
