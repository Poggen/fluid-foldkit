import { expect, test, type Locator, type Page } from '@playwright/test'

const choose = async (page: Page, label: string, value: string) => {
  const trigger = page
    .locator('#site-customizer')
    .getByRole('combobox', { name: label, exact: true })
    .and(page.locator('[id^="customize-desktop-"]'))
  await trigger.click()
  await page.getByRole('option', { name: value, exact: true }).click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
}
const visit = (page: Page, name: string) =>
  page.locator('#site-navigation').getByRole('link', { name, exact: true }).click()

const clickBelowPreview = async (page: Page, preview: Locator) => {
  const bounds = await preview.boundingBox()
  const viewport = page.viewportSize()
  if (bounds === null || viewport === null || bounds.y + bounds.height >= viewport.height)
    throw new Error('Expected empty viewport below the standalone preview')
  await page.mouse.click(viewport.width / 2, (bounds.y + bounds.height + viewport.height) / 2)
}

test('returning from docs initializes current landing size and shape with fresh local state', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const inputCard = page.locator('[data-component="fluid/input"]')
  await inputCard.scrollIntoViewIfNeeded()
  await expect(inputCard).toHaveAttribute('data-deferred', 'false')
  const input = inputCard.getByRole('textbox').first()
  const sliderCard = page.locator('[data-component="fluid/slider"]')
  const volume = sliderCard.getByRole('slider', { name: 'Volume', exact: true })

  for (const choice of [
    { size: 'Compact', shape: 'Rounded', height: '28px', radius: '8px', engine: 'compact' },
    { size: 'Default', shape: 'Sharp', height: '36px', radius: '1px', engine: 'comfortable' },
  ]) {
    await inputCard.scrollIntoViewIfNeeded()
    await input.fill('Retained landing draft')
    await sliderCard.scrollIntoViewIfNeeded()
    await volume.press('ArrowRight')
    await expect(volume).toHaveAttribute('aria-valuenow', '61')
    await visit(page, 'Input')
    const preview = page.locator('.reference-preview #preview-input').first()
    await expect(preview).toBeVisible()
    await preview.fill('Reference draft remains live')
    await choose(page, 'Size', choice.size)
    await choose(page, 'Radius', choice.shape)
    await expect(preview).toHaveValue('Reference draft remains live')
    await expect(preview).toHaveCSS('height', choice.height)
    await expect(preview).toHaveCSS('border-top-left-radius', choice.radius)

    await visit(page, 'Showcase')
    await expect(page.locator('[data-reference-page]')).toHaveCount(0)
    await inputCard.scrollIntoViewIfNeeded()
    await expect(inputCard).toHaveAttribute('data-deferred', 'false')
    await expect(input).toHaveValue('')
    await expect(input).toHaveCSS('height', choice.height)
    await expect(input).toHaveCSS('border-top-left-radius', choice.radius)
    await sliderCard.scrollIntoViewIfNeeded()
    await expect(sliderCard.locator('#preview-volume')).toHaveAttribute(
      'data-slider-engine',
      choice.engine,
    )
    await expect(volume).toHaveAttribute('aria-valuenow', '60')
    await expect(page.locator('[data-shape-transition]')).toHaveCount(0)
  }
})

test('system and component routes receive current presentation on activation', async ({ page }) => {
  await page.goto('/components/slider')
  await expect(page.locator('.reference-preview [data-live-previews="true"]')).toBeVisible()
  await expect(page.locator('.reference-preview #preview-slider')).toHaveAttribute(
    'data-slider-engine',
    'comfortable',
  )
  await visit(page, 'Sizes')
  const systemInput = page
    .getByRole('textbox', { name: 'compact project search', exact: true })
    .first()
  await systemInput.fill('Retained system draft')
  await choose(page, 'Size', 'Compact')
  await choose(page, 'Radius', 'Rounded')
  await expect(systemInput).toHaveValue('Retained system draft')
  await visit(page, 'Slider')
  await expect(page.locator('.reference-preview #preview-slider')).toHaveAttribute(
    'data-slider-engine',
    'compact',
  )
  await expect(page.locator('.site')).toHaveAttribute('data-shape', 'rounded')
  await choose(page, 'Size', 'Default')
  await choose(page, 'Radius', 'Sharp')
  await visit(page, 'Sizes')
  await expect(systemInput).toHaveValue('')
  await expect(systemInput).toHaveCSS('border-top-left-radius', '1px')
  await expect(page.locator('.site')).toHaveAttribute('data-size', 'default')
})

test('input embed initializes and updates its visible Gallery presentation', async ({ page }) => {
  const props = encodeURIComponent(JSON.stringify({ placeholder: 'Configured embed' }))
  await page.goto(`/components/input?embed=1&size=compact&shape=rounded&props=${props}`)
  const embed = page.locator('.embedded-preview')
  await expect(embed.locator('[data-live-previews="true"]')).toBeVisible()
  const input = embed.locator('#preview-input')
  await expect(input).toHaveCSS('height', '28px')
  await expect(input).toHaveCSS('border-top-left-radius', '8px')
  await input.fill('Embedded draft')
  await clickBelowPreview(page, embed)
  await expect(input).not.toBeFocused()
  await page.keyboard.press('s')
  await page.keyboard.press('r')
  await expect(input).toHaveCSS('height', '36px')
  await expect(input).toHaveCSS('border-top-left-radius', '20px')
  await expect(input).toHaveValue('Embedded draft')
  await expect(input).toHaveAttribute('placeholder', 'Configured embed')
  await expect.poll(() => new URL(page.url()).searchParams.get('embed')).toBe('1')
  await page.goBack()
  await expect(input).toHaveCSS('border-top-left-radius', '8px')
  await expect(input).toHaveValue('Embedded draft')
  await page.goForward()
  await expect(input).toHaveCSS('border-top-left-radius', '20px')
  await expect(input).toHaveValue('Embedded draft')
  await page.reload()
  await expect(embed.locator('[data-live-previews="true"]')).toBeVisible()
  await expect(input).toHaveValue('Embedded draft')
  await expect(input).toHaveAttribute('placeholder', 'Configured embed')
  await expect(input).toHaveCSS('height', '36px')
  await expect(input).toHaveCSS('border-top-left-radius', '20px')
  await expect(input).toHaveCount(1)
  await expect(page.locator('.component-reference')).toHaveCount(0)
})

test('slider embed reconciles native size state while retaining its accepted value', async ({
  page,
}) => {
  await page.goto('/components/slider?embed=1')
  const embed = page.locator('.embedded-preview')
  await expect(embed.locator('[data-live-previews="true"]')).toBeVisible()
  const slider = embed.locator('#preview-slider')
  const volume = embed.getByRole('slider', { name: 'Opacity', exact: true })
  await expect(slider).toHaveAttribute('data-slider-engine', 'comfortable')
  await volume.press('ArrowRight')
  await expect(volume).toHaveAttribute('aria-valuenow', '36')
  await clickBelowPreview(page, embed)
  await expect(volume).not.toBeFocused()
  await page.keyboard.press('s')
  await expect(slider).toHaveAttribute('data-slider-engine', 'compact')
  await expect(volume).toHaveAttribute('aria-valuenow', '36')
  await expect(slider).toHaveCount(1)
})
