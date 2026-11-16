import { expect, test } from '@playwright/test'

test('API contracts retain tables inside independent horizontal native scroll areas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/components/tooltip')
  const api = page.getByRole('region', { name: 'API reference', exact: true })
  const contracts = api.locator('.reference-contract')
  await expect(contracts.first()).toBeVisible()
  const ids: Array<string> = []
  for (const contract of await contracts.all()) {
    const scroll = contract.locator('[data-slot=scroll-area]')
    const viewport = scroll.locator('[data-slot=scroll-area-viewport]')
    await expect(scroll).toHaveCount(1)
    await expect(viewport.getByRole('table')).toHaveCount(1)
    await expect(viewport.getByRole('columnheader', { name: 'Prop', exact: true })).toBeVisible()
    await expect(viewport).toHaveAttribute('tabindex', '0')
    const id = await scroll.getAttribute('id')
    expect(id).toBeTruthy()
    if (id !== null) ids.push(id)
    await viewport.scrollIntoViewIfNeeded()
    expect(await viewport.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true)
    expect(await viewport.evaluate((node) => getComputedStyle(node).maskImage)).not.toBe('none')
    await viewport.focus()
    await viewport.press('ArrowRight')
    await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0)
    const thumb = scroll.locator('[data-slot=scroll-area-thumb]')
    await scroll.hover()
    await expect(thumb).toBeVisible()
    const before = await viewport.evaluate((node) => node.scrollLeft)
    const bounds = await thumb.boundingBox()
    if (bounds === null) throw new Error('Horizontal thumb has no bounds')
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await expect(scroll).toHaveAttribute('data-scroll-dragging', /./)
    await page.mouse.move(bounds.x + bounds.width / 2 + 32, bounds.y + bounds.height / 2, {
      steps: 8,
    })
    await page.mouse.up()
    await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(before)
  }
  expect(new Set(ids).size).toBe(ids.length)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('Shuffle exposes a dismissible native tooltip and retains keyboard and pointer activation', async ({
  page,
}) => {
  await page.goto('/components/button')
  const controls = page.getByRole('complementary', { name: 'Button props', exact: true })
  const shuffle = controls.getByRole('button', { name: 'Shuffle', exact: true })
  const label = controls.getByLabel('Label', { exact: true })
  const tooltip = page.getByRole('tooltip', { name: 'Shuffle', exact: true })
  await label.fill('Wrapper keyboard sentinel')
  await shuffle.hover()
  await expect(tooltip).toBeVisible()
  expect(await shuffle.getAttribute('aria-describedby')).toBe(await tooltip.getAttribute('id'))
  await shuffle.press('Escape')
  await expect(tooltip).toBeHidden()
  await page.mouse.move(0, 0)
  await shuffle.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(shuffle).toBeFocused()
  await expect(tooltip).toBeVisible()
  await shuffle.press('Enter')
  await expect(tooltip).toBeHidden()
  await expect(label).not.toHaveValue('Wrapper keyboard sentinel')
  await label.fill('Wrapper pointer sentinel')
  await shuffle.click()
  await expect(label).not.toHaveValue('Wrapper pointer sentinel')
})
