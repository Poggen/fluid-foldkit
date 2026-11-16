import { expect, test } from '@playwright/test'

for (const [accent, hex] of [
  ['green', '00A63E'],
  ['%2312abef', '12ABEF'],
] as const) {
  test(`home color picker initializes from ${accent}`, async ({ page }) => {
    await page.goto(`/?accent=${accent}`)
    await expect(page.getByRole('textbox', { name: 'Hex value', exact: true })).toHaveValue(hex)
  })
}

test('home color picker follows external accent changes and preserves continuous selection', async ({
  page,
}) => {
  const errors: Array<string> = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const hex = page.getByRole('textbox', { name: 'Hex value', exact: true })
  await expect(hex).toHaveValue('6B97FF')
  await page.getByRole('combobox', { name: 'Accent', exact: true }).click()
  await page.getByRole('option', { name: 'Green', exact: true }).click()
  await expect(hex).toHaveValue('00A63E')
  const alpha = page.getByRole('textbox', { name: 'Alpha', exact: true })
  await alpha.fill('37')
  await alpha.press('Tab')
  await expect.poll(() => new URL(page.url()).searchParams.get('accent')?.slice(-2)).toBe('5e')
  const hue = await page.getByRole('slider', { name: 'Hue', exact: true }).inputValue()
  const square = page.getByRole('application', { name: 'Saturation and brightness' })
  await square.scrollIntoViewIfNeeded()
  const box = await square.boundingBox()
  if (!box) throw new Error('Color square is missing')
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await page.mouse.down()
  const start = await hex.inputValue()
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 5 })
  await expect(hex).not.toHaveValue(start)
  const middle = await hex.inputValue()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, { steps: 5 })
  await expect(hex).not.toHaveValue(middle)
  await page.mouse.up()
  await expect(page.getByRole('slider', { name: 'Hue', exact: true })).toHaveValue(hue)
  await expect.poll(async () => Number.parseFloat(await alpha.inputValue())).toBe(37)
  const selected = await hex.inputValue()
  await expect
    .poll(() => new URL(page.url()).searchParams.get('accent')?.toUpperCase())
    .toBe(`#${selected}`)
  await page.getByRole('combobox', { name: 'Accent', exact: true }).click()
  const custom = page.getByRole('option', { name: 'Custom', exact: true })
  await expect(custom).toHaveAttribute('aria-selected', 'true')
  await custom.click()
  await expect(hex).toHaveValue(selected)
  await expect(custom).toBeHidden()
  await page.getByRole('combobox', { name: 'Accent', exact: true }).click()
  await page.getByRole('option', { name: 'Red', exact: true }).click()
  await expect(hex).toHaveValue('E7000B')
  expect(errors).toEqual([])
})

test('customizer applies selections and reset after picker-driven accents', async ({ page }) => {
  await page.goto('/?accent=green')
  const hex = page.getByRole('textbox', { name: 'Hex value', exact: true })
  await expect(hex).toHaveValue('00A63E')
  await page.getByRole('combobox', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(hex).toHaveValue('05DF72')
  await page.getByRole('combobox', { name: 'Radius', exact: true }).click()
  await page.getByRole('option', { name: 'Rounded', exact: true }).click()
  await expect(page.locator('[data-app="visuals"]')).toHaveAttribute('data-shape', 'rounded')
  await page.getByRole('combobox', { name: 'Accent', exact: true }).click()
  await page.getByRole('option', { name: 'Red', exact: true }).click()
  await expect(hex).toHaveValue('FF6467')
  await expect(page.getByRole('combobox', { name: 'Accent', exact: true })).toContainText('Red')
  await page.getByRole('button', { name: 'Reset customization', exact: true }).click()
  await expect(hex).toHaveValue('6B97FF')
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toContainText('System')
  await expect(page.getByRole('combobox', { name: 'Radius', exact: true })).toContainText('Sharp')
})

test('chart presentation remains live while accent color is inherited', async ({ page }) => {
  await page.goto('/')
  const chart = page.locator('#charts-line .showcase-card')
  await chart.scrollIntoViewIfNeeded()
  await expect(chart).toBeVisible()
  await expect(chart).toHaveCSS('border-radius', '1px')
  await page.getByRole('combobox', { name: 'Radius', exact: true }).click()
  await page.getByRole('option', { name: 'Rounded', exact: true }).click()
  await expect
    .poll(() =>
      chart.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderRadius)),
    )
    .toBeGreaterThan(1)
  await page.getByRole('combobox', { name: 'Accent', exact: true }).click()
  await page.getByRole('option', { name: 'Green', exact: true }).click()
  await expect
    .poll(() =>
      chart.evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--fluid-accent').trim(),
      ),
    )
    .toBe('#00A63E')
  await page.getByRole('combobox', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect
    .poll(() =>
      chart.evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--fluid-accent').trim(),
      ),
    )
    .toBe('#05DF72')
  await page.getByRole('combobox', { name: 'Radius', exact: true }).click()
  await page.getByRole('option', { name: 'Sharp', exact: true }).click()
  await expect(chart).toHaveCSS('border-radius', '1px')
})
