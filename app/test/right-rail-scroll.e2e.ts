import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 577 } })

const viewport = '#site-right-rail-scroll [data-slot=scroll-area-viewport]'

test('short right rail scrolls independently and delivers lower Card controls', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/components/card')
  const rail = page.locator('#site-customizer')
  const media = rail.getByRole('combobox', { name: 'Media', exact: true })
  await expect(media).toBeAttached()
  await page.mouse.move(1160, 440)
  await page.mouse.wheel(0, 650)
  await expect(media).toBeInViewport()
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await media.click()
  await page.getByRole('option', { name: 'Image', exact: true }).click()
  await expect(media).toContainText('Image')
  await expect(
    page
      .getByRole('region', { name: 'Playground', exact: true })
      .locator('[data-slot="card-image"]'),
  ).toHaveCount(4)
  const railOffset = await page.locator(viewport).evaluate((element) => element.scrollTop)
  await page.mouse.move(650, 450)
  await page.mouse.wheel(0, 400)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  expect(await page.locator(viewport).evaluate((element) => element.scrollTop)).toBe(railOffset)
  await rail.getByRole('combobox', { name: 'Size', exact: true }).click()
  await page.getByRole('option', { name: 'Compact', exact: true }).click()
  await expect(page.locator('[data-app="visuals"]')).toHaveAttribute('data-size', 'compact')
  expect(errors).toEqual([])
})

test('Tab exposes lower Card controls and keyboard selection updates the shared preview', async ({
  page,
}) => {
  await page.goto('/components/card')
  const rail = page.locator('#site-customizer')
  await rail.getByRole('combobox', { name: 'Border', exact: true }).focus()
  for (let index = 0; index < 4; index += 1) await page.keyboard.press('Tab')
  const media = rail.getByRole('combobox', { name: 'Media', exact: true })
  await expect(media).toBeFocused()
  await expect(media).toBeInViewport()
  expect(await media.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'Icon', exact: true })).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.getByRole('option', { name: 'None', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('option', { name: 'Image', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(media).toContainText('Image')
  await expect(
    page
      .getByRole('region', { name: 'Playground', exact: true })
      .locator('[data-slot="card-image"]'),
  ).toHaveCount(4)
})

test('scrolled rail survives route replacement and two-column controls retain ownership', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/components/card')
  await page.mouse.move(1160, 440)
  await page.mouse.wheel(0, 650)
  await expect
    .poll(() => page.locator(viewport).evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  await page.getByRole('link', { name: 'Button', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Button', exact: true, level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Card', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Card', exact: true, level: 1 })).toBeVisible()
  await page.setViewportSize({ width: 1100, height: 577 })
  const mainMedia = page.locator('main').getByRole('combobox', { name: 'Media', exact: true })
  await expect(mainMedia).toHaveCount(1)
  await mainMedia.click()
  await page.getByRole('option', { name: 'Image', exact: true }).click()
  await expect(mainMedia).toContainText('Image')
  await page.setViewportSize({ width: 1280, height: 577 })
  const railMedia = page
    .locator('#site-customizer')
    .getByRole('combobox', { name: 'Media', exact: true })
  await expect(railMedia).toHaveCount(1)
  await expect(railMedia).toContainText('Image')
  await expect(
    page.locator('main').getByRole('combobox', { name: 'Media', exact: true }),
  ).toHaveCount(0)
  expect(errors).toEqual([])
})

test('native rail thumb drags to the lower controls', async ({ page }) => {
  await page.goto('/components/card')
  const scroll = page.locator('#site-right-rail-scroll')
  await scroll.hover()
  const thumb = scroll.locator('[data-orientation="vertical"] [data-slot="scroll-area-thumb"]')
  await expect(thumb).toBeVisible()
  const box = await thumb.boundingBox()
  expect(box).not.toBeNull()
  if (box === null) throw new Error('Visible thumb has no bounding box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, 480, { steps: 12 })
  await page.mouse.up()
  await expect(
    page.locator('#site-customizer').getByRole('textbox', { name: 'Title', exact: true }),
  ).toBeInViewport()
  expect(await page.evaluate(() => scrollY)).toBe(0)
})
