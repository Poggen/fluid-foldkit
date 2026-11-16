import { expect, test } from '@playwright/test'

test('page visits reset Home drafts while reference URL values survive history', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const card = page.locator('[data-component="fluid/input"]')
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveAttribute('data-deferred', 'false')
  const landingInput = card.getByRole('textbox').first()
  await landingInput.fill('Landing draft')
  await card.getByRole('link', { name: 'View Input documentation', exact: true }).click()
  const referenceInput = page.locator('.reference-preview #preview-input').first()
  await expect(referenceInput).not.toHaveValue('Landing draft')
  await referenceInput.fill('Reference draft')
  const valueControl = page
    .getByRole('complementary', { name: 'Input props' })
    .getByLabel('Value', { exact: true })
  await expect(valueControl).toHaveValue('Reference draft')
  await expect
    .poll(() => new URL(page.url()).searchParams.get('props'))
    .toContain('Reference draft')
  await valueControl.fill('Accepted control value')
  await expect(referenceInput).toHaveValue('Accepted control value')
  await expect
    .poll(() => new URL(page.url()).searchParams.get('props'))
    .toContain('Accepted control value')
  await page.getByRole('link', { name: 'Showcase', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Fluid Functionalism', exact: true, level: 1 }),
  ).toBeVisible()
  await expect(page.locator('.reference-preview')).toHaveCount(0)
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  await card.scrollIntoViewIfNeeded()
  await expect(landingInput).toHaveValue('')
  await page.goBack()
  await expect(referenceInput).toHaveValue('Accepted control value')
  await expect(valueControl).toHaveValue('Accepted control value')
})

test('embedded pages initialize their own filtered occurrence from the URL', async ({ page }) => {
  await page.goto(
    `/components/input?embed=1&props=${encodeURIComponent(JSON.stringify({ placeholder: 'Embedded draft' }))}`,
  )
  await expect(page.locator('.embedded-preview')).toBeVisible()
  await expect(page.locator('.embedded-preview #preview-input')).toHaveCount(1)
  await expect(page.locator('.embedded-preview input')).toHaveCount(1)
  await expect(page.locator('.component-reference')).toHaveCount(0)
  const input = page.locator('.embedded-preview #preview-input')
  await expect(input).toHaveAttribute('placeholder', 'Embedded draft')
  await input.fill('Embedded input remains live')
  await expect(input).toHaveValue('Embedded input remains live')
})

test('only the landing color picker changes the global accent', async ({ page }) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/?accent=green')
  const landing = page.locator('[data-component="fluid/color-picker"]')
  await landing.scrollIntoViewIfNeeded()
  const alpha = landing.getByRole('textbox', { name: 'Alpha', exact: true })
  await alpha.fill('37')
  await alpha.press('Tab')
  await expect.poll(() => new URL(page.url()).searchParams.get('accent')?.slice(-2)).toBe('5e')
  const accent = new URL(page.url()).searchParams.get('accent')
  await landing.getByRole('link', { name: 'View ColorPicker documentation', exact: true }).click()
  const referenceAlpha = page
    .locator('.reference-preview')
    .getByRole('textbox', { name: 'Alpha', exact: true })
  await referenceAlpha.fill('61')
  await referenceAlpha.press('Tab')
  await expect(referenceAlpha).not.toBeFocused()
  await expect(referenceAlpha).toHaveValue('61%')
  await expect
    .poll(() => JSON.parse(new URL(page.url()).searchParams.get('props') ?? '{}'))
    .toMatchObject({ _tag: 'color-picker', format: 'hex', value: '#6b97ff9c' })
  expect(new URL(page.url()).searchParams.get('accent')).toBe(accent)
})

test('a documentation deep link returns to the full independently customizable gallery', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(
    '/components/input?accent=green&props=' +
      encodeURIComponent(JSON.stringify({ value: 'Docs only' })),
  )
  await expect(page.locator('.reference-preview input').first()).toHaveValue('Docs only')
  await page.getByRole('link', { name: 'Showcase', exact: true }).click()
  await expect.poll(() => page.locator('[data-component]').count()).toBeGreaterThan(5)
  const input = page.locator('[data-component="fluid/input"]')
  await input.scrollIntoViewIfNeeded()
  await expect(input.getByRole('textbox').first()).toHaveValue('')
  const color = page.locator('[data-component="fluid/color-picker"]')
  await color.scrollIntoViewIfNeeded()
  const alpha = color.getByRole('textbox', { name: 'Alpha', exact: true })
  await alpha.fill('37')
  await alpha.press('Tab')
  await expect.poll(() => new URL(page.url()).searchParams.get('accent')?.slice(-2)).toBe('5e')
})

test('a native Breadcrumb selection updates its control and relabeling clears the selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/components/breadcrumb')
  const preview = page.locator('.reference-preview')
  await preview.getByRole('button', { name: 'Drafts', exact: true }).click()
  await page.getByRole('menuitemradio', { name: 'Published', exact: true }).click()
  const label = page
    .getByRole('complementary', { name: 'Breadcrumb props' })
    .getByLabel('Step 5 label', { exact: true })
  await expect(label).toHaveValue('Published')
  await expect.poll(() => new URL(page.url()).searchParams.get('props')).toContain('Published')
  await label.fill('Project archive')
  await preview.getByRole('button', { name: 'Project archive', exact: true }).click()
  await expect(page.getByRole('menuitemradio', { name: 'Published', exact: true })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await expect
    .poll(() => new URL(page.url()).searchParams.get('props'))
    .toContain('Project archive')
})
